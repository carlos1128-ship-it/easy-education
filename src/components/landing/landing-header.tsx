"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { landingHeader, landingLinks, landingNav } from "@/content/landing";
import { IconArrowUpRight, IconClose, IconMenu } from "@/components/landing/landing-icons";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // A barra fica fixa no topo e acompanha a rolagem; depois do início da página ganha fundo translúcido (vidro).
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-2 pt-4 sm:px-3 lg:px-6">
    <header
      className={cn(
        "pointer-events-auto relative mx-auto flex max-w-[1600px] items-center justify-between gap-2 rounded-2xl border py-2 pl-3 pr-2 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 lg:py-3 lg:pl-14 lg:pr-8",
        scrolled || menuOpen
          ? "border-border/70 bg-surface/70 shadow-card backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-transparent",
      )}
    >
      <Link href="/" className="flex items-center no-underline">
        <Logo size="xs" className="sm:hidden" preload />
        <Logo size="sm" className="hidden sm:inline-flex" preload />
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
          className="inline-flex h-11 items-center whitespace-nowrap rounded-lg bg-brand px-3 text-[13px] font-medium text-on-brand no-underline"
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
          className="absolute inset-x-0 top-[calc(100%+8px)] flex flex-col rounded-2xl border border-border bg-surface p-2 shadow-pop lg:hidden"
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
    </div>
  );
}
