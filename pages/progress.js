// pages/progress.js
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

function safeJsonParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function normalize(s) {
  return (s || "").toLowerCase().trim();
}

// Нормализация ключа темы:
// - не даём ключом стать целому сообщению/предложению
// - режем слишком длинные/"текстовые" ключи до "Общее"
function normalizeTopicKey(t) {
  const raw = String(t || "").trim();
  if (!raw) return "Общее";
  const words = raw.split(/\s+/).filter(Boolean);
  const tooLong = raw.length > 60;
  const tooManyWords = words.length > 8;
  const hasSentenceMarks = /[\?\!\.]/.test(raw);
  if (tooLong || tooManyWords || hasSentenceMarks) return "Общее";
  return raw;
}

function clamp01(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function getBand(score) {
  const s = clamp01(score);
  if (s < 0.5) return "weak";
  if (s < 0.8) return "mid";
  return "strong";
}

function bandLabel(band) {
  switch (band) {
    case "weak":
      return "Слабые";
    case "mid":
      return "Средние";
    case "strong":
      return "Сильные";
    default:
      return "Все";
  }
}

function formatUpdatedAt(value) {
  if (!value) return "";
  // если уже человекочитаемо (например, "Вчера") — оставляем как есть
  if (typeof value === "string" && !value.includes("T")) return value;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ProgressPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [context, setContext] = useState({
    subject: "Математика",
    level: "10–11 класс",
    mode: "exam_prep",
  });

  const [knowledgeMap, setKnowledgeMap] = useState({});
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState("all"); // all | weak | mid | strong
  const [recentTests, setRecentTests] = useState([]);

  // init: context + knowledge map
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawCtx = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
      const parsedCtx = safeJsonParse(rawCtx, null);
      if (parsedCtx && typeof parsedCtx === "object") {
        setContext((prev) => ({ ...prev, ...parsedCtx }));
      }

      const rawKnowledge = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
      const parsedKnowledge = safeJsonParse(rawKnowledge, {});
      if (parsedKnowledge && typeof parsedKnowledge === "object") {
        const subject = (parsedCtx?.subject || "Математика").toString();
        const level = (parsedCtx?.level || "10–11 класс").toString();

        // Мягкая миграция legacy-формата: subject -> topic -> {score...}
        const migrated = { ...parsedKnowledge };
        Object.keys(migrated).forEach((subjKey) => {
          const subjVal = migrated[subjKey];
          if (!subjVal || typeof subjVal !== "object") return;

          const sampleVal = Object.values(subjVal)[0];
          const looksLegacy =
            sampleVal &&
            typeof sampleVal === "object" &&
            ("score" in sampleVal || "updatedAt" in sampleVal || "source" in sampleVal);

          if (looksLegacy) {
            const targetLevel = subjKey === subject ? level : level;
            migrated[subjKey] = { [targetLevel]: subjVal };
          }
        });

        setKnowledgeMap(migrated);
        window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(migrated));

        // Нормализация тем: если ключ похож на фразу/сообщение — сводим в "Общее"
        try {
          const subjObj = migrated?.[subject]?.[level];
          if (subjObj && typeof subjObj === "object") {
            let changed = false;
            const nextLvl = {};
            Object.entries(subjObj).forEach(([topic, data]) => {
              const k = normalizeTopicKey(topic);
              if (k !== topic) changed = true;
              const score = typeof data?.score === "number" ? data.score : 0;
              const prev = nextLvl[k];
              if (!prev) nextLvl[k] = { ...data, score };
              else {
                const prevScore = typeof prev.score === "number" ? prev.score : 0;
                nextLvl[k] = { ...prev, score: Math.min(prevScore, score) };
              }
            });
            if (changed) {
              migrated[subject][level] = nextLvl;
              window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(migrated));
            }
          }
        } catch (eNorm) {
          console.warn("Topic normalize failed", eNorm);
        }

      }
    } finally {
      setLoading(false);
    }
  }, []);

  // подтягиваем последние тесты по текущему предмету/уровню
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(TEST_HISTORY_KEY);
      const list = safeJsonParse(raw, []);
      const arr = Array.isArray(list) ? list : [];

      const filtered = arr.filter(
        (x) => x?.subject === context.subject && x?.level === context.level
      );

      setRecentTests(filtered.slice(0, 5));
    } catch (e) {
      console.warn("Failed to read tests history", e);
      setRecentTests([]);
    }
  }, [context.subject, context.level]);

  const applyContextChange = (nextCtx) => {
    setContext(nextCtx);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(nextCtx));
    }
  };

  const subjectTopics = useMemo(() => {
    const subj = knowledgeMap?.[context.subject];
    const lvl = subj?.[context.level];

    // legacy fallback: если нет level-слоя
    const legacySubj = subj && typeof subj === "object" ? subj : null;
    const sourceObj = lvl && typeof lvl === "object" ? lvl : legacySubj;

    if (!sourceObj || typeof sourceObj !== "object") return [];

    const arr = Object.entries(sourceObj).map(([topic, data]) => ({
      topic: (data?.label || data?.title || topic) || topic,
      score: clamp01(data?.score ?? 0),
      updatedAt: data?.updatedAt || null,
      source: data?.source || null,
      label: data?.label || null,
    }));
    arr.sort((a, b) => a.score - b.score);
    return arr;
  }, [knowledgeMap, context.subject, context.level]);

  const stats = useMemo(() => {
    const total = subjectTopics.length;
    let weak = 0;
    let mid = 0;
    let strong = 0;

    subjectTopics.forEach((t) => {
      const band = getBand(t.score);
      if (band === "weak") weak += 1;
      else if (band === "mid") mid += 1;
      else strong += 1;
    });

    const avg =
      total === 0
        ? 0
        : subjectTopics.reduce((sum, t) => sum + t.score, 0) / total;

    return {
      total,
      weak,
      mid,
      strong,
      avg: clamp01(avg),
    };
  }, [subjectTopics]);

  const weakTopics = useMemo(() => {
    return subjectTopics
      .filter((t) => getBand(t.score) === "weak")
      .slice(0, 8);
  }, [subjectTopics]);

  const filteredTopics = useMemo(() => {
    const q = normalize(search);
    const byBand =
      bandFilter === "all"
        ? subjectTopics
        : subjectTopics.filter((t) => getBand(t.score) === bandFilter);

    const bySearch = q
      ? byBand.filter((t) => normalize(t.topic).includes(q))
      : byBand;

    // сначала слабее (или выбранный фильтр), дальше по релевантности поиска не усложняем — MVP
    return bySearch;
  }, [subjectTopics, search, bandFilter]);

  const setTopicState = (topicKey, patch) => {
    if (typeof window === "undefined") return;
    const topic = (topicKey || "").trim();
    if (!topic) return;

    setKnowledgeMap((prev) => {
      const next = { ...(prev || {}) };
      const subject = context.subject;
      const level = context.level;

      if (!next[subject] || typeof next[subject] !== "object") next[subject] = {};
      if (!next[subject][level] || typeof next[subject][level] !== "object") {
        next[subject][level] = {};
      }

      const prevEntry = next[subject][level][topic] || {};
      next[subject][level][topic] = {
        ...prevEntry,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const hasAnyData = subjectTopics.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">Загружаем прогресс…</p>
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
                  ${item.key === "progress" ? "bg-white/15" : "hover:bg-white/5"}
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white
                    ${item.key === "progress" ? "ring-2 ring-purple-200" : ""}
                  `}
                >
                  {item.icon}
                </span>
                <span className={item.key === "progress" ? "font-semibold" : ""}>
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
            {/* header */}
            <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-purple-200/80 bg-white/5 px-3 py-1 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-300" />
                  <span>Карта знаний</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold">
                    Прогресс
                  </h1>
                  <p className="text-xs md:text-sm text-purple-200 mt-1 max-w-xl">
                    Здесь видно, какие темы уже сильные, а какие требуют внимания.
                    Темы, сохранённые из диалога, помечаются отдельно.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-[320px]">
                <div className="flex gap-2">
                  <select
                    className="flex-1 text-[11px] md:text-xs px-2 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    value={context.subject}
                    onChange={(e) =>
                      applyContextChange({ ...context, subject: e.target.value })
                    }
                  >
                    <option>Математика</option>
                    <option>Физика</option>
                    <option>Русский язык</option>
                    <option>Английский язык</option>
                  </select>

                  <select
                    className="flex-1 text-[11px] md:text-xs px-2 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    value={context.level}
                    onChange={(e) =>
                      applyContextChange({ ...context, level: e.target.value })
                    }
                  >
                    <option>7–9 класс</option>
                    <option>10–11 класс</option>
                    <option>1 курс вуза</option>
                  </select>
                </div>
              </div>
            </section>

            {/* stats */}
            <section className="grid md:grid-cols-4 gap-3">
              <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                <p className="text-[11px] text-purple-200/80">Всего тем</p>
                <p className="text-xl font-semibold mt-0.5">{stats.total}</p>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                <p className="text-[11px] text-purple-200/80">Слабые</p>
                <p className="text-xl font-semibold mt-0.5">{stats.weak}</p>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                <p className="text-[11px] text-purple-200/80">Средние</p>
                <p className="text-xl font-semibold mt-0.5">{stats.mid}</p>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-2xl p-3">
                <p className="text-[11px] text-purple-200/80">Сильные</p>
                <p className="text-xl font-semibold mt-0.5">{stats.strong}</p>
              </div>
            </section>

            {/* weak topics */}
            <section className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Слабые темы
              </p>

              {!hasAnyData ? (
                <div className="bg-black/30 border border-dashed border-purple-300/70 rounded-2xl p-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Пока нет данных
                  </p>
                  <p className="text-xs text-purple-100/85">
                    Прогресс заполняется, когда ты решаешь мини-тесты или
                    отмечаешь темы. Пока можно начать с диалога: попросить
                    объяснить тему и затем пройти мини-тест.
                  </p>
                  <a
                    href="/chat"
                    className="inline-flex items-center justify-center mt-1 px-3 py-1.5 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                  >
                    Начать с диалога →
                  </a>
                </div>
              ) : weakTopics.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  Слабых тем по этому предмету пока нет — отлично. Можно
                  закреплять темы через мини-тесты.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {weakTopics.map((t) => (
                    <a
                      key={t.topic}
                      href={`/chat?topic=${encodeURIComponent(t.topic)}`}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-purple-300/60 text-[11px] md:text-xs text-purple-50 hover:bg-white/10 transition"
                    >
                      {t.topic} · {Math.round(t.score * 100)}%
                    </a>
                  ))}
                </div>
              )}
            </section>

            
            {/* recommendations */}
            <section className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Рекомендации
              </p>

              {subjectTopics.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  Пока рекомендаций нет: пройди мини-тест или сохрани объяснение в диалоге.
                </p>
              ) : (
                <div className="space-y-2">
                  {subjectTopics
                    .slice()
                    .sort((a, b) => a.score - b.score)
                    .slice(0, 3)
                    .map((t) => (
                      <div
                        key={t.topic}
                        className="bg-black/30 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{t.topic}</p>
                          <p className="text-[11px] text-purple-200/80">
                            Сейчас: {Math.round(t.score * 100)}%
                          </p>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <a
                            href={`/chat?topic=${encodeURIComponent(t.topic)}`}
                            className="inline-flex items-center justify-center px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                          >
                            Разобрать →
                          </a>
                          <button
                            onClick={() =>
                              setTopicState(t.topic, {
                                score: 1,
                                label: "Изучено",
                                source: "manual",
                              })
                            }
                            className="inline-flex items-center justify-center px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                          >
                            Изучено ✓
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

{/* filters */}
            <section className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 w-full md:w-[360px]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по темам…"
                  className="w-full text-xs md:text-sm px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-purple-300/70"
                />
              </div>

              <div className="flex gap-2">
                {["all", "weak", "mid", "strong"].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBandFilter(b)}
                    className={`px-3 py-2 rounded-full text-[11px] transition border
                      ${
                        bandFilter === b
                          ? "bg-white text-black border-white shadow-md"
                          : "bg-black/30 text-purple-50 border-white/15 hover:bg-white/5"
                      }`}
                  >
                    {b === "all" ? "Все" : bandLabel(b)}
                  </button>
                ))}
              </div>
            </section>

            {/* topics list */}
            <section className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Темы по предмету
              </p>

              {filteredTopics.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  По текущим фильтрам ничего не найдено.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredTopics.map((t) => {
                    const percent = Math.round(t.score * 100);
                    const band = getBand(t.score);
                    const badge =
                      band === "weak"
                        ? "Слабая"
                        : band === "mid"
                        ? "Средняя"
                        : "Сильная";

                    return (
                      <div
                        key={t.topic}
                        className="bg-black/30 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">
                              {t.topic}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-purple-100/90">
                              {badge}
                            </span>

                            {t.source === "dialog_saved" && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-300/15 border border-emerald-300/40 text-emerald-200/90">
                                из диалога
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-purple-200/80 mt-0.5">
                            Уровень: {percent}%
                            {t.updatedAt
                              ? ` · обновлено: ${formatUpdatedAt(t.updatedAt)}`
                              : ""}
                          </p>

                          <div className="mt-2 h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-300 to-purple-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <a
                            href={`/chat?topic=${encodeURIComponent(t.topic)}`}
                            className="inline-flex items-center justify-center px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                          >
                            Разобрать →
                          </a>
                          <a
                            href="/tests"
                            className="inline-flex items-center justify-center px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                          >
                            Мини-тест
                          </a>
                          <button
                            onClick={() =>
                              setTopicState(t.topic, {
                                score: 1,
                                label: "Изучено",
                                source: "manual",
                              })
                            }
                            className="inline-flex items-center justify-center px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                          >
                            Изучено ✓
                          </button>
                          <button
                            onClick={() =>
                              setTopicState(t.topic, {
                                score: 0,
                                label: null,
                                source: "manual_reset",
                              })
                            }
                            className="inline-flex items-center justify-center px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                          >
                            Сброс
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* recent tests (если есть) */}
            {recentTests.length > 0 && (
              <section className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Последние тесты
                </p>
                <div className="space-y-2">
                  {recentTests.map((t, idx) => (
                    <div
                      key={t?.id || idx}
                      className="bg-black/30 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {t?.title || "Тест"}
                        </p>
                        <p className="text-[11px] text-purple-200/80">
                          {t?.subject} • {t?.level}
                          {t?.createdAt
                            ? ` · ${formatUpdatedAt(t.createdAt)}`
                            : ""}
                        </p>
                      </div>
                      <a
                        href="/tests"
                        className="inline-flex items-center justify-center px-3 py-2 rounded-full bg-white/10 border border-white/15 text-[11px] text-purple-50 hover:bg-white/15 transition"
                      >
                        Открыть тесты →
                      </a>
                    </div>
                  ))}
                </div>
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
