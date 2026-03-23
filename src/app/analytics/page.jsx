'use client';

import { useEffect, useState } from 'react';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { normalizeIpAddress } from '@/lib/ip-utils';

export default function AnalyticsPage() {
  // Verify authentication
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [timeRange, isAuthenticated]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const hours = {
        '24h': 24,
        '7d': 7 * 24,
        '30d': 30 * 24,
      }[timeRange] || 24;
      const response = await fetch(`/api/logs/analytics?hours=${hours}`);
      const data = await response.json();

      setAnalytics({
        totalAttacks: (data.summary?.wafBlocked || 0) + (data.summary?.originDenied || 0),
        attackTypes: data.attackTypes || [],
        topIPs: data.topIPs || [],
        uniqueIPs: new Set((data.topIPs || []).map(([ip]) => normalizeIpAddress(ip))).size,
        severityCounts: data.severityCounts || { critical: 0, high: 0, medium: 0, warning: 0, info: 0 },
        hourlyData: Object.fromEntries(
          (data.timeSeries || []).map((item) => [new Date(item.time).getHours(), (item.wafBlocked || 0) + (item.originDenied || 0)])
        ),
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <AppLoadingState
            variant="panel"
            title="Loading attack analytics"
            message="Compiling attack trends, severity patterns, and high-risk source intelligence."
          />
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attack Analytics</h1>
            <p className="mt-2 text-sm text-gray-600">
              Visualize blocked and denied traffic trends, attack patterns, and security metrics
            </p>
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {loading ? (
          <AppLoadingState
            variant="panel"
            title="Loading attack analytics"
            message="Compiling attack trends, severity patterns, and high-risk source intelligence."
          />
        ) : (
          <>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Attacks</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {analytics?.totalAttacks || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {analytics?.severityCounts.critical || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Severity</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {analytics?.severityCounts.high || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique IPs</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {analytics?.uniqueIPs || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attack Types Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attack Types</h2>
            {analytics?.attackTypes && analytics.attackTypes.length > 0 ? (
              <div className="space-y-3">
                {analytics.attackTypes.map(([type, count]) => {
                  const percentage = (count / analytics.totalAttacks) * 100;
                  return (
                    <div key={type}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{type}</span>
                        <span className="text-sm text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No attack data available</p>
            )}
          </div>

          {/* Top Attacking IPs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Attacking IPs</h2>
            {analytics?.topIPs && analytics.topIPs.length > 0 ? (
              <div className="space-y-3">
                {analytics.topIPs.map(([ip, count], index) => (
                  <div key={ip} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="text-sm font-mono text-gray-900">{ip}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600">{count} attacks</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No IP data available</p>
            )}
          </div>
        </div>

        {/* Hourly Attack Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attack Trends (Hourly)</h2>
          {analytics?.hourlyData && Object.keys(analytics.hourlyData).length > 0 ? (
            <div className="h-64 flex items-end space-x-2">
              {Array.from({ length: 24 }, (_, i) => {
                const count = analytics.hourlyData[i] || 0;
                const maxCount = Math.max(...Object.values(analytics.hourlyData), 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gray-200 rounded-t" style={{ height: '200px' }}>
                      <div
                        className="w-full bg-blue-600 rounded-t transition-all"
                        style={{ height: `${height}%` }}
                        title={`${i}:00 - ${count} attacks`}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{i}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No trend data available</p>
          )}
        </div>
          </>
        )}
      </div>
    </Layout>
  );
}
