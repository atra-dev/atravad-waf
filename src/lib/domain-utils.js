export function normalizeDomainInput(value) {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';

  let host = trimmed;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      host = new URL(trimmed).hostname;
    } else if (trimmed.includes('/')) {
      host = new URL(`https://${trimmed}`).hostname;
    }
  } catch {
    host = trimmed;
  }

  // Strip port if user entered host:port without a protocol.
  const lastColonIndex = host.lastIndexOf(':');
  if (lastColonIndex > -1 && host.indexOf(':') === lastColonIndex) {
    const maybePort = host.slice(lastColonIndex + 1);
    if (maybePort && Number.isInteger(Number(maybePort))) {
      host = host.slice(0, lastColonIndex);
    }
  }

  // Keep FQDN semantics but normalize accidental trailing dots.
  while (host.endsWith('.')) {
    host = host.slice(0, -1);
  }

  return host;
}
