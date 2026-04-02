'use client';

import { useEffect, useState } from 'react';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { ANALYTICS_DISPLAY_HOURS, formatAnalyticsDisplayWindow } from '@/lib/analytics-window';
import { normalizeIpAddress } from '@/lib/ip-utils';

const ANALYTICS_TIME_ZONE = 'Asia/Manila';

function formatBucketLabel(value, timeZone = ANALYTICS_TIME_ZONE) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: true,
  }).format(date);
}

function getUtcHourBucket(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function buildHourBuckets(hours) {
  const now = Date.now();
  return Array.from({ length: hours }, (_, index) => {
    const offset = (hours - 1 - index) * 60 * 60 * 1000;
    const bucketIso = getUtcHourBucket(now - offset);
    return bucketIso ? { time: bucketIso } : null;
  }).filter(Boolean);
}

export default function AnalyticsPage() {
  // Verify authentication
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [isAuthenticated]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/logs/analytics?hours=${ANALYTICS_DISPLAY_HOURS}&attacksOnly=true`
      );
      const data = await response.json();

      setAnalytics({
        totalAttacks: (data.summary?.wafBlocked || 0) + (data.summary?.originDenied || 0),
        attackTypes: data.attackTypes || [],
        topIPs: data.topIPs || [],
        uniqueIPs: new Set((data.topIPs || []).map(([ip]) => normalizeIpAddress(ip))).size,
        severityCounts: data.severityCounts || { critical: 0, high: 0, medium: 0, warning: 0, info: 0 },
        timeSeries: (data.timeSeries || []).slice(-ANALYTICS_DISPLAY_HOURS),
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <AppLoadingState
            variant="panel"
            title="Loading attack analytics"
            message="Compiling attack trends, severity patterns, and high-risk source intelligence."
          />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useAuth hook
  }

  const timeSeriesMap = new Map(
    (analytics?.timeSeries || []).map((item) => [
      getUtcHourBucket(item.time),
      (item.wafBlocked || 0) + (item.originDenied || 0),
    ])
  );
  const hourlyEntries = buildHourBuckets(ANALYTICS_DISPLAY_HOURS).map((bucket) => ({
    label: formatBucketLabel(bucket.time),
    count: timeSeriesMap.get(bucket.time) || 0,
    time: bucket.time,
  }));
  const maxHourlyCount = Math.max(...hourlyEntries.map((item) => item.count), 1);
  const totalHourlyAttacks = hourlyEntries.reduce((sum, item) => sum + item.count, 0);
  const activeHours = hourlyEntries.filter((item) => item.count > 0).length;
  const peakHourEntry = hourlyEntries.reduce(
    (peak, item) => (item.count > peak.count ? item : peak),
    { hour: null, label: 'No activity', count: 0, time: null }
  );
  const averagePerActiveHour = activeHours > 0 ? totalHourlyAttacks / activeHours : 0;

  const summaryCards = [
    {
      title: 'Total Attacks',
      value: analytics?.totalAttacks || 0,
      valueClassName: 'text-slate-950 dark:text-slate-100',
      iconShellClassName: 'bg-red-100 dark:bg-red-950/40',
      iconClassName: 'text-red-600 dark:text-red-300',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      ),
      filled: false,
    },
    {
      title: 'Critical',
      value: analytics?.severityCounts.critical || 0,
      valueClassName: 'text-red-600 dark:text-red-300',
      iconShellClassName: 'bg-red-100 dark:bg-red-950/40',
      iconClassName: 'text-red-600 dark:text-red-300',
      icon: (
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      ),
      filled: true,
    },
    {
      title: 'High Severity',
      value: analytics?.severityCounts.high || 0,
      valueClassName: 'text-orange-600 dark:text-orange-300',
      iconShellClassName: 'bg-orange-100 dark:bg-orange-950/40',
      iconClassName: 'text-orange-600 dark:text-orange-300',
      icon: (
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      ),
      filled: true,
    },
    {
      title: 'Unique IPs',
      value: analytics?.uniqueIPs || 0,
      valueClassName: 'text-blue-600 dark:text-blue-300',
      iconShellClassName: 'bg-blue-100 dark:bg-blue-950/40',
      iconClassName: 'text-blue-600 dark:text-blue-300',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      ),
      filled: false,
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-100">Attack Analytics</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Visualize blocked and denied traffic trends, attack patterns, and security metrics for the {formatAnalyticsDisplayWindow().toLowerCase()}
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {formatAnalyticsDisplayWindow()}
          </div>
        </div>

        {loading ? (
          <AppLoadingState
            variant="panel"
            title="Loading attack analytics"
            message="Compiling attack trends, severity patterns, and high-risk source intelligence."
          />
        ) : (
          <>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{card.title}</p>
                  <p className={`mt-2 text-3xl font-bold ${card.valueClassName}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconShellClassName}`}>
                  <svg className={`h-6 w-6 ${card.iconClassName}`} fill={card.filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    {card.icon}
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Attack Types Chart */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Attack Types</h2>
            {analytics?.attackTypes && analytics.attackTypes.length > 0 ? (
              <div className="space-y-3">
                {analytics.attackTypes.map(([type, count]) => {
                  const percentage = (count / analytics.totalAttacks) * 100;
                  return (
                    <div key={type}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{type}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all dark:bg-blue-400"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No attack data available</p>
            )}
          </div>

          {/* Top Attacking IPs */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Top Attacking IPs</h2>
            {analytics?.topIPs && analytics.topIPs.length > 0 ? (
              <div className="space-y-3">
                {analytics.topIPs.map(([ip, count], index) => (
                  <div key={ip} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900/80">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">#{index + 1}</span>
                      <span className="text-sm font-mono text-slate-900 dark:text-slate-100">{ip}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-300">{count} attacks</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No IP data available</p>
            )}
          </div>
        </div>

        {/* Hourly Attack Trends */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Attack Trends by Hour</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                See when blocked and denied requests are most concentrated so your team can spot attack windows faster.
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                Timezone: {ANALYTICS_TIME_ZONE}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Peak Hour</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {peakHourEntry.count > 0 ? peakHourEntry.label : 'No activity'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {peakHourEntry.count.toLocaleString()} attacks
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Active Hours</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {activeHours} of {ANALYTICS_DISPLAY_HOURS}
                </div>
                <div className="mt-1 text-xs text-slate-500">Hours with detected attacks</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Avg / Active Hour</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{averagePerActiveHour.toFixed(1)}</div>
                <div className="mt-1 text-xs text-slate-500">Attack events per active hour</div>
              </div>
            </div>
          </div>
          {hourlyEntries.length > 0 ? (
            <div className="mt-5">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-900 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  Higher bars mean more detected attacks in that hour
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-900 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  Zero means no attacks recorded for that hour
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Lower activity</span>
                  <span>Hourly attack volume</span>
                  <span>Higher activity</span>
                </div>
                <div
                  className="grid h-64 items-end gap-2"
                  style={{ gridTemplateColumns: `repeat(${ANALYTICS_DISPLAY_HOURS}, minmax(0, 1fr))` }}
                >
                  {hourlyEntries.map((item) => {
                    const count = item.count;
                    const height = count > 0 ? Math.max((count / maxHourlyCount) * 100, 6) : 0;
                    const isPeakHour = peakHourEntry.count > 0 && item.time === peakHourEntry.time;
                    const hasActivity = count > 0;
                    const barTone = isPeakHour
                      ? 'bg-gradient-to-t from-blue-700 to-cyan-400'
                      : hasActivity
                        ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                        : 'bg-slate-200';

                    return (
                      <div key={item.time} className="flex min-w-0 flex-col items-center justify-end">
                        <div className="mb-2 h-5 text-[11px] font-semibold text-slate-500">
                          {hasActivity ? count : ''}
                        </div>
                        <div className="flex h-52 w-full items-end rounded-xl bg-white/90 px-1.5 py-1 shadow-inner ring-1 ring-slate-200/70 dark:bg-slate-950/80 dark:ring-slate-800">
                          <div
                            className={`w-full rounded-lg transition-all duration-300 ${barTone}`}
                            style={{ height: `${height}%` }}
                            title={`${item.label} - ${count} attacks`}
                          />
                        </div>
                        <span className="mt-2 text-xs text-slate-500">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{totalHourlyAttacks.toLocaleString()}</span> total attacks across the selected range
                </div>
                <div>
                  Peak concentration at{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {peakHourEntry.count > 0 ? peakHourEntry.label : 'No activity'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No trend data available</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Once attacks are detected, this section will highlight the busiest hours automatically.
              </p>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </Layout>
  );
}
