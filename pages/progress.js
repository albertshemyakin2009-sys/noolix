// pages/progress.js
import { useEffect, useState } from "react";

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

// Базовый список тем по предметам (MVP)
const TOPICS = {
  Математика: [
    {
      id: "math_quadratic",
      title: "Квадратные уравнения",
      area: "Алгебра",
      levelHint: "8–9 класс",
    },
    {
      id: "math_linear",
      title: "Линейные уравнения и системы",
      area: "Алгебра",
      levelHint: "7–8 класс",
    },
    {
      id: "math_derivative",
      title: "Производная и её смысл",
      area: "Математический анализ",
      levelHint: "10–11 класс",
    },
    {
      id: "math_trig",
      title: "Тригонометрические уравнения",
      area: "Алгебра",
      levelHint: "10–11 класс",
    },
  ],
  Физика: [
    {
      id: "phys_newton2",
      title: "Второй закон Ньютона",
      area: "Механика",
      levelHint: "9–10 класс",
    },
    {
      id: "phys_kinematics",
      title: "Равноускоренное движение",
      area: "Механика",
      levelHint: "9 класс",
    },
    {
      id: "phys_energy",
      title: "Работа и энергия",
      area: "Механика",
      levelHint: "9–10 класс",
    },
  ],
  "Русский язык": [
    {
      id: "rus_participles",
      title: "Причастные обороты",
      area: "Синтаксис",
      levelHint: "7–9 класс",
    },
    {
      id: "rus_spelling",
      title: "Правописание Н и НН",
      area: "Орфография",
      levelHint: "8–9 класс",
    },
    {
      id: "rus_essay",
      title: "Структура сочинения",
      area: "Письменная речь",
      levelHint: "9–11 класс",
    },
  ],
  "Английский язык": [
    {
      id: "eng_tenses",
      title: "Основные времена (Present/Past/Future)",
      area: "Грамматика",
      levelHint: "7–9 класс",
    },
    {
      id: "eng_perf",
      title: "Perfect-времена",
      area: "Грамматика",
      levelHint: "9–11 класс",
    },
    {
      id: "eng_vocab",
      title: "Учебный словарь по темам",
      area: "Лексика",
      levelHint: "7–11 класс",
    },
  ],
};

function getStatusFromScore(score) {
  if (typeof score !== "number") {
    return { label: "Не отмечено", color: "text-purple-200/80" };
  }
  if (score < 0.4) {
    return { label: "Сложно / не начато", color: "text-red-300" };
  }
  if (score < 0.7) {
    return { label: "Нужна практика", color: "text-orange-300" };
  }
  if (score < 0.9) {
    return { label: "Хороший уровень", color: "text-emerald-300" };
  }
  return { label: "Уверенно", color: "text-emerald-400 font-semibold" };
}

function getScoreForMark(mark) {
  switch (mark) {
    case "weak":
      return 0.3;
    case "medium":
      return 0.65;
    case "strong":
      return 0.95;
    default:
      return 0;
  }
}

export default function ProgressPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subject, setSubject] = useState("Математика");
  const [knowledgeMap, setKnowledgeMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Инициализация: контекст + карта знаний
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const rawContext = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
      if (rawContext) {
        try {
          const ctx = JSON.parse(rawContext);
          if (ctx.subject && TOPICS[ctx.subject]) {
            setSubject(ctx.subject);
          }
        } catch (e) {
          console.warn("Failed to parse context in progress", e);
        }
      }

      const rawKnowledge = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
      if (rawKnowledge) {
        try {
          const map = JSON.parse(rawKnowledge);
          if (map && typeof map === "object") {
            setKnowledgeMap(map);
          }
        } catch (e) {
          console.warn("Failed to parse knowledge map", e);
        }
      }
    } catch (e) {
      console.warn("Failed to init progress page", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Сохраняем карту знаний
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(
        KNOWLEDGE_STORAGE_KEY,
        JSON.stringify(knowledgeMap)
      );
    } catch (e) {
      console.warn("Failed to save knowledge map", e);
    }
  }, [knowledgeMap]);

  const subjectTopics = TOPICS[subject] || [];
  const subjectMap = knowledgeMap[subject] || {};

  const handleMarkTopic = (topicId, mark) => {
    setKnowledgeMap((prev) => {
      const prevForSubject = prev[subject] || {};
      const score = getScoreForMark(mark);
      return {
        ...prev,
        [subject]: {
          ...prevForSubject,
          [topicId]: {
            score,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  };

  const totalTopics = subjectTopics.length;
  let mastered = 0;
  let weak = 0;
  let inProgress = 0;

  subjectTopics.forEach((t) => {
    const entry = subjectMap[t.id];
    if (!entry || typeof entry.score !== "number") return;
    if (entry.score < 0.4) weak += 1;
    else if (entry.score < 0.7) inProgress += 1;
    else mastered += 1;
  });

  const hasAnyRated = Object.keys(subjectMap).length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">
            Загружаем твою карту знаний…
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
      {/* Оверлей для мобилки */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Кнопка меню на мобилке */}
      <button
        className="absolute top-4 left-4 z-50 bg-white/95 text-black px-4 py-2 rounded shadow-md md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰ Меню
      </button>

      {/* Левое меню (как на главной, активен Прогресс) */}
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
            Карта знаний по предметам
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
                    item.key === "progress"
                      ? "bg-white/15"
                      : "hover:bg-white/5"
                  }
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white
                    ${item.key === "progress" ? "ring-2 ring-purple-200" : ""}
                  `}
                >
                  {item.icon}
                </span>
                <span
                  className={item.key === "progress" ? "font-semibold" : ""}
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

      {/* Контент */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
          <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {/* Левая колонка: выбор предмета и сводка */}
            <aside className="space-y-4">
              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Предмет
                </p>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-2xl bg-black/60 border border-white/20 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                >
                  {Object.keys(TOPICS).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-purple-200/80">
                  Выбери предмет, по которому хочешь посмотреть свою карту
                  знаний.
                </p>
              </section>

              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Краткая сводка
                </p>
                {subjectTopics.length === 0 ? (
                  <p className="text-xs text-purple-100/80">
                    Для этого предмета пока нет заготовленных тем. Можно начать
                    с диалога — NOOLIX поможет наметить первые шаги.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-purple-100/85">
                      Тем в списке: {totalTopics}
                    </p>
                    <div className="space-y-1.5 text-[11px] text-purple-100">
                      <p>
                        <span className="inline-block h-2 w-2 rounded-full bg-red-300 mr-1" />
                        Сложно / не начато:{" "}
                        <span className="font-semibold">{weak}</span>
                      </p>
                      <p>
                        <span className="inline-block h-2 w-2 rounded-full bg-orange-300 mr-1" />
                        Нужна практика:{" "}
                          <span className="font-semibold">{inProgress}</span>
                      </p>
                      <p>
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-300 mr-1" />
                        Хороший / уверенный уровень:{" "}
                        <span className="font-semibold">{mastered}</span>
                      </p>
                    </div>
                  </>
                )}
              </section>

              {/* Пустое состояние с CTA */}
              {!hasAnyRated && subjectTopics.length > 0 && (
                <section className="bg-black/30 border border-dashed border-purple-300/60 rounded-2xl p-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Пока без оценок
                  </p>
                  <p className="text-xs text-purple-100/85">
                    Ты ещё не отмечал(а) темы по этому предмету. Можно начать с
                    краткой тренировки в диалоге — расскажи, что даётся
                    сложнее всего.
                  </p>
                  <a
                    href={`/chat?topic=${encodeURIComponent(
                      `${subject}: хочу понять слабые темы`
                    )}`}
                    className="inline-flex items-center justify-center mt-1 px-3 py-1.5 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                  >
                    Начать с диалога по этому предмету
                  </a>
                </section>
              )}
            </aside>

            {/* Правая колонка: список тем */}
            <section className="space-y-4">
              <header className="flex flex-col gap-1">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Карта знаний
                </p>
                <h1 className="text-lg md:text-xl font-semibold">
                  {subject}: темы и уровень владения
                </h1>
                <p className="text-xs text-purple-200/90">
                  Отмечай, что даётся легко, а что — сложно. NOOLIX использует
                  это в целях, тестах и диалоге.
                </p>
              </header>

              {subjectTopics.length === 0 ? (
                <div className="bg-black/30 border border-white/10 rounded-2xl p-4 text-xs text-purple-100/85">
                  Для этого предмета ещё нет списка тем. Попробуй выбрать другой
                  предмет или начни с диалога — вместе составим карту знаний.
                  <div className="mt-2">
                    <a
                      href="/chat"
                      className="inline-flex text-[11px] text-purple-100 underline underline-offset-2 hover:text-white"
                    >
                      Перейти к диалогу →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {subjectTopics.map((topic) => {
                    const entry = subjectMap[topic.id];
                    const score = entry?.score;
                    const status = getStatusFromScore(score);
                    return (
                      <div
                        key={topic.id}
                        className="bg-black/35 border border-white/10 rounded-2xl p-3 md:p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-xs md:text-sm font-semibold">
                            {topic.title}
                          </p>
                          <p className="text-[11px] text-purple-200/80">
                            {topic.area} • {topic.levelHint}
                          </p>
                          <p
                            className={`text-[11px] mt-0.5 ${status.color}`}
                          >
                            Статус: {status.label}
                          </p>
                          <a
                            href={`/chat?topic=${encodeURIComponent(
                              topic.title
                            )}`}
                            className="inline-flex mt-1 text-[11px] text-purple-100 underline underline-offset-2 hover:text-white"
                          >
                            Потренироваться по теме в диалоге →
                          </a>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-1 text-[11px]">
                          <p className="text-purple-200/80">
                            Оцени, как ты чувствуешь тему:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleMarkTopic(topic.id, "weak")
                              }
                              className="px-2.5 py-1 rounded-full bg-red-500/30 border border-red-300/60 text-[11px] hover:bg-red-500/50 transition"
                            >
                              Сложно
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleMarkTopic(topic.id, "medium")
                              }
                              className="px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-300/60 text-[11px] hover:bg-orange-500/40 transition"
                            >
                              Нужна практика
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleMarkTopic(topic.id, "strong")
                              }
                              className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-300/60 text-[11px] hover:bg-emerald-500/40 transition"
                            >
                              Легко
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
