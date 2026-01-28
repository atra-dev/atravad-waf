'use client';

import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';

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

export default function AppsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [connecting, setConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [formData, setFormData] = useState({ 
    name: '', 
    domain: '',
    originUrl: '',
    policyId: '',
  });
  const [policies, setPolicies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Multi-tenancy state
  const [hasTenant, setHasTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '' });
  const [submittingTenant, setSubmittingTenant] = useState(false);

  // WAF IP/CNAME for DNS pointing
  const wafIp = process.env.NEXT_PUBLIC_ATRAVAD_WAF_IP || '192.124.249.100';
  const wafCname = process.env.NEXT_PUBLIC_ATRAVAD_WAF_CNAME || '';

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

  const handleAddSite = () => {
    setFormData({ name: '', domain: '', originUrl: '', policyId: '' });
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
    setSubmitting(true);

    try {
      const apiData = {
        name: formData.name || formData.domain,
        domain: formData.domain,
        origins: [{ 
          url: formData.originUrl, 
          weight: 100, 
          healthCheck: { path: '/health', interval: 30, timeout: 5 } 
        }],
        policyId: formData.policyId || null,
        responseInspectionEnabled: true,
        autoSSL: true,
        ssl: { autoProvision: true },
        routing: { pathPrefix: '/', stripPath: false },
        // DNS not yet activated
        activated: false,
        firewallIp: wafIp,
      };

      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({ name: '', domain: '', originUrl: '', policyId: '' });
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

  // Simulate stats - in production these would come from logs
  const getAppStats = (app) => {
    // Generate consistent random stats based on app id
    const seed = app.id?.charCodeAt(0) || 0;
    const blocked = Math.floor((seed * 7) % 50);
    const allowed = Math.floor((seed * 13) % 200) + 20;
    return { blocked, allowed };
  };

  // Check if site is activated (DNS pointing to WAF)
  const isActivated = (app) => {
    // In production, this would check actual DNS
    // For now, simulate based on createdAt date (older = activated)
    if (app.activated !== undefined) return app.activated;
    const createdDate = new Date(app.createdAt);
    const hoursSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation > 24;
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
              const stats = getAppStats(app);
              const activated = isActivated(app);
              const hostingIp = getHostingDisplay(app);
              
              return (
                <div
                  key={app.id}
                  className={`bg-white rounded-xl border-2 ${
                    activated ? 'border-gray-200' : 'border-red-200'
                  } overflow-hidden hover:shadow-lg transition-shadow`}
                >
                  {/* Card Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <a
                        href={`https://${app.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 font-semibold text-lg hover:underline"
                      >
                        {app.domain}
                      </a>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <SettingsIcon className="h-5 w-5" />
                      </button>
                    </div>
                    
                    {/* IPs */}
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Hosting IP:</span>
                        <span className="font-mono text-gray-700">{hostingIp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Firewall IP:</span>
                        <span className="font-mono text-gray-700">{wafIp}</span>
                      </div>
                    </div>

                    {/* Quick Links */}
                    {activated && (
                      <div className="mt-4 flex flex-wrap gap-2 text-sm">
                        <a href="/logs" className="text-gray-600 hover:text-teal-600">Reports</a>
                        <span className="text-gray-300">|</span>
                        <a href="/logs" className="text-gray-600 hover:text-teal-600">Audit Trails</a>
                        <span className="text-gray-300">|</span>
                        <button className="text-gray-600 hover:text-teal-600">Clear Cache</button>
                        <span className="text-gray-300">|</span>
                        <a href="/policies" className="text-gray-600 hover:text-teal-600">IP Access Control</a>
                      </div>
                    )}
                  </div>

                  {/* Stats or Not Activated */}
                  <div className="border-t border-gray-100 px-5 py-4">
                    {activated ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Stats Bar */}
                          <div className="flex items-end gap-1 h-12">
                            <div 
                              className="w-4 bg-red-400 rounded-t"
                              style={{ height: `${Math.min(stats.blocked * 2, 48)}px` }}
                            />
                            <div 
                              className="w-4 bg-teal-400 rounded-t"
                              style={{ height: `${Math.min(stats.allowed / 4, 48)}px` }}
                            />
                          </div>
                          <div className="text-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-red-500 font-semibold">{stats.blocked}</span>
                              <span className="text-teal-500 font-semibold">{stats.allowed}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500 text-xs">
                              <span>Blocked</span>
                              <span>Allowed</span>
                            </div>
                          </div>
                        </div>
                        <CheckCircleIcon className="h-6 w-6 text-green-500" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-600">
                          <WarningIcon className="h-5 w-5" />
                          <span className="font-medium">Not Activated!</span>
                        </div>
                        <button className="px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600">
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stats</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApps.map((app) => {
                  const stats = getAppStats(app);
                  const activated = isActivated(app);
                  const hostingIp = getHostingDisplay(app);
                  
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
                      <td className="px-6 py-4 font-mono text-sm text-gray-700">{wafIp}</td>
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
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-500">{stats.blocked} blocked</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-teal-500">{stats.allowed} allowed</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-gray-600">
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
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
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
              <div className="p-6">
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
                        {policies.map((policy) => (
                          <option key={policy.id} value={policy.id}>
                            {policy.name}
                          </option>
                        ))}
                      </select>
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
                      <hr className="border-gray-200" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Point A record to:</span>
                        <span className="font-mono font-bold text-teal-600">{wafIp}</span>
                      </div>
                      {wafCname && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Or CNAME to:</span>
                          <span className="font-mono font-bold text-teal-600">{wafCname}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="px-6">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${(wizardStep / 4) * 100}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4">
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
    </Layout>
  );
}
