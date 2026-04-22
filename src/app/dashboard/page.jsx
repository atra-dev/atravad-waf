'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { BlockedTrafficMap } from '@/components/ui/blocked-traffic-map';
import { ANALYTICS_DISPLAY_HOURS, formatAnalyticsDisplayWindow } from '@/lib/analytics-window';

const ANALYTICS_TIME_ZONE = 'Asia/Manila';

const severityMeta = {
  critical: {
    label: 'Critical',
    color: '#b91c1c',
    soft: '#fee2e2',
    emphasis: 'Immediate response needed',
  },
  high: {
    label: 'High',
    color: '#ea580c',
    soft: '#ffedd5',
    emphasis: 'Elevated hostile activity',
  },
  warning: {
    label: 'Warning',
    color: '#a16207',
    soft: '#fef3c7',
    emphasis: 'Needs review',
  },
  medium: {
    label: 'Medium',
    color: '#ca8a04',
    soft: '#fef9c3',
    emphasis: 'Monitored risk',
  },
  low: {
    label: 'Low',
    color: '#0f766e',
    soft: '#ccfbf1',
    emphasis: 'Low-priority noise',
  },
  info: {
    label: 'Info',
    color: '#475569',
    soft: '#e2e8f0',
    emphasis: 'Operational signal',
  },
};

const chartTooltipStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-soft)',
  color: 'var(--text-primary)',
  borderRadius: '16px',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
};

const TenantIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const AppsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const BlockedIpIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7M5 5l6 6-6 6" />
  </svg>
);

const GlobeBlockedIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3c2.5 2.5 4 5.8 4 9s-1.5 6.5-4 9m0-18c-2.5 2.5-4 5.8-4 9s1.5 6.5 4 9m9-9a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8l8 8M16 8l-8 8" />
  </svg>
);

const PulseIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4l3-7 4 14 3-7h4" />
  </svg>
);

const GlobeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3c2.5 2.5 4 5.8 4 9s-1.5 6.5-4 9m0-18c-2.5 2.5-4 5.8-4 9s1.5 6.5 4 9" />
  </svg>
);

function getPolicyAccessControlStats(policies = []) {
  const latestByName = new Map();

  for (const policy of Array.isArray(policies) ? policies : []) {
    const key = String(policy?.name || '').trim() || String(policy?.id || '');
    if (!key || latestByName.has(key)) continue;
    latestByName.set(key, policy);
  }

  const blockedIps = new Set();
  const blockedCountries = new Set();

  for (const policy of latestByName.values()) {
    const ipAccessControl = policy?.policy?.ipAccessControl || policy?.ipAccessControl || {};
    if (Boolean(ipAccessControl?.enabled)) {
      for (const entry of Array.isArray(ipAccessControl.blacklist) ? ipAccessControl.blacklist : []) {
        const normalized = String(entry || '').trim();
        if (normalized) blockedIps.add(normalized);
      }
      for (const entry of Array.isArray(ipAccessControl.blacklistCIDR) ? ipAccessControl.blacklistCIDR : []) {
        const normalized = String(entry || '').trim();
        if (normalized) blockedIps.add(normalized);
      }
    }

    const geoBlocking = policy?.policy?.geoBlocking || policy?.geoBlocking || {};
    if (Boolean(geoBlocking?.enabled)) {
      for (const country of Array.isArray(geoBlocking.blockedCountries) ? geoBlocking.blockedCountries : []) {
        const normalized = String(country || '').trim().toUpperCase();
        if (normalized) blockedCountries.add(normalized);
      }
    }
  }

  return {
    blockedIpCount: blockedIps.size,
    blockedCountryCount: blockedCountries.size,
  };
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

function DashboardMetricCard({ title, value, subtitle, icon: Icon, tone = 'blue' }) {
  const toneClasses = {
    blue: {
      ring: 'ring-sky-500/20',
      icon: 'bg-sky-500/12 text-sky-600 dark:text-sky-300',
      accent: 'from-sky-500/18 via-cyan-500/8 to-transparent',
    },
    emerald: {
      ring: 'ring-emerald-500/20',
      icon: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
      accent: 'from-emerald-500/18 via-teal-500/8 to-transparent',
    },
    amber: {
      ring: 'ring-amber-500/20',
      icon: 'bg-amber-500/14 text-amber-700 dark:text-amber-300',
      accent: 'from-amber-500/16 via-orange-500/8 to-transparent',
    },
    rose: {
      ring: 'ring-rose-500/20',
      icon: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
      accent: 'from-rose-500/18 via-red-500/8 to-transparent',
    },
  };

  const currentTone = toneClasses[tone] || toneClasses.blue;

  return (
    <div className={`theme-surface homepage-tilt-card rounded-[28px] p-5 ring-1 ${currentTone.ring}`}>
      <div className={`pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br ${currentTone.accent} opacity-90`} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">{title}</p>
          <p className="mt-3 text-3xl font-bold leading-tight theme-text-primary">{value}</p>
          <p className="mt-2 text-sm theme-text-secondary">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${currentTone.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function PostureItem({ label, description, tone = 'success' }) {
  const toneClassName =
    tone === 'warning'
      ? 'bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-300'
      : 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300';

  return (
    <div className="theme-inset-surface rounded-2xl px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium theme-text-primary">{label}</p>
          <p className="mt-1 text-xs theme-text-muted">{description}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClassName}`}>
          {tone === 'warning' ? 'Review' : 'Active'}
        </span>
      </div>
    </div>
  );
}

function QuickActionCard({ href, icon: Icon, title, description, tone = 'blue' }) {
  const toneClassName =
    tone === 'emerald'
      ? 'from-emerald-500/16 via-emerald-500/6 to-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : 'from-sky-500/16 via-cyan-500/6 to-transparent bg-sky-500/10 text-sky-700 dark:text-sky-300';

  return (
    <Link
      href={href}
      className="homepage-tilt-card group theme-surface relative overflow-hidden rounded-[24px] p-5"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneClassName}`} />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] shadow-sm">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold theme-text-primary">{title}</p>
            <p className="mt-1 text-sm theme-text-secondary">{description}</p>
          </div>
        </div>
        <svg className="h-5 w-5 shrink-0 theme-text-muted group-hover:text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function RankedSignalPanel({ title, subtitle, items, emptyMessage, renderValue, renderMeta }) {
  return (
    <div className="theme-surface rounded-[32px] p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">{subtitle}</p>
        <h3 className="mt-2 text-2xl font-bold theme-text-primary">{title}</h3>
      </div>
      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={item.id || item.label || item.ip || index} className="theme-inset-surface rounded-2xl px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">#{index + 1}</div>
                  <div className="truncate text-sm font-semibold theme-text-primary">{renderValue(item)}</div>
                  {renderMeta ? <div className="mt-1 text-xs theme-text-muted">{renderMeta(item)}</div> : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-10 text-center text-sm theme-text-muted">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

function SiteRiskCard({ site, rank }) {
  const total = Number(site?.statsTotal || 0);
  const blocked = Number(site?.statsBlocked || 0);
  const allowed = Number(site?.statsAllowed || 0);
  const blockRate = total > 0 ? (blocked / total) * 100 : 0;
  const statusTone =
    blockRate >= 15 ? 'text-rose-700 dark:text-rose-300' :
    blockRate >= 5 ? 'text-amber-700 dark:text-amber-300' :
    'text-emerald-700 dark:text-emerald-300';

  return (
    <div className="theme-surface homepage-tilt-card rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Site #{rank}</div>
          <div className="mt-2 truncate text-lg font-bold theme-text-primary">{site.domain || site.name || 'Unknown site'}</div>
          <div className="mt-1 text-sm theme-text-secondary">
            {site.wafRegionName ? `${site.wafRegionName} edge` : 'Protected application'}
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone} bg-[var(--surface-3)]`}>
          {blockRate.toFixed(1)}% blocked
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="theme-inset-surface rounded-2xl px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] theme-text-muted">Requests</div>
          <div className="mt-1 text-lg font-bold theme-text-primary">{total.toLocaleString()}</div>
        </div>
        <div className="theme-inset-surface rounded-2xl px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] theme-text-muted">Blocked</div>
          <div className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-300">{blocked.toLocaleString()}</div>
        </div>
        <div className="theme-inset-surface rounded-2xl px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] theme-text-muted">Allowed</div>
          <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">{allowed.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="theme-text-muted">Risk pressure</span>
          <span className="font-semibold theme-text-secondary">{blocked.toLocaleString()} blocked events</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--border-soft)]">
          <div
            className={`h-2 rounded-full ${
              blockRate >= 15 ? 'bg-rose-500' : blockRate >= 5 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(blockRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState({
    tenantName: '',
    tenantId: null,
    appCount: 0,
    apps: [],
    policyCount: 0,
    blockedIpCount: 0,
    blockedCountryCount: 0,
    hasTenant: false,
  });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh || !loading) {
      setRefreshing(true);
    }

    try {
      const [tenantRes, appsRes, policiesRes, userRes, analyticsRes] = await Promise.all([
        fetch('/api/tenants/current'),
        fetch('/api/apps'),
        fetch('/api/policies'),
        fetch('/api/users/me'),
        fetch(`/api/logs/analytics?hours=${ANALYTICS_DISPLAY_HOURS}&attacksOnly=true`),
      ]);

      const tenant = await tenantRes.json();
      const apps = await appsRes.json();
      const policies = await policiesRes.json();
      const user = await userRes.json();
      const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;

      const appsArray = Array.isArray(apps) ? apps : [];
      const policiesArray = Array.isArray(policies) ? policies : [];
      const uniquePolicies = new Set(policiesArray.map((policy) => policy.name));
      const policyAccessControlStats = getPolicyAccessControlStats(policiesArray);

      const userHasTenantName =
        user?.tenantName &&
        typeof user.tenantName === 'string' &&
        user.tenantName.trim() !== '';
      const hasValidTenantFromAPI = !!(tenant?.id && tenant?.name && tenant.name !== 'Default Tenant');
      const hasTenant = !!userHasTenantName || hasValidTenantFromAPI;

      setData({
        tenantName: tenant?.name || 'No Tenant',
        tenantId: tenant?.id || null,
        appCount: appsArray.length,
        apps: appsArray,
        policyCount: uniquePolicies.size,
        blockedIpCount: policyAccessControlStats.blockedIpCount,
        blockedCountryCount: policyAccessControlStats.blockedCountryCount,
        hasTenant,
      });
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData({
        tenantName: 'No Tenant',
        tenantId: null,
        appCount: 0,
        apps: [],
        policyCount: 0,
        blockedIpCount: 0,
        blockedCountryCount: 0,
        hasTenant: false,
      });
      setAnalytics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const timeSeries = (analytics?.timeSeries || []).slice(-ANALYTICS_DISPLAY_HOURS).map((item) => ({
    ...item,
    shortLabel: formatBucketLabelShort(item.time),
    totalBlocked: (item.wafBlocked || 0) + (item.originDenied || 0),
  }));

  const totalAttacks = (analytics?.summary?.wafBlocked || 0) + (analytics?.summary?.originDenied || 0);
  const totalRequests = analytics?.summary?.totalRequests || 0;
  const allowedRequests = analytics?.summary?.allowed || 0;
  const uniqueCountries = analytics?.summary?.uniqueCountries || 0;
  const attackRate = totalRequests > 0 ? ((totalAttacks / totalRequests) * 100).toFixed(1) : '0.0';
  const allowedRate = totalRequests > 0 ? ((allowedRequests / totalRequests) * 100).toFixed(1) : '0.0';
  const topAttackType = Array.isArray(analytics?.attackTypes) && analytics.attackTypes.length > 0
    ? analytics.attackTypes[0]
    : null;
  const topBlockedIp = Array.isArray(analytics?.topBlockedIps) && analytics.topBlockedIps.length > 0
    ? analytics.topBlockedIps[0]
    : null;

  const severityChartData = Object.entries(severityMeta)
    .map(([key, meta]) => ({
      key,
      name: meta.label,
      value: analytics?.severityCounts?.[key] || 0,
      color: meta.color,
      soft: meta.soft,
      emphasis: meta.emphasis,
    }))
    .filter((item) => item.value > 0);

  const topSeverity = [...severityChartData].sort((a, b) => b.value - a.value)[0] || null;
  const attackTypeChartData = (analytics?.attackTypes || []).slice(0, 5).map(([type, count]) => ({
    type,
    count,
  }));
  const topBlockedIps = (analytics?.topBlockedIps || []).slice(0, 5).map((item) => ({
    ...item,
    id: item.ip,
  }));
  const topCountries = (analytics?.countries || [])
    .slice()
    .sort((a, b) => (b.blocked || 0) - (a.blocked || 0))
    .slice(0, 5)
    .map((item) => ({
      ...item,
      id: item.code || item.name,
    }));
  const siteRiskCards = (data.apps || [])
    .slice()
    .sort((a, b) => {
      const blockedDelta = Number(b?.statsBlocked || 0) - Number(a?.statsBlocked || 0);
      if (blockedDelta !== 0) return blockedDelta;
      return Number(b?.statsTotal || 0) - Number(a?.statsTotal || 0);
    })
    .slice(0, 6);
  const attackPeak = timeSeries.reduce(
    (peak, item) => (item.totalBlocked > peak.totalBlocked ? item : peak),
    { totalBlocked: 0, shortLabel: '-' }
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
              Security Operations Center
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight theme-text-primary">Security Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 theme-text-secondary">
              Unified visibility into protected applications, attack activity, and security posture.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="theme-soft-surface rounded-full px-4 py-2 text-sm font-medium theme-text-secondary">
              {formatAnalyticsDisplayWindow()}
            </div>
            {refreshing && (
              <div className="flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-sm theme-text-muted">
                <LoadingSpinner size="sm" className="mr-2" />
                Refreshing
              </div>
            )}
          </div>
        </div>

        {!loading && !data.hasTenant && (
          <div className="rounded-[28px] border border-amber-400/35 bg-amber-400/10 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15">
                <TenantIcon className="h-6 w-6 text-amber-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold theme-text-primary">Managed access pending</h3>
                <p className="mt-2 text-sm theme-text-secondary">
                  ATRAVA Defense is provisioned as a managed service. A super admin must create your tenant, assign your account, and complete onboarding before dashboard access is enabled.
                </p>
                <p className="mt-2 text-sm theme-text-muted">
                  Contact the ATRAVA Defense operations team to request tenant assignment or account provisioning.
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && data.hasTenant && (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="theme-surface relative overflow-hidden rounded-[32px] p-6 lg:p-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_28%)]" />
                <div className="relative flex h-full flex-col justify-between gap-8">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                        Protected Tenant
                      </p>
                      <h2 className="mt-3 text-3xl font-bold leading-tight theme-text-primary">
                        {data.tenantName}
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-6 theme-text-secondary">
                        Live overview of traffic pressure, attack patterns, and protected assets.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[360px] xl:grid-cols-2">
                      <div className="theme-inset-surface rounded-2xl px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Requests</div>
                        <div className="mt-2 text-2xl font-bold theme-text-primary">{totalRequests.toLocaleString()}</div>
                        <div className="mt-1 text-xs theme-text-muted">Observed in window</div>
                      </div>
                      <div className="theme-inset-surface rounded-2xl px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Blocked</div>
                        <div className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-300">{totalAttacks.toLocaleString()}</div>
                        <div className="mt-1 text-xs theme-text-muted">{attackRate}% block rate</div>
                      </div>
                      <div className="theme-inset-surface rounded-2xl px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Allowed</div>
                        <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{allowedRequests.toLocaleString()}</div>
                        <div className="mt-1 text-xs theme-text-muted">{allowedRate}% clean traffic</div>
                      </div>
                      <div className="theme-inset-surface rounded-2xl px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Countries</div>
                        <div className="mt-2 text-2xl font-bold theme-text-primary">{uniqueCountries.toLocaleString()}</div>
                        <div className="mt-1 text-xs theme-text-muted">Observed attack sources</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="theme-inset-surface rounded-[24px] px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-700 dark:text-rose-300">
                          <PulseIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold theme-text-primary">Attack Pressure</p>
                          <p className="text-xs theme-text-muted">
                            {attackPeak.totalBlocked > 0 ? `Peak at ${attackPeak.shortLabel}` : 'No spike detected'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="theme-inset-surface rounded-[24px] px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-700 dark:text-amber-300">
                          <ShieldIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold theme-text-primary">Dominant Attack</p>
                          <p className="text-xs theme-text-muted">
                            {topAttackType ? `${topAttackType[0]} • ${Number(topAttackType[1]).toLocaleString()} events` : 'Awaiting analytics data'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="theme-inset-surface rounded-[24px] px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-700 dark:text-sky-300">
                          <GlobeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold theme-text-primary">Noisiest Source</p>
                          <p className="text-xs theme-text-muted">
                            {topBlockedIp ? `${topBlockedIp.ip} • ${topBlockedIp.totalBlocked.toLocaleString()} blocks` : 'No blocked IPs ranked yet'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="theme-surface homepage-tilt-card overflow-hidden rounded-[32px] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Threat Visual</p>
                    <h3 className="mt-2 text-2xl font-bold theme-text-primary">Blocked Traffic Map</h3>
                    <p className="mt-2 text-sm leading-6 theme-text-secondary">
                      Global view of hostile traffic sources and protected edge activity.
                    </p>
                  </div>
                  <div className="rounded-full bg-rose-500/12 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    Live visual
                  </div>
                </div>
                <div className="mt-4 rounded-[24px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(12,18,33,0.98))]">
                  <BlockedTrafficMap />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
              <DashboardMetricCard title="Organization" value={data.tenantName} subtitle="Managed tenant under protection" icon={TenantIcon} tone="blue" />
              <DashboardMetricCard title="Sites" value={data.appCount.toLocaleString()} subtitle="Applications routed through ATRAVA" icon={AppsIcon} tone="emerald" />
              <DashboardMetricCard title="Security Policies" value={data.policyCount.toLocaleString()} subtitle="Policy sets actively enforcing traffic" icon={ShieldIcon} tone="amber" />
              <DashboardMetricCard title="Blocked IPs" value={data.blockedIpCount.toLocaleString()} subtitle="Unique sources on IP deny controls" icon={BlockedIpIcon} tone="rose" />
              <DashboardMetricCard title="Blocked Countries" value={data.blockedCountryCount.toLocaleString()} subtitle="Geo-blocked regions in policy" icon={GlobeBlockedIcon} tone="blue" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <RankedSignalPanel
                title="Top Attacking IPs"
                subtitle="Ranked Signals"
                items={topBlockedIps}
                emptyMessage="Top blocked IPs will appear here once hostile traffic is captured."
                renderValue={(item) => item.ip}
                renderMeta={(item) => `${Number(item.totalBlocked || 0).toLocaleString()} blocked • WAF ${Number(item.wafBlocked || 0).toLocaleString()} • Origin ${Number(item.originDenied || 0).toLocaleString()}`}
              />
              <RankedSignalPanel
                title="Top Attacking Countries"
                subtitle="Ranked Signals"
                items={topCountries}
                emptyMessage="Country rankings will appear here once traffic includes source geolocation."
                renderValue={(item) => item.name || item.code || 'Unknown'}
                renderMeta={(item) => `${Number(item.blocked || 0).toLocaleString()} blocked of ${Number(item.count || 0).toLocaleString()} total requests`}
              />
              <div className="theme-surface rounded-[32px] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Ranked Signals</p>
                <h3 className="mt-2 text-2xl font-bold theme-text-primary">Site Risk Summary</h3>
                <div className="mt-5 space-y-3">
                  {siteRiskCards.length > 0 ? (
                    siteRiskCards.slice(0, 4).map((site, index) => {
                      const total = Number(site?.statsTotal || 0);
                      const blocked = Number(site?.statsBlocked || 0);
                      const blockRate = total > 0 ? ((blocked / total) * 100).toFixed(1) : '0.0';

                      return (
                        <div key={site.id || site.domain || index} className="theme-inset-surface rounded-2xl px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">#{index + 1}</div>
                              <div className="truncate text-sm font-semibold theme-text-primary">{site.domain || site.name || 'Unknown site'}</div>
                              <div className="mt-1 text-xs theme-text-muted">
                                {blocked.toLocaleString()} blocked of {total.toLocaleString()} requests
                              </div>
                            </div>
                            <div className="rounded-full bg-[var(--surface-3)] px-3 py-1 text-xs font-semibold theme-text-secondary">
                              {blockRate}%
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-10 text-center text-sm theme-text-muted">
                      Per-site risk will appear here once protected applications have traffic.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="theme-surface overflow-hidden rounded-[32px] p-6">
                <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Traffic Pressure</p>
                    <h3 className="mt-2 text-2xl font-bold theme-text-primary">Attack Volume Trend</h3>
                    <p className="mt-2 text-sm theme-text-secondary">
                      Time-based view of blocked traffic across the active analytics window.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="theme-inset-surface rounded-2xl px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Total</div>
                      <div className="mt-1 text-xl font-bold theme-text-primary">{totalAttacks.toLocaleString()}</div>
                    </div>
                    <div className="theme-inset-surface rounded-2xl px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Peak</div>
                      <div className="mt-1 text-xl font-bold theme-text-primary">{attackPeak.totalBlocked.toLocaleString()}</div>
                    </div>
                    <div className="theme-inset-surface rounded-2xl px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] theme-text-muted">Window</div>
                      <div className="mt-1 text-xl font-bold theme-text-primary">{ANALYTICS_DISPLAY_HOURS}h</div>
                    </div>
                  </div>
                </div>

                {timeSeries.length > 0 ? (
                  <div className="mt-5 h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeSeries} margin={{ top: 12, right: 12, left: -16, bottom: 6 }}>
                        <defs>
                          <linearGradient id="dashboardAttackFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.42} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                        <XAxis dataKey="shortLabel" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip formatterLabel={(label) => `Hour ${label}`} />} />
                        <Area
                          type="monotone"
                          dataKey="totalBlocked"
                          name="Blocked traffic"
                          stroke="#2563eb"
                          strokeWidth={3}
                          fill="url(#dashboardAttackFill)"
                          activeDot={{ r: 5, strokeWidth: 0, fill: '#1d4ed8' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-6 py-16 text-center">
                    <p className="text-sm font-medium theme-text-secondary">No attack trend available</p>
                    <p className="mt-2 text-sm theme-text-muted">
                      Once the WAF records blocked or denied requests, this graph will show burst windows immediately.
                    </p>
                  </div>
                )}
              </div>

              <div className="theme-surface overflow-hidden rounded-[32px] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Risk Mix</p>
                    <h3 className="mt-2 text-2xl font-bold theme-text-primary">Severity Distribution</h3>
                    <p className="mt-2 text-sm theme-text-secondary">
                      Breakdown of event severity across the current analytics window.
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
                    <div className="mt-4 h-[250px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={severityChartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={62}
                            outerRadius={96}
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
                    <div className="mt-4 space-y-3">
                      {severityChartData.map((item) => (
                        <div key={item.key} className="theme-inset-surface rounded-2xl px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <div>
                                <div className="text-sm font-medium theme-text-primary">{item.name}</div>
                                <div className="text-xs theme-text-muted">{item.emphasis}</div>
                              </div>
                            </div>
                            <div className="text-lg font-bold theme-text-primary">{item.value.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-6 py-16 text-center">
                    <p className="text-sm font-medium theme-text-secondary">No severity data available</p>
                    <p className="mt-2 text-sm theme-text-muted">
                      Attack severity will appear here once hostile traffic is classified.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="theme-surface rounded-[32px] p-6">
              <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Protected Applications</p>
                  <h3 className="mt-2 text-2xl font-bold theme-text-primary">Per-Site Traffic Comparison</h3>
                  <p className="mt-2 max-w-2xl text-sm theme-text-secondary">
                    Compare protected applications by traffic volume, blocked activity, and risk level.
                  </p>
                </div>
                <div className="theme-soft-surface rounded-full px-4 py-2 text-sm font-medium theme-text-secondary">
                  {siteRiskCards.length} ranked site{siteRiskCards.length === 1 ? '' : 's'}
                </div>
              </div>

              {siteRiskCards.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
                  {siteRiskCards.map((site, index) => (
                    <SiteRiskCard key={site.id || site.domain || index} site={site} rank={index + 1} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-6 py-16 text-center">
                  <p className="text-sm font-medium theme-text-secondary">No per-site traffic data available</p>
                  <p className="mt-2 text-sm theme-text-muted">
                    Add protected applications and send traffic through the WAF to populate site-level risk cards.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_0.6fr_0.9fr]">
              <div className="theme-surface overflow-hidden rounded-[32px] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Attack Focus</p>
                    <h3 className="mt-2 text-2xl font-bold theme-text-primary">Top Attack Types</h3>
                    <p className="mt-2 text-sm theme-text-secondary">
                      Highest-volume attack categories observed in the current window.
                    </p>
                  </div>
                </div>

                {attackTypeChartData.length > 0 ? (
                  <>
                    <div className="mt-5 h-[280px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={attackTypeChartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                          <XAxis dataKey="type" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="count" name="Attack volume" radius={[12, 12, 0, 0]} fill="#0f766e" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-3">
                      {attackTypeChartData.map((item) => (
                        <div key={item.type} className="theme-inset-surface rounded-2xl px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium theme-text-secondary">{item.type}</span>
                            <span className="text-sm font-semibold theme-text-primary">{item.count.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-6 py-16 text-center">
                    <p className="text-sm font-medium theme-text-secondary">No attack category data yet</p>
                    <p className="mt-2 text-sm theme-text-muted">
                      Once blocked traffic is classified, the top attack families will render here.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="theme-surface rounded-[32px] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Quick Actions</p>
                  <h3 className="mt-2 text-2xl font-bold theme-text-primary">Operator Actions</h3>
                  <div className="mt-5 space-y-4">
                    <QuickActionCard href="/policies" icon={ShieldIcon} title="Create Security Policy" description="Define or tune protection rules for active attack patterns." />
                    <QuickActionCard href="/apps" icon={AppsIcon} title="Add Protected Site" description="Route a new domain through the WAF and start observing traffic." tone="emerald" />
                    <QuickActionCard href="/logs" icon={PulseIcon} title="Investigate Security Logs" description="Pivot into raw events, blocked requests, and source intelligence." />
                  </div>
                </div>

                <div className="theme-surface rounded-[32px] p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Posture</p>
                  <h3 className="mt-2 text-2xl font-bold theme-text-primary">System Status</h3>
                  <div className="mt-5 space-y-3">
                    <PostureItem label="OWASP CRS Integration" description="Core managed ruleset loaded for baseline application protection." />
                    <PostureItem label="ModSecurity Engine" description="Inspection engine running and ready to enforce policy logic." />
                    <PostureItem label="WAF Protection" description="Requests are actively screened before reaching the protected origin." />
                    <PostureItem label="Threat Telemetry" description="Analytics pipeline is available for trend and source visibility." tone={analytics ? 'success' : 'warning'} />
                  </div>
                </div>
              </div>

              <div className="theme-surface rounded-[32px] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Coverage</p>
                    <h3 className="mt-2 text-2xl font-bold theme-text-primary">Security Overview</h3>
                    <p className="mt-2 text-sm theme-text-secondary">
                      Summary of protected assets, active defenses, and traffic visibility.
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    `${data.appCount.toLocaleString()} protected site${data.appCount === 1 ? '' : 's'} in service.`,
                    `${data.policyCount.toLocaleString()} active policy set${data.policyCount === 1 ? '' : 's'} enforcing traffic.`,
                    `${data.blockedIpCount.toLocaleString()} blocked IP entr${data.blockedIpCount === 1 ? 'y' : 'ies'} configured.`,
                    `${data.blockedCountryCount.toLocaleString()} blocked countr${data.blockedCountryCount === 1 ? 'y' : 'ies'} configured.`,
                    `${totalRequests.toLocaleString()} requests observed in ${formatAnalyticsDisplayWindow().toLowerCase()}.`,
                    `${totalAttacks.toLocaleString()} blocked or denied events recorded in the same period.`,
                  ].map((item) => (
                    <div key={item} className="theme-inset-surface rounded-2xl px-4 py-4 text-sm leading-6 theme-text-secondary">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
