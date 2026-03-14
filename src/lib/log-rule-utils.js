function firstCrsRuleIdFromText(text) {
  const match = String(text || '').match(/\b(9\d{5})\b/);
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

  if (statusCode >= 500) return 'ORIGIN-5XX';
  if (statusCode >= 400) return `HTTP-${Math.floor(statusCode / 100)}XX`;
  if (input.blocked) return 'WAF-BLOCK';

  return 'WAF-EVENT';
}
