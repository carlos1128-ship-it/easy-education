import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { landingMeta } from "@/content/landing";

export const metadata: Metadata = {
  title: landingMeta.title,
  description: landingMeta.description,
  openGraph: { title: landingMeta.title, description: landingMeta.description, locale: "pt_BR", type: "website" },
};

export default function Page() {
  return <LandingPage />;
}
