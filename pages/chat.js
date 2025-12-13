// pages/chat.js
import { useEffect, useRef, useState, useMemo } from "react";

/* =========================
   CONSTANTS & HELPERS
========================= */

const CONTEXT_STORAGE_KEY = "noolixContext";

const primaryMenuItems = [
  { label: "Главная", href: "/", icon: "🏛", key: "home" },
  { label: "Диалог", href: "/chat", icon: "💬", key: "chat" },
  { label: "Тесты", href: "/tests", icon: "🧪", key: "tests" },
  { label: "Прогресс", href: "/progress", icon: "📈", key: "progress" },
];

const secondaryMenuItems = [
  { label: "Библиотека", href: "/library", icon: "📚", key: "library" },
  { label: "Цели", href: "/goals", icon: "🎯", key: "goals" },
  { label: "Профиль", href: "/profile", icon: "👤", key: "profile" },
];

const getHistoryKey = (subject, level) =>
  `noolixChatHistory__${subject || "subject"}__${level || "level"}`;

const clampHistory = (arr, max = 30) =>
  Array.isArray(arr) ? arr.slice(-max) : [];

const safeParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
};

const subjectInDative = (s) => {
  switch ((s || "").toLowerCase()) {
    case "математика":
      return "математике";
    case "физика":
      return "физике";
    case "русский язык":
      return "русскому языку";
    case "английский язык":
      return "английскому языку";
    default:
      return s || "";
  }
};

/* =========================
   COMPONENT
========================= */

export default function ChatPage() {
  /* ---------- SSR / EXPORT GUARD ---------- */
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  /* ---------- UI ---------- */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ---------- CONTEXT ---------- */
  const [context, setContext] = useState({
    subject: "Математика",
    level: "10–11 класс",
    mode: "exam_prep",
  });

  /* ---------- CHAT ---------- */
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [currentTopic, setCurrentTopic] = useState("");
  const [savedMessageIds, setSavedMessageIds] = useState([]);

  const messagesEndRef = useRef(null);
  const didAutoStartRef = useRef(false);

  /* =========================
     INIT (CLIENT ONLY)
  ========================= */
  useEffect(() => {
    if (!isClient) return;

    try {
      const ctx = safeParse(
        window.localStorage.getItem(CONTEXT_STORAGE_KEY),
        null
      );
      if (ctx) setContext((p) => ({ ...p, ...ctx }));

      const activeCtx = ctx || context;
      const historyKey = getHistoryKey(
        activeCtx.subject,
        activeCtx.level
      );
      const history = safeParse(
        window.localStorage.getItem(historyKey),
        []
      );

      if (history.length > 0) {
        setMessages(clampHistory(history));
      } else {
        setMessages([
          {
            id: Date.now(),
            role: "assistant",
            content: `Привет! Я NOOLIX 🤖  
Готов помочь тебе по ${subjectInDative(
              activeCtx.subject
            )} (${activeCtx.level}).  
Выбери тему или напиши вопрос — и мы начнём.`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.warn("Init chat failed", e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  /* =========================
     AUTOSCROLL
  ========================= */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  /* =========================
     URL ?topic=
  ========================= */
  useEffect(() => {
    if (!isClient) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("topic");
      if (t && t.trim()) setCurrentTopic(t.trim());
    } catch {}
  }, [isClient]);

  /* =========================
     AUTO-START BY TOPIC
  ========================= */
  useEffect(() => {
    if (!isClient) return;
    if (loading) return;
    if (!currentTopic) return;
    if (didAutoStartRef.current) return;

    const hasUser = messages.some((m) => m.role === "user");
    if (hasUser) {
      didAutoStartRef.current = true;
      return;
    }

    if (messages.length === 0) return;

    setMessages((prev) =>
      clampHistory([
        ...prev,
        {
          id: Date.now() + 1000,
          role: "assistant",
          content: `Давай разберём тему «${currentTopic}».  
Скажи, что тебе нужнее: объяснение с нуля, разбор задач или мини-тест?`,
          createdAt: new Date().toISOString(),
        },
      ])
    );

    didAutoStartRef.current = true;
  }, [isClient, loading, currentTopic, messages]);

  /* =========================
     SAVE CHAT HISTORY
  ========================= */
  useEffect(() => {
    if (!isClient) return;
    try {
      const key = getHistoryKey(context.subject, context.level);
      window.localStorage.setItem(key, JSON.stringify(clampHistory(messages)));
    } catch {}
  }, [messages, context.subject, context.level, isClient]);

  /* =========================
     SAVED MESSAGES (LIBRARY)
  ========================= */
  useEffect(() => {
    if (!isClient) return;
    const list = safeParse(
      window.localStorage.getItem("noolixLibrarySaved"),
      []
    );
    setSavedMessageIds(
      list.map((x) => x.messageId).filter(Boolean)
    );
  }, [isClient]);

  const saveExplanationToLibrary = (m) => {
    if (!isClient || m.role !== "assistant") return;
    if (savedMessageIds.includes(m.id)) return;

    const list = safeParse(
      window.localStorage.getItem("noolixLibrarySaved"),
      []
    );

    const item = {
      id: m.id,
      messageId: m.id,
      title:
        currentTopic ||
        m.content.split("\n")[0].slice(0, 80) ||
        "Сохранённое объяснение",
      subject: context.subject,
      level: context.level,
      from: "из диалога",
      savedAt: new Date().toISOString(),
      preview: m.content.slice(0, 400),
    };

    const next = [item, ...list.filter((x) => x.messageId !== m.id)].slice(
      0,
      50
    );

    window.localStorage.setItem(
      "noolixLibrarySaved",
      JSON.stringify(next)
    );
    setSavedMessageIds((p) => [...p, m.id]);
  };

  /* =========================
     SEND MESSAGE
  ========================= */
  const sendMessage = async () => {
    if (!input.trim() || thinking) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    const next = clampHistory([...messages, userMsg]);
    setMessages(next);
    setInput("");
    setThinking(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          context: { ...context, currentTopic },
        }),
      });

      const data = await res.json();
      setMessages((p) =>
        clampHistory([
          ...p,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: data.reply || "Не удалось получить ответ.",
            createdAt: new Date().toISOString(),
          },
        ])
      );
    } catch {
      setError("Ошибка при получении ответа от NOOLIX.");
    } finally {
      setThinking(false);
    }
  };

  /* =========================
     LOADER (SSR SAFE)
  ========================= */
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold">NOOLIX</div>
          <p className="text-xs opacity-80">Загружаем диалог…</p>
        </div>
      </div>
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 p-6 border-r border-white/10 bg-black/40 flex-col gap-4">
        <div className="text-2xl font-extrabold">NOOLIX</div>
        <nav className="space-y-2 text-sm">
          {[...primaryMenuItems, ...secondaryMenuItems].map((i) => (
            <a
              key={i.key}
              href={i.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                i.key === "chat" ? "bg-white/15" : "hover:bg-white/5"
              }`}
            >
              <span>{i.icon}</span>
              <span>{i.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex flex-col ${
                  isUser ? "items-end" : "items-start"
                } gap-1`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                    isUser
                      ? "bg-white text-black"
                      : "bg-white/10 border border-white/10"
                  }`}
                >
                  {m.content}
                </div>

                <div className="flex items-center gap-2 text-[11px] opacity-70 max-w-[85%]">
                  <span>{formatTime(m.createdAt)}</span>

                  {m.role === "assistant" &&
                    (savedMessageIds.includes(m.id) ? (
                      <span className="px-2 py-1 rounded-full border border-emerald-300/60 text-emerald-200">
                        ✅ Сохранено
                      </span>
                    ) : (
                      <button
                        onClick={() => saveExplanationToLibrary(m)}
                        className="px-2 py-1 rounded-full border border-white/20 hover:bg-white/5"
                      >
                        📌 Сохранить
                      </button>
                    ))}
                </div>
              </div>
            );
          })}

          {thinking && (
            <div className="bg-white/10 px-4 py-3 rounded-2xl max-w-[60%]">
              NOOLIX думает…
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="px-4 py-2 text-xs text-red-300">{error}</div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="border-t border-white/10 p-4 flex gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Напиши вопрос или тему…"
            className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/20 text-sm resize-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="px-4 py-2 rounded-xl bg-purple-400 text-black font-semibold disabled:opacity-50"
          >
            Отправить
          </button>
        </form>
      </main>
    </div>
  );
}
