"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { landingHeader, landingLinks, landingNav } from "@/content/landing";
import { IconArrowUpRight, IconClose, IconMenu } from "@/components/landing/landing-icons";

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-[6] flex items-center justify-between gap-4 pl-4 pr-3 pt-3 lg:pl-14 lg:pr-8 lg:pt-5">
      <Link href="/" className="flex items-center no-underline">
        <Logo size="sm" preload />
      </Link>

      <nav aria-label="Seções" className="hidden items-center gap-8 lg:flex">
        {landingNav.map((item) => (
          <a key={item.href} href={item.href} className="font-medium text-ink-muted no-underline transition-colors hover:text-ink">
            {item.label}
          </a>
        ))}
      </nav>

      <div className="hidden items-center gap-5 lg:flex">
        <Link href={landingLinks.login} className="font-medium text-ink-muted no-underline transition-colors hover:text-ink" title={landingHeader.loginHint}>
          {landingHeader.login}
        </Link>
        <Link
          href={landingLinks.signUp}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline transition-colors hover:bg-brand-strong"
        >
          {landingHeader.cta}
          <IconArrowUpRight size={16} strokeWidth={2} />
        </Link>
      </div>

      <div className="flex items-center gap-1.5 lg:hidden">
        <Link
          href={landingLinks.signUp}
          className="inline-flex h-11 items-center rounded-lg bg-brand px-4 text-sm font-medium text-on-brand no-underline"
        >
          {landingHeader.cta}
        </Link>
        <button
          type="button"
          aria-label={menuOpen ? landingHeader.closeMenu : landingHeader.openMenu}
          aria-expanded={menuOpen}
          aria-controls="landing-menu"
          onClick={() => setMenuOpen((open) => !open)}
          className="grid size-11 place-items-center rounded-lg border-[1.5px] border-border-strong bg-surface text-ink"
        >
          {menuOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
        </button>
      </div>

      {menuOpen ? (
        <div
          id="landing-menu"
          className="absolute inset-x-3 top-[72px] flex flex-col rounded-2xl border border-border bg-surface p-2 shadow-pop lg:hidden"
        >
          {landingNav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3.5 font-medium text-ink no-underline hover:bg-surface-muted"
            >
              {item.label}
            </a>
          ))}
          <Link
            href={landingLinks.login}
            className="mx-1 mb-1 mt-2 grid h-12 place-items-center rounded-lg border-[1.5px] border-border-strong text-[15px] font-medium text-ink no-underline"
          >
            {landingHeader.login}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
