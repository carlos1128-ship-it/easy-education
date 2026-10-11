import Link from "next/link";
import { OwlMascot } from "@/components/mascot/owl-mascot";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-12">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <OwlMascot mood="piscando" size={220} priority />
        <h1 className="m-0 text-2xl font-bold text-ink">Essa página voou para longe.</h1>
        <p className="m-0 text-ink-muted">O endereço pode ter mudado ou a página não existe mais.</p>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline hover:bg-brand-strong">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
