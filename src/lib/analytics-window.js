export const ANALYTICS_DISPLAY_HOURS = 8;

export function formatAnalyticsDisplayWindow(hours = ANALYTICS_DISPLAY_HOURS) {
  return `Last ${hours} Hours`;
}
