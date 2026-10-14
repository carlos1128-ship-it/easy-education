import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../../src/lib/prisma";
loadEnvConfig(process.cwd());
const tables = ["exam_institutions", "past_exams", "exam_licenses", "exam_documents", "exam_items", "exam_answer_keys", "exam_attempts", "exam_student_answers"];
async function main() {
  const db = getPrisma();
  try {
    const existing = await db.$queryRaw<{ tablename: string }[]>(Prisma.sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (${Prisma.join(tables)})`);
    if (existing.length && existing.length !== tables.length) throw new Error("Migração parcial detectada. Não reaplicar automaticamente.");
    if (!existing.length) {
      if (!process.argv.includes("--apply")) { console.log("8 tabelas novas. Nenhuma tabela legada será alterada. Use --apply para aplicar."); return; }
      const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, statement_timeout: 30000 });
      await client.connect();
      try {
        await client.query("BEGIN");
        await client.query(await readFile("prisma/migrations/000016_past_exam_booklets/migration.sql", "utf8"));
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { await client.end(); }
    }
    const permissions = await db.$queryRaw<{ relname: string; relrowsecurity: boolean; anon_read: boolean; user_read: boolean }[]>(Prisma.sql`SELECT relname, relrowsecurity, has_table_privilege('anon', oid, 'SELECT') AS anon_read, has_table_privilege('authenticated', oid, 'SELECT') AS user_read FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN (${Prisma.join(tables)})`);
    if (permissions.length !== 8 || permissions.some((p) => !p.relrowsecurity || p.anon_read || p.user_read)) throw new Error("Verificação RLS falhou.");
    console.log(JSON.stringify({ tables: permissions.length, rlsEnabled: true, directClientAccess: false, legacyTablesChanged: false }));
  } finally { await db.$disconnect(); }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : "Falha na migração."); process.exitCode = 1; });
