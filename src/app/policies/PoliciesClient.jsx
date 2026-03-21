'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import PoliciesList from './PoliciesList';
import PolicyEditor from './PolicyEditor';
import ConfirmationModal from './ConfirmationModal';
import FeedbackModal from './FeedbackModal';
import { getDefaultPolicyFormData } from './policy-form-utils';

const BuildingIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export function PoliciesPageContent({
  editorOnly = false,
  initialEditName = '',
  initialCreate = false,
}) {
  const router = useRouter();
  const [policies, setPolicies] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(editorOnly);
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
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [confirmationState, setConfirmationState] = useState({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    tone: 'blue',
    action: null,
  });
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [feedbackState, setFeedbackState] = useState({
    open: false,
    title: '',
    description: '',
    tone: 'blue',
  });

  useEffect(() => {
    checkTenantAndFetchData();
  }, []);

  useEffect(() => {
    if (loading || editorInitialized || !editorOnly) return;

    if (initialCreate) {
      setEditingPolicyName('');
      setFormData(getDefaultPolicyFormData());
      setActiveTab('basic');
      setShowForm(true);
      setEditorInitialized(true);
      return;
    }

    if (!initialEditName || policies.length === 0) return;

    const matchingVersions = policies.filter((policy) => policy.name === initialEditName);
    if (matchingVersions.length === 0) {
      setEditorInitialized(true);
      return;
    }

    const latestVersion = matchingVersions.reduce((latest, current) =>
      Number(current.version || 0) > Number(latest.version || 0) ? current : latest
    );
    openEditPolicyForm(latestVersion);
    setEditorInitialized(true);
  }, [editorInitialized, editorOnly, initialCreate, initialEditName, loading, policies]);

  const checkTenantAndFetchData = async () => {
    try {
      const [tenantRes, userRes] = await Promise.all([
        fetch('/api/tenants/current'),
        fetch('/api/users/me'),
      ]);

      const tenant = await tenantRes.json();
      const user = await userRes.json();
      const userHasTenantName = user?.tenantName && typeof user.tenantName === 'string' && user.tenantName.trim() !== '';
      const hasValidTenantFromAPI = !!(tenant?.id && tenant?.name && tenant.name !== 'Default Tenant');
      const userHasTenant = !!userHasTenantName || hasValidTenantFromAPI;

      setHasTenant(userHasTenant);
      setTenantName(tenant?.name || '');

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

      if (!response.ok) {
        const error = await response.json();
        openFeedback({
          title: 'Organization creation failed',
          description: error.error || 'Failed to create organization',
          tone: 'red',
        });
        return;
      }

      const tenantData = await response.json();
      setHasTenant(true);
      setTenantName(tenantData.name);
      setShowTenantForm(false);
      setTenantFormData({ name: '' });
      await Promise.all([fetchPolicies(), fetchApps()]);
    } catch (error) {
      console.error('Error creating tenant:', error);
      openFeedback({
        title: 'Organization creation failed',
        description: 'Failed to create organization',
        tone: 'red',
      });
    } finally {
      setSubmittingTenant(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/policies');
      const data = await response.json();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching policies:', error);
      setPolicies([]);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps');
      const data = await response.json();
      setApps(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching apps:', error);
      setApps([]);
    }
  };

  const closePolicyForm = () => {
    if (editorOnly) {
      router.push('/policies');
      return;
    }
    setShowForm(false);
    setActiveTab('basic');
    setEditingPolicyName('');
    setFormData(getDefaultPolicyFormData());
  };

  const openEditPolicyForm = (policyVersion) => {
    if (!policyVersion) return;

    const defaults = getDefaultPolicyFormData();
    const policy = policyVersion.policy || {};
    const exceptions = Array.isArray(policy.exceptions) ? policy.exceptions : [];
    const virtualPatches = Array.isArray(policy.virtualPatching) ? policy.virtualPatching : [];
    const relatedVersions = policies.filter((item) => item.name === policyVersion.name);
    const selectedApplicationIds = [
      ...new Set(
        relatedVersions.flatMap((item) =>
          Array.isArray(item.applicationIds) && item.applicationIds.length > 0
            ? item.applicationIds
            : item.applicationId
              ? [item.applicationId]
              : []
        )
      ),
    ];

    setEditingPolicyName(policyVersion.name);
    setFormData({
      ...defaults,
      name: policyVersion.name || '',
      mode: policyVersion.mode || defaults.mode,
      includeOWASPCRS: policy.includeOWASPCRS ?? defaults.includeOWASPCRS,
      sqlInjection: !!policy.sqlInjection,
      xss: !!policy.xss,
      fileUpload: !!policy.fileUpload,
      pathTraversal: !!policy.pathTraversal,
      rce: !!policy.rce,
      csrf: !!policy.csrf,
      sessionFixation: !!policy.sessionFixation,
      ssrf: !!policy.ssrf,
      xxe: !!policy.xxe,
      authBypass: !!policy.authBypass,
      idor: !!policy.idor,
      securityMisconfig: !!policy.securityMisconfig,
      sensitiveDataExposure: !!policy.sensitiveDataExposure,
      brokenAccessControl: !!policy.brokenAccessControl,
      securityHeaders: !!policy.securityHeaders,
      owaspCRSRules: { ...defaults.owaspCRSRules, ...(policy.owaspCRSRules || {}) },
      rateLimiting: policy.rateLimiting ? { ...defaults.rateLimiting, ...policy.rateLimiting, enabled: true } : defaults.rateLimiting,
      ipAccessControl: policy.ipAccessControl
        ? {
            ...defaults.ipAccessControl,
            ...policy.ipAccessControl,
            enabled: true,
            whitelist: policy.ipAccessControl.whitelist || [],
            blacklist: policy.ipAccessControl.blacklist || [],
            whitelistCIDR: policy.ipAccessControl.whitelistCIDR || [],
            blacklistCIDR: policy.ipAccessControl.blacklistCIDR || [],
          }
        : defaults.ipAccessControl,
      geoBlocking: policy.geoBlocking
        ? {
            ...defaults.geoBlocking,
            ...policy.geoBlocking,
            enabled: true,
            blockedCountries: policy.geoBlocking.blockedCountries || [],
            allowedCountries: policy.geoBlocking.allowedCountries || [],
          }
        : defaults.geoBlocking,
      advancedRateLimiting: policy.advancedRateLimiting
        ? { ...defaults.advancedRateLimiting, ...policy.advancedRateLimiting, enabled: true }
        : defaults.advancedRateLimiting,
      botDetection: policy.botDetection
        ? { ...defaults.botDetection, ...policy.botDetection, enabled: true }
        : defaults.botDetection,
      advancedFileUpload: policy.advancedFileUpload
        ? {
            ...defaults.advancedFileUpload,
            ...policy.advancedFileUpload,
            enabled: true,
            allowedExtensions: policy.advancedFileUpload.allowedExtensions || [],
            blockedExtensions: policy.advancedFileUpload.blockedExtensions || [],
          }
        : defaults.advancedFileUpload,
      apiProtection: policy.apiProtection
        ? { ...defaults.apiProtection, ...policy.apiProtection, enabled: true }
        : defaults.apiProtection,
      exceptionHandling: {
        enabled: exceptions.length > 0,
        excludedPaths: [...new Set(exceptions.map((item) => item.path).filter(Boolean))],
        excludedRules: [...new Set(exceptions.flatMap((item) => item.ruleIds || []).filter(Boolean).map(String))],
      },
      virtualPatching: {
        enabled: virtualPatches.length > 0,
        cveRules: virtualPatches.map((item) => item.cve).filter(Boolean),
      },
      applicationIds: selectedApplicationIds,
    });

    setActiveTab('basic');
    setShowForm(true);
  };

  const openConfirmation = ({ title, description, confirmLabel, tone = 'blue', action }) => {
    setConfirmationState({
      open: true,
      title,
      description,
      confirmLabel,
      tone,
      action,
    });
  };

  const resetConfirmation = () => {
    setConfirmationState({
      open: false,
      title: '',
      description: '',
      confirmLabel: 'Confirm',
      tone: 'blue',
      action: null,
    });
  };

  const closeConfirmation = () => {
    if (confirmingAction) return;
    resetConfirmation();
  };

  const runConfirmedAction = async () => {
    if (!confirmationState.action) return;

    setConfirmingAction(true);
    try {
      await confirmationState.action();
    } finally {
      setConfirmingAction(false);
      resetConfirmation();
    }
  };

  const openFeedback = ({ title, description, tone = 'blue' }) => {
    setFeedbackState({
      open: true,
      title,
      description,
      tone,
    });
  };

  const closeFeedback = () => {
    setFeedbackState({
      open: false,
      title: '',
      description: '',
      tone: 'blue',
    });
  };

  const submitPolicy = async () => {
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
            .filter((exception) => exception.ruleIds.length > 0)
        : [];

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
        applicationIds: Array.isArray(formData.applicationIds) ? formData.applicationIds : [],
      };

      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData),
      });

      if (!response.ok) {
        const error = await response.json();
        openFeedback({
          title: editingPolicyName ? 'Unable to save version' : 'Unable to create policy',
          description: error.error || 'Failed to create policy',
          tone: 'red',
        });
        return;
      }

      openFeedback({
        title: editingPolicyName ? 'Policy version saved' : 'Policy created',
        description: editingPolicyName
          ? 'A new policy version was saved successfully.'
          : 'The policy was created successfully. Assign it to an application in the Applications page to use it with the proxy WAF.',
        tone: 'green',
      });
      if (editorOnly) {
        router.push('/policies');
      } else {
        closePolicyForm();
        fetchPolicies();
      }
    } catch (error) {
      console.error('Error creating policy:', error);
      openFeedback({
        title: editingPolicyName ? 'Unable to save version' : 'Unable to create policy',
        description: 'Failed to create policy',
        tone: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    openConfirmation({
      title: editingPolicyName ? 'Save policy version?' : 'Create this policy?',
      description: editingPolicyName
        ? `This will save a new version for "${editingPolicyName}" using the current policy configuration.`
        : `This will create the policy "${formData.name || 'Untitled Policy'}" and make it available for site assignment.`,
      confirmLabel: editingPolicyName ? 'Save Version' : 'Create Policy',
      tone: 'blue',
      action: submitPolicy,
    });
  };

  const deletePolicy = async (name) => {
    if (!name || deletingPolicyName) return;

    setDeletingPolicyName(name);
    try {
      const response = await fetch(`/api/policies?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        const details =
          Array.isArray(result?.details) && result.details.length > 0
            ? `\nAssigned to: ${result.details.join(', ')}`
            : '';
        openFeedback({
          title: 'Unable to delete policy',
          description: (result?.error || 'Failed to delete policy') + details,
          tone: 'red',
        });
        return;
      }

      await fetchPolicies();
      openFeedback({
        title: 'Policy deleted',
        description: `Deleted policy "${name}" successfully.`,
        tone: 'green',
      });
    } catch (error) {
      console.error('Error deleting policy:', error);
      openFeedback({
        title: 'Unable to delete policy',
        description: 'Failed to delete policy',
        tone: 'red',
      });
    } finally {
      setDeletingPolicyName('');
    }
  };

  const handleDeletePolicy = async (name) => {
    if (!name || deletingPolicyName) return;

    openConfirmation({
      title: 'Delete this policy?',
      description: `This will permanently remove "${name}" and all of its saved versions. This action cannot be undone.`,
      confirmLabel: 'Delete Policy',
      tone: 'red',
      action: () => deletePolicy(name),
    });
  };

  const groupedPolicies = policies.reduce((acc, policy) => {
    if (!acc[policy.name]) acc[policy.name] = [];
    acc[policy.name].push(policy);
    acc[policy.name].sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
    return acc;
  }, {});

  const policyCount = Object.keys(groupedPolicies).length;

  if (!loading && !hasTenant) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl py-16">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl bg-blue-50 p-3">
                <BuildingIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tenant assignment required</h1>
                <p className="mt-1 text-sm text-gray-600">Policies are available only after the super admin team provisions your managed tenant access.</p>
              </div>
            </div>

            <p className="text-sm leading-7 text-gray-700">
              ATRAVA Defense is managed under super-admin-controlled RBAC. Contact the ATRAVA Defense operations team to create your tenant, assign your account, and enable policy management access.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {loading ? (
          <AppLoadingState
            variant="panel"
            title="Loading security policies"
            message="Pulling active policy sets, version history, and application assignments."
          />
        ) : (
          <>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Policies</h1>
            <p className="mt-2 text-sm text-gray-600">Manage WAF security policies and protection rules</p>
            <p className="mt-1 text-xs text-gray-500">
              Organization: <span className="font-medium text-gray-700">{tenantName}</span>
            </p>
          </div>
          {!editorOnly ? (
            <Link
              href="/policies/new"
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Policy</span>
            </Link>
          ) : null}
        </div>

        {!editorOnly ? (
          <PoliciesList
            groupedPolicies={groupedPolicies}
            policyCount={policyCount}
            deletingPolicyName={deletingPolicyName}
            handleDeletePolicy={handleDeletePolicy}
          />
        ) : null}

        <PolicyEditor
          editorOnly={editorOnly}
          showForm={showForm}
          editingPolicyName={editingPolicyName}
          closePolicyForm={closePolicyForm}
          handleSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          apps={apps}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          submitting={submitting}
        />

        <ConfirmationModal
          open={confirmationState.open}
          title={confirmationState.title}
          description={confirmationState.description}
          confirmLabel={confirmationState.confirmLabel}
          tone={confirmationState.tone}
          busy={confirmingAction || submitting || !!deletingPolicyName}
          onCancel={closeConfirmation}
          onConfirm={runConfirmedAction}
        />

        <FeedbackModal
          open={feedbackState.open}
          title={feedbackState.title}
          description={feedbackState.description}
          tone={feedbackState.tone}
          onClose={closeFeedback}
        />
          </>
        )}
      </div>
    </Layout>
  );
}
