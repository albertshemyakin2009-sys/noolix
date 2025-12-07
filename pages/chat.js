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
      return subject;
  }
}

function getModeLabel(mode) {
  switch (mode) {
    case "exam_prep":
      return "подготовка к экзамену";
    case "homework":
      return "домашние задания";
    default:
      return "учёба";
  }
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subject, setSubject] = useState("Математика");
  const [level, setLevel] = useState("10–11 класс");
  const [mode, setMode] = useState("exam_prep");
  const [currentTopic, setCurrentTopic] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Привет! Я NOOLIX. Расскажи, что тебе сейчас нужно: объяснить тему, разобрать задачу или подготовиться к экзамену?",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  // Автоскролл вниз при новых сообщениях или думании
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
          context: {
            subject,
            level,
            mode,
            currentTopic: currentTopic || null,
          },
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

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: replyText,
          createdAt: new Date().toISOString(),
        },
      ]);
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

  const subjectPrep = getSubjectPrepositional(subject);
  const modeLabel = getModeLabel(mode);

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

      {/* Левое меню (как на главной, активен Диалог) */}
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
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white
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

      {/* Основная зона */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
          <div className="w-full max-w-5xl flex flex-col gap-4 md:gap-6 bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {/* Хедер диалога */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-purple-200/80 bg-white/5 px-3 py-1 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Онлайн • Тьютор с ИИ</span>
                </div>
                <h1 className="text-xl md:text-2xl font-semibold">
                  Диалог по {subjectPrep}
                </h1>
                <p className="text-xs md:text-sm text-purple-200/90">
                  Режим: {modeLabel}. Можешь просить объяснить темы, разбирать
                  задачи, делать мини-тесты или строить план подготовки.
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
                  Предмет: <span className="font-semibold">{subject}</span>
                </p>
                <p>
                  Уровень: <span className="font-semibold">{level}</span>
                </p>
                <p>
                  Режим: <span className="font-semibold">{modeLabel}</span>
                </p>
              </div>
            </header>

            {/* Зона сообщений */}
            <section className="flex-1 flex flex-col bg-black/30 border border-white/10 rounded-2xl overflow-hidden min-h-[360px]">
              <div className="flex-1 px-3 py-3 md:px-4 md:py-4 space-y-2 overflow-y-auto custom-scrollbar">
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
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/60 border border-white/10 text-[11px] text-purple-100">
                      <span className="h-2 w-2 rounded-full bg-purple-300 animate-pulse" />
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
                    placeholder="Например: «Объясни, как решать квадратные уравнения с примерами»."
                    className="flex-1 resize-none rounded-2xl bg-black/40 border border-white/15 px-3 py-2 text-xs md:text-sm text-white placeholder:text-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || thinking}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-white text-black text-xs md:text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
