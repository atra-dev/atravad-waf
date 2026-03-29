'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { normalizeIpAddress } from '@/lib/ip-utils';
import { ANALYTICS_DISPLAY_HOURS, formatAnalyticsDisplayWindow } from '@/lib/analytics-window';

function getDecisionKey(log) {
  const decision = String(log?.decision || '').trim().toLowerCase();
  if (decision === 'waf_blocked' || decision === 'origin_denied' || decision === 'allowed') {
    return decision;
  }
  if (Boolean(log?.blocked)) return 'waf_blocked';
  const statusCode = Number(log?.statusCode);
  if (Number.isFinite(statusCode) && statusCode >= 400) return 'origin_denied';
  return 'allowed';
}

/**
 * Traffic Analytics Component
 * Displays time-series charts and traffic patterns
 */
export default function TrafficAnalytics({ logs = [], analytics = null }) {
  // Process logs for time-series data
  const timeSeriesData = useMemo(() => {
    if (analytics?.timeSeries) {
      return analytics.timeSeries;
    }
    const hourlyMap = new Map();
    
    logs.forEach(log => {
      if (!log.timestamp) return;
      
      const date = new Date(log.timestamp);
      const hour = date.toISOString().slice(0, 13) + ':00:00'; // Group by hour
      
      const existing = hourlyMap.get(hour) || {
        time: hour,
        total: 0,
        wafBlocked: 0,
        originDenied: 0,
        allowed: 0,
        critical: 0,
        high: 0,
        warning: 0,
        info: 0,
      };
      
      existing.total++;
      const decision = getDecisionKey(log);
      if (decision === 'waf_blocked') {
        existing.wafBlocked++;
      } else if (decision === 'origin_denied') {
        existing.originDenied++;
      } else {
        existing.allowed++;
      }
      
      // Count by severity
      const severity = (log.severity || 'info').toLowerCase();
      if (existing[severity] !== undefined) {
        existing[severity]++;
      }
      
      hourlyMap.set(hour, existing);
    });
    
    return Array.from(hourlyMap.values())
      .sort((a, b) => new Date(a.time) - new Date(b.time))
      .slice(-ANALYTICS_DISPLAY_HOURS);
  }, [logs]);

  // Request methods distribution
  const methodDistribution = useMemo(() => {
    if (analytics?.methods) {
      return analytics.methods;
    }
    const methodMap = new Map();
    
    logs.forEach(log => {
      const method = log.method || 'UNKNOWN';
      const existing = methodMap.get(method) || { method, count: 0 };
      existing.count++;
      methodMap.set(method, existing);
    });
    
    return Array.from(methodMap.values()).sort((a, b) => b.count - a.count);
  }, [logs]);

  // Status code distribution
  const statusCodeDistribution = useMemo(() => {
    if (analytics?.statuses) {
      return analytics.statuses;
    }
    const statusMap = new Map();
    
    logs.forEach(log => {
      if (!log.statusCode) return;
      const status = Math.floor(log.statusCode / 100) * 100; // Group by 100s
      const existing = statusMap.get(status) || { status, count: 0 };
      existing.count++;
      statusMap.set(status, existing);
    });
    
    return Array.from(statusMap.values())
      .sort((a, b) => a.status - b.status)
      .map(item => ({
        ...item,
        label: `${item.status}xx`,
      }));
  }, [logs]);

  // Top blocked IPs
  const topBlockedIPs = useMemo(() => {
    if (analytics?.topBlockedIps) {
      return analytics.topBlockedIps;
    }
    const ipMap = new Map();
    
    logs
      .filter(log => {
        const decision = getDecisionKey(log);
        return (decision === 'waf_blocked' || decision === 'origin_denied') && (log.ipAddress || log.clientIp);
      })
      .forEach(log => {
        const ip = normalizeIpAddress(log.ipAddress || log.clientIp || '');
        if (!ip) return;
        const existing = ipMap.get(ip) || { ip, totalBlocked: 0, wafBlocked: 0, originDenied: 0 };
        existing.totalBlocked++;
        const decision = getDecisionKey(log);
        if (decision === 'waf_blocked') existing.wafBlocked++;
        if (decision === 'origin_denied') existing.originDenied++;
        ipMap.set(ip, existing);
      });
    
    return Array.from(ipMap.values())
      .sort((a, b) => b.totalBlocked - a.totalBlocked)
      .slice(0, 10);
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Time Series Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Traffic Over Time ({formatAnalyticsDisplayWindow()})
        </h3>
        {timeSeriesData.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-200">
            <p className="text-gray-600 font-medium mb-1">No traffic data available</p>
            <p className="text-sm text-gray-500">
              Once requests start flowing through the WAF, this chart will visualize trends over time.
            </p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#4B5563"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="wafBlocked"
                  name="Blocked by WAF"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="originDenied"
                  name="Blocked by Origin"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="allowed"
                  name="Allowed"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Methods</h3>
          <div className="space-y-3">
            {methodDistribution.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No method data available</p>
            ) : (
              methodDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-16">{item.method}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(item.count / Math.max(analytics?.summary?.totalRequests || logs.length, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-16 text-right">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Codes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Codes</h3>
          <div className="space-y-3">
            {statusCodeDistribution.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No status code data available</p>
            ) : (
              statusCodeDistribution.map((item, idx) => {
                const color = item.status >= 500 ? 'bg-red-500' :
                              item.status >= 400 ? 'bg-orange-500' :
                              item.status >= 300 ? 'bg-yellow-500' :
                              'bg-green-500';
                
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-16">{item.label}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                        className={`${color} h-2 rounded-full`}
                        style={{
                            width: `${(item.count / Math.max(statusCodeDistribution.reduce((sum, row) => sum + row.count, 0), 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Top Blocked IPs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Blocked IP Addresses</h3>
        </div>
        <div className="overflow-x-auto">
          {topBlockedIPs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No blocked requests found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Blocked by WAF</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Blocked by Origin</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Blocked</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topBlockedIPs.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {item.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-medium">
                      {item.wafBlocked.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 text-right font-medium">
                      {item.originDenied.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {item.totalBlocked.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
