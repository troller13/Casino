import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store/AppStore";
import { useThemedStyles } from "../store/ThemeContext";
import {
  getChatMessages,
  sendChatMessage,
  subscribeChatRoom,
} from "../services/supabase";
import type { ChatMessage } from "../types/index.ts";

const ROOM_ID = "general";

export function FloatingChat() {
  const { state, showToast } = useAppStore();
  const t = useThemedStyles();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<ReturnType<typeof subscribeChatRoom> | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    getChatMessages(ROOM_ID, 50).then(setMessages);

    subRef.current = subscribeChatRoom(ROOM_ID, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (!openRef.current) setUnread((n) => n + 1);
    });

    return () => {
      subRef.current?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  }, [open, messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || !state.user || !state.profile) return;
    if (!state.user) {
      showToast("Autentifică-te pentru a chata", "error");
      return;
    }
    setSending(true);
    await sendChatMessage(ROOM_ID, state.user.id, state.profile.username, msg);
    setInput("");
    setSending(false);
  }

  const timeStr = (iso: string) =>
    new Date(iso).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <>
      {/* ── Floating window ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 84,
            right: 24,
            zIndex: 8000,
            width: 340,
            height: 460,
            background: t.bgSurface,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            boxShadow: t.shadow,
            animation: "fadeInUp 0.25s cubic-bezier(0.23,1,0.32,1)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: t.bgCard,
              borderBottom: `1px solid ${t.border}`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#00cc66",
                  boxShadow: "0 0 6px #00cc66",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 16,
                  letterSpacing: 2,
                  color: t.text1,
                }}
              >
                CHAT GENERAL
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: t.text3,
                }}
              >
                {messages.length} mesaje
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: t.text3,
                fontSize: 16,
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: t.text3,
                  textAlign: "center",
                  padding: "30px 0",
                }}
              >
                Niciun mesaj încă. Fii primul! 💬
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.user_id === state.user?.id;
              const showName =
                i === 0 || messages[i - 1].user_id !== msg.user_id;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    animation: "fadeInUp 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      background: isMe ? t.accentBg : t.bgCard2,
                      border: `1px solid ${isMe ? t.accent + "33" : t.border}`,
                      borderRadius: isMe
                        ? "12px 12px 2px 12px"
                        : "12px 12px 12px 2px",
                      padding: "8px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
                    {showName && !isMe && (
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          color: "#00e5ff",
                          letterSpacing: 0.5,
                        }}
                      >
                        {msg.username}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 13,
                        color: t.text1,
                        lineHeight: 1.4,
                        wordBreak: "break-word" as const,
                      }}
                    >
                      {msg.message}
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 8,
                        color: t.text3,
                        textAlign: "right" as const,
                      }}
                    >
                      {timeStr(msg.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {state.user ? (
            <form
              onSubmit={handleSend}
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 12px",
                borderTop: `1px solid ${t.border}`,
                flexShrink: 0,
                background: t.bgCard,
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrie un mesaj..."
                maxLength={280}
                disabled={sending}
                style={{
                  flex: 1,
                  background: t.bgInput,
                  border: `1px solid ${t.border}`,
                  borderRadius: 20,
                  color: t.text1,
                  padding: "8px 14px",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background:
                    sending || !input.trim()
                      ? t.bgCard2
                      : "linear-gradient(135deg, #00e5ff, #0090b0)",
                  color: sending || !input.trim() ? t.text3 : "#06080c",
                  border: "none",
                  cursor: input.trim() ? "pointer" : "default",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {sending ? "⏳" : "↑"}
              </button>
            </form>
          ) : (
            <div
              style={{
                padding: "10px 14px",
                borderTop: `1px solid ${t.border}`,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: t.text3,
                textAlign: "center",
                background: t.bgCard,
              }}
            >
              Autentifică-te pentru a comenta
            </div>
          )}
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 8001,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: open
            ? t.bgCard2
            : "linear-gradient(135deg, #00e5ff, #0070a0)",
          border: `1px solid ${open ? t.border : "transparent"}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          boxShadow: open ? "none" : "0 4px 20px rgba(0,229,255,0.35)",
          transition: "all 0.2s ease",
        }}
        title="Chat general"
      >
        {open ? "✕" : "💬"}

        {/* Unread badge */}
        {!open && unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "#ff2d55",
              color: "#fff",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              width: 18,
              height: 18,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${t.bgBase}`,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            {Math.min(unread, 9)}
          </span>
        )}
      </button>
    </>
  );
}
