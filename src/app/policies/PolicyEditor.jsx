'use client';

import { useMemo, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  splitBulkEntries,
  validateCIDR,
  validateCountryCode,
  validateIPv4orIPv6,
  validateRuleId,
} from './policy-form-utils';

const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function TagListInput({
  value = [],
  onChange,
  placeholder,
  normalize = (s) => s.trim(),
  label,
  helperText = '',
  bulkPlaceholder = 'Paste one value per line, comma-separated, or space-separated',
  validate = null,
  dialogTitle = '',
}) {
  const [draft, setDraft] = useState('');
  const [bulkDraft, setBulkDraft] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [showAllResults, setShowAllResults] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const commitValues = (entries) => {
    const next = [];
    const seen = new Set();
    let invalidCount = 0;

    for (const raw of entries) {
      const normalized = normalize(String(raw || ''));
      if (!normalized || seen.has(normalized)) continue;
      if (validate && !validate(normalized)) {
        invalidCount += 1;
        continue;
      }
      seen.add(normalized);
      next.push(normalized);
    }

    onChange(next);
    setValidationMessage(
      invalidCount > 0
        ? `${invalidCount.toLocaleString()} invalid entr${invalidCount === 1 ? 'y was' : 'ies were'} skipped.`
        : ''
    );
  };

  const addValue = () => {
    commitValues([...value, draft]);
    setDraft('');
  };

  const importBulk = () => {
    const parts = splitBulkEntries(bulkDraft);
    commitValues([...value, ...parts]);
    setBulkDraft('');
  };

  const removeItem = (item) => {
    onChange(value.filter((entry) => entry !== item));
  };

  const filteredValues = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return value;
    return value.filter((item) => item.toLowerCase().includes(query));
  }, [filterQuery, value]);

  const visibleValues = showAllResults ? filteredValues : filteredValues.slice(0, 100);
  const hiddenCount = Math.max(filteredValues.length - visibleValues.length, 0);
  const invalidCount = validate ? value.filter((item) => !validate(item)).length : 0;

  const copyAll = async () => {
    if (!value.length || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(value.join('\n'));
  };

  return (
    <div className="space-y-3">
      {label && <label className="mb-1 block text-xs text-gray-600">{label}</label>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
          {value.length.toLocaleString()} items
        </span>
        {helperText ? <span>{helperText}</span> : null}
        {invalidCount > 0 ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            {invalidCount.toLocaleString()} invalid
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
            placeholder={placeholder}
            className="min-w-[180px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addValue}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowManager(true)}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage List
          </button>
          <button
            type="button"
            onClick={copyAll}
            disabled={value.length === 0}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy All
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={value.length === 0}
            className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear All
          </button>
        </div>
        {validationMessage ? <p className="text-xs text-amber-700">{validationMessage}</p> : null}
        {value.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => {
                  setFilterQuery(e.target.value);
                  setShowAllResults(false);
                }}
                placeholder="Filter current entries"
                className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">
                Showing {visibleValues.length.toLocaleString()} of {filteredValues.length.toLocaleString()}
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-gray-50">
              <ul className="divide-y divide-gray-200">
                {visibleValues.map((item) => (
                  <li key={item} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <code className="truncate text-gray-800">{item}</code>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-red-600"
                      aria-label={`Remove ${item}`}
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllResults(true)}
                className="text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                Show remaining {hiddenCount.toLocaleString()} entries
              </button>
            ) : null}
          </>
        ) : null}
      </div>
      {showManager ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{dialogTitle || label || 'Manage Entries'}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Built for bulk import, search, export, and cleanup of large rule lists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManager(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="overflow-y-auto border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-blue-700">Entries</div>
                      <div className="mt-1 text-2xl font-semibold text-blue-900">{value.length.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Valid</div>
                      <div className="mt-1 text-2xl font-semibold text-emerald-900">
                        {(value.length - invalidCount).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Add Single Entry</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
                        placeholder={placeholder}
                        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addValue}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Bulk Import</label>
                    <textarea
                      value={bulkDraft}
                      onChange={(e) => setBulkDraft(e.target.value)}
                      placeholder={bulkPlaceholder}
                      rows={10}
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">One per line or separated by comma, space, tab, or semicolon.</p>
                      <button
                        type="button"
                        onClick={importBulk}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Import Entries
                      </button>
                    </div>
                  </div>
                  {validate ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Validation is enabled for this field. Invalid entries are skipped during add/import.
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto p-5">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => {
                      setFilterQuery(e.target.value);
                      setShowAllResults(false);
                    }}
                    placeholder="Search entries"
                    className="min-w-[260px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={copyAll}
                    disabled={value.length === 0}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Export / Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    disabled={value.length === 0}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Clear List
                  </button>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>
                    Showing {visibleValues.length.toLocaleString()} of {filteredValues.length.toLocaleString()} filtered entries
                  </span>
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllResults(true)}
                      className="font-medium text-blue-700 hover:text-blue-800"
                    >
                      Load remaining {hiddenCount.toLocaleString()}
                    </button>
                  ) : null}
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[minmax(0,1fr)_96px] bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Entry</span>
                    <span>Action</span>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto bg-white">
                    {visibleValues.length > 0 ? (
                      <ul className="divide-y divide-slate-200">
                        {visibleValues.map((item) => (
                          <li key={item} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 px-4 py-3 text-sm">
                            <div className="min-w-0">
                              <code className="block truncate text-slate-800">{item}</code>
                              {validate && !validate(item) ? (
                                <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                  Invalid
                                </span>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item)}
                              className="justify-self-start rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">No matching entries.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PolicyEditor({
  editorOnly,
  showForm,
  editingPolicyName,
  closePolicyForm,
  handleSubmit,
  formData,
  setFormData,
  apps,
  activeTab,
  setActiveTab,
  submitting,
}) {
  if (!(editorOnly || showForm)) return null;

  const tabs = [
    { id: 'basic', name: 'Basic Protections' },
    { id: 'owasp', name: 'OWASP Top 10' },
    { id: 'advanced', name: 'Advanced Features' },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_28%),linear-gradient(135deg,#eff6ff_0%,#f8fafc_45%,#eef2ff_100%)] px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Policy Workspace</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {editingPolicyName ? 'Edit Security Policy' : 'Create Security Policy'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This full-screen editor is optimized for large policy definitions, bulk access lists, and high-volume exception data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-blue-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-blue-700">Workspace Mode</div>
              <div className="mt-1 font-semibold text-slate-900">Dedicated page editor</div>
            </div>
            <button
              type="button"
              onClick={closePolicyForm}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Policies
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-[calc(100vh-16rem)] p-6 lg:p-8">
        <div className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
          <div className="flex items-start">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">OWASP Core Rule Set (CRS) Enabled by Default</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  All policies automatically include <strong>OWASP CRS 3.3.0</strong> with 25 rule sets providing comprehensive protection. The protections below are <strong>additional custom rules</strong> that complement OWASP CRS.
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-semibold text-gray-700">
                Policy Name *
              </label>
              <input
                type="text"
                id="name"
                required
                placeholder="e.g., Production Security Policy"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={Boolean(editingPolicyName)}
              />
              {editingPolicyName ? (
                <p className="mt-1 text-xs text-blue-600">Versioned edit keeps the same policy name and creates a new version.</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="mode" className="mb-2 block text-sm font-medium text-gray-700">
                  Mode *
                </label>
                <select
                  id="mode"
                  required
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                >
                  <option value="detection">Detection (Log only)</option>
                  <option value="prevention">Prevention (Block attacks)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Start with Detection mode to identify false positives</p>
              </div>

              <div>
                <label htmlFor="applicationId" className="mb-2 block text-sm font-medium text-gray-700">
                  Application (Optional)
                </label>
                <select
                  id="applicationId"
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={formData.applicationId}
                  onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                >
                  <option value="">None</option>
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name} ({app.domain})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="py-6">
            {activeTab === 'basic' ? (
              <div className="space-y-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Essential Protections</h3>
                <div className="space-y-3">
                  {[
                    { key: 'sqlInjection', label: 'Enhanced SQL Injection Protection', desc: 'Multiple detection layers for SQL injection attacks' },
                    { key: 'xss', label: 'Enhanced XSS Protection', desc: 'Comprehensive XSS detection including script tags and event handlers' },
                    { key: 'fileUpload', label: 'File Upload Protection', desc: 'Dangerous file extension blocking and file size limits' },
                    { key: 'pathTraversal', label: 'Path Traversal Protection', desc: 'Directory traversal attack prevention' },
                    { key: 'rce', label: 'Remote Code Execution (RCE) Protection', desc: 'Command injection and code execution attempt detection' },
                  ].map((protection) => (
                    <label key={protection.key} className="flex cursor-pointer items-start rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={formData[protection.key]}
                        onChange={(e) => setFormData({ ...formData, [protection.key]: e.target.checked })}
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">{protection.label}</div>
                        <div className="mt-1 text-xs text-gray-500">{protection.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === 'owasp' ? (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">OWASP Top 10 Protections</h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      { key: 'csrf', label: 'CSRF Protection', desc: 'Token validation and origin checks' },
                      { key: 'sessionFixation', label: 'Session Fixation Protection', desc: 'Session ID pattern detection' },
                      { key: 'ssrf', label: 'SSRF Protection', desc: 'Server-Side Request Forgery detection' },
                      { key: 'xxe', label: 'XXE Protection', desc: 'XML External Entity injection detection' },
                      { key: 'authBypass', label: 'Authentication Bypass Protection', desc: 'Auth bypass pattern detection' },
                      { key: 'idor', label: 'IDOR Protection', desc: 'Insecure Direct Object Reference monitoring' },
                      { key: 'securityMisconfig', label: 'Security Misconfiguration Detection', desc: 'Exposed config files detection' },
                      { key: 'sensitiveDataExposure', label: 'Sensitive Data Exposure Protection', desc: 'Credit cards, SSNs, API keys detection' },
                      { key: 'brokenAccessControl', label: 'Broken Access Control Protection', desc: 'Privilege escalation detection' },
                      { key: 'securityHeaders', label: 'Security Headers Monitoring', desc: 'Passive security header monitoring' },
                    ].map((protection) => (
                      <label key={protection.key} className="flex cursor-pointer items-start rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData[protection.key]}
                          onChange={(e) => setFormData({ ...formData, [protection.key]: e.target.checked })}
                        />
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900">{protection.label}</div>
                          <div className="mt-1 text-xs text-gray-500">{protection.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.rateLimiting.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rateLimiting: { ...formData.rateLimiting, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">Rate Limiting</span>
                  </label>
                  {formData.rateLimiting.enabled ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Requests/Minute</label>
                        <input
                          type="number"
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.rateLimiting.requestsPerMinute}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              rateLimiting: { ...formData.rateLimiting, requestsPerMinute: parseInt(e.target.value, 10) || 60 },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Requests/Hour</label>
                        <input
                          type="number"
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.rateLimiting.requestsPerHour}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              rateLimiting: { ...formData.rateLimiting, requestsPerHour: parseInt(e.target.value, 10) || 1000 },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Burst Size</label>
                        <input
                          type="number"
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.rateLimiting.burstSize}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              rateLimiting: { ...formData.rateLimiting, burstSize: parseInt(e.target.value, 10) || 10 },
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.advancedFileUpload.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          advancedFileUpload: { ...formData.advancedFileUpload, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">Advanced File Upload Validation</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-gray-600">MIME type, file size, and extension validation.</p>
                  {formData.advancedFileUpload.enabled ? (
                    <div className="ml-8 mt-3 space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.advancedFileUpload.mimeTypeValidation}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              advancedFileUpload: {
                                ...formData.advancedFileUpload,
                                mimeTypeValidation: e.target.checked,
                              },
                            })
                          }
                        />
                        <span className="ml-2 text-xs text-gray-700">MIME Type Validation</span>
                      </label>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">Max File Size (bytes)</label>
                        <input
                          type="number"
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.advancedFileUpload.maxFileSize}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              advancedFileUpload: {
                                ...formData.advancedFileUpload,
                                maxFileSize: parseInt(e.target.value, 10) || 10485760,
                              },
                            })
                          }
                        />
                      </div>
                      <TagListInput
                        label="Allowed Extensions"
                        value={formData.advancedFileUpload.allowedExtensions}
                        onChange={(allowedExtensions) =>
                          setFormData({
                            ...formData,
                            advancedFileUpload: { ...formData.advancedFileUpload, allowedExtensions },
                          })
                        }
                        placeholder="e.g. jpg"
                        normalize={(s) => s.trim().toLowerCase()}
                      />
                      <TagListInput
                        label="Blocked Extensions"
                        value={formData.advancedFileUpload.blockedExtensions}
                        onChange={(blockedExtensions) =>
                          setFormData({
                            ...formData,
                            advancedFileUpload: { ...formData.advancedFileUpload, blockedExtensions },
                          })
                        }
                        placeholder="e.g. exe"
                        normalize={(s) => s.trim().toLowerCase()}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.apiProtection.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          apiProtection: { ...formData.apiProtection, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">API-Specific Protections</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-gray-600">API key checks plus OAuth/JWT format validation and API version enforcement.</p>
                  {formData.apiProtection.enabled ? (
                    <div className="ml-8 mt-3 space-y-2">
                      {[
                        ['apiKeyValidation', 'API Key Validation'],
                        ['oauthValidation', 'OAuth Validation'],
                        ['jwtValidation', 'JWT Validation'],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={formData.apiProtection[key]}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                apiProtection: { ...formData.apiProtection, [key]: e.target.checked },
                              })
                            }
                          />
                          <span className="ml-2 text-xs text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.exceptionHandling.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          exceptionHandling: { ...formData.exceptionHandling, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">Exception Handling</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-gray-600">Path-based rule exclusions and wildcard support</p>
                  <p className="mb-3 ml-8 text-xs text-amber-700">
                    Explicit rule IDs are required. Full path-level engine disable is not allowed in production mode.
                  </p>
                  {formData.exceptionHandling.enabled ? (
                    <div className="ml-8 mt-3 space-y-4">
                      <TagListInput
                        label="Excluded Paths (supports wildcards e.g. /static/*)"
                        value={formData.exceptionHandling.excludedPaths}
                        onChange={(excludedPaths) =>
                          setFormData({
                            ...formData,
                            exceptionHandling: { ...formData.exceptionHandling, excludedPaths },
                          })
                        }
                        placeholder="e.g. /api/health"
                        dialogTitle="Manage Exception Paths"
                        helperText="Use exact paths or wildcards. These exclusions only apply when paired with explicit rule IDs."
                        normalize={(s) => s.trim()}
                      />
                      <TagListInput
                        label="Excluded Rule IDs"
                        value={formData.exceptionHandling.excludedRules}
                        onChange={(excludedRules) =>
                          setFormData({
                            ...formData,
                            exceptionHandling: { ...formData.exceptionHandling, excludedRules },
                          })
                        }
                        placeholder="e.g. 942100"
                        dialogTitle="Manage Excluded Rule IDs"
                        helperText="Only numeric ModSecurity or custom rule IDs are accepted."
                        validate={validateRuleId}
                        normalize={(s) => s.trim()}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.virtualPatching.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          virtualPatching: { ...formData.virtualPatching, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">Virtual Patching</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-gray-600">CVE-specific rules for zero-day protection</p>
                  {formData.virtualPatching.enabled ? (
                    <div className="ml-8 mt-3">
                      <TagListInput
                        label="CVE Rules (CVE IDs)"
                        value={formData.virtualPatching.cveRules}
                        onChange={(cveRules) =>
                          setFormData({
                            ...formData,
                            virtualPatching: { ...formData.virtualPatching, cveRules },
                          })
                        }
                        placeholder="e.g. CVE-2023-1234"
                        normalize={(s) => s.trim().toUpperCase()}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={closePolicyForm}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>{editingPolicyName ? 'Saving Version...' : 'Creating...'}</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{editingPolicyName ? 'Save as New Version' : 'Create Policy'}</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <svg className="mr-1 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            OWASP CRS 3.3.0 Included
          </span>
          <span className="flex items-center">
            <svg className="mr-1 h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            ModSecurity Powered
          </span>
        </div>
        <div>
          Step {activeTab === 'basic' ? '1' : activeTab === 'owasp' ? '2' : activeTab === 'advanced' ? '3' : '1'} of 3
        </div>
      </div>
    </section>
  );
}
