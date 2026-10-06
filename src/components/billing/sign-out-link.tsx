"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutLink() {
  const router = useRouter();

  async function handleClick() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleClick} className="font-semibold text-brand-strong underline underline-offset-2">
      Sair
    </button>
  );
}
