'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';
import ConfirmationModal from '../ConfirmationModal';
import FeedbackModal from '../FeedbackModal';

function flattenAuditChanges(log) {
  const sections = [
    ['ip_whitelist_added', log.changes?.ipAccessControl?.whitelist?.added || []],
    ['ip_whitelist_removed', log.changes?.ipAccessControl?.whitelist?.removed || []],
    ['ip_blacklist_added', log.changes?.ipAccessControl?.blacklist?.added || []],
    ['ip_blacklist_removed', log.changes?.ipAccessControl?.blacklist?.removed || []],
    ['cidr_whitelist_added', log.changes?.ipAccessControl?.whitelistCIDR?.added || []],
    ['cidr_whitelist_removed', log.changes?.ipAccessControl?.whitelistCIDR?.removed || []],
    ['cidr_blacklist_added', log.changes?.ipAccessControl?.blacklistCIDR?.added || []],
    ['cidr_blacklist_removed', log.changes?.ipAccessControl?.blacklistCIDR?.removed || []],
    ['geo_blocked_added', log.changes?.geoBlocking?.blockedCountries?.added || []],
    ['geo_blocked_removed', log.changes?.geoBlocking?.blockedCountries?.removed || []],
    ['geo_allowed_added', log.changes?.geoBlocking?.allowedCountries?.added || []],
    ['geo_allowed_removed', log.changes?.geoBlocking?.allowedCountries?.removed || []],
  ];

  return sections
    .filter(([, values]) => values.length > 0)
    .map(([label, values]) => `${label}: ${values.join(', ')}`);
}

function escapeCsv(value) {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export default function PolicyVersionsPage() {
  const AUDIT_PAGE_SIZE = 10;
  const params = useParams();
  const policyName = decodeURIComponent(params.name);
  const [versions, setVersions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('');
  const [auditChangeFilter, setAuditChangeFilter] = useState('all');
  const [auditDateFilter, setAuditDateFilter] = useState('all');
  const [auditPage, setAuditPage] = useState(1);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPageCursors, setAuditPageCursors] = useState({ 1: null });
  const [auditCurrentCursor, setAuditCurrentCursor] = useState(null);
  const [exportingAudit, setExportingAudit] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [pendingRollbackVersionId, setPendingRollbackVersionId] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [feedbackState, setFeedbackState] = useState({
    open: false,
    title: '',
    description: '',
    tone: 'blue',
  });

  useEffect(() => {
    fetchVersions().finally(() => setLoading(false));
  }, [policyName]);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/policies?name=${encodeURIComponent(policyName)}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        const sorted = data.sort((a, b) => b.version - a.version);
        setVersions(sorted);
        if (sorted.length > 0) {
          setSelectedVersion(sorted[0]);
        }
      } else if (data.error) {
        console.error('API Error:', data.error);
        setVersions([]);
      } else {
        setVersions([]);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
      setVersions([]);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const query = new URLSearchParams({
        name: policyName,
        limit: String(AUDIT_PAGE_SIZE),
      });
      if (auditCurrentCursor) {
        query.set('cursor', auditCurrentCursor);
      }
      if (auditActorFilter) {
        query.set('actorEmail', auditActorFilter);
      }
      if (auditChangeFilter !== 'all') {
        query.set('changeScope', auditChangeFilter === 'ip_' ? 'ip' : 'geo');
      }
      if (auditDateFilter !== 'all') {
        query.set('dateRange', auditDateFilter);
      }

      const response = await fetch(`/api/policies/audit?${query.toString()}`);
      const data = await response.json();
      setAuditLogs(Array.isArray(data?.logs) ? data.logs : []);
      setAuditHasMore(Boolean(data?.hasMore));
      setAuditPageCursors((prev) => ({
        ...prev,
        [auditPage + 1]: data?.nextCursor || null,
      }));
    } catch (error) {
      console.error('Error fetching policy audit logs:', error);
      setAuditLogs([]);
      setAuditHasMore(false);
    } finally {
      setAuditLoading(false);
    }
  };

  const searchedAuditLogs = useMemo(() => {
    const normalizedSearch = auditSearch.trim().toLowerCase();

    return auditLogs.filter((log) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        log.actor?.email || '',
        log.eventType || '',
        String(log.policyVersion || ''),
        ...flattenAuditChanges(log),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [auditLogs, auditSearch]);

  useEffect(() => {
    setAuditPage(1);
    setAuditCurrentCursor(null);
    setAuditPageCursors({ 1: null });
  }, [auditActorFilter, auditChangeFilter, auditDateFilter, policyName]);

  useEffect(() => {
    fetchAuditLogs();
  }, [auditPage, auditCurrentCursor, auditActorFilter, auditChangeFilter, auditDateFilter, policyName]);

  const exportAuditLogs = async () => {
    try {
      setExportingAudit(true);
      const headers = [
        'timestamp',
        'actor_email',
        'event_type',
        'policy_name',
        'policy_version',
        'change_summary',
      ];
      const rows = searchedAuditLogs.map((log) => [
        log.createdAt || '',
        log.actor?.email || '',
        log.eventType || '',
        log.policyName || '',
        log.policyVersion || '',
        flattenAuditChanges(log).join(' | '),
      ]);
      const csvContent = [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(','))
        .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${policyName}-operational-audit-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting policy audit logs:', error);
      setFeedbackState({
        open: true,
        title: 'Unable to export audit logs',
        description: 'Failed to export operational audit entries.',
        tone: 'red',
      });
    } finally {
      setExportingAudit(false);
    }
  };

  const handleRollback = async (versionId) => {
    try {
      const version = versions.find((item) => item.id === versionId);
      if (!version) return;

      setRollingBack(true);

      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: version.name,
          sqlInjection: version.policy.sqlInjection,
          xss: version.policy.xss,
          fileUpload: version.policy.fileUpload,
          applicationIds: Array.isArray(version.applicationIds)
            ? version.applicationIds
            : version.applicationId
              ? [version.applicationId]
              : [],
        }),
      });

      if (response.ok) {
        setFeedbackState({
          open: true,
          title: 'Policy rolled back',
          description: 'A new latest version was created successfully from the selected version.',
          tone: 'green',
        });
        fetchVersions();
      } else {
        const error = await response.json();
        setFeedbackState({
          open: true,
          title: 'Unable to rollback policy',
          description: error.error || 'Failed to rollback policy',
          tone: 'red',
        });
      }
    } catch (error) {
      console.error('Error rolling back policy:', error);
      setFeedbackState({
        open: true,
        title: 'Unable to rollback policy',
        description: 'Failed to rollback policy',
        tone: 'red',
      });
    } finally {
      setRollingBack(false);
      setPendingRollbackVersionId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {loading ? (
          <AppLoadingState
            variant="panel"
            title="Loading policy versions"
            message="Preparing version history, rollback details, and the latest managed policy state."
          />
        ) : (
          <>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{policyName}</h1>
          <p className="mt-1 text-sm text-gray-500">Policy Versions</p>
          <p className="mt-2 text-xs text-blue-600">
            Tip: Assign this policy to an application in the Applications page to use it with the proxy WAF.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Versions</h2>
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`cursor-pointer rounded-lg border p-4 ${
                    selectedVersion?.id === version.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Version {version.version}</p>
                      <p className="text-sm text-gray-500">{new Date(version.createdAt).toLocaleString()}</p>
                    </div>
                    {version.version !== versions[0]?.version ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingRollbackVersionId(version.id);
                        }}
                        className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                      >
                        Rollback
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedVersion ? (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Version {selectedVersion.version} Details</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Protections</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span
                        className={`mr-2 h-3 w-3 rounded-full ${
                          selectedVersion.policy.sqlInjection ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-700">SQL Injection Protection</span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`mr-2 h-3 w-3 rounded-full ${
                          selectedVersion.policy.xss ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-700">XSS Protection</span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`mr-2 h-3 w-3 rounded-full ${
                          selectedVersion.policy.fileUpload ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-700">File Upload Protection</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">ModSecurity Configuration</h3>
                  <pre className="max-h-64 overflow-auto rounded bg-gray-50 p-4 text-xs">
                    {selectedVersion.modSecurityConfig}
                  </pre>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(selectedVersion.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Operational Audit Trail</h2>
          <p className="mb-4 text-sm text-gray-500">
            Daily IP access control and geo blocking changes are tracked here without creating new policy versions.
          </p>
          {auditLogs.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 lg:grid-cols-[minmax(0,1.4fr)_220px_180px_160px_150px]">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search actor, version, IP, CIDR, or country"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={auditActorFilter}
                  onChange={(e) => setAuditActorFilter(e.target.value)}
                  placeholder="Filter by actor email"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <select
                  value={auditChangeFilter}
                  onChange={(e) => setAuditChangeFilter(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All changes</option>
                  <option value="ip_">IP and CIDR changes</option>
                  <option value="geo_">Geo changes</option>
                </select>
                <select
                  value={auditDateFilter}
                  onChange={(e) => setAuditDateFilter(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All dates</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
                <button
                  type="button"
                  onClick={exportAuditLogs}
                  disabled={exportingAudit || searchedAuditLogs.length === 0}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {exportingAudit ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>
                  Showing {searchedAuditLogs.length} entr{searchedAuditLogs.length === 1 ? 'y' : 'ies'} on this page.
                </span>
                <span>
                  Page {auditPage}
                </span>
              </div>

              {auditLoading ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                  Loading audit entries...
                </div>
              ) : null}

              {searchedAuditLogs.map((log) => (
                <div key={log.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {log.eventType === 'operational_list_update' ? 'Operational list update' : 'Audit event'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {log.actor?.email || 'Unknown user'} • {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Unknown time'}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      Version {log.policyVersion || '-'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">IP Access Control</p>
                      <ul className="mt-2 space-y-2 text-sm text-gray-700">
                        <li>Whitelist added: {(log.changes?.ipAccessControl?.whitelist?.added || []).join(', ') || 'None'}</li>
                        <li>Whitelist removed: {(log.changes?.ipAccessControl?.whitelist?.removed || []).join(', ') || 'None'}</li>
                        <li>Blacklist added: {(log.changes?.ipAccessControl?.blacklist?.added || []).join(', ') || 'None'}</li>
                        <li>Blacklist removed: {(log.changes?.ipAccessControl?.blacklist?.removed || []).join(', ') || 'None'}</li>
                        <li>Whitelist CIDR added: {(log.changes?.ipAccessControl?.whitelistCIDR?.added || []).join(', ') || 'None'}</li>
                        <li>Whitelist CIDR removed: {(log.changes?.ipAccessControl?.whitelistCIDR?.removed || []).join(', ') || 'None'}</li>
                        <li>Blacklist CIDR added: {(log.changes?.ipAccessControl?.blacklistCIDR?.added || []).join(', ') || 'None'}</li>
                        <li>Blacklist CIDR removed: {(log.changes?.ipAccessControl?.blacklistCIDR?.removed || []).join(', ') || 'None'}</li>
                      </ul>
                    </div>

                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Geo Blocking</p>
                      <ul className="mt-2 space-y-2 text-sm text-gray-700">
                        <li>Blocked countries added: {(log.changes?.geoBlocking?.blockedCountries?.added || []).join(', ') || 'None'}</li>
                        <li>Blocked countries removed: {(log.changes?.geoBlocking?.blockedCountries?.removed || []).join(', ') || 'None'}</li>
                        <li>Allowed countries added: {(log.changes?.geoBlocking?.allowedCountries?.added || []).join(', ') || 'None'}</li>
                        <li>Allowed countries removed: {(log.changes?.geoBlocking?.allowedCountries?.removed || []).join(', ') || 'None'}</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border border-dashed border-gray-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Compliance Summary</p>
                    <p className="mt-2 text-sm text-gray-700">
                      {flattenAuditChanges(log).length > 0 ? flattenAuditChanges(log).join(' | ') : 'No itemized add/remove delta recorded.'}
                    </p>
                  </div>
                </div>
              ))}

              {(!auditLoading && searchedAuditLogs.length === 0) ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                  No audit entries matched the current filters on this page.
                </div>
              ) : null}

              {auditLogs.length > 0 ? (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextPage = Math.max(1, auditPage - 1);
                      setAuditPage(nextPage);
                      setAuditCurrentCursor(auditPageCursors[nextPage] || null);
                    }}
                    disabled={auditPage === 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!auditHasMore) return;
                      const nextPage = auditPage + 1;
                      setAuditPage(nextPage);
                      setAuditCurrentCursor(auditPageCursors[nextPage] || null);
                    }}
                    disabled={!auditHasMore}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No operational audit entries recorded yet.</p>
          )}
        </div>
          </>
        )}
      </div>

      <ConfirmationModal
        open={!!pendingRollbackVersionId}
        title="Rollback to this version?"
        description="This will create a new latest version using the selected version's settings while keeping the existing version history intact."
        confirmLabel="Rollback Version"
        tone="blue"
        busy={rollingBack}
        onCancel={() => setPendingRollbackVersionId(null)}
        onConfirm={() => handleRollback(pendingRollbackVersionId)}
      />

      <FeedbackModal
        open={feedbackState.open}
        title={feedbackState.title}
        description={feedbackState.description}
        tone={feedbackState.tone}
        onClose={() =>
          setFeedbackState({
            open: false,
            title: '',
            description: '',
            tone: 'blue',
          })
        }
      />
    </Layout>
  );
}
