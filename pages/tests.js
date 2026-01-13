// pages/tests.js
import React, { useEffect, useMemo, useRef, useState } from "react";
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
const MISTAKE_STATS_KEY = "noolixMistakeStats";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const getToday = () => new Date().toISOString().slice(0, 10);

// Сглаживание: новый результат не перетирает старый резко
const blendScore = (oldScore, newScore, alpha = 0.35) => {
  const o = typeof oldScore === "number" ? oldScore : 0;
  return clamp01(o * (1 - alpha) + newScore * alpha);
};

const parseTopicsInput = (raw) => {
  const txt = typeof raw === "string" ? raw : "";
  const parts = txt
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // убираем дубликаты сохраняя порядок
  const seen = new Set();
  const unique = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique;
};


const normalizeTopicKey = (t) => {
  const raw = String(t || "").trim();
  if (!raw) return "Общее";
  const words = raw.split(/\s+/).filter(Boolean);
  const tooLong = raw.length > 60;
  const tooManyWords = words.length > 8;
  const hasSentenceMarks = /[\?\!\.]/.test(raw);
  if (tooLong || tooManyWords || hasSentenceMarks) return "Общее";
  return raw;
};

const getWeakestTopicFromProgress = (subject, level) => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
  const km = safeParse(raw, {});
  const subj = km?.[subject];
  const lvl = subj?.[level];
  if (!lvl || typeof lvl !== "object") return null;

  // нормализуем "битые" темы (когда ключом становилась фраза/сообщение)
  const merged = {};
  Object.entries(lvl).forEach(([topic, data]) => {
    const k = normalizeTopicKey(topic);
    const score = typeof data?.score === "number" ? data.score : 0;
    const prev = merged[k];
    if (!prev) merged[k] = { score };
    else merged[k].score = Math.min(prev.score, score);
  });

  const entries = Object.entries(merged)
    .map(([topic, data]) => ({ topic, score: typeof data?.score === "number" ? data.score : 0 }))
    .sort((a, b) => a.score - b.score);
  return entries[0]?.topic || null;
};


const safeParse = (raw, fallback) => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
};


const hashString = (s) => {
  let h = 2166136261;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

const classifyMistake = ({ timeSec, confident, repeats }) => {
  const t = typeof timeSec === "number" ? timeSec : null;
  const r = typeof repeats === "number" ? repeats : 1;
  const c = !!confident;

  if (r >= 3) return "повторяется";
  if (c && r >= 2) return "путаю понятия";
  if (c) return "уверенно ошибся";
  if (t !== null && t < 7 && r <= 1) return "скорее невнимательность";
  if (t !== null && t >= 12 && r >= 2) return "пробел в знании";
  if (r >= 2) return "нужно закрепить";
  return "разобрать и закрепить";
};

const readMistakeStats = () => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(MISTAKE_STATS_KEY);
  return safeParse(raw, {});
};

const writeMistakeStats = (stats) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MISTAKE_STATS_KEY, JSON.stringify(stats || {}));
};

const updateMistakeStats = ({ subject, level, topic, mistakes }) => {
  if (typeof window === "undefined") return;
  if (!subject || !level || !Array.isArray(mistakes) || mistakes.length === 0) return;

  const stats = readMistakeStats();
  if (!stats[subject] || typeof stats[subject] !== "object") stats[subject] = {};
  if (!stats[subject][level] || typeof stats[subject][level] !== "object") stats[subject][level] = {};

  const lvl = stats[subject][level];
  const now = new Date().toISOString();

  for (const m of mistakes) {
    const qHash = hashString(m.question || "");
    const key = `${topic || ""}::${qHash}::${m.correctIndex}::${m.userIndex}`;
    const prev = lvl[key] && typeof lvl[key] === "object" ? lvl[key] : {};
    const prevCount = typeof prev.count === "number" ? prev.count : 0;
    const nextCount = prevCount + 1;

    const prevAvgTime = typeof prev.avgTimeSec === "number" ? prev.avgTimeSec : null;
    const t = typeof m.timeSec === "number" ? m.timeSec : null;
    const nextAvgTime =
      t === null ? prevAvgTime : prevAvgTime === null ? t : +(prevAvgTime * 0.7 + t * 0.3).toFixed(2);

    const prevConfWrong = typeof prev.confidentWrongCount === "number" ? prev.confidentWrongCount : 0;
    const nextConfWrong = prevConfWrong + (m.confident ? 1 : 0);

    lvl[key] = {
      key,
      subject,
      level,
      topic: topic || "",
      question: m.question || "",
      correctIndex: m.correctIndex,
      userIndex: m.userIndex,
      count: nextCount,
      avgTimeSec: nextAvgTime,
      confidentWrongCount: nextConfWrong,
      lastAt: now,
    };
  }

  stats[subject][level] = lvl;
  writeMistakeStats(stats);
};

const getTopRepeatedMistakes = ({ subject, level, limit = 3 }) => {
  if (typeof window === "undefined") return [];
  const stats = readMistakeStats();
  const lvl = stats?.[subject]?.[level];
  if (!lvl || typeof lvl !== "object") return [];
  return Object.values(lvl)
    .filter((x) => x && typeof x === "object" && typeof x.count === "number" && x.count >= 2)
    .sort((a, b) => (b.count - a.count) || ((b.confidentWrongCount || 0) - (a.confidentWrongCount || 0)))
    .slice(0, limit);
};


const updateKnowledgeFromTest = ({ subject, level, topic, correctCount, totalCount }) => {
  if (typeof window === "undefined") return { ok: false, error: "no-window" };
  const topicKey = normalizeTopicKey(topic);
  if (!subject || !level || !topicKey || !totalCount || totalCount <= 0) return { ok: false, error: "missing-context" };

  try {
    const raw = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
    const km = safeParse(raw, {});

    if (!km[subject] || typeof km[subject] !== "object") km[subject] = {};
    if (!km[subject][level] || typeof km[subject][level] !== "object") km[subject][level] = {};

    const newScore = clamp01(correctCount / totalCount);
    const prev = km[subject][level][topicKey] || {};
    const nextScore = blendScore(prev.score, newScore, 0.35);

    km[subject][level][topicKey] = {
      ...prev,
      score: nextScore,
      updatedAt: getToday(),
    };

    window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(km));
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e?.message || "km-write-failed" };
  }
};

const pushTestHistory = ({ subject, level, topic, score, correctCount, totalCount, mistakesSummary, durationMs, startedAt, firstActionAt, finishedAt }) => {
  const topicKey = normalizeTopicKey(topic);
  if (typeof window === "undefined") return { ok: false, count: 0, error: "no-window" };

  try {
    const raw = window.localStorage.getItem(TEST_HISTORY_KEY);
    const list = safeParse(raw, []);
    const next = Array.isArray(list) ? list : [];

    next.unshift({
      id: Date.now(),
      subject,
      level,
      topic: topicKey,
      score,
      correctCount,
      totalCount,
      createdAt: new Date().toISOString(),
      mistakesSummary: mistakesSummary || null,
      durationMs: typeof durationMs === "number" ? durationMs : null,
      startedAt: startedAt || null,
      firstActionAt: firstActionAt || null,
      finishedAt: finishedAt || null,
    });

    const trimmed = next.slice(0, 50);
    window.localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(trimmed));
    return { ok: true, count: trimmed.length, error: null };
  } catch (e) {
    return { ok: false, count: 0, error: e?.message || "history-write-failed" };
  }
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
  const [questionShownAt, setQuestionShownAt] = useState([]); // ms timestamps
  const [timeToFirstAnswerSec, setTimeToFirstAnswerSec] = useState([]); // number|null
  const [confidence, setConfidence] = useState([]); // "low" | "high"

  // Тайминг всего теста: считаем с первого действия пользователя (не с генерации)
  const [testShownAtMs, setTestShownAtMs] = useState(null); // ms
  const [firstActionAtMs, setFirstActionAtMs] = useState(null); // ms
  const firstActionAtRef = useRef(null);

  const [result, setResult] = useState(null); // {correctCount,totalCount,scorePercent}
  const [analysis, setAnalysis] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [saveInfo, setSaveInfo] = useState(null); // {historyCount, kmTouched, ts, error}

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

  const topRepeatedMistakes = useMemo(() => {
    if (typeof window === "undefined") return [];
    return getTopRepeatedMistakes({ subject: context.subject, level: context.level, limit: 3 });
  }, [context.subject, context.level, historyTick]);

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
    setQuestionShownAt([]);
    setTimeToFirstAnswerSec([]);
    setConfidence([]);
    setResult(null);
    setAnalysis("");
    setReviewing(false);
  };

  const generateFocusedTest = async (forcedTopicTitles, count = 2) => {
    setError("");
    setGenerating(true);
    setAnalysis("");
    setResult(null);
    try {
      if (!context?.subject || !context?.level) throw new Error("Нужно выбрать предмет и уровень, чтобы сгенерировать тест.");
      const titles = Array.isArray(forcedTopicTitles) ? forcedTopicTitles.filter(Boolean) : [];
      if (!titles.length) throw new Error("Нет темы для закрепления.");
      const topicsToSend = titles.map((t) => ({ id: slugifyId(t), title: t }));
      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: context.subject, topics: topicsToSend, questionCount: count }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Не удалось сгенерировать тест");
      }
      const data = await res.json();
      const q = Array.isArray(data?.questions) ? data.questions : [];
      if (!q.length) throw new Error("Пустой тест. Попробуй ещё раз.");
      resetSession();
      setQuestions(q);
      setUserAnswers(new Array(q.length).fill(null));
      const nowMs = Date.now();
      setQuestionShownAt(new Array(q.length).fill(nowMs));
      setTimeToFirstAnswerSec(new Array(q.length).fill(null));
      setConfidence(new Array(q.length).fill("low"));
      setTestShownAtMs(nowMs);
      setFirstActionAtMs(null);
      firstActionAtRef.current = null;
      setTopic(titles[0] || "");
      setGenerating(false);
    } catch (e) {
      setError(e?.message || "Ошибка");
      setGenerating(false);
    }
  };

  const markFirstAction = () => {
    if (firstActionAtRef.current) return;
    const ms = Date.now();
    firstActionAtRef.current = ms;
    setFirstActionAtMs(ms);
  };

  const generateTest = async () => {
    setError("");
    setGenerating(true);
    setAnalysis("");
    setResult(null);

    try {
      const manualTopics = parseTopicsInput(topic).map(normalizeTopicKey).filter(Boolean);
      const autoWeakest = getWeakestTopicFromProgress(context.subject, context.level);
      const topicsToSend = manualTopics.length > 0 ? manualTopics : (autoWeakest ? [autoWeakest] : []);

      if (!context.subject) {
        throw new Error("Выбери предмет (subject), чтобы сгенерировать тест.");
      }
      if (!Array.isArray(topicsToSend) || topicsToSend.length === 0) {
        throw new Error("Введи тему (минимум одну) или сначала получи прогресс по темам (мини‑тест/объяснение).");
      }

      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: context.subject,
          topics: topicsToSend,
          questionCount: 5,
          difficulty: "medium",
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
      const nowMs = Date.now();
      setQuestionShownAt(new Array(q.length).fill(nowMs));
      setTimeToFirstAnswerSec(new Array(q.length).fill(null));
      setConfidence(new Array(q.length).fill("low"));
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

      const finishedAtMs = Date.now();
      const startMs = (typeof firstActionAtRef.current === "number" ? firstActionAtRef.current : null) || (typeof testShownAtMs === "number" ? testShownAtMs : null) || finishedAtMs;
      const durationMs = Math.max(0, finishedAtMs - startMs);

      let correctCount = 0;
      const mistakes = [];
      questions.forEach((q, idx) => {
        const ua = userAnswers[idx];
        const isCorrect = typeof ua === "number" && ua === q.correctIndex;
        if (isCorrect) {
          correctCount += 1;
        } else {
          const opts = Array.isArray(q.options) ? q.options : [];
          const tSec = Array.isArray(timeToFirstAnswerSec) ? timeToFirstAnswerSec[idx] : null;
          const conf = Array.isArray(confidence) ? confidence[idx] : "low";
          mistakes.push({
            idx,
            question: q.question || q.text || "",
            options: opts,
            correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
            userIndex: typeof ua === "number" ? ua : null,
            explanation: q.explanation || "",
            timeSec: typeof tSec === "number" ? tSec : null,
            confident: conf === "high",
          });
        }
      });

      const score = totalCount > 0 ? correctCount / totalCount : 0;
      const scorePercent = Math.round(score * 100);

      setResult({ correctCount, totalCount, scorePercent });

      const finalTopic =
        topic?.trim() || questions?.[0]?.topicTitle || "Тема без названия";

      // агрегаты по ошибкам
      const avgTime =
        mistakes.filter((m) => typeof m.timeSec === "number").reduce((s, m) => s + m.timeSec, 0) /
        Math.max(1, mistakes.filter((m) => typeof m.timeSec === "number").length);
      const confidentWrong = mistakes.filter((m) => m.confident).length;

      const _mistakesSummary = {
        wrongCount: mistakes.length,
        avgTimeSec: Number.isFinite(avgTime) ? +avgTime.toFixed(1) : null,
        confidentWrongCount: confidentWrong,
      };

      // обновляем карту знаний
      const kmRes = updateKnowledgeFromTest({
        subject: context.subject,
        level: context.level,
        topic: finalTopic,
        correctCount,
        totalCount,
      });

      // обновляем статистику ошибок
      updateMistakeStats({
        subject: context.subject,
        level: context.level,
        topic: finalTopic,
        mistakes,
      });

      // пишем историю тестов
      const hRes = pushTestHistory({
        subject: context.subject,
        level: context.level,
        topic: finalTopic,
        score: clamp01(score),
        durationMs,
        startedAt: typeof testShownAtMs === "number" ? new Date(testShownAtMs).toISOString() : null,
        firstActionAt: typeof firstActionAtRef.current === "number" ? new Date(firstActionAtRef.current).toISOString() : null,
        finishedAt: new Date(finishedAtMs).toISOString(),
        correctCount,
        totalCount,
        mistakesSummary: _mistakesSummary,
      });

      setSaveInfo({
        ts: new Date().toISOString(),
        historyOk: hRes?.ok === true,
        historyCount: hRes?.count || 0,
        historyError: hRes?.error || null,
        kmOk: kmRes?.ok === true,
        kmError: kmRes?.error || null,
      });

      if (!(hRes?.ok === true)) {
        setError(`Не удалось сохранить историю теста: ${hRes?.error || "unknown"}`);
      } else if (!(kmRes?.ok === true)) {
        setError(`История сохранена, но прогресс не обновился: ${kmRes?.error || "unknown"}`);
      }

      // обновим блок истории тестов на странице
      setHistoryTick((t) => t + 1);
      try { loadTestHistory(); } catch (_) {}
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
                    Можно оставить пустым — NOOLIX возьмёт самую слабую тему из прогресса. Если прогресса ещё нет — введи тему.
                  </p>
                </div>

                <div className="flex gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => { setTopic(""); resetSession(); }}
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
                                    markFirstAction();
                                    setTimeToFirstAnswerSec((prev) => {
                                    const next = Array.isArray(prev) ? [...prev] : [];
                                    if (next[idx] === null || typeof next[idx] !== "number") {
                                      const shown = Array.isArray(questionShownAt) ? questionShownAt[idx] : null;
                                      if (typeof shown === "number") {
                                        const sec = (Date.now() - shown) / 1000;
                                        next[idx] = +sec.toFixed(1);
                                      } else {
                                        next[idx] = null;
                                      }
                                    }
                                    return next;
                                  });
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

                      <div className="pt-1">
                        <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                          Уверенность
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              markFirstAction();
                              setConfidence((prev) => {
                                const next = Array.isArray(prev) ? [...prev] : [];
                                next[idx] = "low";
                                return next;
                              });
                            }}
                            className={`px-3 py-2 rounded-full border text-[11px] transition
                              ${
                                confidence[idx] !== "high"
                                  ? "bg-white/15 border-white/20 text-purple-50"
                                  : "bg-black/30 border-white/20 text-purple-50 hover:bg-white/5"
                              }`}
                          >
                            Не уверен
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              markFirstAction();
                              setConfidence((prev) => {
                                const next = Array.isArray(prev) ? [...prev] : [];
                                next[idx] = "high";
                                return next;
                              });
                            }}
                            className={`px-3 py-2 rounded-full border text-[11px] transition
                              ${
                                confidence[idx] === "high"
                                  ? "bg-white text-black border-white shadow-md"
                                  : "bg-black/30 border-white/20 text-purple-50 hover:bg-white/5"
                              }`}
                          >
                            Уверен
                          </button>

                          <span className="text-[11px] text-purple-200/80 self-center">
                            {typeof timeToFirstAnswerSec[idx] === "number"
                              ? `время: ${timeToFirstAnswerSec[idx]}с`
                              : "время: —"}
                          </span>
                        </div>
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
                    {saveInfo ? (
                      <p className="text-[11px] text-purple-200/80">
                        Сохранение: история {saveInfo.historyOk ? "✓" : "✕"} (в памяти: {saveInfo.historyCount}) • прогресс {saveInfo.kmOk ? "✓" : "✕"}
                      </p>
                    ) : null}

                    {topRepeatedMistakes.length > 0 && (
                      <div className="mt-3 bg-black/20 border border-white/10 rounded-2xl p-3 space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                          Повторяющиеся ошибки
                        </p>
                        <div className="space-y-2">
                          {topRepeatedMistakes.map((m) => {
                            const repeats = m.count || 2;
                            const tag = classifyMistake({
                              timeSec: typeof m.avgTimeSec === "number" ? m.avgTimeSec : null,
                              confident: (m.confidentWrongCount || 0) >= 1,
                              repeats,
                            });
                            return (
                              <div
                                key={m.key}
                                className="bg-black/30 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">
                                    {m.topic || "Тема"}
                                  </p>
                                  <p className="text-[11px] text-purple-200/80">
                                    {tag} • повторов: {repeats}
                                    {typeof m.avgTimeSec === "number" ? ` • сред. время: ${m.avgTimeSec}s` : ""}
                                  </p>
                                </div>
                                <div className="flex gap-2 flex-wrap md:justify-end">
                                  <button
                                    type="button"
                                    onClick={() => generateFocusedTest([m.topic || topic?.trim() || "Базовые понятия"], 2)}
                                    className="px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                                  >
                                    Закрепить (2)
                                  </button>
                                  <a
                                    href={`/chat?topic=${encodeURIComponent(m.topic || "")}`}
                                    className="px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                                  >
                                    Разобрать в чате →
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}


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
                      
              {result && Array.isArray(questions) && Array.isArray(userAnswers) && questions.length > 0 ? (
                <div className="mt-4 bg-black/30 border border-white/10 rounded-3xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Твои ошибки</p>
                    <p className="text-[11px] text-purple-200/80">
                      Показаны только неверные ответы
                    </p>
                  </div>

                  <div className="mt-3 space-y-3">
                    {questions
                      .map((q, i) => ({ q, i }))
                      .filter(({ q, i }) => userAnswers[i] !== q.correctIndex)
                      .map(({ q, i }) => {
                        const userIdx = userAnswers[i];
                        const userText =
                          typeof userIdx === "number" && q.options?.[userIdx]
                            ? q.options[userIdx]
                            : "—";
                        const correctText =
                          typeof q.correctIndex === "number" && q.options?.[q.correctIndex]
                            ? q.options[q.correctIndex]
                            : "—";
                        const topicTitle = q.topicTitle || (parseTopicsInput(topic)[0] || "");
                        const chatHref = `/chat?topic=${encodeURIComponent(topicTitle || "Разбор ошибки")}&prefill=${encodeURIComponent(
                          `Разбери ошибку по вопросу: "${q.question}". Я ответил: "${userText}", правильный ответ: "${correctText}". Объясни и дай 1 похожий пример.`
                        )}`;

                        return (
                          <div key={i} className="bg-black/30 border border-white/10 rounded-2xl p-3">
                            <p className="text-sm font-semibold">
                              {i + 1}. {q.question}
                            </p>
                            <div className="mt-2 grid md:grid-cols-2 gap-2">
                              <div className="text-[12px] text-purple-100/90">
                                <span className="text-purple-300/80">Твой ответ:</span>{" "}
                                {userText}
                              </div>
                              <div className="text-[12px] text-purple-100/90">
                                <span className="text-purple-300/80">Правильно:</span>{" "}
                                {correctText}
                              </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                              <a
                                href={chatHref}
                                className="inline-flex items-center justify-center px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                              >
                                Разобрать в диалоге →
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    {questions.filter((q, i) => userAnswers[i] !== q.correctIndex).length === 0 ? (
                      <p className="text-xs text-purple-200/80">
                        Ошибок нет — идеально.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

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
