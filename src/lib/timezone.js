export const PH_TIME_ZONE = 'Asia/Manila';
export const PH_TIME_ZONE_LABEL = 'PHT';
const DEFAULT_LOCALE = 'en-PH';

function normalizeDate(value) {
  if (!value) return null;

  const date =
    typeof value === 'string' || typeof value === 'number'
      ? new Date(value)
      : typeof value?.toDate === 'function'
        ? value.toDate()
        : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPhilippineDateTime(value, options = {}) {
  const date = normalizeDate(value);
  if (!date) return 'Unknown';

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: PH_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options,
  }).format(date);
}

export function formatPhilippineDate(value, options = {}) {
  const date = normalizeDate(value);
  if (!date) return 'Unknown';

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: PH_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    ...options,
  }).format(date);
}

export function formatPhilippineTime(value, options = {}) {
  const date = normalizeDate(value);
  if (!date) return 'Unknown';

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: PH_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options,
  }).format(date);
}

export function formatPhilippineDateStamp(value = Date.now()) {
  const date = normalizeDate(value);
  if (!date) return 'unknown-date';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}
