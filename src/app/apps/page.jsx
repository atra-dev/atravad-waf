'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { isValidPemCertificate, isValidPemPrivateKey } from '@/lib/ssl-utils';

// Icon Components
const GlobeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CloseIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SettingsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const WarningIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const GridIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ListIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

// Tenant icon for no-tenant state
const BuildingIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const SSL_MODE = {
  AUTO: 'auto',
  CUSTOM: 'custom',
};

const getSslStatusMeta = (ssl) => {
  if (ssl?.customCert) {
    return {
      label: 'Custom Certificate',
      tone: 'bg-violet-100 text-violet-700',
      note: 'User-managed PEM certificate',
    };
  }
  if (ssl?.autoProvision === false) {
    return {
      label: 'Manual SSL',
      tone: 'bg-amber-100 text-amber-700',
      note: 'Auto-provision is disabled',
    };
  }
  return {
    label: "Let's Encrypt Auto",
    tone: 'bg-emerald-100 text-emerald-700',
    note: 'Managed and auto-provisioned',
  };
};

const validateSslInput = (data) => {
  if (data.sslMode !== SSL_MODE.CUSTOM) {
    return { valid: true, message: '' };
  }

  const cert = data.customCert?.trim();
  const key = data.customKey?.trim();
  const fullchain = data.customFullchain?.trim();

  if (!cert || !key) {
    return {
      valid: false,
      message: 'Certificate and private key are required for custom SSL.',
    };
  }
  if (!isValidPemCertificate(cert)) {
    return {
      valid: false,
      message: 'Certificate must be PEM format (BEGIN CERTIFICATE / END CERTIFICATE).',
    };
  }
  if (!isValidPemPrivateKey(key)) {
    return {
      valid: false,
      message: 'Private key must be PEM format (BEGIN PRIVATE KEY / END PRIVATE KEY).',
    };
  }
  if (fullchain && !isValidPemCertificate(fullchain)) {
    return {
      valid: false,
      message: 'CA chain must be PEM certificate format or left empty.',
    };
  }

  return { valid: true, message: 'Custom SSL PEM looks valid.' };
};

const createDefaultAppFormData = () => ({
  name: '',
  domain: '',
  originUrl: '',
  originUpstreamHost: '',
  originTlsServername: '',
  originAuthHeaderName: '',
  originAuthHeaderValue: '',
  responseInspectionEnabled: true,
  websocketEnabled: true,
  websocketIdleTimeoutSec: '900',
  policyId: '',
  sslMode: SSL_MODE.AUTO,
  autoProvisionSSL: true,
  customCert: '',
  customKey: '',
  customFullchain: '',
});

export default function AppsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [connecting, setConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [formData, setFormData] = useState(createDefaultAppFormData);
  const [policies, setPolicies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAppForSetup, setSelectedAppForSetup] = useState(null); // For Continue Setup modal
  const [openSettingsMenu, setOpenSettingsMenu] = useState(null); // For settings dropdown
  const [dropdownPosition, setDropdownPosition] = useState(null); // { top, left } for portal dropdown
  const [selectedAppForEdit, setSelectedAppForEdit] = useState(null); // For edit modal
  const [editModalTab, setEditModalTab] = useState('general'); // 'general' | 'ssl' - Sucuri-style separation
  const [editFormData, setEditFormData] = useState(() => createDefaultAppFormData());
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clearingCacheAppId, setClearingCacheAppId] = useState(null);
  const [createSslUiError, setCreateSslUiError] = useState('');
  const [editSslUiError, setEditSslUiError] = useState('');
  
  // Multi-tenancy state
  const [hasTenant, setHasTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '' });
  const [submittingTenant, setSubmittingTenant] = useState(false);

  useEffect(() => {
    checkTenantAndFetchData();
  }, []);

  const checkTenantAndFetchData = async () => {
    try {
      // Check tenant status
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
      
      // Only fetch apps and policies if user has a tenant
      if (userHasTenant) {
        await Promise.all([fetchApps(), fetchPolicies()]);
      }
    } catch (error) {
      console.error('Error checking tenant:', error);
      setHasTenant(false);
    } finally {
      setLoading(false);
  }
};

const getTrafficBarHeight = (value, maxValue) => {
  if (!maxValue || value <= 0) return 10;
  return Math.max(10, Math.min(56, Math.round((value / maxValue) * 56)));
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
        // Now fetch apps and policies
        await Promise.all([fetchApps(), fetchPolicies()]);
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
      if (Array.isArray(data)) {
        setPolicies(data);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps');
      const data = await response.json();
      
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
    } finally {
      setLoading(false);
    }
  };

  // Filter apps based on search query
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return apps;
    const query = searchQuery.toLowerCase();
    return apps.filter(app => 
      app.domain?.toLowerCase().includes(query) ||
      app.name?.toLowerCase().includes(query)
    );
  }, [apps, searchQuery]);

  const policyOptions = useMemo(() => {
    if (!Array.isArray(policies) || policies.length === 0) return [];

    const latestVersionByName = policies.reduce((acc, policy) => {
      if (!policy?.name) return acc;
      const currentVersion = Number(policy.version || 1);
      const previous = acc[policy.name];
      if (!previous || currentVersion > previous) {
        acc[policy.name] = currentVersion;
      }
      return acc;
    }, {});

    return [...policies]
      .filter((policy) => policy?.id && policy?.name)
      .sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        return Number(b.version || 1) - Number(a.version || 1);
      })
      .map((policy) => {
        const version = Number(policy.version || 1);
        const isLatest = latestVersionByName[policy.name] === version;
        return {
          id: policy.id,
          label: `${policy.name} (v${version}${isLatest ? ' - Latest' : ''})`,
        };
      });
  }, [policies]);

  const createSslValidation = useMemo(
    () => validateSslInput(formData),
    [formData.sslMode, formData.customCert, formData.customKey, formData.customFullchain]
  );
  const editSslValidation = useMemo(
    () => validateSslInput(editFormData),
    [editFormData.sslMode, editFormData.customCert, editFormData.customKey, editFormData.customFullchain]
  );

  const importPemFile = async (file, field, setData, setError) => {
    if (!file) return;
    try {
      const text = await file.text();
      setData((prev) => ({ ...prev, [field]: text }));
      setError('');
    } catch (error) {
      console.error('Error reading certificate file:', error);
      setError('Failed to read certificate file.');
    }
  };

  const handleAddSite = () => {
    setFormData(createDefaultAppFormData());
    setCreateSslUiError('');
    setWizardStep(1);
    setShowModal(true);
  };

  const handleWizardNext = async () => {
    if (wizardStep === 1) {
      // Validate domain
      if (!formData.domain.trim()) {
        alert('Please enter a domain name');
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      // Validate origin
      if (!formData.originUrl.trim()) {
        alert('Please enter your origin server URL');
        return;
      }
      // Show connecting animation
      setConnecting(true);
      setWizardStep(3);
      
      // Simulate connection check
      setTimeout(() => {
        setConnecting(false);
        setWizardStep(4);
      }, 2000);
    } else if (wizardStep === 4) {
      // Submit the form
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!createSslValidation.valid) {
      setCreateSslUiError(createSslValidation.message);
      return;
    }
    setCreateSslUiError('');
    setSubmitting(true);

    try {
      const apiData = {
        name: formData.name || formData.domain,
        domain: formData.domain,
        origins: [{ 
          url: formData.originUrl, 
          upstreamHost: formData.originUpstreamHost?.trim() || undefined,
          tlsServername: formData.originTlsServername?.trim() || undefined,
          authHeaderName: formData.originAuthHeaderName?.trim() || undefined,
          authHeaderValue: formData.originAuthHeaderValue?.trim() || undefined,
          websocketEnabled: formData.websocketEnabled !== false,
          websocketIdleTimeoutSec: formData.websocketEnabled !== false
            ? Number.parseInt(formData.websocketIdleTimeoutSec, 10) || 900
            : undefined,
          weight: 100, 
          healthCheck: { path: '/health', interval: 30, timeout: 5 },
          responseBuffering: formData.responseInspectionEnabled !== false,
        }],
        policyId: formData.policyId || null,
        responseInspectionEnabled: formData.responseInspectionEnabled !== false,
        ssl: formData.sslMode === SSL_MODE.CUSTOM
          ? { customCert: true, cert: formData.customCert?.trim() || '', key: formData.customKey?.trim() || '', fullchain: formData.customFullchain?.trim() || null }
          : { autoProvision: formData.autoProvisionSSL !== false, customCert: false },
        routing: { pathPrefix: '/', stripPath: false },
        // Note: firewallIp and activated are automatically assigned by the API
      };

      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData(createDefaultAppFormData());
        setWizardStep(1);
        fetchApps();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create site');
      }
    } catch (error) {
      console.error('Error creating site:', error);
      alert('Failed to create site');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle opening edit modal
  const handleOpenEdit = (app) => {
    const useCustom = !!app.ssl?.customCert;
    setEditFormData({
      ...createDefaultAppFormData(),
      originUrl: app.origins?.[0]?.url || '',
      originUpstreamHost: app.origins?.[0]?.upstreamHost || '',
      originTlsServername: app.origins?.[0]?.tlsServername || '',
      originAuthHeaderName: app.origins?.[0]?.authHeader?.name || '',
      originAuthHeaderValue: '',
      websocketEnabled: app.origins?.[0]?.websocketEnabled !== false,
      websocketIdleTimeoutSec: String(app.origins?.[0]?.websocketIdleTimeoutSec || 900),
      responseInspectionEnabled: app.responseInspectionEnabled !== false,
      policyId: app.policyId || '',
      sslMode: useCustom ? SSL_MODE.CUSTOM : SSL_MODE.AUTO,
      autoProvisionSSL: !useCustom && app.ssl?.autoProvision !== false,
      customCert: '',
      customKey: '',
      customFullchain: '',
    });
    setEditModalTab('general');
    setEditSslUiError('');
    setSelectedAppForEdit(app);
    setOpenSettingsMenu(null);
    setDropdownPosition(null);
  };

  const closeSettingsMenu = () => {
    setOpenSettingsMenu(null);
    setDropdownPosition(null);
  };

  const openSettingsWithPosition = (e, appId) => {
    e.stopPropagation();
    if (openSettingsMenu === appId) {
      closeSettingsMenu();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 192; // w-48
    setDropdownPosition({
      top: rect.bottom + 4,
      left: Math.min(rect.right - menuWidth, typeof window !== 'undefined' ? window.innerWidth - menuWidth - 8 : rect.right - menuWidth),
    });
    setOpenSettingsMenu(appId);
  };

  // Handle delete site
  const handleDeleteSite = async (app) => {
    if (!confirm(`Are you sure you want to delete "${app.domain}"? This action cannot be undone.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/apps/${app.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setApps(apps.filter(a => a.id !== app.id));
        setOpenSettingsMenu(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete site');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      alert('Failed to delete site');
    } finally {
      setDeleting(false);
    }
  };

  // Handle update site
  const handleUpdateSite = async (e) => {
    e.preventDefault();
    if (!editSslValidation.valid) {
      setEditSslUiError(editSslValidation.message);
      return;
    }
    setEditSslUiError('');
    setUpdating(true);

    try {
      const response = await fetch(`/api/apps/${selectedAppForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origins: [{ 
            url: editFormData.originUrl, 
            upstreamHost: editFormData.originUpstreamHost?.trim() || undefined,
            tlsServername: editFormData.originTlsServername?.trim() || undefined,
            authHeaderName: editFormData.originAuthHeaderName?.trim() || undefined,
            authHeaderValue: editFormData.originAuthHeaderValue?.trim() || undefined,
            websocketEnabled: editFormData.websocketEnabled !== false,
            websocketIdleTimeoutSec: editFormData.websocketEnabled !== false
              ? Number.parseInt(editFormData.websocketIdleTimeoutSec, 10) || 900
              : undefined,
            weight: 100, 
            healthCheck: { path: '/health', interval: 30, timeout: 5 },
            responseBuffering: editFormData.responseInspectionEnabled !== false,
          }],
          policyId: editFormData.policyId || null,
          responseInspectionEnabled: editFormData.responseInspectionEnabled !== false,
          ssl: editFormData.sslMode === SSL_MODE.CUSTOM
            ? { customCert: true, cert: editFormData.customCert?.trim() || '', key: editFormData.customKey?.trim() || '', fullchain: editFormData.customFullchain?.trim() || null }
            : { autoProvision: editFormData.autoProvisionSSL, customCert: false },
        }),
      });
      
      if (response.ok) {
        const updatedApp = await response.json();
        setApps((currentApps) =>
          currentApps.map((app) => {
            if (app.id !== updatedApp.id) return app;
            return {
              ...app,
              ...updatedApp,
              statsBlocked: updatedApp.statsBlocked ?? app.statsBlocked,
              statsAllowed: updatedApp.statsAllowed ?? app.statsAllowed,
              blocked: updatedApp.blocked ?? app.blocked,
              allowed: updatedApp.allowed ?? app.allowed,
              lastSeenAt: updatedApp.lastSeenAt ?? app.lastSeenAt,
            };
          })
        );
        setSelectedAppForEdit(null);
        await fetchApps();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update site');
      }
    } catch (error) {
      console.error('Error updating site:', error);
      alert('Failed to update site');
    } finally {
      setUpdating(false);
    }
  };

  // Extract hosting IP from origin URL
  const getHostingDisplay = (app) => {
    if (app.origins && app.origins.length > 0) {
      try {
        const url = new URL(app.origins[0].url);
        return url.hostname;
      } catch {
        return app.origins[0].url;
      }
    }
    return 'Not configured';
  };

  // Only show stats when app has real blocked/allowed data from API (e.g. from logs aggregation)
  const getRealAppStats = (app) => {
    const blocked = app.statsBlocked ?? app.blocked;
    const allowed = app.statsAllowed ?? app.allowed;
    if (typeof blocked !== 'number' || typeof allowed !== 'number') return null;
    return { blocked, allowed };
  };

  // Check if site is activated (DNS pointing to WAF)
  const isActivated = (app) => {
    return app?.activated === true;
  };

  const handleClearCache = async (app) => {
    if (!app?.id) return;

    setClearingCacheAppId(app.id);
    try {
      const response = await fetch(`/api/apps/${app.id}/clear-cache`, {
        method: 'POST',
      });

      if (response.ok) {
        const payload = await response.json();
        setApps((currentApps) =>
          currentApps.map((currentApp) =>
            currentApp.id === app.id
              ? {
                  ...currentApp,
                  cacheClearedAt: payload.cacheClearedAt,
                  cacheClearedBy: payload.cacheClearedBy,
                  cachePurgeVersion: payload.cachePurgeVersion,
                  updatedAt: payload.updatedAt ?? currentApp.updatedAt,
                }
              : currentApp
          )
        );
        alert(`Cache cleared for ${app.domain}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to clear cache');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache');
    } finally {
      setClearingCacheAppId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  // If user doesn't have a tenant, show onboarding
  if (!hasTenant) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Websites</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage and protect your websites with ATRAVAD WAF
              </p>
            </div>
          </div>

          {!showTenantForm ? (
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg">
                  <BuildingIcon className="h-10 w-10 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Create Your Organization First
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Before adding websites, you need to create an organization. This keeps your sites, policies, and settings separate from other users.
              </p>
              <button
                onClick={() => setShowTenantForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 shadow-md hover:shadow-lg transition-all"
              >
                <PlusIcon className="h-5 w-5" />
                Create Organization
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg">
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
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    autoFocus
                  />
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-teal-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-teal-800">
                      <p className="font-medium mb-1">Multi-tenant Isolation</p>
                      <p className="text-teal-700">
                        All your websites, security policies, and logs will be isolated within this organization. You&apos;ll become the administrator.
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
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all"
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Websites ({filteredApps.length}/{apps.length})</h1>
            <p className="mt-1 text-xs text-gray-500">Organization: <span className="font-medium text-gray-700">{tenantName}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddSite}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Site
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search for a website..."
              className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">
              <SearchIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <GridIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <ListIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sites Grid/List */}
        {filteredApps.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
            <GlobeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              {searchQuery ? 'No sites found' : 'No websites yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery ? 'Try a different search term' : 'Get started by adding your first website.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddSite}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600"
              >
                <PlusIcon className="h-4 w-4" />
                Add Site
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => {
              const stats = getRealAppStats(app);
              const activated = isActivated(app);
              const hostingIp = getHostingDisplay(app);
              const hasRealStats = activated && stats !== null;
              const sslMeta = getSslStatusMeta(app.ssl);
              const maxTraffic = hasRealStats ? Math.max(stats.blocked, stats.allowed, 1) : 1;
              
              return (
                <div
                  key={app.id}
                  className={`overflow-hidden rounded-[22px] border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_24px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_10px_30px_rgba(15,23,42,0.12)] ${
                    activated ? 'border-slate-200/90' : 'border-red-200'
                  }`}
                >
                  <div className="px-6 pb-0 pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <a
                        href={`https://${app.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[calc(100%-3rem)] break-all text-[1.7rem] font-semibold leading-tight text-cyan-700 underline decoration-cyan-300/70 underline-offset-3 hover:text-cyan-800"
                      >
                        {app.domain}
                      </a>
                      <div className="relative">
                        <button 
                          onClick={(e) => openSettingsWithPosition(e, app.id)}
                          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Site settings"
                        >
                          <SettingsIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-5 space-y-3 text-[15px] leading-6">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-slate-500">Hosting IP:</span>
                        <span className="font-mono text-slate-800">{hostingIp}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-slate-500">Firewall IP:</span>
                        <span className="font-mono text-slate-800">{app.firewallIp || 'Not assigned'}</span>
                        {app.wafRegion && (
                          <span className="ml-1 rounded-md bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-blue-700 uppercase">
                            {app.wafRegion.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-slate-500">SSL:</span>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide ${sslMeta.tone}`}>
                          {sslMeta.label}
                        </span>
                      </div>
                    </div>

                    {activated && (
                      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-[15px] text-slate-600">
                        <Link href="/logs" className="hover:text-cyan-700">Reports</Link>
                        <span className="text-slate-300">|</span>
                        <Link href="/logs" className="hover:text-cyan-700">Audit Trails</Link>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => handleClearCache(app)}
                          disabled={clearingCacheAppId === app.id}
                          className="hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          {clearingCacheAppId === app.id ? 'Clearing...' : 'Clear Cache'}
                        </button>
                        <span className="text-slate-300">|</span>
                        <Link href="/policies" className="hover:text-cyan-700">IP Access Control</Link>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 border-t border-slate-200/80 bg-slate-50/35 px-6 py-5">
                    {activated ? (
                      hasRealStats ? (
                        <div className="flex items-end justify-between gap-5">
                          <div className="flex items-end gap-5">
                            <div className="flex h-16 items-end gap-2">
                              <div 
                                className="w-5 rounded-t-sm bg-red-200"
                                style={{ height: `${getTrafficBarHeight(stats.blocked, maxTraffic)}px` }}
                              />
                              <div 
                                className="w-7 rounded-t-sm bg-emerald-200"
                                style={{ height: `${getTrafficBarHeight(stats.allowed, maxTraffic)}px` }}
                              />
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-end gap-6">
                                <div className="text-center">
                                  <div className="text-[1.9rem] font-semibold leading-none text-red-500">{stats.blocked.toLocaleString()}</div>
                                  <div className="mt-1 text-[13px] text-slate-700">Blocked</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[1.9rem] font-semibold leading-none text-emerald-500">{stats.allowed.toLocaleString()}</div>
                                  <div className="mt-1 text-[13px] text-slate-700">Allowed</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 shadow-[0_6px_14px_rgba(34,197,94,0.25)]">
                            <CheckCircleIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">No traffic data yet</span>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 shadow-[0_6px_14px_rgba(34,197,94,0.25)]">
                            <CheckCircleIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-600">
                          <WarningIcon className="h-5 w-5" />
                          <span className="font-medium">Not Activated!</span>
                        </div>
                        <button 
                          onClick={() => setSelectedAppForSetup(app)}
                          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                        >
                          Continue Setup
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hosting IP</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Firewall IP</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SSL</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stats</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApps.map((app) => {
                  const stats = getRealAppStats(app);
                  const activated = isActivated(app);
                  const hostingIp = getHostingDisplay(app);
                  const hasRealStats = activated && stats !== null;
                  const sslMeta = getSslStatusMeta(app.ssl);
                  
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <a
                          href={`https://${app.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:text-teal-700 font-medium hover:underline"
                        >
                          {app.domain}
                        </a>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-700">{hostingIp}</td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-700">{app.firewallIp || 'Not assigned'}</td>
                      <td className="px-6 py-4">
                        {app.wafRegionName ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            {app.wafRegionName}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${sslMeta.tone}`}>
                          {sslMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {activated ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircleIcon className="h-4 w-4" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <WarningIcon className="h-4 w-4" />
                            Not Activated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {hasRealStats ? (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-red-500">{stats.blocked} blocked</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-teal-500">{stats.allowed} allowed</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => openSettingsWithPosition(e, app.id)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          aria-label="Site settings"
                        >
                          <SettingsIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings dropdown portal - renders outside table/card so it is not clipped */}
      {typeof document !== 'undefined' &&
        document.body &&
        openSettingsMenu &&
        dropdownPosition &&
        (() => {
          const app = filteredApps.find((a) => a.id === openSettingsMenu);
          if (!app) return null;
          return createPortal(
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={closeSettingsMenu}
                aria-hidden="true"
              />
              <div
                className="fixed z-50 w-48 min-w-[12rem] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
                style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                role="menu"
              >
                <button
                  onClick={() => handleOpenEdit(app)}
                  className="flex w-full gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  role="menuitem"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Site
                </button>
                <button
                  onClick={() => {
                    setSelectedAppForSetup(app);
                    closeSettingsMenu();
                  }}
                  className="flex w-full gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  role="menuitem"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  DNS Setup
                </button>
                <a
                  href="/logs"
                  className="flex w-full gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  role="menuitem"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Logs
                </a>
                <hr className="my-1 border-gray-200" />
                <button
                  onClick={() => {
                    handleDeleteSite(app);
                    closeSettingsMenu();
                  }}
                  disabled={deleting}
                  className="flex w-full gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  role="menuitem"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleting ? 'Deleting...' : 'Delete Site'}
                </button>
              </div>
            </>,
            document.body
          );
        })()}

      {/* Add Site Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => !connecting && setShowModal(false)}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-lg">
                    <GlobeIcon className="h-6 w-6 text-teal-600" />
                  </div>
                  <span className="text-lg font-semibold text-gray-900">ATRAVAD Setup</span>
                </div>
                <button
                  onClick={() => !connecting && setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 min-h-0">
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">What&apos;s your domain name?</h2>
                    <input
                      type="text"
                      placeholder="Enter your domain"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      autoFocus
                    />
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Where is your origin server?</h2>
                    <p className="text-gray-600">
                      Enter the URL of your actual web server. Traffic will be forwarded here after WAF inspection.
                    </p>
                    <input
                      type="url"
                      placeholder="https://origin.example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg"
                      value={formData.originUrl}
                      onChange={(e) => setFormData({ ...formData, originUrl: e.target.value })}
                      autoFocus
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upstream Host Header
                        </label>
                        <input
                          type="text"
                          placeholder="Optional: app.internal.example or your public domain"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={formData.originUpstreamHost}
                          onChange={(e) => setFormData({ ...formData, originUpstreamHost: e.target.value })}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Leave empty to forward the visitor&apos;s original host header. Set this when the origin expects a different host.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Origin TLS Server Name
                        </label>
                        <input
                          type="text"
                          placeholder="Optional: origin.example.com"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={formData.originTlsServername}
                          onChange={(e) => setFormData({ ...formData, originTlsServername: e.target.value })}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Use this when your origin URL is an IP or provider hostname, but the HTTPS certificate expects a different name. Example: connect to `https://1.2.3.4` using `app.example.com` for TLS.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Origin Auth Header Name
                        </label>
                        <input
                          type="text"
                          placeholder="Optional: X-ATRAVAD-Origin-Auth"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={formData.originAuthHeaderName}
                          onChange={(e) => setFormData({ ...formData, originAuthHeaderName: e.target.value })}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          The header name ATRAVAD will send to your origin, such as `X-ATRAVAD-Origin-Auth`.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Origin Auth Header Value
                        </label>
                        <input
                          type="password"
                          placeholder="Optional shared secret"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={formData.originAuthHeaderValue}
                          onChange={(e) => setFormData({ ...formData, originAuthHeaderValue: e.target.value })}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          The shared secret value your origin verifies. Use this to block direct bypass traffic that does not come through ATRAVAD.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-amber-900">Allow WebSockets through ATRAVAD</p>
                          <p className="mt-1 text-xs text-amber-800">
                            ATRAVAD inspects the WebSocket handshake, then tunnels frames. Post-upgrade frames are not inspected individually.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.websocketEnabled !== false}
                          onChange={(e) => setFormData({ ...formData, websocketEnabled: e.target.checked })}
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                        />
                      </div>
                      {formData.websocketEnabled !== false && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-amber-900 mb-2">
                            WebSocket Idle Timeout (seconds)
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="86400"
                            className="w-full md:w-60 px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                            value={formData.websocketIdleTimeoutSec}
                            onChange={(e) => setFormData({ ...formData, websocketIdleTimeoutSec: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                    <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <span className="pr-4 text-sm text-gray-700">
                        Inspect and buffer origin responses
                        <span className="block text-xs text-gray-500">
                          Disable this for SSE, AI streaming, or serverless responses that must stay streamed.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={formData.responseInspectionEnabled !== false}
                        onChange={(e) => setFormData({ ...formData, responseInspectionEnabled: e.target.checked })}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                      />
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Security Policy (Optional)
                      </label>
                        <select
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={formData.policyId}
                          onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                        >
                          <option value="">Default Protection (OWASP CRS)</option>
                          {policyOptions.map((policy) => (
                            <option key={policy.id} value={policy.id}>
                              {policy.label}
                            </option>
                          ))}
                        </select>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">SSL Certificate</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${formData.sslMode === SSL_MODE.AUTO ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300'}`}>
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="create-ssl-mode"
                              checked={formData.sslMode === SSL_MODE.AUTO}
                              onChange={() => {
                                setCreateSslUiError('');
                                setFormData({ ...formData, sslMode: SSL_MODE.AUTO, autoProvisionSSL: true });
                              }}
                              className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Managed SSL (Recommended)</p>
                              <p className="text-xs text-gray-600 mt-1">Let&apos;s Encrypt certificate issued and renewed automatically.</p>
                            </div>
                          </div>
                        </label>
                        <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${formData.sslMode === SSL_MODE.CUSTOM ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300'}`}>
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="create-ssl-mode"
                              checked={formData.sslMode === SSL_MODE.CUSTOM}
                              onChange={() => {
                                setCreateSslUiError('');
                                setFormData({ ...formData, sslMode: SSL_MODE.CUSTOM });
                              }}
                              className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Custom SSL</p>
                              <p className="text-xs text-gray-600 mt-1">Paste PEM or import certificate/key files.</p>
                            </div>
                          </div>
                        </label>
                      </div>

                      {formData.sslMode === SSL_MODE.AUTO && (
                        <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                          <span className="text-sm text-gray-700">Automatically provision and renew SSL certificate</span>
                          <input
                            type="checkbox"
                            checked={formData.autoProvisionSSL !== false}
                            onChange={(e) => setFormData({ ...formData, autoProvisionSSL: e.target.checked })}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                          />
                        </label>
                      )}

                      {formData.sslMode === SSL_MODE.CUSTOM && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-teal-200">
                          <div className="flex flex-wrap gap-2">
                            <label className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer">
                              Import Certificate File
                              <input
                                type="file"
                                accept=".pem,.crt,.cer,text/plain"
                                className="hidden"
                                onChange={(e) => importPemFile(e.target.files?.[0], 'customCert', setFormData, setCreateSslUiError)}
                              />
                            </label>
                            <label className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer">
                              Import Private Key File
                              <input
                                type="file"
                                accept=".pem,.key,text/plain"
                                className="hidden"
                                onChange={(e) => importPemFile(e.target.files?.[0], 'customKey', setFormData, setCreateSslUiError)}
                              />
                            </label>
                            <label className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer">
                              Import Full Chain File
                              <input
                                type="file"
                                accept=".pem,.crt,.cer,text/plain"
                                className="hidden"
                                onChange={(e) => importPemFile(e.target.files?.[0], 'customFullchain', setFormData, setCreateSslUiError)}
                              />
                            </label>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Certificate (PEM)</label>
                            <textarea
                              placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                              value={formData.customCert}
                              onChange={(e) => {
                                setCreateSslUiError('');
                                setFormData({ ...formData, customCert: e.target.value });
                              }}
                              rows={4}
                              className="w-full min-h-[6rem] resize-y px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Private key (PEM)</label>
                            <textarea
                              placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                              value={formData.customKey}
                              onChange={(e) => {
                                setCreateSslUiError('');
                                setFormData({ ...formData, customKey: e.target.value });
                              }}
                              rows={4}
                              className="w-full min-h-[6rem] resize-y px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">CA chain / full chain (optional)</label>
                            <textarea
                              placeholder="-----BEGIN CERTIFICATE-----\n... (intermediate + root)\n-----END CERTIFICATE-----"
                              value={formData.customFullchain}
                              onChange={(e) => {
                                setCreateSslUiError('');
                                setFormData({ ...formData, customFullchain: e.target.value });
                              }}
                              rows={2}
                              className="w-full min-h-[4rem] resize-y px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                          </div>
                          {(createSslUiError || formData.customCert || formData.customKey || formData.customFullchain) && (
                            <p className={`text-xs ${createSslValidation.valid ? 'text-emerald-700' : 'text-red-600'}`}>
                              {createSslUiError || createSslValidation.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="py-12 text-center">
                    <div className="relative mx-auto w-20 h-20">
                      <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
                      <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin" />
                    </div>
                    <p className="mt-6 text-lg text-gray-700">Connecting your domain...</p>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                      <h2 className="mt-4 text-2xl font-bold text-gray-900">Almost done!</h2>
                      <p className="mt-2 text-gray-600">
                        Point your domain&apos;s DNS to activate protection.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Domain:</span>
                        <span className="font-mono font-medium">{formData.domain}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Origin:</span>
                        <span className="font-mono text-sm">{formData.originUrl}</span>
                      </div>
                      {formData.originUpstreamHost && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Upstream Host:</span>
                          <span className="font-mono text-sm">{formData.originUpstreamHost}</span>
                        </div>
                      )}
                      {formData.originTlsServername && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Origin TLS SNI:</span>
                          <span className="font-mono text-sm">{formData.originTlsServername}</span>
                        </div>
                      )}
                      {formData.originAuthHeaderName && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Origin Auth:</span>
                          <span className="font-mono text-sm">{formData.originAuthHeaderName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">WebSockets:</span>
                        <span className="text-sm font-medium">
                          {formData.websocketEnabled !== false
                            ? `Handshake-only protection, ${formData.websocketIdleTimeoutSec || '900'}s timeout`
                            : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">SSL:</span>
                        <span className="text-sm font-medium">{formData.sslMode === SSL_MODE.CUSTOM ? 'Custom certificate' : 'Let\'s Encrypt (auto)'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Response Inspection:</span>
                        <span className="text-sm font-medium">{formData.responseInspectionEnabled !== false ? 'Enabled' : 'Streaming-safe mode'}</span>
                      </div>
                      <hr className="border-gray-200" />
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                        <p className="text-sm text-blue-800">
                          <strong>Next Step:</strong> After adding your site, you&apos;ll receive a Firewall IP address based on your origin server&apos;s location. Update your DNS to point to this IP.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="px-6 shrink-0">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${(wizardStep / 4) * 100}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                {wizardStep > 1 && wizardStep !== 3 && (
                  <button
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-6 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-100"
                  >
                    Back
                  </button>
                )}
                {wizardStep !== 3 && (
                  <button
                    onClick={handleWizardNext}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Creating...
                      </span>
                    ) : wizardStep === 4 ? (
                      'Add Site'
                    ) : (
                      'Continue'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Site Modal */}
      {selectedAppForEdit && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setSelectedAppForEdit(null)}
            />
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-lg">
                    <SettingsIcon className="h-6 w-6 text-teal-600" />
                  </div>
                  <span className="text-lg font-semibold text-gray-900">Edit Site</span>
                </div>
                <button
                  onClick={() => setSelectedAppForEdit(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs: General | SSL Certificate (Sucuri-style separation) */}
              <div className="flex border-b border-gray-200 px-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditModalTab('general')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${editModalTab === 'general' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalTab('ssl')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${editModalTab === 'ssl' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  SSL Certificate
                </button>
              </div>

              <form onSubmit={handleUpdateSite} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
                {/* General tab - keep in DOM so form submit includes all fields */}
                <div className={editModalTab !== 'general' ? 'hidden' : 'space-y-5'}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  <input
                    type="text"
                    disabled
                    value={selectedAppForEdit.domain}
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Domain cannot be changed after creation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin Server URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://origin.example.com"
                    value={editFormData.originUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, originUrl: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upstream Host Header</label>
                    <input
                      type="text"
                      placeholder="Optional override"
                      value={editFormData.originUpstreamHost}
                      onChange={(e) => setEditFormData({ ...editFormData, originUpstreamHost: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave empty to pass the visitor&apos;s original host header to the origin.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origin TLS Server Name</label>
                    <input
                      type="text"
                      placeholder="Optional SNI override"
                      value={editFormData.originTlsServername}
                      onChange={(e) => setEditFormData({ ...editFormData, originTlsServername: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Set this when the origin URL is an IP or provider host, but HTTPS upstream must present a different certificate name.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origin Auth Header Name</label>
                    <input
                      type="text"
                      placeholder="Optional shared-secret header"
                      value={editFormData.originAuthHeaderName}
                      onChange={(e) => setEditFormData({ ...editFormData, originAuthHeaderName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Header name ATRAVAD sends to the origin, for example `X-ATRAVAD-Origin-Auth`.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origin Auth Header Value</label>
                    <input
                      type="password"
                      placeholder="Optional shared secret"
                      value={editFormData.originAuthHeaderValue}
                      onChange={(e) => setEditFormData({ ...editFormData, originAuthHeaderValue: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {selectedAppForEdit?.origins?.[0]?.authHeaderConfigured
                        ? 'Leave blank to keep the existing secret, or enter a new value to rotate it.'
                        : 'Shared secret the origin checks before serving traffic. Requests that bypass ATRAVAD should not have this value.'}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-amber-900">Allow WebSockets through ATRAVAD</p>
                      <p className="mt-1 text-xs text-amber-800">
                        The handshake is inspected by the WAF. After the upgrade, frames pass through as a tunnel.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={editFormData.websocketEnabled !== false}
                      onChange={(e) => setEditFormData({ ...editFormData, websocketEnabled: e.target.checked })}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                    />
                  </div>
                  {editFormData.websocketEnabled !== false && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-amber-900 mb-2">WebSocket Idle Timeout (seconds)</label>
                      <input
                        type="number"
                        min="10"
                        max="86400"
                        value={editFormData.websocketIdleTimeoutSec}
                        onChange={(e) => setEditFormData({ ...editFormData, websocketIdleTimeoutSec: e.target.value })}
                        className="w-full md:w-60 px-4 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      />
                    </div>
                  )}
                </div>

                <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="pr-4 text-sm text-gray-700">
                    Inspect and buffer origin responses
                    <span className="block text-xs text-gray-500">
                      Disable this for streaming SSR, SSE, AI responses, and similar serverless output.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={editFormData.responseInspectionEnabled !== false}
                    onChange={(e) => setEditFormData({ ...editFormData, responseInspectionEnabled: e.target.checked })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                  />
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Security Policy</label>
                    <select
                      value={editFormData.policyId}
                      onChange={(e) => setEditFormData({ ...editFormData, policyId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">Default Protection (OWASP CRS)</option>
                      {policyOptions.map((policy) => (
                        <option key={policy.id} value={policy.id}>
                          {policy.label}
                        </option>
                      ))}
                    </select>
                </div>
                </div>

                {/* SSL Certificate tab - Sucuri-style separation */}
                <div className={editModalTab !== 'ssl' ? 'hidden' : undefined}>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Choose how SSL/TLS is provided for this site.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${editFormData.sslMode === SSL_MODE.AUTO ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300'}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="edit-ssl-mode"
                          checked={editFormData.sslMode === SSL_MODE.AUTO}
                          onChange={() => {
                            setEditSslUiError('');
                            setEditFormData({ ...editFormData, sslMode: SSL_MODE.AUTO, autoProvisionSSL: true });
                          }}
                          className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Managed SSL</p>
                          <p className="text-xs text-gray-600 mt-1">Use Let&apos;s Encrypt with automatic renewals.</p>
                        </div>
                      </div>
                    </label>
                    <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${editFormData.sslMode === SSL_MODE.CUSTOM ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300'}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="edit-ssl-mode"
                          checked={editFormData.sslMode === SSL_MODE.CUSTOM}
                          onChange={() => {
                            setEditSslUiError('');
                            setEditFormData({ ...editFormData, sslMode: SSL_MODE.CUSTOM });
                          }}
                          className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Custom SSL</p>
                          <p className="text-xs text-gray-600 mt-1">Upload or paste your own PEM certificate set.</p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {editFormData.sslMode === SSL_MODE.AUTO && (
                    <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-700">Automatically provision and renew SSL certificate</span>
                      <input
                        type="checkbox"
                        checked={editFormData.autoProvisionSSL !== false}
                        onChange={(e) => setEditFormData({ ...editFormData, autoProvisionSSL: e.target.checked })}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                      />
                    </label>
                  )}

                  {editFormData.sslMode === SSL_MODE.CUSTOM && (
                    <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        <label className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer">
                          Import Certificate File
                          <input
                            type="file"
                            accept=".pem,.crt,.cer,text/plain"
                            className="hidden"
                            onChange={(e) => importPemFile(e.target.files?.[0], 'customCert', setEditFormData, setEditSslUiError)}
                          />
                        </label>
                        <label className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer">
                          Import Private Key File
                          <input
                            type="file"
                            accept=".pem,.key,text/plain"
                            className="hidden"
                            onChange={(e) => importPemFile(e.target.files?.[0], 'customKey', setEditFormData, setEditSslUiError)}
                          />
                        </label>
                        <label className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer">
                          Import Full Chain File
                          <input
                            type="file"
                            accept=".pem,.crt,.cer,text/plain"
                            className="hidden"
                            onChange={(e) => importPemFile(e.target.files?.[0], 'customFullchain', setEditFormData, setEditSslUiError)}
                          />
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Certificate (PEM)</label>
                        <textarea
                          placeholder={selectedAppForEdit?.ssl?.hasStoredCustomCert ? 'Leave blank to keep the existing certificate, or paste a replacement.' : '-----BEGIN CERTIFICATE-----...'}
                          value={editFormData.customCert}
                          onChange={(e) => {
                            setEditSslUiError('');
                            setEditFormData({ ...editFormData, customCert: e.target.value });
                          }}
                          rows={4}
                          className="w-full min-h-[6rem] resize-y px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Private key (PEM)</label>
                        <textarea
                          placeholder={selectedAppForEdit?.ssl?.hasStoredCustomCert ? 'Leave blank to keep the existing private key, or paste a replacement.' : '-----BEGIN PRIVATE KEY-----...'}
                          value={editFormData.customKey}
                          onChange={(e) => {
                            setEditSslUiError('');
                            setEditFormData({ ...editFormData, customKey: e.target.value });
                          }}
                          rows={4}
                          className="w-full min-h-[6rem] resize-y px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CA chain / full chain (optional)</label>
                        <textarea
                          placeholder={selectedAppForEdit?.ssl?.hasStoredCustomCert ? 'Leave blank to keep the existing chain, or paste a replacement.' : 'Optional intermediate + root certificates'}
                          value={editFormData.customFullchain}
                          onChange={(e) => {
                            setEditSslUiError('');
                            setEditFormData({ ...editFormData, customFullchain: e.target.value });
                          }}
                          rows={2}
                          className="w-full min-h-[4rem] resize-y px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      {(editSslUiError || editFormData.customCert || editFormData.customKey || editFormData.customFullchain) && (
                        <p className={`text-xs ${editSslValidation.valid ? 'text-emerald-700' : 'text-red-600'}`}>
                          {editSslUiError || editSslValidation.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 pt-4 border-t border-gray-200 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setSelectedAppForEdit(null)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Continue Setup Modal - DNS Instructions */}
      {selectedAppForSetup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setSelectedAppForSetup(null)}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-lg">
                    <GlobeIcon className="h-6 w-6 text-teal-600" />
                  </div>
                  <span className="text-lg font-semibold text-gray-900">Complete Setup</span>
                </div>
                <button
                  onClick={() => setSelectedAppForSetup(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                {(() => {
                  const setupActivated = isActivated(selectedAppForSetup);
                  return (
                    <>
                <div className="text-center">
                  {setupActivated ? (
                    <CheckCircleIcon className="mx-auto h-12 w-12 text-emerald-500" />
                  ) : (
                    <WarningIcon className="mx-auto h-12 w-12 text-yellow-500" />
                  )}
                  <h2 className="mt-4 text-xl font-bold text-gray-900">
                    {setupActivated ? 'DNS Configured' : 'DNS Not Configured'}
                  </h2>
                  <p className="mt-2 text-gray-600">
                    {setupActivated ? (
                      <>Your domain is pointing to ATRAVAD WAF and protection is active for <strong>{selectedAppForSetup.domain}</strong></>
                    ) : (
                      <>Point your domain&apos;s DNS to activate WAF protection for <strong>{selectedAppForSetup.domain}</strong></>
                    )}
                  </p>
                </div>

                {/* DNS Instructions */}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">DNS Configuration</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-medium">Domain</span>
                        <p className="font-mono text-sm font-medium text-gray-900">{selectedAppForSetup.domain}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-medium">Origin Server</span>
                        <p className="font-mono text-sm text-gray-700">{getHostingDisplay(selectedAppForSetup)}</p>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between rounded-lg border-2 p-3 ${
                      setupActivated ? 'border-emerald-200 bg-emerald-50' : 'border-teal-200 bg-teal-50'
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs uppercase font-medium ${
                            setupActivated ? 'text-emerald-700' : 'text-teal-700'
                          }`}>
                            {setupActivated ? 'Active A Record' : 'Point A Record To'}
                          </span>
                          {selectedAppForSetup.wafRegionName && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              {selectedAppForSetup.wafRegionName}
                            </span>
                          )}
                        </div>
                        <p className={`font-mono text-lg font-bold ${
                          setupActivated ? 'text-emerald-700' : 'text-teal-700'
                        }`}>
                          {selectedAppForSetup.firewallIp || 'Not configured'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedAppForSetup.firewallIp || '');
                          alert('IP copied to clipboard!');
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          setupActivated
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                        }`}
                      >
                        Copy
                      </button>
                    </div>

                    {selectedAppForSetup.firewallCname && (
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <span className="text-xs text-gray-500 uppercase font-medium">Or CNAME To</span>
                          <p className="font-mono text-sm text-gray-700">{selectedAppForSetup.firewallCname}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedAppForSetup.firewallCname);
                            alert('CNAME copied to clipboard!');
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className={`rounded-lg border p-4 ${
                  setupActivated ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'
                }`}>
                  <h4 className={`mb-2 font-medium ${
                    setupActivated ? 'text-emerald-900' : 'text-blue-900'
                  }`}>
                    {setupActivated ? 'DNS Status' : 'How to update your DNS:'}
                  </h4>
                  <ol className={`list-decimal list-inside space-y-1 text-sm ${
                    setupActivated ? 'text-emerald-800' : 'text-blue-800'
                  }`}>
                    <li>Log into your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.)</li>
                    <li>Find DNS settings for <strong>{selectedAppForSetup.domain}</strong></li>
                    <li>
                      {setupActivated
                        ? <>Your A record is already resolving to <strong>{selectedAppForSetup.firewallIp || 'your WAF IP'}</strong></>
                        : <>Update the A record to point to <strong>{selectedAppForSetup.firewallIp || 'your WAF IP'}</strong></>}
                    </li>
                    <li>
                      {setupActivated
                        ? 'Protection is active. You can still verify propagation from multiple global resolvers if needed.'
                        : 'Save changes and wait for DNS propagation (up to 48 hours)'}
                    </li>
                  </ol>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  {setupActivated
                    ? 'ATRAVAD WAF is active for this site. Global DNS propagation may still vary briefly across some resolvers.'
                    : 'Once DNS propagates, your site will be protected by ATRAVAD WAF. The status will update automatically.'}
                </p>
                    </>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => setSelectedAppForSetup(null)}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <a
                  href="https://www.whatsmydns.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600"
                >
                  Verify DNS Propagation
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
