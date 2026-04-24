function normalizeText(value) {
  return String(value || '').toLowerCase();
}

export function getDecisionKey(log) {
  const decision = String(log?.decision || '').trim().toLowerCase();

  if (
    decision === 'blocked' ||
    decision === 'waf_blocked' ||
    decision === 'websocket_blocked'
  ) {
    return 'waf_blocked';
  }

  if (
    decision === 'denied' ||
    decision === 'origin_denied' ||
    decision === 'websocket_denied' ||
    decision === 'websocket_origin_response' ||
    decision === 'websocket_proxy_error'
  ) {
    return 'origin_denied';
  }

  if (decision === 'allowed' || decision === 'websocket_allowed') {
    return 'allowed';
  }

  if (Boolean(log?.blocked)) {
    return Number(log?.statusCode) >= 500 ? 'origin_denied' : 'waf_blocked';
  }

  const statusCode = Number(log?.statusCode);
  if (Number.isFinite(statusCode) && statusCode >= 400) return 'origin_denied';
  return 'allowed';
}

export function categoryFromRuleId(ruleId) {
  const id = Number.parseInt(String(ruleId || ''), 10);
  if (!Number.isFinite(id)) return null;

  if (id >= 912000 && id < 913000) return 'DDoS/DoS';
  if (id >= 913000 && id < 914000) return 'Scanner/Recon';
  if (id >= 920000 && id < 921000) return 'Protocol Enforcement';
  if (id >= 921000 && id < 922000) return 'HTTP Smuggling';
  if (id >= 930000 && id < 932000) return 'LFI/RFI';
  if (id >= 932000 && id < 933000) return 'RCE';
  if (id >= 933000 && id < 934000) return 'PHP Injection';
  if (id >= 941000 && id < 942000) return 'XSS';
  if (id >= 942000 && id < 943000) return 'SQL Injection';
  if (id >= 944000 && id < 945000) return 'Java Attacks';
  if (id >= 949000 && id < 950000) return 'Anomaly Threshold';
  return null;
}

export function classifyAttack(log) {
  const message = normalizeText(log?.message);
  const ruleMessage = normalizeText(log?.ruleMessage);
  const uri = normalizeText(log?.uri || log?.request?.uri);
  const source = `${message} ${ruleMessage} ${uri}`;

  const byRuleId = categoryFromRuleId(log?.ruleId);
  if (byRuleId) return byRuleId;

  if (
    source.includes('ddos') ||
    source.includes('dos') ||
    source.includes('denial of service') ||
    source.includes('rate limit exceeded') ||
    source.includes('too many requests') ||
    source.includes('burst size exceeded') ||
    source.includes('request flood')
  ) {
    return 'DDoS/DoS';
  }

  if (source.includes('sql') || source.includes('sqli') || source.includes('union select')) return 'SQL Injection';
  if (source.includes('xss') || source.includes('cross-site') || source.includes('<script')) return 'XSS';
  if (source.includes('csrf')) return 'CSRF';
  if (source.includes('rce') || source.includes('code execution') || source.includes('command injection')) return 'RCE';
  if (source.includes('path traversal') || source.includes('../') || source.includes('directory traversal')) return 'Path Traversal';
  if (source.includes('ssrf') || source.includes('server-side request forgery')) return 'SSRF';
  if (source.includes('lfi') || source.includes('rfi')) return 'LFI/RFI';
  if (source.includes('auth') || source.includes('credential') || source.includes('login')) return 'Auth Attack';
  if (source.includes('bot') || source.includes('crawler') || source.includes('scanner')) return 'Bot/Scanner';
  if (source.includes('rate limit') || source.includes('too many requests')) return 'Rate Limit Abuse';
  if (source.includes('method') || source.includes('protocol')) return 'Protocol Enforcement';
  if (source.includes('file upload') || source.includes('multipart')) return 'Malicious Upload';

  return 'Other';
}
