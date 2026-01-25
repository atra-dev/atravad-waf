'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AppsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    domain: '',
    origins: [{ url: '', weight: 100, healthCheck: { path: '/health', interval: 30, timeout: 5 } }],
    policyId: '',
    autoSSL: true,
    trafficMode: 'detection',
    canaryPercent: 0,
    bodyLimitBytes: 1048576,
  });
  const [policies, setPolicies] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApps();
    fetchPolicies();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Prepare data for API - ensure origins have valid URLs
      const validOrigins = formData.origins.filter(origin => origin.url.trim() !== '');
      
      if (validOrigins.length === 0) {
        alert('Please provide at least one origin server URL');
        setSubmitting(false);
        return;
      }

      const apiData = {
        name: formData.name,
        domain: formData.domain,
        origins: validOrigins,
        policyId: formData.policyId || null,
        autoSSL: formData.autoSSL,
        // Set ssl config if autoSSL is enabled (for future Let's Encrypt integration)
        ssl: formData.autoSSL ? { autoProvision: true } : null,
        routing: { pathPrefix: '/', stripPath: false },
        trafficMode: formData.trafficMode,
        canaryPercent: formData.canaryPercent,
        bodyLimitBytes: formData.bodyLimitBytes,
      };

      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        setFormData({ 
          name: '', 
          domain: '',
          origins: [{ url: '', weight: 100, healthCheck: { path: '/health', interval: 30, timeout: 5 } }],
          policyId: '',
          autoSSL: true,
          trafficMode: 'detection',
          canaryPercent: 0,
          bodyLimitBytes: 1048576,
        });
        setShowForm(false);
        fetchApps();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create application');
      }
    } catch (error) {
      console.error('Error creating app:', error);
      alert('Failed to create application');
    } finally {
      setSubmitting(false);
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your protected web applications
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all duration-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{showForm ? 'Cancel' : 'New Application'}</span>
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Register New Application
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Application Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  placeholder="e.g., Production API"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border transition-colors"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Traffic Mode
                  </label>
                  <select
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
                    value={formData.trafficMode}
                    onChange={(e) => setFormData({ ...formData, trafficMode: e.target.value })}
                  >
                    <option value="off">Off (bypass WAF)</option>
                    <option value="detection">Detection (log only)</option>
                    <option value="prevention">Prevention (block)</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Start with Detection; switch to Prevention after validation. Use canary for gradual rollout.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Canary Percentage (Prevention rollout)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
                    value={formData.canaryPercent}
                    onChange={(e) => setFormData({ ...formData, canaryPercent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                    disabled={formData.trafficMode !== 'prevention'}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Percentage of traffic enforced in Prevention. Remainder stays in Detection.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Request Body Limit (bytes)
                </label>
                <input
                  type="number"
                  min="10240"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
                  value={formData.bodyLimitBytes}
                  onChange={(e) => setFormData({ ...formData, bodyLimitBytes: parseInt(e.target.value) || 1048576 })}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Requests above this size return 413 before WAF inspection. Default 1 MB.
                </p>
              </div>
              <div>
                <label
                  htmlFor="domain"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Domain
                </label>
                <input
                  type="text"
                  id="domain"
                  required
                  placeholder="e.g., api.example.com"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border transition-colors"
                  value={formData.domain}
                  onChange={(e) =>
                    setFormData({ ...formData, domain: e.target.value })
                  }
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter the domain name that will be protected. Point your DNS to ATRAVAD WAF IPs.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Origin Server(s)
                </label>
                <p className="mb-3 text-xs text-gray-500">
                  Your origin server URL(s) where traffic will be forwarded after WAF inspection.
                </p>
                {formData.origins.map((origin, index) => (
                  <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Origin URL *
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://origin.example.com"
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                          value={origin.url}
                          onChange={(e) => {
                            const newOrigins = [...formData.origins];
                            newOrigins[index].url = e.target.value;
                            setFormData({ ...formData, origins: newOrigins });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Weight (1-100)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                          value={origin.weight}
                          onChange={(e) => {
                            const newOrigins = [...formData.origins];
                            newOrigins[index].weight = parseInt(e.target.value) || 100;
                            setFormData({ ...formData, origins: newOrigins });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Health Check Path
                        </label>
                        <input
                          type="text"
                          placeholder="/health"
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                          value={origin.healthCheck?.path || '/health'}
                          onChange={(e) => {
                            const newOrigins = [...formData.origins];
                            newOrigins[index].healthCheck = {
                              ...newOrigins[index].healthCheck,
                              path: e.target.value || '/health',
                              interval: newOrigins[index].healthCheck?.interval || 30,
                              timeout: newOrigins[index].healthCheck?.timeout || 5
                            };
                            setFormData({ ...formData, origins: newOrigins });
                          }}
                        />
                      </div>
                    </div>
                    {formData.origins.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOrigins = formData.origins.filter((_, i) => i !== index);
                          setFormData({ ...formData, origins: newOrigins });
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-700"
                      >
                        Remove Origin
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      origins: [
                        ...formData.origins,
                        { url: '', weight: 100, healthCheck: { path: '/health', interval: 30, timeout: 5 } }
                      ]
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Another Origin
                </button>
              </div>

              <div>
                <label htmlFor="policyId" className="block text-sm font-semibold text-gray-700 mb-2">
                  Security Policy (Optional)
                </label>
                <select
                  id="policyId"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
                  value={formData.policyId}
                  onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                >
                  <option value="">None (Use Default Protection)</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name} (v{policy.version})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Select a security policy to apply. If none selected, default OWASP CRS protection will be used.
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoSSL"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={formData.autoSSL}
                  onChange={(e) => setFormData({ ...formData, autoSSL: e.target.checked })}
                />
                <label htmlFor="autoSSL" className="ml-2 block text-sm text-gray-700">
                  Auto-provision SSL certificate (Let's Encrypt)
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
                      <span>Creating...</span>
                    </span>
                  ) : (
                    'Create Application'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Registered Applications
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {apps.length} {apps.length === 1 ? 'application' : 'applications'} registered
            </p>
          </div>
          {apps.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-gray-900">No applications</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by registering your first application.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Application Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Origin Server(s)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Policy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Traffic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apps.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-50 rounded-lg">
                            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{app.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">{app.domain}</div>
                      </td>
                      <td className="px-6 py-4">
                        {app.origins && app.origins.length > 0 ? (
                          <div className="text-sm text-gray-900">
                            {app.origins.map((origin, idx) => (
                              <div key={idx} className="font-mono text-xs">
                                {origin.url}
                                {origin.weight && origin.weight !== 100 && (
                                  <span className="ml-2 text-gray-500">(weight: {origin.weight})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">No origin configured</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {app.policyId ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Policy Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Default (OWASP CRS)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900">
                          Mode: {app.trafficMode || 'detection'}
                        </div>
                        {app.trafficMode === 'prevention' && (
                          <div className="text-[11px] text-gray-500">Canary: {app.canaryPercent ?? 0}%</div>
                        )}
                        {app.bodyLimitBytes && (
                          <div className="text-[11px] text-gray-500">Body limit: {app.bodyLimitBytes} bytes</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(app.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
