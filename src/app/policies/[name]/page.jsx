'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';

export default function PolicyVersionsPage() {
  const params = useParams();
  const policyName = decodeURIComponent(params.name);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    fetchVersions();
  }, [policyName]);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/policies?name=${encodeURIComponent(policyName)}`);
      const data = await response.json();
      
      // Ensure versions is always an array
      if (Array.isArray(data)) {
        const sorted = data.sort((a, b) => b.version - a.version);
        setVersions(sorted);
        if (sorted.length > 0) {
          setSelectedVersion(sorted[0]);
        }
      } else if (data.error) {
        console.error('API Error:', data.error);
        setVersions([]);
      } else {
        setVersions([]);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };


  const handleRollback = async (versionId) => {
    if (!confirm('Are you sure you want to rollback to this version? This will create a new version with these settings.')) {
      return;
    }

    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return;

      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: version.name,
          sqlInjection: version.policy.sqlInjection,
          xss: version.policy.xss,
          fileUpload: version.policy.fileUpload,
          applicationId: version.applicationId || null,
        }),
      });

      if (response.ok) {
        alert('Policy rolled back successfully!');
        fetchVersions();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to rollback policy');
      }
    } catch (error) {
      console.error('Error rolling back policy:', error);
      alert('Failed to rollback policy');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{policyName}</h1>
          <p className="text-sm text-gray-500 mt-1">Policy Versions</p>
          <p className="text-xs text-blue-600 mt-2">
            💡 Tip: Assign this policy to an application in the Applications page to use it with the proxy WAF.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Versions
            </h2>
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedVersion?.id === version.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        Version {version.version}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {version.version !== versions[0].version && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRollback(version.id);
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedVersion && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Version {selectedVersion.version} Details
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Protections
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span
                        className={`w-3 h-3 rounded-full mr-2 ${
                          selectedVersion.policy.sqlInjection
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-700">
                        SQL Injection Protection
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`w-3 h-3 rounded-full mr-2 ${
                          selectedVersion.policy.xss
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-700">
                        XSS Protection
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`w-3 h-3 rounded-full mr-2 ${
                          selectedVersion.policy.fileUpload
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-700">
                        File Upload Protection
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    ModSecurity Configuration
                  </h3>
                  <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64">
                    {selectedVersion.modSecurityConfig}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(selectedVersion.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
