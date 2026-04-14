'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import { SiteHeader } from '@/components/SiteHeader';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { BlockedTrafficMap } from '@/components/ui/blocked-traffic-map';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlipWords } from '@/components/ui/flip-words';
import { Spotlight } from '@/components/ui/spotlight';
import { WorldMapBackground } from '@/components/ui/world-map-background';
import { cn } from '@/lib/utils';

const protectionWords = ['websites', 'APIs', 'platforms', 'applications'];
const creatorLogos = [
  { src: '/ATRA.png', alt: 'Angel T. Redoble & Associates' },
  { src: '/NSCMI.png?v=20260406', alt: 'The North-Star Cyber Management Inc.' },
];
const heroHeadlineWords = [
  'Let',
  'us',
  'take',
  'care',
  'of',
  'your',
  'cyber',
  'defense',
  'so',
  'you',
  'can',
  'focus',
  'on',
  'what',
  'you',
  'do',
  'best:',
  'running',
  'and',
  'growing',
  'your',
  'business.',
];

const defenseCounters = [
  {
    label: 'Malicious requests blocked',
    value: 148000,
    suffix: '+',
    detail: 'Illustrative annualized attack-blocking capacity for actively protected web traffic.',
  },
  {
    label: 'Hostile probes analyzed',
    value: 92000,
    suffix: '+',
    detail: 'Shows the scale of suspicious requests and validation events ATRAVA Defense can surface for review.',
  },
  {
    label: 'Policy decisions per day',
    value: 24000,
    suffix: '+',
    detail: 'Demonstrates the volume of request-level decisions a managed edge layer can process and inspect.',
  },
];

const deploymentSteps = [
  {
    step: '01',
    title: 'Register the protected application',
    description:
      'Create the application, define the origin, and align the protected domain with the site you want behind the edge.',
  },
  {
    step: '02',
    title: 'Move traffic through ATRAVA Defense',
    description:
      'Point DNS to the assigned WAF IP or CNAME so requests pass through inspection before the origin receives them.',
  },
  {
    step: '03',
    title: 'Activate policy and certificate handling',
    description:
      'Apply the security policy, enable managed or custom SSL, and validate the expected behavior under production traffic.',
  },
  {
    step: '04',
    title: 'Monitor and refine under real traffic',
    description:
      'Use logs and analytics to review blocked events, assess policy quality, and support incident analysis.',
  },
];

const pricingPlans = [
  {
    name: 'Managed Essential',
    price: '$19',
    cadence: '/mo',
    description: 'For smaller teams that need guided onboarding and dependable baseline managed web protection.',
    highlight: false,
    features: [
      '1 protected domain',
      'Managed WAF monitoring',
      '7-day log and analytics retention',
      'Managed SSL onboarding support',
      'Core visibility for attack review',
      'Business-hours support',
    ],
  },
  {
    name: 'Managed Professional',
    price: '$89',
    cadence: '/mo',
    description: 'For growing operations that need stronger controls, deeper visibility, and regular policy tuning.',
    highlight: true,
    features: [
      'Up to 5 protected websites',
      'Priority managed operations',
      'Bot, geo, IP, and rate controls',
      'Virtual patching support',
      '15-day retention',
      'Priority response handling',
    ],
  },
  {
    name: 'Managed Business',
    price: '$189',
    cadence: '/mo',
    description: 'For business-critical platforms that need broader coverage and faster escalation support.',
    highlight: false,
    features: [
      'Up to 10 protected websites',
      '24/7 managed operations',
      'Advanced tuning support',
      '30-day retention',
      'Faster escalation targets',
      'Commercial onboarding support',
    ],
  },
  {
    name: 'Managed Custom',
    price: 'Custom',
    cadence: '',
    description: 'For agencies, larger organizations, and multi-site environments that need tailored managed protection.',
    highlight: false,
    features: [
      'Multi-site or portfolio coverage',
      'Tailored onboarding and policy workflows',
      'Custom support and escalation structure',
      'Flexible reporting and operational alignment',
      'Environment-specific service planning',
      'Commercial and technical customization',
    ],
  },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const condensedDisplayClass =
  'font-barlow-condensed uppercase tracking-[-0.04em]';
const condensedUiClass =
  'font-barlow-condensed uppercase tracking-[0.08em]';
const condensedHeadingClass =
  'font-barlow-condensed uppercase tracking-[-0.02em]';

function SectionEyebrow({ children }) {
  return (
    <p className={cn(condensedUiClass, 'text-xs font-semibold tracking-[0.34em] text-[#d4a64f]')}>
      {children}
    </p>
  );
}

function MotionSection({ className, children }) {
  return (
    <motion.div
      className={className}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export default function HomePageClient() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const wallYPrimary = useTransform(scrollYProgress, [0, 1], [0, -70]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07090f] text-[#f1ece2]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[960px] bg-[radial-gradient(circle_at_16%_18%,rgba(116,18,38,0.34),transparent_26%),radial-gradient(circle_at_82%_16%,rgba(186,151,63,0.18),transparent_20%),linear-gradient(180deg,#090c14_0%,#080b12_36%,#130712_66%,#08090f_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[920px] bg-[linear-gradient(rgba(162,139,73,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(162,139,73,0.05)_1px,transparent_1px)] bg-[size:74px_74px] [mask-image:radial-gradient(circle_at_top,black,transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[920px] bg-[radial-gradient(circle_at_50%_0%,rgba(111,18,36,0.18),transparent_34%)]" />

      <section ref={heroRef} className="relative">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-6 lg:px-8 lg:pb-32">
          <SiteHeader />

          <div className="grid gap-12 pt-16 xl:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] xl:items-start">
            <MotionSection>
              <motion.div variants={itemVariants}>
                <Badge>Operational cyber defense for production web assets</Badge>
              </motion.div>
              <motion.h1 className={cn(
                condensedDisplayClass,
                'mt-6 flex max-w-[46rem] flex-wrap gap-x-3 gap-y-1.5 text-xl leading-[1.02] text-[#fff6df] [text-shadow:0_1px_0_rgba(255,255,255,0.08),0_16px_34px_rgba(2,6,23,0.34),0_30px_80px_rgba(124,22,33,0.22),0_18px_64px_rgba(212,166,79,0.14)] sm:text-2xl xl:max-w-[42rem] xl:text-[2.7rem]')
              }>
                {heroHeadlineWords.map((word, index) => (
                  <motion.span
                    key={`${word}-${index}`}
                    className="inline-block"
                    initial={{ opacity: 0.7, y: 0, filter: 'blur(0px)' }}
                    animate={{
                      opacity: [0.7, 1, 0.7],
                      y: [0, -4, 0],
                      filter: ['blur(0px)', 'blur(0px)', 'blur(0px)'],
                    }}
                    transition={{
                      duration: 2.8,
                      ease: [0.22, 1, 0.36, 1],
                      repeat: Infinity,
                      repeatType: 'loop',
                      delay: index * 0.08,
                      repeatDelay: 0.6,
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="mt-8 max-w-2xl text-[0.92rem] leading-7 text-[#dbcdb5] xl:pr-4"
              >
                ATRAVA Defense is the managed WAF layer for modern{' '}
                <span className="inline-flex min-w-[7ch] align-baseline">
                  <FlipWords
                    words={protectionWords}
                    className="font-semibold text-[#fff0c8]"
                  />
                </span>{' '}
                that need live protection, cleaner operational control, and attack telemetry teams can actually use.
                It gives operators one place to inspect, analyze, and refine defense behavior under real traffic.
              </motion.p>
              <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/login" className={cn(buttonVariants({ size: 'lg' }), condensedUiClass)}>
                  Open the command center
                </Link>
                <a href="#deployment-flow" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), condensedUiClass)}>
                  See deployment flow
                </a>
              </motion.div>
            </MotionSection>

            <MotionSection className="relative xl:pt-0">
              <div className="relative">
                <motion.div id="threat-map" style={{ y: wallYPrimary }} className="relative z-10 scroll-mt-28">
                  <BlockedTrafficMap />
                </motion.div>
              </div>
            </MotionSection>
          </div>
        </div>
      </section>

      <section className="relative py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <MotionSection>
            <div className="relative py-8">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(82,19,33,0.12),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(191,152,70,0.08),transparent_16%)]" />
              <div className="relative">
                <motion.div variants={itemVariants}>
                  <Badge>Defense at scale</Badge>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <h2 className={cn(condensedHeadingClass, 'mt-6 max-w-5xl text-3xl text-[#fff4d8] sm:text-4xl')}>
                    Quantify the blocking and analysis value of ATRAVA Defense.
                  </h2>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <p className="mt-5 max-w-3xl text-base leading-8 text-[#d6c7a9]">
                    ATRAVA Defense is built to protect production websites and APIs with active threat blocking,
                    operational visibility, and managed response support.
                  </p>
                </motion.div>
              </div>

              <div className="relative pb-14 pt-12 text-center">
                <motion.div variants={itemVariants}>
                  <AnimatedCounter
                    value={99}
                    suffix="%"
                    className={cn(
                      condensedDisplayClass,
                      'block text-[6rem] font-black leading-none text-[#d4a64f] sm:text-[8rem] lg:text-[11rem]'
                    )}
                  />
                </motion.div>
                <motion.p
                  variants={itemVariants}
                  className="mt-6 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#b99454]"
                >
                  Of attacks fully mitigated
                </motion.p>
              </div>

              <div className="grid gap-10 border-t border-[#d4a64f]/10 pt-10 lg:grid-cols-3 lg:gap-0 lg:pt-0">
                {[
                  { value: '2.4M', label: 'Requests inspected daily' },
                  { value: '9k', label: 'Threats blocked per hour' },
                  { value: '342', label: 'SSL certs managed' },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    variants={itemVariants}
                    className={cn(
                      'text-center lg:px-8 lg:py-10',
                      index < 2 ? 'lg:border-r lg:border-[#d4a64f]/10' : ''
                    )}
                  >
                    <p className={cn(condensedDisplayClass, 'text-4xl font-black text-[#fff4d8] sm:text-5xl')}>
                      {item.value}
                    </p>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#b99454]">
                      {item.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </MotionSection>
        </div>
      </section>

      <section className="border-y border-[#2e2030] bg-[#090c14] py-5 text-[#f0dec1]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#b99454]">
            Built for public websites, APIs, and managed customer environments
          </p>
          <div className="flex flex-wrap gap-3 text-sm font-medium text-[#dcc8a0]">
            {['OWASP CRS coverage', 'Tenant-aware controls', 'Threat analytics', 'Managed SSL delivery'].map((item) => (
              <Badge key={item} variant="muted" className="border-[#6a1320]/35 bg-[#170c0c] text-[#dcc8a0]">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section id="deployment-flow" className="bg-[linear-gradient(180deg,#090b12_0%,#170915_100%)] py-24 text-[#f7efe0]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <MotionSection className="text-center">
            <motion.div variants={itemVariants}>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#d4a64f]">
                {'// Deployment_Flow'}
              </p>
            </motion.div>
            <motion.h2 variants={itemVariants} className={cn(condensedHeadingClass, 'mt-5 text-4xl leading-tight sm:text-5xl lg:text-6xl')}>
              Familiar onboarding.
              <br />
              <span className="text-[#d4a64f]">Stronger enforcement.</span>
            </motion.h2>
            <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#d2c2a5]">
              From sign-up to active defense in four clean steps. No infrastructure to manage.
            </motion.p>
          </MotionSection>

          <MotionSection className="mt-16">
            <div className="relative hidden lg:block">
              <div className="pointer-events-none absolute left-[8%] right-[8%] top-10 h-px bg-[linear-gradient(90deg,rgba(212,166,79,0.15),rgba(212,166,79,0.55),rgba(212,166,79,0.15))]" />
              <div className="grid grid-cols-4 gap-8">
                {deploymentSteps.map((item) => (
                  <motion.div key={item.step} variants={itemVariants} className="relative text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#d4a64f]/35 bg-[radial-gradient(circle_at_center,rgba(212,166,79,0.14),rgba(8,5,5,0.96))] shadow-[0_0_0_6px_rgba(5,5,5,0.92)]">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#d4a64f]/20 text-3xl font-semibold tracking-[0.08em] text-[#d4a64f]">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold text-[#fff2d2]">{item.title}</h3>
                    <p className="mx-auto mt-4 max-w-sm text-[0.98rem] leading-8 text-[#ccbda1]">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-8 lg:hidden">
              {deploymentSteps.map((item) => (
                <motion.div key={item.step} variants={itemVariants} className="rounded-[28px] border border-[#d4a64f]/10 bg-[linear-gradient(180deg,rgba(22,12,10,0.52),rgba(9,6,6,0.78))] px-6 py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d4a64f]/35 text-lg font-semibold text-[#d4a64f]">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-semibold text-[#fff2d2]">{item.title}</h3>
                  </div>
                  <p className="mt-4 text-[0.98rem] leading-8 text-[#ccbda1]">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </MotionSection>
        </div>
      </section>

      <section id="pricing" className="bg-[linear-gradient(180deg,#0b0d15_0%,#180a14_100%)] py-24 text-[#f7efe0]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <MotionSection className="max-w-3xl">
            <motion.div variants={itemVariants}>
              <SectionEyebrow>Pricing</SectionEyebrow>
            </motion.div>
            <motion.h2 variants={itemVariants} className={cn(condensedHeadingClass, 'mt-5 text-4xl leading-tight sm:text-5xl')}>
              Managed protection tiers built for operational coverage and growth.
            </motion.h2>
            <motion.p variants={itemVariants} className="mt-5 text-lg leading-8 text-[#ccbda1]">
              Each plan is structured around managed protection, visibility, and support depth so organizations can
              match service coverage to the importance of the applications they protect.
            </motion.p>
          </MotionSection>

          <MotionSection className="mt-14">
            <div className="grid gap-6 xl:grid-cols-4">
              {pricingPlans.map((plan) => (
                <motion.div key={plan.name} variants={itemVariants}>
                  <Card
                    className={cn(
                      'h-full',
                      plan.highlight
                        ? 'border-[#d4a64f]/35 bg-[linear-gradient(180deg,rgba(30,18,11,0.98),rgba(12,7,6,0.98))]'
                        : 'border-[#7c1621]/28 bg-[linear-gradient(180deg,rgba(22,10,10,0.94),rgba(7,5,5,0.98))]'
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={cn(condensedUiClass, 'text-sm font-semibold tracking-[0.3em]', plan.highlight ? 'text-[#d4a64f]' : 'text-[#caa15e]')}>
                            {plan.name}
                          </p>
                          <p className={cn(condensedHeadingClass, 'mt-4 text-5xl font-semibold text-[#fff6df]')}>
                            {plan.price}
                            {plan.cadence ? <span className="ml-1 text-lg text-[#bca885]">{plan.cadence}</span> : null}
                          </p>
                        </div>
                        {plan.highlight ? <Badge>Most popular</Badge> : null}
                      </div>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-full flex-col">
                      <div className="space-y-4">
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-3">
                            <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', plan.highlight ? 'bg-[#d4a64f]' : 'bg-[#8f2b36]')} />
                            <span className="text-sm leading-7 text-[#e3d4b7]">{feature}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8">
                        <Link
                          href="/login"
                          className={cn(
                            buttonVariants({ variant: plan.highlight ? 'default' : 'secondary' }),
                            condensedUiClass,
                            'w-full'
                          )}
                        >
                          Get started
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </MotionSection>
        </div>
      </section>

      <section id="created-by" className="relative overflow-hidden bg-[linear-gradient(180deg,#0f1018_0%,#240a18_100%)] py-18 text-[#f7efe0]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(40,126,92,0.18),transparent_28%),radial-gradient(circle_at_50%_0%,rgba(69,49,102,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]" />
        <WorldMapBackground />
        <div className="w-full">
          <MotionSection>
            <div className="relative py-10">
              <motion.div variants={itemVariants} className="mx-auto max-w-7xl px-6 text-center sm:px-8 lg:px-8">
                <SectionEyebrow>Created By</SectionEyebrow>
              </motion.div>
              <motion.p
                variants={itemVariants}
                className="mx-auto mt-5 max-w-3xl px-6 text-center text-sm leading-7 text-[#d6c7a9] sm:px-8 sm:text-base lg:px-8"
              >
                ATRAVA Defense was created by Angel T. Redoble &amp; Associates and The North-Star Cyber Management Inc.,
                Filipino companies building operational cybersecurity capability.
              </motion.p>

              <motion.div variants={itemVariants} className="mt-12 w-full overflow-hidden">
                <div className="relative">
                  <div className="homepage-logo-marquee flex w-max items-center gap-8">
                    {[...creatorLogos, ...creatorLogos, ...creatorLogos].map((logo, index) => (
                      <div
                        key={`${logo.alt}-${index}`}
                        className="group flex h-36 w-[420px] shrink-0 items-center justify-center px-6 py-4"
                      >
                        <div className="relative h-28 w-full">
                          <Image
                            src={logo.src}
                            alt={logo.alt}
                            fill
                            unoptimized
                            className="object-contain opacity-95 drop-shadow-[0_8px_24px_rgba(0,0,0,0.38)] transition duration-300 group-hover:opacity-100"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </MotionSection>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#180915_0%,#080a10_100%)] py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <MotionSection>
              <Card className="border-[#d4a64f]/12 bg-[linear-gradient(180deg,rgba(20,10,10,0.9),rgba(8,5,5,0.98))] shadow-[0_26px_90px_rgba(0,0,0,0.44)]">
                <CardHeader>
                  <SectionEyebrow>Operations and control</SectionEyebrow>
                  <CardTitle className={cn(condensedHeadingClass, 'text-4xl leading-tight text-[#fff4d8] sm:text-5xl')}>
                    Operate protection like a live defense program, not a checkbox feature.
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-lg leading-8 text-[#d6c7a9]">
                    ATRAVA Defense gives teams one command surface for protection, analytics, operational response,
                    and validation of attack activity across customer-facing platforms.
                  </CardDescription>
                </CardHeader>
              </Card>
            </MotionSection>

            <MotionSection>
              <Card className="relative overflow-hidden border-[#d4a64f]/20 bg-[linear-gradient(180deg,rgba(124,22,33,0.26),rgba(8,5,5,0.98))] shadow-[0_26px_90px_rgba(0,0,0,0.44)]">
                <Spotlight />
                <CardHeader className="relative">
                  <Badge className="w-fit">Get started</Badge>
                  <CardTitle className={cn(condensedHeadingClass, 'text-3xl text-[#fff6df]')}>
                    Protect production websites and APIs with ATRAVA Defense.
                  </CardTitle>
                  <CardDescription className="text-[#e0d1b2]">
                    Managed SSL, policy enforcement, log visibility, and analytics in a command surface designed for live traffic.
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  <Link href="/login" className={cn(buttonVariants({ size: 'lg' }), condensedUiClass, 'w-full')}>
                    Start with ATRAVA Defense <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a href="#pricing" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), condensedUiClass, 'w-full')}>
                    Review pricing
                  </a>
                </CardContent>
              </Card>
            </MotionSection>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2b2030] bg-[#07090f] py-10 text-[#e7d7b8]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,0.6fr))]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4a64f]/30 bg-[#f3e2b7] shadow-[0_16px_44px_rgba(0,0,0,0.45)]">
                  <Image src="/logo.png" alt="ATRAVA Defense" width={32} height={32} className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-[0.22em] text-[#f5e7c8]">ATRAVA Defense</p>
                  <p className="text-xs text-[#d8c7a1]/70">Managed WAF-as-a-service</p>
                </div>
              </div>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#cdbd9e]">
                Managed web application firewall protection for production websites and APIs, with threat visibility,
                policy control, and operational support from one defense surface.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d4a64f]">Platform</p>
              <div className="mt-4 space-y-3 text-sm text-[#d7c7a6]">
                <a href="#deployment-flow" className="block transition-colors hover:text-[#f5e7c8]">Deployment flow</a>
                <a href="#threat-map" className="block transition-colors hover:text-[#f5e7c8]">Threat Map</a>
                <a href="#pricing" className="block transition-colors hover:text-[#f5e7c8]">Pricing</a>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d4a64f]">Access</p>
              <div className="mt-4 space-y-3 text-sm text-[#d7c7a6]">
                <Link href="/login" className="block transition-colors hover:text-[#f5e7c8]">Sign in</Link>
                <Link href="/login" className="block transition-colors hover:text-[#f5e7c8]">Protect a site</Link>
                <Link href="/dashboard" className="block transition-colors hover:text-[#f5e7c8]">Dashboard</Link>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d4a64f]">Built By</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#d7c7a6]">
                <p>Angel T. Redoble &amp; Associates</p>
                <p>The North-Star Cyber Management Inc.</p>
                <p>Built in the Philippines</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-[#2b1b12] pt-6 text-xs text-[#bfae8d] lg:flex-row lg:items-center lg:justify-between">
            <p>© 2026 ATRAVA Defense. Managed WAF-as-a-service.</p>
            <p>Operational cyber defense for production websites and APIs.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
