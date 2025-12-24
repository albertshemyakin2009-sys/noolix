// pages/goals.js

import React, { useEffect, useState } from "react";
const GOALS_STORAGE_KEY = "noolixGoals";
const KNOWLEDGE_STORAGE_KEY = "noolixKnowledgeMap";

const SUBJECT_OPTIONS = [
  "Математика",
  "Физика",
  "Русский язык",
  "Английский язык",
];

const TYPE_OPTIONS = ["Экзамен / тест", "Домашка", "Проект", "Свой вариант"];


function SmartNextSteps() {
  const [isClient, setIsClient] = useState(false);
  const [ctx, setCtx] = useState({ subject: SUBJECT_OPTIONS[0], level: "Без уровня" });
  const [weakTopics, setWeakTopics] = useState([]);
  const [repeatedMistakes, setRepeatedMistakes] = useState([]);
  const [plan, setPlan] = useState({ topic: "", steps: [] });
  const [signal, setSignal] = useState(null); // { title, text, ctas: [{label, href}] }
  const [planModal, setPlanModal] = useState(null); // { topic, text, ctas: [{label, href}] }

  const openPlanModal = (topic) => {
    const variants = [
      {
        title: "План на 10 минут",
        text:
          "Давай начнём с мини‑теста на 2 вопроса. Он быстро покажет, что уже уверенно, а что стоит закрепить.",
      },
      {
        title: "План на 10 минут",
        text:
          "Сначала — быстрая проверка. Потом разберём один момент в диалоге и закрепим ещё раз.",
      },
      {
        title: "План на 10 минут",
        text:
          "Сделаем короткий цикл: тест → разбор → тест. Так прогресс растёт быстрее всего.",
      },
    ];
    const pick = variants[Math.floor(Math.random() * variants.length)];
    setPlanModal({
      topic: topic || "",
      title: pick.title,
      text: pick.text,
      ctas: [
        { label: "🧪 Мини‑тест (2)", href: topic ? `/tests?topic=${encodeURIComponent(topic)}&quick=2` : "/tests?quick=2" },
        { label: "💬 Разобрать", href: topic ? `/chat?topic=${encodeURIComponent(topic)}` : "/chat" },
      ],
    });
  };


  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsClient(true);

    try {
      // context
      const rawCtx = window.localStorage.getItem("noolixContext");
      let parsedCtx = null;
      if (rawCtx) {
        try {
          parsedCtx = JSON.parse(rawCtx);
        } catch {}
      }
      const subject =
        parsedCtx && parsedCtx.subject && SUBJECT_OPTIONS.includes(parsedCtx.subject)
          ? parsedCtx.subject
          : SUBJECT_OPTIONS[0];
      const level = parsedCtx && parsedCtx.level ? parsedCtx.level : "Без уровня";
      setCtx({ subject, level });

      // progress (knowledge map)
      const rawKM = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
      let km = {};
      if (rawKM) {
        try {
          km = JSON.parse(rawKM) || {};
        } catch {
          km = {};
        }
      }
      const byLvl = km?.[subject]?.[level];
      const weak =
        byLvl && typeof byLvl === "object"
          ? Object.entries(byLvl)
              .map(([topic, data]) => ({
                topic,
                score: typeof data?.score === "number" ? data.score : 0,
              }))
              .sort((a, b) => a.score - b.score)
              .slice(0, 3)
          : [];
      setWeakTopics(weak);

      // repeated mistakes
      const rawMS = window.localStorage.getItem("noolixMistakeStats");
      let ms = {};
      if (rawMS) {
        try {
          ms = JSON.parse(rawMS) || {};
        } catch {
          ms = {};
        }
      }
      const lvlObj = ms?.[subject]?.[level];
      const rep =
        lvlObj && typeof lvlObj === "object"
          ? Object.values(lvlObj)
              .filter((x) => x && typeof x === "object" && (x.count || 0) >= 2)
              .sort((a, b) => (b.count || 0) - (a.count || 0))
              .slice(0, 2)
          : [];
      setRepeatedMistakes(rep);

      // tests history (for "давно не было теста")
      const rawTH = window.localStorage.getItem("noolixTestHistory");
      let testHistory = [];
      if (rawTH) {
        try {
          const parsed = JSON.parse(rawTH);
          testHistory = Array.isArray(parsed) ? parsed : [];
        } catch {
          testHistory = [];
        }
      }
      const historyCtx = testHistory.filter(
        (x) => x?.subject === subject && x?.level === level
      );
      const lastTestTsInCtx =
        historyCtx.length > 0
          ? historyCtx
              .map((x) => x?.ts)
              .filter(Boolean)
              .sort()
              .slice(-1)[0] || null
          : null;

      const daysSinceLastTest = lastTestTsInCtx
        ? Math.floor(
            (Date.now() - new Date(lastTestTsInCtx).getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      // "объяснения" считаем по карте знаний (source: dialog_saved / dialog)
      const explanationsSaved = byLvl && typeof byLvl === "object"
        ? Object.values(byLvl).filter((d) => d && (d.source === "dialog_saved" || d.source === "dialog")).length
        : 0;

      const lowData = (historyCtx.length === 0) && explanationsSaved === 0 && weak.length === 0 && rep.length === 0;
      const staleTests = historyCtx.length > 0 && daysSinceLastTest !== null && daysSinceLastTest >= 7;

      const t = weak[0]?.topic || rep[0]?.topic || "";
      setPlan({
        topic: t,
        steps: [
          {
            title: "Закрепить (2 вопроса)",
            action: t ? `/tests?topic=${encodeURIComponent(t)}&quick=2` : "/tests",
          },
          {
            title: "Разобрать в диалоге",
            action: t ? `/chat?topic=${encodeURIComponent(t)}` : "/chat",
          },
          {
            title: "Мини‑тест по теме",
            action: t ? `/tests?topic=${encodeURIComponent(t)}` : "/tests",
          },
        ],
      });


      // v2: signal (why this recommendation)
      if (lowData) {
        setSignal({
          title: "С чего начать",
          text: "Данных пока мало. Сделай мини‑тест или сохрани объяснение — и Noolix начнёт подбирать темы точнее.",
          ctas: [
            { label: "🧪 Мини‑тест", href: "/tests?quick=2" },
            { label: "💬 Диалог", href: "/chat" },
          ],
        });
      } else if (rep.length > 0) {
        const top = rep[0];
        setSignal({
          title: "Повторяющиеся ошибки",
          text: `Тема «${top.topic || "тема"}» ошибается часто — лучше закрепить её коротким тестом и разбором.`,
          ctas: [
            { label: "Закрепить (2)", href: `/tests?topic=${encodeURIComponent(top.topic || "")}&quick=2` },
            { label: "Разобрать", href: `/chat?topic=${encodeURIComponent(top.topic || "")}` },
          ],
        });
      } else if (weak.length > 0) {
        const top = weak[0];
        setSignal({
          title: "Слабое место",
          text: `Низкий прогресс по теме «${top.topic}». 10 минут практики дадут быстрый эффект.`,
          ctas: [
            { label: "План на 10 минут", kind: "plan", topic: top.topic },
            { label: "Разобрать", href: `/chat?topic=${encodeURIComponent(top.topic)}` },
          ],
        });
      } else if (staleTests) {
        setSignal({
          title: "Давно не было теста",
          text: daysSinceLastTest === null ? "Сделай быструю проверку, чтобы обновить прогресс." : `Прошло ${daysSinceLastTest} дн. с последнего теста — быстрая проверка освежит знания.`,
          ctas: [{ label: "🧪 Быстрый тест (2)", href: "/tests?quick=2" }],
        });
      } else {
        setSignal(null);
      }

    } catch (e) {
      console.warn("SmartNextSteps failed", e);
    }
  }, []);

  if (!isClient) return null;

  return (
    <section className="relative bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3 ring-1 ring-purple-400/25">
<div className="absolute -top-3 left-4">
  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-[11px] text-purple-100">
    ✨ Рекомендовано
  </span>
</div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
            Что делать дальше
          </p>
          <p className="text-xs text-purple-100/80">
            На основе прогресса и ошибок для: {ctx.subject} • {ctx.level}
          </p>
        </div>
      
      {signal ? (
        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{signal.title}</p>
              <p className="text-xs text-purple-200/80 mt-1">{signal.text}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {(signal.ctas || []).map((c) =>
                c.kind === "plan" ? (
                  <button
                    key={(c.topic || "") + c.label}
                    type="button"
                    onClick={() => openPlanModal(c.topic)}
                    className="px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                  >
                    {c.label}
                  </button>
                ) : (
                  <a
                    key={(c.href || "") + c.label}
                    href={c.href}
                    className="px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                  >
                    {c.label}
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      ) : null}

</div>

      {weakTopics.length === 0 && repeatedMistakes.length === 0 ? (
        <p className="text-xs text-purple-100/80">
          Пока данных мало. Пройди мини‑тест или сохрани объяснение в диалоге — и здесь появятся подсказки.
        </p>
      ) : (
        <div className="space-y-3">
          {weakTopics.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Сейчас важно подтянуть
              </p>
              {weakTopics.map((t) => {
              const topicTitle = String(t?.topic || "").trim();
              if (!topicTitle) return null;
              const scorePct = Number.isFinite(t?.score) ? Math.round(t.score * 100) : 0;
              return (
                <div
                  key={topicTitle}
                  className="bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{topicTitle}</p>
                    <p className="text-[11px] text-purple-200/80">
                      прогресс: {scorePct}%
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap md:justify-end flex-shrink-0">
                    <a
                      href={`/chat?topic=${encodeURIComponent(topicTitle)}`}
                      className="px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                    >
                      Разобрать →
                    </a>
                    <a
                      href={`/tests?topic=${encodeURIComponent(topicTitle)}&quick=2`}
                      className="px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition"
                    >
                      Закрепить (2)
                    </a>
                  </div>
                </div>
              );
            })}
            </div>
          )}

          {repeatedMistakes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Повторяющиеся ошибки
              </p>
              {repeatedMistakes.map((m) => (
                <div
                  key={m.key || `${m.topic}_${m.count}`}
                  className="bg-black/40 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{m.topic || "Тема"}</p>
                    <p className="text-[11px] text-purple-200/80">
                      повторов: {m.count || 2}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <a
                      href={`/tests?topic=${encodeURIComponent(m.topic || "")}&quick=2`}
                      className="px-3 py-2 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                    >
                      Закрепить →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {plan.topic ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                План на 10 минут
              </p>
              <div className="space-y-2">
                {plan.steps.map((s, i) =>
                  i === 0 ? (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => openPlanModal(plan.topic)}
                      className="w-full text-left block bg-black/40 border border-white/10 rounded-2xl p-3 hover:bg-white/5 transition"
                    >
                      <p className="text-sm font-semibold">
                        {i + 1}. {s.title}
                      </p>
                      <p className="text-[11px] text-purple-200/80">Тема: {plan.topic}</p>
                      <p className="text-[11px] text-purple-200/60 mt-1">Откроется мини‑план</p>
                    </button>
                  ) : (
                    <a
                      key={s.title}
                      href={s.action}
                      className="block bg-black/40 border border-white/10 rounded-2xl p-3 hover:bg-white/5 transition"
                    >
                      <p className="text-sm font-semibold">
                        {i + 1}. {s.title}
                      </p>
                      <p className="text-[11px] text-purple-200/80">Тема: {plan.topic}</p>
                    </a>
                  )
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {planModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPlanModal(null)}
            aria-label="Закрыть"
          />
          <div className="relative w-full max-w-lg">
            <div className="bg-[#0b0b12] border border-white/10 rounded-2xl p-5 shadow-2xl animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    {planModal.title}
                  </p>
                  <p className="text-lg font-semibold mt-1">
                    {planModal.topic ? planModal.topic : "Быстрый старт"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPlanModal(null)}
                  className="px-3 py-2 rounded-full border border-white/15 bg-black/20 text-[11px] text-purple-50 hover:bg-white/5 transition"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-purple-100/80 mt-3">
                {planModal.text}
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {(planModal.ctas || []).map((c) => (
                  <a
                    key={c.href + c.label}
                    href={c.href}
                    className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-md hover:bg-purple-100 transition"
                  >
                    {c.label}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => setPlanModal(null)}
                  className="px-4 py-2 rounded-full border border-white/20 bg-black/30 text-xs text-purple-50 hover:bg-white/5 transition"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}


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

function formatDate(dateStr) {
  if (!dateStr) return "без дедлайна";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "без дедлайна";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Очень грубая эвристика: риск перегруза
function isBurnoutRisk(goal) {
  if (!goal.deadline || !goal.weeklyHours || !goal.steps) return false;
  const stepsCount = goal.steps.length;
  const deadline = new Date(goal.deadline);
  if (Number.isNaN(deadline.getTime())) return false;

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 0) return false;

  // Очень грубо: много шагов, мало часов, мало времени
  if (diffDays < 30 && stepsCount >= 8 && goal.weeklyHours < 5) {
    return true;
  }
  return false;
}

// Простая генерация шагов по типу цели
function getDefaultStepsForGoal(subject, type) {
  const subj = subject || "предмет";
  if (type === "Экзамен / тест") {
    return [
      `Составить список тем по ${subj}, которые войдут в экзамен`,
      `Отметить слабые темы в карте знаний по ${subj}`,
      `Решать задачи по слабым темам 3 раза в неделю`,
      `Раз в неделю проходить мини-проверку по ключевым темам`,
    ];
  }
  if (type === "Домашка") {
    return [
      `Разобрать теорию по теме из домашки по ${subj}`,
      `Решить 3–5 похожих задач`,
      `Проверить себя: смогу ли объяснить решение другу`,
    ];
  }
  if (type === "Проект") {
    return [
      `Определить тему и цель проекта по ${subj}`,
      `Собрать материалы и источники`,
      `Сделать черновой план проекта`,
      `Показать план учителю или другу и получить фидбек`,
    ];
  }
  return [
    `Сформулировать, что значит успех по ${subj}`,
    `Выделить 2–3 ключевые навыка, которые нужно прокачать`,
    `Раз в неделю подводить итоги: что сделал(а) по цели`,
  ];
}

// Подсчёт прогресса по цели (по шагам)
function computeProgress(goal) {
  if (!goal.steps || goal.steps.length === 0) return 0;
  const doneCount = goal.steps.filter((s) => s.done).length;
  return doneCount / goal.steps.length;
}

export default function GoalsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Математика");
  const [newType, setNewType] = useState("Экзамен / тест");
  const [newDeadline, setNewDeadline] = useState("");
  const [newMetric, setNewMetric] = useState("");
  const [newWeeklyHours, setNewWeeklyHours] = useState("");

  const [error, setError] = useState("");
  const [stepInputs, setStepInputs] = useState({});

  const [knowledgeMap, setKnowledgeMap] = useState({});

  // ---- Загрузка контекста, карты знаний и целей ----
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const rawContext = window.localStorage.getItem("noolixContext");
      if (rawContext) {
        try {
          const ctx = JSON.parse(rawContext);
          if (ctx && ctx.subject && SUBJECT_OPTIONS.includes(ctx.subject)) {
            setNewSubject(ctx.subject);
          }
        } catch (e) {
          console.warn("Failed to parse noolixContext", e);
        }
      }

      const rawKnowledge = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
      if (rawKnowledge) {
        try {
          const km = JSON.parse(rawKnowledge);
          if (km && typeof km === "object") {
            setKnowledgeMap(km);
          }
        } catch (e) {
          console.warn("Failed to parse knowledge map", e);
        }
      }

      const rawGoals = window.localStorage.getItem(GOALS_STORAGE_KEY);
      if (rawGoals) {
        const parsed = JSON.parse(rawGoals);
        if (Array.isArray(parsed)) {
          setGoals(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load goals/context", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    } catch (e) {
      console.warn("Failed to save goals", e);
    }
  }, [goals]);

  // --- слабые темы по предмету из карты знаний ---
  const getWeakTopicsCount = (subject) => {
    const subjEntry = knowledgeMap[subject];
    if (!subjEntry) return null;
    let weakCount = 0;
    Object.values(subjEntry).forEach((t) => {
      if (typeof t.score === "number" && t.score < 0.8) {
        weakCount += 1;
      }
    });
    return weakCount;
  };

  // ---- Создание цели ----
  const handleCreateGoal = (e) => {
    e.preventDefault();
    setError("");

    const title = newTitle.trim();
    if (!title) {
      setError("Напиши формулировку цели — хотя бы в черновом виде.");
      return;
    }

    const metric = newMetric.trim();

    const defaultStepsTexts = getDefaultStepsForGoal(newSubject, newType);
    const steps = defaultStepsTexts.map((text) => ({
      id: Date.now() + Math.random(),
      text,
      done: false,
    }));

    const goal = {
      id: Date.now(),
      title,
      subject: newSubject,
      type: newType,
      deadline: newDeadline || null,
      metric: metric || null,
      weeklyHours: newWeeklyHours ? Number(newWeeklyHours) : null,
      createdAt: new Date().toISOString(),
      steps,
    };

    setGoals((prev) => [goal, ...prev]);

    setNewTitle("");
    setNewMetric("");
    setNewDeadline("");
    setNewWeeklyHours("");
  };

  const handleDeleteGoal = (goalId) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  // ---- Работа со шагами ----
  const handleChangeStepInput = (goalId, value) => {
    setStepInputs((prev) => ({
      ...prev,
      [goalId]: value,
    }));
  };

  const handleAddStep = (goalId) => {
    const text = (stepInputs[goalId] || "").trim();
    if (!text) return;

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const steps = Array.isArray(g.steps) ? [...g.steps] : [];
        steps.push({
          id: Date.now(),
          text,
          done: false,
        });
        return { ...g, steps };
      })
    );

    setStepInputs((prev) => ({
      ...prev,
      [goalId]: "",
    }));
  };

  const handleToggleStep = (goalId, stepId) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const steps = (g.steps || []).map((s) =>
          s.id === stepId ? { ...s, done: !s.done } : s
        );
        return { ...g, steps };
      })
    );
  };

  const handleDeleteStep = (goalId, stepId) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const steps = (g.steps || []).filter((s) => s.id !== stepId);
        return { ...g, steps };
      })
    );
  };

  // ---- Связка: цель → диалог ----
  const handleFocusGoalInChat = (goal) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "noolixCurrentGoal",
        JSON.stringify({
          id: goal.id,
          title: goal.title,
          subject: goal.subject,
          type: goal.type,
          metric: goal.metric,
        })
      );
    } catch (e) {
      console.warn("Failed to save noolixCurrentGoal", e);
    }
    window.location.href = "/chat";
  };

  // ---- Активные / завершённые ----
  const activeGoals = goals.filter((g) => computeProgress(g) < 1);
  const completedGoals = goals.filter((g) => computeProgress(g) >= 1);

  // ---- Фокус на сегодня ----
  const todayFocusSteps = [];
  activeGoals.forEach((g) => {
    (g.steps || []).forEach((s) => {
      if (!s.done && todayFocusSteps.length < 3) {
        todayFocusSteps.push({
          goalId: g.id,
          goalTitle: g.title,
          text: s.text,
          stepId: s.id,
        });
      }
    });
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">Загружаем твои цели…</p>
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
      {/* Оверлей для мобилки */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Кнопка открытия меню на мобильных */}
      <button
        className="absolute top-4 left-4 z-50 bg-white/95 text-black px-4 py-2 rounded shadow-md md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰ Меню
      </button>

      {/* Левое меню */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-60 md:w-64 p-6 space-y-6
        transform transition-transform.duration-300 z-40
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        bg-gradient-to-b from-black/40 via-[#2E003E]/85 to-transparent`}
      >
        <div className="mb-3">
          <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#FDF2FF] via-[#E5DEFF] to-white text-transparent bg-clip-text">
            NOOLIX
          </div>
          <p className="text-xs text-purple-200 mt-1 opacity-80">
            Твои учебные цели в одном месте
          </p>
        </div>

        <nav className="space-y-3 text-sm md:text-base">
          <div className="space-y-2">
            {primaryMenuItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition
                  ${item.key === "goals" ? "bg-white/15" : "hover:bg-white/5"}
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white
                    ${item.key === "goals" ? "ring-2 ring-purple-200" : ""}
                  `}
                >
                  {item.icon}
                </span>
                <span className={item.key === "goals" ? "font-semibold" : ""}>
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
                className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition
                  ${item.key === "goals" ? "bg-white/15" : "hover:bg-white/5"}
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white
                    ${item.key === "goals" ? "ring-2 ring-purple-200" : ""}
                  `}
                >
                  {item.icon}
                </span>
                <span className={item.key === "goals" ? "font-semibold" : ""}>
                  {item.label}
                </span>
              </a>
            ))}
          </div>
        </nav>
      </aside>

      {/* Контент */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
          <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {/* Левая колонка: фокус + создание цели */}
            <aside className="space-y-4">
              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Фокус на сегодня
                </p>
                {todayFocusSteps.length === 0 ? (
                  <p className="text-xs text-purple-100/80">
                    Пока нет конкретных шагов на сегодня. Отметь шаги в целях,
                    и мы подскажем, с чего начать.
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs text-purple-100">
                    {todayFocusSteps.map((item) => (
                      <li
                        key={item.stepId}
                        className="flex items-start gap-2 bg-black/40 border border-white/10 rounded-2xl p-2"
                      >
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-300" />
                        <div>
                          <p className="font-semibold mb-0.5">
                            {item.goalTitle}
                          </p>
                          <p className="text-[11px] text-purple-200/90">
                            {item.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>


              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Новая цель
                </p>
                <p className="text-[11px] text-purple-100">
                  Сформулируй одну конкретную цель — NOOLIX поможет связать её с
                  картой знаний и диалогом.
                </p>

                <form className="space-y-2 mt-2" onSubmit={handleCreateGoal}>
                  <div className="space-y-1">
                    <label className="text-[11px] text-purple-200">
                      Как звучит цель?
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Например: Подготовиться к пробнику по математике на 80+"
                      className="w-full rounded-2xl bg-black/60 border border-white/15 px-3 py-1.5 text-xs text-white placeholder:text-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-purple-200">
                        Предмет
                      </label>
                      <select
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="w-full rounded-2xl bg-black/60 border border-white/15 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                      >
                        {SUBJECT_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-purple-200">
                        Тип
                      </label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full rounded-2xl bg-black/60 border border-white/15 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-purple-200">
                        Дедлайн
                      </label>
                      <input
                        type="date"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                        className="w-full rounded-2xl bg-black/60 border border-white/15 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-purple-200">
                        Часов в неделю
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newWeeklyHours}
                        onChange={(e) => setNewWeeklyHours(e.target.value)}
                        placeholder="Напр. 4"
                        className="w-full rounded-2xl bg-black/60 border border-white/15 px-3 py-1.5 text-xs text-white placeholder:text-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-purple-200">
                      Как поймём, что цель достигнута?
                    </label>
                    <input
                      type="text"
                      value={newMetric}
                      onChange={(e) => setNewMetric(e.target.value)}
                      placeholder="Например: написать пробник на 80+ или закрыть все красные темы"
                      className="w-full rounded-2xl bg-black/60 border border-white/15 px-3 py-1.5 text-xs text-white placeholder:text-purple-200/60 focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                    />
                  </div>

                  {error && (
                    <p className="text-[11px] text-red-300/90">{error}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full mt-1 rounded-2xl bg-white text-black text-xs font-semibold py-1.5 shadow-md hover:bg-purple-100 transition"
                  >
                    Сохранить цель
                  </button>
                </form>
              </section>
            </aside>

            {/* Правая колонка — список целей */}
            <section className="flex flex-col gap-4">

              <SmartNextSteps />

              {/* Активные цели */}
              <section className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Активные цели
                </p>

                {activeGoals.length === 0 ? (
                  <p className="text-xs text-purple-100/80">
                    Пока нет активных целей. Добавь цель слева — и она
                    появится здесь.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeGoals.map((goal) => {
                      const progress = computeProgress(goal);
                      const percent = Math.round(progress * 100);
                      const weakCount = getWeakTopicsCount(goal.subject);
                      const burnout = isBurnoutRisk(goal);

                      return (
                        <div
                          key={goal.id}
                          className="bg-black/35 border border-white/10 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs md:text-sm font-semibold">
                                {goal.title}
                              </p>
                              <p className="text-[11px] text-purple-200/80 mt-0.5">
                                {goal.subject} • {goal.type}
                              </p>
                              <p className="text-[10px] text-purple-200/70 mt-0.5">
                                Дедлайн: {formatDate(goal.deadline)}{" "}
                                {goal.weeklyHours
                                  ? `• ~${goal.weeklyHours} ч/нед`
                                  : ""}
                              </p>
                              {goal.metric && (
                                <p className="text-[10px] text-purple-100/85 mt-0.5">
                                  Успех = {goal.metric}
                                </p>
                              )}
                              {weakCount !== null && (
                                <p className="text-[10px] text-purple-200/75 mt-0.5">
                                  Слабых тем по{" "}
                                  {goal.subject.toLowerCase()}: {weakCount}{" "}
                                  (
                                  <a
                                    href="/progress"
                                    className="underline underline-offset-2"
                                  >
                                    смотреть в карте знаний
                                  </a>
                                  )
                                </p>
                              )}
                              {burnout && (
                                <p className="text-[10px] text-orange-300 mt-1">
                                  Нагрузка выглядит высокой: много шагов,
                                  мало времени и часов в неделю. Подумай,
                                  не стоит ли уменьшить нагрузку или
                                  сдвинуть дедлайн.
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <button
                                type="button"
                                onClick={() =>
                                  handleFocusGoalInChat(goal)
                                }
                                className="text-[10px] px-3 py-1 rounded-full bg-white text-black font-semibold shadow-md hover:bg-purple-100 transition"
                              >
                                Учиться по цели в диалоге
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteGoal(goal.id)
                                }
                                className="text-[10px] px-3 py-1 rounded-full bg-black/60 border border-white/20 text-purple-100 hover:bg-black/80 transition"
                              >
                                Удалить цель
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-purple-200/80">
                              <span>Прогресс по шагам</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-300 via-purple-400 to-purple-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[11px] text-purple-200/90">
                              Шаги по цели
                            </p>
                            <div className="space-y-1.5">
                              {(goal.steps || []).map((step) => (
                                <div
                                  key={step.id}
                                  className="flex items-start gap-2 text-[11px]"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleStep(goal.id, step.id)
                                    }
                                    className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
                                      step.done
                                        ? "bg-purple-400 border-purple-200"
                                        : "bg-black/60 border-white/30"
                                    }`}
                                  >
                                    {step.done && (
                                      <span className="text-[10px] text-black">
                                        ✓
                                      </span>
                                    )}
                                  </button>
                                  <span
                                    className={`flex-1 ${
                                      step.done
                                        ? "line-through text-purple-300/80"
                                        : "text-purple-100"
                                    }`}
                                  >
                                    {step.text}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteStep(goal.id, step.id)
                                    }
                                    className="text-[10px] text-purple-200/70 hover:text-red-300"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="text"
                                value={stepInputs[goal.id] || ""}
                                onChange={(e) =>
                                  handleChangeStepInput(
                                    goal.id,
                                    e.target.value
                                  )
                                }
                                placeholder="Добавить свой шаг…"
                                className="flex-1 rounded-2xl bg-black/60 border border-white/15 px-3 py-1 text-[11px] text-white placeholder:text-purple-200/60 focus:outline-none focus:ring-1 focus:ring-purple-300/70"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddStep(goal.id)}
                                className="text-[11px] px-3 py-1 rounded-2xl bg-white text-black font-semibold shadow hover:bg-purple-100 transition"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Завершённые цели */}
              <section className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Завершённые цели
                </p>
                {completedGoals.length === 0 ? (
                  <p className="text-xs text-purple-100/80">
                    Как только ты отметишь все шаги по цели, она появится здесь.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {completedGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className="bg-black/30 border border-white/10 rounded-2xl p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold">
                              {goal.title}
                            </p>
                            <p className="text-[10px] text-purple-200/80">
                              {goal.subject} • {goal.type}
                            </p>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/80 text-[10px] text-white">
                            Выполнено
                          </span>
                        </div>
                        <p className="text-[10px] text-purple-200/80">
                          Дедлайн: {formatDate(goal.deadline)} • Шагов:{" "}
                          {(goal.steps || []).length}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </section>
          </div>
        </main>

        <footer className="bg-[#1A001F]/90 border-t border-white/10 text-center py-3 text-xs text-purple-200">
          © 2025 NOOLIX — цели, прогресс и учёба в одном месте.
        </footer>
      </div>
    </div>
  );
}
