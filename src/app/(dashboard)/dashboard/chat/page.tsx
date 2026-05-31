import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">Chat IA</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Estude conversando</h1>
      </div>
      <ChatInterface />
    </div>
  );
}
