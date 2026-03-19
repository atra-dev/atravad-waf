import dns from 'dns';
import { normalizeDomainInput } from '@/lib/domain-utils';

const dnsPromises = dns.promises;

function normalizeDnsValue(value) {
  return normalizeDomainInput(typeof value === 'string' ? value : '');
}

async function resolveIpv4(domain) {
  try {
    return await dnsPromises.resolve4(domain);
  } catch {
    return [];
  }
}

async function lookupIpv4(domain) {
  try {
    const records = await dnsPromises.lookup(domain, { all: true, family: 4 });
    return records
      .map((record) => record?.address)
      .filter((address) => typeof address === 'string' && address.trim());
  } catch {
    return [];
  }
}

async function resolveCnames(domain) {
  try {
    return await dnsPromises.resolveCname(domain);
  } catch {
    return [];
  }
}

function hasObservedTraffic(app) {
  const statsTotal = Number(app?.statsTotal);
  if (Number.isFinite(statsTotal) && statsTotal > 0) {
    return true;
  }

  return typeof app?.statsLastSeenAt === 'string' && app.statsLastSeenAt.trim() !== '';
}

export async function resolveAppActivation(app) {
  const domain = normalizeDnsValue(app?.domain);
  const firewallIp = typeof app?.firewallIp === 'string' ? app.firewallIp.trim() : '';
  const firewallCname = normalizeDnsValue(app?.firewallCname);
  const storedActivated = app?.activated === true;

  if (hasObservedTraffic(app)) {
    return {
      activated: true,
      activationSource: 'traffic-observed',
    };
  }

  if (!domain || (!firewallIp && !firewallCname)) {
    return {
      activated: storedActivated,
      activationSource: 'stored',
    };
  }

  const [resolvedIpv4Records, lookedUpIpv4Records, cnameRecords] = await Promise.all([
    resolveIpv4(domain),
    lookupIpv4(domain),
    resolveCnames(domain),
  ]);

  const ipv4Records = [...new Set([...resolvedIpv4Records, ...lookedUpIpv4Records])];
  const normalizedCnames = cnameRecords.map(normalizeDnsValue).filter(Boolean);
  const matchesFirewallIp = firewallIp ? ipv4Records.includes(firewallIp) : false;
  const matchesFirewallCname = firewallCname
    ? normalizedCnames.includes(firewallCname)
    : false;

  if (matchesFirewallIp || matchesFirewallCname) {
    return {
      activated: true,
      activationSource: matchesFirewallIp ? 'dns-a-record' : 'dns-cname-record',
    };
  }

  if (ipv4Records.length > 0 || normalizedCnames.length > 0) {
    return {
      activated: false,
      activationSource: 'dns-mismatch',
    };
  }

  return {
    activated: storedActivated,
    activationSource: 'stored',
  };
}

export async function hydrateAppActivation(app) {
  const activation = await resolveAppActivation(app);
  return {
    ...app,
    activated: activation.activated,
    activationSource: activation.activationSource,
  };
}
