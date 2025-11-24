// pages/tests.js
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

// Набор тем (тот же, что и в progress.js)
const TOPICS = {
  "Математика": [
    { id: "math_quadratic", title: "Квадратные уравнения", area: "Алгебра", levelHint: "8–9 класс" },
    { id: "math_linear", title: "Линейные уравнения и системы", area: "Алгебра", levelHint: "7–8 класс" },
    { id: "math_derivative", title: "Производная и её смысл", area: "Математический анализ", levelHint: "10–11 класс" },
    { id: "math_trig", title: "Тригонометрические уравнения", area: "Алгебра", levelHint: "10–11 класс" },
  ],
  "Физика": [
    { id: "phys_newton2", title: "Второй закон Ньютона", area: "Механика", levelHint: "9–10 класс" },
    { id: "phys_kinematics", title: "Равноускоренное движение", area: "Механика", levelHint: "9 класс" },
    { id: "phys_energy", title: "Работа и энергия", area: "Механика", levelHint: "9–10 класс" },
  ],
  "Русский язык": [
    { id: "rus_participles", title: "Причастные обороты", area: "Синтаксис", levelHint: "7–9 класс" },
    { id: "rus_spelling", title: "Правописание Н и НН", area: "Орфография", levelHint: "8–9 класс" },
    { id: "rus_essay", title: "Структура сочинения", area: "Письменная речь", levelHint: "9–11 класс" },
  ],
  "Английский язык": [
    { id: "eng_tenses", title: "Основные времена (Present/Past/Future)", area: "Грамматика", levelHint: "7–9 класс" },
    { id: "eng_perf", title: "Perfect времена", area: "Грамматика", levelHint: "9–11 класс" },
    { id: "eng_vocab", title: "Расширение словарного запаса", area: "Лексика", levelHint: "Все уровни" },
  ],
};

const KNOWLEDGE_STORAGE_KEY = "noolixKnowledgeMap";
const TEST_HISTORY_KEY = "noolixTestHistory";

const defaultTopicState = {
  score: 0,
  label: "Не начато",
  attempts: 0,
  lastUpdated: null,
};

function scoreToColor(score) {
  if (score >= 0.8) return "bg-green-500/80";
  if (score >= 0.4) return "bg-yellow-400/80";
  if (score > 0) return "bg-red-500/80";
  return "bg-slate-500/60";
}

export default function TestsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [context, setContext] = useState({
    subject: "Математика",
    level: "10–11 класс",
    mode: "exam_prep",
  });
  const [knowledgeMap, setKnowledgeMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedMode, setSelectedMode] = useState("topic_quick"); // пока один режим
  const [topicSource, setTopicSource] = useState("manual"); // "manual" | "weak"

  const [selectedSubject, setSelectedSubject] = useState("Математика");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedTopicsMulti, setSelectedTopicsMulti] = useState([]);
  const [questionCount, setQuestionCount] = useState(5);

  const [testHistory, setTestHistory] = useState([]);
  const [uiError, setUiError] = useState("");
  const [feedback, setFeedback] = useState("");

  // Инициализация: контекст, карта знаний, история тестов
  useEffect(() => {
    try {
      const rawContext = window.localStorage.getItem("noolixContext");
      let ctx = {
        subject: "Математика",
        level: "10–11 класс",
        mode: "exam_prep",
      };
      if (rawContext) {
        const parsed = JSON.parse(rawContext);
        ctx = { ...ctx, ...parsed };
      }
      setContext(ctx);
      setSelectedSubject(ctx.subject || "Математика");

      const rawKnowledge = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
      if (rawKnowledge) {
        const parsed = JSON.parse(rawKnowledge);
        if (parsed && typeof parsed === "object") {
          setKnowledgeMap(parsed);
        }
      }

      const rawHistory = window.localStorage.getItem(TEST_HISTORY_KEY);
      if (rawHistory) {
        const hist = JSON.parse(rawHistory);
        if (Array.isArray(hist)) {
          setTestHistory(hist);
        }
      }
    } catch (e) {
      console.warn("Failed to load tests context/knowledge/history", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Сохраняем историю тестов
  useEffect(() => {
    try {
      window.localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(testHistory));
    } catch (e) {
      console.warn("Failed to save test history", e);
    }
  }, [testHistory]);

  const subjectTopics = TOPICS[selectedSubject] || [];

  const getTopicState = (subject, topicId) => {
    const subjectEntry = knowledgeMap[subject];
    if (!subjectEntry || !subjectEntry[topicId]) return defaultTopicState;
    return subjectEntry[topicId];
  };

  // Рекомендации: слабые темы по текущему предмету из context.subject
  const recommendedTopics = (() => {
    const currentSubjectTopics = TOPICS[context.subject] || [];
    const withState = currentSubjectTopics.map((t) => ({
      ...t,
      state: getTopicState(context.subject, t.id),
    }));
    const weakOrMedium = withState.filter((t) => t.state.score < 0.8);
    return weakOrMedium.slice(0, 3);
  })();

  // "Слабые темы" для выбранного в параметрах предмета (для мультивыбора)
  const weakTopicsForSubject = (() => {
    const all = TOPICS[selectedSubject] || [];
    return all
      .map((t) => ({ ...t, state: getTopicState(selectedSubject, t.id) }))
      .filter((t) => t.state.score < 0.8);
  })();

  const toggleWeakTopic = (topicId) => {
    setSelectedTopicsMulti((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleStartTest = () => {
    setUiError("");
    setFeedback("");

    let topicsForTest = [];

    if (topicSource === "manual") {
      if (!selectedTopicId) {
        setUiError("Выбери тему, по которой хочешь пройти тест.");
        return;
      }
      const topic = subjectTopics.find((t) => t.id === selectedTopicId);
      if (!topic) {
        setUiError("Выбранная тема не найдена. Попробуй выбрать другую.");
        return;
      }
      topicsForTest = [topic];
    } else {
      // topicSource === "weak"
      if (weakTopicsForSubject.length === 0) {
        setUiError(
          "По выбранному предмету нет слабых тем. Отметь свои слабые темы в карте знаний."
        );
        return;
      }
      const selected = weakTopicsForSubject.filter((t) =>
        selectedTopicsMulti.includes(t.id)
      );
      if (selected.length === 0) {
        setUiError("Выбери хотя бы одну слабую тему из списка.");
        return;
      }
      topicsForTest = selected;
    }

    const entry = {
      id: Date.now(),
      subject: selectedSubject,
      mode: selectedMode,
      topicSource,
      topicIds: topicsForTest.map((t) => t.id),
      topicTitles: topicsForTest.map((t) => t.title),
      questionCount,
      correctCount: null, // потом сюда положим результат реального теста
      createdAt: new Date().toISOString(),
    };

    setTestHistory((prev) => [entry, ...prev].slice(0, 20));

    setFeedback(
      "Тестовый режим пока в разработке: мы сохранили эту попытку как план. Скоро здесь появятся реальные вопросы и проверка ответов."
    );
  };

  const handleQuickStartRecommendation = (topic) => {
    setTopicSource("manual");
    setSelectedSubject(context.subject);
    setSelectedTopicId(topic.id);
    setSelectedTopicsMulti([]);
    setFeedback("");
    setUiError("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">
            Загружаем настройки тестов…
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
          <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {/* Левая колонка — контекст и рекомендации */}
            <aside className="space-y-4">
              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Тесты и тренировки
                </p>
                <h2 className="text-sm font-semibold mb-1">
                  {context.subject}
                </h2>
                <p className="text-xs text-purple-100">
                  Уровень:{" "}
                  <span className="font-semibold">{context.level}</span>
                </p>
                <p className="text-[11px] text-purple-300/80 mt-1">
                  Тесты помогают обновлять твою карту знаний и готовиться к
                  экзаменам.
                </p>
              </section>

              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Рекомендации NOOLIX
                </p>
                {recommendedTopics.length === 0 ? (
                  <p className="text-[11px] text-purple-100">
                    По текущему предмету нет явных слабых тем. Позже ты увидишь
                    здесь предложения, основанные на карте знаний.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recommendedTopics.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">
                            {t.title}
                          </span>
                          <span className="text-[10px] text-purple-200/80">
                            {t.area} • {t.levelHint}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickStartRecommendation(t)}
                          className="text-[10px] px-3 py-1 rounded-full bg-white text-black font-semibold hover:bg-purple-100 transition"
                        >
                          Выбрать
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {testHistory.length > 0 && (
                <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Последние попытки
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto text-[11px] text-purple-100">
                    {testHistory.slice(0, 5).map((t) => {
                      const topics = t.topicTitles || [];
                      const topicsLabel =
                        topics.length === 0
                          ? "Тема не указана"
                          : topics.length === 1
                          ? topics[0]
                          : `${topics[0]} + ещё ${topics.length - 1}`;
                      const sourceLabel =
                        t.topicSource === "weak"
                          ? "слабые темы"
                          : "ручной выбор";
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-b-0"
                        >
                          <div>
                            <p className="font-medium">{topicsLabel}</p>
                            <p className="text-[10px] text-purple-200/80">
                              {t.subject} • {t.questionCount} вопросов •{" "}
                              {sourceLabel}
                            </p>
                          </div>
                          <span className="text-[10px] text-purple-200/70">
                            {new Date(t.createdAt).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </aside>

            {/* Правая колонка — режимы тестов и настройки */}
            <section className="flex flex-col gap-4">
              <header className="border-b border-white/10 pb-3 space-y-2">
                <div>
                  <h1 className="text-sm md:text-base font-semibold">
                    Тесты и тренировки по предмету
                  </h1>
                  <p className="text-[11px] text-purple-200 mt-1">
                    Выбери режим и темы — NOOLIX подготовит для тебя вопросы и
                    поможет оценить, насколько ты уверен в материале.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMode("topic_quick")}
                    className={`text-[11px] px-3 py-1 rounded-full border ${
                      selectedMode === "topic_quick"
                        ? "bg-white text-black border-white"
                        : "bg-black/40 text-purple-100 border-white/20 hover:bg-white/5"
                    } transition`}
                  >
                    Быстрый тест по теме
                  </button>
                  <button
                    type="button"
                    className="text-[11px] px-3 py-1 rounded-full border bg-black/30 border-white/15 text-purple-300/70 cursor-not-allowed"
                  >
                    Смешанный тест по предмету (скоро)
                  </button>
                </div>
              </header>

              {selectedMode === "topic_quick" && (
                <div className="space-y-4">
                  <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                    <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                      Параметры теста
                    </p>

                    {/* Источник тем */}
                    <div className="space-y-2 text-xs md:text-sm">
                      <p className="text-[11px] text-purple-200/90">
                        Источник тем
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setTopicSource("manual")}
                          className={`text-[11px] px-3 py-1 rounded-full border ${
                            topicSource === "manual"
                              ? "bg-white text-black border-white"
                              : "bg-black/40 text-purple-100 border-white/20 hover:bg-white/5"
                          } transition`}
                        >
                          Выбрать вручную
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopicSource("weak")}
                          className={`text-[11px] px-3 py-1 rounded-full border ${
                            topicSource === "weak"
                              ? "bg-white text-black border-white"
                              : "bg-black/40 text-purple-100 border-white/20 hover:bg-white/5"
                          } transition`}
                        >
                          Слабые темы из карты знаний
                        </button>
                      </div>
                    </div>

                    {/* Ручной выбор темы */}
                    {topicSource === "manual" && (
                      <div className="grid gap-3 md:grid-cols-3 text-xs md:text-sm mt-2">
                        <div className="space-y-1">
                          <p className="text-[11px] text-purple-200/90">
                            Предмет
                          </p>
                          <select
                            className="w-full px-2 py-2 rounded-xl bg-black/50 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                            value={selectedSubject}
                            onChange={(e) => {
                              setSelectedSubject(e.target.value);
                              setSelectedTopicId("");
                              setSelectedTopicsMulti([]);
                            }}
                          >
                            {Object.keys(TOPICS).map((subj) => (
                              <option key={subj} value={subj}>
                                {subj}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <p className="text-[11px] text-purple-200/90">
                            Тема
                          </p>
                          <select
                            className="w-full px-2 py-2 rounded-xl bg-black/50 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                            value={selectedTopicId}
                            onChange={(e) => setSelectedTopicId(e.target.value)}
                          >
                            <option value="">Выбери тему…</option>
                            {subjectTopics.map((topic) => {
                              const state = getTopicState(
                                selectedSubject,
                                topic.id
                              );
                              return (
                                <option key={topic.id} value={topic.id}>
                                  {topic.title} • {topic.levelHint} (
                                  {state.label})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Выбор по слабым темам */}
                    {topicSource === "weak" && (
                      <div className="space-y-2 text-xs md:text-sm mt-2">
                        <p className="text-[11px] text-purple-200/90">
                          Слабые и средние темы по предмету{" "}
                          <span className="font-semibold">
                            {selectedSubject}
                          </span>
                        </p>
                        {weakTopicsForSubject.length === 0 ? (
                          <p className="text-[11px] text-purple-200/80">
                            По этому предмету нет слабых тем. Отметь темы как
                            слабые в разделе “Прогресс”, и они появятся здесь.
                          </p>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {weakTopicsForSubject.map((topic) => (
                              <label
                                key={topic.id}
                                className="flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedTopicsMulti.includes(
                                      topic.id
                                    )}
                                    onChange={() =>
                                      toggleWeakTopic(topic.id)
                                    }
                                    className="h-3 w-3 rounded border border-white/40 bg-black/60"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold">
                                      {topic.title}
                                    </span>
                                    <span className="text-[10px] text-purple-200/80">
                                      {topic.area} • {topic.levelHint}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`inline-block h-2.5 w-10 rounded-full ${scoreToColor(
                                    topic.state.score
                                  )}`}
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Кол-во вопросов и пояснение */}
                    <div className="grid gap-3 md:grid-cols-3 text-xs md:text-sm mt-2">
                      <div className="space-y-1">
                        <p className="text-[11px] text-purple-200/90">
                          Количество вопросов
                        </p>
                        <select
                          className="w-full px-2 py-2 rounded-xl bg-black/50 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                          value={questionCount}
                          onChange={(e) =>
                            setQuestionCount(Number(e.target.value))
                          }
                        >
                          <option value={5}>5 вопросов</option>
                          <option value={10}>10 вопросов</option>
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2 text-[11px] text-purple-200/90">
                        <p>Что будет дальше?</p>
                        <p>
                          В ближайших версиях NOOLIX будет генерировать для тебя
                          вопросы по выбранным темам и анализировать ответы, чтобы
                          обновлять твою карту знаний.
                        </p>
                      </div>
                    </div>

                    {/* Кнопка запуска */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-[11px] text-purple-200/80">
                        <p>
                          Тест обновит уровень темы в{" "}
                          <span className="font-semibold">“Карте знаний”</span>.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartTest}
                        className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-md hover:bg-purple-100 transition"
                      >
                        Начать тест
                      </button>
                    </div>

                    {uiError && (
                      <p className="text-[11px] text-red-300 mt-1">
                        {uiError}
                      </p>
                    )}
                    {feedback && (
                      <p className="text-[11px] text-purple-200/90 mt-1">
                        {feedback}
                      </p>
                    )}
                  </section>
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
