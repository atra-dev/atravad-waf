'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const siteHeaderSectionNavItems = [
  { label: 'Threat Map', href: '#threat-map', sectionId: 'threat-map' },
  { label: 'Deployment Flow', href: '#deployment-flow', sectionId: 'deployment-flow' },
  { label: 'Pricing', href: '#pricing', sectionId: 'pricing' },
  { label: 'Created By', href: '#created-by', sectionId: 'created-by' },
];

export const siteHeaderPrimaryNavItems = [
  { label: 'Threat Map', href: '#threat-map', sectionId: 'threat-map' },
  { label: 'Deployment Flow', href: '#deployment-flow', sectionId: 'deployment-flow' },
  { label: 'Pricing', href: '#pricing', sectionId: 'pricing' },
  { label: 'Created By', href: '#created-by', sectionId: 'created-by' },
];

const condensedUiClass = 'font-barlow-condensed uppercase tracking-[0.08em]';

/** Homepage-only marketing nav (section anchors + auth CTAs). */
export function SiteHeader() {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const sections = siteHeaderSectionNavItems
      .map((item) => document.getElementById(item.sectionId))
      .filter(Boolean);

    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length > 0) {
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.2, 0.35, 0.5, 0.7],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
      observer.disconnect();
    };
  }, []);

  function handleSectionNavClick(event, href) {
    if (!href.startsWith('#')) {
      return;
    }

    const target = document.querySelector(href);
    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-40 flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-[#a97b35]/20 bg-[#070b13]/78 px-5 py-3 backdrop-blur-xl"
    >
      <Link href="/" className="flex items-center gap-3 text-left transition-opacity hover:opacity-90">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4a64f]/30 bg-[#f3e2b7] shadow-[0_16px_44px_rgba(0,0,0,0.45)]">
          <Image src="/logo.png" alt="ATRAVA Defense" width={32} height={32} className="h-8 w-8 object-contain" priority />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-[0.22em] text-[#f5e7c8]">ATRAVA Defense</p>
          <p className="text-xs text-[#d8c7a1]/70">Managed WAF-as-a-service</p>
        </div>
      </Link>
      <nav className="hidden items-center gap-8 lg:flex">
        {siteHeaderPrimaryNavItems.map((item) => {
          const isActive = activeSection === item.sectionId;
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={(event) => handleSectionNavClick(event, item.href)}
              className={cn(
                condensedUiClass,
                'text-lg font-semibold transition-colors',
                isActive ? 'text-[#d4a64f]' : 'text-[#f6ead2] hover:text-[#d4a64f]'
              )}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), condensedUiClass, 'hidden md:inline-flex')}
        >
          Sign in
        </Link>
        <Link href="/login" className={cn(buttonVariants({ size: 'sm' }), condensedUiClass)}>
          Protect a site
        </Link>
      </div>
    </motion.header>
  );
}
