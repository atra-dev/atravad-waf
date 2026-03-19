'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import GeographicAnalytics from '@/components/GeographicAnalytics';
import TrafficAnalytics from '@/components/TrafficAnalytics';
import { normalizeDomainInput } from '@/lib/domain-utils';
import { normalizeIpAddress } from '@/lib/ip-utils';
import { deriveRuleId } from '@/lib/log-rule-utils';

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
  const [analyticsLogs, setAnalyticsLogs] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 1,
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
  
  // Multi-tenancy state
  const [hasTenant, setHasTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '' });
  const [submittingTenant, setSubmittingTenant] = useState(false);

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

  useEffect(() => {
    if (isAuthenticated) {
      checkTenantAndFetchData();
    }
  }, [isAuthenticated]);

  // Reset to first page when filters change
  useEffect(() => {
    if (isAuthenticated && hasTenant) {
      setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    }
  }, [filters, hasTenant]);

  // Fetch logs when page changes
  useEffect(() => {
    if (isAuthenticated && hasTenant) {
      fetchLogs(false, pagination.page);
    }
  }, [isAuthenticated, hasTenant, pagination.page]);

  useEffect(() => {
    if (isAuthenticated && hasTenant) {
      fetchAnalyticsLogs();
    }
  }, [isAuthenticated, hasTenant, filters]);

  const checkTenantAndFetchData = async () => {
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
  };

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

  const fetchSites = async () => {
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
  };

  const fetchLogs = async (forceRefresh = false, pageToFetch = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(pageToFetch));
      params.append('pageSize', String(pagination.pageSize || 100));
      if (filters.action) params.append('decision', filters.action);
      if (forceRefresh) params.append('_ts', String(Date.now()));

      const response = await fetch(`/api/logs?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (data.logs) {
        let filteredLogs = data.logs;

        // Normalize and filter severity/level client-side so mixed legacy values
        // (e.g., INFO/info, warn/warning, MEDIUM) are filtered consistently.
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
        // Client-side search filter
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
        setPagination((prev) => ({
          ...prev,
          page: Number(data.page || pageToFetch || 1),
          pageSize: Number(data.pageSize || prev.pageSize || 100),
          totalCount: Number(data.totalCount || 0),
          totalPages: Number(data.totalPages || 1),
        }));
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsLogs = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('all', 'true');
      if (filters.action) params.append('decision', filters.action);
      if (forceRefresh) params.append('_ts', String(Date.now()));

      const response = await fetch(`/api/logs?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (data.logs) {
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

        setAnalyticsLogs(filteredLogs);
      }
    } catch (error) {
      console.error('Error fetching analytics logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchLogs(true, pagination.page), fetchAnalyticsLogs(true), fetchSites()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = (nextPage) => {
    const page = Number(nextPage);
    if (!Number.isFinite(page)) return;
    if (page < 1 || page > (pagination.totalPages || 1)) return;
    setPagination((prev) => ({ ...prev, page }));
  };

  const visiblePages = (() => {
    const total = pagination.totalPages || 1;
    const current = pagination.page || 1;
    const pageSet = new Set([1, total]);
    for (let p = current - 2; p <= current + 2; p += 1) {
      if (p >= 1 && p <= total) pageSet.add(p);
    }
    return Array.from(pageSet).sort((a, b) => a - b);
  })();

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

  // If user doesn't have a tenant, show onboarding
  if (!hasTenant && !loading && !authLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security Logs & Audit</h1>
              <p className="mt-1 text-sm text-gray-600">
                View and analyze security events and audit logs
              </p>
            </div>
          </div>

          {!showTenantForm ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                  <BuildingIcon className="h-10 w-10 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Create Your Organization First
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Before viewing security logs, you need to create an organization. This keeps your logs isolated from other users.
              </p>
              <button
                onClick={() => setShowTenantForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
              >
                <PlusIcon className="h-5 w-5" />
                Create Organization
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                    <BuildingIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Create Your Organization
                </h2>
                <p className="text-sm text-gray-600">
                  Enter a name for your organization to get started
                </p>
              </div>
              <form onSubmit={handleCreateTenant} className="space-y-6">
                <div>
                  <label
                    htmlFor="tenantName"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Organization Name
                  </label>
                  <input
                    type="text"
                    id="tenantName"
                    required
                    placeholder="e.g., Acme Corporation, My Company"
                    value={tenantFormData.name}
                    onChange={(e) => setTenantFormData({ name: e.target.value })}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTenantForm(false);
                      setTenantFormData({ name: '' });
                    }}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTenant || !tenantFormData.name.trim()}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all"
                  >
                    {submittingTenant ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Creating...
                      </span>
                    ) : (
                      'Create & Continue'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Logs & Analytics</h1>
            <p className="mt-2 text-sm text-gray-600">
              View and analyze security events, blocked attacks, and geographic traffic patterns
            </p>
            {tenantName && <p className="mt-1 text-xs text-gray-500">Organization: <span className="font-medium text-gray-700">{tenantName}</span></p>}
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'logs' && (
              <>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m14.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-14.357-2m14.357 2H15" />
                  </svg>
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting || logs.length === 0}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('logs')}
                className={`${
                  activeTab === 'logs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Logs ({logs.length})
              </button>
              <button
                onClick={() => setActiveTab('geographic')}
                className={`${
                  activeTab === 'geographic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Geographic ({analyticsLogs.length})
              </button>
              <button
                onClick={() => setActiveTab('traffic')}
                className={`${
                  activeTab === 'traffic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Traffic Analytics ({analyticsLogs.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'logs' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                  <select
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    value={filters.severity}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
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
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
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
                    onChange={(e) => setFilters({ ...filters, site: e.target.value })}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Logs ({pagination.totalCount.toLocaleString()})
            </h2>
          </div>

          {authLoading || loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
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
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {log.nodeId || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {deriveRuleId(log)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {log.message || 'No message'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {normalizeIpAddress(log.ipAddress || log.clientIp || '') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {visiblePages
                    .map((p, i, arr) => (
                      <span key={`page-wrap-${p}`} className="inline-flex items-center">
                        {i > 0 && arr[i - 1] !== p - 1 ? (
                          <span className="px-1 text-gray-400">...</span>
                        ) : null}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`px-3 py-1.5 text-sm border rounded-lg ${
                            p === pagination.page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {authLoading || loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <GeographicAnalytics logs={analyticsLogs} />
            )}
          </div>
        )}

        {activeTab === 'traffic' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {authLoading || loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <TrafficAnalytics logs={analyticsLogs} />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
