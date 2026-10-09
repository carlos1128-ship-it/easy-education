import { ChatInterface } from "@/components/chat/chat-interface";
import { LockedPage } from "@/components/plan/locked-page";
import { allowanceFor } from "@/lib/plans";
import { getStudentOrRedirect } from "@/lib/server-user";

export default async function ChatPage() {
  const { access } = await getStudentOrRedirect();
  if (allowanceFor(access.tier, "chat_message").kind === "locked") {
    return (
      <LockedPage
        feature="chat_message"
        tier={access.tier}
        title="Chat com IA"
        description="Tire dúvidas, mande a foto de um exercício e peça quizzes e simulados para a IA. O chat faz parte dos planos pagos, e você pode testar grátis por 7 dias."
        bullets={["Explicações no seu ritmo, do jeito que você aprende", "Foto de exercício ou do caderno", "Cria quiz, flashcards e simulado na conversa"]}
      />
    );
  }
  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-5">
      <div>
        <p className="text-sm font-medium text-brand-strong">Chat IA</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Estude conversando</h1>
      </div>
      <ChatInterface />
    </div>
  );
}
