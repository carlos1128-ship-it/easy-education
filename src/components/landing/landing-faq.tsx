"use client";

import { useId, useState } from "react";
import { landingFaq } from "@/content/landing";
import { IconChevronDown } from "@/components/landing/landing-icons";
import { cn } from "@/lib/utils";

export function LandingFaq() {
  const [open, setOpen] = useState(0);
  const baseId = useId();

  return (
    <div className="flex flex-col gap-3">
      {landingFaq.items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-faq-${index}`;
        return (
          <div key={item.q} className="rounded-2xl border border-border bg-surface">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? -1 : index)}
              className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-base font-bold leading-[22px] text-ink"
            >
              <span>{item.q}</span>
              <IconChevronDown size={20} className={cn("flex-none transition-transform duration-200", isOpen && "rotate-180")} />
            </button>
            {isOpen ? (
              <p id={panelId} className="m-0 px-5 pb-[18px] text-ink-muted [text-wrap:pretty]">
                {item.a}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
