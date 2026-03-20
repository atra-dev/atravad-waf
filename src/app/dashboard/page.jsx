'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';

// Icons
const TenantIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const AppsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const ServerIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default function DashboardPage() {
  const [data, setData] = useState({
    tenantName: '',
    tenantId: null,
    appCount: 0,
    policyCount: 0,
    hasTenant: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '' });
  const [submittingTenant, setSubmittingTenant] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(() => fetchDashboardData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    // Only show full loading spinner on initial load
    if (isRefresh) {
      setRefreshing(true);
    } else if (!loading) {
      setRefreshing(true);
    }

    try {
      const [tenantRes, appsRes, policiesRes, userRes] = await Promise.all([
        fetch('/api/tenants/current'),
        fetch('/api/apps'),
        fetch('/api/policies'),
        fetch('/api/users/me'),
      ]);

      const tenant = await tenantRes.json();
      const apps = await appsRes.json();
      const policies = await policiesRes.json();
      const user = await userRes.json();

      const appsArray = Array.isArray(apps) ? apps : [];
      const policiesArray = Array.isArray(policies) ? policies : [];
      const uniquePolicies = new Set(policiesArray.map(p => p.name));
      
      // Check if user has a tenant
      // Tenant is valid if:
      // 1. User has tenantName in their document (not null/undefined/empty), OR
      // 2. Tenant API returns a valid tenant with ID and name != 'Default Tenant'
      const userHasTenantName = user?.tenantName && 
        typeof user.tenantName === 'string' && 
        user.tenantName.trim() !== '';
      const hasValidTenantFromAPI = !!(tenant?.id && 
        tenant?.name && 
        tenant.name !== 'Default Tenant');
      const hasTenant = !!userHasTenantName || hasValidTenantFromAPI;

      setData({
        tenantName: tenant?.name || 'No Tenant',
        tenantId: tenant?.id || null,
        appCount: appsArray.length,
        policyCount: uniquePolicies.size,
        hasTenant,
      });

      // Show tenant creation banner if user doesn't have a tenant
      // Only auto-show form if explicitly needed (user doesn't have tenant AND needs one)
      if (!hasTenant && user?.needsTenant) {
        // Don't auto-show form - let user click the button to show it
        // Keep showTenantForm as false initially to show the banner
      } else if (hasTenant) {
        // Hide form if they have a tenant
        setShowTenantForm(false);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData({
        tenantName: 'No Tenant',
        tenantId: null,
        appCount: 0,
        policyCount: 0,
        hasTenant: false,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
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
        // Optimistically update the state to prevent flicker
        setData(prev => ({
          ...prev,
          tenantName: tenantData.name,
          tenantId: tenantData.id,
          hasTenant: true,
        }));
        setShowTenantForm(false);
        setTenantFormData({ name: '' });
        // Refresh dashboard data in background (without showing full loading spinner)
        fetchDashboardData(true);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create tenant');
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      alert('Failed to create tenant');
    } finally {
      setSubmittingTenant(false);
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

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Overview of your WAF infrastructure and security posture
            </p>
          </div>
          {refreshing && (
            <div className="flex items-center text-sm text-gray-500">
              <LoadingSpinner size="sm" className="mr-2" />
              <span>Refreshing...</span>
            </div>
          )}
        </div>

        {/* Managed onboarding notice */}
        {!data.hasTenant && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <TenantIcon className="h-6 w-6 text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Managed access pending</h3>
                <p className="mt-2 text-sm text-gray-700">
                  ATRAVAD WAF is provisioned as a managed service. A super admin must create your tenant, assign your account, and complete onboarding before dashboard access is enabled.
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Contact the ATRAVAD WAF operations team to request tenant assignment or account provisioning.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid - Only show if user has a tenant */}
        {data.hasTenant && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Organization"
                value={data.tenantName}
                icon={TenantIcon}
                subtitle="Active tenant"
              />
          <StatCard
            title="Sites"
            value={data.appCount}
            icon={AppsIcon}
            subtitle="Protected sites"
          />
          <StatCard
            title="Security Policies"
            value={data.policyCount}
            icon={ShieldIcon}
            subtitle="Active policies"
          />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <a
                    href="/policies"
                    className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                        <ShieldIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Create Security Policy</p>
                        <p className="text-xs text-gray-500">Define new protection rules</p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a
                    href="/apps"
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                        <AppsIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Add site</p>
                        <p className="text-xs text-gray-500">Add site → point DNS → SSL → done</p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">OWASP CRS Integration</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">ModSecurity Engine</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      Operational
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">WAF Protection</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
