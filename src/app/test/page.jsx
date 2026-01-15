'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

export default function TestPage() {
  // Verify authentication
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [testRequest, setTestRequest] = useState({
    method: 'GET',
    url: '/api/users',
    headers: {},
    query: {},
    body: {},
  });
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [queryKey, setQueryKey] = useState('');
  const [queryValue, setQueryValue] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchPolicies();
    }
  }, [isAuthenticated]);

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/policies');
      const data = await response.json();
      if (Array.isArray(data)) {
        setPolicies(data);
        if (data.length > 0) {
          // Get latest version of first policy
          const latestPolicy = data.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
          setSelectedPolicy(latestPolicy.id);
        }
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!selectedPolicy) {
      alert('Please select a policy');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/modsecurity/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: selectedPolicy,
          testRequest,
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Error testing request:', error);
      alert('Failed to test request');
    } finally {
      setTesting(false);
    }
  };

  const addHeader = () => {
    if (headerKey && headerValue) {
      setTestRequest({
        ...testRequest,
        headers: { ...testRequest.headers, [headerKey]: headerValue },
      });
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const removeHeader = (key) => {
    const newHeaders = { ...testRequest.headers };
    delete newHeaders[key];
    setTestRequest({ ...testRequest, headers: newHeaders });
  };

  const addQuery = () => {
    if (queryKey && queryValue) {
      setTestRequest({
        ...testRequest,
        query: { ...testRequest.query, [queryKey]: queryValue },
      });
      setQueryKey('');
      setQueryValue('');
    }
  };

  const removeQuery = (key) => {
    const newQuery = { ...testRequest.query };
    delete newQuery[key];
    setTestRequest({ ...testRequest, query: newQuery });
  };

  const loadExample = (type) => {
    switch (type) {
      case 'sqli':
        setTestRequest({
          method: 'GET',
          url: '/api/users',
          headers: {},
          query: { id: "1' OR '1'='1" },
          body: {},
        });
        break;
      case 'xss':
        setTestRequest({
          method: 'POST',
          url: '/api/comments',
          headers: { 'Content-Type': 'application/json' },
          query: {},
          body: { comment: '<script>alert("XSS")</script>' },
        });
        break;
      case 'path-traversal':
        setTestRequest({
          method: 'GET',
          url: '/api/files',
          headers: {},
          query: { file: '../../../etc/passwd' },
          body: {},
        });
        break;
      default:
        break;
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Rule Testing</h1>
          <p className="mt-2 text-sm text-gray-600">
            Test HTTP requests against security policies before deployment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Request</h2>

            {/* Policy Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Policy *
              </label>
              <select
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                value={selectedPolicy || ''}
                onChange={(e) => setSelectedPolicy(e.target.value)}
              >
                <option value="">Select a policy...</option>
                {policies
                  .sort((a, b) => (b.version || 0) - (a.version || 0))
                  .map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name} (v{policy.version})
                    </option>
                  ))}
              </select>
            </div>

            {/* Quick Examples */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Examples
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadExample('sqli')}
                  className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
                >
                  SQL Injection
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('xss')}
                  className="px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200"
                >
                  XSS Attack
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('path-traversal')}
                  className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200"
                >
                  Path Traversal
                </button>
              </div>
            </div>

            {/* HTTP Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTTP Method
              </label>
              <select
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                value={testRequest.method}
                onChange={(e) => setTestRequest({ ...testRequest, method: e.target.value })}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            {/* URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Path
              </label>
              <input
                type="text"
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                value={testRequest.url}
                onChange={(e) => setTestRequest({ ...testRequest, url: e.target.value })}
                placeholder="/api/users"
              />
            </div>

            {/* Headers */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Headers
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="Header name"
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="Header value"
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addHeader}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {Object.entries(testRequest.headers).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">
                      <strong>{key}:</strong> {value}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Query Parameters */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Query Parameters
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="Parameter name"
                  value={queryKey}
                  onChange={(e) => setQueryKey(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="Parameter value"
                  value={queryValue}
                  onChange={(e) => setQueryValue(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addQuery}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {Object.entries(testRequest.query).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">
                      <strong>{key}:</strong> {value}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeQuery(key)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body (for POST/PUT) */}
            {(testRequest.method === 'POST' || testRequest.method === 'PUT' || testRequest.method === 'PATCH') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Body (JSON)
                </label>
                <textarea
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border font-mono"
                  rows="4"
                  value={JSON.stringify(testRequest.body, null, 2)}
                  onChange={(e) => {
                    try {
                      setTestRequest({ ...testRequest, body: JSON.parse(e.target.value) });
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder='{"key": "value"}'
                />
              </div>
            )}

            <button
              onClick={handleTest}
              disabled={!selectedPolicy || testing}
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all"
            >
              {testing ? (
                <span className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Testing...</span>
                </span>
              ) : (
                'Test Request'
              )}
            </button>
          </div>

          {/* Test Results */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h2>

            {!testResult ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Configure and test a request to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className={`p-4 rounded-lg border-2 ${
                  testResult.evaluation.blocked
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold ${
                        testResult.evaluation.blocked ? 'text-red-900' : 'text-green-900'
                      }`}>
                        {testResult.evaluation.blocked ? '❌ Request Blocked' : '✅ Request Allowed'}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        testResult.evaluation.blocked ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {testResult.evaluation.message}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      testResult.evaluation.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      testResult.evaluation.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {testResult.evaluation.severity}
                    </span>
                  </div>
                </div>

                {/* Policy Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Policy:</strong> {testResult.policyName} (v{testResult.policyVersion})
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Tested:</strong> {new Date(testResult.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Matched Rules */}
                {testResult.evaluation.matchedRules && testResult.evaluation.matchedRules.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Matched Rules ({testResult.evaluation.matchedRules.length})
                    </h4>
                    <div className="space-y-2">
                      {testResult.evaluation.matchedRules.map((rule, index) => (
                        <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs font-medium text-yellow-800">Rule ID: {rule.id}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  rule.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                  rule.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {rule.severity}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">{rule.message}</p>
                              {rule.matchedData && (
                                <p className="text-xs text-gray-600 mt-1">
                                  <strong>Matched:</strong> {rule.matchedData}
                                </p>
                              )}
                              {rule.matchedVar && (
                                <p className="text-xs text-gray-600">
                                  <strong>Variable:</strong> {rule.matchedVar}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Details */}
                {testResult.evaluation.details && testResult.evaluation.details.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Details</h4>
                    <div className="space-y-1">
                      {testResult.evaluation.details.map((detail, index) => (
                        <p key={index} className="text-sm text-gray-600">{detail}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
