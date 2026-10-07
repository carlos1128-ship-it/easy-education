"use client";

import { startProductTour } from "@/components/onboarding/product-tour";

export function TourReplayButton() {
  return (
    <button
      type="button"
      onClick={startProductTour}
      className="mt-4 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
    >
      Rever o tutorial do app
    </button>
  );
}
