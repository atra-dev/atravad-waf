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

const editorInputClassName =
  'theme-input block w-full rounded-lg px-3 py-2 text-sm shadow-sm transition';

const editorCardClassName =
  'theme-surface rounded-2xl p-4';

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

const ShieldIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" />
  </svg>
);

const SparkIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l1.6 4.9L18 9.5l-4.4 1.6L12 16l-1.6-4.9L6 9.5l4.4-1.6L12 3z" />
  </svg>
);

const CogIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.3 4.3l.5-1.8h2.4l.5 1.8a7.8 7.8 0 012 .8l1.6-.8 1.7 1.7-.8 1.6c.3.6.6 1.3.8 2l1.8.5v2.4l-1.8.5a7.8 7.8 0 01-.8 2l.8 1.6-1.7 1.7-1.6-.8a7.8 7.8 0 01-2 .8l-.5 1.8h-2.4l-.5-1.8a7.8 7.8 0 01-2-.8l-1.6.8-1.7-1.7.8-1.6a7.8 7.8 0 01-.8-2l-1.8-.5v-2.4l1.8-.5a7.8 7.8 0 01.8-2l-.8-1.6 1.7-1.7 1.6.8a7.8 7.8 0 012-.8z" />
    <circle cx="12" cy="12" r="3" strokeWidth={2} />
  </svg>
);

function SectionBadge({ icon: Icon, tone = 'slate' }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${tones[tone] || tones.slate}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

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
      {label && <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{label}</label>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
            placeholder={placeholder}
            className={`min-w-[180px] flex-1 ${editorInputClassName}`}
          />
          <button
            type="button"
            onClick={addValue}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowManager(true)}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Manage List
          </button>
          <button
            type="button"
            onClick={copyAll}
            disabled={value.length === 0}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800"
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
                className={`min-w-[220px] flex-1 ${editorInputClassName}`}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {visibleValues.length.toLocaleString()} of {filteredValues.length.toLocaleString()}
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70">
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {visibleValues.map((item) => (
                  <li key={item} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <code className="truncate text-slate-800 dark:text-slate-200">{item}</code>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="rounded p-1 text-slate-500 transition hover:bg-slate-200 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800"
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
                className="text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
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

function ApplicationAssignmentInput({
  apps = [],
  value = [],
  onChange,
}) {
  const [showManager, setShowManager] = useState(false);
  const [query, setQuery] = useState('');

  const selectedIds = Array.isArray(value) ? value : [];
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return apps;
    return apps.filter((app) => {
      const name = String(app.name || '').toLowerCase();
      const domain = String(app.domain || '').toLowerCase();
      return name.includes(normalizedQuery) || domain.includes(normalizedQuery);
    });
  }, [apps, query]);

  const selectedApps = useMemo(
    () => apps.filter((app) => selectedIdSet.has(app.id)),
    [apps, selectedIdSet]
  );

  const visibleSelectedApps = selectedApps.slice(0, 4);
  const remainingSelectedCount = Math.max(selectedApps.length - visibleSelectedApps.length, 0);

  const toggleApp = (appId, checked) => {
    const nextIds = checked
      ? [...new Set([...selectedIds, appId])]
      : selectedIds.filter((id) => id !== appId);
    onChange(nextIds);
  };

  const selectFiltered = () => {
    onChange([...new Set([...selectedIds, ...filteredApps.map((app) => app.id)])]);
  };

  const clearFiltered = () => {
    const filteredIds = new Set(filteredApps.map((app) => app.id));
    onChange(selectedIds.filter((id) => !filteredIds.has(id)));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Assign this policy version to one or more sites</p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedApps.length.toLocaleString()} selected out of {apps.length.toLocaleString()} available sites
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowManager(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Manage Sites
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={selectedApps.length === 0}
              className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          {selectedApps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No sites selected. Use `Manage Sites` to search and assign applications at scale.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleSelectedApps.map((app) => (
                <span
                  key={app.id}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-800"
                >
                  <span className="font-medium">{app.name}</span>
                  <span className="text-blue-600">{app.domain}</span>
                  <button
                    type="button"
                    onClick={() => toggleApp(app.id, false)}
                    className="rounded-full p-0.5 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                    aria-label={`Remove ${app.domain}`}
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {remainingSelectedCount > 0 ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                  +{remainingSelectedCount.toLocaleString()} more
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showManager ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Manage Site Assignments</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Search, filter, and assign this policy version across large numbers of sites.
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

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="overflow-y-auto border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-blue-700">Selected</div>
                      <div className="mt-1 text-2xl font-semibold text-blue-900">{selectedApps.length.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Available</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{apps.length.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Search Sites
                    </label>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by site name or domain"
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Matching {filteredApps.length.toLocaleString()} site{filteredApps.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={selectFiltered}
                        disabled={filteredApps.length === 0}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Select Filtered Sites
                      </button>
                      <button
                        type="button"
                        onClick={clearFiltered}
                        disabled={filteredApps.length === 0}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear Filtered Sites
                      </button>
                      <button
                        type="button"
                        onClick={clearAll}
                        disabled={selectedApps.length === 0}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear All Selections
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto p-5">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[72px_minmax(0,1fr)] bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Select</span>
                    <span>Site</span>
                  </div>
                  <div className="max-h-[58vh] overflow-y-auto bg-white">
                    {filteredApps.length > 0 ? (
                      <ul className="divide-y divide-slate-200">
                        {filteredApps.map((app) => {
                          const checked = selectedIdSet.has(app.id);
                          return (
                            <li key={app.id} className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-sm">
                              <div className="pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => toggleApp(app.id, e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-900">{app.name}</div>
                                <div className="truncate text-xs text-slate-500">{app.domain}</div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">No matching sites.</div>
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
    { id: 'basic', name: 'Basic Protections', icon: ShieldIcon },
    { id: 'owasp', name: 'OWASP Top 10', icon: SparkIcon },
    { id: 'advanced', name: 'Advanced Features', icon: CogIcon },
  ];

  return (
    <section className="theme-surface overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--border-soft)] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_28%),linear-gradient(135deg,color-mix(in_srgb,var(--surface-2)_92%,#eff6ff)_0%,color-mix(in_srgb,var(--surface-3)_95%,#f8fafc)_45%,color-mix(in_srgb,var(--surface-2)_92%,#eef2ff)_100%)] px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 dark:text-blue-300">Policy Workspace</p>
            <h2 className="mt-2 text-3xl font-bold theme-text-primary">
              {editingPolicyName ? 'Edit Security Policy' : 'Create Security Policy'}
            </h2>
            <p className="mt-2 text-sm theme-text-secondary">
              This full-screen editor is optimized for large policy definitions, bulk access lists, and high-volume exception data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="theme-soft-surface rounded-xl px-4 py-3 text-sm theme-text-secondary">
              <div className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">Workspace Mode</div>
              <div className="mt-1 font-semibold theme-text-primary">Dedicated page editor</div>
            </div>
            <button
              type="button"
              onClick={closePolicyForm}
              className="theme-button-neutral inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors"
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
        <div className="mb-6 rounded-xl border border-blue-300/60 bg-blue-50/80 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="flex items-start">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">OWASP Core Rule Set (CRS) Enabled by Default</h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
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
              <label htmlFor="name" className="mb-2 block text-sm font-semibold theme-text-secondary">
                Policy Name *
              </label>
              <input
                type="text"
                id="name"
                required
                placeholder="e.g., Production Security Policy"
                className="theme-input block w-full rounded-lg px-4 py-3 text-sm shadow-sm transition-colors"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={Boolean(editingPolicyName)}
              />
              {editingPolicyName ? (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">Versioned edit keeps the same policy name and creates a new version.</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="mode" className="mb-2 block text-sm font-medium theme-text-secondary">
                  Mode *
                </label>
                <select
                  id="mode"
                  required
                  className="theme-input block w-full rounded-lg px-4 py-3 text-sm shadow-sm"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                >
                  <option value="detection">Detection (Log only)</option>
                  <option value="prevention">Prevention (Block attacks)</option>
                </select>
                <p className="mt-1 text-xs theme-text-muted">Start with Detection mode to identify false positives</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Applications (Optional)
                </label>
                <ApplicationAssignmentInput
                  apps={apps}
                  value={formData.applicationIds}
                  onChange={(applicationIds) => setFormData({ ...formData, applicationIds })}
                />
              </div>
            </div>
          </div>

          <div className="border-b border-[var(--border-soft)]">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-300'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="py-6">
            {activeTab === 'basic' ? (
              <div className="space-y-4">
                <div className="mb-3 flex items-center gap-3">
                  <SectionBadge icon={ShieldIcon} tone="blue" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Essential Protections</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Core request inspection and exploit blocking.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'sqlInjection', label: 'Enhanced SQL Injection Protection', desc: 'Multiple detection layers for SQL injection attacks' },
                    { key: 'xss', label: 'Enhanced XSS Protection', desc: 'Comprehensive XSS detection including script tags and event handlers' },
                    { key: 'fileUpload', label: 'File Upload Protection', desc: 'Dangerous file extension blocking and file size limits' },
                    { key: 'pathTraversal', label: 'Path Traversal Protection', desc: 'Directory traversal attack prevention' },
                    { key: 'rce', label: 'Remote Code Execution (RCE) Protection', desc: 'Command injection and code execution attempt detection' },
                  ].map((protection) => (
                    <label key={protection.key} className="flex cursor-pointer items-start rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/70">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={formData[protection.key]}
                        onChange={(e) => setFormData({ ...formData, [protection.key]: e.target.checked })}
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{protection.label}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{protection.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === 'owasp' ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <SectionBadge icon={SparkIcon} tone="amber" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">OWASP Top 10 Protections</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Focused protections for the most common web attack classes.</p>
                    </div>
                  </div>
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
                      <label key={protection.key} className="flex cursor-pointer items-start rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/70">
                        <input
                          type="checkbox"
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData[protection.key]}
                          onChange={(e) => setFormData({ ...formData, [protection.key]: e.target.checked })}
                        />
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{protection.label}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{protection.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={editorCardClassName}>
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
                    <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100">Rate Limiting</span>
                  </label>
                  {formData.rateLimiting.enabled ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Requests/Minute</label>
                        <input
                          type="number"
                          className={editorInputClassName}
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
                        <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Requests/Hour</label>
                        <input
                          type="number"
                          className={editorInputClassName}
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
                        <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Burst Size</label>
                        <input
                          type="number"
                          className={editorInputClassName}
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
              </div>
            ) : null}

            {activeTab === 'advanced' ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3">
                    <SectionBadge icon={CogIcon} tone="violet" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Advanced Security Features</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Enterprise-grade access control, bot handling, exceptions, and patching.</p>
                    </div>
                  </div>
                </div>

                <div className={editorCardClassName}>
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.ipAccessControl.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ipAccessControl: { ...formData.ipAccessControl, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100">IP Access Control</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-slate-600 dark:text-slate-400">IP whitelisting/blacklisting with CIDR block support</p>
                  {formData.ipAccessControl.enabled ? (
                    <div className="ml-8 mt-3 space-y-4">
                      <TagListInput
                        label="Whitelist IPs"
                        value={formData.ipAccessControl.whitelist}
                        onChange={(whitelist) =>
                          setFormData({
                            ...formData,
                            ipAccessControl: { ...formData.ipAccessControl, whitelist },
                          })
                        }
                        placeholder="e.g. 192.168.1.100"
                        helperText="Use for individual IPv4/IPv6 addresses."
                        bulkPlaceholder={'Paste IPs, one per line or comma-separated\n192.168.1.10\n203.0.113.4'}
                        dialogTitle="Manage Whitelist IPs"
                        validate={validateIPv4orIPv6}
                        normalize={(s) => s.trim()}
                      />
                      <TagListInput
                        label="Blacklist IPs"
                        value={formData.ipAccessControl.blacklist}
                        onChange={(blacklist) =>
                          setFormData({
                            ...formData,
                            ipAccessControl: { ...formData.ipAccessControl, blacklist },
                          })
                        }
                        placeholder="e.g. 203.0.113.0"
                        helperText="Large deny-lists are supported through bulk paste."
                        bulkPlaceholder={'Paste IPs, one per line or comma-separated\n203.0.113.44\n198.51.100.80'}
                        dialogTitle="Manage Blacklist IPs"
                        validate={validateIPv4orIPv6}
                        normalize={(s) => s.trim()}
                      />
                      <TagListInput
                        label="Whitelist CIDR Blocks"
                        value={formData.ipAccessControl.whitelistCIDR}
                        onChange={(whitelistCIDR) =>
                          setFormData({
                            ...formData,
                            ipAccessControl: { ...formData.ipAccessControl, whitelistCIDR },
                          })
                        }
                        placeholder="e.g. 192.168.1.0/24"
                        helperText="Prefer CIDR blocks when managing large trusted ranges."
                        bulkPlaceholder={'Paste CIDRs, one per line\n10.0.0.0/8\n172.16.0.0/12'}
                        dialogTitle="Manage Whitelist CIDR Blocks"
                        validate={validateCIDR}
                        normalize={(s) => s.trim()}
                      />
                      <TagListInput
                        label="Blacklist CIDR Blocks"
                        value={formData.ipAccessControl.blacklistCIDR}
                        onChange={(blacklistCIDR) =>
                          setFormData({
                            ...formData,
                            ipAccessControl: { ...formData.ipAccessControl, blacklistCIDR },
                          })
                        }
                        placeholder="e.g. 203.0.113.0/24"
                        helperText="Use CIDR blocks for large hostile ranges."
                        bulkPlaceholder={'Paste CIDRs, one per line\n203.0.113.0/24\n198.51.100.0/24'}
                        dialogTitle="Manage Blacklist CIDR Blocks"
                        validate={validateCIDR}
                        normalize={(s) => s.trim()}
                      />
                    </div>
                  ) : null}
                </div>

                <div className={editorCardClassName}>
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.geoBlocking.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          geoBlocking: { ...formData.geoBlocking, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100">Geographic Blocking</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-slate-600 dark:text-slate-400">
                    Country-based access control using trusted edge headers such as <code>CF-IPCountry</code> or <code>X-Vercel-IP-Country</code>.
                  </p>
                  {formData.geoBlocking.enabled ? (
                    <div className="ml-8 mt-3 space-y-4">
                      <TagListInput
                        label="Blocked Countries (ISO country codes)"
                        value={formData.geoBlocking.blockedCountries}
                        onChange={(blockedCountries) =>
                          setFormData({
                            ...formData,
                            geoBlocking: { ...formData.geoBlocking, blockedCountries },
                          })
                        }
                        placeholder="e.g. CN"
                        helperText="Bulk import two-letter ISO country codes."
                        bulkPlaceholder={'Paste ISO country codes\nCN\nRU\nKP'}
                        dialogTitle="Manage Blocked Countries"
                        validate={validateCountryCode}
                        normalize={(s) => s.trim().toUpperCase()}
                      />
                      <TagListInput
                        label="Allowed Countries (empty = all)"
                        value={formData.geoBlocking.allowedCountries}
                        onChange={(allowedCountries) =>
                          setFormData({
                            ...formData,
                            geoBlocking: { ...formData.geoBlocking, allowedCountries },
                          })
                        }
                        placeholder="e.g. US"
                        helperText="Use allow-lists only when you want strict country access control."
                        bulkPlaceholder={'Paste ISO country codes\nUS\nGB\nPH'}
                        dialogTitle="Manage Allowed Countries"
                        validate={validateCountryCode}
                        normalize={(s) => s.trim().toUpperCase()}
                      />
                    </div>
                  ) : null}
                </div>

                <div className={editorCardClassName}>
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.advancedRateLimiting.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          advancedRateLimiting: { ...formData.advancedRateLimiting, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100">Advanced Rate Limiting</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-slate-600 dark:text-slate-400">Per-endpoint and adaptive rate limiting for embedded proxy deployments.</p>
                  {formData.advancedRateLimiting.enabled ? (
                    <div className="ml-8 mt-3 space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.advancedRateLimiting.adaptive}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              advancedRateLimiting: { ...formData.advancedRateLimiting, adaptive: e.target.checked },
                            })
                          }
                        />
                        <span className="ml-2 text-xs text-slate-700 dark:text-slate-300">Adaptive Rate Limiting</span>
                      </label>
                      <div className="mt-2">
                        <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Per-Endpoint Rules (JSON format: {`{"endpoint": "requests_per_minute"}`})</label>
                        <textarea
                          placeholder='{"\/api\/users": 100, "\/api\/admin": 50}'
                          className={`${editorInputClassName} font-mono text-xs`}
                          rows={3}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setFormData({
                                ...formData,
                                advancedRateLimiting: { ...formData.advancedRateLimiting, perEndpoint: parsed },
                              });
                            } catch (err) {
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={editorCardClassName}>
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.botDetection.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          botDetection: { ...formData.botDetection, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100">Bot Detection & Mitigation</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-slate-600 dark:text-slate-400">User-Agent filtering, bot signature detection, crawler blocking</p>
                  {formData.botDetection.enabled ? (
                    <div className="ml-8 mt-3 space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.botDetection.userAgentFiltering}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              botDetection: { ...formData.botDetection, userAgentFiltering: e.target.checked },
                            })
                          }
                        />
                        <span className="ml-2 text-xs text-slate-700 dark:text-slate-300">User-Agent Filtering</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.botDetection.botSignatureDetection}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              botDetection: { ...formData.botDetection, botSignatureDetection: e.target.checked },
                            })
                          }
                        />
                        <span className="ml-2 text-xs text-slate-700 dark:text-slate-300">Bot Signature Detection</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.botDetection.crawlerBlocking}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              botDetection: { ...formData.botDetection, crawlerBlocking: e.target.checked },
                            })
                          }
                        />
                        <span className="ml-2 text-xs text-slate-700 dark:text-slate-300">Crawler Blocking</span>
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className={editorCardClassName}>
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
                    <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100">Advanced File Upload Validation</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-slate-600 dark:text-slate-400">MIME type, file size, and extension validation.</p>
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
                        <span className="ml-2 text-xs text-slate-700 dark:text-slate-300">MIME Type Validation</span>
                      </label>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">Max File Size (bytes)</label>
                        <input
                          type="number"
                          className={editorInputClassName}
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

                <div className={editorCardClassName}>
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
                    <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100">API-Specific Protections</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-slate-600 dark:text-slate-400">API key checks plus OAuth/JWT format validation and API version enforcement.</p>
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
                          <span className="ml-2 text-xs text-slate-700 dark:text-slate-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className={editorCardClassName}>
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
                    <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100">Exception Handling</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-slate-600 dark:text-slate-400">Path-based rule exclusions and wildcard support</p>
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

                <div className={editorCardClassName}>
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
                    <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-100">Virtual Patching</span>
                  </label>
                  <p className="mb-3 ml-8 text-xs text-slate-600 dark:text-slate-400">CVE-specific rules for zero-day protection</p>
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

          <div className="flex justify-end space-x-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <button
              type="button"
              onClick={closePolicyForm}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
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
