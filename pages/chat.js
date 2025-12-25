// pages/chat.js
import React, { useEffect, useRef, useState  } from "react";
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

const AVATAR_EMOJI = {
  panda: "🐼",
  crab: "🦀",
  fox: "🦊",
  cat: "🐱",
  dog: "🐶",
  owl: "🦉",
  turtle: "🐢",
  octopus: "🐙",
  bear: "🐻",
  koala: "🐨",
};


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

// отдельный ключ истории под каждую пару (предмет + уровень)
const getHistoryKey = (subject, level) => {
  const safe = (s) =>
    (s || "unknown")
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_а-яё\-–]/gi, "");
  return `noolixChatHistory__${safe(subject)}__${safe(level)}`;
};

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

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

  const [hasWeakTopics, setHasWeakTopics] = useState(false);
  const [weakTopicsCount, setWeakTopicsCount] = useState(0);

  const [savedMessageIds, setSavedMessageIds] = useState([]);
  const [userProfile, setUserProfile] = useState({ name: "", avatar: "panda" });

  const messagesEndRef = useRef(null);
  const didAutoStartRef = useRef(false);

  // Client-only guard (фикс для prerender/export на Vercel)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // обновляем профиль (имя/аватар) при возврате в вкладку
  useEffect(() => {
    const refreshProfile = () => {
      try {
        const raw = window.localStorage.getItem("noolixProfile");
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p && typeof p === "object") {
          setUserProfile({
            name: typeof p.name === "string" ? p.name : "",
            avatar: typeof p.avatar === "string" ? p.avatar : "panda",
          });
        }
      } catch {}
    };

    window.addEventListener("focus", refreshProfile);
    return () => window.removeEventListener("focus", refreshProfile);
  }, []);


  // Переключение предмета/уровня: сохраняем контекст и подгружаем историю конкретного чата
  const applyContextChange = (patch) => {
    const nextCtx = { ...context, ...patch };
    setContext(nextCtx);

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("noolixContext", JSON.stringify(nextCtx));
      }
    } catch (e) {
      console.warn("Failed to save noolixContext", e);
    }

    // Подгружаем историю для (subject + level)
    try {
      if (typeof window === "undefined") return;

      const historyKey = getHistoryKey(nextCtx.subject, nextCtx.level);
      const rawHistory = window.localStorage.getItem(historyKey);

      if (rawHistory) {
        const arr = JSON.parse(rawHistory);
        if (Array.isArray(arr) && arr.length > 0) {
          setMessages(clampHistory(arr));
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load history for new context", e);
    }

    // Если истории нет — мягкий старт
    const starter = {
      id: Date.now(),
      role: "assistant",
      content: `Привет${userProfile.name ? ", " + userProfile.name : ""}! Я NOOLIX. Что именно по предмету тебе сейчас нужно — объяснение темы, разбор задачи или мини-тест?`,
      createdAt: new Date().toISOString(),
    };
    setMessages([starter]);
  };

  // --- Инициализация: контекст, цель, история чата (по предмету+уровню) ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawContext = window.localStorage.getItem("noolixContext");
      const rawProfile = window.localStorage.getItem("noolixProfile");
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

      const historyKey = getHistoryKey(ctx.subject, ctx.level);

      const rawHistory = window.localStorage.getItem(historyKey);
      let initialMessages = [];
      if (rawHistory) {
        try {
          const arr = JSON.parse(rawHistory);
          if (Array.isArray(arr) && arr.length > 0) {
            initialMessages = clampHistory(arr);
          }
        } catch (eHistory) {
          console.warn("Failed to parse chat history", eHistory);
        }
      }

            // profile (name/avatar) for UI
      let profile = { name: "", avatar: "panda" };
      if (rawProfile) {
        try {
          const p = JSON.parse(rawProfile);
          if (p && typeof p === "object") {
            profile = {
              name: typeof p.name === "string" ? p.name : "",
              avatar: typeof p.avatar === "string" ? p.avatar : "panda",
            };
          }
        } catch (eProfile) {
          console.warn("Failed to read noolixProfile", eProfile);
        }
      }
      setUserProfile(profile);

      setContext(ctx);
      if (goalFromStorage) setCurrentGoal(goalFromStorage);

      if (initialMessages.length > 0) {
        setMessages(initialMessages);
      } else {
        const starter = {
          id: Date.now(),
          role: "assistant",
            content: `Привет${profile.name ? ", " + profile.name : ""}! Я NOOLIX. Давай разберёмся с предметом. Скажи, что именно тебе сейчас сложно или что хочешь повторить?`,
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

  // --- Вызов backend (объявлен выше автостарта) ---
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

      // обновляем "твои чаты" в библиотеке
      touchContinueItem();

      setMessages((prev) => clampHistory([...(prev || []), assistantMessage]));
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

  // Авто-старт: если пришли с ?topic=..., автоматически отправляем запрос в /api/chat
  useEffect(() => {
    if (!isClient) return;
    if (loading) return;

    const topic = (currentTopic || "").trim();
    if (!topic) return;
    if (didAutoStartRef.current) return;

    // если пользователь уже писал в этом чате — не вмешиваемся
    const hasUser =
      Array.isArray(messages) && messages.some((m) => m?.role === "user");
    if (hasUser) {
      didAutoStartRef.current = true;
      return;
    }

    // если уже есть ответ ассистента после стартового — тоже не вмешиваемся
    const assistantCount = Array.isArray(messages)
      ? messages.filter((m) => m?.role === "assistant").length
      : 0;
    if (assistantCount > 1) {
      didAutoStartRef.current = true;
      return;
    }

    const subjPrep = getSubjectPrepositional(context.subject);
    const prompt = `Объясни тему «${topic}» по ${subjPrep} на уровне «${context.level}».

Требования:
1) Коротко и понятно (без воды).
2) 1–2 примера.
3) В конце — 2 вопроса для самопроверки.`;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    const newMessages = clampHistory([...(messages || []), userMessage]);

    // фиксируем, что авто-старт уже был (чтобы не повторялось)
    didAutoStartRef.current = true;

    setMessages(newMessages);
    setThinking(true);
    setInput("");

    callBackend(newMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, loading, currentTopic]);

  // --- Слабые темы по предмету ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawKnowledge = window.localStorage.getItem("noolixKnowledgeMap");
      if (!rawKnowledge) {
        setHasWeakTopics(false);
        setWeakTopicsCount(0);
        return;
      }

      const parsed = JSON.parse(rawKnowledge);
      if (!parsed || typeof parsed !== "object") {
        setHasWeakTopics(false);
        setWeakTopicsCount(0);
        return;
      }

      const subjEntry = parsed[context.subject];
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

  // --- Подтягиваем сохранённые сообщения из библиотеки ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("noolixLibrarySaved");
      if (!raw) {
        setSavedMessageIds([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setSavedMessageIds([]);
        return;
      }

      const ids = parsed
        .map((item) => item.messageId || item.id)
        .filter(Boolean);

      setSavedMessageIds(ids);
    } catch (e) {
      console.warn("Failed to init savedMessageIds from library", e);
      setSavedMessageIds([]);
    }
  }, []);

  // Автоскролл вниз
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, thinking]);

  // --- Сохраняем историю конкретного чата ---
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!context?.subject || !context?.level) return;

      const compact = clampHistory(messages || []);
      const historyKey = getHistoryKey(context.subject, context.level);

      if (compact.length > 0) {
        window.localStorage.setItem(historyKey, JSON.stringify(compact));
      } else {
        window.localStorage.removeItem(historyKey);
      }
    } catch (e) {
      console.warn("Failed to save chat history", e);
    }
  }, [messages, context?.subject, context?.level]);

  // ✅ NEW: обновление прогресса при сохранении объяснения
  const touchProgressFromDialogSave = (topicKey) => {
    if (typeof window === "undefined") return;

    const topic = (topicKey || "").trim();
    if (!topic) return;

    try {
      const raw = window.localStorage.getItem("noolixKnowledgeMap");
      const km = raw ? JSON.parse(raw) : {};
      const safeKm = km && typeof km === "object" ? km : {};

      const subject = context?.subject || "Без предмета";
      const level = context?.level || "Без уровня";

      const rawSubj =
        safeKm[subject] && typeof safeKm[subject] === "object" ? safeKm[subject] : {};

      // legacy: subject -> topic -> {score...}
      const sampleVal = Object.values(rawSubj || {})[0];
      const looksLegacy =
        sampleVal &&
        typeof sampleVal === "object" &&
        ("score" in sampleVal || "updatedAt" in sampleVal || "source" in sampleVal);

      if (looksLegacy) {
        safeKm[subject] = { [level]: rawSubj };
      } else if (!safeKm[subject] || typeof safeKm[subject] !== "object") {
        safeKm[subject] = {};
      }

      if (!safeKm[subject][level] || typeof safeKm[subject][level] !== "object") {
        safeKm[subject][level] = {};
      }

      const lvlEntry = safeKm[subject][level];

      const prev =
        lvlEntry[topic] && typeof lvlEntry[topic] === "object" ? lvlEntry[topic] : {};

      const prevScore = typeof prev.score === "number" ? prev.score : 0.55;
      const nextScore = Math.min(1, +(prevScore + 0.03).toFixed(3));
      const nowIso = new Date().toISOString();

      lvlEntry[topic] = {
        ...prev,
        score: nextScore,
        updatedAt: nowIso,
        source: "dialog_saved",
      };

      safeKm[subject][level] = lvlEntry;
      window.localStorage.setItem("noolixKnowledgeMap", JSON.stringify(safeKm));
    } catch (e) {
      console.warn("Failed to update noolixKnowledgeMap from dialog save", e);
    }
  };

  // Сохранение объяснения в библиотеку
  const saveExplanationToLibrary = (message) => {
    if (typeof window === "undefined" || !message || message.role !== "assistant")
      return;

    try {
      const raw = window.localStorage.getItem("noolixLibrarySaved");
      let list = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }

      const msgId = message.id || null;

      // Уже сохранено — не дублируем
      if (msgId && list.some((item) => item.messageId === msgId)) {
        setSavedMessageIds((prev) =>
          prev.includes(msgId) ? prev : [...prev, msgId]
        );
        return;
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
        id: msgId || Date.now(),
        title,
        subject: context.subject,
        level: context.level,
        from: "из диалога",
        savedAt: new Date().toISOString(),
        messageId: msgId,
        preview: (message.content || "").slice(0, 400),
      };

      const MAX_SAVED = 50;
      const newList = [item, ...list].slice(0, MAX_SAVED);
      window.localStorage.setItem("noolixLibrarySaved", JSON.stringify(newList));

      if (msgId) {
        setSavedMessageIds((prev) =>
          prev.includes(msgId) ? prev : [...prev, msgId]
        );
      }

      // ✅ NEW: после сохранения — отмечаем тему в прогрессе
      const topicKey = (currentTopic && currentTopic.trim()) || title;
      touchProgressFromDialogSave(topicKey);
    } catch (e) {
      console.warn("Failed to save explanation to library", e);
    }
  };

  // Обновление блока "Твои чаты" в библиотеке
  const touchContinueItem = () => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("noolixLibraryContinue");
      let list = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }

      const title = `Диалог: ${context.subject}, ${context.level}`;
      const nowIso = new Date().toISOString();

      let found = false;
      const updated = list.map((item) => {
        if (item.subject === context.subject && item.level === context.level) {
          found = true;
          return { ...item, title, updatedAt: nowIso };
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
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
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

  const sendMessage = () => {
    const text = input.trim();
    if (!text || thinking) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    const newMessages = clampHistory([...(messages || []), userMessage]);
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

  const subjectPrep = getSubjectPrepositional(context.subject);

  const quickActions = [
    {
      key: "explain",
      label: currentTopic ? `Объяснить «${currentTopic}»` : "Объясни тему",
    },
    { key: "steps", label: "Разбери задачу по шагам" },
    {
      key: "test",
      label: currentGoal ? "Мини-тест по цели" : "Сделай мини-тест",
    },
    ...(hasWeakTopics
      ? [{ key: "weak", label: "Потренироваться по слабым темам" }]
      : []),
  ];

  const handleQuickAction = (key) => {
    let text = "";

    switch (key) {
      case "explain":
        if (currentTopic) {
          text = `Объясни, пожалуйста, тему «${currentTopic}» по ${subjectPrep} простыми словами и приведи 1–2 базовых примера.`;
        } else if (currentGoal) {
          text = `Объясни, пожалуйста, одну из ключевых тем по ${subjectPrep}, которые важны для цели «${currentGoal.title}». Начни с базовых понятий.`;
        } else {
          text = `Объясни, пожалуйста, тему по ${subjectPrep}, которая мне сейчас сложна.`;
        }
        break;
      case "steps":
        text = `Разбери задачу по ${subjectPrep} по шагам. Сначала уточни условия/данные, затем покажи решение и проверку.`;
        break;
      case "test":
        if (currentGoal) {
          text = `Сделай, пожалуйста, мини-тест по ${subjectPrep} в рамках моей цели «${currentGoal.title}» на 3–5 вопросов, чтобы я проверил(а) свои знания.`;
        } else {
          text = `Сделай, пожалуйста, мини-тест по ${subjectPrep} на 3–5 вопросов, чтобы я проверил(а) свои знания.`;
        }
        break;
      case "weak":
        text = `Предложи, пожалуйста, небольшую тренировку по типичным сложным темам по ${subjectPrep} на моём уровне. Начни с самых базовых вопросов и постепенно усложняй.`;
        break;
      default:
        break;
    }

    if (text) {
      setInput(text);
      setTimeout(() => {
        sendMessage();
      }, 0);
    }
  };

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
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
          <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <aside className="space-y-4">
              <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Текущая сессия
                </p>
                <h2 className="text-sm font-semibold mb-1">Контекст</h2>

                <div className="space-y-2">
                  <div>
                    <p className="text-[11px] text-purple-200/80 mb-1">Предмет</p>
                    <select
                      value={context.subject}
                      onChange={(e) =>
                        applyContextChange({ subject: e.target.value })
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
                        applyContextChange({ level: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    >
                      <option>7–9 класс</option>
                      <option>10–11 класс</option>
                      <option>1 курс вуза</option>
                    </select>
                  </div>
                </div>

                {currentGoal && (
                  <p className="text-xs text-purple-100">
                    Цель:{" "}
                    <span className="font-semibold">{currentGoal.title}</span>
                  </p>
                )}

                {hasWeakTopics && (
                  <p className="text-[11px] text-purple-200 mt-1">
                    В карте знаний по этому предмету отмечено{" "}
                    <span className="font-semibold">
                      {weakTopicsCount} слабых тем
                    </span>
                    .
                  </p>
                )}

                {currentTopic && (
                  <p className="text-[11px] text-purple-200 mt-1">
                    Тема из прогресса:{" "}
                    <span className="font-semibold">{currentTopic}</span>
                  </p>
                )}
              </section>

              <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Быстрый старт
                </p>
                <p className="text-[11px] text-purple-100 mb-2">
                  Можно начать с готовых запросов или написать свой вопрос в поле справа.
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => handleQuickAction(action.key)}
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] text-purple-50 transition border border-white/15"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </section>
            </aside>

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
                    {thinking ? "Обрабатываю запрос…" : "Готов к диалогу"}
                  </span>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
                {messages.map((m, i) => {
                  const prev = i > 0 ? messages[i - 1] : null;
                  const showUserHeader = m.role === "user" && (!prev || prev.role !== "user");

                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div>
                        {showUserHeader ? (
                          <div className="mb-1 flex items-center justify-end gap-2 text-[11px] text-purple-200/70">
                            {userProfile.name ? <span>{userProfile.name}</span> : null}
                            <span
                              className="h-5 w-5 rounded-lg flex items-center justify-center border border-white/10 bg-white/10 text-white/90"
                              title={userProfile.name}
                            >
                              <span className="text-sm leading-none">
                                {AVATAR_EMOJI[userProfile.avatar] || "🙂"}
                              </span>
                            </span>
                          </div>
                        ) : null}

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
                            <span>{formatTime(m.createdAt || m.ts || m.time || m.timestamp) || "—"}</span>
                          </div>

                          {m.role === "assistant" && (
                            <div className="mt-2 flex justify-end">
                              {savedMessageIds.includes(m.id) ? (
                                <div className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-black/20 border border-emerald-300/60 text-emerald-200 max-w-[80%]">
                                  <span>✅</span>
                                  <span>Сохранено</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => saveExplanationToLibrary(m)}
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
                                >
                                  <span>📌</span>
                                  <span>Сохранить в библиотеку</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

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
                    className="flex-1 resize-none rounded-2xl bg-black/60 border border-white/15 px-3 py-2 text-xs md:text-sm text-white placeholder:text-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                    rows={2}
                    placeholder="Напиши, что тебе сейчас сложно или что хочешь повторить…"
                  />
                  <button
                    type="submit"
                    disabled={thinking}
                    className="px-4 py-2 rounded-2xl bg-white text-black text-xs md:text-sm font-semibold shadow-md hover:bg-purple-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
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
