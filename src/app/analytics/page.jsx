'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { normalizeIpAddress } from '@/lib/ip-utils';

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function categoryFromRuleId(ruleId) {
  const id = Number.parseInt(String(ruleId || ''), 10);
  if (!Number.isFinite(id)) return null;

  if (id >= 912000 && id < 913000) return 'DDoS/DoS';
  if (id >= 913000 && id < 914000) return 'Scanner/Recon';
  if (id >= 920000 && id < 921000) return 'Protocol Enforcement';
  if (id >= 921000 && id < 922000) return 'HTTP Smuggling';
  if (id >= 930000 && id < 940000) return 'LFI/RFI';
  if (id >= 941000 && id < 942000) return 'XSS';
  if (id >= 942000 && id < 943000) return 'SQL Injection';
  if (id >= 932000 && id < 933000) return 'RCE';
  if (id >= 933000 && id < 934000) return 'PHP Injection';
  if (id >= 944000 && id < 945000) return 'Java Attacks';
  if (id >= 949000 && id < 950000) return 'Anomaly Threshold';
  return null;
}

function classifyAttack(log) {
  const message = normalizeText(log.message);
  const ruleMessage = normalizeText(log.ruleMessage);
  const uri = normalizeText(log.uri || log.request?.uri);
  const source = `${message} ${ruleMessage} ${uri}`;

  const byRuleId = categoryFromRuleId(log.ruleId);
  if (byRuleId) return byRuleId;

  if (
    source.includes('ddos') ||
    source.includes('dos') ||
    source.includes('denial of service') ||
    source.includes('rate limit exceeded') ||
    source.includes('too many requests') ||
    source.includes('burst size exceeded') ||
    source.includes('request flood')
  ) {
    return 'DDoS/DoS';
  }

  if (source.includes('sql') || source.includes('sqli') || source.includes('union select')) return 'SQL Injection';
  if (source.includes('xss') || source.includes('cross-site') || source.includes('<script')) return 'XSS';
  if (source.includes('csrf')) return 'CSRF';
  if (source.includes('rce') || source.includes('code execution') || source.includes('command injection')) return 'RCE';
  if (source.includes('path traversal') || source.includes('../') || source.includes('directory traversal')) return 'Path Traversal';
  if (source.includes('ssrf') || source.includes('server-side request forgery')) return 'SSRF';
  if (source.includes('lfi') || source.includes('rfi')) return 'LFI/RFI';
  if (source.includes('auth') || source.includes('credential') || source.includes('login')) return 'Auth Attack';
  if (source.includes('bot') || source.includes('crawler') || source.includes('scanner')) return 'Bot/Scanner';
  if (source.includes('rate limit') || source.includes('too many requests')) return 'Rate Limit Abuse';
  if (source.includes('method') || source.includes('protocol')) return 'Protocol Enforcement';
  if (source.includes('file upload') || source.includes('multipart')) return 'Malicious Upload';

  return 'Other';
}

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
      // Fetch logs for analytics
      const response = await fetch('/api/logs?limit=1000');
      const data = await response.json();
      
      if (data.logs) {
        const now = new Date();
        const timeFilter = {
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        }[timeRange] || 24 * 60 * 60 * 1000;

        const filteredLogs = data.logs.filter(log => {
          const logTime = new Date(log.timestamp).getTime();
          return (now.getTime() - logTime) <= timeFilter;
        });

        // Calculate analytics
        const attackTypes = {};
        const otherBreakdown = {};
        const topIPs = {};
        const uniqueIPSet = new Set();
        const severityCounts = { critical: 0, high: 0, warning: 0, info: 0 };
        const hourlyData = {};

        filteredLogs.forEach(log => {
          // Attack types
          const attackCategory = classifyAttack(log);
          attackTypes[attackCategory] = (attackTypes[attackCategory] || 0) + 1;

          if (attackCategory === 'Other') {
            const signature = String(log.ruleMessage || log.message || 'Unclassified event').slice(0, 120);
            otherBreakdown[signature] = (otherBreakdown[signature] || 0) + 1;
          }

          // Top IPs
          const normalizedIp = normalizeIpAddress(log.ipAddress || log.clientIp || '');
          if (normalizedIp) {
            topIPs[normalizedIp] = (topIPs[normalizedIp] || 0) + 1;
            uniqueIPSet.add(normalizedIp);
          }

          // Severity counts
          const severity = (log.severity || 'info').toLowerCase();
          if (severityCounts[severity] !== undefined) {
            severityCounts[severity]++;
          }

          // Hourly data
          const hour = new Date(log.timestamp).getHours();
          hourlyData[hour] = (hourlyData[hour] || 0) + 1;
        });

        setAnalytics({
          totalAttacks: filteredLogs.length,
          attackTypes: Object.entries(attackTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10),
          otherBreakdown: Object.entries(otherBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8),
          topIPs: Object.entries(topIPs)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10),
          uniqueIPs: uniqueIPSet.size,
          severityCounts,
          hourlyData,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attack Analytics</h1>
            <p className="mt-2 text-sm text-gray-600">
              Visualize attack trends, patterns, and security metrics
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
              <>
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
                {analytics.otherBreakdown?.length > 0 && (
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Other Breakdown (Unclassified Signatures)</h3>
                    <div className="space-y-2">
                      {analytics.otherBreakdown.map(([signature, count], idx) => (
                        <div key={`${signature}-${idx}`} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 truncate pr-3">{signature}</span>
                          <span className="text-gray-500 font-medium whitespace-nowrap">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
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
      </div>
    </Layout>
  );
}
