// pages/tests.js
import React, { useEffect, useMemo, useState  } from "react";
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
const KNOWLEDGE_STORAGE_KEY = "noolixKnowledgeMap";
const TEST_HISTORY_KEY = "noolixTestsHistory";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const getToday = () => new Date().toISOString().slice(0, 10);

// Сглаживание: новый результат не перетирает старый резко
const blendScore = (oldScore, newScore, alpha = 0.35) => {
  const o = typeof oldScore === "number" ? oldScore : 0;
  return clamp01(o * (1 - alpha) + newScore * alpha);
};

const safeParse = (raw, fallback) => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
};

const updateKnowledgeFromTest = ({ subject, level, topic, correctCount, totalCount }) => {
  if (typeof window === "undefined") return;
  if (!subject || !level || !topic || !totalCount || totalCount <= 0) return;

  const raw = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
  const km = safeParse(raw, {});

  if (!km[subject] || typeof km[subject] !== "object") km[subject] = {};
  if (!km[subject][level] || typeof km[subject][level] !== "object") km[subject][level] = {};

  const newScore = clamp01(correctCount / totalCount);
  const prev = km[subject][level][topic] || {};
  const nextScore = blendScore(prev.score, newScore, 0.35);

  km[subject][level][topic] = {
    ...prev,
    score: nextScore,
    updatedAt: getToday(),
  };

  window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(km));
};

const pushTestHistory = ({ subject, level, topic, score, correctCount, totalCount }) => {
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem(TEST_HISTORY_KEY);
  const list = safeParse(raw, []);
  const next = Array.isArray(list) ? list : [];

  next.unshift({
    id: Date.now(),
    subject,
    level,
    topic,
    score,
    correctCount,
    totalCount,
    createdAt: new Date().toISOString(),
  });

  // MVP: храним максимум 50
  window.localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(next.slice(0, 50)));
};

export default function TestsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [context, setContext] = useState({
    subject: "Математика",
    level: "10–11 класс",
    mode: "exam_prep",
  });

  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState([]); // [{question, options, correctIndex, topicTitle?}]
  const [userAnswers, setUserAnswers] = useState([]); // number|null
  const [result, setResult] = useState(null); // {correctCount,totalCount,scorePercent}
  const [analysis, setAnalysis] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const [testHistory, setTestHistory] = useState([]);
  const [historyTick, setHistoryTick] = useState(0);
  const [historyScope, setHistoryScope] = useState("current"); // "current" | "all"

  // init context
  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawCtx = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
    const parsed = safeParse(rawCtx, null);
    if (parsed && typeof parsed === "object") {
      setContext((prev) => ({ ...prev, ...parsed }));
    }
  }, []);

  const applyContextChange = (nextCtx) => {
    setContext(nextCtx);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(nextCtx));
    }
  };

  const loadTestHistory = () => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(TEST_HISTORY_KEY);
    const arr = safeParse(raw, []);
    const list = Array.isArray(arr) ? arr : [];

    let scoped = list;

    if (historyScope === "current") {
      scoped = list.filter(
        (x) => x?.subject === context.subject && x?.level === context.level
      );
    }

    setTestHistory(scoped.slice(0, 20));
  };

  const clearTestHistory = () => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(TEST_HISTORY_KEY);
    const arr = safeParse(raw, []);
    const list = Array.isArray(arr) ? arr : [];

    let next = list;

    if (historyScope === "current") {
      next = list.filter(
        (x) => !(x?.subject === context.subject && x?.level === context.level)
      );
    } else {
      next = [];
    }

    window.localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(next));
    setHistoryTick((t) => t + 1);
  };

  const canGenerate = useMemo(() => {
    return !generating && context.subject && context.level;
  }, [generating, context.subject, context.level]);

  const canSubmit = useMemo(() => {
    if (!questions.length) return false;
    if (submitting) return false;
    // разрешаем отправить даже если не все ответы выбраны — это MVP
    return true;
  }, [questions.length, submitting]);

  useEffect(() => {
    loadTestHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.subject, context.level, historyScope, historyTick]);

  const resetSession = () => {
    setError("");
    setQuestions([]);
    setUserAnswers([]);
    setResult(null);
    setAnalysis("");
    setReviewing(false);
  };

  const generateTest = async () => {
    setError("");
    setGenerating(true);
    setAnalysis("");
    setResult(null);

    try {
      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: context.subject,
          level: context.level,
          topic: topic?.trim() || "",
        }),
      });

      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch (_) {}
        throw new Error(data?.error || data?.message || "Не удалось сгенерировать тест.");
      }

      const data = await res.json();

      const q =
        Array.isArray(data?.questions) ? data.questions :
        Array.isArray(data?.test?.questions) ? data.test.questions :
        Array.isArray(data) ? data :
        [];

      if (!Array.isArray(q) || q.length === 0) {
        throw new Error("Сервер вернул пустой тест. Попробуй другую тему.");
      }

      setQuestions(q);
      setUserAnswers(new Array(q.length).fill(null));
    } catch (e) {
      setError(typeof e?.message === "string" ? e.message : "Ошибка генерации теста.");
    } finally {
      setGenerating(false);
    }
  };

  const submitTest = async () => {
    setSubmitting(true);
    setError("");
    setAnalysis("");

    try {
      const totalCount = questions.length;

      let correctCount = 0;
      questions.forEach((q, idx) => {
        const ua = userAnswers[idx];
        if (typeof ua === "number" && ua === q.correctIndex) correctCount += 1;
      });

      const score = totalCount > 0 ? correctCount / totalCount : 0;
      const scorePercent = Math.round(score * 100);

      setResult({ correctCount, totalCount, scorePercent });

      const finalTopic =
        topic?.trim() || questions?.[0]?.topicTitle || "Тема без названия";

      // обновляем карту знаний
      updateKnowledgeFromTest({
        subject: context.subject,
        level: context.level,
        topic: finalTopic,
        correctCount,
        totalCount,
      });

      // пишем историю тестов
      pushTestHistory({
        subject: context.subject,
        level: context.level,
        topic: finalTopic,
        score: clamp01(score),
        correctCount,
        totalCount,
      });

      // обновим блок истории тестов на странице
      setHistoryTick((t) => t + 1);
    } catch (e) {
      setError(typeof e?.message === "string" ? e.message : "Ошибка при проверке теста.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewMistakes = async () => {
    setReviewing(true);
    setError("");
    setAnalysis("");

    try {
      const finalTopic = topic?.trim() || questions?.[0]?.topicTitle || "";

      const res = await fetch("/api/review-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: context.subject,
          topic: finalTopic,
          questions,
          userAnswers,
        }),
      });

      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch (_) {}
        throw new Error(data?.error || data?.message || "Не удалось получить разбор ошибок.");
      }

      const data = await res.json();
      setAnalysis(typeof data?.analysis === "string" ? data.analysis : "");
    } catch (e) {
      setError(typeof e?.message === "string" ? e.message : "Ошибка разбора ошибок.");
    } finally {
      setReviewing(false);
    }
  };

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
                  ${item.key === "tests" ? "bg-white/15" : "hover:bg-white/5"}
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white
                    ${item.key === "tests" ? "ring-2 ring-purple-200" : ""}
                  `}
                >
                  {item.icon}
                </span>
                <span className={item.key === "tests" ? "font-semibold" : ""}>
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
                  <span>Мини-тесты</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold">Тесты</h1>
                  <p className="text-xs md:text-sm text-purple-200 mt-1 max-w-xl">
                    Сгенерируй мини-тест, пройди его — и прогресс по теме обновится автоматически.
                  </p>
                </div>
              </div>

              <div className="w-full md:w-[280px] space-y-2">
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

            <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Тема теста
                  </p>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Например: Производная, Кинематика, Причастные обороты…"
                    className="mt-2 w-full text-xs md:text-sm px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-purple-300/70"
                  />
                  <p className="text-[11px] text-purple-200/80 mt-2">
                    Можно оставить пустым — NOOLIX выберет тему сам.
                  </p>
                </div>

                <div className="flex gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={resetSession}
                    className="px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                  >
                    Сброс
                  </button>

                  <button
                    type="button"
                    onClick={generateTest}
                    disabled={!canGenerate}
                    className="px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? "Генерация…" : "Сгенерировать тест"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-black/40 border border-red-400/30 rounded-xl p-3 text-xs text-red-200">
                  {error}
                </div>
              )}
            </section>

            {/* История тестов */}
            <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    История тестов
                  </p>
                  <p className="text-xs md:text-sm text-purple-100/90">
                    {historyScope === "current"
                    ? "Последние попытки по текущему предмету и уровню."
                    : "Последние попытки по всем предметам и уровням."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setHistoryScope((s) => (s === "current" ? "all" : "current"))}
                  className="px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                >
                  {historyScope === "current" ? "Показать все" : "Только текущие"}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTick((t) => t + 1)}
                  className="px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                >
                  Обновить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      historyScope === "current"
                        ? "Очистить историю по текущему предмету и уровню?"
                        : "Очистить ВСЮ историю мини‑тестов?"
                    );
                    if (ok) clearTestHistory();
                  }}
                  className="px-3 py-2 rounded-full border border-red-300/30 bg-black/30 text-[11px] text-red-100 hover:bg-white/5 transition"
                >
                  Очистить
                </button>
              </div>
              </div>

              {testHistory.length > 0 && (
                <div className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-purple-100/90 flex flex-wrap gap-2">
                  <span>Показано: <b>{testHistory.length}</b></span>
                  <span>•</span>
                  <span>
                    Средний результат:{" "}
                    <b>
                      {Math.round(
                        (testHistory.reduce((sum, x) => sum + (x?.score ?? 0), 0) /
                          Math.max(1, testHistory.length)) *
                          100
                      )}
                      %
                    </b>
                  </span>
                </div>
              )}

              {testHistory.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  Пока нет попыток. Пройди мини-тест — и здесь появится история.
                </p>
              ) : (
                <div className="space-y-2">
                  {testHistory.map((h) => {
                    const pct = Math.round((h?.score ?? 0) * 100);
                    const when = h?.createdAt ? new Date(h.createdAt).toLocaleString() : "";
                    return (
                      <div
                        key={h.id}
                        className="bg-black/20 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {h.topic || "Тема"}
                          </p>
                          <p className="text-[11px] text-purple-200/80">
                            Результат: {pct}% • {h.correctCount}/{h.totalCount}
                            {when ? ` • ${when}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <a
                            href={`/chat?topic=${encodeURIComponent(h.topic || "")}`}
                            className="inline-flex items-center justify-center px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                          >
                            Разобрать в чате →
                          </a>
                          <a
                            href="/progress"
                            className="inline-flex items-center justify-center px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                          >
                            Прогресс
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* questions */}
            {questions.length > 0 && (
              <section className="space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Вопросы
                </p>

                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-sm">
                          {idx + 1}. {q.question}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {(Array.isArray(q.options) ? q.options : []).map((opt, oi) => {
                          const checked = userAnswers[idx] === oi;
                          return (
                            <label
                              key={oi}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition cursor-pointer
                                ${
                                  checked
                                    ? "bg-white/10 border-purple-300/60"
                                    : "bg-black/20 border-white/10 hover:bg-white/5"
                                }`}
                            >
                              <input
                                type="radio"
                                name={`q_${idx}`}
                                checked={checked}
                                onChange={() => {
                                  setUserAnswers((prev) => {
                                    const next = [...prev];
                                    next[idx] = oi;
                                    return next;
                                  });
                                }}
                              />
                              <span className="text-xs md:text-sm text-purple-50">
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={submitTest}
                    disabled={!canSubmit}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-br from-purple-300 to-purple-500 text-black text-xs md:text-sm font-semibold shadow-lg hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Проверяем…" : "Завершить и сохранить результат"}
                  </button>

                  <a
                    href="/progress"
                    className="px-4 py-2 rounded-2xl border border-white/20 bg-black/30 text-xs md:text-sm text-purple-50 hover:bg-white/5 transition"
                  >
                    Перейти в прогресс
                  </a>
                </div>

                {result && (
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                      Результат
                    </p>
                    <p className="text-sm">
                      Правильных:{" "}
                      <span className="font-semibold">
                        {result.correctCount}/{result.totalCount}
                      </span>{" "}
                      · Итог:{" "}
                      <span className="font-semibold">{result.scorePercent}%</span>
                    </p>
                    <p className="text-[11px] text-purple-200/80">
                      Прогресс по теме обновлён (см. страницу “Прогресс”).
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={reviewMistakes}
                        disabled={reviewing}
                        className="px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reviewing ? "Делаем разбор…" : "Разобрать ошибки"}
                      </button>

                      <a
                        href="/chat"
                        className="px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                      >
                        Обсудить в диалоге →
                      </a>
                    </div>
                  </div>
                )}

                {analysis && (
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                      Разбор ошибок
                    </p>
                    <div className="text-xs md:text-sm text-purple-50 whitespace-pre-wrap leading-relaxed">
                      {analysis}
                    </div>
                  </div>
                )}
              </section>
            )}
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
