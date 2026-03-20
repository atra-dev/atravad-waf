'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import ConfirmationModal from '../ConfirmationModal';
import FeedbackModal from '../FeedbackModal';

export default function PolicyVersionsPage() {
  const params = useParams();
  const policyName = decodeURIComponent(params.name);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [pendingRollbackVersionId, setPendingRollbackVersionId] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [feedbackState, setFeedbackState] = useState({
    open: false,
    title: '',
    description: '',
    tone: 'blue',
  });

  useEffect(() => {
    fetchVersions();
  }, [policyName]);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/policies?name=${encodeURIComponent(policyName)}`);
      const data = await response.json();

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
    try {
      const version = versions.find((item) => item.id === versionId);
      if (!version) return;

      setRollingBack(true);

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
        setFeedbackState({
          open: true,
          title: 'Policy rolled back',
          description: 'A new latest version was created successfully from the selected version.',
          tone: 'green',
        });
        fetchVersions();
      } else {
        const error = await response.json();
        setFeedbackState({
          open: true,
          title: 'Unable to rollback policy',
          description: error.error || 'Failed to rollback policy',
          tone: 'red',
        });
      }
    } catch (error) {
      console.error('Error rolling back policy:', error);
      setFeedbackState({
        open: true,
        title: 'Unable to rollback policy',
        description: 'Failed to rollback policy',
        tone: 'red',
      });
    } finally {
      setRollingBack(false);
      setPendingRollbackVersionId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
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
          <p className="mt-1 text-sm text-gray-500">Policy Versions</p>
          <p className="mt-2 text-xs text-blue-600">
            Tip: Assign this policy to an application in the Applications page to use it with the proxy WAF.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Versions</h2>
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`cursor-pointer rounded-lg border p-4 ${
                    selectedVersion?.id === version.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Version {version.version}</p>
                      <p className="text-sm text-gray-500">{new Date(version.createdAt).toLocaleString()}</p>
                    </div>
                    {version.version !== versions[0]?.version ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingRollbackVersionId(version.id);
                        }}
                        className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                      >
                        Rollback
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedVersion ? (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Version {selectedVersion.version} Details</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Protections</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span
                        className={`mr-2 h-3 w-3 rounded-full ${
                          selectedVersion.policy.sqlInjection ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-700">SQL Injection Protection</span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`mr-2 h-3 w-3 rounded-full ${
                          selectedVersion.policy.xss ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-700">XSS Protection</span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`mr-2 h-3 w-3 rounded-full ${
                          selectedVersion.policy.fileUpload ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-700">File Upload Protection</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">ModSecurity Configuration</h3>
                  <pre className="max-h-64 overflow-auto rounded bg-gray-50 p-4 text-xs">
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
          ) : null}
        </div>
      </div>

      <ConfirmationModal
        open={!!pendingRollbackVersionId}
        title="Rollback to this version?"
        description="This will create a new latest version using the selected version's settings while keeping the existing version history intact."
        confirmLabel="Rollback Version"
        tone="blue"
        busy={rollingBack}
        onCancel={() => setPendingRollbackVersionId(null)}
        onConfirm={() => handleRollback(pendingRollbackVersionId)}
      />

      <FeedbackModal
        open={feedbackState.open}
        title={feedbackState.title}
        description={feedbackState.description}
        tone={feedbackState.tone}
        onClose={() =>
          setFeedbackState({
            open: false,
            title: '',
            description: '',
            tone: 'blue',
          })
        }
      />
    </Layout>
  );
}
