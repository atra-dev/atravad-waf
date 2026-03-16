'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

// Building icon for tenant creation
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

const XIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/** Tag list input: add one value at a time (Enter or Add), remove via chip X. Replaces comma-separated fields. */
function TagListInput({ value = [], onChange, placeholder, normalize = (s) => s.trim(), label }) {
  const [draft, setDraft] = useState('');
  const addValue = () => {
    const n = normalize(draft);
    if (!n || value.includes(n)) return;
    onChange([...value, n]);
    setDraft('');
  };
  const removeAt = (i) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div>
      {label && <label className="block text-xs text-gray-600 mb-1">{label}</label>}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
          placeholder={placeholder}
          className="flex-1 min-w-[140px] rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
        />
        <button
          type="button"
          onClick={addValue}
          className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm bg-blue-50 text-blue-800 border border-blue-200"
            >
              {item}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="p-0.5 rounded hover:bg-blue-100 text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                aria-label={`Remove ${item}`}
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function getDefaultPolicyFormData() {
  return {
    name: '',
    mode: 'detection',
    includeOWASPCRS: true,
    // OWASP Top 10 Protections
    sqlInjection: false,
    xss: false,
    fileUpload: false,
    pathTraversal: false,
    rce: false,
    csrf: false,
    sessionFixation: false,
    ssrf: false,
    xxe: false,
    authBypass: false,
    idor: false,
    securityMisconfig: false,
    sensitiveDataExposure: false,
    brokenAccessControl: false,
    securityHeaders: false,
    // OWASP CRS Rule Sets
    owaspCRSRules: {
      REQUEST_901_INITIALIZATION: true,
      REQUEST_905_COMMON_EXCEPTIONS: true,
      REQUEST_910_IP_REPUTATION: true,
      REQUEST_911_METHOD_ENFORCEMENT: true,
      REQUEST_912_DOS_PROTECTION: true,
      REQUEST_913_SCANNER_DETECTION: true,
      REQUEST_920_PROTOCOL_ENFORCEMENT: true,
      REQUEST_921_PROTOCOL_ATTACK: true,
      REQUEST_930_APPLICATION_ATTACK_LFI: true,
      REQUEST_931_APPLICATION_ATTACK_RFI: true,
      REQUEST_932_APPLICATION_ATTACK_RCE: true,
      REQUEST_933_APPLICATION_ATTACK_PHP: true,
      REQUEST_934_APPLICATION_ATTACK_NODEJS: true,
      REQUEST_941_APPLICATION_ATTACK_XSS: true,
      REQUEST_942_APPLICATION_ATTACK_SQLI: true,
      REQUEST_943_APPLICATION_ATTACK_SESSION_FIXATION: true,
      REQUEST_944_APPLICATION_ATTACK_JAVA: true,
      REQUEST_949_BLOCKING_EVALUATION: true,
      RESPONSE_950_DATA_LEAKAGES: true,
      RESPONSE_951_DATA_LEAKAGES_SQL: true,
      RESPONSE_952_DATA_LEAKAGES_JAVA: true,
      RESPONSE_953_DATA_LEAKAGES_PHP: true,
      RESPONSE_954_DATA_LEAKAGES_IIS: true,
      RESPONSE_959_BLOCKING_EVALUATION: true,
      RESPONSE_980_CORRELATION: true,
    },
    // Rate Limiting
    rateLimiting: {
      enabled: false,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      burstSize: 10,
    },
    // Advanced Features
    ipAccessControl: {
      enabled: false,
      whitelist: [],
      blacklist: [],
      whitelistCIDR: [],
      blacklistCIDR: [],
    },
    geoBlocking: {
      enabled: false,
      blockedCountries: [],
      allowedCountries: [],
    },
    advancedRateLimiting: {
      enabled: false,
      perEndpoint: {},
      adaptive: false,
    },
    botDetection: {
      enabled: false,
      userAgentFiltering: true,
      botSignatureDetection: true,
      crawlerBlocking: false,
    },
    advancedFileUpload: {
      enabled: false,
      mimeTypeValidation: true,
      maxFileSize: 10485760,
      allowedExtensions: [],
      blockedExtensions: [],
    },
    apiProtection: {
      enabled: false,
      apiKeyValidation: false,
      oauthValidation: false,
      jwtValidation: false,
    },
    exceptionHandling: {
      enabled: false,
      excludedPaths: [],
      excludedRules: [],
    },
    virtualPatching: {
      enabled: false,
      cveRules: [],
    },
    applicationId: '',
  };
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Multi-tenancy state
  const [hasTenant, setHasTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '' });
  const [submittingTenant, setSubmittingTenant] = useState(false);
  
  const [formData, setFormData] = useState(getDefaultPolicyFormData());
  const [submitting, setSubmitting] = useState(false);
  const [deletingPolicyName, setDeletingPolicyName] = useState('');
  const [editingPolicyName, setEditingPolicyName] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    checkTenantAndFetchData();
  }, []);

  const checkTenantAndFetchData = async () => {
    try {
      // Check tenant first
      const [tenantRes, userRes] = await Promise.all([
        fetch('/api/tenants/current'),
        fetch('/api/users/me'),
      ]);
      
      const tenant = await tenantRes.json();
      const user = await userRes.json();
      
      // Check if user has a valid tenant
      const userHasTenantName = user?.tenantName && 
        typeof user.tenantName === 'string' && 
        user.tenantName.trim() !== '';
      const hasValidTenantFromAPI = !!(tenant?.id && 
        tenant?.name && 
        tenant.name !== 'Default Tenant');
      const userHasTenant = !!userHasTenantName || hasValidTenantFromAPI;
      
      setHasTenant(userHasTenant);
      setTenantName(tenant?.name || '');
      
      // Only fetch policies and apps if user has a tenant
      if (userHasTenant) {
        await Promise.all([fetchPolicies(), fetchApps()]);
      }
    } catch (error) {
      console.error('Error checking tenant:', error);
      setHasTenant(false);
    } finally {
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
        // Now fetch policies and apps
        await Promise.all([fetchPolicies(), fetchApps()]);
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

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/policies');
      const data = await response.json();
      
      // Ensure policies is always an array
      if (Array.isArray(data)) {
        setPolicies(data);
      } else if (data.error) {
        console.error('API Error:', data.error);
        setPolicies([]);
      } else {
        setPolicies([]);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps');
      const data = await response.json();
      
      // Ensure apps is always an array
      if (Array.isArray(data)) {
        setApps(data);
      } else if (data.error) {
        console.error('API Error:', data.error);
        setApps([]);
      } else {
        setApps([]);
      }
    } catch (error) {
      console.error('Error fetching apps:', error);
      setApps([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exceptions = formData.exceptionHandling.enabled
        ? (formData.exceptionHandling.excludedPaths || [])
            .map((path) => String(path || '').trim())
            .filter(Boolean)
            .map((path) => ({
              path,
              ruleIds: (formData.exceptionHandling.excludedRules || [])
                .map((ruleId) => String(ruleId || '').trim())
                .filter(Boolean),
              reason: 'UI exception rule',
            }))
        : [];

      // UI currently collects CVE IDs only, so we generate conservative keyword-match patches.
      // Full exploit signatures should be supplied through dedicated patch rule inputs.
      const virtualPatching = formData.virtualPatching.enabled
        ? (formData.virtualPatching.cveRules || [])
            .map((cve) => String(cve || '').trim().toUpperCase())
            .filter(Boolean)
            .map((cve) => ({
              cve,
              description: `CVE keyword match for ${cve}`,
              pattern: escapeRegex(cve),
              severity: 'WARNING',
            }))
        : [];

      // Prepare policy data
      const policyData = {
        name: formData.name,
        mode: formData.mode,
        includeOWASPCRS: formData.includeOWASPCRS,
        owaspCRSRules: formData.owaspCRSRules,
        sqlInjection: formData.sqlInjection,
        xss: formData.xss,
        fileUpload: formData.fileUpload,
        pathTraversal: formData.pathTraversal,
        rce: formData.rce,
        csrf: formData.csrf,
        sessionFixation: formData.sessionFixation,
        ssrf: formData.ssrf,
        xxe: formData.xxe,
        authBypass: formData.authBypass,
        idor: formData.idor,
        securityMisconfig: formData.securityMisconfig,
        sensitiveDataExposure: formData.sensitiveDataExposure,
        brokenAccessControl: formData.brokenAccessControl,
        securityHeaders: formData.securityHeaders,
        rateLimiting: formData.rateLimiting.enabled ? formData.rateLimiting : false,
        ipAccessControl: formData.ipAccessControl.enabled ? formData.ipAccessControl : null,
        geoBlocking: formData.geoBlocking.enabled ? formData.geoBlocking : null,
        advancedRateLimiting: formData.advancedRateLimiting.enabled ? formData.advancedRateLimiting : null,
        botDetection: formData.botDetection.enabled ? formData.botDetection : null,
        advancedFileUpload: formData.advancedFileUpload.enabled ? formData.advancedFileUpload : null,
        apiProtection: formData.apiProtection.enabled ? formData.apiProtection : null,
        exceptions,
        virtualPatching,
        applicationId: formData.applicationId || null,
      };

      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData),
      });

      if (response.ok) {
        alert(editingPolicyName ? 'Policy version saved successfully!' : 'Policy created successfully! Assign it to an application in the Applications page to use it with the proxy WAF.');
        closePolicyForm();
        fetchPolicies();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create policy');
      }
    } catch (error) {
      console.error('Error creating policy:', error);
      alert('Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePolicy = async (name) => {
    if (!name || deletingPolicyName) return;

    const confirmed = window.confirm(
      `Delete policy "${name}" and all its versions? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingPolicyName(name);
    try {
      const response = await fetch(`/api/policies?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        const details = Array.isArray(result?.details) && result.details.length > 0
          ? `\nAssigned to: ${result.details.join(', ')}`
          : '';
        alert((result?.error || 'Failed to delete policy') + details);
        return;
      }
      await fetchPolicies();
      alert(`Deleted policy "${name}" successfully.`);
    } catch (error) {
      console.error('Error deleting policy:', error);
      alert('Failed to delete policy');
    } finally {
      setDeletingPolicyName('');
    }
  };

  const closePolicyForm = () => {
    setShowForm(false);
    setActiveTab('basic');
    setEditingPolicyName('');
    setFormData(getDefaultPolicyFormData());
  };

  const openNewPolicyForm = () => {
    setEditingPolicyName('');
    setFormData(getDefaultPolicyFormData());
    setActiveTab('basic');
    setShowForm(true);
  };

  const openEditPolicyForm = (policyVersion) => {
    if (!policyVersion) return;
    const defaults = getDefaultPolicyFormData();
    const policy = policyVersion.policy || {};
    const exceptions = Array.isArray(policy.exceptions) ? policy.exceptions : [];
    const virtualPatching = Array.isArray(policy.virtualPatching) ? policy.virtualPatching : [];

    const excludedPaths = exceptions
      .map((item) => String(item?.path || '').trim())
      .filter(Boolean);
    const excludedRules = [...new Set(
      exceptions
        .flatMap((item) => Array.isArray(item?.ruleIds) ? item.ruleIds : [])
        .map((ruleId) => String(ruleId || '').trim())
        .filter(Boolean)
    )];
    const cveRules = virtualPatching
      .map((item) => String(item?.cve || '').trim().toUpperCase())
      .filter(Boolean);

    setFormData({
      ...defaults,
      name: policyVersion.name || '',
      mode: policyVersion.mode || defaults.mode,
      includeOWASPCRS: policyVersion.includeOWASPCRS !== false,
      sqlInjection: Boolean(policy.sqlInjection),
      xss: Boolean(policy.xss),
      fileUpload: Boolean(policy.fileUpload),
      pathTraversal: Boolean(policy.pathTraversal),
      rce: Boolean(policy.rce),
      csrf: Boolean(policy.csrf),
      sessionFixation: Boolean(policy.sessionFixation),
      ssrf: Boolean(policy.ssrf),
      xxe: Boolean(policy.xxe),
      authBypass: Boolean(policy.authBypass),
      idor: Boolean(policy.idor),
      securityMisconfig: Boolean(policy.securityMisconfig),
      sensitiveDataExposure: Boolean(policy.sensitiveDataExposure),
      brokenAccessControl: Boolean(policy.brokenAccessControl),
      securityHeaders: Boolean(policy.securityHeaders),
      rateLimiting: policy.rateLimiting && typeof policy.rateLimiting === 'object'
        ? { ...defaults.rateLimiting, ...policy.rateLimiting, enabled: true }
        : defaults.rateLimiting,
      ipAccessControl: policy.ipAccessControl && typeof policy.ipAccessControl === 'object'
        ? { ...defaults.ipAccessControl, ...policy.ipAccessControl, enabled: true }
        : defaults.ipAccessControl,
      geoBlocking: policy.geoBlocking && typeof policy.geoBlocking === 'object'
        ? { ...defaults.geoBlocking, ...policy.geoBlocking, enabled: true }
        : defaults.geoBlocking,
      advancedRateLimiting: policy.advancedRateLimiting && typeof policy.advancedRateLimiting === 'object'
        ? { ...defaults.advancedRateLimiting, ...policy.advancedRateLimiting, enabled: true }
        : defaults.advancedRateLimiting,
      botDetection: policy.botDetection && typeof policy.botDetection === 'object'
        ? { ...defaults.botDetection, ...policy.botDetection, enabled: true }
        : defaults.botDetection,
      advancedFileUpload: policy.advancedFileUpload && typeof policy.advancedFileUpload === 'object'
        ? { ...defaults.advancedFileUpload, ...policy.advancedFileUpload, enabled: true }
        : defaults.advancedFileUpload,
      apiProtection: policy.apiProtection && typeof policy.apiProtection === 'object'
        ? { ...defaults.apiProtection, ...policy.apiProtection, enabled: true }
        : defaults.apiProtection,
      exceptionHandling: {
        enabled: excludedPaths.length > 0 || excludedRules.length > 0,
        excludedPaths,
        excludedRules,
      },
      virtualPatching: {
        enabled: cveRules.length > 0,
        cveRules,
      },
      applicationId: policyVersion.applicationId || '',
    });
    setEditingPolicyName(policyVersion.name || '');
    setActiveTab('basic');
    setShowForm(true);
  };

  // Group policies by name to show versions
  const groupedPolicies = Array.isArray(policies)
    ? policies.reduce((acc, policy) => {
        if (!acc[policy.name]) {
          acc[policy.name] = [];
        }
        acc[policy.name].push(policy);
        return acc;
      }, {})
    : {};

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  const uniquePolicies = new Set(policies.map(p => p.name));
  const policyCount = uniquePolicies.size;

  // If user doesn't have a tenant, show onboarding
  if (!hasTenant) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security Policies</h1>
              <p className="mt-1 text-sm text-gray-600">
                Configure and manage WAF security policies
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
                Before creating security policies, you need to create an organization. This keeps your policies isolated from other users.
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Multi-tenant Isolation</p>
                      <p className="text-blue-700">
                        All your security policies will be isolated within this organization. You&apos;ll become the administrator.
                      </p>
                    </div>
                  </div>
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

  // All available security rules and protections
  const allSecurityRules = {
    owaspCRS: {
      title: "OWASP Core Rule Set (CRS) 3.3.0",
      description: "Comprehensive protection enabled by default in all policies",
      rules: [
        { name: "REQUEST-901-INITIALIZATION", description: "CRS setup and initialization" },
        { name: "REQUEST-905-COMMON-EXCEPTIONS", description: "Common exception rules" },
        { name: "REQUEST-910-IP-REPUTATION", description: "IP reputation checking" },
        { name: "REQUEST-911-METHOD-ENFORCEMENT", description: "HTTP method validation" },
        { name: "REQUEST-912-DOS-PROTECTION", description: "Denial of Service protection" },
        { name: "REQUEST-913-SCANNER-DETECTION", description: "Security scanner detection" },
        { name: "REQUEST-920-PROTOCOL-ENFORCEMENT", description: "HTTP protocol validation" },
        { name: "REQUEST-921-PROTOCOL-ATTACK", description: "Protocol-level attack detection" },
        { name: "REQUEST-930-APPLICATION-ATTACK-LFI", description: "Local File Inclusion protection" },
        { name: "REQUEST-931-APPLICATION-ATTACK-RFI", description: "Remote File Inclusion protection" },
        { name: "REQUEST-932-APPLICATION-ATTACK-RCE", description: "Remote Code Execution protection" },
        { name: "REQUEST-933-APPLICATION-ATTACK-PHP", description: "PHP-specific attack detection" },
        { name: "REQUEST-934-APPLICATION-ATTACK-NODEJS", description: "Node.js-specific attack detection" },
        { name: "REQUEST-941-APPLICATION-ATTACK-XSS", description: "XSS attack detection" },
        { name: "REQUEST-942-APPLICATION-ATTACK-SQLI", description: "SQL injection detection" },
        { name: "REQUEST-943-APPLICATION-ATTACK-SESSION-FIXATION", description: "Session fixation protection" },
        { name: "REQUEST-944-APPLICATION-ATTACK-JAVA", description: "Java-specific attack detection" },
        { name: "REQUEST-949-BLOCKING-EVALUATION", description: "Blocking decision evaluation" },
        { name: "RESPONSE-950-DATA-LEAKAGES", description: "Data leakage prevention" },
        { name: "RESPONSE-951-DATA-LEAKAGES-SQL", description: "SQL error message detection" },
        { name: "RESPONSE-952-DATA-LEAKAGES-JAVA", description: "Java error message detection" },
        { name: "RESPONSE-953-DATA-LEAKAGES-PHP", description: "PHP error message detection" },
        { name: "RESPONSE-954-DATA-LEAKAGES-IIS", description: "IIS error message detection" },
        { name: "RESPONSE-959-BLOCKING-EVALUATION", description: "Response blocking evaluation" },
        { name: "RESPONSE-980-CORRELATION", description: "Attack correlation and scoring" },
      ]
    },
    owaspTop10: {
      title: "OWASP Top 10 Protections",
      description: "Enhanced protections for OWASP Top 10 vulnerabilities",
      rules: [
        { name: "SQL Injection Protection", description: "Enhanced SQL injection detection with multiple detection layers", icon: "🔴" },
        { name: "Cross-Site Scripting (XSS)", description: "Comprehensive XSS detection including script tags and event handlers", icon: "🟡" },
        { name: "File Upload Protection", description: "Dangerous file extension blocking and file size limits", icon: "🔵" },
        { name: "Path Traversal Protection", description: "Directory traversal attack prevention", icon: "🟠" },
        { name: "Remote Code Execution (RCE)", description: "Command injection and code execution attempt detection", icon: "🟣" },
        { name: "CSRF Protection", description: "Cross-Site Request Forgery token validation and origin checks", icon: "🟢" },
        { name: "Session Fixation Protection", description: "Session ID pattern detection and manipulation prevention", icon: "🔵" },
        { name: "SSRF Protection", description: "Server-Side Request Forgery detection (internal IPs, dangerous URLs)", icon: "🟡" },
        { name: "XXE Protection", description: "XML External Entity injection detection", icon: "🟠" },
        { name: "Authentication Bypass Protection", description: "SQL injection in auth params and bypass pattern detection", icon: "🔴" },
        { name: "IDOR Protection", description: "Insecure Direct Object Reference monitoring", icon: "🟢" },
        { name: "Security Misconfiguration Detection", description: "Exposed config files and default credentials detection", icon: "🟡" },
        { name: "Sensitive Data Exposure Protection", description: "Credit cards, SSNs, API keys detection in responses", icon: "🔴" },
        { name: "Broken Access Control Protection", description: "Privilege escalation and unauthorized access detection", icon: "🟠" },
        { name: "Security Headers Enforcement", description: "Security header monitoring and validation", icon: "🔵" },
      ]
    },
    advanced: {
      title: "Advanced Security Features",
      description: "Enterprise-grade advanced security capabilities",
      rules: [
        { name: "IP Access Control", description: "IP whitelisting/blacklisting with CIDR block support", icon: "🛡️" },
        { name: "Geographic Blocking", description: "Country-based access control with GeoIP integration", icon: "🌍" },
        { name: "Advanced Rate Limiting", description: "Per-endpoint, per-user, and adaptive rate limiting", icon: "⚡" },
        { name: "Bot Detection & Mitigation", description: "User-Agent filtering, bot signature detection, crawler blocking", icon: "🤖" },
        { name: "Advanced File Upload Validation", description: "MIME type validation, content scanning, magic bytes", icon: "📁" },
        { name: "API-Specific Protections", description: "API key validation, OAuth/JWT validation, API versioning", icon: "🔑" },
        { name: "Exception Handling", description: "Path-based rule exclusions and wildcard support", icon: "⚙️" },
        { name: "Virtual Patching", description: "CVE-specific rules for zero-day protection", icon: "🔧" },
      ]
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Policies</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage WAF security policies and protection rules
            </p>
            <p className="mt-1 text-xs text-gray-500">Organization: <span className="font-medium text-gray-700">{tenantName}</span></p>
          </div>
          <button
            onClick={() => {
              if (showForm) {
                closePolicyForm();
              } else {
                openNewPolicyForm();
              }
            }}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all duration-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{showForm ? 'Cancel' : 'New Policy'}</span>
          </button>
        </div>

        {/* All Available Security Rules Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Security Rules & Protections</h2>
            <p className="text-sm text-gray-600">
              Complete list of all security rules and protections provided by ATRAVAD WAF
            </p>
          </div>

          {/* OWASP CRS Rules */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{allSecurityRules.owaspCRS.title}</h3>
                <p className="text-sm text-gray-600">{allSecurityRules.owaspCRS.description}</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {allSecurityRules.owaspCRS.rules.length} Rules
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {allSecurityRules.owaspCRS.rules.map((rule, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{rule.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OWASP Top 10 Protections */}
          <div className="mb-8 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{allSecurityRules.owaspTop10.title}</h3>
                <p className="text-sm text-gray-600">{allSecurityRules.owaspTop10.description}</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {allSecurityRules.owaspTop10.rules.length} Protections
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {allSecurityRules.owaspTop10.rules.map((rule, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-all">
                  <div className="flex-shrink-0 text-2xl">{rule.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{rule.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Features */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{allSecurityRules.advanced.title}</h3>
                <p className="text-sm text-gray-600">{allSecurityRules.advanced.description}</p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {allSecurityRules.advanced.rules.length} Features
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {allSecurityRules.advanced.rules.map((rule, index) => (
                <div key={index} className="flex flex-col p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-all">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">{rule.icon}</span>
                    <p className="text-sm font-semibold text-gray-900">{rule.name}</p>
                  </div>
                  <p className="text-xs text-gray-600">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{allSecurityRules.owaspCRS.rules.length}</div>
                <div className="text-sm text-gray-600 mt-1">OWASP CRS Rules</div>
                <div className="text-xs text-gray-500 mt-1">Enabled by default</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{allSecurityRules.owaspTop10.rules.length}</div>
                <div className="text-sm text-gray-600 mt-1">OWASP Top 10 Protections</div>
                <div className="text-xs text-gray-500 mt-1">Available for policies</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{allSecurityRules.advanced.rules.length}</div>
                <div className="text-sm text-gray-600 mt-1">Advanced Features</div>
                <div className="text-xs text-gray-500 mt-1">Enterprise capabilities</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Total: {allSecurityRules.owaspCRS.rules.length + allSecurityRules.owaspTop10.rules.length + allSecurityRules.advanced.rules.length} Security Rules & Protections
              </div>
            </div>
          </div>
        </div>

        {/* Policy Creation Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={closePolicyForm}
            ></div>
            
            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{editingPolicyName ? 'Edit Security Policy' : 'Create Security Policy'}</h2>
                    <p className="mt-1 text-sm text-gray-600">Configure and deploy comprehensive security protections</p>
                  </div>
                  <button
                    type="button"
                    onClick={closePolicyForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 lg:p-8">
                    {/* OWASP CRS Information */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-blue-800">
                            OWASP Core Rule Set (CRS) Enabled by Default
                          </h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>
                              All policies automatically include <strong>OWASP CRS 3.3.0</strong> with 25 rule sets providing comprehensive protection. The protections below are <strong>additional custom rules</strong> that complement OWASP CRS.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Policy Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    placeholder="e.g., Production Security Policy"
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border transition-colors"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={Boolean(editingPolicyName)}
                  />
                  {editingPolicyName && (
                    <p className="mt-1 text-xs text-blue-600">Versioned edit keeps the same policy name and creates a new version.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-2">
                      Mode *
                    </label>
                    <select
                      id="mode"
                      required
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
                      value={formData.mode}
                      onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    >
                      <option value="detection">Detection (Log only)</option>
                      <option value="prevention">Prevention (Block attacks)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Start with Detection mode to identify false positives</p>
                  </div>

                  <div>
                    <label htmlFor="applicationId" className="block text-sm font-medium text-gray-700 mb-2">
                      Application (Optional)
                    </label>
                    <select
                      id="applicationId"
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
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

              {/* Tabs for different protection categories */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                  {[
                    { id: 'basic', name: 'Basic Protections', icon: '🛡️' },
                    { id: 'owasp', name: 'OWASP Top 10', icon: '🔒' },
                    { id: 'advanced', name: 'Advanced Features', icon: '⚡' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="py-6">
                {/* Basic Protections Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Essential Protections</h3>
                      <div className="space-y-3">
                        {[
                          { key: 'sqlInjection', label: 'Enhanced SQL Injection Protection', desc: 'Multiple detection layers for SQL injection attacks' },
                          { key: 'xss', label: 'Enhanced XSS Protection', desc: 'Comprehensive XSS detection including script tags and event handlers' },
                          { key: 'fileUpload', label: 'File Upload Protection', desc: 'Dangerous file extension blocking and file size limits' },
                          { key: 'pathTraversal', label: 'Path Traversal Protection', desc: 'Directory traversal attack prevention' },
                          { key: 'rce', label: 'Remote Code Execution (RCE) Protection', desc: 'Command injection and code execution attempt detection' },
                        ].map((protection) => (
                          <label key={protection.key} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData[protection.key]}
                              onChange={(e) => setFormData({ ...formData, [protection.key]: e.target.checked })}
                            />
                            <div className="ml-3 flex-1">
                              <div className="text-sm font-medium text-gray-900">{protection.label}</div>
                              <div className="text-xs text-gray-500 mt-1">{protection.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* OWASP Top 10 Tab */}
                {activeTab === 'owasp' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">OWASP Top 10 Protections</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                          { key: 'securityHeaders', label: 'Security Headers Enforcement', desc: 'Security header monitoring' },
                        ].map((protection) => (
                          <label key={protection.key} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData[protection.key]}
                              onChange={(e) => setFormData({ ...formData, [protection.key]: e.target.checked })}
                            />
                            <div className="ml-3 flex-1">
                              <div className="text-sm font-medium text-gray-900">{protection.label}</div>
                              <div className="text-xs text-gray-500 mt-1">{protection.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Rate Limiting */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.rateLimiting.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            rateLimiting: { ...formData.rateLimiting, enabled: e.target.checked }
                          })}
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">Rate Limiting</span>
                      </label>
                      {formData.rateLimiting.enabled && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Requests/Minute</label>
                            <input
                              type="number"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                              value={formData.rateLimiting.requestsPerMinute}
                              onChange={(e) => setFormData({
                                ...formData,
                                rateLimiting: { ...formData.rateLimiting, requestsPerMinute: parseInt(e.target.value) || 60 }
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Requests/Hour</label>
                            <input
                              type="number"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                              value={formData.rateLimiting.requestsPerHour}
                              onChange={(e) => setFormData({
                                ...formData,
                                rateLimiting: { ...formData.rateLimiting, requestsPerHour: parseInt(e.target.value) || 1000 }
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Burst Size</label>
                            <input
                              type="number"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                              value={formData.rateLimiting.burstSize}
                              onChange={(e) => setFormData({
                                ...formData,
                                rateLimiting: { ...formData.rateLimiting, burstSize: parseInt(e.target.value) || 10 }
                              })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Advanced Features Tab */}
                {activeTab === 'advanced' && (
                  <div className="space-y-6">
                    {/* Advanced Security Features Section Header */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Advanced Security Features</h3>
                      <p className="text-xs text-gray-600 mb-4">Enterprise-grade advanced security capabilities</p>
                    </div>

                    {/* 1. IP Access Control */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.ipAccessControl.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            ipAccessControl: { ...formData.ipAccessControl, enabled: e.target.checked }
                          })}
                        />
                        <span className="ml-2 text-lg mr-2">🛡️</span>
                        <span className="text-sm font-medium text-gray-900">IP Access Control</span>
                      </label>
                      <p className="text-xs text-gray-600 ml-8 mb-3">IP whitelisting/blacklisting with CIDR block support</p>
                      {formData.ipAccessControl.enabled && (
                        <div className="mt-3 space-y-4 ml-8">
                          <TagListInput
                            label="Whitelist IPs"
                            value={formData.ipAccessControl.whitelist}
                            onChange={(whitelist) => setFormData({
                              ...formData,
                              ipAccessControl: { ...formData.ipAccessControl, whitelist }
                            })}
                            placeholder="e.g. 192.168.1.100"
                            normalize={(s) => s.trim()}
                          />
                          <TagListInput
                            label="Blacklist IPs"
                            value={formData.ipAccessControl.blacklist}
                            onChange={(blacklist) => setFormData({
                              ...formData,
                              ipAccessControl: { ...formData.ipAccessControl, blacklist }
                            })}
                            placeholder="e.g. 203.0.113.0"
                            normalize={(s) => s.trim()}
                          />
                        </div>
                      )}
                    </div>

                    {/* 2. Geographic Blocking */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.geoBlocking.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            geoBlocking: { ...formData.geoBlocking, enabled: e.target.checked }
                          })}
                        />
                        <span className="ml-2 text-lg mr-2">🌍</span>
                        <span className="text-sm font-medium text-gray-900">Geographic Blocking</span>
                      </label>
                      <p className="text-xs text-gray-600 ml-8 mb-3">Country-based access control with GeoIP integration</p>
                      {formData.geoBlocking.enabled && (
                        <div className="mt-3 space-y-4 ml-8">
                          <TagListInput
                            label="Blocked Countries (ISO country codes)"
                            value={formData.geoBlocking.blockedCountries}
                            onChange={(blockedCountries) => setFormData({
                              ...formData,
                              geoBlocking: { ...formData.geoBlocking, blockedCountries }
                            })}
                            placeholder="e.g. CN"
                            normalize={(s) => s.trim().toUpperCase()}
                          />
                          <TagListInput
                            label="Allowed Countries (empty = all)"
                            value={formData.geoBlocking.allowedCountries}
                            onChange={(allowedCountries) => setFormData({
                              ...formData,
                              geoBlocking: { ...formData.geoBlocking, allowedCountries }
                            })}
                            placeholder="e.g. US"
                            normalize={(s) => s.trim().toUpperCase()}
                          />
                        </div>
                      )}
                    </div>

                    {/* 3. Advanced Rate Limiting */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.advancedRateLimiting.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            advancedRateLimiting: { ...formData.advancedRateLimiting, enabled: e.target.checked }
                          })}
                        />
                        <span className="ml-2 text-lg mr-2">⚡</span>
                        <span className="text-sm font-medium text-gray-900">Advanced Rate Limiting</span>
                      </label>
                      <p className="text-xs text-gray-600 ml-8 mb-3">Per-endpoint, per-user, and adaptive rate limiting</p>
                      {formData.advancedRateLimiting.enabled && (
                        <div className="mt-3 space-y-2 ml-8">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.advancedRateLimiting.adaptive}
                              onChange={(e) => setFormData({
                                ...formData,
                                advancedRateLimiting: { ...formData.advancedRateLimiting, adaptive: e.target.checked }
                              })}
                            />
                            <span className="ml-2 text-xs text-gray-700">Adaptive Rate Limiting</span>
                          </label>
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600 mb-1">Per-Endpoint Rules (JSON format: {"{"}"endpoint": "requests_per_minute"{"}"})</label>
                            <textarea
                              placeholder='{"\/api\/users": 100, "\/api\/admin": 50}'
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border font-mono text-xs"
                              rows={3}
                              onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value);
                                  setFormData({
                                    ...formData,
                                    advancedRateLimiting: { ...formData.advancedRateLimiting, perEndpoint: parsed }
                                  });
                                } catch (err) {
                                  // Invalid JSON, keep previous value
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Bot Detection & Mitigation */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.botDetection.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            botDetection: { ...formData.botDetection, enabled: e.target.checked }
                          })}
                        />
                        <span className="ml-2 text-lg mr-2">🤖</span>
                        <span className="text-sm font-medium text-gray-900">Bot Detection & Mitigation</span>
                      </label>
                      <p className="text-xs text-gray-600 ml-8 mb-3">User-Agent filtering, bot signature detection, crawler blocking</p>
                      {formData.botDetection.enabled && (
                        <div className="mt-3 space-y-2 ml-8">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.botDetection.userAgentFiltering}
                              onChange={(e) => setFormData({
                                ...formData,
                                botDetection: { ...formData.botDetection, userAgentFiltering: e.target.checked }
                              })}
                            />
                            <span className="ml-2 text-xs text-gray-700">User-Agent Filtering</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.botDetection.botSignatureDetection}
                              onChange={(e) => setFormData({
                                ...formData,
                                botDetection: { ...formData.botDetection, botSignatureDetection: e.target.checked }
                              })}
                            />
                            <span className="ml-2 text-xs text-gray-700">Bot Signature Detection</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.botDetection.crawlerBlocking}
                              onChange={(e) => setFormData({
                                ...formData,
                                botDetection: { ...formData.botDetection, crawlerBlocking: e.target.checked }
                              })}
                            />
                            <span className="ml-2 text-xs text-gray-700">Crawler Blocking</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* 5. Advanced File Upload Validation */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.advancedFileUpload.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            advancedFileUpload: { ...formData.advancedFileUpload, enabled: e.target.checked }
                          })}
                        />
                        <span className="ml-2 text-lg mr-2">📁</span>
                        <span className="text-sm font-medium text-gray-900">Advanced File Upload Validation</span>
                      </label>
                      <p className="text-xs text-gray-600 ml-8 mb-3">MIME type validation, content scanning, magic bytes</p>
                      {formData.advancedFileUpload.enabled && (
                        <div className="mt-3 space-y-3 ml-8">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.advancedFileUpload.mimeTypeValidation}
                              onChange={(e) => setFormData({
                                ...formData,
                                advancedFileUpload: { ...formData.advancedFileUpload, mimeTypeValidation: e.target.checked }
                              })}
                            />
                            <span className="ml-2 text-xs text-gray-700">MIME Type Validation</span>
                          </label>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Max File Size (bytes)</label>
                            <input
                              type="number"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                              value={formData.advancedFileUpload.maxFileSize}
                              onChange={(e) => setFormData({
                                ...formData,
                                advancedFileUpload: { ...formData.advancedFileUpload, maxFileSize: parseInt(e.target.value) || 10485760 }
                              })}
                            />
                          </div>
                          <TagListInput
                            label="Allowed Extensions"
                            value={formData.advancedFileUpload.allowedExtensions}
                            onChange={(allowedExtensions) => setFormData({
                              ...formData,
                              advancedFileUpload: { ...formData.advancedFileUpload, allowedExtensions }
                            })}
                            placeholder="e.g. jpg"
                            normalize={(s) => s.trim().toLowerCase()}
                          />
                          <TagListInput
                            label="Blocked Extensions"
                            value={formData.advancedFileUpload.blockedExtensions}
                            onChange={(blockedExtensions) => setFormData({
                              ...formData,
                              advancedFileUpload: { ...formData.advancedFileUpload, blockedExtensions }
                            })}
                            placeholder="e.g. exe"
                            normalize={(s) => s.trim().toLowerCase()}
                          />
                        </div>
                      )}
                    </div>

                    {/* 6. API-Specific Protections */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.apiProtection.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            apiProtection: { ...formData.apiProtection, enabled: e.target.checked }
                          })}
                        />
                        <span className="ml-2 text-lg mr-2">🔑</span>
                        <span className="text-sm font-medium text-gray-900">API-Specific Protections</span>
                      </label>
                      <p className="text-xs text-gray-600 ml-8 mb-3">API key validation, OAuth/JWT validation, API versioning</p>
                      {formData.apiProtection.enabled && (
                        <div className="mt-3 space-y-2 ml-8">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.apiProtection.apiKeyValidation}
                              onChange={(e) => setFormData({
                                ...formData,
                                apiProtection: { ...formData.apiProtection, apiKeyValidation: e.target.checked }
                              })}
                            />
                            <span className="ml-2 text-xs text-gray-700">API Key Validation</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.apiProtection.oauthValidation}
                              onChange={(e) => setFormData({
                                ...formData,
                                apiProtection: { ...formData.apiProtection, oauthValidation: e.target.checked }
                              })}
                            />
                            <span className="ml-2 text-xs text-gray-700">OAuth Validation</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.apiProtection.jwtValidation}
                              onChange={(e) => setFormData({
                                ...formData,
                                apiProtection: { ...formData.apiProtection, jwtValidation: e.target.checked }
                              })}
                            />
                            <span className="ml-2 text-xs text-gray-700">JWT Validation</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* 7. Exception Handling */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.exceptionHandling.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            exceptionHandling: { ...formData.exceptionHandling, enabled: e.target.checked }
                          })}
                        />
                        <span className="ml-2 text-lg mr-2">⚙️</span>
                        <span className="text-sm font-medium text-gray-900">Exception Handling</span>
                      </label>
                      <p className="text-xs text-gray-600 ml-8 mb-3">Path-based rule exclusions and wildcard support</p>
                      {formData.exceptionHandling.enabled && (
                        <div className="mt-3 space-y-4 ml-8">
                          <TagListInput
                            label="Excluded Paths (supports wildcards e.g. /static/*)"
                            value={formData.exceptionHandling.excludedPaths}
                            onChange={(excludedPaths) => setFormData({
                              ...formData,
                              exceptionHandling: { ...formData.exceptionHandling, excludedPaths }
                            })}
                            placeholder="e.g. /api/health"
                            normalize={(s) => s.trim()}
                          />
                          <TagListInput
                            label="Excluded Rule IDs"
                            value={formData.exceptionHandling.excludedRules}
                            onChange={(excludedRules) => setFormData({
                              ...formData,
                              exceptionHandling: { ...formData.exceptionHandling, excludedRules }
                            })}
                            placeholder="e.g. 942100"
                            normalize={(s) => s.trim()}
                          />
                        </div>
                      )}
                    </div>

                    {/* 8. Virtual Patching */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.virtualPatching.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            virtualPatching: { ...formData.virtualPatching, enabled: e.target.checked }
                          })}
                        />
                        <span className="ml-2 text-lg mr-2">🔧</span>
                        <span className="text-sm font-medium text-gray-900">Virtual Patching</span>
                      </label>
                      <p className="text-xs text-gray-600 ml-8 mb-3">CVE-specific rules for zero-day protection</p>
                      {formData.virtualPatching.enabled && (
                        <div className="mt-3 ml-8">
                          <TagListInput
                            label="CVE Rules (CVE IDs)"
                            value={formData.virtualPatching.cveRules}
                            onChange={(cveRules) => setFormData({
                              ...formData,
                              virtualPatching: { ...formData.virtualPatching, cveRules }
                            })}
                            placeholder="e.g. CVE-2023-1234"
                            normalize={(s) => s.trim().toUpperCase()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

                      {/* Form Actions */}
                      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={closePolicyForm}
                          className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all duration-200"
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
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <svg className="h-4 w-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        OWASP CRS 3.3.0 Included
                      </span>
                      <span className="flex items-center">
                        <svg className="h-4 w-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        ModSecurity Powered
                      </span>
                    </div>
                    <div>
                      Step {activeTab === 'basic' ? '1' : activeTab === 'owasp' ? '2' : activeTab === 'advanced' ? '3' : '1'} of 3
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {policyCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Active Policies
              </h2>
              <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {policyCount} {policyCount === 1 ? 'policy' : 'policies'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {Object.keys(groupedPolicies).length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-gray-900">No policies</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by creating your first security policy.
              </p>
            </div>
          ) : (
            Object.entries(groupedPolicies).map(([name, versions]) => {
              const latestVersion = versions[0];
              return (
                <div key={name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-50 rounded-lg">
                          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Version {latestVersion.version} (Latest) • {versions.length} {versions.length === 1 ? 'version' : 'versions'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openEditPolicyForm(latestVersion)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <Link
                        href={`/policies/${name}`}
                        className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <span>View Versions</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeletePolicy(name)}
                        disabled={deletingPolicyName === name}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingPolicyName === name ? 'Deleting...' : 'Delete Policy'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Protections:
                      </span>
                      {latestVersion.policy.sqlInjection && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          SQL Injection
                        </span>
                      )}
                      {latestVersion.policy.xss && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          XSS
                        </span>
                      )}
                      {latestVersion.policy.fileUpload && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          File Upload
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        OWASP CRS
                      </span>
                      {!latestVersion.policy.sqlInjection &&
                        !latestVersion.policy.xss &&
                        !latestVersion.policy.fileUpload && (
                          <span className="text-xs text-gray-500">Basic OWASP CRS only</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Created {new Date(latestVersion.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
