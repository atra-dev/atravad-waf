'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { ANALYTICS_DISPLAY_HOURS, formatAnalyticsDisplayWindow } from '@/lib/analytics-window';
import { normalizeIpAddress } from '@/lib/ip-utils';

const ANALYTICS_TIME_ZONE = 'Asia/Manila';

const chartTooltipStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-soft)',
  color: 'var(--text-primary)',
  borderRadius: '16px',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
};

const severityMeta = {
  critical: {
    label: 'Critical',
    color: '#b91c1c',
    soft: '#fee2e2',
  },
  high: {
    label: 'High',
    color: '#f97316',
    soft: '#ffedd5',
  },
  warning: {
    label: 'Warning',
    color: '#a16207',
    soft: '#fef3c7',
  },
  medium: {
    label: 'Medium',
    color: '#eab308',
    soft: '#fef9c3',
  },
  info: {
    label: 'Info',
    color: '#475569',
    soft: '#e2e8f0',
  },
};

function formatBucketLabel(value, timeZone = ANALYTICS_TIME_ZONE) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: true,
  }).format(date);
}

function formatBucketLabelShort(value, timeZone = ANALYTICS_TIME_ZONE) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: true,
  }).format(date).replace(' ', '');
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

function ChartTooltip({ active, payload, label, formatterLabel }) {
  if (!active || !payload?.length) return null;

  return (
    <div style={chartTooltipStyle} className="min-w-[180px] p-3">
      {label ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] theme-text-muted">
          {formatterLabel ? formatterLabel(label) : label}
        </div>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.dataKey}`} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 theme-text-secondary">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold theme-text-primary">{Number(entry.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
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
      const response = await fetch(`/api/logs/analytics?hours=${ANALYTICS_DISPLAY_HOURS}&attacksOnly=true`);
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
    return null;
  }

  const timeSeriesMap = new Map(
    (analytics?.timeSeries || []).map((item) => [
      getUtcHourBucket(item.time),
      {
        total: (item.wafBlocked || 0) + (item.originDenied || 0),
        wafBlocked: item.wafBlocked || 0,
        originDenied: item.originDenied || 0,
      },
    ])
  );

  const hourlyEntries = buildHourBuckets(ANALYTICS_DISPLAY_HOURS).map((bucket) => {
    const metrics = timeSeriesMap.get(bucket.time) || { total: 0, wafBlocked: 0, originDenied: 0 };
    return {
      time: bucket.time,
      label: formatBucketLabel(bucket.time),
      shortLabel: formatBucketLabelShort(bucket.time),
      total: metrics.total,
      wafBlocked: metrics.wafBlocked,
      originDenied: metrics.originDenied,
    };
  });

  const totalHourlyAttacks = hourlyEntries.reduce((sum, item) => sum + item.total, 0);
  const activeHours = hourlyEntries.filter((item) => item.total > 0).length;
  const peakHourEntry = hourlyEntries.reduce(
    (peak, item) => (item.total > peak.total ? item : peak),
    { label: 'No activity', shortLabel: '-', total: 0, time: null }
  );
  const averagePerActiveHour = activeHours > 0 ? totalHourlyAttacks / activeHours : 0;

  const severityChartData = Object.entries(severityMeta)
    .map(([key, meta]) => ({
      key,
      name: meta.label,
      value: analytics?.severityCounts?.[key] || 0,
      color: meta.color,
      soft: meta.soft,
    }))
    .filter((item) => item.value > 0);

  const topSeverity = [...severityChartData].sort((a, b) => b.value - a.value)[0] || null;

  const attackTypeChartData = (analytics?.attackTypes || []).map(([type, count]) => ({
    type,
    count,
    share: analytics?.totalAttacks ? (count / analytics.totalAttacks) * 100 : 0,
  }));

  const topIpChartData = (analytics?.topIPs || []).slice(0, 6).map(([ip, count]) => ({
    ip,
    count,
    shortIp: ip.length > 14 ? `${ip.slice(0, 14)}...` : ip,
  }));

  const topIpPeak = topIpChartData[0]?.count || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold theme-text-primary">Attack Analytics</h1>
            <p className="mt-2 text-sm theme-text-secondary">
              Visualize blocked and denied traffic trends, attack patterns, and security metrics for the {formatAnalyticsDisplayWindow().toLowerCase()}
            </p>
          </div>
          <div className="theme-soft-surface rounded-full px-4 py-2 text-sm font-medium theme-text-secondary">
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
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="theme-surface min-w-0 overflow-hidden rounded-3xl p-6">
                <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold theme-text-primary">Attack Volume Trend</h2>
                    <p className="mt-1 text-sm theme-text-secondary">
                      A live view of blocked traffic pressure across the selected analytics window.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="theme-inset-surface rounded-2xl px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Total</div>
                      <div className="mt-1 text-xl font-bold theme-text-primary">{(analytics?.totalAttacks || 0).toLocaleString()}</div>
                    </div>
                    <div className="theme-inset-surface rounded-2xl px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Peak</div>
                      <div className="mt-1 text-xl font-bold theme-text-primary">{peakHourEntry.total.toLocaleString()}</div>
                    </div>
                    <div className="theme-inset-surface rounded-2xl px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Unique IPs</div>
                      <div className="mt-1 text-xl font-bold theme-text-primary">{(analytics?.uniqueIPs || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {hourlyEntries.some((item) => item.total > 0) ? (
                  <div className="mt-5 h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyEntries} margin={{ top: 12, right: 12, left: -16, bottom: 6 }}>
                        <defs>
                          <linearGradient id="attackAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                        <XAxis dataKey="shortLabel" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip formatterLabel={(label) => `Hour ${label}`} />} />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Attack volume"
                          stroke="#2563eb"
                          strokeWidth={3}
                          fill="url(#attackAreaFill)"
                          activeDot={{ r: 5, strokeWidth: 0, fill: '#1d4ed8' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-6 py-16 text-center">
                    <p className="text-sm font-medium theme-text-secondary">No trend data available</p>
                    <p className="mt-2 text-sm theme-text-muted">
                      Once attacks are detected, this chart will show when hostile traffic spikes.
                    </p>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="theme-inset-surface rounded-2xl px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Peak Hour</div>
                    <div className="mt-1 text-sm font-semibold theme-text-primary">
                      {peakHourEntry.total > 0 ? peakHourEntry.label : 'No activity'}
                    </div>
                    <div className="mt-1 text-xs theme-text-muted">{peakHourEntry.total.toLocaleString()} attacks</div>
                  </div>
                  <div className="theme-inset-surface rounded-2xl px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Active Hours</div>
                    <div className="mt-1 text-sm font-semibold theme-text-primary">
                      {activeHours} of {ANALYTICS_DISPLAY_HOURS}
                    </div>
                    <div className="mt-1 text-xs theme-text-muted">Hours with observed attack traffic</div>
                  </div>
                  <div className="theme-inset-surface rounded-2xl px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Avg / Active Hour</div>
                    <div className="mt-1 text-sm font-semibold theme-text-primary">{averagePerActiveHour.toFixed(1)}</div>
                    <div className="mt-1 text-xs theme-text-muted">Average attacks during active windows</div>
                  </div>
                </div>
              </div>

              <div className="theme-surface min-w-0 overflow-hidden rounded-3xl p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold theme-text-primary">Severity Distribution</h2>
                    <p className="mt-1 text-sm theme-text-secondary">
                      Shows whether the last attack window is dominated by critical incidents or lower-priority noise.
                    </p>
                  </div>
                  {topSeverity ? (
                    <div
                      className="rounded-full px-3 py-1 text-xs font-semibold ring-1"
                      style={{
                        background: topSeverity.soft,
                        color: topSeverity.color,
                        borderColor: topSeverity.color,
                      }}
                    >
                      Top risk: {topSeverity.name}
                    </div>
                  ) : null}
                </div>

                {severityChartData.length > 0 ? (
                  <>
                    <div className="mt-5 h-[280px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={severityChartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={66}
                            outerRadius={104}
                            paddingAngle={4}
                            stroke="none"
                          >
                            {severityChartData.map((entry) => (
                              <Cell key={entry.key} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {severityChartData.map((item) => (
                        <div key={item.key} className="theme-inset-surface rounded-2xl px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm font-medium theme-text-secondary">{item.name}</span>
                            </div>
                            <span className="text-base font-bold theme-text-primary">{item.value.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-6 py-16 text-center">
                    <p className="text-sm font-medium theme-text-secondary">No severity data available</p>
                    <p className="mt-2 text-sm theme-text-muted">
                      Severity breakdown will appear once attacks are categorized.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="theme-surface min-w-0 overflow-hidden rounded-3xl p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold theme-text-primary">Attack Type Breakdown</h2>
                    <p className="mt-1 text-sm theme-text-secondary">
                      Compares the major attack categories so you can see where policy tuning should focus first.
                    </p>
                  </div>
                  <div className="theme-soft-surface rounded-full px-3 py-1 text-xs font-semibold theme-text-secondary">
                    {attackTypeChartData.length} categories
                  </div>
                </div>

                {attackTypeChartData.length > 0 ? (
                  <>
                    <div className="mt-5 h-[300px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={attackTypeChartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                          <XAxis dataKey="type" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="count" name="Attack volume" radius={[10, 10, 0, 0]} fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-3">
                      {attackTypeChartData.map((item) => (
                        <div key={item.type} className="theme-inset-surface rounded-2xl px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium theme-text-secondary">{item.type}</span>
                            <span className="text-sm font-semibold theme-text-primary">
                              {item.count.toLocaleString()} ({item.share.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-6 py-16 text-center">
                    <p className="text-sm font-medium theme-text-secondary">No attack data available</p>
                    <p className="mt-2 text-sm theme-text-muted">
                      Attack categories will render here once malicious requests are captured.
                    </p>
                  </div>
                )}
              </div>

              <div className="theme-surface min-w-0 overflow-hidden rounded-3xl p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold theme-text-primary">Top Attacking IPs</h2>
                    <p className="mt-1 text-sm theme-text-secondary">
                      Highlights the loudest sources so your team can identify repeat offenders quickly.
                    </p>
                  </div>
                  <div className="theme-soft-surface rounded-full px-3 py-1 text-xs font-semibold theme-text-secondary">
                    Peak source: {topIpPeak.toLocaleString()}
                  </div>
                </div>

                {topIpChartData.length > 0 ? (
                  <>
                    <div className="mt-5 h-[300px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topIpChartData} layout="vertical" margin={{ top: 8, right: 10, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis
                            dataKey="shortIp"
                            type="category"
                            width={96}
                            tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<ChartTooltip formatterLabel={(label) => `Source ${label}`} />} />
                          <Bar dataKey="count" name="Attack requests" radius={[0, 10, 10, 0]} fill="#be123c" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-3">
                      {topIpChartData.map((item, index) => (
                        <div key={item.ip} className="theme-inset-surface rounded-2xl px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] theme-text-muted">#{index + 1}</div>
                              <div className="truncate font-mono text-sm theme-text-primary">{item.ip}</div>
                            </div>
                            <div className="rounded-full bg-[#f6e2e5] px-3 py-1 text-sm font-bold text-[#7f1d1d] ring-1 ring-[#b76a76]">
                              {item.count.toLocaleString()} attacks
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-6 py-16 text-center">
                    <p className="text-sm font-medium theme-text-secondary">No IP data available</p>
                    <p className="mt-2 text-sm theme-text-muted">
                      Once attack sources are recorded, this graph will rank the most aggressive IPs.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </>
        )}
      </div>
    </Layout>
  );
}
