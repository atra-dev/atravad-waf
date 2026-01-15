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
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    fetchVersions();
    fetchNodes();
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

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/nodes');
      const data = await response.json();
      if (Array.isArray(data)) {
        setNodes(data);
      }
    } catch (error) {
      console.error('Error fetching nodes:', error);
    }
  };

  const handleDeploy = async () => {
    if (!selectedVersion || selectedNodes.length === 0) {
      alert('Please select at least one node to deploy to');
      return;
    }

    if (!confirm(`Deploy "${policyName}" Version ${selectedVersion.version} to ${selectedNodes.length} node(s)?`)) {
      return;
    }

    setDeploying(true);
    try {
      const response = await fetch(`/api/deploy/${selectedVersion.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeIds: selectedNodes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Deployment initiated! Deployment ID: ${data.deploymentId}\n\nNodes will fetch the configuration automatically.`);
        setShowDeployModal(false);
        setSelectedNodes([]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to deploy policy');
      }
    } catch (error) {
      console.error('Error deploying policy:', error);
      alert('Failed to deploy policy');
    } finally {
      setDeploying(false);
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{policyName}</h1>
            <p className="text-sm text-gray-500 mt-1">Policy Versions</p>
          </div>
          {selectedVersion && (
            <button
              onClick={() => setShowDeployModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm hover:shadow transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Deploy</span>
            </button>
          )}
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

        {/* Deploy Modal */}
        {showDeployModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Deploy Policy: {policyName} (Version {selectedVersion?.version})
                </h2>
                <button
                  onClick={() => {
                    setShowDeployModal(false);
                    setSelectedNodes([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Select the nodes you want to deploy this policy to. The ModSecurity configuration will be automatically generated and sent to selected nodes.
                </p>
                
                {nodes.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      No nodes registered yet. Please register a node first from the WAF Nodes page.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nodes.map((node) => (
                      <label
                        key={node.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedNodes.includes(node.id)
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNodes.includes(node.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNodes([...selectedNodes, node.id]);
                            } else {
                              setSelectedNodes(selectedNodes.filter(id => id !== node.id));
                            }
                          }}
                          className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">{node.name}</p>
                            <StatusBadge status={node.status || 'offline'} />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{node.ipAddress}</p>
                          {node.lastSeen && (
                            <p className="text-xs text-gray-400 mt-1">
                              Last seen: {new Date(node.lastSeen).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDeployModal(false);
                    setSelectedNodes([]);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                  disabled={deploying}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={deploying || selectedNodes.length === 0 || nodes.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deploying ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Deploying...</span>
                    </>
                  ) : (
                    <span>Deploy to {selectedNodes.length} Node{selectedNodes.length !== 1 ? 's' : ''}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
