// pages/profile.js
import React, { useEffect, useMemo, useState } from "react";

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
const PROFILE_STORAGE_KEY = "noolixProfile";

// existing app keys (don’t rename)
const KNOWLEDGE_STORAGE_KEY = "noolixKnowledgeMap";
const TEST_HISTORY_KEY = "noolixTestHistory";
const GOALS_STORAGE_KEY = "noolixGoals";
const LIBRARY_STORAGE_KEY = "noolixLibrary";
const PROFILE_LIBRARY_IDS = {
  goal: "profile_goal_v1",
  note: "profile_note_v1",
};

const SUBJECT_OPTIONS = ["Математика", "Физика", "Русский язык", "Английский язык"];
const LEVEL_OPTIONS = ["7-9 класс", "10-11 класс", "1 курс вуза"];

const AVATAR_OPTIONS = [
  { key: "panda", label: "Панда", icon: "🐼" },
  { key: "crab", label: "Крабик", icon: "🦀" },
  { key: "fox", label: "Лис", icon: "🦊" },
  { key: "cat", label: "Кот", icon: "🐱" },
  { key: "dog", label: "Пёс", icon: "🐶" },
  { key: "owl", label: "Сова", icon: "🦉" },
  { key: "frog", label: "Лягушка", icon: "🐸" },
  { key: "koala", label: "Коала", icon: "🐨" },
  { key: "rabbit", label: "Кролик", icon: "🐰" },
  { key: "lion", label: "Лев", icon: "🦁" },
  { key: "monkey", label: "Обезьяна", icon: "🐵" },
  { key: "tiger", label: "Тигр", icon: "🐯" },
];


function upsertLibraryEntry(entry) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
  const arr = raw ? safeJsonParse(raw, []) : [];
  const list = Array.isArray(arr) ? arr : [];
  const idx = list.findIndex((x) => x && x.id === entry.id);
  const next = idx >= 0 ? [...list.slice(0, idx), entry, ...list.slice(idx + 1)] : [entry, ...list];
  window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // toast (same micro-feedback approach)
  const [toast, setToast] = useState(null); // { text, tone }
  const showToast = (text, tone = "success") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 2500);
  };

  const [context, setContext] = useState({ subject: SUBJECT_OPTIONS[0], level: LEVEL_OPTIONS[0] });
  const [profile, setProfile] = useState({ avatar: "panda", name: "", goal: "", note: "" });

  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [stats, setStats] = useState(null);

  // load
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ctxRaw = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
    const ctx = ctxRaw ? safeJsonParse(ctxRaw, null) : null;
    if (ctx && typeof ctx === "object") {
      setContext({
        subject: ctx.subject || SUBJECT_OPTIONS[0],
        level: ctx.level || LEVEL_OPTIONS[0],
      });
    }

    const pRaw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const p = pRaw ? safeJsonParse(pRaw, null) : null;
    if (p && typeof p === "object") {
      setProfile({
        avatar: typeof p.avatar === "string" ? p.avatar : "panda",
        name: typeof p.name === "string" ? p.name : "",
        goal: typeof p.goal === "string" ? p.goal : "",
        note: typeof p.note === "string" ? p.note : "",
      });
    }
  }, []);

  // persist context
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));
  }, [context]);

  // persist profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  
  // sync profile (goal/note) into library as pinned entries
  useEffect(() => {
    if (typeof window === "undefined") return;

    const subject = context.subject || "Без предмета";
    const level = context.level || "Без уровня";
    const now = new Date().toISOString();

    if (profile.goal && profile.goal.trim()) {
      upsertLibraryEntry({
        id: PROFILE_LIBRARY_IDS.goal,
        type: "profile",
        kind: "goal",
        subject,
        level,
        topic: "Профиль: цель обучения",
        text: profile.goal.trim(),
        updatedAt: now,
        createdAt: now,
      });
    }

    if (profile.note && profile.note.trim()) {
      upsertLibraryEntry({
        id: PROFILE_LIBRARY_IDS.note,
        type: "profile",
        kind: "note",
        subject,
        level,
        topic: "Профиль: заметка для себя",
        text: profile.note.trim(),
        updatedAt: now,
        createdAt: now,
      });
    }
    // note: если поле очищено — не удаляем запись, чтобы не ломать библиотеку (можно добавить позже)
  }, [profile.goal, profile.note, context.subject, context.level]);

// lightweight stats (non-critical)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const km = safeJsonParse(window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY) || "{}", {});
    const th = safeJsonParse(window.localStorage.getItem(TEST_HISTORY_KEY) || "[]", []);
    const goals = safeJsonParse(window.localStorage.getItem(GOALS_STORAGE_KEY) || "[]", []);

    const bySubject = km?.[context.subject]?.[context.level];
    const topicsTouched =
      bySubject && typeof bySubject === "object" ? Object.keys(bySubject).length : 0;

    const explanationsSaved =
      bySubject && typeof bySubject === "object"
        ? Object.values(bySubject).filter(
            (d) => d && (d.source === "dialog_saved" || d.source === "dialog")
          ).length
        : 0;

    const testsInCtx = Array.isArray(th)
      ? th.filter((x) => x?.subject === context.subject && x?.level === context.level).length
      : 0;

    setStats({
      testsInCtx,
      topicsTouched,
      explanationsSaved,
      goalsCount: Array.isArray(goals) ? goals.length : 0,
    });
  }, [context.subject, context.level]);

  const makeExport = () => {
    if (typeof window === "undefined") return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      context: safeJsonParse(window.localStorage.getItem(CONTEXT_STORAGE_KEY) || "null", null),
      profile: safeJsonParse(window.localStorage.getItem(PROFILE_STORAGE_KEY) || "null", null),
      knowledgeMap: safeJsonParse(window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY) || "{}", {}),
      testHistory: safeJsonParse(window.localStorage.getItem(TEST_HISTORY_KEY) || "[]", []),
      goals: safeJsonParse(window.localStorage.getItem(GOALS_STORAGE_KEY) || "[]", []),
    };
    const txt = JSON.stringify(payload, null, 2);
    setExportText(txt);
    showToast("Данные подготовлены для экспорта", "success");
  };

  const copyExport = async () => {
    if (!exportText) return;
    try {
      await navigator.clipboard.writeText(exportText);
      showToast("Скопировано в буфер обмена", "success");
    } catch {
      showToast("Не удалось скопировать — выдели текст вручную", "warn");
    }
  };

  const downloadExport = () => {
    if (typeof window === "undefined") return;
    if (!exportText) return;
    try {
      const blob = new Blob([exportText], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `noolix_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Файл скачан", "success");
    } catch {
      showToast("Не удалось скачать — используй копирование", "warn");
    }
  };

  const applyImport = () => {
    if (typeof window === "undefined") return;
    const raw = (importText || "").trim();
    if (!raw) return showToast("Вставь JSON для импорта", "warn");

    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== "object") return showToast("Некорректный JSON", "error");

    const ok = window.confirm(
      "Импорт заменит текущие данные (прогресс/тесты/цели). Продолжить?"
    );
    if (!ok) return;

    try {
      if ("context" in parsed) window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(parsed.context || null));
      if ("profile" in parsed) window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(parsed.profile || null));
      if ("knowledgeMap" in parsed) window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(parsed.knowledgeMap || {}));
      if ("testHistory" in parsed) window.localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(parsed.testHistory || []));
      if ("goals" in parsed) window.localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(parsed.goals || []));
      showToast("Импорт выполнен. Перезагружаю…", "success");
      window.setTimeout(() => window.location.reload(), 600);
    } catch {
      showToast("Импорт не удался", "error");
    }
  };

  const resetAll = () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Сбросить прогресс, историю тестов и цели? Это действие нельзя отменить."
    );
    if (!ok) return;

    try {
      window.localStorage.removeItem(KNOWLEDGE_STORAGE_KEY);
      window.localStorage.removeItem(TEST_HISTORY_KEY);
      window.localStorage.removeItem(GOALS_STORAGE_KEY);
      // keep context/profile (can be useful), but user can clear manually
      showToast("Данные сброшены. Перезагружаю…", "warn");
      window.setTimeout(() => window.location.reload(), 600);
    } catch {
      showToast("Не удалось сбросить данные", "error");
    }
  };

  return (
    <>

      <style jsx global>{`
        @keyframes noxSoftPop {
          0% { transform: scale(0.96); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: noxSoftPop 180ms ease-out both; }
        @keyframes noxBounceSoft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-bounce-soft { animation: noxBounceSoft 900ms ease-in-out infinite; }
      `}</style>

      {toast ? (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-5 py-3 rounded-2xl bg-black/80 border text-sm font-semibold text-white shadow-xl backdrop-blur-md animate-fade-in flex items-center gap-2 ${
              toast.tone === "error"
                ? "border-red-400/50"
                : toast.tone === "warn"
                ? "border-yellow-400/50"
                : "border-purple-400/40"
            }`}
          >
            <span className="text-base">
              {toast.tone === "error" ? "⚠️" : toast.tone === "warn" ? "🟡" : "✅"}
            </span>
            <span>{toast.text}</span>
          </div>
        </div>
      ) : null}

      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

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
            <p className="text-xs text-purple-200 mt-1 opacity-80">AI-платформа для учёбы</p>
          </div>

          <nav className="space-y-3 text-sm md:text-base">
            <div className="space-y-2">
              {primaryMenuItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition
                    ${item.key === "profile" ? "hover:bg-white/5" : "hover:bg-white/5"}
                  `}
                >
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2">
              {secondaryMenuItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition ${
                    item.key === "profile" ? "bg-white/15" : "hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white ${
                      item.key === "profile" ? "ring-2 ring-purple-200" : ""
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className={item.key === "profile" ? "font-semibold" : ""}>
                    {item.label}
                  </span>
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen">
          <header className="md:hidden p-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 transition"
            >
              ☰
            </button>
            <div className="text-sm text-purple-100/80">Профиль</div>
            <div className="w-10" />
          </header>

          <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
            <div className="w-full max-w-5xl bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)] space-y-4 md:space-y-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                    Профиль
                  </h1>
                  <p className="text-sm text-purple-100/70 mt-1">
                    Настройки, контекст и управление данными
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <a
                    href="/progress"
                    className="px-4 py-2 rounded-full border border-white/15 bg-black/20 text-xs text-purple-50 hover:bg-white/5 transition"
                  >
                    ← Прогресс
                  </a>
                  <a
                    href="/goals"
                    className="px-4 py-2 rounded-full border border-white/15 bg-black/20 text-xs text-purple-50 hover:bg-white/5 transition"
                  >
                    🎯 Цели
                  </a>
                </div>
              </div>

              {/* context */}
              <section className="bg-black/20 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Контекст обучения
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                    <p className="text-[11px] text-purple-200/80">Предмет</p>
                    <select
                      className="mt-2 w-full text-sm px-3 py-2 rounded-2xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      value={context.subject}
                      onChange={(e) => setContext((c) => ({ ...c, subject: e.target.value }))}
                    >
                      {SUBJECT_OPTIONS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                    <p className="text-[11px] text-purple-200/80">Уровень</p>
                    <select
                      className="mt-2 w-full text-sm px-3 py-2 rounded-2xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      value={context.level}
                      onChange={(e) => setContext((c) => ({ ...c, level: e.target.value }))}
                    >
                      {LEVEL_OPTIONS.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {stats ? (
                  <div className="flex flex-wrap gap-2 text-[11px] text-purple-100/70">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/10">
                      🧪 тестов: <b className="text-purple-50">{stats.testsInCtx}</b>
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/10">
                      📈 тем: <b className="text-purple-50">{stats.topicsTouched}</b>
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/10">
                      💬 объяснений: <b className="text-purple-50">{stats.explanationsSaved}</b>
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/10">
                      🎯 целей: <b className="text-purple-50">{stats.goalsCount}</b>
                    </span>
                  </div>
                ) : null}
              </section>

              {/* profile */}
              <section className="bg-black/20 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  О тебе
                </p>

                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-100 to-white text-black flex items-center justify-center text-3xl shadow-md ring-2 ring-purple-200/60">
                      {AVATAR_OPTIONS.find((a) => a.key === profile.avatar)?.icon || "🐼"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {profile.name ? profile.name : "Твой профиль"}
                      </p>
                      <p className="text-xs text-purple-100/70">
                        Выбери аватар — он будет отображаться в профиле и позже в аккаунте
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end md:flex-1">
                    {AVATAR_OPTIONS.slice(0, 8).map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => {
                          setProfile((p) => ({ ...p, avatar: a.key }));
                          showToast("Аватар обновлён", "success");
                        }}
                        className={`h-10 w-10 rounded-2xl border transition flex items-center justify-center text-xl ${
                          profile.avatar === a.key
                            ? "bg-white text-black border-purple-200 ring-2 ring-purple-200/60"
                            : "bg-black/30 border-white/15 hover:bg-white/5"
                        }`}
                        title={a.label}
                      >
                        {a.icon}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const rest = AVATAR_OPTIONS.slice(8);
                        const pick = rest[Math.floor(Math.random() * rest.length)];
                        setProfile((p) => ({ ...p, avatar: pick.key }));
                        showToast("Случайный аватар", "success");
                      }}
                      className="h-10 px-3 rounded-2xl border border-white/15 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                      title="Случайный аватар"
                    >
                      🎲
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                    <p className="text-[11px] text-purple-200/80">Имя (необязательно)</p>
                    <input
                      className="mt-2 w-full text-sm px-3 py-2 rounded-2xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Например: Артём"
                    />
                  </div>

                  <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                    <p className="text-[11px] text-purple-200/80">Цель обучения</p>
                    <input
                      className="mt-2 w-full text-sm px-3 py-2 rounded-2xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      value={profile.goal}
                      onChange={(e) => setProfile((p) => ({ ...p, goal: e.target.value }))}
                      placeholder="Например: подготовка к ЕГЭ"
                    />
                  </div>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                  <p className="text-[11px] text-purple-200/80">Заметка (для себя)</p>
                  <textarea
                    className="mt-2 w-full min-h-[90px] text-sm px-3 py-2 rounded-2xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    value={profile.note}
                    onChange={(e) => setProfile((p) => ({ ...p, note: e.target.value }))}
                    placeholder="Например: учусь 30 минут в день, по будням"
                  />
                </div>

                

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => showToast("Сохранено", "success")}
                    className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-md hover:bg-purple-100 transition"
                  >
                    ✅ Сохранить
                  </button>
                  <a
                    href="/chat"
                    className="px-4 py-2 rounded-full border border-white/20 bg-black/30 text-xs text-purple-50 hover:bg-white/5 transition"
                  >
                    💬 В диалог
                  </a>
                </div>

              </section>

              {/* advanced */}
              <section className="bg-black/20 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className="ml-auto px-4 py-2 rounded-full border border-white/15 bg-black/20 text-xs text-purple-50 hover:bg-white/5 transition"
                  >
                    {advancedOpen ? "Скрыть" : "Показать"}
                  </button>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                      Дополнительно
                    </p>
                    <p className="text-xs text-purple-100/70 mt-1">
                      Резервная копия и сброс — полезно, если переносишь данные между устройствами или хочешь начать заново. Это для продвинутых.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetAll}
                    className="px-4 py-2 rounded-full border border-red-400/40 bg-black/30 text-xs text-red-100 hover:bg-white/5 transition"
                    title="Сбросить прогресс/тесты/цели"
                  >
                    🧹 Сброс
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={makeExport}
                    className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-md hover:bg-purple-100 transition"
                  >
                    📦 Подготовить экспорт
                  </button>
                  <button
                    type="button"
                    onClick={copyExport}
                    className="px-4 py-2 rounded-full border border-white/20 bg-black/30 text-xs text-purple-50 hover:bg-white/5 transition"
                    disabled={!exportText}
                    title={!exportText ? "Сначала подготовь экспорт" : "Скопировать"}
                  >
                    📋 Копировать
                  </button>
                  <button
                    type="button"
                    onClick={downloadExport}
                    className="px-4 py-2 rounded-full border border-white/20 bg-black/30 text-xs text-purple-50 hover:bg-white/5 transition"
                    disabled={!exportText}
                    title={!exportText ? "Сначала подготовь экспорт" : "Скачать JSON"}
                  >
                    ⬇️ Скачать
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                    <p className="text-[11px] text-purple-200/80">Экспорт (JSON)</p>
                    <textarea
                      className="mt-2 w-full min-h-[170px] text-[12px] px-3 py-2 rounded-2xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      value={exportText}
                      onChange={(e) => setExportText(e.target.value)}
                      placeholder="Нажми «Подготовить экспорт» — здесь появится JSON"
                    />
                  </div>

                  <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                    <p className="text-[11px] text-purple-200/80">Импорт (JSON)</p>
                    <textarea
                      className="mt-2 w-full min-h-[170px] text-[12px] px-3 py-2 rounded-2xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Вставь JSON и нажми «Импортировать»"
                    />
                    <div className="flex gap-2 flex-wrap mt-2">
                      <button
                        type="button"
                        onClick={applyImport}
                        className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-md hover:bg-purple-100 transition"
                      >
                        ⤵️ Импортировать
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportText("")}
                        className="px-4 py-2 rounded-full border border-white/20 bg-black/30 text-xs text-purple-50 hover:bg-white/5 transition"
                      >
                        Очистить
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <p className="text-[11px] text-purple-100/60">
                Совет: если переносишь данные между устройствами — сначала экспортируй, затем импортируй на другом устройстве.
              </p>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
