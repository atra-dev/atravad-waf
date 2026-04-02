'use client';

import { useCallback, useEffect, useState } from 'react';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import GeographicAnalytics from '@/components/GeographicAnalytics';
import TrafficAnalytics from '@/components/TrafficAnalytics';
import { normalizeDomainInput } from '@/lib/domain-utils';
import { normalizeIpAddress } from '@/lib/ip-utils';
import { deriveRuleId } from '@/lib/log-rule-utils';
import { ANALYTICS_DISPLAY_HOURS, formatAnalyticsDisplayWindow } from '@/lib/analytics-window';

// Icons for tenant creation
const BuildingIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export default function LogsPage() {
  // Verify authentication
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    nextCursor: null,
    currentCursor: null,
    cursorHistory: [],
  });
  const [filters, setFilters] = useState({
    site: '',
    severity: '',
    action: '',
    search: '',
  });
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs', 'geographic', 'traffic'
  const [selectedLog, setSelectedLog] = useState(null);
  const [logCount, setLogCount] = useState(0);
  const totalRequests = Number(
    analyticsData?.summary?.visibleRequestCount ??
    analyticsData?.summary?.totalRequests ??
    0
  );
  const [selectedLogStoredCount, setSelectedLogStoredCount] = useState(null);
  const [selectedLogExactCount, setSelectedLogExactCount] = useState(null);
  
  // Multi-tenancy state
  const [hasTenant, setHasTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '' });
  const [submittingTenant, setSubmittingTenant] = useState(false);
  const visibleAnalyticsCount = Number(
    analyticsData?.summary?.visibleRequestCount ?? analyticsData?.summary?.totalRequests ?? logs.length
  );

  const updateFilters = useCallback((updater) => {
    setFilters((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
    setPagination((prev) => ({
      ...prev,
      page: 1,
      currentCursor: null,
      nextCursor: null,
      cursorHistory: [],
    }));
  }, []);

  const normalizeSeverity = (severity) => {
    const value = String(severity || '').trim().toLowerCase();
    if (value === 'critical') return 'critical';
    if (value === 'high') return 'high';
    if (value === 'medium') return 'medium';
    if (value === 'warn' || value === 'warning') return 'warning';
    if (value === 'low') return 'low';
    if (value === 'info' || value === 'informational') return 'info';
    return value;
  };

  const getDecisionKey = (log) => {
    const decision = String(log?.decision || '').trim().toLowerCase();
    if (decision === 'waf_blocked' || decision === 'origin_denied' || decision === 'allowed') {
      return decision;
    }
    if (Boolean(log?.blocked)) return 'waf_blocked';
    const statusCode = Number(log?.statusCode);
    if (Number.isFinite(statusCode) && statusCode >= 400) return 'origin_denied';
    return 'allowed';
  };

  const getActionDisplay = (log) => {
    const decisionKey = getDecisionKey(log);
    if (decisionKey === 'waf_blocked') {
      return {
        label: 'Blocked by WAF',
        className: 'bg-red-100 text-red-700 border-red-200',
      };
    }
    if (decisionKey === 'origin_denied') {
      return {
        label: 'Blocked by Origin',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    }
    return {
      label: 'Allowed',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
  };

  const fetchSites = useCallback(async () => {
    try {
      const response = await fetch('/api/apps');
      const data = await response.json();
      if (Array.isArray(data)) {
        const uniqueSites = [...new Set(
          data
            .map((app) => normalizeDomainInput(String(app?.domain || '')))
            .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));
        setSites(uniqueSites);
      } else {
        setSites([]);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
    }
  }, []);

  const fetchLogs = useCallback(async (forceRefresh = false, cursorToFetch = null, pageToFetch = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('pageSize', String(pagination.pageSize || 100));
      params.append('hours', String(ANALYTICS_DISPLAY_HOURS));
      if (cursorToFetch) params.append('cursor', cursorToFetch);
      if (filters.site) params.append('site', filters.site);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.action) params.append('decision', filters.action);
      if (forceRefresh) params.append('_ts', String(Date.now()));

      const response = await fetch(`/api/logs?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (Array.isArray(data.logs)) {
        let filteredLogs = data.logs;

        if (filters.severity) {
          const selectedSeverity = normalizeSeverity(filters.severity);
          filteredLogs = filteredLogs.filter(
            (log) => normalizeSeverity(log.severity) === selectedSeverity
          );
        }
        if (filters.site) {
          const selectedSite = normalizeDomainInput(filters.site);
          filteredLogs = filteredLogs.filter((log) => {
            const sourceSite = normalizeDomainInput(String(log.source || ''));
            const hostSite = normalizeDomainInput(String(log.request?.host || ''));
            const nodeSite = normalizeDomainInput(String(log.nodeId || ''));
            return sourceSite === selectedSite || hostSite === selectedSite || nodeSite === selectedSite;
          });
        }
        if (filters.action) {
          filteredLogs = filteredLogs.filter((log) => {
            return getDecisionKey(log) === filters.action;
          });
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const normalizedSearchDomain = normalizeDomainInput(filters.search);
          filteredLogs = filteredLogs.filter(log =>
            (log.message && log.message.toLowerCase().includes(searchLower)) ||
            (log.source && String(log.source).toLowerCase().includes(searchLower)) ||
            (log.nodeId && log.nodeId.toLowerCase().includes(searchLower)) ||
            (log.ruleId && log.ruleId.toString().includes(searchLower)) ||
            (normalizedSearchDomain && (
              normalizeDomainInput(String(log.source || '')) === normalizedSearchDomain ||
              normalizeDomainInput(String(log.request?.host || '')) === normalizedSearchDomain ||
              normalizeDomainInput(String(log.nodeId || '')) === normalizedSearchDomain
            ))
          );
        }

        setLogs(filteredLogs);
        setLogCount(Number(data.totalStoredCount ?? filteredLogs.length));
        setPagination((prev) => ({
          ...prev,
          page: pageToFetch,
          pageSize: Number(data.pageSize || prev.pageSize || 100),
          nextCursor: data.nextCursor || null,
        }));
      } else {
        setLogs([]);
        setLogCount(0);
        setPagination((prev) => ({
          ...prev,
          page: 1,
          currentCursor: null,
          nextCursor: null,
          cursorHistory: [],
        }));
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize]);

  const fetchAnalyticsSummary = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('hours', String(ANALYTICS_DISPLAY_HOURS));
      if (filters.site) params.append('site', filters.site);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.action) params.append('decision', filters.action);
      if (forceRefresh) params.append('_ts', String(Date.now()));

      const response = await fetch(`/api/logs/analytics?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const checkTenantAndFetchData = useCallback(async () => {
    try {
      const [tenantRes, userRes] = await Promise.all([
        fetch('/api/tenants/current'),
        fetch('/api/users/me'),
      ]);
      
      const tenant = await tenantRes.json();
      const user = await userRes.json();
      
      const userHasTenantName = user?.tenantName && 
        typeof user.tenantName === 'string' && 
        user.tenantName.trim() !== '';
      const hasValidTenantFromAPI = !!(tenant?.id && 
        tenant?.name && 
        tenant.name !== 'Default Tenant');
      const userHasTenant = !!userHasTenantName || hasValidTenantFromAPI;
      
      setHasTenant(userHasTenant);
      setTenantName(tenant?.name || '');
      
      if (userHasTenant) {
        await Promise.all([fetchLogs(), fetchSites()]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking tenant:', error);
      setHasTenant(false);
      setLoading(false);
    }
  }, [fetchLogs, fetchSites]);

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setSubmittingTenant(true);

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tenantFormData.name }),
      });

      if (response.ok) {
        const tenantData = await response.json();
        setHasTenant(true);
        setTenantName(tenantData.name);
        setShowTenantForm(false);
        setTenantFormData({ name: '' });
        await Promise.all([fetchLogs(), fetchSites()]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      alert('Failed to create organization');
    } finally {
      setSubmittingTenant(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      checkTenantAndFetchData();
    }
  }, [checkTenantAndFetchData, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && hasTenant) {
      fetchLogs(false, pagination.currentCursor, pagination.page);
    }
  }, [fetchLogs, hasTenant, isAuthenticated, pagination.currentCursor, pagination.page]);

  useEffect(() => {
    if (isAuthenticated && hasTenant) {
      fetchAnalyticsSummary();
    }
  }, [fetchAnalyticsSummary, hasTenant, isAuthenticated]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchLogs(true, pagination.currentCursor, pagination.page), fetchAnalyticsSummary(true), fetchSites()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = (direction) => {
    if (direction === 'next' && pagination.nextCursor) {
      setPagination((prev) => ({
        ...prev,
        page: prev.page + 1,
        cursorHistory: [...prev.cursorHistory, prev.currentCursor],
        currentCursor: prev.nextCursor,
      }));
      return;
    }
    if (direction === 'previous' && pagination.page > 1) {
      setPagination((prev) => {
        const cursorHistory = [...prev.cursorHistory];
        const previousCursor = cursorHistory.pop() || null;
        return {
          ...prev,
          page: Math.max(prev.page - 1, 1),
          cursorHistory,
          currentCursor: previousCursor,
        };
      });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csvContent = [
        ['Timestamp', 'Severity', 'Level', 'Source', 'Rule ID', 'Message', 'IP Address'].join(','),
        ...logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.severity || '',
          log.level || '',
          log.nodeId || '',
          log.ruleId || '',
          `"${(log.message || '').replace(/"/g, '""')}"`,
          log.ipAddress || '',
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waf-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (normalizeSeverity(severity)) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-lime-100 text-lime-800 border-lime-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLogSource = (log) =>
    normalizeDomainInput(String(log?.source || '')) ||
    normalizeDomainInput(String(log?.request?.host || '')) ||
    String(log?.nodeId || '').trim() ||
    '-';

  const getLogMethod = (log) => String(log?.method || log?.request?.method || '').trim() || '-';

  const getLogUri = (log) => String(log?.uri || log?.request?.uri || log?.request?.path || '').trim() || '-';

  const getForwardedForDisplay = (log) => {
    const forwardedFor = log?.forwardedFor;
    if (Array.isArray(forwardedFor)) {
      const values = forwardedFor.filter(Boolean);
      return values.length > 0 ? values.join(', ') : '-';
    }
    return String(forwardedFor || '').trim() || '-';
  };

  const simplifyRuleMessage = (log) => {
    const rawMessage = String(log?.ruleMessage || log?.message || '').trim();
    if (!rawMessage) return '-';

    const lowerMessage = rawMessage.toLowerCase();
    const matchedMsg =
      rawMessage.match(/\[msg\s+"([^"]+)"\]/i)?.[1] ||
      rawMessage.match(/msg:'([^']+)'/i)?.[1] ||
      rawMessage;
    const normalizedMsg = matchedMsg.replace(/\s+/g, ' ').trim();
    const lowerNormalizedMsg = normalizedMsg.toLowerCase();

    if (lowerMessage.includes('csrf') || lowerNormalizedMsg.includes('csrf')) {
      if (lowerMessage.includes('missing or invalid csrf token') || lowerNormalizedMsg.includes('missing or invalid csrf token')) {
        return 'This request is missing a valid security token, so it was blocked for protection.';
      }
      if (lowerMessage.includes('origin header validation failed') || lowerNormalizedMsg.includes('origin header validation failed')) {
        return 'This request came from an untrusted source and was blocked for protection.';
      }
      if (lowerMessage.includes('referer header validation failed') || lowerNormalizedMsg.includes('referer header validation failed')) {
        return 'This request came from an untrusted page and was blocked for protection.';
      }
      return 'This request was blocked because the security check for the form or session did not pass.';
    }

    if (lowerMessage.includes('sql injection') || lowerNormalizedMsg.includes('sql injection')) {
      return 'This request looked like a database attack, so it was blocked.';
    }

    if (lowerMessage.includes('cross-site scripting') || lowerMessage.includes('xss') || lowerNormalizedMsg.includes('cross-site scripting') || lowerNormalizedMsg.includes('xss')) {
      return 'This request looked unsafe because it may contain harmful script content.';
    }

    if (lowerMessage.includes('path traversal') || lowerNormalizedMsg.includes('path traversal')) {
      return 'This request tried to access a restricted file path and was blocked.';
    }

    if (lowerMessage.includes('access denied') || lowerMessage.includes('blocked') || lowerNormalizedMsg.includes('access denied')) {
      return `${normalizedMsg.replace(/^modsecurity:\s*/i, '')}.`.replace(/\.\./g, '.');
    }

    return normalizedMsg.replace(/^modsecurity:\s*/i, '');
  };

  const renderDetailRow = (label, value, options = {}) => {
    const { mono = false, breakAll = false, breakWords = false } = options;
    const isLongContent = breakAll || breakWords || mono;
      const valueClassName = [
        'min-w-0 text-sm leading-5 theme-text-primary',
      mono ? 'font-mono' : '',
      breakAll ? 'break-all sm:break-normal' : '',
      breakWords ? 'break-words sm:break-normal' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
        <div className="border-b border-[var(--border-soft)] py-2.5 last:border-b-0">
          <dt className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] theme-text-muted">{label}</dt>
          <dd
            className={
              isLongContent
                ? 'theme-inset-surface overflow-hidden rounded-xl px-3 py-2.5'
                : ''
            }
          >
          <div
            className={`${valueClassName}${isLongContent ? ' overflow-x-auto whitespace-pre-wrap sm:whitespace-pre sm:[scrollbar-width:thin]' : ''}`}
          >
            {value}
          </div>
        </dd>
      </div>
    );
  };

  // If user doesn't have a tenant, show managed onboarding notice
  if (!hasTenant && !loading && !authLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold theme-text-primary">Security Logs & Audit</h1>
              <p className="mt-1 text-sm theme-text-secondary">
                View and analyze security events and audit logs
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/35 bg-amber-400/10 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 shadow-sm">
                <BuildingIcon className="h-8 w-8 text-amber-300" />
              </div>
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold theme-text-primary">Tenant assignment required</h2>
                <p className="mt-3 text-sm leading-7 theme-text-secondary">
                  Security logs and analytics are available only after the ATRAVA Defense super admin team provisions your tenant and assigns your account.
                </p>
                <p className="mt-2 text-sm leading-7 theme-text-muted">
                  Contact the ATRAVA Defense operations team to complete managed onboarding and enable access to your security data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    if (!selectedLog) {
      setSelectedLogStoredCount(null);
      setSelectedLogExactCount(null);
      return;
    }

    const selectedSite = normalizeDomainInput(
      String(selectedLog.siteNormalized || selectedLog.site || selectedLog.source || selectedLog.request?.host || '')
    );
    if (!selectedSite) {
      setSelectedLogStoredCount(null);
      setSelectedLogExactCount(null);
      return;
    }
    const selectedMethod = String(
      selectedLog.method ||
      selectedLog.request?.method ||
      selectedLog.request?.requestMethod ||
      selectedLog.request?.request_method ||
      selectedLog.request?.verb ||
      ''
    )
      .trim()
      .toUpperCase();
    const selectedUri = String(
      selectedLog.uri ||
      selectedLog.request?.uri ||
      selectedLog.request?.path ||
      selectedLog.request?.requestUri ||
      selectedLog.request?.request_uri ||
      ''
    )
      .trim();

    const fetchStoredCountForSite = async () => {
      try {
        const params = new URLSearchParams();
        params.append('pageSize', '1');
        params.append('hours', String(ANALYTICS_DISPLAY_HOURS));
        params.append('site', selectedSite);
        const response = await fetch(`/api/logs?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json();
        if (Number.isFinite(data?.totalStoredCount)) {
          setSelectedLogStoredCount(Number(data.totalStoredCount));
        } else {
          setSelectedLogStoredCount(null);
        }
      } catch (error) {
        console.error('Error fetching stored log count:', error);
        setSelectedLogStoredCount(null);
      }
    };

    const fetchExactCount = async () => {
      if (!selectedMethod || !selectedUri) {
        setSelectedLogExactCount(0);
        return;
      }
      try {
        const params = new URLSearchParams();
        params.append('countOnly', 'true');
        params.append('hours', String(ANALYTICS_DISPLAY_HOURS));
        params.append('site', selectedSite);
        params.append('decision', String(selectedLog.decision || '').toLowerCase());
        params.append('method', selectedMethod);
        params.append('uri', selectedUri);
        const response = await fetch(`/api/logs?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json();
        if (Number.isFinite(data?.totalStoredCount)) {
          setSelectedLogExactCount(Number(data.totalStoredCount));
        } else {
          setSelectedLogExactCount(0);
        }
      } catch (error) {
        console.error('Error fetching exact log count:', error);
        setSelectedLogExactCount(0);
      }
    };

    fetchStoredCountForSite();
    fetchExactCount();
  }, [selectedLog]);

  return (
    <Layout>
      <div className="space-y-6">
        {authLoading ? (
          <AppLoadingState
            title="Loading security logs"
            message="Authenticating access and preparing your managed event stream."
          />
        ) : (
          <>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold theme-text-primary">Security Logs & Analytics</h1>
            <p className="mt-2 text-sm theme-text-secondary">
              View and analyze security events, blocked attacks, and rollup-based traffic patterns
            </p>
            {tenantName && <p className="mt-1 text-xs theme-text-muted">Organization: <span className="font-medium theme-text-secondary">{tenantName}</span></p>}
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'logs' && (
              <>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="flex items-center space-x-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 font-medium theme-text-secondary hover:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m14.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-14.357-2m14.357 2H15" />
                  </svg>
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting || logs.length === 0}
                  className="flex items-center space-x-2 rounded-lg bg-[var(--accent-strong)] px-4 py-2 font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="theme-surface rounded-xl">
          <div className="border-b border-[var(--border-soft)]">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('logs')}
                className={`${
                  activeTab === 'logs'
                    ? 'border-[var(--accent-strong)] text-[var(--accent-strong)]'
                    : 'border-transparent theme-text-muted hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Logs ({totalRequests} requests)
              </button>
              <button
                onClick={() => setActiveTab('geographic')}
                className={`${
                  activeTab === 'geographic'
                    ? 'border-[var(--accent-strong)] text-[var(--accent-strong)]'
                    : 'border-transparent theme-text-muted hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Geographic ({visibleAnalyticsCount} requests)
              </button>
              <button
                onClick={() => setActiveTab('traffic')}
                className={`${
                  activeTab === 'traffic'
                    ? 'border-[var(--accent-strong)] text-[var(--accent-strong)]'
                    : 'border-transparent theme-text-muted hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Traffic Analytics ({visibleAnalyticsCount} requests)
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'logs' && (
          <>

            {/* Filters */}
            <div className="theme-surface rounded-xl p-6">
              <h2 className="mb-4 text-lg font-semibold theme-text-primary">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium theme-text-secondary">Search</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-2 shadow-sm theme-text-primary focus:border-[var(--accent-strong)] focus:ring-[var(--accent-strong)] sm:text-sm"
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => updateFilters({ search: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium theme-text-secondary">Severity</label>
                  <select
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    value={filters.severity}
                    onChange={(e) => updateFilters({ severity: e.target.value })}
                  >
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="warning">Warning</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                  <select
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    value={filters.action}
                    onChange={(e) => updateFilters({ action: e.target.value })}
                  >
                    <option value="">All Actions</option>
                    <option value="waf_blocked">Blocked by WAF</option>
                    <option value="origin_denied">Blocked by Origin</option>
                    <option value="allowed">Allowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
                  <select
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    value={filters.site}
                    onChange={(e) => updateFilters({ site: e.target.value })}
                  >
                    <option value="">All Sites</option>
                    {sites.map((site) => (
                      <option key={site} value={site}>{site}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="theme-surface overflow-hidden rounded-xl">
            <div className="border-b border-[var(--border-soft)] px-6 py-4">
              <h2 className="text-lg font-semibold theme-text-primary">
                Logs (Page {pagination.page})
              </h2>
            </div>

          {authLoading || loading ? (
            <AppLoadingState
              variant="panel"
              title="Loading event timeline"
              message="Compiling the latest WAF decisions, severities, and request activity."
            />
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rule ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)] bg-[var(--surface-2)]">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="cursor-pointer hover:bg-[var(--surface-3)]"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                            {log.severity || 'info'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const action = getActionDisplay(log);
                            return (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${action.className}`}
                          >
                            {action.label}
                          </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-secondary">
                          {getLogSource(log)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-secondary">
                          {deriveRuleId(log)}
                        </td>
                        <td className="px-6 py-4 text-sm theme-text-primary">
                          <div
                            className="max-w-[34rem] overflow-hidden text-ellipsis whitespace-nowrap text-sm theme-text-primary"
                            title={log.message || 'No message'}
                          >
                            {log.message || 'No message'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-secondary">
                          {normalizeIpAddress(log.ipAddress || log.clientIp || '') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] px-6 py-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm theme-text-secondary">
                  Showing up to {logs.length} stored raw events from the {formatAnalyticsDisplayWindow().toLowerCase()}.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handlePageChange('previous')}
                    disabled={pagination.page <= 1}
                    className="theme-button-neutral rounded-lg px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm border rounded-lg bg-blue-600 text-white border-blue-600">
                    {pagination.page}
                  </span>
                  <button
                    onClick={() => handlePageChange('next')}
                    disabled={!pagination.nextCursor}
                    className="theme-button-neutral rounded-lg px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
          </>
        )}

        {activeTab === 'geographic' && (
          <div className="theme-surface rounded-xl p-6">
            {authLoading || loading ? (
              <AppLoadingState
                variant="panel"
                title="Loading geographic analytics"
                message="Mapping requests and blocked events across source locations."
              />
            ) : (
              <GeographicAnalytics analytics={analyticsData} />
            )}
          </div>
        )}

        {activeTab === 'traffic' && (
          <div className="theme-surface rounded-xl p-6">
            {authLoading || loading ? (
              <AppLoadingState
                variant="panel"
                title="Loading traffic analytics"
                message="Building the traffic view for requests, attack volume, and decision patterns."
              />
            ) : (
              <TrafficAnalytics analytics={analyticsData} />
            )}
          </div>
        )}

        {selectedLog && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={() => setSelectedLog(null)}
              />
              <div className="theme-modal relative w-full max-w-4xl overflow-hidden rounded-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] bg-[var(--surface-1)] px-5 py-5 sm:px-6">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Security Event</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight theme-text-primary sm:text-[2rem]">Log Details</h2>
                    <p className="mt-1 text-sm theme-text-secondary">
                      {new Date(selectedLog.timestamp).toLocaleString()} • {getLogSource(selectedLog)}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] theme-text-muted">
                      {formatAnalyticsDisplayWindow()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="theme-button-neutral shrink-0 rounded-xl p-2 transition"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="max-h-[72vh] overflow-y-auto bg-[var(--surface-3)] px-4 py-4 sm:px-5 sm:py-5">
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getSeverityColor(selectedLog.severity)}`}>
                      {String(selectedLog.severity || 'info').toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getActionDisplay(selectedLog).className}`}>
                      {getActionDisplay(selectedLog).label}
                    </span>
                    <span className="theme-soft-surface inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium theme-text-secondary">
                      Rule {deriveRuleId(selectedLog)}
                    </span>
                    <span className="theme-soft-surface inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium theme-text-secondary">
                      {getLogMethod(selectedLog)} {selectedLog.statusCode ?? '-'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
                    <div className="theme-surface rounded-2xl p-4 sm:p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] theme-text-muted">Event Summary</h3>
                      <dl className="mt-3">
                        {renderDetailRow('Rule ID', deriveRuleId(selectedLog), { mono: true })}
                        {renderDetailRow('Rule Message', simplifyRuleMessage(selectedLog), { breakWords: true })}
                        {renderDetailRow('Status Code', selectedLog.statusCode ?? '-')}
                        {renderDetailRow('Decision', selectedLog.decision || '-', { mono: true })}
                        {renderDetailRow('Message', selectedLog.message || '-', { breakWords: true })}
                      </dl>
                    </div>

                    <div className="theme-surface rounded-2xl p-4 sm:p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] theme-text-muted">Request Context</h3>
                      <dl className="mt-3">
                        {renderDetailRow('Site', getLogSource(selectedLog), { breakAll: true })}
                        {renderDetailRow('Client IP', normalizeIpAddress(selectedLog.ipAddress || selectedLog.clientIp || '') || '-', { mono: true })}
                        {renderDetailRow('Method', getLogMethod(selectedLog), { mono: true })}
                        {renderDetailRow('URI', getLogUri(selectedLog), { mono: true, breakAll: true })}
                        {renderDetailRow('User Agent', selectedLog.userAgent || selectedLog.request?.headers?.['user-agent'] || '-', { breakWords: true })}
                        {renderDetailRow('Country', selectedLog.geoCountry || '-')}
                        {renderDetailRow('Continent', selectedLog.geoContinent || '-')}
                      </dl>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </Layout>
  );
}
