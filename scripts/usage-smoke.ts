/**
 * Teste de fumaça do controle de uso contra o banco configurado em .env.local.
 * Usa um aluno de mentira (sem tocar em contas reais) e apaga o que criou.
 *
 *   npx tsx --env-file=.env.local scripts/usage-smoke.ts
 */
import { consumeFeature, getUsageSnapshot, PlanLimitError } from "@/lib/usage";
import { getPrisma } from "@/lib/prisma";

const user = { id: `smoke-${Date.now()}`, email: undefined };
const prisma = getPrisma();

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`FALHOU: ${message}`);
  console.log("ok -", message);
}

async function main() {
  try {
    // 1) Gratuito: 3 mensagens por dia.
    const first = await consumeFeature(user, "chat_message", { tier: "free" });
    assert(first.remaining === 2 && first.max === 3, "primeira mensagem sobra 2 de 3");
    await consumeFeature(user, "chat_message", { tier: "free" });
    const third = await consumeFeature(user, "chat_message", { tier: "free" });
    assert(third.remaining === 0, "terceira mensagem zera o limite");

    let blocked: unknown = null;
    try {
      await consumeFeature(user, "chat_message", { tier: "free" });
    } catch (error) {
      blocked = error;
    }
    assert(blocked instanceof PlanLimitError && blocked.info.code === "limit_reached", "quarta mensagem é bloqueada");
    if (blocked instanceof PlanLimitError) {
      assert(blocked.info.upgradeTo === "basic" && Boolean(blocked.info.resetAt), "bloqueio informa upgrade e quando volta");
      console.log("   mensagem:", blocked.info.message);
    }

    // 2) Devolver o uso libera de novo.
    await third.refund();
    const again = await consumeFeature(user, "chat_message", { tier: "free" });
    assert(again.remaining === 0, "depois do refund dá para usar de novo");

    // 3) Recurso fechado no Gratuito.
    let locked: unknown = null;
    try {
      await consumeFeature(user, "ai_quiz", { tier: "free" });
    } catch (error) {
      locked = error;
    }
    assert(locked instanceof PlanLimitError && locked.info.code === "feature_locked" && locked.status === 403, "quiz por IA fechado no Gratuito");

    // 4) Corrida: 8 requisições ao mesmo tempo no Básico (1 simulado por semana) passam só 1.
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => consumeFeature(user, "ai_simulado", { tier: "basic" })));
    const passed = results.filter((item) => item.status === "fulfilled").length;
    assert(passed === 1, `corrida: só 1 de 8 passou (passaram ${passed})`);

    // 5) Painel de uso.
    const snapshot = await getUsageSnapshot(user, { tier: "free" });
    assert(snapshot.features.chat_message.used === 3 && snapshot.features.chat_message.remaining === 0, "snapshot mostra 3 de 3 usadas");
    assert(snapshot.features.trail.state === "locked", "snapshot mostra trilha fechada");
  } finally {
    await prisma.usageEvent.deleteMany({ where: { userId: user.id } });
    await prisma.$disconnect();
  }
  console.log("\nTudo certo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
