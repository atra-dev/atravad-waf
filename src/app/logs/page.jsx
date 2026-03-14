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
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    level: '',
    severity: '',
    search: '',
  });
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs', 'geographic', 'traffic'
  
  // Multi-tenancy state
  const [hasTenant, setHasTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '' });
  const [submittingTenant, setSubmittingTenant] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      checkTenantAndFetchData();
    }
  }, [isAuthenticated]);

  // Refetch logs when filters change (only if authenticated and has tenant)
  useEffect(() => {
    if (isAuthenticated && hasTenant) {
      fetchLogs();
    }
  }, [filters, hasTenant]);

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
        await fetchLogs();
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
        await fetchLogs();
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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.level) params.append('level', filters.level);
      if (filters.severity) params.append('severity', filters.severity);
      params.append('limit', '100');

      const response = await fetch(`/api/logs?${params.toString()}`);
      const data = await response.json();
      if (data.logs) {
        let filteredLogs = data.logs;
        
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
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
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
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
                Geographic
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
                Traffic Analytics
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                  <select
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    value={filters.level}
                    onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                  >
                    <option value="">All Levels</option>
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Logs ({logs.length})
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
              <GeographicAnalytics logs={logs} />
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
              <TrafficAnalytics logs={logs} />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
