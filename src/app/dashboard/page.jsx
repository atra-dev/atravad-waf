'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';

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

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh || !loading) {
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
      const uniquePolicies = new Set(policiesArray.map((policy) => policy.name));

      const userHasTenantName = user?.tenantName &&
        typeof user.tenantName === 'string' &&
        user.tenantName.trim() !== '';
      const hasValidTenantFromAPI = !!(tenant?.id && tenant?.name && tenant.name !== 'Default Tenant');
      const hasTenant = !!userHasTenantName || hasValidTenantFromAPI;

      setData({
        tenantName: tenant?.name || 'No Tenant',
        tenantId: tenant?.id || null,
        appCount: appsArray.length,
        policyCount: uniquePolicies.size,
        hasTenant,
      });
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

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold theme-text-primary">Security Dashboard</h1>
            <p className="mt-2 text-sm theme-text-secondary">
              Overview of your WAF infrastructure and security posture
            </p>
          </div>
          {refreshing && (
            <div className="flex items-center text-sm theme-text-muted">
              <LoadingSpinner size="sm" className="mr-2" />
              <span>Refreshing...</span>
            </div>
          )}
        </div>

        {!loading && !data.hasTenant && (
          <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15">
                <TenantIcon className="h-6 w-6 text-amber-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold theme-text-primary">Managed access pending</h3>
                <p className="mt-2 text-sm theme-text-secondary">
                  ATRAVA Defense is provisioned as a managed service. A super admin must create your tenant, assign your account, and complete onboarding before dashboard access is enabled.
                </p>
                <p className="mt-2 text-sm theme-text-muted">
                  Contact the ATRAVA Defense operations team to request tenant assignment or account provisioning.
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && data.hasTenant && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title="Organization" value={data.tenantName} icon={TenantIcon} subtitle="Active tenant" />
              <StatCard title="Sites" value={data.appCount} icon={AppsIcon} subtitle="Protected sites" />
              <StatCard title="Security Policies" value={data.policyCount} icon={ShieldIcon} subtitle="Active policies" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="theme-surface rounded-xl p-6">
                <h3 className="mb-4 text-lg font-semibold theme-text-primary">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href="/policies"
                    className="group flex items-center justify-between rounded-lg bg-[var(--accent-soft)] p-4 transition-colors hover:brightness-110"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-strong)]">
                        <ShieldIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium theme-text-primary">Create Security Policy</p>
                        <p className="text-xs theme-text-muted">Define new protection rules</p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 theme-text-muted group-hover:text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/apps"
                    className="group flex items-center justify-between rounded-lg bg-[var(--surface-3)] p-4 transition-colors hover:brightness-105"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-strong)]">
                        <AppsIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium theme-text-primary">Add site</p>
                        <p className="text-xs theme-text-muted">Add site → point DNS → SSL → done</p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 theme-text-muted group-hover:text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="theme-surface rounded-xl p-6">
                <h3 className="mb-4 text-lg font-semibold theme-text-primary">System Status</h3>
                <div className="space-y-4">
                  {[
                    'OWASP CRS Integration',
                    'ModSecurity Engine',
                    'WAF Protection',
                  ].map((item) => (
                    <div key={item} className="flex items-center justify-between">
                      <span className="text-sm theme-text-secondary">{item}</span>
                      <span className="inline-flex items-center rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-medium text-[var(--success-strong)]">
                        <span className="mr-2 h-2 w-2 rounded-full bg-[var(--success-strong)]"></span>
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
