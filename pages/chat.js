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

function formatTime(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
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

const MAX_HISTORY = 40;

const clampHistory = (list) => {
  if (!Array.isArray(list)) return [];
  return list.length > MAX_HISTORY ? list.slice(-MAX_HISTORY) : list;
};

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
  const [currentGoal, setCurrentGoal] = useState(null);
  const messagesEndRef = useRef(null);

  // Инициализация: подтягиваем контекст, текущую цель и историю
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawContext = window.localStorage.getItem("noolixContext");
      let ctx = {
        subject: "Математика",
        level: "10–11 класс",
        mode: "exam_prep",
      };
      if (rawContext) {
        const parsed = JSON.parse(rawContext);
        ctx = { ...ctx, ...parsed };
      }

      let goalFromStorage = null;
      try {
        const rawGoal = window.localStorage.getItem("noolixCurrentGoal");
        if (rawGoal) {
          const parsedGoal = JSON.parse(rawGoal);
          if (parsedGoal && typeof parsedGoal === "object") {
            goalFromStorage = parsedGoal;
            if (parsedGoal.subject) {
              ctx = { ...ctx, subject: parsedGoal.subject };
            }
          }
        }
      } catch (eGoal) {
        console.warn("Failed to read noolixCurrentGoal", eGoal);
      }

      const rawHistory = window.localStorage.getItem("noolixChatHistory");
      let initialMessages = [];
      if (rawHistory) {
        try {
          const arr = JSON.parse(rawHistory);
          if (Array.isArray(arr) && arr.length > 0) {
            initialMessages = clampHistory(arr);
          }
        } catch (eHistory) {
          console.warn("Failed to parse noolixChatHistory", eHistory);
        }
      }

      setContext(ctx);
      if (goalFromStorage) {
        setCurrentGoal(goalFromStorage);
      }

      if (initialMessages.length > 0) {
        setMessages(initialMessages);
      } else {
        const starter = {
          id: Date.now(),
          role: "assistant",
          content:
            "Привет! Я NOOLIX. Давай разберёмся с предметом. Скажи, что именно тебе сейчас сложно или что хочешь повторить?",
          createdAt: new Date().toISOString(),
        };
        setMessages([starter]);
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

  // Сохраняем историю в localStorage (обрезаем до MAX_HISTORY)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (messages.length > 0) {
        const compact = clampHistory(messages);
        window.localStorage.setItem(
          "noolixChatHistory",
          JSON.stringify(compact)
        );
      } else {
        window.localStorage.removeItem("noolixChatHistory");
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
          messages: userMessages.map(({ role, content }) => ({
            role,
            content,
          })),
          context: { ...context, currentTopic },
        }),
      });

      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch (_) {
          data = {};
        }
        console.error("API /api/chat error:", data);
        throw new Error(
          data?.error?.message ||
            data?.message ||
            "Не получилось получить ответ от ИИ. Попробуй ещё раз."
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

      setMessages((prev) => clampHistory([...prev, assistantMessage]));
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

    const newMessages = clampHistory([...messages, userMessage]);
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

    switch (key) {
      case "explain":
        text = `Объясни, пожалуйста, тему по ${subjPrep}, которая мне сейчас сложна.`;
        break;
      case "steps":
        text =
          "Разбери, пожалуйста, задачу по шагам: напиши условие, потом вместе разберём решение.";
        break;
      case "test":
        text = `Сделай, пожалуйста, мини-тест по ${subjPrep} на 3–5 вопросов, чтобы я проверил(а) свои знания.`;
        break;
      default:
        break;
    }

    if (text) {
      setInput(text);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">
            Загружаем твою последнюю сессию…
          </p>
          <div className="flex gap-1 text-sm text-purple-100">
            <span className="animate-pulse">•</span>
            <span className="animate-pulse opacity-70">•</span>
            <span className="animate-pulse opacity-40">•</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex relative">
      {/* Оверлей при открытом меню на мобильных */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Кнопка меню для мобильных */}
      <button
        className="absolute top-4 left-4 z-50 bg-white/95 text-black px-4 py-2 rounded shadow-md md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰ Меню
      </button>

      {/* Сайдбар */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-60 md:w-64 p-6 space-y-6
        transform transition-transform duration-300 z-40
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        bg-gradient-to-b from-black/50 via-[#2E003E]/85 to-black/80 border-r border-white/10`}
      >
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/15 shadow-lg backdrop-blur">
            <span className="text-lg">🚀</span>
            <span className="text-xs font-semibold tracking-wide text-purple-50">
              NOOLIX • тьютор с ИИ
            </span>
          </div>
        </div>

        <nav className="space-y-6 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-2">
              Основное
            </p>
            <div className="space-y-1">
              {primaryMenuItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition
                    ${
                      item.key === "chat"
                        ? "bg-white/15"
                        : "hover:bg-white/5 text-purple-100/90"
                    }
                  `}
                >
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md
                      bg-gradient-to-br from-purple-100 to-white
                      ${
                        item.key === "chat" ? "ring-2 ring-purple-200" : ""
                      }
                    `}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-2">
              Остальное
            </p>
            <div className="space-y-1">
              {secondaryMenuItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition
                    hover:bg-white/5 text-purple-100/90
                  `}
                >
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md
                      bg-gradient-to-br from-purple-100 to-white
                      ${
                        item.key === "chat" ? "ring-2 ring-purple-200" : ""
                      }
                    `}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
          <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] bg-black/40 bg-clip-padding backdrop-blur-sm border border-white/5 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {/* Левая колонка — контекст сессии */}
            <aside className="space-y-4">
              <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Текущая сессия
                </p>
                <h2 className="text-sm font-semibold mb-1">Контекст</h2>
                <p className="text-xs text-purple-100">
                  Предмет:{" "}
                  <span className="font-semibold">{context.subject}</span>
                </p>
                <p className="text-xs text-purple-100">
                  Уровень: <span className="font-semibold">{context.level}</span>
                </p>
                {currentGoal && (
                  <p className="text-xs text-purple-100">
                    Цель:{" "}
                    <span className="font-semibold">{currentGoal.title}</span>
                  </p>
                )}
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

              <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Цель сессии
                </p>
                <p className="text-xs text-purple-100">
                  Мини-цель: разобраться в одной теме и решить хотя бы 2–3
                  задачи без подсказок.
                </p>
                <p className="text-[11px] text-purple-300/80">
                  Старайся формулировать вопросы максимально конкретно — так
                  тьютор подстроится под твой уровень и пробелы.
                </p>
              </section>

              <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-2">
                  Быстрые действия
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => handleQuickAction(action.key)}
                      className="px-3 py-1.5 rounded-full text-[11px] bg-white/10 hover:bg-white/15 border border-white/15 transition"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </section>
            </aside>

            {/* Правая колонка — сам чат */}
            <section className="flex flex-col h-[60vh] md:h-[70vh] bg-black/70 border border-white/5 rounded-2xl">
              <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h1 className="text-sm md:text-base font-semibold">
                    Диалог с NOOLIX
                  </h1>
                  <p className="text-[11px] text-purple-200">
                    {context.subject} • {context.level}
                    {currentTopic && <> • Тема: {currentTopic}</>}
                  </p>
                  {currentGoal && (
                    <p className="text-[10px] text-purple-300 mt-0.5">
                      Текущая цель: {currentGoal.title}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-purple-200">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <span>
                    {thinking ? "Обрабатываю вопрос…" : "Готов к диалогу"}
                  </span>
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
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs md:text-sm border
                        ${
                          m.role === "user"
                            ? "bg-purple-500/80 text-white border-purple-300/60"
                            : "bg-black/60 text-purple-50 border-white/10"
                        }
                      `}
                    >
                      <div className="whitespace-pre-wrap leading-snug">
                        {m.content}
                      </div>
                      <div className="mt-1 text-[10px] text-purple-200/70 flex justify-end gap-1">
                        <span>{m.role === "user" ? "Ты" : "NOOLIX"}</span>
                        <span>•</span>
                        <span>{formatTime(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-black/60 border border-white/10 text-[11px] text-purple-100">
                      <span className="h-2 w-2 rounded-full bg-purple-300 animate-pulse" />
                      <span>Думаю над ответом…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <footer className="border-t border-white/10 px-3 py-2">
                <form
                  onSubmit={handleSubmit}
                  className="flex items-end gap-2 md:gap-3"
                >
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    placeholder="Сформулируй вопрос или попроси объяснить тему…"
                    className="flex-1 resize-none bg-black/60 border border-white/15 rounded-2xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-transparent placeholder:text-purple-300/60"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || thinking}
                    className="inline-flex items-center justify-center rounded-2xl px-3 py-2 bg-gradient-to-br from-purple-300 to-purple-500 text-black text-xs md:text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {thinking ? "…" : "Отправить"}
                  </button>
                </form>
                {error && (
                  <p className="mt-1 text-[11px] text-red-300/90">{error}</p>
                )}
              </footer>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
