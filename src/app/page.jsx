import Link from 'next/link';

const capabilityHighlights = [
  {
    title: 'ModSecurity + OWASP CRS',
    description:
      'Full request and optional response inspection backed by ModSecurity v3 and OWASP Core Rule Set coverage.',
  },
  {
    title: 'Virtual Patching',
    description:
      'Push policy-level mitigation for exposed vulnerabilities without waiting for origin code changes.',
  },
  {
    title: 'Bot and Abuse Defense',
    description:
      'Detect suspicious agents, crawler signatures, scraping patterns, and automated attack traffic.',
  },
  {
    title: 'Adaptive Rate Limiting',
    description:
      'Throttle by IP, endpoint, and user context with burst protection for login and API abuse scenarios.',
  },
  {
    title: 'Geo and IP Controls',
    description:
      'Allowlist or block countries, IPs, and CIDR ranges with logging for emergency containment.',
  },
  {
    title: 'API-Specific Protection',
    description:
      'Enforce API key presence, auth format expectations, and version rules for sensitive endpoints.',
  },
  {
    title: 'Secure SSL Delivery',
    description:
      "Support Let's Encrypt auto-provisioning, custom certificates, and SNI-based domain handling.",
  },
  {
    title: 'Operational Visibility',
    description:
      'Track blocked traffic, attack trends, top offending IPs, and tenant-scoped activity in one dashboard.',
  },
];

const platformFeatures = [
  'IP whitelisting and blacklisting with CIDR support',
  'Country-based access control with GeoIP-aware policy rules',
  'Bot signature detection, crawler blocking, and challenge-ready flows',
  'Advanced file upload validation with MIME, size, and extension controls',
  'Response inspection for protected applications',
  'WebSocket-aware proxy protection for modern apps',
  'Real-time app and policy sync from Firestore to the WAF edge',
  'Multi-tenant management with role-based access controls',
  'DNS activation flow with assigned WAF IP and optional CNAME',
  'Cache purge support for protected applications',
  'Managed and custom SSL certificate lifecycle support',
  'Traffic logging and analytics for blocked and allowed requests',
];

const proofPoints = [
  { label: 'Protection model', value: 'Reverse proxy edge WAF' },
  { label: 'Inspection engine', value: 'ModSecurity v3 + OWASP CRS' },
  { label: 'Certificate options', value: "Let's Encrypt or custom SSL" },
  { label: 'Security visibility', value: 'Logs, analytics, live policy control' },
];

const deploymentSteps = [
  {
    step: '01',
    title: 'Add the site',
    description:
      'Register the application, define the origin, and assign the policy that matches its risk profile.',
  },
  {
    step: '02',
    title: 'Point DNS to ATRAVAD',
    description:
      'Use the assigned WAF IP or CNAME so traffic reaches the protection layer before the origin.',
  },
  {
    step: '03',
    title: 'Activate SSL and policy controls',
    description:
      'Enable managed or custom certificates, then apply access controls, rate limits, and security rules.',
  },
  {
    step: '04',
    title: 'Monitor and refine',
    description:
      'Review analytics, blocked traffic, and policy outcomes to tighten protection without slowing delivery.',
  },
];

const pricingPlans = [
  {
    name: 'Managed Essential',
    price: '$249',
    cadence: '/yr',
    description: 'For smaller websites that need fully managed WAF protection without building an in-house security team.',
    highlight: false,
    features: [
      '1 protected website or application',
      'Managed WAF monitoring and policy handling',
      '24/7 cyber defense operations center oversight',
      'Managed SSL and domain onboarding support',
      'Threat blocking with core analytics visibility',
      'Email and scheduled support assistance',
    ],
  },
  {
    name: 'Managed Professional',
    price: '$399',
    cadence: '/yr',
    description: 'For growing businesses that need stronger managed protection, faster handling, and deeper security visibility.',
    highlight: true,
    features: [
      '1 protected website or application',
      '24/7 cyber defense operations center management',
      'Managed bot mitigation, geo controls, and rate limiting',
      'Virtual patching and tuned policy adjustments',
      'Extended analytics and threat visibility',
      'Priority support and faster response handling',
    ],
  },
  {
    name: 'Managed Business',
    price: '$649',
    cadence: '/yr',
    description: 'For business-critical applications that require higher-touch managed defense and stronger operational coverage.',
    highlight: false,
    features: [
      '1 protected website or application',
      '24/7 managed WAF operations and escalation handling',
      'Advanced threat controls with hands-on tuning',
      'Longer analytics retention and richer reporting',
      'Priority support with faster response targets',
      'Commercial-grade onboarding and service guidance',
    ],
  },
  {
    name: 'Managed Multi-Site & Custom',
    price: 'Custom',
    cadence: '',
    description: 'For agencies, larger organizations, and customers needing a fully tailored managed security service.',
    highlight: false,
    features: [
      'Multiple protected websites or application portfolios',
      'Tailored 24/7 cyber defense operations coverage',
      'Custom onboarding, policy workflows, and reporting',
      'Dedicated service planning and commercial alignment',
      'Custom SLA and support structure',
    ],
  },
];

function ShieldIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M12 3l7 3v5c0 4.4-2.9 8.4-7 9.7C7.9 19.4 5 15.4 5 11V6l7-3Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.5 12 1.8 1.8 3.7-4.1"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PulseIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M3 12h4l2.2-4.5L13 17l2.3-5H21"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
      <path d="M3.5 9h17" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.5 15h17" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M12 3c2.7 2.8 4.2 5.8 4.2 9S14.7 18.2 12 21c-2.7-2.8-4.2-5.8-4.2-9S9.3 5.8 12 3Z"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LockIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="5" y="10" width="14" height="10" rx="2" strokeWidth="1.8" />
      <path
        d="M8 10V8a4 4 0 1 1 8 0v2"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionEyebrow({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08111f] text-white">
      <div className="absolute inset-x-0 top-0 -z-10 h-[700px] bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.32),_transparent_42%),radial-gradient(circle_at_20%_25%,_rgba(14,165,233,0.24),_transparent_25%),linear-gradient(180deg,_#08111f_0%,_#09192d_42%,_#f3f6fb_42%,_#f3f6fb_100%)]" />

      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-6 lg:px-8 lg:pb-28">
          <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.35)]">
                <img src="/logo.png" alt="ATRAVAD WAF" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.2em] text-white/70">ATRAVAD WAF</p>
                <p className="text-xs text-white/45">Enterprise web application firewall</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 hover:border-white/35 hover:text-white md:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_16px_50px_rgba(34,211,238,0.35)] hover:bg-cyan-300"
              >
                Protect a site
              </Link>
            </div>
          </header>

          <div className="grid gap-14 pt-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] lg:items-center">
            <div>
              <SectionEyebrow>Built to win trust fast</SectionEyebrow>
              <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[0.98] text-white sm:text-6xl lg:text-7xl">
                Security that customers can see before attackers ever reach the origin.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                ATRAVAD WAF gives websites and APIs a managed reverse-proxy protection layer with enterprise controls,
                high-signal analytics, automated SSL delivery, and policy-driven defense that is ready for real
                production traffic.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-[0_20px_60px_rgba(34,211,238,0.35)] hover:bg-cyan-300"
                >
                  Launch the dashboard
                </Link>
                <a
                  href="#capabilities"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-base font-semibold text-white/85 hover:border-white/35 hover:text-white"
                >
                  Explore capabilities
                </a>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {proofPoints.map((item) => (
                  <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/45">{item.label}</p>
                    <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-10 top-12 h-28 w-28 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute -right-6 bottom-0 h-36 w-36 rounded-full bg-sky-500/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-[0_32px_100px_rgba(2,6,23,0.7)]">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
                      Live security posture
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">Customer-facing protection layer</h2>
                  </div>
                  <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    Active
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    { label: 'Threat inspection', value: 'Requests + responses' },
                    { label: 'SSL handling', value: 'Auto or custom certs' },
                    { label: 'Traffic controls', value: 'Geo, IP, rate, bots' },
                    { label: 'Observability', value: 'Logs, trends, attack views' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/40">{item.label}</p>
                      <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(34,211,238,0.12),rgba(15,23,42,0.04))] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Attack handling workflow</p>
                      <p className="mt-1 text-sm text-slate-300">Point DNS, apply policy, issue SSL, inspect traffic, monitor outcomes.</p>
                    </div>
                    <ShieldIcon className="h-10 w-10 text-cyan-300" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {['Traffic reaches ATRAVAD edge', 'Threats are filtered by policy engine', 'Clean traffic is forwarded to origin'].map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-950/45 px-4 py-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                        <span className="text-sm text-white/85">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white/95 py-5 text-slate-900 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Designed for websites, APIs, SaaS teams, and managed customer environments
          </p>
          <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-600">
            <span className="rounded-full bg-slate-100 px-4 py-2">OWASP CRS coverage</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">Multi-tenant controls</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">Analytics and logging</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">Managed SSL delivery</span>
          </div>
        </div>
      </section>

      <section id="capabilities" className="bg-[#f3f6fb] py-24 text-slate-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <SectionEyebrow>Core capabilities</SectionEyebrow>
            <h2 className="mt-5 font-serif text-4xl leading-tight text-slate-950 sm:text-5xl">
              The protection stack your customers expect from a serious WAF.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              This platform combines a reverse-proxy edge, policy-driven inspection, certificate automation,
              operational visibility, and tenant-scoped control into one managed layer.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {capabilityHighlights.map((item, index) => {
              const icons = [ShieldIcon, PulseIcon, GlobeIcon, LockIcon];
              const Icon = icons[index % icons.length];

              return (
                <article
                  key={item.title}
                  className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-cyan-300">
                    <Icon />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
          <div>
            <SectionEyebrow>Security features</SectionEyebrow>
            <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
              Rich controls for blocking, allowing, inspecting, and proving value.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              The feature set is built around actual capabilities already present in the platform, from edge traffic
              enforcement to operational dashboards and certificate workflows.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {platformFeatures.map((feature) => (
              <div key={feature} className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  <span className="leading-7">{feature}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#f3f6fb_0%,#ffffff_100%)] py-24 text-slate-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div>
              <SectionEyebrow>How it works</SectionEyebrow>
              <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
                Familiar onboarding, stronger enforcement, cleaner operations.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                The deployment flow is straightforward: add the app, point DNS, activate edge services, and operate
                from a single management surface.
              </p>
            </div>

            <div className="space-y-5">
              {deploymentSteps.map((item) => (
                <div key={item.step} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700">{item.step}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white py-24 text-slate-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <SectionEyebrow>Pricing</SectionEyebrow>
            <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
              Managed WAF-as-a-service pricing for organizations that want security operated for them.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              ATRAVAD WAF is a managed service operated by a 24/7 cyber defense operations center. We take care of
              policy handling, traffic protection, monitoring, and operational defense so your team can focus on
              running and growing the business.
            </p>
          </div>

          <div className="mt-14 grid gap-6 xl:grid-cols-4">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-[32px] border p-8 shadow-[0_22px_70px_rgba(15,23,42,0.08)] ${
                  plan.highlight
                    ? 'border-cyan-300 bg-slate-950 text-white'
                    : 'border-slate-200 bg-[#f7f9fc] text-slate-950'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`text-sm font-semibold uppercase tracking-[0.3em] ${
                        plan.highlight ? 'text-cyan-300' : 'text-slate-500'
                      }`}
                    >
                      {plan.name}
                    </p>
                    <p className={`mt-4 text-5xl font-semibold ${plan.highlight ? 'text-white' : 'text-slate-950'}`}>
                      {plan.price}
                      {plan.cadence ? <span className={`ml-1 text-lg ${plan.highlight ? 'text-slate-300' : 'text-slate-500'}`}>{plan.cadence}</span> : null}
                    </p>
                  </div>
                  {plan.highlight ? (
                    <span className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950">
                      Most popular
                    </span>
                  ) : null}
                </div>

                <p className={`mt-5 text-sm leading-7 ${plan.highlight ? 'text-slate-300' : 'text-slate-600'}`}>
                  {plan.description}
                </p>

                <div className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          plan.highlight ? 'bg-cyan-300' : 'bg-cyan-700'
                        }`}
                      />
                      <span className={`text-sm leading-7 ${plan.highlight ? 'text-slate-200' : 'text-slate-700'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <Link
                    href="/login"
                    className={`flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold ${
                      plan.highlight
                        ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                        : 'bg-slate-950 text-white hover:bg-slate-800'
                    }`}
                  >
                    {plan.name === 'Multi-Site & Custom' ? 'Talk to sales' : 'Get started'}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#091322] py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_26px_90px_rgba(2,6,23,0.55)]">
              <SectionEyebrow>Operations and control</SectionEyebrow>
              <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
                Operate security from one control layer without adding complexity for customers.
              </h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                ATRAVAD WAF gives your team one place to manage policies, SSL, protected applications, analytics, and
                tenant-scoped activity while customers experience a clean, managed protection layer in front of their
                sites and APIs.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                  <p className="text-sm font-semibold text-white">Edge inspection</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">Traffic is inspected before it reaches origin infrastructure.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                  <p className="text-sm font-semibold text-white">Real-time sync</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">Application and policy changes are picked up without manual node edits.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                  <p className="text-sm font-semibold text-white">Operational clarity</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">Teams can review logs, analytics, status, and tenant-scoped activity centrally.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(8,17,31,0.94))] p-8 shadow-[0_26px_90px_rgba(2,6,23,0.55)]">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Get started</p>
              <h3 className="mt-5 text-3xl font-semibold text-white">
                Protect production websites and APIs with a managed enterprise WAF.
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                Deliver commercially credible protection with managed SSL, policy enforcement, threat visibility, and
                security controls built for live customer environments.
              </p>
              <div className="mt-8 space-y-3">
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  Start with ATRAVAD WAF
                </Link>
                <a
                  href="#pricing"
                  className="flex w-full items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-white/35"
                >
                  Review pricing
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
