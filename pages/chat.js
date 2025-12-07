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

const CONTEXT_STORAGE_KEY = "noolixContext";
const CHAT_HISTORY_KEY = "noolixChatHistory";
const MAX_HISTORY = 40;

function formatTime(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSubjectPrepositional(subject) {
  if (!subject) return "";
  const s = subject.toLowerCase();
  if (s === "математика") return "по математике";
  if (s === "физика") return "по физике";
  if (s === "русский язык") return "по русскому языку";
  if (s === "английский язык") return "по английскому";
  return `по предмету «${subject}»`;
}

function getModeLabel(mode) {
  if (mode === "exam_prep") return "Подготовка к экзамену";
  if (mode === "homework") return "Домашние задания";
  return "Учёба";
}

function clampHistory(messages) {
  if (!Array.isArray(messages)) return [];
  if (messages.length <= MAX_HISTORY) return messages;
  return messages.slice(messages.length - MAX_HISTORY);
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [context, setContext] = useState({
    subject: "Математика",
    level: "10–11 класс",
    mode: "exam_prep",
  });
  const [currentTopic, setCurrentTopic] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  // Инициализация: контекст + история
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      let baseContext = {
        subject: "Математика",
        level: "10–11 класс",
        mode: "exam_prep",
      };
      const rawContext = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
      if (rawContext) {
        try {
          const parsed = JSON.parse(rawContext);
          baseContext = { ...baseContext, ...parsed };
        } catch (e) {
          console.warn("Failed to parse context in chat", e);
        }
      }
      setContext(baseContext);

      const rawHistory = window.localStorage.getItem(CHAT_HISTORY_KEY);
      if (rawHistory) {
        try {
          const parsed = JSON.parse(rawHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          } else {
            const starter = {
              id: Date.now(),
              role: "assistant",
              content:
                "Привет! Я NOOLIX. Напиши, что именно тебе сейчас сложно или к какому экзамену готовишься — начнём разбор.",
              createdAt: new Date().toISOString(),
            };
            setMessages([starter]);
          }
        } catch (e) {
          console.warn("Failed to parse chat history", e);
          const starter = {
            id: Date.now(),
            role: "assistant",
            content:
              "Привет! Я NOOLIX. Напиши, что именно тебе сейчас сложно или к какому экзамену готовишься — начнём разбор.",
            createdAt: new Date().toISOString(),
          };
          setMessages([starter]);
        }
      } else {
        const starter = {
          id: Date.now(),
          role: "assistant",
          content:
            "Привет! Я NOOLIX. Напиши, что именно тебе сейчас сложно или к какому экзамену готовишься — начнём разбор.",
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

  // Сохраняем историю в localStorage (обрезаем до MAX_HISTORY)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const trimmed = clampHistory(messages);
      window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn("Failed to save chat history", e);
    }
  }, [messages]);

  // Тема из URL (?topic=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const topic = params.get("topic");
      if (topic && topic.trim()) {
        setCurrentTopic(topic.trim());
      }
    } catch (e) {
      console.warn("Failed to read topic from URL", e);
    }
  }, []);

  // Автоскролл вниз
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, thinking]);

  // Сохранение объяснения в localStorage → для блока "Сохранённые объяснения" в библиотеке
  const saveExplanationToLibrary = (message) => {
    if (
      typeof window === "undefined" ||
      !message ||
      message.role !== "assistant"
    )
      return;

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
        (titleFromText
          ? titleFromText
          : `Сохранённое объяснение по ${context.subject}`);

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
      const newList = [item, ...list].slice(0, MAX_SAVED);
      window.localStorage.setItem(
        "noolixLibrarySaved",
        JSON.stringify(newList)
      );
    } catch (e) {
      console.warn("Failed to save explanation to library", e);
    }
  };

  // Обновление блока "Продолжить изучение" в библиотеке
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
      const title =
        titleFromTopic || `Диалог по предмету ${context.subject}`;

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
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime()
        )
        .slice(0, MAX_CONTINUE);

      window.localStorage.setItem(
        "noolixLibraryContinue",
        JSON.stringify(finalList)
      );
    } catch (e) {
      console.warn("Failed to update continue list", e);
    }
  };

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

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || thinking) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from.white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">
            Загружаем твой диалог…
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

  const subjectPrep = getSubjectPrepositional(context.subject);
  const modeLabel = getModeLabel(context.mode);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to.black text-white flex relative">
      {/* Оверлей для мобилки */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Кнопка меню (мобилка) */}
      <button
        className="absolute top-4 left-4 z-50 bg-white/95 text-black px-4 py-2.rounded shadow-md md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰ Меню
      </button>

      {/* Левое меню */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-60 md:w-64 p-6 space-y-6 transform transition-transform duration-300 z-40
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        bg-gradient-to-b from-black/40 via-[#2E003E]/85 to-transparent`}
      >
        <div className="mb-3">
          <div className="text-3xl font-extrabold tracking-tight bg-gradient.to-r from-[#FDF2FF] via-[#E5DEFF] to-white text-transparent bg-clip-text">
            NOOLIX
          </div>
          <p className="text-xs text-purple-200 mt-1.opacity-80">
            Диалог с тьютором
          </p>
        </div>

        <nav className="space-y-3 text-sm md:text-base">
          <div className="space-y-2">
            {primaryMenuItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition
                  ${
                    item.key === "chat"
                      ? "bg-white/15"
                      : "hover:bg-white/5"
                  }
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient.to-br from-purple-100 to-white
                    ${item.key === "chat" ? "ring-2 ring-purple-200" : ""}
                  `}
                >
                  {item.icon}
                </span>
                <span
                  className={item.key === "chat" ? "font-semibold" : ""}
                >
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
                className="flex items-center gap-3 px-2 py-2.rounded-2xl hover:bg-white/5 transition"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm.shadow-md bg-gradient.to-br from-purple-100 to-white">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>
      </aside>

      {/* Основная зона */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex.justify-center">
          <div className="w-full max-w-5xl flex flex-col gap-4 md:gap-6 bg-white/5 bg-clip-padding.backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6.shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {/* Хедер диалога */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[11px].uppercase tracking-wide text-purple-200/80 bg-white/5 px-3 py-1 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300.animate-pulse" />
                  <span>Онлайн • Тьютор с ИИ</span>
                </div>
                <h1 className="text-xl md:text-2xl.font-semibold">
                  Диалог {subjectPrep}
                </h1>
                <p className="text-xs md:text-sm text-purple-200/90">
                  Режим: {modeLabel}. Ты можешь просить объяснить темы,
                  разбирать задачи, создавать мини-тесты и планы подготовки.
                </p>
                {currentTopic && (
                  <p className="text-[11px] text-purple-200/90">
                    Текущая тема:{" "}
                    <span className="font-semibold">{currentTopic}</span>
                  </p>
                )}
              </div>

              <div className="bg-black/30 border border-white/10 rounded-2xl p-3 text-[11px] text-purple-100 space-y-1 max-w-xs">
                <p className="uppercase tracking-wide text-purple-300/80">
                  Контекст
                </p>
                <p>
                  Предмет:{" "}
                  <span className="font-semibold">{context.subject}</span>
                </p>
                <p>
                  Уровень:{" "}
                  <span className="font-semibold">{context.level}</span>
                </p>
                <p className="text-purple-200/80">
                  NOOLIX использует этот контекст в ответах, целях, прогрессе и
                  библиотеке.
                </p>
              </div>
            </header>

            {/* Зона сообщений */}
            <section className="flex-1 flex flex-col bg-black/30 border border-white/10 rounded-2xl overflow-hidden.min-h-[360px]">
              <div className="flex-1 px-3 py-3 md:px-4 md:py-4 space-y-2 overflow-y-auto custom-scrollbar">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.py-2 text-xs md:text-sm border
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
                      <div className="mt-1 text-[10px] text-purple-200/70.flex justify-end gap-1">
                        <span>{m.role === "user" ? "Ты" : "NOOLIX"}</span>
                        <span>•</span>
                        <span>{formatTime(m.createdAt)}</span>
                      </div>

                      {m.role === "assistant" && (
                        <div className="mt-1 flex justify-between.items-center text-[10px] text-purple-200/70">
                          <button
                            type="button"
                            onClick={() => saveExplanationToLibrary(m)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg.white/5 hover:bg-white/10 border border-white/10 transition"
                          >
                            <span>⭐</span>
                            <span>Сохранить в библиотеку</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {thinking && (
                  <div className="flex justify-start">
                    <div className="inline-flex.items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/60 border border-white/10 text-[11px] text-purple-100">
                      <span className="h-2 w-2 rounded-full bg-purple-300.animate-pulse" />
                      <span>Думаю над ответом…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Инпут */}
              <footer className="border-t border-white/10 px-3 py-2">
                <form
                  onSubmit={handleSubmit}
                  className="flex items-end gap-2 md:gap-3"
                >
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Сформулируй задачу, тему или вопрос. Например: «Объясни квадратные уравнения с примерами»."
                    className="flex-1 resize-none rounded-2xl bg-black/40 border border-white/15 px-3 py-2 text-xs md:text-sm text-white.placeholder:text-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || thinking}
                    className="inline-flex.items-center justify-center px-4 py-2 rounded-2xl bg-white text-black text-xs md:text-sm font-semibold shadow-lg.disabled:opacity-50 disabled:cursor-not-allowed"
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
