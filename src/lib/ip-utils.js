export function normalizeIpAddress(ip) {
  if (!ip || typeof ip !== 'string') return '';
  const trimmed = ip.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7);
  }

  if (trimmed === '::1') {
    return '127.0.0.1';
  }

  return trimmed;
}

export function isPrivateIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized) return false;

  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;

  return false;
}
