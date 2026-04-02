'use client';

import { useEffect, useState } from 'react';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';

const userInputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500';

const userModalShellClassName =
  'w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950';

export default function TenantUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [createFormData, setCreateFormData] = useState({
    email: '',
    role: 'client',
  });

  const [editFormData, setEditFormData] = useState({
    role: 'client',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tenant/users');
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'Failed to load users';
        if (msg === 'User is not assigned to a tenant') {
          setError('You are not assigned to a tenant. Contact your administrator to get access.');
          setUsers([]);
          return;
        }
        throw new Error(msg);
      }
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading tenant users:', err);
      setError(err.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = async (inviteLink) => {
    if (!inviteLink) return false;

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteLink);
      return true;
    }

    const tempInput = document.createElement('textarea');
    tempInput.value = inviteLink;
    tempInput.setAttribute('readonly', '');
    tempInput.style.position = 'absolute';
    tempInput.style.left = '-9999px';
    document.body.appendChild(tempInput);
    tempInput.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(tempInput);
    return copied;
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-100">Tenant Users</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Invite and manage members for your organization.
            </p>
          </div>
          <button
            onClick={() => {
              setCreateFormData({ email: '', role: 'client' });
              setShowCreateModal(true);
            }}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            + Invite Member
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border-l-4 border-red-400 bg-red-50 p-4 dark:border-red-500 dark:bg-red-950/35">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {feedback && (
          <div
            className={`rounded-2xl border-l-4 p-4 ${
              feedback.tone === 'success'
                ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/35'
                : 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/35'
            }`}
          >
            <p
              className={`text-sm ${
                feedback.tone === 'success' ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'
              }`}
            >
              {feedback.message}
            </p>
          </div>
        )}

        {loading ? (
          <AppLoadingState
            variant="panel"
            title="Loading tenant users"
            message="Preparing managed access, user roles, and organization members."
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/90">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/75">
                  {users.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900/70">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {user.role || 'client'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.invitationPending
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          }`}
                        >
                          {user.invitationPending ? 'Invite Pending' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setEditFormData({
                                role: user.role || 'client',
                              });
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 transition hover:text-blue-900 focus:outline-none dark:text-blue-300 dark:hover:text-blue-200"
                            title="Edit user"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 transition hover:text-red-900 focus:outline-none dark:text-red-300 dark:hover:text-red-200"
                            title="Delete user"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className={userModalShellClassName}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invite New Member</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 transition hover:text-slate-600 focus:outline-none dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setActionLoading(true);
                  setFeedback(null);
                  try {
                    const res = await fetch('/api/tenant/users', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(createFormData),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || 'Failed to create user');
                    }

                    const copied = await copyInviteLink(data.inviteLink);
                    setShowCreateModal(false);
                    setCreateFormData({ email: '', role: 'client' });
                    await fetchUsers();
                    if (data.inviteEmailSent) {
                      setFeedback({
                        tone: 'success',
                        message: copied
                          ? `Invite email sent to ${data.email}. The setup link was also copied to your clipboard.`
                          : `Invite email sent to ${data.email}.`,
                      });
                    } else if (data.inviteLink) {
                      setFeedback({
                        tone: copied ? 'success' : 'warning',
                        message: copied
                          ? `Invite created for ${data.email}, but the email could not be sent. The password setup link has been copied to your clipboard.`
                          : `Invite created for ${data.email}, but the email could not be sent. Copy the setup link manually: ${data.inviteLink}`,
                      });
                    } else {
                      setFeedback({
                        tone: 'warning',
                        message: `Invite created for ${data.email}, but the email and password setup link could not be generated automatically.`,
                      });
                    }
                  } catch (err) {
                    alert(err.message || 'Failed to invite user');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={createFormData.email}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@gmail.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Role
                  </label>
                  <select
                    value={createFormData.role}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, role: e.target.value })
                    }
                    className={userInputClassName}
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Sending Invite...' : 'Send Invite'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The system sends a Firebase password setup email and also keeps a copyable fallback link.
                </p>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className={userModalShellClassName}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit User</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 transition hover:text-slate-600 focus:outline-none dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Email:{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {selectedUser.email}
                  </span>
                </p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setActionLoading(true);
                  try {
                    const res = await fetch('/api/tenant/users', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: selectedUser.email,
                        ...editFormData,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || 'Failed to update user');
                    }
                    setShowEditModal(false);
                    setSelectedUser(null);
                    await fetchUsers();
                  } catch (err) {
                    alert(err.message || 'Failed to update user');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, role: e.target.value })
                    }
                    className={userInputClassName}
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className={userModalShellClassName}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-300">Delete User</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-slate-400 transition hover:text-slate-600 focus:outline-none dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="mb-4">
                <p className="mb-2 text-sm text-slate-700 dark:text-slate-300">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/80">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedUser.email}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Role: {selectedUser.role || 'client'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      const res = await fetch('/api/tenant/users', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: selectedUser.email }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        throw new Error(data.error || 'Failed to delete user');
                      }
                      setShowDeleteModal(false);
                      setSelectedUser(null);
                      await fetchUsers();
                    } catch (err) {
                      alert(err.message || 'Failed to delete user');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="rounded-xl bg-red-600 px-4 py-2 text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}


