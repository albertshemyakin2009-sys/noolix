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

function safeJsonParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function clampHistory(arr, max = 30) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(-max);
}

function normalize(s) {
  return (s || "").toLowerCase().trim();
}

function getHistoryKey(subject, level) {
  const s = (subject || "").trim() || "subject";
  const l = (level || "").trim() || "level";
  return `noolixChatHistory__${s}__${l}`;
}

function subjectInDative(subject) {
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

const CONTEXT_STORAGE_KEY = "noolixContext";

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
  const [error, setError] = useState("");

  const [currentTopic, setCurrentTopic] = useState("");

  const [loading, setLoading] = useState(true);

  const [savedMessageIds, setSavedMessageIds] = useState([]);

  const [hasWeakTopics, setHasWeakTopics] = useState(false);
  const [weakTopicsCount, setWeakTopicsCount] = useState(0);

  const messagesEndRef = useRef(null);

  // one-shot guard for auto-start by ?topic=
  const didAutoStartRef = useRef(false);

  const applyContextChange = (nextCtx) => {
    setContext(nextCtx);

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(nextCtx));
      }
    } catch (_) {}

    // переключаем чат под новый контекст: загружаем историю или ставим стартовый экран
    try {
      if (typeof window === "undefined") return;
      const historyKey = getHistoryKey(nextCtx.subject, nextCtx.level);
      const raw = window.localStorage.getItem(historyKey);
      const arr = safeJsonParse(raw, null);

      if (Array.isArray(arr) && arr.length > 0) {
        setMessages(clampHistory(arr));
      } else {
        setMessages([
          {
            id: Date.now(),
            role: "assistant",
            content: `Привет! Я NOOLIX 🤖  
Готов помочь тебе по ${subjectInDative(nextCtx.subject)} (${nextCtx.level}).  
Выбери тему или напиши вопрос — и мы начнём.`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.warn("Failed to load chat history for context", e);
    }
  };

  // --- init: context + chat history ---
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const rawCtx = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
      const parsedCtx = safeJsonParse(rawCtx, null);

      if (parsedCtx && typeof parsedCtx === "object") {
        setContext((prev) => ({ ...prev, ...parsedCtx }));
      }

      const ctx = parsedCtx && typeof parsedCtx === "object" ? parsedCtx : context;
      const historyKey = getHistoryKey(ctx.subject, ctx.level);
      const rawHistory = window.localStorage.getItem(historyKey);
      const parsedHistory = safeJsonParse(rawHistory, null);

      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        setMessages(clampHistory(parsedHistory));
      } else {
        setMessages([
          {
            id: Date.now(),
            role: "assistant",
            content: `Привет! Я NOOLIX 🤖  
Готов помочь тебе по ${subjectInDative(ctx.subject)} (${ctx.level}).  
Выбери тему или напиши вопрос — и мы начнём.`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.warn("Failed to init chat", e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Автоскролл вниз ---
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, thinking]);

  // --- Подтягиваем информацию про слабые темы (из noolixKnowledgeMap) ---
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const raw = window.localStorage.getItem("noolixKnowledgeMap");
      const km = safeJsonParse(raw, {});
      const subjEntry = km?.[context.subject];

      if (!subjEntry || typeof subjEntry !== "object") {
        setHasWeakTopics(false);
        setWeakTopicsCount(0);
        return;
      }

      let weakCount = 0;
      Object.values(subjEntry).forEach((t) => {
        if (t && typeof t.score === "number" && t.score < 0.8) {
          weakCount += 1;
        }
      });

      setWeakTopicsCount(weakCount);
      setHasWeakTopics(weakCount > 0);
    } catch (e) {
      console.warn("Failed to read noolixKnowledgeMap", e);
      setHasWeakTopics(false);
      setWeakTopicsCount(0);
    }
  }, [context.subject]);

  // --- Тема из URL (?topic=...) ---
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

  // --- Авто-старт диалога по topic из URL (после инициализации) ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!currentTopic || !currentTopic.trim()) return;
    if (didAutoStartRef.current) return;

    // если пользователь уже писал в этом чате — не вмешиваемся
    const hasUserMessages =
      Array.isArray(messages) && messages.some((m) => m?.role === "user");
    if (hasUserMessages) {
      didAutoStartRef.current = true;
      return;
    }

    // ждём, пока чат инициализируется хотя бы одним сообщением
    if (!Array.isArray(messages) || messages.length === 0) return;

    const intro = {
      id: Date.now() + 999,
      role: "assistant",
      content: `Давай разберём тему «${currentTopic.trim()}».  
Скажи, что тебе сейчас нужнее: объяснение с нуля, разбор задач или мини-тест?`,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => clampHistory([...prev, intro]));
    didAutoStartRef.current = true;
  }, [loading, currentTopic, messages]);

  // --- Сохраняем историю конкретного чата ---
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const historyKey = getHistoryKey(context.subject, context.level);

      if (messages.length > 0) {
        const compact = clampHistory(messages);
        window.localStorage.setItem(historyKey, JSON.stringify(compact));
      } else {
        window.localStorage.removeItem(historyKey);
      }
    } catch (e) {
      console.warn("Failed to save chat history", e);
    }
  }, [messages, context.subject, context.level]);

  // --- Подтягиваем сохранённые сообщения из библиотеки ---
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem("noolixLibrarySaved");
      const list = safeJsonParse(raw, []);
      if (!Array.isArray(list)) return;

      const ids = list
        .map((x) => x?.messageId)
        .filter((x) => typeof x === "number" || typeof x === "string");

      setSavedMessageIds(ids);
    } catch (e) {
      console.warn("Failed to load saved ids", e);
    }
  }, []);

  // --- Сохранение объяснения в localStorage → для блока "Сохранённые объяснения" в библиотеке ---
  const saveExplanationToLibrary = (message) => {
    if (typeof window === "undefined" || !message || message.role !== "assistant") return;

    // не сохраняем повторно
    if (message.id && savedMessageIds.includes(message.id)) return;

    try {
      const raw = window.localStorage.getItem("noolixLibrarySaved");
      let list = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }

      const titleFromTopic = currentTopic && currentTopic.trim();
      const firstLine = (message.content || "").split("\n")[0].trim();
      const titleFromText = firstLine.slice(0, 80);
      const title =
        titleFromTopic ||
        (titleFromText ? titleFromText : `Сохранённое объяснение по ${context.subject}`);

      const item = {
        id: message.id || Date.now(),
        title,
        subject: context.subject,
        level: context.level,
        from: "из диалога",
        savedAt: new Date().toISOString(),
        messageId: message.id || null,
        preview: (message.content || "").slice(0, 400),
      };

      const MAX_SAVED = 50;

      // защита от дублей по messageId
      const filtered = list.filter((x) => x?.messageId !== item.messageId);
      const newList = [item, ...filtered].slice(0, MAX_SAVED);

      window.localStorage.setItem("noolixLibrarySaved", JSON.stringify(newList));

      if (message.id) {
        setSavedMessageIds((prev) => [...prev, message.id]);
      }
    } catch (e) {
      console.warn("Failed to save explanation to library", e);
    }
  };

  // --- Обновление блока "Продолжить изучение" в библиотеке ---
  const touchContinueItem = () => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("noolixLibraryContinue");
      let list = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }

      const titleFromTopic = currentTopic && currentTopic.trim();
      const title = titleFromTopic || `Диалог по предмету ${context.subject}`;

      const nowIso = new Date().toISOString();

      let found = false;
      const updated = list.map((item) => {
        if (
          item.title === title &&
          item.subject === context.subject &&
          item.level === context.level
        ) {
          found = true;
          return { ...item, updatedAt: nowIso };
        }
        return item;
      });

      if (!found) {
        updated.unshift({
          id: Date.now(),
          title,
          subject: context.subject,
          level: context.level,
          type: "Диалог с тьютором",
          updatedAt: nowIso,
        });
      }

      const MAX_CONTINUE = 20;
      const finalList = updated
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, MAX_CONTINUE);

      window.localStorage.setItem("noolixLibraryContinue", JSON.stringify(finalList));
    } catch (e) {
      console.warn("Failed to update continue list", e);
    }
  };

  const callBackend = async (userMessages) => {
    try {
      setError("");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: userMessages.map(({ role, content }) => ({ role, content })),
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

      // фиксируем активность для блока "Продолжить" в библиотеке
      touchContinueItem();

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

  const onSend = async () => {
    if (!input.trim() || thinking) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextMessages = clampHistory([...messages, userMessage]);
    setMessages(nextMessages);
    setInput("");
    setThinking(true);

    // активность для "Продолжить"
    touchContinueItem();

    await callBackend(nextMessages);
  };

  const QuickChip = ({ title, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-purple-50 hover:bg-white/10 transition"
    >
      {title}
    </button>
  );

  const subjectSuggestions = useMemo(() => {
    if (hasWeakTopics && weakTopicsCount > 0) {
      return [
        {
          title: `У меня есть слабые темы (${weakTopicsCount}) — с чего начать?`,
          prompt:
            "У меня есть слабые темы. С чего лучше начать закрывать пробелы? Дай краткий план на 30–40 минут.",
        },
        {
          title: "Дай мини-тест по слабым темам",
          prompt:
            "Сделай мини-тест на 5 вопросов по моим слабым темам, без слишком сложных формулировок.",
        },
      ];
    }

    return [
      {
        title: "Объясни тему простыми словами",
        prompt: "Объясни тему простыми словами и дай 2 коротких примера.",
      },
      {
        title: "Дай 3 задачи и решения",
        prompt:
          "Дай 3 типовые задачи по теме и краткие решения (без воды).",
      },
      {
        title: "Сделай мини-тест (5 вопросов)",
        prompt:
          "Сделай мини-тест на 5 вопросов по теме и скажи правильные ответы.",
      },
    ];
  }, [hasWeakTopics, weakTopicsCount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">Загружаем диалог…</p>
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
        className={`fixed md:static top-0 left-0 h-full w-60 md:w-64 p-6 space-y-6
        transform transition-transform duration-300 z-40
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
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white
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
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white">
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
          <div className="w-full max-w-5xl flex flex-col gap-6 bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-purple-200/80 bg-white/5 px-3 py-1 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-300" />
                  <span>ИИ-диалог с тьютором</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold">Диалог</h1>
                  <p className="text-xs md:text-sm text-purple-200 mt-1 max-w-xl">
                    Объясняю темы, разбираю задачи и даю мини-тесты — под твой уровень.
                  </p>
                </div>
              </div>

              <div className="w-full md:w-[300px] space-y-2">
                <div>
                  <p className="text-[11px] text-purple-200/80 mb-1">Предмет</p>
                  <select
                    value={context.subject}
                    onChange={(e) =>
                      applyContextChange({ ...context, subject: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option>Математика</option>
                    <option>Физика</option>
                    <option>Русский язык</option>
                    <option>Английский язык</option>
                  </select>
                </div>

                <div>
                  <p className="text-[11px] text-purple-200/80 mb-1">Уровень</p>
                  <select
                    value={context.level}
                    onChange={(e) =>
                      applyContextChange({ ...context, level: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option>7–9 класс</option>
                    <option>10–11 класс</option>
                    <option>1 курс вуза</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Быстрые рекомендации */}
            <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Рекомендации NOOLIX
              </p>
              <div className="flex flex-wrap gap-2">
                {subjectSuggestions.map((s) => (
                  <QuickChip
                    key={s.title}
                    title={s.title}
                    onClick={() => setInput(s.prompt)}
                  />
                ))}
              </div>
            </section>

            {/* Сообщения */}
            <section className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
              <div className="h-[52vh] overflow-y-auto pr-2 space-y-3">
                {messages.map((m) => {
                  const isUser = m.role === "user";
                  const isAssistant = m.role === "assistant";

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words
                          ${
                            isUser
                              ? "bg-white text-black"
                              : "bg-white/10 border border-white/10"
                          }`}
                      >
                        {m.content}
                      </div>

                      <div
                        className={`flex items-center gap-2 text-[11px] text-purple-200/80 max-w-[85%]
                          ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <span>{formatTime(m.createdAt)}</span>

                        {isAssistant && (
                          <>
                            {savedMessageIds.includes(m.id) ? (
                              <div className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-black/20 border border-emerald-300/60 text-emerald-200 max-w-[80%] self-start">
                                <span>✅</span>
                                <span>Сохранено</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => saveExplanationToLibrary(m)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
                              >
                                <span>📌</span>
                                <span>Сохранить в библиотеку</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {thinking && (
                  <div className="flex items-start">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white/10 border border-white/10">
                      NOOLIX думает…
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {error && (
                <div className="bg-black/40 border border-red-400/30 rounded-xl p-3 text-xs text-red-200">
                  {error}
                </div>
              )}

              {/* Инпут */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSend();
                }}
                className="flex gap-2 items-end"
              >
                <div className="flex-1">
                  <p className="text-[11px] text-purple-200/80 mb-1">
                    Сообщение
                  </p>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Напиши вопрос, тему или пришли задачу…"
                    rows={3}
                    className="w-full text-xs md:text-sm px-3 py-2 rounded-2xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-purple-300/70 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || thinking}
                  className="inline-flex items-center justify-center rounded-2xl px-3 py-2 bg-gradient-to-br from-purple-300 to-purple-500 text-black text-xs md:text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {thinking ? "…" : "Отправить"}
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href="/tests"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                >
                  Перейти к тестам
                </a>
                <a
                  href="/progress"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                >
                  Посмотреть прогресс
                </a>
                <a
                  href="/library"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                >
                  Библиотека
                </a>
              </div>
            </section>
          </div>
        </main>

        <footer className="bg-[#1A001F]/90 border-t border-white/10 text-center py-3 text-xs text-purple-200">
          © 2025 NOOLIX — образовательная платформа будущего. Связь:
          support@noolix.ai
        </footer>
      </div>
    </div>
  );
}
