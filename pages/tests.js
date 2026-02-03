// pages/tests.js
import { useEffect, useMemo, useState } from "react";

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

// MVP темы (как на /progress)
const TOPICS = {
  Математика: [
    { id: "math_quadratic", title: "Квадратные уравнения", area: "Алгебра" },
    { id: "math_linear", title: "Линейные уравнения и системы", area: "Алгебра" },
    { id: "math_derivative", title: "Производная и её смысл", area: "Математический анализ" },
    { id: "math_trig", title: "Тригонометрические уравнения", area: "Алгебра" },
  ],
  "Русский язык": [
    { id: "rus_participles", title: "Причастные обороты", area: "Синтаксис" },
    { id: "rus_spelling", title: "Правописание Н и НН", area: "Орфография" },
    { id: "rus_essay", title: "Структура сочинения", area: "Письменная речь" },
  ],
  Физика: [
    { id: "phys_newton2", title: "Второй закон Ньютона", area: "Механика" },
    { id: "phys_kinematics", title: "Равноускоренное движение", area: "Механика" },
    { id: "phys_energy", title: "Работа и энергия", area: "Механика" },
  ],
  "Английский язык": [
    { id: "eng_tenses", title: "Основные времена (Present/Past/Future)", area: "Грамматика" },
    { id: "eng_perf", title: "Perfect времена", area: "Грамматика" },
    { id: "eng_vocab", title: "Расширение словарного запаса", area: "Лексика" },
  ],
};

const KNOWLEDGE_STORAGE_KEY = "noolixKnowledgeMap";

function isActive(path) {
  if (typeof window === "undefined") return false;
  return window.location.pathname === path;
}

function scoreToLabel(score) {
  if (score >= 0.8) return "Уверенно";
  if (score >= 0.4) return "Так себе";
  if (score > 0) return "Слабая зона";
  return "Не начато";
}

export default function TestsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [context, setContext] = useState({ subject: "Математика", level: "10–11 класс" });
  const [knowledgeMap, setKnowledgeMap] = useState({});

  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(7);
  const [selectedTopicIds, setSelectedTopicIds] = useState({});

  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");

  const [test, setTest] = useState(null); // {questions:[], answers:{}...}
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const rawContext = window.localStorage.getItem("noolixContext");
      if (rawContext) {
        const ctx = JSON.parse(rawContext);
        setContext((prev) => ({ ...prev, ...ctx }));
      }
      const rawKm = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
      if (rawKm) {
        const km = JSON.parse(rawKm);
        if (km && typeof km === "object") setKnowledgeMap(km);
      }
    } catch (e) {
      console.warn("Failed to load tests context", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const subjectTopics = useMemo(() => TOPICS[context.subject] || [], [context.subject]);

  // По умолчанию выбираем слабые/средние темы
  useEffect(() => {
    try {
      const subj = knowledgeMap?.[context.subject] || {};
      const next = {};
      subjectTopics.forEach((t) => {
        const score = typeof subj?.[t.id]?.score === "number" ? subj[t.id].score : 0;
        if (score > 0 && score < 0.8) next[t.id] = true;
      });
      // Если ничего не выбралось — выберем первую тему
      if (Object.keys(next).length === 0 && subjectTopics[0]) next[subjectTopics[0].id] = true;
      setSelectedTopicIds(next);
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.subject, subjectTopics.length]);

  const selectedTopics = useMemo(() => {
    return subjectTopics.filter((t) => !!selectedTopicIds[t.id]);
  }, [subjectTopics, selectedTopicIds]);

  const toggleTopic = (id) => {
    setSelectedTopicIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const generate = async () => {
    setError("");
    setThinking(true);
    setSubmitted(false);
    setUserAnswers({});

    try {
      if (!context.subject) throw new Error("Не выбран предмет");
      if (!selectedTopics || selectedTopics.length === 0) {
        throw new Error("Выбери хотя бы одну тему");
      }

      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: context.subject,
          topics: selectedTopics,
          questionCount,
          difficulty,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.details || "Не удалось сгенерировать тест");
      }

      const questions = Array.isArray(data.questions) ? data.questions : [];
      if (questions.length === 0) throw new Error("Тест пустой. Попробуй ещё раз.");

      setTest({
        subject: context.subject,
        difficulty,
        questions,
      });
    } catch (e) {
      setError(e?.message || "Ошибка при генерации теста");
    } finally {
      setThinking(false);
    }
  };

  const submit = () => {
    if (!test) return;
    setSubmitted(true);
  };

  const correctCount = useMemo(() => {
    if (!submitted || !test) return 0;
    let c = 0;
    test.questions.forEach((q) => {
      const a = userAnswers[q.index];
      if (typeof a === "number" && a === q.correctIndex) c += 1;
    });
    return c;
  }, [submitted, test, userAnswers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl font-extrabold bg-gradient-to-r from-[#FDF2FF] via-[#E5DEFF] to-white text-transparent bg-clip-text">
            NOOLIX
          </div>
          <div className="text-xs text-purple-200/80">Загрузка…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white">
      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "block" : "hidden"} md:block w-64 min-h-screen bg-gradient-to-b from-black/50 via-[#2E003E]/85 to-black/80 border-r border-white/10 p-6 space-y-6`}>
          <div>
            <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#FDF2FF] via-[#E5DEFF] to-white text-transparent bg-clip-text">
              NOOLIX
            </div>
            <div className="text-[11px] text-purple-200/80 mt-1">Тесты и практика</div>
          </div>

          <nav className="space-y-2">
            {primaryMenuItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition ${isActive(item.href) ? "bg-white/10" : "hover:bg-white/5"}`}
              >
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white ${isActive(item.href) ? "ring-2 ring-purple-200" : ""}`}>
                  {item.icon}
                </span>
                <span className={`${isActive(item.href) ? "font-semibold" : ""}`}>{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="h-px bg-white/10" />

          <nav className="space-y-2">
            {secondaryMenuItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition ${isActive(item.href) ? "bg-white/10" : "hover:bg-white/5"}`}
              >
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white ${isActive(item.href) ? "ring-2 ring-purple-200" : ""}`}>
                  {item.icon}
                </span>
                <span className={`${isActive(item.href) ? "font-semibold" : ""}`}>{item.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/30">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition"
            >
              ☰
            </button>
            <div className="text-sm font-semibold">Тесты</div>
            <div className="w-10" />
          </header>

          <main className="p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] bg-black/35 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
              {/* Left controls */}
              <aside className="space-y-4">
                <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">Настройки</p>

                  <div>
                    <label className="text-[11px] text-purple-200/80">Предмет</label>
                    <select
                      value={context.subject}
                      onChange={(e) => setContext((p) => ({ ...p, subject: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-black/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300 text-xs"
                    >
                      {Object.keys(TOPICS).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-purple-200/80">Сложность</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-black/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300 text-xs"
                    >
                      <option value="easy">Лёгкая</option>
                      <option value="medium">Средняя</option>
                      <option value="hard">Сложная</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-purple-200/80">Количество вопросов</label>
                    <input
                      type="number"
                      min={3}
                      max={20}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value || 7))}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-black/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300 text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={generate}
                    disabled={thinking}
                    className={`w-full px-4 py-2 rounded-full text-xs font-semibold shadow-md transition ${thinking ? "bg-white/60 text-black/70" : "bg-white text-black hover:bg-purple-100"}`}
                  >
                    {thinking ? "Генерирую…" : "Сгенерировать тест"}
                  </button>

                  {error && (
                    <div className="text-xs text-red-200 bg-red-500/10 border border-red-300/20 rounded-xl p-3">
                      {error}
                    </div>
                  )}

                  <div className="text-[11px] text-purple-200/80">
                    Подсказка: по умолчанию выбраны слабые/средние темы из карты знаний.
                  </div>
                </section>

                <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">Темы</p>
                  <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                    {subjectTopics.map((t) => {
                      const score = knowledgeMap?.[context.subject]?.[t.id]?.score;
                      const label = typeof score === "number" ? scoreToLabel(score) : "";
                      return (
                        <label key={t.id} className="flex items-start gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selectedTopicIds[t.id]}
                            onChange={() => toggleTopic(t.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="font-semibold">{t.title}</span>
                            <span className="block text-[11px] text-purple-200/80">
                              {t.area}{label ? ` • ${label}` : ""}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              </aside>

              {/* Right content */}
              <section className="space-y-4">
                <header className="border-b border-white/10 pb-3">
                  <h1 className="text-sm md:text-base font-semibold">Тесты по предмету: {context.subject}</h1>
                  <p className="text-[11px] text-purple-200 mt-1">
                    Генерируй тест по выбранным темам, отвечай и проверяй себя.
                  </p>
                </header>

                {!test ? (
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-6 text-sm text-purple-100">
                    Выбери темы слева и нажми «Сгенерировать тест».
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submitted && (
                      <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                        <div className="text-sm font-semibold">Результат</div>
                        <div className="text-xs text-purple-200/80 mt-1">
                          Правильных: {correctCount} из {test.questions.length}
                        </div>
                      </div>
                    )}

                    {test.questions.map((q) => {
                      const chosen = userAnswers[q.index];
                      return (
                        <div key={q.index} className="bg-black/30 border border-white/10 rounded-2xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[11px] uppercase tracking-wide text-purple-300/80">{q.topicTitle}</div>
                              <div className="text-sm font-semibold mt-1">{q.index + 1}. {q.question}</div>
                            </div>
                            <div className="text-[11px] text-purple-200/80">{q.difficulty}</div>
                          </div>

                          <div className="mt-3 space-y-2">
                            {q.options.map((opt, idx) => {
                              const checked = chosen === idx;
                              const isCorrect = submitted && idx === q.correctIndex;
                              const isWrongChosen = submitted && checked && idx !== q.correctIndex;
                              return (
                                <label
                                  key={idx}
                                  className={`flex items-start gap-2 p-2 rounded-xl border transition cursor-pointer ${
                                    isCorrect
                                      ? "border-green-300/40 bg-green-500/10"
                                      : isWrongChosen
                                      ? "border-red-300/40 bg-red-500/10"
                                      : "border-white/10 hover:bg-white/5"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`q_${q.index}`}
                                    checked={checked}
                                    onChange={() => setUserAnswers((p) => ({ ...p, [q.index]: idx }))}
                                    disabled={submitted}
                                    className="mt-1"
                                  />
                                  <span className="text-xs text-purple-100">{opt}</span>
                                </label>
                              );
                            })}
                          </div>

                          {submitted && (
                            <div className="mt-3 text-[11px] text-purple-200/80">
                              Правильный ответ: вариант {String.fromCharCode(65 + q.correctIndex)}
                              {q.explanation ? ` — ${q.explanation}` : ""}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-2">
                      {!submitted ? (
                        <button
                          type="button"
                          onClick={submit}
                          className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-md hover:bg-purple-100 transition"
                        >
                          Проверить
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={generate}
                          className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-md hover:bg-purple-100 transition"
                        >
                          Новый тест
                        </button>
                      )}
                      <a
                        href={`/chat?topic=${encodeURIComponent(selectedTopics[0]?.title || "")}`}
                        className="text-xs text-purple-200/90 underline-offset-2 hover:underline"
                      >
                        Потренироваться в чате
                      </a>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </main>

          <footer className="bg-[#1A001F]/90 border-t border-white/10 text-center py-3 text-xs text-purple-200">
            © 2025 NOOLIX — образовательная платформа будущего. Связь: support@noolix.ai
          </footer>
        </div>
      </div>
    </div>
  );
}
