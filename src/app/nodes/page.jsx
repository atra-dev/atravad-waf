'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatusBadge from '@/components/StatusBadge';

export default function NodesPage() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', ip: '' });
  const [submitting, setSubmitting] = useState(false);
  const [newNodeId, setNewNodeId] = useState(null);
  const [newNodeApiKey, setNewNodeApiKey] = useState(null);
  const [showNodeIdModal, setShowNodeIdModal] = useState(false);
  const [deleteNode, setDeleteNode] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/nodes');
      const data = await response.json();
      
      // Ensure nodes is always an array
      if (Array.isArray(data)) {
        setNodes(data);
      } else if (data.error) {
        console.error('API Error:', data.error);
        setNodes([]);
      } else {
        setNodes([]);
      }
    } catch (error) {
      console.error('Error fetching nodes:', error);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setNewNodeId(data.id);
        setNewNodeApiKey(data.apiKey || null); // Store API key from response
        setFormData({ name: '', ip: '' });
        setShowForm(false);
        setShowNodeIdModal(true);
        fetchNodes();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to register node');
      }
    } catch (error) {
      console.error('Error registering node:', error);
      alert('Failed to register node');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (node) => {
    setDeleteNode(node);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteNode) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/nodes/${deleteNode.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the deleted node from the list optimistically
        setNodes(nodes.filter(n => n.id !== deleteNode.id));
        setShowDeleteModal(false);
        setDeleteNode(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete node');
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      alert('Failed to delete node');
    } finally {
      setDeleting(false);
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

  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const offlineNodes = nodes.length - onlineNodes;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WAF Nodes</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage and monitor your WAF deployment nodes
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/nodes/guide"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>View Guide</span>
            </Link>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all duration-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{showForm ? 'Cancel' : 'Register Node'}</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Nodes</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{nodes.length}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-gray-50 rounded-lg">
                <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{onlineNodes}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offline</p>
                <p className="mt-2 text-3xl font-bold text-red-600">{offlineNodes}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-lg">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Register New WAF Node
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Node Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  placeholder="e.g., Production Node 1"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border transition-colors"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="ip"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  IP Address
                </label>
                <input
                  type="text"
                  id="ip"
                  required
                  placeholder="e.g., 192.168.1.100"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border transition-colors font-mono"
                  value={formData.ip}
                  onChange={(e) =>
                    setFormData({ ...formData, ip: e.target.value })
                  }
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter the IP address or hostname where the WAF node is deployed
                </p>
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
                      <span>Registering...</span>
                    </span>
                  ) : (
                    'Register Node'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Registered Nodes
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} registered
            </p>
          </div>
          {nodes.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-gray-900">No nodes registered</h3>
              <p className="mt-2 text-sm text-gray-500">
                Register your first WAF node to start deploying security policies.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Node Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Node ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      API Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {nodes.map((node) => (
                    <tr key={node.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-50 rounded-lg">
                            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{node.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <code className="text-xs text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 max-w-xs truncate">
                            {node.id}
                          </code>
                          <button
                            onClick={(e) => {
                              navigator.clipboard.writeText(node.id);
                              // Show a brief feedback
                              const btn = e.currentTarget;
                              const originalHTML = btn.innerHTML;
                              btn.innerHTML = '<svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
                              setTimeout(() => {
                                btn.innerHTML = originalHTML;
                              }, 1000);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                            title="Copy Secure Node ID (Keep secret!)"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">{node.ip}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={node.status || 'offline'} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {node.lastSeen
                          ? new Date(node.lastSeen).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : <span className="text-gray-400">Never</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(node.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {node.apiKeyPrefix ? (
                            <div className="flex items-center space-x-2">
                              <code className="text-xs font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 text-gray-600">
                                {node.apiKeyPrefix}...
                              </code>
                              <span className="text-xs text-green-600 font-medium">✓ Configured</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No key</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedNode(node);
                              setShowApiKeyModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Manage API key"
                          >
                            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            Key
                          </button>
                          <button
                            onClick={() => handleDeleteClick(node)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete node"
                          >
                            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deleteNode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-gray-900">Delete Node</h2>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete <strong>{deleteNode.name}</strong>? This action cannot be undone.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-red-800 mb-1">⚠️ Warning</p>
                  <p className="text-xs text-red-700">
                    Deleting this node will remove it from the system. The node will no longer receive configuration updates or report health status. 
                    Related health history and logs will remain for audit purposes.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteNode(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deleting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Node</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Node Registration Success Modal - Shows Node ID and API Key */}
        {showNodeIdModal && newNodeId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 my-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Node Registered Successfully! 🎉
                </h2>
                <button
                  onClick={() => {
                    setShowNodeIdModal(false);
                    setNewNodeId(null);
                    setNewNodeApiKey(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 space-y-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-semibold text-yellow-800">
                        ⚠️ CRITICAL: Save These Credentials Now
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        The API key will <strong>NOT be shown again</strong>. You must save it now to configure your node connector software.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Node ID Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    🔑 Secure Node ID
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-sm font-mono bg-white px-3 py-2 rounded border border-gray-300 text-gray-900 break-all">
                      {newNodeId}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newNodeId);
                        alert('Node ID copied to clipboard!');
                      }}
                      className="px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors flex items-center space-x-1 flex-shrink-0"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* API Key Section - Most Important */}
                {newNodeApiKey && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <label className="block text-xs font-semibold text-red-800 mb-2">
                      🔐 Node API Key (SHOW ONCE - SAVE NOW!)
                    </label>
                    <p className="text-xs text-red-700 mb-3">
                      This is your node's authentication key. <strong>Copy and save it securely</strong> - it will not be displayed again. You'll need this to configure the node connector software.
                    </p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm font-mono bg-white px-3 py-2 rounded border-2 border-red-300 text-gray-900 break-all">
                        {newNodeApiKey}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(newNodeApiKey);
                          alert('API Key copied to clipboard! Save it securely - it will not be shown again.');
                        }}
                        className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors flex items-center space-x-1 flex-shrink-0"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">📋 Next Steps:</p>
                  <ol className="text-xs text-blue-700 list-decimal list-inside space-y-1">
                    <li>Save both the Node ID and API Key securely</li>
                    <li>Install the node connector software on your server</li>
                    <li>Configure the connector with these credentials</li>
                    <li>See the WAF Nodes Guide for detailed instructions</li>
                  </ol>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setShowNodeIdModal(false);
                    setNewNodeId(null);
                    setNewNodeApiKey(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  I've Saved the Credentials
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Key Management Modal */}
        {showApiKeyModal && selectedNode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  API Key Management
                </h2>
                <button
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setSelectedNode(null);
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
                  Manage API key for <strong>{selectedNode.name}</strong>
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Current API Key Prefix
                  </label>
                  {selectedNode.apiKeyPrefix ? (
                    <code className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-300 text-gray-900 block">
                      {selectedNode.apiKeyPrefix}...
                    </code>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No API key configured</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    For security, only the first 12 characters are displayed. The full key is never shown after initial creation.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to rotate the API key? The old key will be invalidated and you\'ll need to update your node connector with the new key.')) {
                        return;
                      }
                      setRotating(true);
                      try {
                        const response = await fetch(`/api/nodes/${selectedNode.id}/rotate-key`, {
                          method: 'POST',
                        });
                        if (response.ok) {
                          const data = await response.json();
                          alert(`New API key generated! Save it now: ${data.newApiKey}\n\nThis key will not be shown again.`);
                          fetchNodes();
                          setShowApiKeyModal(false);
                          setSelectedNode(null);
                        } else {
                          const error = await response.json();
                          alert(error.error || 'Failed to rotate API key');
                        }
                      } catch (error) {
                        console.error('Error rotating API key:', error);
                        alert('Failed to rotate API key');
                      } finally {
                        setRotating(false);
                      }
                    }}
                    disabled={rotating}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {rotating ? 'Rotating...' : 'Rotate API Key'}
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to revoke the API key? This will disable the node and it will no longer be able to connect.')) {
                        return;
                      }
                      try {
                        const response = await fetch(`/api/nodes/${selectedNode.id}/revoke-key`, {
                          method: 'POST',
                        });
                        if (response.ok) {
                          alert('API key revoked. Node is now disabled.');
                          fetchNodes();
                          setShowApiKeyModal(false);
                          setSelectedNode(null);
                        } else {
                          const error = await response.json();
                          alert(error.error || 'Failed to revoke API key');
                        }
                      } catch (error) {
                        console.error('Error revoking API key:', error);
                        alert('Failed to revoke API key');
                      }
                    }}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Revoke API Key
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setSelectedNode(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
