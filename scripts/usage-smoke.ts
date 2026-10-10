/**
 * Teste de fumaça do controle de uso contra o banco configurado em .env.local.
 * Usa um aluno de mentira (sem tocar em contas reais) e apaga o que criou.
 *
 *   npx tsx --env-file=.env.local scripts/usage-smoke.ts
 */
import { consumeFeature, getUsageSnapshot, PlanLimitError, requireTier } from "@/lib/usage";
import { getPrisma } from "@/lib/prisma";

const user = { id: `smoke-${Date.now()}`, email: undefined };
const prisma = getPrisma();
const tierUsers: string[] = [];

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`FALHOU: ${message}`);
  console.log("ok -", message);
}

async function main() {
  try {
    // 1) Básico: 12 mensagens por dia; a 13ª é bloqueada.
    let last = await consumeFeature(user, "chat_message", { tier: "basic" });
    assert(last.remaining === 11 && last.max === 12, "primeira mensagem sobra 11 de 12");
    for (let i = 0; i < 11; i += 1) last = await consumeFeature(user, "chat_message", { tier: "basic" });
    assert(last.remaining === 0, "a 12ª mensagem zera o limite");

    let blocked: unknown = null;
    try {
      await consumeFeature(user, "chat_message", { tier: "basic" });
    } catch (error) {
      blocked = error;
    }
    assert(blocked instanceof PlanLimitError && blocked.info.code === "limit_reached", "a 13ª mensagem é bloqueada");
    if (blocked instanceof PlanLimitError) {
      assert(blocked.info.upgradeTo === "full" && Boolean(blocked.info.resetAt), "bloqueio informa upgrade e quando volta");
      assert(!/\d/.test(blocked.info.message), "mensagem de limite sem números");
      console.log("   mensagem:", blocked.info.message);
    }

    // 2) Devolver o uso libera de novo.
    await last.refund();
    const again = await consumeFeature(user, "chat_message", { tier: "basic" });
    assert(again.remaining === 0, "depois do refund dá para usar de novo");

    // 3) Sem assinatura: não existe plano gratuito, a IA recusa com 402.
    let noPlan: unknown = null;
    try {
      await requireTier({ id: `smoke-sem-plano-${Date.now()}`, email: undefined }, "chat_message");
    } catch (error) {
      noPlan = error;
    }
    assert(noPlan instanceof PlanLimitError && noPlan.info.code === "subscription_required" && noPlan.status === 402, "sem assinatura, a IA recusa");

    // 4) Simulado por IA contado em questões: no Básico (50 por dia) dois pedidos de 30 ao mesmo tempo: só 1 passa.
    const results = await Promise.allSettled(Array.from({ length: 2 }, () => consumeFeature(user, "ai_simulado", { tier: "basic", amount: 30 })));
    const passed = results.filter((item) => item.status === "fulfilled").length;
    assert(passed === 1, `corrida: só 1 simulado de 30 de 2 passou (passaram ${passed})`);
    const rest = await consumeFeature(user, "ai_simulado", { tier: "basic", amount: 20 });
    assert(rest.remaining === 0, "sobram 20 questões depois de um simulado de 30");

    // 5) Painel de uso.
    const snapshot = await getUsageSnapshot(user, { tier: "basic" });
    assert(snapshot.features.chat_message.used === 12 && snapshot.features.chat_message.remaining === 0, "snapshot mostra 12 de 12 usadas");
    assert(snapshot.features.ai_simulado.used === 50, "snapshot conta as 50 questões de simulado");

    // 3) Cada plano tem o seu limite: o mesmo recurso libera mais uso no Básico e mais ainda no Completo.
    async function usesUntilBlocked(tier: "basic" | "full", feature: "chat_message" | "ai_quiz" | "ai_simulado") {
      const someone = { id: `smoke-${tier}-${feature}-${Date.now()}`, email: undefined };
      tierUsers.push(someone.id);
      let used = 0;
      for (;;) {
        try {
          await consumeFeature(someone, feature, { tier });
          used += 1;
          if (used > 120) return used;
        } catch (error) {
          if (error instanceof PlanLimitError) return used;
          throw error;
        }
      }
    }
    const expected: Array<[Parameters<typeof usesUntilBlocked>[0], Parameters<typeof usesUntilBlocked>[1], number]> = [
      ["basic", "chat_message", 12], ["full", "chat_message", 30],
      ["basic", "ai_quiz", 10], ["full", "ai_quiz", 20],
      ["basic", "ai_simulado", 50], ["full", "ai_simulado", 90],
    ];
    for (const [tier, feature, max] of expected) {
      const used = await usesUntilBlocked(tier, feature);
      assert(used === max, `${feature} no plano ${tier}: ${used} usos antes do bloqueio (esperado ${max})`);
    }
  } finally {
    await prisma.usageEvent.deleteMany({ where: { userId: user.id } });
    await prisma.usageEvent.deleteMany({ where: { userId: { in: tierUsers } } });
    await prisma.$disconnect();
  }
  console.log("\nTudo certo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
