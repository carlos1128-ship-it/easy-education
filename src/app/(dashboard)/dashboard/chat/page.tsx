import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
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
