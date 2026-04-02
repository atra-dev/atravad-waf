'use client';

import Link from 'next/link';
import { formatTimestamp } from './policy-form-utils';

function ShieldIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" />
    </svg>
  );
}

function GlobeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3c2.6 2.4 4 5.4 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.4-4-9s1.4-6.6 4-9z" />
    </svg>
  );
}

function BoltIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function RobotIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="5" y="8" width="14" height="10" rx="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4M8 12h.01M16 12h.01M9 18v2M15 18v2M5 13H3M21 13h-2" />
    </svg>
  );
}

function FolderIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h5l2 2h11v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function KeyIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a4 4 0 11-3.9 4.9L3 20v-4l5.2-5.2A4 4 0 0115 7z" />
    </svg>
  );
}

function CogIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.3 4.3l.5-1.8h2.4l.5 1.8a7.8 7.8 0 012 .8l1.6-.8 1.7 1.7-.8 1.6c.3.6.6 1.3.8 2l1.8.5v2.4l-1.8.5a7.8 7.8 0 01-.8 2l.8 1.6-1.7 1.7-1.6-.8a7.8 7.8 0 01-2 .8l-.5 1.8h-2.4l-.5-1.8a7.8 7.8 0 01-2-.8l-1.6.8-1.7-1.7.8-1.6a7.8 7.8 0 01-.8-2l-1.8-.5v-2.4l1.8-.5a7.8 7.8 0 01.8-2l-.8-1.6 1.7-1.7 1.6.8a7.8 7.8 0 012-.8z" />
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
    </svg>
  );
}

function WrenchIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.2 2.2-3.1-3.1 2-2.1z" />
    </svg>
  );
}

function DatabaseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <ellipse cx="12" cy="6" rx="7" ry="3" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </svg>
  );
}

function CodeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" />
    </svg>
  );
}

function SparkIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l1.6 4.9L18 9.5l-4.4 1.6L12 16l-1.6-4.9L6 9.5l4.4-1.6L12 3z" />
    </svg>
  );
}

function UploadIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

const advancedIcons = {
  shield: ShieldIcon,
  globe: GlobeIcon,
  bolt: BoltIcon,
  robot: RobotIcon,
  folder: FolderIcon,
  key: KeyIcon,
  cog: CogIcon,
  wrench: WrenchIcon,
  database: DatabaseIcon,
  code: CodeIcon,
  spark: SparkIcon,
};
const ruleIcons = {
  shield: ShieldIcon,
  globe: GlobeIcon,
  bolt: BoltIcon,
  robot: RobotIcon,
  folder: FolderIcon,
  key: KeyIcon,
  cog: CogIcon,
  wrench: WrenchIcon,
  database: DatabaseIcon,
  code: CodeIcon,
  spark: SparkIcon,
  upload: UploadIcon,
};

const ruleIconTones = {
  shield: 'border-blue-200 bg-blue-50 text-blue-700',
  globe: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  bolt: 'border-amber-200 bg-amber-50 text-amber-700',
  robot: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  folder: 'border-sky-200 bg-sky-50 text-sky-700',
  key: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cog: 'border-slate-200 bg-slate-50 text-slate-700',
  wrench: 'border-violet-200 bg-violet-50 text-violet-700',
  database: 'border-rose-200 bg-rose-50 text-rose-700',
  code: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  spark: 'border-orange-200 bg-orange-50 text-orange-700',
  upload: 'border-blue-200 bg-blue-50 text-blue-700',
};

const allSecurityRules = {
  owaspCRS: {
    title: 'OWASP Core Rule Set (CRS) 3.3.0',
    description: 'Comprehensive protection enabled by default in all policies',
    rules: [
      { name: 'REQUEST-901-INITIALIZATION', description: 'CRS setup and initialization', iconType: 'cog' },
      { name: 'REQUEST-905-COMMON-EXCEPTIONS', description: 'Common exception rules', iconType: 'cog' },
      { name: 'REQUEST-910-IP-REPUTATION', description: 'IP reputation checking', iconType: 'shield' },
      { name: 'REQUEST-911-METHOD-ENFORCEMENT', description: 'HTTP method validation', iconType: 'shield' },
      { name: 'REQUEST-912-DOS-PROTECTION', description: 'Denial of Service protection', iconType: 'bolt' },
      { name: 'REQUEST-913-SCANNER-DETECTION', description: 'Security scanner detection', iconType: 'robot' },
      { name: 'REQUEST-920-PROTOCOL-ENFORCEMENT', description: 'HTTP protocol validation', iconType: 'globe' },
      { name: 'REQUEST-921-PROTOCOL-ATTACK', description: 'Protocol-level attack detection', iconType: 'globe' },
      { name: 'REQUEST-930-APPLICATION-ATTACK-LFI', description: 'Local File Inclusion protection', iconType: 'folder' },
      { name: 'REQUEST-931-APPLICATION-ATTACK-RFI', description: 'Remote File Inclusion protection', iconType: 'globe' },
      { name: 'REQUEST-932-APPLICATION-ATTACK-RCE', description: 'Remote Code Execution protection', iconType: 'bolt' },
      { name: 'REQUEST-933-APPLICATION-ATTACK-PHP', description: 'PHP-specific attack detection', iconType: 'code' },
      { name: 'REQUEST-934-APPLICATION-ATTACK-NODEJS', description: 'Node.js-specific attack detection', iconType: 'code' },
      { name: 'REQUEST-941-APPLICATION-ATTACK-XSS', description: 'XSS attack detection', iconType: 'spark' },
      { name: 'REQUEST-942-APPLICATION-ATTACK-SQLI', description: 'SQL injection detection', iconType: 'database' },
      { name: 'REQUEST-943-APPLICATION-ATTACK-SESSION-FIXATION', description: 'Session fixation protection', iconType: 'key' },
      { name: 'REQUEST-944-APPLICATION-ATTACK-JAVA', description: 'Java-specific attack detection', iconType: 'code' },
      { name: 'REQUEST-949-BLOCKING-EVALUATION', description: 'Blocking decision evaluation', iconType: 'shield' },
      { name: 'RESPONSE-950-DATA-LEAKAGES', description: 'Data leakage prevention', iconType: 'shield' },
      { name: 'RESPONSE-951-DATA-LEAKAGES-SQL', description: 'SQL error message detection', iconType: 'database' },
      { name: 'RESPONSE-952-DATA-LEAKAGES-JAVA', description: 'Java error message detection', iconType: 'code' },
      { name: 'RESPONSE-953-DATA-LEAKAGES-PHP', description: 'PHP error message detection', iconType: 'code' },
      { name: 'RESPONSE-954-DATA-LEAKAGES-IIS', description: 'IIS error message detection', iconType: 'globe' },
      { name: 'RESPONSE-959-BLOCKING-EVALUATION', description: 'Response blocking evaluation', iconType: 'shield' },
      { name: 'RESPONSE-980-CORRELATION', description: 'Attack correlation and scoring', iconType: 'spark' },
    ],
  },
  owaspTop10: {
    title: 'OWASP Top 10 Protections',
    description: 'Enhanced protections for OWASP Top 10 vulnerabilities',
    rules: [
      { name: 'SQL Injection Protection', description: 'Enhanced SQL injection detection with multiple detection layers', iconType: 'database' },
      { name: 'Cross-Site Scripting (XSS)', description: 'Comprehensive XSS detection including script tags and event handlers', iconType: 'spark' },
      { name: 'File Upload Protection', description: 'Dangerous file extension blocking and file size limits', iconType: 'upload' },
      { name: 'Path Traversal Protection', description: 'Directory traversal attack prevention', iconType: 'folder' },
      { name: 'Remote Code Execution (RCE)', description: 'Command injection and code execution attempt detection', iconType: 'bolt' },
      { name: 'CSRF Protection', description: 'Cross-Site Request Forgery token validation and origin checks', iconType: 'shield' },
      { name: 'Session Fixation Protection', description: 'Session ID pattern detection and manipulation prevention', iconType: 'key' },
      { name: 'SSRF Protection', description: 'Server-Side Request Forgery detection (internal IPs, dangerous URLs)', iconType: 'globe' },
      { name: 'XXE Protection', description: 'XML External Entity injection detection', iconType: 'code' },
      { name: 'Authentication Bypass Protection', description: 'SQL injection in auth params and bypass pattern detection', iconType: 'shield' },
      { name: 'IDOR Protection', description: 'Insecure Direct Object Reference monitoring', iconType: 'key' },
      { name: 'Security Misconfiguration Detection', description: 'Exposed config files and default credentials detection', iconType: 'cog' },
      { name: 'Sensitive Data Exposure Protection', description: 'Credit cards, SSNs, API keys detection in responses', iconType: 'shield' },
      { name: 'Broken Access Control Protection', description: 'Privilege escalation and unauthorized access detection', iconType: 'wrench' },
      { name: 'Security Headers Monitoring', description: 'Passive monitoring for missing security headers', iconType: 'shield' },
    ],
  },
  advanced: {
    title: 'Advanced Security Features',
    description: 'Enterprise-grade advanced security capabilities',
    rules: [
      { name: 'IP Access Control', description: 'IP whitelisting/blacklisting with CIDR block support', iconType: 'shield' },
      { name: 'Geographic Blocking', description: 'Country-based access control using trusted edge geo headers', iconType: 'globe' },
      { name: 'Advanced Rate Limiting', description: 'Per-endpoint and adaptive rate limiting', iconType: 'bolt' },
      { name: 'Bot Detection & Mitigation', description: 'User-Agent filtering, bot signature detection, crawler blocking', iconType: 'robot' },
      { name: 'Advanced File Upload Validation', description: 'MIME type, size, and extension validation', iconType: 'folder' },
      { name: 'API-Specific Protections', description: 'API key checks plus OAuth/JWT format and version validation', iconType: 'key' },
      { name: 'Exception Handling', description: 'Path-based rule exclusions by explicit rule ID', iconType: 'cog' },
      { name: 'Virtual Patching', description: 'CVE-specific rules for zero-day protection', iconType: 'wrench' },
    ],
  },
};

function RuleSection({ section, countLabel }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none">
      <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <h3 className="text-xl font-semibold text-slate-950 dark:text-slate-100">{section.title}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{section.description}</p>
        </div>
        <div className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {section.rules.length} {countLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {section.rules.map((rule) => {
          const RuleIcon = rule.iconType ? ruleIcons[rule.iconType] : null;
          return (
            <div key={rule.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-start gap-3">
                {RuleIcon ? (
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      ruleIconTones[rule.iconType] || 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <RuleIcon className="h-5 w-5" />
                  </span>
                ) : null}
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rule.name}</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{rule.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PoliciesList({
  groupedPolicies,
  policyCount,
  deletingPolicyName,
  handleDeletePolicy,
}) {
  const totalProtections =
    allSecurityRules.owaspCRS.rules.length +
    allSecurityRules.owaspTop10.rules.length +
    allSecurityRules.advanced.rules.length;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-slate-950 dark:text-slate-100">Available Security Rules & Protections</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Complete list of all security rules and protections provided by ATRAVA Defense.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center dark:border-green-900/50 dark:bg-green-950/35">
              <div className="text-3xl font-bold text-green-700">{allSecurityRules.owaspCRS.rules.length}</div>
              <div className="mt-1 text-sm text-green-900">OWASP CRS Rules</div>
              <div className="mt-1 text-xs text-green-700">Enabled by default</div>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-900/50 dark:bg-blue-950/35">
              <div className="text-3xl font-bold text-blue-700">{allSecurityRules.owaspTop10.rules.length}</div>
              <div className="mt-1 text-sm text-blue-900">OWASP Top 10 Protections</div>
              <div className="mt-1 text-xs text-blue-700">Available for policies</div>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-center dark:border-purple-900/50 dark:bg-purple-950/35">
              <div className="text-3xl font-bold text-purple-700">{allSecurityRules.advanced.rules.length}</div>
              <div className="mt-1 text-sm text-purple-900">Advanced Features</div>
              <div className="mt-1 text-xs text-purple-700">Enterprise capabilities</div>
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          Total: {totalProtections} Security Rules & Protections
        </div>
      </div>

      <RuleSection section={allSecurityRules.owaspCRS} countLabel="Rules" />
      <RuleSection section={allSecurityRules.owaspTop10} countLabel="Protections" />
      <RuleSection section={allSecurityRules.advanced} countLabel="Features" />

      {policyCount > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Policies</h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
              {policyCount} {policyCount === 1 ? 'policy' : 'policies'}
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6">
        {Object.keys(groupedPolicies).length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none">
            <svg className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-slate-900 dark:text-slate-100">No policies</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Get started by creating your first security policy.</p>
          </div>
        ) : (
          Object.entries(groupedPolicies).map(([name, versions]) => {
            const latestVersion = versions[0];
            const assignedApplications = [...new Set(
              versions
                .flatMap((version) =>
                  Array.isArray(version.applicationNames) && version.applicationNames.length > 0
                    ? version.applicationNames
                    : version.applicationName
                      ? [version.applicationName]
                      : []
                )
                .filter(Boolean)
            )];
            return (
              <div key={name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none dark:hover:shadow-[0_20px_48px_rgba(2,8,23,0.55)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Version {latestVersion.version} (Latest) • {versions.length} {versions.length === 1 ? 'version' : 'versions'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/policies/${encodeURIComponent(name)}/edit`}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/policies/${name}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      View Versions & Audit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeletePolicy(name)}
                      disabled={deletingPolicyName === name}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                    >
                      {deletingPolicyName === name ? 'Deleting...' : 'Delete Policy'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Mode</span>
                    <p className="mt-1 text-sm capitalize text-slate-900 dark:text-slate-100">{latestVersion.mode}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Application</span>
                    <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                      {assignedApplications.length > 0 ? assignedApplications.join(', ') : 'None assigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Updated</span>
                    <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{formatTimestamp(latestVersion.updatedAt || latestVersion.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-200">
                  Operational IP and geo changes are available in the audit trail for this policy.
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
