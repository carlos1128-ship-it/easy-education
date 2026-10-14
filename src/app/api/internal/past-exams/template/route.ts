import { requireAdminApi } from "@/lib/admin";
export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  return new Response("numero,resposta\n1,A\n2,B\n3,ANULADA\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=gabarito-modelo.csv",
      "Cache-Control": "private, no-store",
    },
  });
}
