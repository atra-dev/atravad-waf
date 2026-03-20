function firstCrsRuleIdFromText(text) {
  const match = String(text || '').match(/\b((?:9|1)\d{5})\b/);
  return match ? match[1] : '';
}

export function deriveRuleId(input = {}) {
  const rawRuleId = String(input.ruleId || '').trim();
  if (rawRuleId) return rawRuleId;

  const statusCode = Number(input.statusCode);
  const message = String(input.message || '');
  const ruleMessage = String(input.ruleMessage || '');
  const text = `${message} ${ruleMessage}`.toLowerCase();

  const embeddedCrs = firstCrsRuleIdFromText(`${message} ${ruleMessage}`);
  if (embeddedCrs) return embeddedCrs;

  if (text.includes('rate limit') || statusCode === 429) return 'RATE-LIMIT';
  if (text.includes('denial of service') || text.includes('ddos') || text.includes('dos')) return 'DOS-PROTECTION';
  if (text.includes('bot') || text.includes('crawler') || text.includes('scanner')) return 'BOT-DETECTION';
  if (text.includes('csrf') || text.includes('security token') || text.includes('referer header') || text.includes('origin header')) {
    return 'CSRF-PROTECTION';
  }
  if (text.includes('sql injection') || text.includes('sqli')) return 'SQLI';
  if (text.includes('cross-site scripting') || text.includes('xss')) return 'XSS';
  if (text.includes('path traversal') || text.includes('/etc/passwd') || text.includes('system file access')) {
    return 'PATH-TRAVERSAL';
  }
  if (text.includes('remote code execution') || text.includes('rce')) return 'RCE';
  if (text.includes('ssrf') || text.includes('metadata endpoint') || text.includes('dangerous url scheme')) {
    return 'SSRF';
  }
  if (text.includes('xxe') || text.includes('external entity')) return 'XXE';
  if (text.includes('unauthorized http method') || text.includes('disallowed http method')) {
    return 'METHOD-ENFORCEMENT';
  }
  if (input.blocked) return 'WAF-BLOCK';

  if (statusCode >= 500) return 'ORIGIN-5XX';
  if (statusCode >= 400) return `HTTP-${Math.floor(statusCode / 100)}XX`;

  return 'WAF-EVENT';
}
