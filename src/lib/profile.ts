import type { User } from "@supabase/supabase-js";
import { getPrisma } from "@/lib/prisma";

function getUserName(user: User, fallbackName?: string) {
  const metadataName = user.user_metadata.name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  if (fallbackName?.trim()) return fallbackName.trim();
  return user.email ?? "Aluno Easy";
}

export async function ensureProfileForUser(user: User, fallbackName?: string) {
  const prisma = getPrisma();

  return prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      name: getUserName(user, fallbackName),
      email: user.email ?? "",
    },
    create: {
      userId: user.id,
      name: getUserName(user, fallbackName),
      email: user.email ?? "",
    },
  });
}
