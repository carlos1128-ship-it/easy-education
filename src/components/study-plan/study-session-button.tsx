"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function StudySessionButton({ subject, durationMinutes, method, notes }: { subject: string; durationMinutes: number; method: string; notes?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function complete() {
    setLoading(true);
    const response = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, durationMinutes, method, notes }),
    });
    setLoading(false);
    if (!response.ok) {
      toast.error("Nao foi possivel registrar o estudo.");
      return;
    }
    toast.success("Estudo registrado no dashboard.");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={complete}>
      <CheckCircle2 className="size-4" />
      {loading ? "Salvando..." : "Concluir"}
    </Button>
  );
}
