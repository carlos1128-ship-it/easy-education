import type { User } from "@supabase/supabase-js";
import { getPrisma } from "@/lib/prisma";

function getUserName(user: User, fallbackName?: string) {
  const metadataName = user.user_metadata.name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  if (fallbackName?.trim()) return fallbackName.trim();
  return user.email ?? "Aluno Easy";
}

/**
 * Garante que o perfil existe. Só grava no banco quando algo mudou:
 * gravar a cada render disparava o realtime de `profiles`, que chamava
 * router.refresh(), que renderizava de novo — um ciclo infinito.
 */
export async function ensureProfileForUser(user: User, fallbackName?: string) {
  const prisma = getPrisma();
  const metadataName = user.user_metadata.name;
  const shouldRefreshName = (typeof metadataName === "string" && metadataName.trim()) || fallbackName?.trim();
  const email = user.email ?? "";

  const existing = await prisma.profile.findUnique({ where: { userId: user.id } });

  if (!existing) {
    return prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: getUserName(user, fallbackName),
        email,
      },
    });
  }

  const nextName = shouldRefreshName ? getUserName(user, fallbackName) : existing.name;
  if (existing.name === nextName && existing.email === email) {
    return existing;
  }

  return prisma.profile.update({
    where: { userId: user.id },
    data: { name: nextName, email },
  });
}
