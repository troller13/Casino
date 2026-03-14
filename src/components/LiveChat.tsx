import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store/AppStore";
import {
  getChatMessages,
  sendChatMessage,
  subscribeChatRoom,
} from "../services/supabase";
import type { ChatMessage } from "../types/index.ts";

interface Props {
  roomId: string;
  roomLabel?: string;
  compact?: boolean;
}

export function LiveChat({
  roomId,
  roomLabel = "Chat General",
  compact = false,
}: Props) {
  const { state, showToast } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(!compact);
  const bottomRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<ReturnType<typeof subscribeChatRoom> | null>(null);

  useEffect(() => {
    getChatMessages(roomId, 50).then(setMessages);

    subRef.current = subscribeChatRoom(roomId, (msg) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      subRef.current?.unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || !state.user || !state.profile) return;
    if (msg.length > 280) {
      showToast("Mesajul e prea lung (max 280 caractere)", "error");
      return;
    }
    setSending(true);
    await sendChatMessage(roomId, state.user.id, state.profile.username, msg);
    setInput("");
    setSending(false);
  }

  const timeStr = (iso: string) =>
    new Date(iso).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (compact && !open) {
    const unread = messages.length;
    return (
      <button onClick={() => setOpen(true)} style={cs.triggerBtn}>
        💬 {roomLabel}
        {unread > 0 && (
          <span style={cs.unreadBadge}>{Math.min(unread, 99)}</span>
        )}
      </button>
    );
  }

  return (
    <div style={{ ...cs.wrap, height: compact ? 360 : "100%" }}>
      {/* Header */}
      <div style={cs.header}>
        <span style={cs.headerTitle}>💬 {roomLabel}</span>
        <div style={cs.headerRight}>
          <span style={cs.onlineDot} />
          <span style={cs.onlineCount}>
            {Math.floor(Math.random() * 20) + 5} online
          </span>
          {compact && (
            <button onClick={() => setOpen(false)} style={cs.closeBtn}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={cs.messages}>
        {messages.length === 0 && (
          <div style={cs.empty}>Fii primul care comentează! 💬</div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.user_id === state.user?.id;
          const showName = i === 0 || messages[i - 1].user_id !== msg.user_id;
          return (
            <div
              key={msg.id}
              style={{
                ...cs.msgRow,
                justifyContent: isMe ? "flex-end" : "flex-start",
                animationDelay: "0ms",
              }}
            >
              <div
                style={{
                  ...cs.bubble,
                  background: isMe ? "rgba(200,241,53,0.12)" : "#161b2e",
                  borderColor: isMe
                    ? "rgba(200,241,53,0.25)"
                    : "rgba(255,255,255,0.06)",
                  borderRadius: isMe
                    ? "12px 12px 2px 12px"
                    : "12px 12px 12px 2px",
                }}
              >
                {showName && !isMe && (
                  <div style={cs.sender}>{msg.username}</div>
                )}
                <div style={cs.msgText}>{msg.message}</div>
                <div style={cs.msgTime}>{timeStr(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {state.user ? (
        <form onSubmit={handleSend} style={cs.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrie un mesaj..."
            style={cs.input}
            maxLength={280}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            style={cs.sendBtn}
          >
            {sending ? "..." : "↑"}
          </button>
        </form>
      ) : (
        <div style={cs.loginNotice}>Autentifică-te pentru a comenta</div>
      )}
    </div>
  );
}

const cs: Record<string, React.CSSProperties> = {
  triggerBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#8892a4",
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 14px",
    cursor: "pointer",
  },
  unreadBadge: {
    background: "#ff2d55",
    color: "#fff",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    borderRadius: "50%",
    width: 16,
    height: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  wrap: {
    display: "flex",
    flexDirection: "column",
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "linear-gradient(135deg, rgba(0,229,255,0.06), transparent)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 15,
    letterSpacing: 1,
    color: "#f0f4ff",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 6 },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#00cc66",
    boxShadow: "0 0 6px #00cc66",
  },
  onlineCount: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#3d4660",
    fontSize: 12,
    cursor: "pointer",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minHeight: 0,
  },
  empty: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#252c40",
    textAlign: "center",
    padding: "20px 0",
  },
  msgRow: { display: "flex", animation: "fadeInUp 0.2s ease" },
  bubble: {
    maxWidth: "78%",
    border: "1px solid",
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  sender: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#00e5ff",
    letterSpacing: 0.5,
  },
  msgText: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    color: "#f0f4ff",
    lineHeight: 1.4,
    wordBreak: "break-word" as const,
  },
  msgTime: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    color: "#3d4660",
    textAlign: "right" as const,
  },
  inputRow: {
    display: "flex",
    gap: 6,
    padding: "10px 12px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "#080a0f",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    color: "#f0f4ff",
    padding: "8px 14px",
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    outline: "none",
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #00e5ff, #0090b0)",
    color: "#06080c",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loginNotice: {
    padding: "10px 14px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#3d4660",
    textAlign: "center",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
};
