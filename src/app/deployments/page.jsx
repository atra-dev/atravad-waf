'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function DeploymentsPage() {
  // Verify authentication
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState([]);
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeployments();
      fetchPolicies();
      fetchNodes();
    }
  }, [isAuthenticated]);

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

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/deploy');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setDeployments(data);
      }
    } catch (error) {
      console.error('Error fetching deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNodeName = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.name : nodeId;
  };

  const getPolicyName = (policyId) => {
    const policy = policies.find(p => p.id === policyId);
    return policy ? `${policy.name} (v${policy.version})` : policyId;
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useAuth hook
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deployment History</h1>
          <p className="mt-2 text-sm text-gray-600">
            View timeline of all policy deployments and their status
          </p>
        </div>

        {deployments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-gray-900">No deployments</h3>
            <p className="mt-2 text-sm text-gray-500">
              Deploy policies to WAF nodes to see deployment history here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Deployments ({deployments.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {deployments.map((deployment) => (
                <div key={deployment.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getPolicyName(deployment.policyId)}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(deployment.status)}`}>
                          {deployment.status || 'pending'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Deployed At</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {deployment.deployedAt
                              ? new Date(deployment.deployedAt).toLocaleString()
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Nodes</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {deployment.nodeIds?.length || 0} node(s)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Deployed By</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {deployment.deployedBy || 'System'}
                          </p>
                        </div>
                      </div>

                      {deployment.nodeIds && deployment.nodeIds.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Target Nodes</p>
                          <div className="flex flex-wrap gap-2">
                            {deployment.nodeIds.map((nodeId) => (
                              <span
                                key={nodeId}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {getNodeName(nodeId)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {deployment.nodeStatuses && Object.keys(deployment.nodeStatuses).length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Node Status</p>
                          <div className="space-y-2">
                            {Object.entries(deployment.nodeStatuses).map(([nodeId, status]) => (
                              <div key={nodeId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-700">{getNodeName(nodeId)}</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
                                  {status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <Link
                        href={`/policies/${deployment.policyName || deployment.policyId}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Policy →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
