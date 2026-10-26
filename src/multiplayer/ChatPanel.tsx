import { useEffect, useState } from "react";
import { getRoomChat, sendRoomChat, type ChatMessage } from "./rooms";
import type { RoomSession } from "./rooms";
import { Btn, Icon } from "../components/ui";

export function ChatPanel({ session }: { session: RoomSession }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const result = await getRoomChat(session.code, messages.at(-1)?.seq ?? 0);
        if (result.messages.length) setMessages((current) => [...current, ...result.messages].slice(-100));
      } catch {
        // The game remains usable if chat is temporarily unavailable.
      }
    };
    void load();
    const timer = window.setInterval(load, 1500);
    return () => window.clearInterval(timer);
  }, [open, session.code, messages]);

  async function send() {
    const value = text.trim();
    if (!value) return;
    setText("");
    try {
      const message = await sendRoomChat(session, value);
      setMessages((current) => [...current, message].slice(-100));
    } catch {
      setText(value);
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {open && (
        <div className="mb-2 flex h-80 w-80 flex-col rounded-2xl border border-white/10 bg-pitch-950/95 p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-white">
            <span>Room chat · everyone</span>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white"><Icon name="x" size={15} /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-xs text-white/40">Say something to the room.</p>}
            {messages.map((message) => (
              <div key={message.seq} className={`rounded-lg px-2.5 py-1.5 text-xs ${message.playerId === session.playerId ? "ml-6 bg-gold-400/15 text-gold-100" : "mr-6 bg-white/8 text-white/80"}`}>
                <div className="mb-0.5 text-[10px] font-bold text-white/45">{message.name}</div>
                {message.text}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} placeholder="Message…" className="min-w-0 flex-1 rounded-lg bg-white/8 px-2.5 py-2 text-xs text-white outline-none placeholder:text-white/30" />
            <Btn size="sm" onClick={send}><Icon name="arrow-right" size={14} /></Btn>
          </div>
        </div>
      )}
      <Btn variant="outline" size="sm" onClick={() => setOpen((value) => !value)}><Icon name="users" size={14} /> {open ? "Close chat" : "Chat"}</Btn>
    </div>
  );
}
