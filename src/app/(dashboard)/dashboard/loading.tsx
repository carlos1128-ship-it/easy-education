import { OwlLoader } from "@/components/mascot/owl-mascot";

/** Carregamento das telas do app: a coruja de patinete atravessa a tela. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[960px] flex-col items-center justify-center">
      <OwlLoader label="Carregando seus estudos…" />
    </div>
  );
}
