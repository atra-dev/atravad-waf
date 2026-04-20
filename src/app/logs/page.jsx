'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import GeographicAnalytics from '@/components/GeographicAnalytics';
import TrafficAnalytics from '@/components/TrafficAnalytics';
import { normalizeDomainInput } from '@/lib/domain-utils';
import { isValidIp, normalizeIpAddress } from '@/lib/ip-utils';
import { deriveRuleId } from '@/lib/log-rule-utils';
import { ANALYTICS_DISPLAY_HOURS, formatAnalyticsDisplayWindow } from '@/lib/analytics-window';
import ConfirmationModal from '@/app/policies/ConfirmationModal';
import FeedbackModal from '@/app/policies/FeedbackModal';

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
  const [apps, setApps] = useState([]);
  const [policies, setPolicies] = useState([]);
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs', 'geographic', 'traffic'
  const [selectedLog, setSelectedLog] = useState(null);
  const [policyActionState, setPolicyActionState] = useState({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    tone: 'blue',
    action: null,
  });
  const [policyActionBusy, setPolicyActionBusy] = useState(false);
  const [policyFeedbackState, setPolicyFeedbackState] = useState({
    open: false,
    title: '',
    description: '',
    tone: 'blue',
  });
  const [logCount, setLogCount] = useState(0);
  const hasActiveFilters = Boolean(
    filters.site ||
    filters.severity ||
    filters.action ||
    filters.search.trim()
  );
  const analyticsRequestCount = Number(
    analyticsData?.summary?.visibleRequestCount ??
    analyticsData?.summary?.totalRequests ??
    0
  );
  const [selectedLogStoredCount, setSelectedLogStoredCount] = useState(null);
  const [selectedLogExactCount, setSelectedLogExactCount] = useState(null);
  const filterSelectClassName =
    'block w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-2 shadow-sm theme-text-primary focus:border-[var(--accent-strong)] focus:ring-[var(--accent-strong)] sm:text-sm';
  
  // Multi-tenancy state
  const [hasTenant, setHasTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '' });
  const [submittingTenant, setSubmittingTenant] = useState(false);
  const lastLogsRequestKeyRef = useRef('');
  const lastAnalyticsRequestKeyRef = useRef('');
  const visibleAnalyticsCount = hasActiveFilters
    ? Number.isFinite(Number(logCount))
      ? Number(logCount)
      : logs.length
    : Number.isFinite(Number(analyticsRequestCount)) && Number(analyticsRequestCount) > 0
      ? Number(analyticsRequestCount)
      : Number.isFinite(Number(logCount))
        ? Number(logCount)
        : logs.length;
  const logsTabCount = visibleAnalyticsCount;
  const analyticsTabCount = Number.isFinite(Number(analyticsRequestCount)) && Number(analyticsRequestCount) > 0
    ? Number(analyticsRequestCount)
    : logsTabCount;

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

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 450);
    return () => clearTimeout(handle);
  }, [filters.search]);

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
        setApps(data);
        const uniqueSites = [...new Set(
          data
            .map((app) => normalizeDomainInput(String(app?.domain || '')))
            .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));
        setSites(uniqueSites);
      } else {
        setApps([]);
        setSites([]);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      setApps([]);
      setSites([]);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      const response = await fetch('/api/policies');
      const data = await response.json();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching policies:', error);
      setPolicies([]);
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
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (forceRefresh) params.append('_ts', String(Date.now()));
      const logsRequestKey = `${params.toString()}|page:${pageToFetch}`;
      if (!forceRefresh && lastLogsRequestKeyRef.current === logsRequestKey) {
        return;
      }
      lastLogsRequestKeyRef.current = logsRequestKey;

      const response = await fetch(`/api/logs?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Logs request failed (${response.status}): ${body.slice(0, 220)}`);
      }
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
        if (debouncedSearch.trim()) {
          const searchLower = debouncedSearch.toLowerCase();
          const normalizedSearchDomain = normalizeDomainInput(debouncedSearch);
          const normalizedSearchIp = normalizeIpAddress(debouncedSearch);
          const normalizedSearchCountryCode = debouncedSearch.toUpperCase();
          filteredLogs = filteredLogs.filter(log =>
            (log.message && log.message.toLowerCase().includes(searchLower)) ||
            (log.source && String(log.source).toLowerCase().includes(searchLower)) ||
            (log.nodeId && log.nodeId.toLowerCase().includes(searchLower)) ||
            (log.ruleId && log.ruleId.toString().includes(searchLower)) ||
            (log.geoCountry && String(log.geoCountry).toLowerCase().includes(searchLower)) ||
            (log.geoCountryCode && String(log.geoCountryCode).toUpperCase() === normalizedSearchCountryCode) ||
            (log.geoAsn && String(log.geoAsn).toLowerCase().includes(searchLower)) ||
            (log.geoAsnName && String(log.geoAsnName).toLowerCase().includes(searchLower)) ||
            (log.geoIsp && String(log.geoIsp).toLowerCase().includes(searchLower)) ||
            (log.geoOrganization && String(log.geoOrganization).toLowerCase().includes(searchLower)) ||
            (log.geoHostname && String(log.geoHostname).toLowerCase().includes(searchLower)) ||
            (log.geoDomain && String(log.geoDomain).toLowerCase().includes(searchLower)) ||
            (log.geoUsageType && String(log.geoUsageType).toLowerCase().includes(searchLower)) ||
            (log.ipAddress && normalizeIpAddress(log.ipAddress) === normalizedSearchIp) ||
            (log.clientIp && normalizeIpAddress(log.clientIp) === normalizedSearchIp) ||
            (
              Array.isArray(log.forwardedFor) &&
              normalizedSearchIp &&
              log.forwardedFor.some((value) => normalizeIpAddress(String(value || '')) === normalizedSearchIp)
            ) ||
            (normalizedSearchDomain && (
              normalizeDomainInput(String(log.source || '')) === normalizedSearchDomain ||
              normalizeDomainInput(String(log.request?.host || '')) === normalizedSearchDomain ||
              normalizeDomainInput(String(log.nodeId || '')) === normalizedSearchDomain
            ))
          );
        }

        setLogs(filteredLogs);
        setLogCount(
          Number.isFinite(Number(data.totalStoredCount))
            ? Number(data.totalStoredCount)
            : filteredLogs.length
        );
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
  }, [debouncedSearch, filters, pagination.pageSize]);

  const fetchAnalyticsSummary = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('hours', String(ANALYTICS_DISPLAY_HOURS));
      if (filters.site) params.append('site', filters.site);
      if (forceRefresh) params.append('_ts', String(Date.now()));
      const analyticsRequestKey = params.toString();
      if (!forceRefresh && lastAnalyticsRequestKeyRef.current === analyticsRequestKey) {
        return;
      }
      lastAnalyticsRequestKeyRef.current = analyticsRequestKey;

      const response = await fetch(`/api/logs/analytics?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Analytics request failed (${response.status}): ${body.slice(0, 220)}`);
      }
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
        await Promise.all([fetchSites(), fetchPolicies()]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking tenant:', error);
      setHasTenant(false);
      setLoading(false);
    }
  }, [fetchPolicies, fetchSites]);

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
        await Promise.all([fetchLogs(), fetchSites(), fetchPolicies()]);
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
      await Promise.all([
        fetchLogs(true, pagination.currentCursor, pagination.page),
        fetchAnalyticsSummary(true),
        fetchSites(),
        fetchPolicies(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const openPolicyFeedback = useCallback(({ title, description, tone = 'blue' }) => {
    setPolicyFeedbackState({
      open: true,
      title,
      description,
      tone,
    });
  }, []);

  const closePolicyFeedback = useCallback(() => {
    setPolicyFeedbackState({
      open: false,
      title: '',
      description: '',
      tone: 'blue',
    });
  }, []);

  const openPolicyActionConfirmation = useCallback(({ title, description, confirmLabel, tone, action }) => {
    setPolicyActionState({
      open: true,
      title,
      description,
      confirmLabel,
      tone,
      action,
    });
  }, []);

  const closePolicyActionConfirmation = useCallback(() => {
    setPolicyActionState({
      open: false,
      title: '',
      description: '',
      confirmLabel: 'Confirm',
      tone: 'blue',
      action: null,
    });
  }, [policyActionBusy]);

  const handleConfirmPolicyAction = useCallback(async () => {
    if (policyActionBusy || typeof policyActionState.action !== 'function') return;

    setPolicyActionBusy(true);
    try {
      await policyActionState.action();
      closePolicyActionConfirmation();
    } finally {
      setPolicyActionBusy(false);
    }
  }, [closePolicyActionConfirmation, policyActionBusy, policyActionState]);

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
        ['Timestamp', 'Severity', 'Level', 'Source', 'Rule ID', 'Message', 'IP Address', 'Country', 'Country Flag', 'ASN', 'ASN Name'].join(','),
        ...logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.severity || '',
          log.level || '',
          log.nodeId || '',
          log.ruleId || '',
          `"${(log.message || '').replace(/"/g, '""')}"`,
          log.ipAddress || '',
          log.geoCountry || 'Unknown',
          getCountryFlagEmoji(log.geoCountryCode) || '',
          log.geoAsn || '',
          `"${String(log.geoAsnName || '').replace(/"/g, '""')}"`,
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

  const getCountryFlagEmoji = (countryCode) => {
    const normalizedCode = String(countryCode || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalizedCode) || normalizedCode === 'XX') return '';
    return String.fromCodePoint(
      ...normalizedCode.split('').map((char) => 127397 + char.charCodeAt(0))
    );
  };

  const getCountryFlagImageUrl = (countryCode) => {
    const normalizedCode = String(countryCode || '').trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(normalizedCode) || normalizedCode === 'xx') return '';
    return `https://flagcdn.com/w40/${normalizedCode}.png`;
  };

  const getLogCountryDisplay = (log) => {
    const countryName = String(log?.geoCountry || '').trim() || 'Unknown';
    const flagUrl = getCountryFlagImageUrl(log?.geoCountryCode);
    return { countryName, flagUrl };
  };

  const getLogSiteKey = useCallback((log) => (
    normalizeDomainInput(String(log?.siteNormalized || log?.site || log?.source || log?.request?.host || ''))
  ), []);

  const getAssignedPolicyContextForLog = useCallback((log) => {
    const siteKey = getLogSiteKey(log);
    if (!siteKey) return { siteKey: '', app: null, policy: null };

    const matchedApp = apps.find((app) => normalizeDomainInput(String(app?.domain || '')) === siteKey) || null;
    if (!matchedApp?.policyId) {
      return { siteKey, app: matchedApp, policy: null };
    }

    const matchedPolicy = policies.find((policy) => policy.id === matchedApp.policyId) || null;
    return { siteKey, app: matchedApp, policy: matchedPolicy };
  }, [apps, getLogSiteKey, policies]);

  const getLogIpAccessState = useCallback((log) => {
    const normalizedIp = normalizeIpAddress(log?.ipAddress || log?.clientIp || '');
    if (!isValidIp(normalizedIp)) return null;

    const { policy } = getAssignedPolicyContextForLog(log);
    if (!policy?.policy?.ipAccessControl) return null;

    const ipAccessControl = policy.policy.ipAccessControl;
    const whitelist = Array.isArray(ipAccessControl.whitelist)
      ? ipAccessControl.whitelist.map((value) => normalizeIpAddress(String(value || ''))).filter(Boolean)
      : [];
    const blacklist = Array.isArray(ipAccessControl.blacklist)
      ? ipAccessControl.blacklist.map((value) => normalizeIpAddress(String(value || ''))).filter(Boolean)
      : [];

    if (blacklist.includes(normalizedIp)) {
      return 'blocked';
    }
    if (whitelist.includes(normalizedIp)) {
      return 'allowed';
    }
    return null;
  }, [getAssignedPolicyContextForLog]);

  const updateLogIpAccessControl = useCallback(async ({ log, mode }) => {
    const normalizedIp = normalizeIpAddress(log?.ipAddress || log?.clientIp || '');
    if (!isValidIp(normalizedIp)) {
      openPolicyFeedback({
        title: 'Invalid client IP',
        description: 'This log entry does not contain a valid client IP address.',
        tone: 'red',
      });
      return;
    }

    const { app, policy } = getAssignedPolicyContextForLog(log);
    if (!app) {
      openPolicyFeedback({
        title: 'No site assignment found',
        description: 'This log entry is not linked to a protected site, so no policy could be updated.',
        tone: 'red',
      });
      return;
    }

    if (!policy) {
      openPolicyFeedback({
        title: 'No policy assigned',
        description: `The site "${app.domain || app.name || 'Unknown site'}" does not have an assigned policy yet.`,
        tone: 'red',
      });
      return;
    }

    const existingIpAccess = policy.policy?.ipAccessControl || {};
    const whitelist = Array.isArray(existingIpAccess.whitelist)
      ? existingIpAccess.whitelist.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const blacklist = Array.isArray(existingIpAccess.blacklist)
      ? existingIpAccess.blacklist.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const currentWhitelist = whitelist.slice().sort((a, b) => a.localeCompare(b));
    const currentBlacklist = blacklist.slice().sort((a, b) => a.localeCompare(b));
    const whitelistSet = new Set(whitelist);
    const blacklistSet = new Set(blacklist);

    if (mode === 'allow') {
      whitelistSet.add(normalizedIp);
      blacklistSet.delete(normalizedIp);
    } else {
      blacklistSet.add(normalizedIp);
      whitelistSet.delete(normalizedIp);
    }

    const nextWhitelist = Array.from(whitelistSet).sort((a, b) => a.localeCompare(b));
    const nextBlacklist = Array.from(blacklistSet).sort((a, b) => a.localeCompare(b));
    const noChange =
      nextWhitelist.join('|') === currentWhitelist.join('|') &&
      nextBlacklist.join('|') === currentBlacklist.join('|');

    if (noChange) {
      openPolicyFeedback({
        title: mode === 'allow' ? 'IP already allowed' : 'IP already blocked',
        description:
          mode === 'allow'
            ? `${normalizedIp} is already in the whitelist for "${policy.name}".`
            : `${normalizedIp} is already in the blacklist for "${policy.name}".`,
        tone: 'blue',
      });
      return;
    }

    const requestBody = {
      policyId: policy.id,
      name: policy.name,
      mode: policy.mode || 'prevention',
      includeOWASPCRS: policy.includeOWASPCRS ?? true,
      sqlInjection: !!policy.policy?.sqlInjection,
      xss: !!policy.policy?.xss,
      fileUpload: !!policy.policy?.fileUpload,
      pathTraversal: !!policy.policy?.pathTraversal,
      rce: !!policy.policy?.rce,
      csrf: !!policy.policy?.csrf,
      sessionFixation: !!policy.policy?.sessionFixation,
      ssrf: !!policy.policy?.ssrf,
      xxe: !!policy.policy?.xxe,
      authBypass: !!policy.policy?.authBypass,
      idor: !!policy.policy?.idor,
      securityMisconfig: !!policy.policy?.securityMisconfig,
      sensitiveDataExposure: !!policy.policy?.sensitiveDataExposure,
      brokenAccessControl: !!policy.policy?.brokenAccessControl,
      securityHeaders: !!policy.policy?.securityHeaders,
      rateLimiting: policy.policy?.rateLimiting || false,
      ipAccessControl: {
        enabled: true,
        whitelist: nextWhitelist,
        blacklist: nextBlacklist,
        whitelistCIDR: Array.isArray(existingIpAccess.whitelistCIDR) ? existingIpAccess.whitelistCIDR : [],
        blacklistCIDR: Array.isArray(existingIpAccess.blacklistCIDR) ? existingIpAccess.blacklistCIDR : [],
      },
      geoBlocking: policy.policy?.geoBlocking || null,
      advancedRateLimiting: policy.policy?.advancedRateLimiting || null,
      botDetection: policy.policy?.botDetection || null,
      advancedFileUpload: policy.policy?.advancedFileUpload || null,
      apiProtection: policy.policy?.apiProtection || null,
      exceptions: Array.isArray(policy.policy?.exceptions) ? policy.policy.exceptions : [],
      virtualPatching: Array.isArray(policy.policy?.virtualPatching) ? policy.policy.virtualPatching : [],
      customRules: Array.isArray(policy.policy?.customRules) ? policy.policy.customRules : [],
      applicationIds: Array.isArray(policy.applicationIds) ? policy.applicationIds : [],
    };

    const response = await fetch('/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const result = await response.json();

    if (!response.ok) {
      openPolicyFeedback({
        title: mode === 'allow' ? 'Unable to whitelist IP' : 'Unable to block IP',
        description: result?.error || 'Failed to update IP access control.',
        tone: 'red',
      });
      return;
    }

    await Promise.all([fetchPolicies(), fetchSites()]);
    openPolicyFeedback({
      title: mode === 'allow' ? 'IP whitelisted' : 'IP blocked',
      description:
        mode === 'allow'
          ? `${normalizedIp} was added to the whitelist for "${policy.name}" and removed from the blocklist if it was present.`
          : `${normalizedIp} was added to the blocklist for "${policy.name}" and removed from the whitelist if it was present.`,
      tone: 'green',
    });
  }, [fetchPolicies, fetchSites, getAssignedPolicyContextForLog, openPolicyFeedback]);

  const handleRequestIpAccessUpdate = useCallback((mode) => {
    if (!selectedLog) return;

    const normalizedIp = normalizeIpAddress(selectedLog.ipAddress || selectedLog.clientIp || '');
    if (!isValidIp(normalizedIp)) {
      openPolicyFeedback({
        title: 'Invalid client IP',
        description: 'This log entry does not contain a valid client IP address.',
        tone: 'red',
      });
      return;
    }

    const { app, policy } = getAssignedPolicyContextForLog(selectedLog);
    const siteLabel = app?.domain || getLogSiteKey(selectedLog) || 'this site';
    if (!policy) {
      openPolicyFeedback({
        title: 'No assigned policy found',
        description: `No active policy assignment was found for "${siteLabel}". Assign a policy to the site first, then try again.`,
        tone: 'red',
      });
      return;
    }

    openPolicyActionConfirmation({
      title: mode === 'allow' ? 'Whitelist this IP?' : 'Block this IP?',
      description:
        mode === 'allow'
          ? `Confirm whitelisting ${normalizedIp} for "${siteLabel}". This will update the assigned policy's IP Access Control whitelist.`
          : `Confirm blocking ${normalizedIp} for "${siteLabel}". This will update the assigned policy's IP Access Control blacklist.`,
      confirmLabel: mode === 'allow' ? 'Allow IP' : 'Block IP',
      tone: mode === 'allow' ? 'blue' : 'red',
      action: () => updateLogIpAccessControl({ log: selectedLog, mode }),
    });
  }, [getAssignedPolicyContextForLog, getLogSiteKey, openPolicyActionConfirmation, openPolicyFeedback, selectedLog, updateLogIpAccessControl]);

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

  // If user doesn't have a tenant, show managed onboarding notice
  if (!hasTenant && !loading && !authLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                Logs ({logsTabCount} requests)
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
                Geographic ({analyticsTabCount} requests)
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
                Traffic Analytics ({analyticsTabCount} requests)
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
                    className={filterSelectClassName}
                    value={filters.severity}
                    onChange={(e) => updateFilters({ severity: e.target.value })}
                  >
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="">All Severities</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="critical">Critical</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="high">High</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="medium">Medium</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="warning">Warning</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="low">Low</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="info">Info</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium theme-text-secondary">Action</label>
                  <select
                    className={filterSelectClassName}
                    value={filters.action}
                    onChange={(e) => updateFilters({ action: e.target.value })}
                  >
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="">All Actions</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="waf_blocked">Blocked by WAF</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="origin_denied">Blocked by Origin</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="allowed">Allowed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium theme-text-secondary">Site</label>
                  <select
                    className={filterSelectClassName}
                    value={filters.site}
                    onChange={(e) => updateFilters({ site: e.target.value })}
                  >
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" value="">All Sites</option>
                    {sites.map((site) => (
                      <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100" key={site} value={site}>{site}</option>
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
                        Site
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-secondary">
                          {(() => {
                            const { countryName, flagUrl } = getLogCountryDisplay(log);
                            return (
                              <div className="flex items-center gap-2">
                                {flagUrl ? (
                                  <img
                                    src={flagUrl}
                                    alt={`${countryName} flag`}
                                    className="h-4 w-5 rounded-sm border border-[var(--border-soft)] object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <span className="inline-flex h-4 w-5 items-center justify-center text-[10px] theme-text-muted">-</span>
                                )}
                                <span>{countryName}</span>
                              </div>
                            );
                          })()}
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
              <div className="theme-modal relative w-full max-w-6xl overflow-hidden rounded-2xl">
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

                <div className="max-h-[74vh] overflow-y-auto bg-[var(--surface-3)] px-4 py-4 sm:px-5 sm:py-5">
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

                  <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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

                    <div className="space-y-4">
                      <div className="theme-surface rounded-2xl p-4 sm:p-5">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] theme-text-muted">Request Context</h3>
                        <dl className="mt-3">
                          {renderDetailRow('Site', getLogSource(selectedLog), { breakAll: true })}
                          <div className="border-b border-[var(--border-soft)] py-2.5">
                            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] theme-text-muted">Client IP</dt>
                            <dd className="space-y-3">
                              <div className="theme-inset-surface overflow-hidden rounded-xl px-3 py-2.5">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-5 theme-text-primary sm:whitespace-pre sm:[scrollbar-width:thin]">
                                    {normalizeIpAddress(selectedLog.ipAddress || selectedLog.clientIp || '') || '-'}
                                  </div>
                                  {getLogIpAccessState(selectedLog) === 'blocked' ? (
                                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-300">
                                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.53-10.78a.75.75 0 00-1.06-1.06L10 8.69 7.53 6.22a.75.75 0 00-1.06 1.06L8.94 9.75l-2.47 2.47a.75.75 0 101.06 1.06L10 10.81l2.47 2.47a.75.75 0 001.06-1.06l-2.47-2.47 2.47-2.47z" clipRule="evenodd" />
                                      </svg>
                                      Blocked
                                    </span>
                                  ) : null}
                                  {getLogIpAccessState(selectedLog) === 'allowed' ? (
                                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.415 0l-3-3a1 1 0 111.414-1.42l2.293 2.294 6.543-6.544a1 1 0 011.415 0z" clipRule="evenodd" />
                                      </svg>
                                      Allowed
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRequestIpAccessUpdate('allow')}
                                  disabled={policyActionBusy}
                                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Allow
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestIpAccessUpdate('block')}
                                  disabled={policyActionBusy}
                                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Block
                                </button>
                              </div>
                            </dd>
                          </div>
                          {renderDetailRow('Method', getLogMethod(selectedLog), { mono: true })}
                          {renderDetailRow('URI', getLogUri(selectedLog), { mono: true, breakAll: true })}
                          {renderDetailRow('User Agent', selectedLog.userAgent || selectedLog.request?.headers?.['user-agent'] || '-', { breakWords: true })}
                        </dl>
                      </div>

                      <div className="theme-surface rounded-2xl p-4 sm:p-5">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] theme-text-muted">Network Intelligence</h3>
                        <dl className="mt-3">
                          {renderDetailRow('Country', selectedLog.geoCountry || '-')}
                          {renderDetailRow('Continent', selectedLog.geoContinent || '-')}
                          {renderDetailRow('ASN', selectedLog.geoAsn || '-', { mono: true })}
                          {renderDetailRow('ASN Name', selectedLog.geoAsnName || '-', { breakWords: true })}
                          {renderDetailRow('ISP', selectedLog.geoIsp || '-', { breakWords: true })}
                          {renderDetailRow('Usage Type', selectedLog.geoUsageType || '-')}
                          {renderDetailRow('Hostname(s)', selectedLog.geoHostname || '-', { breakWords: true })}
                          {renderDetailRow('Domain Name', selectedLog.geoDomain || '-', { breakWords: true })}
                        </dl>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
        <ConfirmationModal
          open={policyActionState.open}
          title={policyActionState.title}
          description={policyActionState.description}
          confirmLabel={policyActionState.confirmLabel}
          tone={policyActionState.tone}
          busy={policyActionBusy}
          onConfirm={handleConfirmPolicyAction}
          onCancel={closePolicyActionConfirmation}
        />
        <FeedbackModal
          open={policyFeedbackState.open}
          title={policyFeedbackState.title}
          description={policyFeedbackState.description}
          tone={policyFeedbackState.tone}
          onClose={closePolicyFeedback}
        />
          </>
        )}
      </div>
    </Layout>
  );
}
