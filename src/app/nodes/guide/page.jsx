'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';

export default function WAFNodesGuidePage() {
  const [expandedSections, setExpandedSections] = useState({});
  
  // Show deprecation notice for legacy content
  const showLegacyNotice = true;

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const CodeBlock = ({ children, language = 'bash' }) => (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm my-4 border border-gray-700">
      <code>{children}</code>
    </pre>
  );

  const InfoBox = ({ type = 'info', children }) => {
    const styles = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      danger: 'bg-red-50 border-red-200 text-red-800'
    };

    return (
      <div className={`border rounded-lg p-4 my-4 ${styles[type]}`}>
        {children}
      </div>
    );
  };

  const Section = ({ id, title, children, defaultExpanded = false }) => {
    const isExpanded = expandedSections[id] !== undefined ? expandedSections[id] : defaultExpanded;

    return (
      <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
        >
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && (
          <div className="px-6 py-4 bg-white">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">WAF Nodes Guide</h1>
              <p className="text-lg text-gray-600">Complete Beginner's Guide - Step-by-Step Instructions</p>
            </div>
            <Link
              href="/nodes"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Nodes</span>
            </Link>
          </div>
        </div>

        {/* Quick Overview */}
        <InfoBox type="info">
          <div className="flex items-start space-x-3">
            <svg className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold mb-2">What is a Proxy WAF Node?</h3>
              <div className="text-sm">
                <p>
                  A <strong>Proxy WAF Node</strong> is a <strong>reverse proxy server</strong> that protects your websites.
                  It sits between the internet and your origin servers, inspecting all traffic with ModSecurity before forwarding clean requests.
                </p>
                <p className="mt-2">
                  <strong>Key Features:</strong>
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                  <li>Acts as reverse proxy (like Sucuri/Reblaze)</li>
                  <li>Protects multiple domains automatically</li>
                  <li>Fetches application configs from dashboard</li>
                  <li>Handles SSL/TLS termination</li>
                  <li>Routes traffic to origin servers</li>
                </ul>
              </div>
            </div>
          </div>
        </InfoBox>

        {/* Architecture Section */}
        <Section id="architecture" title="🏗️ Proxy WAF Architecture - Modern Reverse Proxy" defaultExpanded={true}>
          <div className="space-y-6">
            <p className="text-gray-700 text-lg">
              ATRAVAD WAF uses a <strong>modern proxy WAF architecture</strong> where nodes act as reverse proxies. Here's how it works:
            </p>
            
            {/* Modern Visual Architecture Diagram */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-xl p-8 overflow-x-auto">
              <div className="max-w-5xl mx-auto">
                {/* Dashboard - Top */}
                <div className="relative">
                  <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl shadow-2xl p-8 text-white transform hover:scale-105 transition-transform duration-200 border-4 border-blue-600" style={{ textShadow: '0 3px 8px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.5)' }}>
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="bg-white bg-opacity-30 rounded-xl p-5 shadow-2xl border-2 border-white border-opacity-50">
                        <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.5))' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-4xl font-extrabold mb-3 text-white" style={{ textShadow: '0 4px 8px rgba(0,0,0,0.8), 0 0 16px rgba(0,0,0,0.5), 2px 2px 4px rgba(0,0,0,0.9)' }}>ATRAVAD WAF Dashboard</h3>
                        <p className="text-blue-100 text-xl font-bold" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.7), 0 0 10px rgba(0,0,0,0.4)' }}>Central Control Center</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5 mt-8">
                      <div className="bg-white bg-opacity-30 rounded-xl p-6 backdrop-blur-lg border-3 border-white border-opacity-60 shadow-2xl hover:bg-opacity-40 transition-all">
                        <div className="flex items-center space-x-4">
                          <svg className="h-7 w-7 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-lg font-extrabold text-white leading-tight" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.4)' }}>Creates security policies</span>
                        </div>
                      </div>
                      <div className="bg-white bg-opacity-30 rounded-xl p-6 backdrop-blur-lg border-3 border-white border-opacity-60 shadow-2xl hover:bg-opacity-40 transition-all">
                        <div className="flex items-center space-x-4">
                          <svg className="h-7 w-7 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          <span className="text-lg font-extrabold text-white leading-tight" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.4)' }}>Generates ModSecurity configs</span>
                        </div>
                      </div>
                      <div className="bg-white bg-opacity-30 rounded-xl p-6 backdrop-blur-lg border-3 border-white border-opacity-60 shadow-2xl hover:bg-opacity-40 transition-all">
                        <div className="flex items-center space-x-4">
                          <svg className="h-7 w-7 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-lg font-extrabold text-white leading-tight" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.4)' }}>Manages applications</span>
                        </div>
                      </div>
                      <div className="bg-white bg-opacity-30 rounded-xl p-6 backdrop-blur-lg border-3 border-white border-opacity-60 shadow-2xl hover:bg-opacity-40 transition-all">
                        <div className="flex items-center space-x-4">
                          <svg className="h-7 w-7 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="text-lg font-extrabold text-white leading-tight" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.4)' }}>Monitors all nodes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Connection Line */}
                  <div className="flex justify-center my-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-20 bg-gradient-to-b from-blue-600 to-green-500 rounded-full animate-pulse"></div>
                      </div>
                      <div className="relative bg-white border-4 border-blue-700 rounded-full px-8 py-4 shadow-2xl">
                        <span className="text-lg font-extrabold text-blue-900">HTTP API Calls</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WAF Nodes - Bottom */}
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  {/* Node 1 */}
                  <div className="bg-white rounded-xl shadow-lg border-2 border-green-300 transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-t-xl p-6 text-white border-b-4 border-green-700" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-2xl" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>WAF Node 1</h4>
                        <div className="bg-white bg-opacity-30 rounded-full p-3 border-2 border-white border-opacity-50">
                          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4 bg-white">
                      <div className="bg-green-50 border-3 border-green-400 rounded-xl p-5 shadow-md">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-4 h-4 bg-green-600 rounded-full animate-pulse shadow-lg"></div>
                          <span className="text-base font-extrabold text-green-900">ModSecurity Engine</span>
                        </div>
                        <p className="text-base text-gray-800 ml-7 font-medium">Core protection engine</p>
                      </div>
                      <div className="bg-blue-50 border-3 border-blue-400 rounded-xl p-5 shadow-md">
                        <div className="flex items-center space-x-3">
                          <svg className="h-6 w-6 text-blue-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          <span className="text-base font-extrabold text-blue-900">Protects Multiple Domains</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Node 2 */}
                  <div className="bg-white rounded-xl shadow-lg border-2 border-green-300 transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-t-xl p-6 text-white border-b-4 border-green-700" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-2xl" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>WAF Node 2</h4>
                        <div className="bg-white bg-opacity-30 rounded-full p-3 border-2 border-white border-opacity-50">
                          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4 bg-white">
                      <div className="bg-green-50 border-3 border-green-400 rounded-xl p-5 shadow-md">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-4 h-4 bg-green-600 rounded-full animate-pulse shadow-lg"></div>
                          <span className="text-base font-extrabold text-green-900">ModSecurity Engine</span>
                        </div>
                        <p className="text-base text-gray-800 ml-7 font-medium">Core protection engine</p>
                      </div>
                      <div className="bg-blue-50 border-3 border-blue-400 rounded-xl p-5 shadow-md">
                        <div className="flex items-center space-x-3">
                          <svg className="h-6 w-6 text-blue-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          <span className="text-base font-extrabold text-blue-900">Fetches App Configs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Node 3 */}
                  <div className="bg-white rounded-xl shadow-lg border-2 border-green-300 transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-t-xl p-6 text-white border-b-4 border-green-700" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-2xl" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>WAF Node 3</h4>
                        <div className="bg-white bg-opacity-30 rounded-full p-3 border-2 border-white border-opacity-50">
                          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4 bg-white">
                      <div className="bg-green-50 border-3 border-green-400 rounded-xl p-5 shadow-md">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-4 h-4 bg-green-600 rounded-full animate-pulse shadow-lg"></div>
                          <span className="text-base font-extrabold text-green-900">ModSecurity Engine</span>
                        </div>
                        <p className="text-base text-gray-800 ml-7 font-medium">Core protection engine</p>
                      </div>
                      <div className="bg-blue-50 border-3 border-blue-400 rounded-xl p-5 shadow-md">
                        <div className="flex items-center space-x-3">
                          <svg className="h-6 w-6 text-blue-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          <span className="text-base font-extrabold text-blue-900">Reverse Proxy</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Data Flow Explanation */}
              <div className="mt-8 bg-white border-2 border-dashed border-gray-300 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-indigo-100 rounded-full p-2">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">Data Flow</h4>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="bg-blue-50 rounded-xl p-4 mb-3 border-2 border-blue-200">
                      <svg className="h-10 w-10 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-base font-bold text-gray-900">1. Create Application</p>
                    <p className="text-sm text-gray-600 mt-2">Configure domain, origin, and policy</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-50 rounded-xl p-4 mb-3 border-2 border-green-200">
                      <svg className="h-10 w-10 mx-auto text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-base font-bold text-gray-900">2. Node Fetches Config</p>
                    <p className="text-sm text-gray-600 mt-2">Node automatically gets application configs</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-purple-50 rounded-xl p-4 mb-3 border-2 border-purple-200">
                      <svg className="h-10 w-10 mx-auto text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-base font-bold text-gray-900">3. Traffic Protected</p>
                    <p className="text-sm text-gray-600 mt-2">Proxy routes traffic through ModSecurity</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2">1. Dashboard</h3>
                <p className="text-sm text-blue-800">
                  Create applications with domains, origins, and policies. Dashboard generates ModSecurity configurations automatically.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-900 mb-2">2. Proxy Node</h3>
                <p className="text-sm text-green-800">
                  Proxy nodes fetch application configs automatically. They act as reverse proxies, routing traffic through ModSecurity.
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-bold text-purple-900 mb-2">3. Protection Flow</h3>
                <p className="text-sm text-purple-800">
                  User → DNS → Proxy Node → ModSecurity → Origin Server. One node can protect multiple domains.
                </p>
              </div>
            </div>

            <InfoBox type="success">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Proxy WAF Architecture</strong> - Nodes act as reverse proxies (like Sucuri/Reblaze)</li>
                <li><strong>ModSecurity Integration</strong> - Core protection engine inspects all traffic</li>
                <li><strong>Automatic Configuration</strong> - Nodes fetch application configs automatically</li>
                <li><strong>Multiple Domains</strong> - One node can protect many domains</li>
                <li><strong>No Deployment Needed</strong> - Just create applications, nodes auto-update</li>
                <li><strong>OWASP CRS Included</strong> - Industry-standard security rules</li>
              </ul>
            </InfoBox>
          </div>
        </Section>

        {/* Step 1: Register Node */}
        <Section id="step1" title="📝 STEP 1: Register Your Proxy WAF Node" defaultExpanded={true}>
          <div className="space-y-4">
            <p className="text-gray-700">
              Register your server as a proxy WAF node in the dashboard. The node will automatically fetch application configurations.
            </p>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Log into the Dashboard</h4>
                  <p className="text-sm text-gray-600">Go to your dashboard and log in with your admin account</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Go to WAF Nodes Page</h4>
                  <p className="text-sm text-gray-600">Click <strong>"WAF Nodes"</strong> in the left sidebar</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Click "Register Node"</h4>
                  <p className="text-sm text-gray-600">Click the <strong>"+ Register Node"</strong> button</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Fill in the Form</h4>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-2">
                    <li><strong>Node Name:</strong> e.g., "Production Node 1"</li>
                    <li><strong>IP Address:</strong> The IP address or hostname of your server (e.g., 192.168.1.100)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">5</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Submit and Save Credentials</h4>
                  <p className="text-sm text-gray-600">Click "Register Node" and <strong>save BOTH credentials</strong> shown in the modal!</p>
                </div>
              </div>
            </div>

            <InfoBox type="danger">
              <p className="text-sm font-bold mb-2">🔐 CRITICAL: Save Your Credentials Now!</p>
              <p className="text-sm mb-2">When you register a node, you'll receive TWO credentials in a modal:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Secure Node ID</strong> (random UUID, e.g., <code className="bg-gray-200 px-1 rounded">a7f3b9c2-4d1e-4f8a-9b6c-3e5d7a8b9c0d</code>)</li>
                <li><strong>Node API Key</strong> (e.g., <code className="bg-gray-200 px-1 rounded">atravad_abc123xyz456...</code>)</li>
              </ul>
              <p className="text-sm mt-2 font-semibold text-red-700">⚠️ The API key is shown ONLY ONCE during registration. If you lose it, you'll need to rotate it from the dashboard.</p>
            </InfoBox>

            <InfoBox type="warning">
              <p className="text-sm"><strong>⚠️ Important Notes:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                <li>The node starts as <strong>"Offline"</strong> - it will become <strong>"Online"</strong> once the node software connects</li>
                <li>You'll get a <strong>Secure Node ID</strong> (random UUID) - <strong>SAVE THIS!</strong></li>
                <li>You'll get a <strong>Node API Key</strong> (starts with <code className="bg-gray-200 px-1 rounded">atravad_</code>) - <strong>SAVE THIS TOO!</strong></li>
                <li><strong>SECURITY:</strong> Both credentials are cryptographically secure. Keep them secret - they authenticate your node!</li>
                <li>The node name you enter is just for display/management purposes - the actual credentials are auto-generated for security</li>
                <li>You'll need BOTH credentials to configure your node connector software</li>
              </ul>
            </InfoBox>
          </div>
        </Section>

        {/* Step 2: Install Proxy Server */}
        <Section id="step2" title="📦 STEP 2: Install Proxy Server Software">
          <div className="space-y-4">
            <p className="text-gray-700">
              Install and run the ATRAVAD Proxy WAF server software on your server. This software acts as a reverse proxy and integrates ModSecurity.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Prerequisites:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>Node.js 18+ installed</li>
              <li>Server with public IP address</li>
              <li>Ports 80 (HTTP) and 443 (HTTPS) available</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Install Proxy Server:</h3>
            <CodeBlock>
{`# Clone or download ATRAVAD WAF repository
git clone <repository-url>
cd atravad-waf

# Install dependencies
npm install

# Run proxy server
node proxy-server-standalone.js \\
  --node-id=YOUR_NODE_ID \\
  --api-key=YOUR_API_KEY \\
  --dashboard-url=https://dashboard.atravad.com`}
            </CodeBlock>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Or Use Environment Variables:</h3>
            <CodeBlock>
{`export ATRAVAD_NODE_ID=node-abc123
export ATRAVAD_API_KEY=atravad_xyz789
export ATRAVAD_DASHBOARD_URL=https://dashboard.atravad.com
export ATRAVAD_HTTP_PORT=80
export ATRAVAD_HTTPS_PORT=443

node proxy-server-standalone.js`}
            </CodeBlock>

            <InfoBox type="info">
              <p className="text-sm mb-2"><strong>What the Proxy Server Does:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Connects to dashboard and authenticates with Node ID + API Key</li>
                <li>Fetches application configurations automatically</li>
                <li>Runs as reverse proxy on ports 80/443</li>
                <li>Routes traffic based on Host header (domain)</li>
                <li>Integrates ModSecurity for request inspection</li>
                <li>Forwards clean traffic to origin servers</li>
                <li>Handles health checks and failover</li>
              </ul>
            </InfoBox>
          </div>
        </Section>

        {/* Step 3: Configure Proxy Server */}
        <Section id="step3" title="⚙️ STEP 3: Configure and Start Proxy Server">
          <div className="space-y-4">
            <p className="text-gray-700">
              Configure the proxy server with your Node ID and API Key, then start it.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Configuration Options:</h3>
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">1. Command Line Arguments</h4>
                <CodeBlock>
{`node proxy-server-standalone.js \\
  --node-id=node-abc123 \\
  --api-key=atravad_xyz789 \\
  --dashboard-url=https://dashboard.atravad.com \\
  --http-port=80 \\
  --https-port=443`}
                </CodeBlock>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">2. Environment Variables (Recommended)</h4>
                <CodeBlock>
{`export ATRAVAD_NODE_ID=node-abc123
export ATRAVAD_API_KEY=atravad_xyz789
export ATRAVAD_DASHBOARD_URL=https://dashboard.atravad.com
export ATRAVAD_HTTP_PORT=80
export ATRAVAD_HTTPS_PORT=443

node proxy-server-standalone.js`}
                </CodeBlock>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">3. As a Systemd Service</h4>
                <CodeBlock>
{`# Create service file: /etc/systemd/system/atravad-proxy.service
[Unit]
Description=ATRAVAD Proxy WAF Server
After=network.target

[Service]
Type=simple
User=atravad
Environment="ATRAVAD_NODE_ID=node-abc123"
Environment="ATRAVAD_API_KEY=atravad_xyz789"
Environment="ATRAVAD_DASHBOARD_URL=https://dashboard.atravad.com"
ExecStart=/usr/bin/node /opt/atravad-waf/proxy-server-standalone.js
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable atravad-proxy
sudo systemctl start atravad-proxy`}
                </CodeBlock>
              </div>
            </div>

            <InfoBox type="info">
              <p className="text-sm mb-2"><strong>What the Proxy Server Does Automatically:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Fetches Applications:</strong> Polls dashboard every 30-60 seconds for application configs</li>
                <li><strong>Health Checks:</strong> Monitors origin server health automatically</li>
                <li><strong>Domain Routing:</strong> Routes traffic based on Host header</li>
                <li><strong>ModSecurity:</strong> Inspects all requests with ModSecurity rules</li>
                <li><strong>Auto-Updates:</strong> Gets new applications and policy changes automatically</li>
              </ul>
            </InfoBox>

            <InfoBox type="danger">
              <p className="text-sm font-bold mb-2">🔐 API Key Authentication Required</p>
              <p className="text-sm mb-2">The proxy server authenticates with the dashboard using:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code className="bg-gray-200 px-1 rounded">X-Node-Id</code>: Your Node ID</li>
                <li><code className="bg-gray-200 px-1 rounded">X-Node-Api-Key</code>: Your API Key</li>
              </ul>
              <p className="text-sm mt-2">These are automatically included in all API requests from the proxy server.</p>
            </InfoBox>
          </div>
        </Section>

        {/* Step 4: Verify */}
        <Section id="step4" title="✅ STEP 4: Verify Proxy Node is Online">
          <div className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Go back to <strong>WAF Nodes</strong> page in the dashboard</li>
              <li>Check the <strong>Status</strong> column
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>If it shows <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">Online</span> → ✅ Success! Node is connected</li>
                  <li>If it shows <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">Offline</span> → ❌ Node software isn't running or can't connect</li>
                </ul>
              </li>
              <li>Check <strong>"Last Seen"</strong> - Should show a recent timestamp (within the last minute if node is working)</li>
            </ol>

            <InfoBox type="warning">
              <p className="text-sm font-semibold mb-2">Troubleshooting if Node is Offline:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Check if your node software is running</li>
                <li>Check if your node software has the correct <strong>Secure Node ID</strong></li>
                <li>Check if your node software has the correct <strong>Node API Key</strong></li>
                <li>Check if authentication headers (<code className="bg-gray-200 px-1 rounded">X-Node-Id</code> and <code className="bg-gray-200 px-1 rounded">X-Node-Api-Key</code>) are being sent</li>
                <li>Check node software logs for <code className="bg-gray-200 px-1 rounded">401 Unauthorized</code> errors (authentication failure)</li>
                <li>Check if your node software can reach the dashboard URL (firewall, network)</li>
                <li>Check if your node software is sending heartbeat correctly</li>
                <li>If API key is lost, rotate it from the dashboard (Nodes page → Key button → Rotate API Key)</li>
              </ul>
            </InfoBox>
          </div>
        </Section>

        {/* Step 5: Create Application */}
        <Section id="step5" title="🚀 STEP 5: Create Application (No Deployment Needed!)">
          <div className="space-y-4">
            <p className="text-gray-700">
              Create an application in the dashboard. The proxy node will automatically fetch the configuration - <strong>no deployment needed!</strong>
            </p>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Go to Applications Page</h4>
                  <p className="text-sm text-gray-600">Click <strong>"Applications"</strong> in the sidebar, then click <strong>"New Application"</strong></p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Configure Application</h4>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mt-2">
                    <li><strong>Name:</strong> e.g., "My Website"</li>
                    <li><strong>Domain:</strong> e.g., "example.com" (this is what DNS will point to)</li>
                    <li><strong>Origin URL:</strong> e.g., "https://origin.example.com" (your actual server)</li>
                    <li><strong>Policy:</strong> Select a security policy (optional - default OWASP CRS if none)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Node Auto-Fetches</h4>
                  <p className="text-sm text-gray-600">Your proxy node automatically fetches this application configuration within 30-60 seconds. <strong>No manual deployment needed!</strong></p>
                </div>
              </div>
            </div>

            <InfoBox type="info">
              <p className="text-sm font-semibold mb-2">How Proxy WAF Works:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>You create application in dashboard (domain + origin + policy)</li>
                <li>Proxy node polls dashboard every 30-60 seconds</li>
                <li>Node fetches all applications for its tenant</li>
                <li>Node loads application configs into memory</li>
                <li>When traffic arrives for a domain, node routes it through ModSecurity</li>
                <li>ModSecurity inspects and blocks attacks</li>
                <li>Clean traffic forwarded to origin server</li>
                <li><strong>No deployment, no config files, no reloads needed!</strong></li>
              </ol>
            </InfoBox>
          </div>
        </Section>

        {/* Step 6: Update DNS */}
        <Section id="step6" title="🌐 STEP 6: Update DNS to Point to WAF">
          <div className="space-y-4">
            <p className="text-gray-700">
              Point your domain's DNS to the proxy WAF node IP address. All traffic will then flow through the WAF.
            </p>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Get WAF Node IP</h4>
                  <p className="text-sm text-gray-600">From the WAF Nodes page, note the IP address of your proxy node (e.g., <code className="bg-gray-200 px-1 rounded">1.2.3.4</code>)</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Update DNS Records</h4>
                  <p className="text-sm text-gray-600">At your DNS provider, create/update A record:</p>
                  <CodeBlock>
{`Type: A
Name: @ (or example.com)
Value: 1.2.3.4 (your WAF node IP)
TTL: 300`}
                  </CodeBlock>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Wait for DNS Propagation</h4>
                  <p className="text-sm text-gray-600">Usually takes 5-60 minutes. Check with <code className="bg-gray-200 px-1 rounded">dig example.com</code> or <code className="bg-gray-200 px-1 rounded">nslookup example.com</code></p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Test Protection</h4>
                  <p className="text-sm text-gray-600">Visit your domain - should work normally! Try an attack: <code className="bg-gray-200 px-1 rounded">?id=1' OR '1'='1</code> - should be blocked (403)</p>
                </div>
              </div>
            </div>

            <InfoBox type="success">
              <p className="text-sm font-semibold mb-2">✅ That's it! Your website is now protected!</p>
              <p className="text-sm">
                All traffic for your domain now flows through the proxy WAF. Attacks are automatically blocked, and clean traffic reaches your origin server.
              </p>
            </InfoBox>
          </div>
        </Section>

        {/* Summary */}
        <Section id="summary" title="📚 Summary: Proxy WAF Architecture" defaultExpanded={true}>
          <div className="space-y-4">
            <InfoBox type="success">
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li><strong>Proxy WAF Architecture</strong> - Nodes act as reverse proxies (like Sucuri/Reblaze)</li>
                <li><strong>ModSecurity Integration</strong> - Core protection engine inspects all traffic</li>
                <li><strong>Automatic Configuration</strong> - Nodes fetch application configs automatically</li>
                <li><strong>No Deployment Needed</strong> - Just create applications, nodes auto-update</li>
                <li><strong>Multiple Domains</strong> - One node protects many domains</li>
                <li><strong>DNS-Based Routing</strong> - Point DNS to WAF, traffic flows automatically</li>
                <li><strong>OWASP CRS Included</strong> - Industry-standard security rules</li>
                <li><strong>Modern Architecture</strong> - Like Sucuri and Reblaze</li>
              </ul>
            </InfoBox>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
              <p className="text-sm font-semibold text-gray-900 mb-2">The Complete Flow:</p>
              <p className="text-sm text-gray-700">
                Create Application (domain + origin + policy) → Update DNS → Traffic flows through Proxy WAF → ModSecurity inspects → Clean traffic forwarded to origin
              </p>
            </div>
          </div>
        </Section>

        {/* Quick Start Checklist */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🚀 Quick Start Checklist</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              'Register proxy node in dashboard',
              'Install proxy server software',
              'Configure with Node ID and API Key',
              'Start proxy server',
              'Verify node shows "Online"',
              'Create application (domain + origin + policy)',
              'Update DNS to point to node IP',
              'Wait for DNS propagation',
              'Test protection - visit your domain',
              'Verify attacks are blocked',
            ].map((item, index) => (
              <div key={index} className="flex items-start space-x-2">
                <input type="checkbox" className="mt-1" />
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
