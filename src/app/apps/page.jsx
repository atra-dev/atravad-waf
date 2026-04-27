'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { isValidPemCertificate, isValidPemPrivateKey } from '@/lib/ssl-utils';
import { formatAnalyticsDisplayWindow } from '@/lib/analytics-window';

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

const DEFAULT_VERCEL_ORIGIN_AUTH_HEADER = 'X-ATRAVAD-Origin-Auth';

const getOriginHostname = (originUrl) => {
  if (typeof originUrl !== 'string' || !originUrl.trim()) return '';
  try {
    return new URL(originUrl.trim()).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isVercelOriginUrl = (originUrl) => getOriginHostname(originUrl).endsWith('.vercel.app');

const applyRecommendedOriginDefaults = (data) => {
  const hostname = getOriginHostname(data.originUrl);
  if (!hostname || !hostname.endsWith('.vercel.app')) {
    return data;
  }

  return {
    ...data,
    originUpstreamHost: data.originUpstreamHost?.trim() || hostname,
    originTlsServername: data.originTlsServername?.trim() || hostname,
    originAuthHeaderName:
      data.originAuthHeaderValue?.trim()
        ? data.originAuthHeaderName?.trim() || DEFAULT_VERCEL_ORIGIN_AUTH_HEADER
        : data.originAuthHeaderName,
  };
};

const validateOriginSecurityInput = (data) => {
  const hasAuthHeaderName = Boolean(data.originAuthHeaderName?.trim());
  const hasAuthHeaderValue = Boolean(data.originAuthHeaderValue?.trim());
  if (hasAuthHeaderName !== hasAuthHeaderValue) {
    return {
      valid: false,
      message: 'Origin auth header requires both a header name and a value.',
    };
  }

  return { valid: true, message: '' };
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

const inputClassName =
  'theme-input w-full rounded-xl px-4 py-3 shadow-sm transition';

const mutedPanelClassName =
  'theme-inset-surface rounded-xl p-4';

const modalShellClassName =
  'theme-modal theme-text-primary relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] transition-all';

const modalHeaderClassName =
  'flex shrink-0 items-center justify-between border-b border-[var(--border-soft)] px-6 py-4';

const modalCloseButtonClassName =
  'theme-button-neutral rounded-xl p-2 transition';

const modalTabBaseClassName =
  '-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors';

const modalTabInactiveClassName =
  'border-transparent theme-text-muted hover:border-[var(--border-soft)] hover:text-[var(--text-primary)]';

const modalSectionLabelClassName =
  'mb-1 block text-sm font-medium theme-text-secondary';

const modalHelpTextClassName =
  'mt-1 text-xs theme-text-muted';

const modalTitleClassName =
  'text-2xl font-bold theme-text-primary';

const modalBodyTextClassName =
  'theme-text-secondary';

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

  const fetchPolicies = useCallback(async () => {
    try {
      const response = await fetch('/api/policies');
      const data = await response.json();
      if (Array.isArray(data)) {
        setPolicies(data);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  }, []);

  const fetchApps = useCallback(async () => {
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
  }, []);

  const checkTenantAndFetchData = useCallback(async () => {
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
  }, [fetchApps, fetchPolicies]);

  useEffect(() => {
    checkTenantAndFetchData();
  }, [checkTenantAndFetchData]);

  const getTrafficBarHeight = (value, maxValue) => {
    if (!maxValue || value <= 0) return 10;
    return Math.max(10, Math.min(56, Math.round((value / maxValue) * 56)));
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
    [formData]
  );
  const editSslValidation = useMemo(
    () => validateSslInput(editFormData),
    [editFormData]
  );
  const createOriginSecurityValidation = useMemo(
    () => validateOriginSecurityInput(formData),
    [formData]
  );
  const editOriginSecurityValidation = useMemo(
    () => validateOriginSecurityInput(editFormData),
    [editFormData]
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
      if (!createOriginSecurityValidation.valid) {
        alert(createOriginSecurityValidation.message);
        return;
      }
      setFormData((current) => applyRecommendedOriginDefaults(current));
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
    if (!createOriginSecurityValidation.valid) {
      alert(createOriginSecurityValidation.message);
      return;
    }
    setCreateSslUiError('');
    const preparedFormData = applyRecommendedOriginDefaults(formData);
    setFormData(preparedFormData);
    setSubmitting(true);

    try {
      const apiData = {
        name: preparedFormData.name || preparedFormData.domain,
        domain: preparedFormData.domain,
        origins: [{ 
          url: preparedFormData.originUrl, 
          upstreamHost: preparedFormData.originUpstreamHost?.trim() || undefined,
          tlsServername: preparedFormData.originTlsServername?.trim() || undefined,
          authHeaderName: preparedFormData.originAuthHeaderName?.trim() || undefined,
          authHeaderValue: preparedFormData.originAuthHeaderValue?.trim() || undefined,
          websocketEnabled: preparedFormData.websocketEnabled !== false,
          websocketIdleTimeoutSec: preparedFormData.websocketEnabled !== false
            ? Number.parseInt(preparedFormData.websocketIdleTimeoutSec, 10) || 900
            : undefined,
          weight: 100, 
          healthCheck: { path: '/health', interval: 30, timeout: 5 },
          responseBuffering: preparedFormData.responseInspectionEnabled !== false,
        }],
        policyId: preparedFormData.policyId || null,
        responseInspectionEnabled: preparedFormData.responseInspectionEnabled !== false,
        ssl: preparedFormData.sslMode === SSL_MODE.CUSTOM
          ? { customCert: true, cert: preparedFormData.customCert?.trim() || '', key: preparedFormData.customKey?.trim() || '', fullchain: preparedFormData.customFullchain?.trim() || null }
          : { autoProvision: preparedFormData.autoProvisionSSL !== false, customCert: false },
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
    if (!editOriginSecurityValidation.valid) {
      alert(editOriginSecurityValidation.message);
      return;
    }
    setEditSslUiError('');
    const preparedEditFormData = applyRecommendedOriginDefaults(editFormData);
    setEditFormData(preparedEditFormData);
    setUpdating(true);

    try {
      const response = await fetch(`/api/apps/${selectedAppForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origins: [{ 
            url: preparedEditFormData.originUrl, 
            upstreamHost: preparedEditFormData.originUpstreamHost?.trim() || undefined,
            tlsServername: preparedEditFormData.originTlsServername?.trim() || undefined,
            authHeaderName: preparedEditFormData.originAuthHeaderName?.trim() || undefined,
            authHeaderValue: preparedEditFormData.originAuthHeaderValue?.trim() || undefined,
            websocketEnabled: preparedEditFormData.websocketEnabled !== false,
            websocketIdleTimeoutSec: preparedEditFormData.websocketEnabled !== false
              ? Number.parseInt(preparedEditFormData.websocketIdleTimeoutSec, 10) || 900
              : undefined,
            weight: 100, 
            healthCheck: { path: '/health', interval: 30, timeout: 5 },
            responseBuffering: preparedEditFormData.responseInspectionEnabled !== false,
          }],
          policyId: preparedEditFormData.policyId || null,
          responseInspectionEnabled: preparedEditFormData.responseInspectionEnabled !== false,
          ssl: preparedEditFormData.sslMode === SSL_MODE.CUSTOM
            ? { customCert: true, cert: preparedEditFormData.customCert?.trim() || '', key: preparedEditFormData.customKey?.trim() || '', fullchain: preparedEditFormData.customFullchain?.trim() || null }
            : { autoProvision: preparedEditFormData.autoProvisionSSL, customCert: false },
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

  // If user doesn't have a tenant, show managed onboarding notice
  if (!loading && !hasTenant) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100">Websites</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Manage and protect your websites with ATRAVA Defense
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 p-8 shadow-sm dark:border-amber-900/60 dark:from-amber-950/50 dark:to-orange-950/35 dark:shadow-none">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 shadow-sm dark:bg-amber-900/50 dark:shadow-none">
                <BuildingIcon className="h-8 w-8 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-slate-950 dark:text-slate-100">Tenant assignment required</h2>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                  Website onboarding is handled by the ATRAVA Defense super admin team. Your account must be assigned to a managed tenant before you can add or manage protected sites.
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  Contact the ATRAVA Defense operations team to provision your organization, create user access, and complete managed onboarding.
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
        {loading ? (
          <AppLoadingState
            variant="panel"
            title="Loading protected sites"
            message="Syncing your websites, origin configuration, certificates, and policy assignments."
          />
        ) : (
          <>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
              <h1 className="text-2xl font-bold theme-text-primary">All Websites ({filteredApps.length}/{apps.length})</h1>
            <p className="mt-1 text-xs theme-text-muted">Organization: <span className="font-medium theme-text-secondary">{tenantName}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddSite}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 font-medium text-white shadow-[0_10px_25px_rgba(20,184,166,0.24)] transition hover:bg-teal-400 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              <PlusIcon className="h-4 w-4" />
              Add Site
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search for a website..."
              className="theme-input w-full rounded-xl py-3 pl-4 pr-12 shadow-sm transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-teal-500 p-2 text-white transition hover:bg-teal-400">
              <SearchIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="theme-soft-surface flex items-center overflow-hidden rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition ${viewMode === 'grid' ? 'bg-[var(--surface-3)] theme-text-primary' : 'theme-text-muted hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]'}`}
            >
              <GridIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 transition ${viewMode === 'list' ? 'bg-[var(--surface-3)] theme-text-primary' : 'theme-text-muted hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]'}`}
            >
              <ListIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sites Grid/List */}
        {filteredApps.length === 0 ? (
          <div className="theme-surface rounded-3xl px-6 py-16 text-center">
            <GlobeIcon className="mx-auto h-12 w-12 theme-text-muted" />
            <h3 className="mt-4 text-sm font-medium theme-text-primary">
              {searchQuery ? 'No sites found' : 'No websites yet'}
            </h3>
            <p className="mt-2 text-sm theme-text-muted">
              {searchQuery ? 'Try a different search term' : 'Get started by adding your first website.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddSite}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 font-medium text-white transition hover:bg-teal-400"
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
                  className={`theme-surface overflow-hidden rounded-[22px] transition-shadow hover:shadow-[var(--shadow-medium)] ${
                    activated ? 'border-slate-200/90 dark:border-slate-800' : 'border-red-200 dark:border-red-900/60'
                  }`}
                >
                  <div className="px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <a
                        href={`https://${app.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[calc(100%-2.5rem)] break-all text-[1.15rem] font-semibold leading-[1.22] text-cyan-700 underline decoration-cyan-300/70 underline-offset-2 hover:text-cyan-800 dark:text-cyan-300 dark:decoration-cyan-500/50 dark:hover:text-cyan-200 sm:text-[1.3rem]"
                      >
                        {app.domain}
                      </a>
                      <div className="relative">
                        <button 
                          onClick={(e) => openSettingsWithPosition(e, app.id)}
                          className="rounded-full p-1 theme-text-muted transition hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] sm:p-1.5"
                          aria-label="Site settings"
                        >
                          <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2.5 text-[14px] leading-5.5 sm:text-[15px] sm:leading-6">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="theme-text-muted">Hosting IP:</span>
                        <span className="font-mono theme-text-primary">{hostingIp}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="theme-text-muted">Firewall IP:</span>
                        <span className="font-mono theme-text-primary">{app.firewallIp || 'Not assigned'}</span>
                        {app.wafRegion && (
                          <span className="ml-1 rounded-md bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-blue-700 uppercase dark:bg-blue-950/60 dark:text-blue-300">
                            {app.wafRegion.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="theme-text-muted">SSL:</span>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide ${sslMeta.tone}`}>
                          {sslMeta.label}
                        </span>
                      </div>
                    </div>

                    {activated && (
                      <div className="mt-5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px] font-medium theme-text-secondary sm:text-[14px]">
                        <Link href="/logs" className="rounded-md px-1 py-0.5 transition hover:text-cyan-700 dark:hover:text-cyan-300">Reports</Link>
                        <span className="text-slate-300">•</span>
                        <Link href="/logs" className="rounded-md px-1 py-0.5 transition hover:text-cyan-700 dark:hover:text-cyan-300">Audit Trails</Link>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => handleClearCache(app)}
                          disabled={clearingCacheAppId === app.id}
                          className="rounded-md px-1 py-0.5 transition hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-[var(--text-muted)] dark:hover:text-cyan-300"
                        >
                          {clearingCacheAppId === app.id ? 'Clearing...' : 'Clear Cache'}
                        </button>
                        <span className="text-slate-300">•</span>
                        <Link href="/policies" className="rounded-md px-1 py-0.5 transition hover:text-cyan-700 dark:hover:text-cyan-300">IP Access Control</Link>
                      </div>
                    )}
                  </div>

                  <div className="theme-inset-surface mt-5 px-6 py-5">
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
                                  <div className="mt-1 text-[13px] theme-text-secondary">Blocked</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[1.9rem] font-semibold leading-none text-emerald-500">{stats.allowed.toLocaleString()}</div>
                                  <div className="mt-1 text-[13px] theme-text-secondary">Allowed</div>
                                </div>
                              </div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-text-muted">
                                {formatAnalyticsDisplayWindow()}
                              </div>
                            </div>
                          </div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 shadow-[0_6px_14px_rgba(34,197,94,0.25)]">
                            <CheckCircleIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm theme-text-muted">No traffic data yet</span>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 shadow-[0_6px_14px_rgba(34,197,94,0.25)]">
                            <CheckCircleIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
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
          <div className="theme-surface overflow-hidden rounded-3xl">
            <table className="min-w-full divide-y divide-[var(--border-soft)]">
              <thead className="bg-[var(--surface-3)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Hosting IP</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Firewall IP</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">SSL</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Stats</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)] bg-[var(--surface-2)]">
                {filteredApps.map((app) => {
                  const stats = getRealAppStats(app);
                  const activated = isActivated(app);
                  const hostingIp = getHostingDisplay(app);
                  const hasRealStats = activated && stats !== null;
                  const sslMeta = getSslStatusMeta(app.ssl);
                  
                  return (
                    <tr key={app.id} className="transition hover:bg-[var(--surface-3)]">
                      <td className="px-6 py-4">
                        <a
                          href={`https://${app.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-teal-600 hover:text-teal-700 hover:underline dark:text-teal-300 dark:hover:text-teal-200"
                        >
                          {app.domain}
                        </a>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-700 dark:text-slate-300">{hostingIp}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-700 dark:text-slate-300">{app.firewallIp || 'Not assigned'}</td>
                      <td className="px-6 py-4">
                        {app.wafRegionName ? (
                          <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {app.wafRegionName}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${sslMeta.tone}`}>
                          {sslMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {activated ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-emerald-400">
                            <CheckCircleIcon className="h-4 w-4" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                            <WarningIcon className="h-4 w-4" />
                            Not Activated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {hasRealStats ? (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-red-500">{stats.blocked} blocked</span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <span className="text-teal-500">{stats.allowed} allowed</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => openSettingsWithPosition(e, app.id)}
                          className="p-1 text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
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
                className="theme-modal fixed z-50 w-48 min-w-[12rem] rounded-xl py-1 backdrop-blur"
                style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                role="menu"
              >
                <button
                  onClick={() => handleOpenEdit(app)}
                  className="flex w-full gap-2 px-4 py-2 text-left text-sm theme-text-secondary transition hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
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
                  className="flex w-full gap-2 px-4 py-2 text-left text-sm theme-text-secondary transition hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                  role="menuitem"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  DNS Setup
                </button>
                <a
                  href="/logs"
                  className="flex w-full gap-2 px-4 py-2 text-left text-sm theme-text-secondary transition hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                  role="menuitem"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Logs
                </a>
                <hr className="my-1 border-[var(--border-soft)]" />
                <button
                  onClick={() => {
                    handleDeleteSite(app);
                    closeSettingsMenu();
                  }}
                  disabled={deleting}
                  className="flex w-full gap-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/50"
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
            <div className={modalShellClassName}>
              {/* Header */}
              <div className={modalHeaderClassName}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/60">
                    <GlobeIcon className="h-6 w-6 text-teal-600" />
                  </div>
                  <span className="text-lg font-semibold theme-text-primary">ATRAVA Defense Setup</span>
                </div>
                <button
                  onClick={() => !connecting && setShowModal(false)}
                  className={modalCloseButtonClassName}
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 min-h-0">
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <h2 className={modalTitleClassName}>What&apos;s your domain name?</h2>
                    <input
                      type="text"
                      placeholder="Enter your domain"
                      className={`${inputClassName} text-lg`}
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      autoFocus
                    />
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <h2 className={modalTitleClassName}>Where is your origin server?</h2>
                    <p className={modalBodyTextClassName}>
                      Enter the URL of your actual web server. Traffic will be forwarded here after WAF inspection.
                    </p>
                    <input
                      type="url"
                      placeholder="https://origin.example.com"
                      className={`${inputClassName} text-lg`}
                      value={formData.originUrl}
                      onChange={(e) => setFormData(applyRecommendedOriginDefaults({ ...formData, originUrl: e.target.value }))}
                      autoFocus
                    />
                    {isVercelOriginUrl(formData.originUrl) && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
                        Vercel origins are still publicly reachable unless the origin app rejects direct requests. ATRAVA Defense will auto-fill the upstream host, TLS server name, and `X-ATRAVAD-Origin-Auth` header name, but you must set a secret value and validate it in the Vercel app middleware.
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium theme-text-secondary">
                          Upstream Host Header
                        </label>
                        <input
                          type="text"
                          placeholder="Optional: app.internal.example or your public domain"
                          className={inputClassName}
                          value={formData.originUpstreamHost}
                          onChange={(e) => setFormData({ ...formData, originUpstreamHost: e.target.value })}
                        />
                        <p className={modalHelpTextClassName}>
                          Leave empty to forward the visitor&apos;s original host header. Set this when the origin expects a different host.
                        </p>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium theme-text-secondary">
                          Origin TLS Server Name
                        </label>
                        <input
                          type="text"
                          placeholder="Optional: origin.example.com"
                          className={inputClassName}
                          value={formData.originTlsServername}
                          onChange={(e) => setFormData({ ...formData, originTlsServername: e.target.value })}
                        />
                        <p className={modalHelpTextClassName}>
                          Use this when your origin URL is an IP or provider hostname, but the HTTPS certificate expects a different name. Example: connect to `https://1.2.3.4` using `app.example.com` for TLS.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium theme-text-secondary">
                          Origin Auth Header Name
                        </label>
                        <input
                          type="text"
                          placeholder="Recommended: X-ATRAVAD-Origin-Auth"
                          className={inputClassName}
                          value={formData.originAuthHeaderName}
                          onChange={(e) => setFormData({ ...formData, originAuthHeaderName: e.target.value })}
                        />
                        <p className={modalHelpTextClassName}>
                          The header name ATRAVA Defense will send to your origin, such as `X-ATRAVAD-Origin-Auth`.
                        </p>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium theme-text-secondary">
                          Origin Auth Header Value
                        </label>
                        <input
                          type="password"
                          placeholder="Optional shared secret"
                          className={inputClassName}
                          value={formData.originAuthHeaderValue}
                          onChange={(e) => setFormData({ ...formData, originAuthHeaderValue: e.target.value })}
                        />
                        <p className={modalHelpTextClassName}>
                          The shared secret value your origin verifies. Use this to block direct bypass traffic that does not come through ATRAVA Defense.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Allow WebSockets through ATRAVA Defense</p>
                          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300/80">
                            ATRAVA Defense inspects the WebSocket handshake, then tunnels frames. Post-upgrade frames are not inspected individually.
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
                          <label className="mb-2 block text-sm font-medium text-amber-900 dark:text-amber-200">
                            WebSocket Idle Timeout (seconds)
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="86400"
                            className="theme-input w-full rounded-xl border border-amber-300 px-4 py-2 shadow-sm transition md:w-60 dark:border-amber-800"
                            value={formData.websocketIdleTimeoutSec}
                            onChange={(e) => setFormData({ ...formData, websocketIdleTimeoutSec: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                    <label className="theme-inset-surface flex items-center justify-between rounded-xl px-4 py-3">
                      <span className="pr-4 text-sm theme-text-secondary">
                        Inspect and buffer origin responses
                        <span className="block text-xs theme-text-muted">
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
                      <label className="mb-2 block text-sm font-medium theme-text-secondary">
                        Security Policy (Optional)
                      </label>
                        <select
                          className={inputClassName}
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
                      <label className={modalSectionLabelClassName}>SSL Certificate</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className={`cursor-pointer rounded-2xl border p-4 transition-colors ${formData.sslMode === SSL_MODE.AUTO ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/35' : 'theme-soft-surface hover:border-teal-300 dark:hover:border-teal-700'}`}>
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
                              <p className="text-sm font-semibold theme-text-primary">Managed SSL (Recommended)</p>
                              <p className="mt-1 text-xs theme-text-secondary">Let&apos;s Encrypt certificate issued and renewed automatically.</p>
                            </div>
                          </div>
                        </label>
                        <label className={`cursor-pointer rounded-2xl border p-4 transition-colors ${formData.sslMode === SSL_MODE.CUSTOM ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/35' : 'theme-soft-surface hover:border-teal-300 dark:hover:border-teal-700'}`}>
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
                              <p className="text-sm font-semibold theme-text-primary">Custom SSL</p>
                              <p className="mt-1 text-xs theme-text-secondary">Paste PEM or import certificate/key files.</p>
                            </div>
                          </div>
                        </label>
                      </div>

                      {formData.sslMode === SSL_MODE.AUTO && (
                        <label className="theme-inset-surface flex items-center justify-between rounded-xl px-4 py-3">
                          <span className="text-sm theme-text-secondary">Automatically provision and renew SSL certificate</span>
                          <input
                            type="checkbox"
                            checked={formData.autoProvisionSSL !== false}
                            onChange={(e) => setFormData({ ...formData, autoProvisionSSL: e.target.checked })}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                          />
                        </label>
                      )}

                      {formData.sslMode === SSL_MODE.CUSTOM && (
                        <div className="mt-3 space-y-3 border-l-2 border-teal-200 pl-4 dark:border-teal-900">
                          <div className="flex flex-wrap gap-2">
                            <label className="theme-button-neutral cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition">
                              Import Certificate File
                              <input
                                type="file"
                                accept=".pem,.crt,.cer,text/plain"
                                className="hidden"
                                onChange={(e) => importPemFile(e.target.files?.[0], 'customCert', setFormData, setCreateSslUiError)}
                              />
                            </label>
                            <label className="theme-button-neutral cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition">
                              Import Private Key File
                              <input
                                type="file"
                                accept=".pem,.key,text/plain"
                                className="hidden"
                                onChange={(e) => importPemFile(e.target.files?.[0], 'customKey', setFormData, setCreateSslUiError)}
                              />
                            </label>
                            <label className="theme-button-neutral cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition">
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
                            <label className="mb-1 block text-xs font-medium theme-text-muted">Certificate (PEM)</label>
                            <textarea
                              placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                              value={formData.customCert}
                              onChange={(e) => {
                                setCreateSslUiError('');
                                setFormData({ ...formData, customCert: e.target.value });
                              }}
                              rows={4}
                              className={`${inputClassName} min-h-[6rem] resize-y px-3 py-2 text-sm font-mono`}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium theme-text-muted">Private key (PEM)</label>
                            <textarea
                              placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                              value={formData.customKey}
                              onChange={(e) => {
                                setCreateSslUiError('');
                                setFormData({ ...formData, customKey: e.target.value });
                              }}
                              rows={4}
                              className={`${inputClassName} min-h-[6rem] resize-y px-3 py-2 text-sm font-mono`}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium theme-text-muted">CA chain / full chain (optional)</label>
                            <textarea
                              placeholder="-----BEGIN CERTIFICATE-----\n... (intermediate + root)\n-----END CERTIFICATE-----"
                              value={formData.customFullchain}
                              onChange={(e) => {
                                setCreateSslUiError('');
                                setFormData({ ...formData, customFullchain: e.target.value });
                              }}
                              rows={2}
                              className={`${inputClassName} min-h-[4rem] resize-y px-3 py-2 text-sm font-mono`}
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
                    <p className="mt-6 text-lg theme-text-secondary">Connecting your domain...</p>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                      <h2 className="mt-4 text-2xl font-bold theme-text-primary">Almost done!</h2>
                      <p className="mt-2 theme-text-secondary">
                        Point your domain&apos;s DNS to activate protection.
                      </p>
                    </div>
                    
                    <div className={`${mutedPanelClassName} space-y-3`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm theme-text-secondary">Domain:</span>
                        <span className="font-mono font-medium theme-text-primary">{formData.domain}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm theme-text-secondary">Origin:</span>
                        <span className="font-mono text-sm theme-text-primary">{formData.originUrl}</span>
                      </div>
                      {formData.originUpstreamHost && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm theme-text-secondary">Upstream Host:</span>
                          <span className="font-mono text-sm theme-text-primary">{formData.originUpstreamHost}</span>
                        </div>
                      )}
                      {formData.originTlsServername && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm theme-text-secondary">Origin TLS SNI:</span>
                          <span className="font-mono text-sm theme-text-primary">{formData.originTlsServername}</span>
                        </div>
                      )}
                      {formData.originAuthHeaderName && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm theme-text-secondary">Origin Auth:</span>
                          <span className="font-mono text-sm theme-text-primary">{formData.originAuthHeaderName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm theme-text-secondary">WebSockets:</span>
                        <span className="text-sm font-medium theme-text-primary">
                          {formData.websocketEnabled !== false
                            ? `Handshake-only protection, ${formData.websocketIdleTimeoutSec || '900'}s timeout`
                            : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm theme-text-secondary">SSL:</span>
                        <span className="text-sm font-medium theme-text-primary">{formData.sslMode === SSL_MODE.CUSTOM ? 'Custom certificate' : 'Let\'s Encrypt (auto)'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm theme-text-secondary">Response Inspection:</span>
                        <span className="text-sm font-medium theme-text-primary">{formData.responseInspectionEnabled !== false ? 'Enabled' : 'Streaming-safe mode'}</span>
                      </div>
                      <hr className="border-[var(--border-soft)]" />
                      <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/35">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Next Step:</strong> After adding your site, you&apos;ll receive a Firewall IP address based on your origin server&apos;s location. Update your DNS to point to this IP.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="px-6 shrink-0">
                <div className="h-1 overflow-hidden rounded-full bg-[var(--border-soft)]">
                  <div 
                    className="h-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${(wizardStep / 4) * 100}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--border-soft)] px-6 py-4">
                {wizardStep > 1 && wizardStep !== 3 && (
                  <button
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="theme-button-neutral rounded-xl px-6 py-2.5 font-medium transition"
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
            
            <div className={modalShellClassName}>
              <div className={modalHeaderClassName}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/60">
                    <SettingsIcon className="h-6 w-6 text-teal-600" />
                  </div>
                  <span className="text-lg font-semibold theme-text-primary">Edit Site</span>
                </div>
                <button
                  onClick={() => setSelectedAppForEdit(null)}
                  className={modalCloseButtonClassName}
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs: General | SSL Certificate (Sucuri-style separation) */}
              <div className="flex shrink-0 border-b border-[var(--border-soft)] px-6">
                <button
                  type="button"
                  onClick={() => setEditModalTab('general')}
                  className={`${modalTabBaseClassName} ${editModalTab === 'general' ? 'border-teal-500 text-teal-600 dark:text-teal-300' : modalTabInactiveClassName}`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalTab('ssl')}
                  className={`${modalTabBaseClassName} ${editModalTab === 'ssl' ? 'border-teal-500 text-teal-600 dark:text-teal-300' : modalTabInactiveClassName}`}
                >
                  SSL Certificate
                </button>
              </div>

              <form onSubmit={handleUpdateSite} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
                {/* General tab - keep in DOM so form submit includes all fields */}
                <div className={editModalTab !== 'general' ? 'hidden' : 'space-y-5'}>
                <div>
                  <label className={modalSectionLabelClassName}>Domain</label>
                  <input
                    type="text"
                    disabled
                    value={selectedAppForEdit.domain}
                    className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-2.5 theme-text-muted"
                  />
                  <p className={modalHelpTextClassName}>Domain cannot be changed after creation</p>
                </div>

                <div>
                  <label className={modalSectionLabelClassName}>Origin Server URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://origin.example.com"
                    value={editFormData.originUrl}
                    onChange={(e) => setEditFormData(applyRecommendedOriginDefaults({ ...editFormData, originUrl: e.target.value }))}
                    className={inputClassName}
                  />
                  {isVercelOriginUrl(editFormData.originUrl) && (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
                      This origin is on Vercel. Keep the upstream host and TLS server name aligned to the `vercel.app` hostname, and enforce the shared secret in the origin app middleware so direct requests return `403`.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={modalSectionLabelClassName}>Upstream Host Header</label>
                    <input
                      type="text"
                      placeholder="Optional override"
                      value={editFormData.originUpstreamHost}
                      onChange={(e) => setEditFormData({ ...editFormData, originUpstreamHost: e.target.value })}
                      className={inputClassName}
                    />
                    <p className={modalHelpTextClassName}>Leave empty to pass the visitor&apos;s original host header to the origin.</p>
                  </div>

                  <div>
                    <label className={modalSectionLabelClassName}>Origin TLS Server Name</label>
                    <input
                      type="text"
                      placeholder="Optional SNI override"
                      value={editFormData.originTlsServername}
                      onChange={(e) => setEditFormData({ ...editFormData, originTlsServername: e.target.value })}
                      className={inputClassName}
                    />
                    <p className={modalHelpTextClassName}>Set this when the origin URL is an IP or provider host, but HTTPS upstream must present a different certificate name.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={modalSectionLabelClassName}>Origin Auth Header Name</label>
                    <input
                      type="text"
                      placeholder="Recommended: X-ATRAVAD-Origin-Auth"
                      value={editFormData.originAuthHeaderName}
                      onChange={(e) => setEditFormData({ ...editFormData, originAuthHeaderName: e.target.value })}
                      className={inputClassName}
                    />
                    <p className={modalHelpTextClassName}>Header name ATRAVA Defense sends to the origin, for example `X-ATRAVAD-Origin-Auth`.</p>
                  </div>

                  <div>
                    <label className={modalSectionLabelClassName}>Origin Auth Header Value</label>
                    <input
                      type="password"
                      placeholder="Optional shared secret"
                      value={editFormData.originAuthHeaderValue}
                      onChange={(e) => setEditFormData({ ...editFormData, originAuthHeaderValue: e.target.value })}
                      className={inputClassName}
                    />
                    <p className={modalHelpTextClassName}>
                      {selectedAppForEdit?.origins?.[0]?.authHeaderConfigured
                        ? 'Leave blank to keep the existing secret, or enter a new value to rotate it.'
                        : 'Shared secret the origin checks before serving traffic. Requests that bypass ATRAVA Defense should not have this value.'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Allow WebSockets through ATRAVA Defense</p>
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-300/80">
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
                      <label className="mb-2 block text-sm font-medium text-amber-900 dark:text-amber-200">WebSocket Idle Timeout (seconds)</label>
                      <input
                        type="number"
                        min="10"
                        max="86400"
                        value={editFormData.websocketIdleTimeoutSec}
                        onChange={(e) => setEditFormData({ ...editFormData, websocketIdleTimeoutSec: e.target.value })}
                        className="theme-input w-full rounded-xl border border-amber-300 px-4 py-2.5 shadow-sm transition md:w-60 dark:border-amber-800"
                      />
                    </div>
                  )}
                </div>

                <label className="theme-inset-surface flex items-center justify-between rounded-xl px-4 py-3">
                    <span className="pr-4 text-sm theme-text-secondary">
                      Inspect and buffer origin responses
                      <span className="block text-xs theme-text-muted">
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
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Security Policy</label>
                    <select
                      value={editFormData.policyId}
                      onChange={(e) => setEditFormData({ ...editFormData, policyId: e.target.value })}
                      className={inputClassName}
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
                    <p className="text-sm theme-text-secondary">Choose how SSL/TLS is provided for this site.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <label className={`cursor-pointer rounded-2xl border p-4 transition-colors ${editFormData.sslMode === SSL_MODE.AUTO ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/35' : 'theme-soft-surface hover:border-teal-300 dark:hover:border-teal-700'}`}>
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
                          <p className="text-sm font-semibold theme-text-primary">Managed SSL</p>
                          <p className="mt-1 text-xs theme-text-secondary">Use Let&apos;s Encrypt with automatic renewals.</p>
                        </div>
                      </div>
                    </label>
                     <label className={`cursor-pointer rounded-2xl border p-4 transition-colors ${editFormData.sslMode === SSL_MODE.CUSTOM ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/35' : 'theme-soft-surface hover:border-teal-300 dark:hover:border-teal-700'}`}>
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
                          <p className="text-sm font-semibold theme-text-primary">Custom SSL</p>
                          <p className="mt-1 text-xs theme-text-secondary">Upload or paste your own PEM certificate set.</p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {editFormData.sslMode === SSL_MODE.AUTO && (
                    <label className="theme-inset-surface flex items-center justify-between rounded-xl px-4 py-3">
                      <span className="text-sm theme-text-secondary">Automatically provision and renew SSL certificate</span>
                      <input
                        type="checkbox"
                        checked={editFormData.autoProvisionSSL !== false}
                        onChange={(e) => setEditFormData({ ...editFormData, autoProvisionSSL: e.target.checked })}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                      />
                    </label>
                  )}

                  {editFormData.sslMode === SSL_MODE.CUSTOM && (
                     <div className="mt-4 space-y-3 border-t border-[var(--border-soft)] pt-4">
                      <div className="flex flex-wrap gap-2">
                         <label className="theme-button-neutral cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition">
                          Import Certificate File
                          <input
                            type="file"
                            accept=".pem,.crt,.cer,text/plain"
                            className="hidden"
                            onChange={(e) => importPemFile(e.target.files?.[0], 'customCert', setEditFormData, setEditSslUiError)}
                          />
                        </label>
                         <label className="theme-button-neutral cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition">
                          Import Private Key File
                          <input
                            type="file"
                            accept=".pem,.key,text/plain"
                            className="hidden"
                            onChange={(e) => importPemFile(e.target.files?.[0], 'customKey', setEditFormData, setEditSslUiError)}
                          />
                        </label>
                         <label className="theme-button-neutral cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition">
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
                          <label className={modalSectionLabelClassName}>Certificate (PEM)</label>
                        <textarea
                          placeholder={selectedAppForEdit?.ssl?.hasStoredCustomCert ? 'Leave blank to keep the existing certificate, or paste a replacement.' : '-----BEGIN CERTIFICATE-----...'}
                          value={editFormData.customCert}
                          onChange={(e) => {
                            setEditSslUiError('');
                            setEditFormData({ ...editFormData, customCert: e.target.value });
                          }}
                          rows={4}
                          className={`${inputClassName} min-h-[6rem] resize-y px-3 py-2 text-sm font-mono`}
                        />
                      </div>
                      <div>
                          <label className={modalSectionLabelClassName}>Private key (PEM)</label>
                        <textarea
                          placeholder={selectedAppForEdit?.ssl?.hasStoredCustomCert ? 'Leave blank to keep the existing private key, or paste a replacement.' : '-----BEGIN PRIVATE KEY-----...'}
                          value={editFormData.customKey}
                          onChange={(e) => {
                            setEditSslUiError('');
                            setEditFormData({ ...editFormData, customKey: e.target.value });
                          }}
                          rows={4}
                          className={`${inputClassName} min-h-[6rem] resize-y px-3 py-2 text-sm font-mono`}
                        />
                      </div>
                      <div>
                          <label className={modalSectionLabelClassName}>CA chain / full chain (optional)</label>
                        <textarea
                          placeholder={selectedAppForEdit?.ssl?.hasStoredCustomCert ? 'Leave blank to keep the existing chain, or paste a replacement.' : 'Optional intermediate + root certificates'}
                          value={editFormData.customFullchain}
                          onChange={(e) => {
                            setEditSslUiError('');
                            setEditFormData({ ...editFormData, customFullchain: e.target.value });
                          }}
                          rows={2}
                          className={`${inputClassName} min-h-[4rem] resize-y px-3 py-2 text-sm font-mono`}
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

                <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--border-soft)] px-6 py-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedAppForEdit(null)}
                    className="theme-button-neutral rounded-xl px-5 py-2.5 text-sm font-medium transition"
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
            <div className={modalShellClassName}>
              {/* Header */}
              <div className={modalHeaderClassName}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/60">
                    <GlobeIcon className="h-6 w-6 text-teal-600" />
                  </div>
                  <span className="text-lg font-semibold theme-text-primary">Complete Setup</span>
                </div>
                <button
                  onClick={() => setSelectedAppForSetup(null)}
                  className={modalCloseButtonClassName}
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
                  <h2 className="mt-4 text-xl font-bold theme-text-primary">
                    {setupActivated ? 'DNS Configured' : 'DNS Not Configured'}
                  </h2>
                  <p className="mt-2 theme-text-secondary">
                    {setupActivated ? (
                      <>Your domain is pointing to ATRAVA Defense and protection is active for <strong>{selectedAppForSetup.domain}</strong></>
                    ) : (
                      <>Point your domain&apos;s DNS to activate WAF protection for <strong>{selectedAppForSetup.domain}</strong></>
                    )}
                  </p>
                </div>

                {/* DNS Instructions */}
                <div className="theme-inset-surface rounded-2xl p-5">
                  <h3 className="font-semibold theme-text-primary">DNS Configuration</h3>
                  
                  <div className="space-y-3">
                    <div className="theme-soft-surface flex items-center justify-between rounded-xl p-3">
                      <div>
                        <span className="text-xs font-medium uppercase theme-text-muted">Domain</span>
                        <p className="font-mono text-sm font-medium theme-text-primary">{selectedAppForSetup.domain}</p>
                      </div>
                    </div>
                    
                    <div className="theme-soft-surface flex items-center justify-between rounded-xl p-3">
                      <div>
                        <span className="text-xs font-medium uppercase theme-text-muted">Origin Server</span>
                        <p className="font-mono text-sm theme-text-secondary">{getHostingDisplay(selectedAppForSetup)}</p>
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
                            <span className="rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
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
                      <div className="theme-soft-surface flex items-center justify-between rounded-xl p-3">
                        <div className="flex-1">
                          <span className="text-xs font-medium uppercase theme-text-muted">Or CNAME To</span>
                          <p className="font-mono text-sm theme-text-secondary">{selectedAppForSetup.firewallCname}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedAppForSetup.firewallCname);
                            alert('CNAME copied to clipboard!');
                          }}
                          className="theme-button-neutral rounded-lg px-3 py-1.5 text-xs font-medium transition"
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

                <p className="text-center text-xs theme-text-muted">
                  {setupActivated
                    ? 'ATRAVA Defense is active for this site. Global DNS propagation may still vary briefly across some resolvers.'
                    : 'Once DNS propagates, your site will be protected by ATRAVA Defense. The status will update automatically.'}
                </p>
                    </>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--border-soft)] px-6 py-4">
                <button
                  onClick={() => setSelectedAppForSetup(null)}
                  className="theme-button-neutral rounded-xl px-6 py-2.5 text-sm font-medium transition"
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
          </>
        )}
      </div>
    </Layout>
  );
}
