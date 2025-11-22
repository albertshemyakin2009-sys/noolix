// pages/chat.js
import { useEffect, useRef, useState } from "react";

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

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function getSubjectPrepositional(subject) {
  if (!subject) return "";
  const s = subject.toLowerCase();
  switch (s) {
    case "математика":
      return "математике";
    case "физика":
      return "физике";
    case "русский язык":
      return "русскому языку";
    case "английский язык":
      return "английскому языку";
    default:
      return s;
  }
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [context, setContext] = useState({
    subject: "Математика",
    level: "10–11 класс",
    mode: "exam_prep",
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTopic, setCurrentTopic] = useState("");
  const messagesEndRef = useRef(null);

  // Инициализация: подтягиваем контекст и историю
  useEffect(() => {
    try {
      // контекст (предмет, уровень)
      const rawContext = window.localStorage.getItem("noolixContext");
      let ctx = { subject: "Математика", level: "10–11 класс", mode: "exam_prep" };
      if (rawContext) {
        const parsed = JSON.parse(rawContext);
        ctx = { ...ctx, ...parsed };
      }

      // история чата
      const rawHistory = window.localStorage.getItem("noolixChatHistory");
      let initialMessages = [];
      if (rawHistory) {
        const arr = JSON.parse(rawHistory);
        if (Array.isArray(arr) && arr.length > 0) {
          initialMessages = arr;
        }
      }

      setContext(ctx);

      if (initialMessages.length > 0) {
        setMessages(initialMessages);
      } else {
        initialMessages = [
          {
            id: Date.now(),
            role: "assistant",
            content: `Привет! Я NOOLIX. Давай разберёмся с предметом «${ctx.subject}» на уровне «${ctx.level}». Расскажи, что именно тебе сейчас сложно или что хочешь повторить?`,
            createdAt: new Date().toISOString(),
          },
        ];
        setMessages(initialMessages);
      }
    } catch (e) {
      console.warn("Failed to init chat context/history", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Читаем тему из URL (?topic=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const topicFromQuery = params.get("topic");
      if (topicFromQuery && topicFromQuery.trim()) {
        setCurrentTopic(topicFromQuery.trim());
      }
    } catch (e) {
      console.warn("Failed to parse topic from URL", e);
    }
  }, []);

  // Сохраняем историю в localStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        window.localStorage.setItem("noolixChatHistory", JSON.stringify(messages));
      }
    } catch (e) {
      console.warn("Failed to save chat history", e);
    }
  }, [messages]);

  // Автоскролл вниз
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, thinking]);

  const callBackend = async (userMessages) => {
    try {
      setError("");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: userMessages.map(({ role, content }) => ({ role, content })),
          context: { ...context, currentTopic },
        }),
      });

      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch (e) {
          data = {};
        }
        console.error("API /api/chat error:", data);
        throw new Error(
          data.error ||
            data.details ||
            "Ошибка при обращении к серверу"
        );
      }

      const data = await res.json();
      const replyText =
        typeof data.reply === "string"
          ? data.reply
          : "У меня не получилось получить ответ от ИИ. Попробуй ещё раз.";

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: replyText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Произошла ошибка при получении ответа. Попробуй ещё раз или обнови страницу."
      );
    } finally {
      setThinking(false);
    }
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || thinking) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setThinking(true);

    callBackend(newMessages);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { key: "explain", label: "Объясни тему" },
    { key: "steps", label: "Разбери задачу по шагам" },
    { key: "test", label: "Сделай мини-тест" },
  ];

  const handleQuickAction = (key) => {
    const subjPrep = getSubjectPrepositional(context.subject);
    let text = "";
    if (key === "explain") {
      text = `Объясни тему по ${subjPrep}: `;
    } else if (key === "steps") {
      text = `Разбери по шагам задачу по ${subjPrep}: `;
    } else if (key === "test") {
      text = `Сделай мини-тест по ${subjPrep}: `;
    }
    setInput(text);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white gap-3">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent animate-pulse tracking-wide">
          NOOLIX
        </h1>
        <p className="text-xs text-purple-100/80">Загружаем контекст диалога…</p>
        <div className="flex gap-1 text-sm text-purple-100">
          <span className="animate-pulse">•</span>
          <span className="animate-pulse opacity-70">•</span>
          <span className="animate-pulse opacity-40">•</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient.to-br from-[#2E003E] via-[#200026] to-black text-white flex relative">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <button
        className="absolute top-4 left-4 z-50 bg-white/95 text-black px-4 py-2 rounded shadow-md md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰ Меню
      </button>

      <aside
        className={`fixed md:static top-0 left-0 h-full w-60 md:w-64 p-6 space-y-6 transform transition-transform duration-300 z-40
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        bg-gradient-to-b from-black/40 via-[#2E003E]/85 to-transparent`}
      >
        <div className="mb-3">
          <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#FDF2FF] via-[#E5DEFF] to-white text-transparent bg-clip-text">
            NOOLIX
          </div>
          <p className="text-xs text-purple-200 mt-1 opacity-80">
            AI-платформа для учёбы
          </p>
        </div>

        <nav className="space-y-3 text-sm md:text-base">
          <div className="space-y-2">
            {primaryMenuItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition
                  ${item.key === "chat" ? "bg-white/15" : "hover:bg-white/5"}
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient.to-br from-purple-100 to-white
                    ${item.key === "chat" ? "ring-2 ring-purple-200" : ""}
                  `}
                >
                  {item.icon}
                </span>
                <span className={item.key === "chat" ? "font-semibold" : ""}>
                  {item.label}
                </span>
              </a>
            ))}
          </div>

          <div className="h-px bg-white/10 my-2" />

          <div className="space-y-2">
            {secondaryMenuItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-white/5 transition"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient.to-br from-purple-100 to-white">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
          <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <aside className="space-y-4">
              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Текущая сессия
                </p>
                <h2 className="text-sm font-semibold mb-1">Контекст</h2>
                <p className="text-xs text-purple-100">
                  Предмет: <span className="font-semibold">{context.subject}</span>
                </p>
                <p className="text-xs text-purple-100">
                  Уровень: <span className="font-semibold">{context.level}</span>
                </p>
                <p className="text-[11px] text-purple-300/80 mt-1">
                  Режим: подготовка к экзамену
                </p>
                {currentTopic && (
                  <p className="text-[11px] text-purple-200 mt-1">
                    Тема с карты знаний:{" "}
                    <span className="font-semibold">{currentTopic}</span>
                  </p>
                )}
              </section>

              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Цель сессии
                </p>
                <p className="text-xs text-purple-100">
                  Мини-цель: разобраться в одной теме и решить хотя бы 2–3 задачи без подсказок.
                </p>
              </section>

              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Быстрые запросы
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => handleQuickAction(action.key)}
                      className="text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 transition"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </section>

              {error && (
                <section className="bg-red-900/40 border border-red-500/60 rounded-2xl p-3">
                  <p className="text-[11px] text-red-100">{error}</p>
                </section>
              )}
            </aside>

            <section className="flex flex-col h-[60vh] md:h-[70vh] bg-black/30 border border-white/10 rounded-2xl">
              <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h1 className="text-sm md:text-base font-semibold">Диалог с NOOLIX</h1>
                  <p className="text-[11px] text-purple-200">
                    {context.subject} • {context.level}
                    {currentTopic && <> • Тема: {currentTopic}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-purple-200">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <span>{thinking ? "Обрабатываю вопрос…" : "Готов к диалогу"}</span>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex flex-col max-w-[80%] ${
                        m.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                    <div
  className={`rounded-2xl px-3 py-2 text-xs md:text-sm whitespace-pre-wrap
    ${
      m.role === "user"
        ? "bg-purple-500/80 text-white rounded-br-sm"
        : "bg-black/60 text-purple-50 border border-white/5 rounded-bl-sm"
    }
  `}
>
  {m.content}
</div>

                      <span className="mt-1 text-[10px] text-purple-300/80">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-1 rounded-2xl px-3 py-2 bg-white/5 border border-white/10 text-[11px] text-purple-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-300 animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-300 animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-300 animate-pulse" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSubmit}
                className="border-t border-white/10 px-3 py-3 flex items-center gap-2"
              >
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Спроси про любую задачу или тему. Например: «Объясни, как решать квадратные уравнения»."
                  className="flex-1 resize-none bg-black/40 border border-white/15 rounded-2xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-purple-300/60"
                />
                <button
                  type="submit"
                  disabled={thinking || !input.trim()}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white text-black text-xs md:text-sm font-semibold shadow-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ➤
                </button>
              </form>

              <p className="px-4 pb-3 text-[10px] text-purple-300/80">
                NOOLIX сейчас в режиме прототипа. Ответы могут быть неточными, проверяй важные моменты.
              </p>
            </section>
          </div>
        </main>

        <footer className="bg-[#1A001F]/90 border-t border-white/10 text-center py-3 text-xs text-purple-200">
          © 2025 NOOLIX — образовательная платформа будущего. Связь: support@noolix.ai
        </footer>
      </div>
    </div>
  );
}
