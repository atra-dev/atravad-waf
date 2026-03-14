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
  host = host.replace(/:\d+$/, '');

  // Keep FQDN semantics but normalize accidental trailing dots.
  host = host.replace(/\.+$/, '');

  return host;
}
