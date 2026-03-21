'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import SkeletonLoader from '@/components/SkeletonLoader';
import { getPlanOptions } from '@/lib/plans';

const PLAN_OPTIONS = getPlanOptions();
const ADMIN_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Commercial summary',
  },
  {
    id: 'tenants',
    label: 'Tenants',
    description: 'Plans and provisioning',
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Managed access',
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'Operational timeline',
  },
];

// Icons
const TenantIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ActivityIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ServerIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const AppsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const StatusBadge = ({ status, className = '' }) => {
  const statusConfig = {
    online: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-400' },
    offline: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' },
  };
  const config = statusConfig[status] || statusConfig.offline;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      <span className={`w-2 h-2 ${config.dot} rounded-full mr-2`}></span>
      {status}
    </span>
  );
};

const CommercialStatusBadge = ({ status }) => {
  const normalized = String(status || 'active').toLowerCase();
  const toneMap = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    trialing: 'border-sky-200 bg-sky-50 text-sky-700',
    past_due: 'border-amber-200 bg-amber-50 text-amber-700',
    suspended: 'border-red-200 bg-red-50 text-red-700',
  };
  const label = normalized.replace(/_/g, ' ');

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneMap[normalized] || toneMap.active}`}>
      {label}
    </span>
  );
};

const PlanBadge = ({ planName }) => (
  <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
    {planName}
  </span>
);

const PremiumStatCard = ({ title, value, subtitle, icon: Icon }) => (
  <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(160deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
      </div>
      <div className="rounded-2xl border border-white/80 bg-white/80 p-3 text-slate-700 shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </div>
);

const SeverityBadge = ({ severity }) => {
  const normalized = String(severity || 'info').toLowerCase();
  const toneMap = {
    critical: 'border-red-200 bg-red-50 text-red-700',
    high: 'border-orange-200 bg-orange-50 text-orange-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    low: 'border-slate-200 bg-slate-100 text-slate-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneMap[normalized] || toneMap.info}`}>
      {normalized}
    </span>
  );
};

export default function SuperAdminPage() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalUsers: 0,
    totalApps: 0,
    totalPolicies: 0,
  });
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState({ logs: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userRole, setUserRole] = useState(null);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState('all');
  const [tenantForm, setTenantForm] = useState({ name: '', assignUserEmail: '', planId: 'essential' });
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    role: 'admin',
    tenantName: '',
    authProvider: 'password',
  });
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [savingUserId, setSavingUserId] = useState('');
  const [savingTenantId, setSavingTenantId] = useState('');
  const [removingUserId, setRemovingUserId] = useState('');
  const [userEdits, setUserEdits] = useState({});
  const [tenantEdits, setTenantEdits] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const showToast = (message, tone = 'success') => {
    setToast({ message, tone });
  };

  useEffect(() => {
    checkAccessAndFetchData();
    const interval = setInterval(() => {
      setRefreshing(true);
      checkAccessAndFetchData().finally(() => setRefreshing(false));
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkAccessAndFetchData = async () => {
    try {
      // First check if user is super admin
      const userRes = await fetch('/api/users/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserRole(userData.role);
        
        if (userData.role !== 'super_admin') {
          setUnauthorized(true);
          setLoading(false);
          return;
        }
      } else {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      // Fetch data if authorized
      await fetchData(false);
    } catch (error) {
      console.error('Error checking access:', error);
      setError('Failed to verify access');
      setLoading(false);
    }
  };

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) {
      setError(null);
    }
    try {
      const [tenantsRes, usersRes, activityRes] = await Promise.all([
        fetch('/api/admin/tenants'),
        fetch('/api/admin/users'),
        fetch('/api/admin/activity?limit=20'),
      ]);

      if (!tenantsRes.ok || !usersRes.ok || !activityRes.ok) {
        if (tenantsRes.status === 403 || usersRes.status === 403 || activityRes.status === 403) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch data');
      }

      const tenantsData = await tenantsRes.json();
      const usersData = await usersRes.json();
      const activityData = await activityRes.json();

      setTenants(tenantsData || []);
      setTenantEdits(
        Object.fromEntries(
          (tenantsData || []).map((tenant) => [
            tenant.id,
            {
              planId: tenant.planId || 'essential',
              subscriptionStatus: tenant.subscriptionStatus || 'active',
            },
          ])
        )
      );
      setUsers(usersData || []);
      setUserEdits(
        Object.fromEntries(
          (usersData || []).map((user) => [
            user.id,
            {
              role: user.role || 'client',
              tenantName: user.tenantName || '',
              authProvider: user.authProvider || 'password',
              password: '',
            },
          ])
        )
      );
      setActivity({
        logs: activityData.logs || [],
      });
      setStats(activityData.stats || {
        totalTenants: tenantsData?.length || 0,
        totalUsers: usersData?.length || 0,
        totalApps: 0,
        totalPolicies: 0,
      });
    } catch (error) {
      console.error('Error fetching super admin data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setCreatingTenant(true);
    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantForm.name,
          assignUserEmail: tenantForm.assignUserEmail || undefined,
          planId: tenantForm.planId,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(payload.error || 'Failed to create tenant', 'error');
        return;
      }

      setTenantForm({ name: '', assignUserEmail: '', planId: 'essential' });
      await fetchData(true);
      showToast('Tenant created successfully.');
    } catch (err) {
      console.error('Error creating tenant:', err);
      showToast('Failed to create tenant.', 'error');
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleTenantEditChange = (tenantId, field, value) => {
    setTenantEdits((prev) => ({
      ...prev,
      [tenantId]: {
        ...(prev[tenantId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveTenant = async (tenantId) => {
    const pendingEdit = tenantEdits[tenantId];
    if (!pendingEdit) return;

    setSavingTenantId(tenantId);
    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          planId: pendingEdit.planId,
          subscriptionStatus: pendingEdit.subscriptionStatus,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(payload.error || 'Failed to update tenant subscription', 'error');
        return;
      }

      await fetchData(true);
      showToast('Tenant subscription updated successfully.');
    } catch (error) {
      console.error('Error updating tenant subscription:', error);
      showToast('Failed to update tenant subscription.', 'error');
    } finally {
      setSavingTenantId('');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userForm.email,
          password: userForm.authProvider === 'password' ? userForm.password : undefined,
          role: userForm.role,
          tenantName: userForm.tenantName,
          authProvider: userForm.authProvider,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(payload.error || 'Failed to create user', 'error');
        return;
      }

      setUserForm({
        email: '',
        password: '',
        role: 'admin',
        tenantName: userForm.tenantName,
        authProvider: 'password',
      });
      await fetchData(true);
      showToast('Managed user provisioned successfully.');
    } catch (err) {
      console.error('Error creating user:', err);
      showToast('Failed to create user.', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUserEditChange = (userId, field, value) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveUser = async (userId) => {
    const pendingEdit = userEdits[userId];
    const currentUser = users.find((item) => item.id === userId);
    if (!pendingEdit || !currentUser) return;

    setSavingUserId(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userId,
          role: pendingEdit.role,
          tenantName: pendingEdit.tenantName || null,
          authProvider: pendingEdit.authProvider,
          password: pendingEdit.authProvider === 'password' ? pendingEdit.password : undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(payload.error || 'Failed to update user access.', 'error');
        return;
      }

      await fetchData(true);
      showToast('User access updated successfully.');
    } catch (err) {
      console.error('Error updating user:', err);
      showToast('Failed to update user access.', 'error');
    } finally {
      setSavingUserId('');
    }
  };

  const handleRemoveUser = async (userId) => {
    const currentUser = users.find((item) => item.id === userId);
    if (!currentUser) return;

    const confirmed = window.confirm(`Remove managed access for ${currentUser.email}? This will delete the managed user record.`);
    if (!confirmed) return;

    setRemovingUserId(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(payload.error || 'Failed to remove managed access.', 'error');
        return;
      }

      await fetchData(true);
      showToast('Managed access removed successfully.');
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('Failed to remove managed access.', 'error');
    } finally {
      setRemovingUserId('');
    }
  };

  if (unauthorized) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You do not have permission to access this page.</p>
            <p className="text-sm text-gray-500">Super Admin access is required.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {toast ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              toast.tone === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            {loading ? (
              <SkeletonLoader variant="header" />
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg">
                    <ActivityIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">ATRAVA Defense Super Admin</h1>
                    <p className="text-sm text-gray-600">Platform-wide oversight and management</p>
                  </div>
                </div>
                {refreshing && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-blue-800">Refreshing...</span>
                  </div>
                )}
                {error && !refreshing && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-red-800">{error}</span>
                    <button
                      onClick={() => fetchData(false)}
                      className="ml-2 text-sm font-medium text-red-600 hover:text-red-800 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} variant="stat" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <PremiumStatCard
              title="Total Tenants"
              value={stats.totalTenants || tenants.length}
              icon={TenantIcon}
              subtitle="Managed organizations"
            />
            <PremiumStatCard
              title="Total Users"
              value={stats.totalUsers || users.length}
              icon={UsersIcon}
              subtitle="Platform operators and client users"
            />
            <PremiumStatCard
              title="Total Sites"
              value={stats.totalApps || tenants.reduce((sum, t) => sum + (t.appCount || 0), 0)}
              icon={AppsIcon}
              subtitle="Protected websites and applications"
            />
            <PremiumStatCard
              title="Total Policies"
              value={stats.totalPolicies || tenants.reduce((sum, t) => sum + (t.policyCount || 0), 0)}
              icon={ActivityIcon}
              subtitle="Active managed protection rules"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(145deg,#ffffff_0%,#f7fbff_60%,#f4faf8_100%)] p-3 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
          <nav className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_35px_rgba(15,23,42,0.16)]'
                    : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
                } rounded-[22px] border px-4 py-4 text-left transition`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
                  {tab.label}
                </span>
                <span className="mt-2 block text-sm font-medium">
                  {tab.description}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {loading ? (
              <>
                <SkeletonLoader variant="card" />
                <SkeletonLoader variant="card" />
              </>
            ) : (
              <>
                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(160deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Tenant Portfolio</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Recent Tenants</h3>
                    <p className="mt-2 text-sm text-slate-600">The latest managed accounts provisioned across your commercial footprint.</p>
                  </div>
                  <div className="space-y-3">
                    {tenants.slice(0, 5).map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <PlanBadge planName={tenant.plan?.name || tenant.planId || 'essential'} />
                        <CommercialStatusBadge status={tenant.subscriptionStatus} />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {tenant.userCount || 0} users • {tenant.appCount || 0} sites • {tenant.policyCount || 0} policies
                      </p>
                    </div>
                    <StatusBadge status="online" />
                  </div>
                ))}
                {tenants.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No tenants found</p>
                )}
                {tenants.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    Showing 5 of {tenants.length} tenants
                  </p>
                )}
              </div>
            </div>

                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(150deg,#081226_0%,#0f1e3a_52%,#12304f_100%)] p-6 text-white shadow-[0_20px_70px_rgba(8,18,38,0.26)]">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Operational Feed</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight">Recent Activity</h3>
                      <p className="mt-2 text-sm text-slate-300">Live operational events across tenants, surfaced in the same commercial console language.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-cyan-100">
                      <ActivityIcon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {activity.logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{log.message || 'Log Entry'}</p>
                          <p className="mt-2 text-xs text-slate-300">
                            {log.tenant?.name || 'Unknown tenant'} • {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <SeverityBadge severity={log.severity} />
                      </div>
                    ))}
                    {activity.logs.length === 0 && (
                      <p className="py-4 text-center text-sm text-slate-300">No recent activity</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'tenants' && (
          <>
            {loading ? (
              <SkeletonLoader variant="table" />
            ) : (
              <div className="space-y-6">
                <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(145deg,#f8fbff_0%,#eef6ff_55%,#f5fbf8_100%)] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Commercial Provisioning</p>
                        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Tenant Subscription Control</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          Provision managed tenants, attach commercial plans, and keep subscription status aligned with operational capacity before customers feel any limit pressure.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 sm:w-auto">
                        <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tenants</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{tenants.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Plans</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{PLAN_OPTIONS.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Active</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">
                            {tenants.filter((tenant) => (tenant.subscriptionStatus || 'active') === 'active').length}
                          </p>
                        </div>
                        <SeverityBadge severity={log.severity} />
                      </div>
                    </div>

                    <form onSubmit={handleCreateTenant} className="grid grid-cols-1 gap-4 rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-sm md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.15fr)_minmax(240px,0.9fr)_180px]">
                      <input
                        type="text"
                        value={tenantForm.name}
                        onChange={(e) => setTenantForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Tenant name"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <input
                        type="email"
                        value={tenantForm.assignUserEmail}
                        onChange={(e) => setTenantForm((prev) => ({ ...prev, assignUserEmail: e.target.value }))}
                        placeholder="Assign user email (optional)"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={tenantForm.planId}
                        onChange={(e) => setTenantForm((prev) => ({ ...prev, planId: e.target.value }))}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {PLAN_OPTIONS.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ({plan.price})
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={creatingTenant || !tenantForm.name.trim()}
                        className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {creatingTenant ? 'Creating...' : 'Create Tenant'}
                      </button>
                    </form>
                  </div>
                </section>

                <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Commercial Accounts</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">All Tenants</h3>
                    </div>
                    <p className="text-sm text-slate-500">Plan assignment remains controlled by the super admin team.</p>
                  </div>

                  <div className="mt-6 space-y-4">
                    {tenants.map((tenant) => (
                      <article key={tenant.id} className="rounded-[26px] border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-sm">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xl font-semibold tracking-tight text-slate-950">{tenant.name}</h4>
                              <PlanBadge planName={tenant.plan?.name || tenant.planId || 'essential'} />
                              <CommercialStatusBadge status={tenant.subscriptionStatus} />
                            </div>
                            <p className="mt-2 text-sm text-slate-500">{tenant.id}</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Users</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{tenant.userCount || 0}</p>
                              </div>
                              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sites</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{tenant.appCount || 0}</p>
                              </div>
                              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Policies</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-950">{tenant.policyCount || 0}</p>
                              </div>
                            </div>
                            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
                              Created {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '-'}
                            </p>
                          </div>

                          <div className="grid w-full gap-3 xl:w-[380px]">
                            <select
                              value={tenantEdits[tenant.id]?.planId || tenant.planId || 'essential'}
                              onChange={(e) => handleTenantEditChange(tenant.id, 'planId', e.target.value)}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {PLAN_OPTIONS.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                  {plan.name} ({plan.price})
                                </option>
                              ))}
                            </select>
                            <select
                              value={tenantEdits[tenant.id]?.subscriptionStatus || tenant.subscriptionStatus || 'active'}
                              onChange={(e) => handleTenantEditChange(tenant.id, 'subscriptionStatus', e.target.value)}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="active">active</option>
                              <option value="trialing">trialing</option>
                              <option value="past_due">past_due</option>
                              <option value="suspended">suspended</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleSaveTenant(tenant.id)}
                              disabled={savingTenantId === tenant.id}
                              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              {savingTenantId === tenant.id ? 'Saving...' : 'Save Subscription Changes'}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}

                    {tenants.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
                        No tenants found
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <>
            {loading ? (
              <SkeletonLoader variant="table" />
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Provision Managed User</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Create password-based or Google-authorized accounts and bind them to a managed tenant.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedTenantFilter}
                        onChange={(e) => setSelectedTenantFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Tenants</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <form onSubmit={handleCreateUser} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.9fr)_150px_180px_minmax(0,1.2fr)]">
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="User email"
                      className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <select
                      value={userForm.tenantName}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, tenantName: e.target.value }))}
                      className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                      className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="client">Client</option>
                    </select>
                    <select
                      value={userForm.authProvider}
                      onChange={(e) =>
                        setUserForm((prev) => ({
                          ...prev,
                          authProvider: e.target.value,
                          password: e.target.value === 'password' ? prev.password : '',
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="password">Email + Password</option>
                      <option value="google">Google</option>
                    </select>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder={userForm.authProvider === 'password' ? 'Password' : 'Not required for Google'}
                        disabled={userForm.authProvider !== 'password'}
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      <button
                        type="submit"
                        disabled={
                          creatingUser ||
                          !userForm.email.trim() ||
                          !userForm.tenantName ||
                          (userForm.authProvider === 'password' && userForm.password.length < 6)
                        }
                        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creatingUser ? 'Creating...' : 'Create User'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1120px] divide-y divide-gray-200">
                      <thead className="bg-gray-50/90">
                        <tr>
                          <th className="w-[26%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                          <th className="w-[12%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                          <th className="w-[18%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tenant</th>
                          <th className="w-[22%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Auth</th>
                          <th className="w-[10%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                          <th className="w-[8%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                          <th className="w-[14%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users
                          .filter((user) => {
                            if (selectedTenantFilter === 'all') return true;
                            return user.tenantName === selectedTenantFilter;
                          })
                          .map((user) => (
                            <tr key={user.id} className="align-top transition-colors hover:bg-slate-50/70">
                              <td className="px-6 py-4">
                                <div className="max-w-[260px] break-words text-sm font-semibold text-gray-900">{user.email}</div>
                              </td>
                              <td className="px-6 py-4 align-top">
                                {user.role === 'super_admin' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    super_admin
                                  </span>
                                ) : (
                                  <select
                                    value={userEdits[user.id]?.role || user.role || 'client'}
                                    onChange={(e) => handleUserEditChange(user.id, 'role', e.target.value)}
                                    className="w-full min-w-[120px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="admin">admin</option>
                                    <option value="client">client</option>
                                  </select>
                                )}
                              </td>
                              <td className="px-6 py-4 align-top text-sm text-gray-900">
                                {user.role === 'super_admin' ? (
                                  '-'
                                ) : (
                                  <select
                                    value={userEdits[user.id]?.tenantName ?? user.tenantName ?? ''}
                                    onChange={(e) => handleUserEditChange(user.id, 'tenantName', e.target.value)}
                                    className="w-full min-w-[170px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Unassigned</option>
                                    {tenants.map((tenant) => (
                                      <option key={tenant.id} value={tenant.id}>
                                        {tenant.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td className="min-w-[260px] px-6 py-4 align-top text-sm text-gray-500">
                                {user.role === 'super_admin' ? (
                                  user.authProvider || 'password'
                                ) : (
                                  <div className="flex min-w-[220px] flex-col gap-2">
                                    <select
                                      value={userEdits[user.id]?.authProvider || user.authProvider || 'password'}
                                      onChange={(e) => handleUserEditChange(user.id, 'authProvider', e.target.value)}
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="password">password</option>
                                      <option value="google">google</option>
                                    </select>
                                    <input
                                      type="password"
                                      value={userEdits[user.id]?.password || ''}
                                      onChange={(e) => handleUserEditChange(user.id, 'password', e.target.value)}
                                      placeholder={
                                        (userEdits[user.id]?.authProvider || user.authProvider || 'password') === 'password'
                                          ? 'Set new password'
                                          : 'Not required for Google'
                                      }
                                      disabled={(userEdits[user.id]?.authProvider || user.authProvider || 'password') !== 'password'}
                                      className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 align-top text-sm text-gray-500">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    user.invitationPending
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {user.invitationPending ? 'Pending activation' : 'Active'}
                                </span>
                              </td>
                              <td className="px-6 py-4 align-top text-sm text-gray-500">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-6 py-4 align-top">
                                {user.role === 'super_admin' ? (
                                  <span className="text-xs text-gray-400">Protected</span>
                                ) : (
                                  <div className="flex min-w-[120px] flex-col gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveUser(user.id)}
                                      disabled={
                                        savingUserId === user.id ||
                                        (
                                          (userEdits[user.id]?.authProvider || user.authProvider || 'password') === 'password' &&
                                          (
                                            (user.authProvider || 'password') !== 'password' ||
                                            String(userEdits[user.id]?.password || '').length > 0
                                          ) &&
                                          String(userEdits[user.id]?.password || '').length < 6
                                        )
                                      }
                                      className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {savingUserId === user.id ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveUser(user.id)}
                                      disabled={removingUserId === user.id}
                                      className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                    >
                                      {removingUserId === user.id ? 'Removing...' : 'Remove'}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        {users.filter((user) => {
                          if (selectedTenantFilter === 'all') return true;
                          return user.tenantName === selectedTenantFilter;
                        }).length === 0 && (
                          <tr>
                            <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                              No users found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'activity' && (
          <>
            {loading ? (
              <div className="space-y-6">
                <SkeletonLoader variant="card" />
                <SkeletonLoader variant="card" />
              </div>
            ) : (
              <div className="space-y-6">

            <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(145deg,#f8fbff_0%,#eef6ff_55%,#f5fbf8_100%)] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Operations Timeline</p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Recent Activity Stream</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Review the latest tenant-impacting events, triage signals by severity, and keep the operational picture aligned with your commercial commitments.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/70 bg-white/75 px-5 py-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Events surfaced</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{activity.logs.length}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {activity.logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex flex-col gap-4 rounded-[24px] border border-white/75 bg-white/80 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={log.severity} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {log.tenant?.name || 'Unknown tenant'}
                        </span>
                      </div>
                      <p className="mt-3 text-base font-semibold text-slate-950">{log.message || 'Log Entry'}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Tenant: {log.tenant?.name || 'Unknown'} • {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Source</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">Activity Log</p>
                    </div>
                  </div>
                ))}
                {activity.logs.length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-500">No logs found</p>
                )}
              </div>
            </section>
              </div>
            )}
          </>
        )}

      </div>
    </Layout>
  );
}
