// pages/goals.js

import { useEffect, useState } from "react";

const GOALS_STORAGE_KEY = "noolixGoals";

const SUBJECT_OPTIONS = [
  "Математика",
  "Физика",
  "Русский язык",
  "Английский язык",
  "Другой",
];

const GOAL_TYPES = [
  "Экзамен / тест",
  "Подтянуть оценку",
  "Привычка",
  "Проект",
];

function computeProgress(goal) {
  if (!goal.steps || goal.steps.length === 0) return 0;
  const doneCount = goal.steps.filter((s) => s.done).length;
  return doneCount / goal.steps.length;
}

function formatDate(dateStr) {
  if (!dateStr) return "Без дедлайна";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Без дедлайна";
  return d.toLocaleDateString("ru-RU");
}

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // форма для новой цели
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Математика");
  const [newType, setNewType] = useState("Экзамен / тест");
  const [newDeadline, setNewDeadline] = useState("");
  const [newMetric, setNewMetric] = useState("");
  const [newWeeklyHours, setNewWeeklyHours] = useState("");

  const [error, setError] = useState("");

  // локальное поле для нового шага по конкретной цели
  const [stepInputs, setStepInputs] = useState({});

  // ---- Загрузка / сохранение целей ----
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(GOALS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setGoals(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load goals", e);
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

  // ---- Работа с целями ----
  const handleAddGoal = () => {
    setError("");

    const title = newTitle.trim();
    const metric = newMetric.trim();

    if (!title) {
      setError("Дай цели понятное название.");
      return;
    }

    const goal = {
      id: Date.now(),
      title,
      subject: newSubject,
      type: newType,
      deadline: newDeadline || null,
      metric: metric || null,
      weeklyHours: newWeeklyHours ? Number(newWeeklyHours) : null,
      createdAt: new Date().toISOString(),
      steps: [],
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
        const steps = Array.isArray(g.steps) ? g.steps.slice() : [];
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

  // ---- Разделение: активные / завершённые ----
  const activeGoals = goals.filter((g) => computeProgress(g) < 1);
  const completedGoals = goals.filter((g) => computeProgress(g) >= 1);

  // ---- Фокус на сегодня: первые несколько невыполненных шагов из активных целей ----
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
          <p className="text-xs text-purple-100/80">
            Загружаем твои цели…
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
    <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white">
      {/* Верхняя панель / логотип */}
      <header className="px-4 md:px-10 py-4 flex items-center justify-between border-b border-white/10">
        <div>
          <div className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
            NOOLIX
          </div>
          <p className="text-[11px] md:text-xs text-purple-200/80 mt-1">
            Цели и фокус — чтобы учёба двигалась вперёд, а не висела в воздухе.
          </p>
        </div>
        <div className="hidden md:flex gap-2 text-xs text-purple-100/80">
          <a href="/" className="hover:underline">
            Главная
          </a>
          <span>•</span>
          <a href="/progress" className="hover:underline">
            Прогресс
          </a>
          <span>•</span>
          <span className="text-purple-50 font-semibold">Цели</span>
        </div>
      </header>

      {/* Контент */}
      <main className="px-4 md:px-10 py-6 md:py-10 flex justify-center">
        <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          {/* Левая колонка: Фокус на сегодня + создание цели */}
          <aside className="space-y-4">
            {/* Фокус на сегодня */}
            <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                Фокус на сегодня
              </p>
              {todayFocusSteps.length === 0 ? (
                <p className="text-xs text-purple-100/80">
                  Пока нет конкретных шагов на сегодня. Добавь шаги к целям
                  или поставь новую цель — и здесь появятся задачи.
                </p>
              ) : (
                <ul className="space-y-2 text-xs text-purple-50">
                  {todayFocusSteps.map((item) => (
                    <li
                      key={item.stepId}
                      className="bg-black/60 border border-white/10 rounded-xl px-3 py-2"
                    >
                      <p className="font-semibold">{item.text}</p>
                      <p className="text-[10px] text-purple-200/80">
                        Цель: {item.goalTitle}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Создание цели */}
            <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Новая цель
              </p>

              <div className="space-y-2 text-xs md:text-sm">
                <div className="space-y-1">
                  <p className="text-[11px] text-purple-200/90">
                    Название цели
                  </p>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300 text-xs md:text-sm"
                    placeholder='Например: «Сдать профильную математику на 80+»'
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[11px] text-purple-200/90">
                      Предмет
                    </p>
                    <select
                      className="w-full px-2 py-2 rounded-xl bg-black/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                    >
                      {SUBJECT_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] text-purple-200/90">
                      Тип цели
                    </p>
                    <select
                      className="w-full px-2 py-2 rounded-xl bg-black/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                    >
                      {GOAL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[11px] text-purple-200/90">
                      Дедлайн (по желанию)
                    </p>
                    <input
                      type="date"
                      className="w-full px-2 py-2 rounded-xl bg-black/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300 text-xs"
                      value={newDeadline || ""}
                      onChange={(e) => setNewDeadline(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] text-purple-200/90">
                      Часов в неделю (по желанию)
                    </p>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-2 py-2 rounded-xl bg-black/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300 text-xs"
                      placeholder="Например: 5"
                      value={newWeeklyHours}
                      onChange={(e) => setNewWeeklyHours(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-purple-200/90">
                    Критерий успеха
                  </p>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300 text-xs md:text-sm"
                    placeholder='Например: «решаю 80% задач ЕГЭ уровня C», «стабильная 4+ по четверти»'
                    value={newMetric}
                    onChange={(e) => setNewMetric(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-[11px] text-red-300 mt-1">{error}</p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddGoal}
                  className="px-4 py-2 rounded-full bg.white text-black text-xs font-semibold shadow-md hover:bg-purple-100 transition"
                >
                  Добавить цель
                </button>
              </div>
            </section>
          </aside>

          {/* Правая колонка: список целей */}
          <section className="space-y-4">
            <header className="border-b border-white/10 pb-3 space-y-1">
              <h1 className="text-sm md:text-base font-semibold">
                Твои учебные цели
              </h1>
              <p className="text-[11px] md:text-xs text-purple-200/90">
                Разбей крупные задачи на маленькие шаги — NOOLIX поможет
                держать фокус и постепенно закрывать каждую цель.
              </p>
            </header>

            {/* Активные цели */}
            <section className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Активные цели
              </p>

              {activeGoals.length === 0 ? (
                <p className="text-xs text-purple-100/80">
                  Пока нет активных целей. Добавь цель слева — и она появится
                  здесь.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeGoals.map((goal) => {
                    const progress = computeProgress(goal);
                    const percent = Math.round(progress * 100);
                    return (
                      <div
                        key={goal.id}
                        className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3"
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
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-[10px] text-purple-200/70 hover:text-red-300"
                          >
                            Удалить
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-purple-200/90">
                            <span>Прогресс</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-black/60 border border-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-300 to-purple-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[11px] text-purple-200/90">
                            Шаги к цели
                          </p>
                          {(!goal.steps || goal.steps.length === 0) && (
                            <p className="text-[11px] text-purple-200/80">
                              Пока нет шагов. Добавь первый шаг — и цель станет
                              более конкретной.
                            </p>
                          )}
                          {goal.steps && goal.steps.length > 0 && (
                            <ul className="space-y-1 text-xs">
                              {goal.steps.map((step) => (
                                <li
                                  key={step.id}
                                  className="flex items-center justify-between.gap-2 text-purple-50"
                                >
                                  <label className="flex items-center gap-2.flex-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={step.done}
                                      onChange={() =>
                                        handleToggleStep(goal.id, step.id)
                                      }
                                      className="h-3 w-3 rounded border border-white/40 bg-black/60"
                                    />
                                    <span
                                      className={
                                        step.done
                                          ? "line-through.opacity-60"
                                          : ""
                                      }
                                    >
                                      {step.text}
                                    </span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteStep(goal.id, step.id)
                                    }
                                    className="text-[10px] text-purple-200/70 hover:text-red-300"
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              className="flex-1 px-2 py-1.5 rounded-xl bg-black/60 border border-white/20 focus:outline-none focus:ring-1 focus:ring-purple-300 text-[11px]"
                              placeholder="Добавить шаг (например: «пройти 1 вариант ЕГЭ»)"
                              value={stepInputs[goal.id] || ""}
                              onChange={(e) =>
                                handleChangeStepInput(goal.id, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddStep(goal.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddStep(goal.id)}
                              className="px-3 py-1 rounded-full bg-white text-black text-[11px] font-semibold.shadow-md hover:bg-purple-100 transition"
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
                  Когда ты полностью закроешь цель (выполнишь все шаги),
                  она появится здесь.
                </p>
              ) : (
                <div className="space-y-2">
                  {completedGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="bg-black/30 border border-white/10 rounded-2xl px-3 py-2.flex.items-center justify-between text-[11px] md:text-xs text-purple-100"
                    >
                      <div>
                        <p className="font-semibold">{goal.title}</p>
                        <p className="text-[10px] text-purple-200/80">
                          {goal.subject} • {goal.type} • завершено
                        </p>
                      </div>
                      <span className="text-[10px] text-green-300">
                        100%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>

      <footer className="bg-[#1A001F]/90 border-t border-white/10 text-center.py-3 text-xs text-purple-200">
        © 2025 NOOLIX — цели, прогресс и учёба в одном месте.
      </footer>
    </div>
  );
}
