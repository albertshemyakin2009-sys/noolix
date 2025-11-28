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

const TOPICS = {
  "Математика": [
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
    {
      id: "math_probability",
      title: "Основы теории вероятностей",
      area: "Теория вероятностей",
      levelHint: "9–11 класс",
    },
  ],
  "Физика": [
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
    {
      id: "phys_electricity",
      title: "Закон Ома и электрические цепи",
      area: "Электродинамика",
      levelHint: "8–9 класс",
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
      id: "rus_spelling_nn",
      title: "Правописание Н и НН",
      area: "Орфография",
      levelHint: "8–9 класс",
    },
    {
      id: "rus_omoni",
      title: "Правописание О/Ё после шипящих",
      area: "Орфография",
      levelHint: "7–9 класс",
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
      title: "Perfect времена",
      area: "Грамматика",
      levelHint: "9–11 класс",
    },
    {
      id: "eng_cond",
      title: "Условные предложения (Conditionals)",
      area: "Грамматика",
      levelHint: "9–11 класс",
    },
    {
      id: "eng_vocab",
      title: "Расширение словарного запаса",
      area: "Лексика",
      levelHint: "Все уровни",
    },
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

  const [selectedMode, setSelectedMode] = useState("topic_quick");
  const [topicSource, setTopicSource] = useState("custom");

  const [selectedSubject, setSelectedSubject] = useState("Математика");
  const [customTopicTitle, setCustomTopicTitle] = useState("");
  const [selectedTopicsMulti, setSelectedTopicsMulti] = useState([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");

  const [testHistory, setTestHistory] = useState([]);

  const [uiError, setUiError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [questionResults, setQuestionResults] = useState([]);
  const [testFinished, setTestFinished] = useState(false);
  const [testSummary, setTestSummary] = useState(null);
  const [lastResults, setLastResults] = useState([]);

  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewError, setReviewError] = useState("");

  const [explainLoading, setExplainLoading] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainError, setExplainError] = useState("");

  // --- Инициализация ---
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
      console.warn("Failed to load context/knowledge/history", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        KNOWLEDGE_STORAGE_KEY,
        JSON.stringify(knowledgeMap)
      );
    } catch (e) {
      console.warn("Failed to save knowledge map", e);
    }
  }, [knowledgeMap]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TEST_HISTORY_KEY, JSON.stringify(testHistory));
    } catch (e) {
      console.warn("Failed to save test history", e);
    }
  }, [testHistory]);

  // --- Хелперы ---
  const getTopicState = (subject, topicId) => {
    const subjectEntry = knowledgeMap[subject];
    if (!subjectEntry || !subjectEntry[topicId]) return defaultTopicState;
    return subjectEntry[topicId];
  };

  const recommendedTopics = (() => {
    const currentSubjectTopics = TOPICS[context.subject] || [];
    const withState = currentSubjectTopics.map((t) => ({
      ...t,
      state: getTopicState(context.subject, t.id),
    }));
    const weakOrMedium = withState.filter((t) => t.state.score < 0.8);
    return weakOrMedium.slice(0, 3);
  })();

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

  const resetCurrentTest = () => {
    setCurrentTest(null);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setQuestionResults([]);
    setTestFinished(false);
    setTestSummary(null);
    setLastResults([]);
    setReviewText("");
    setReviewError("");
    setFeedback("");
    setUiError("");
  };

  const updateKnowledgeAfterTest = (subject, topics, questions, results) => {
    const statsByTopic = {};

    questions.forEach((q, index) => {
      const topicId = q.topicId || "custom";
      const topicTitle = q.topicTitle || "Тема";
      if (topicId === "custom") return;

      if (!statsByTopic[topicId]) {
        statsByTopic[topicId] = {
          title: topicTitle,
          correct: 0,
          total: 0,
        };
      }
      statsByTopic[topicId].total += 1;
      const r = results[index];
      if (r && r.isCorrect) {
        statsByTopic[topicId].correct += 1;
      }
    });

    setKnowledgeMap((prev) => {
      const copy = { ...prev };
      if (!copy[subject]) copy[subject] = {};
      const subjEntry = { ...copy[subject] };

      Object.entries(statsByTopic).forEach(([topicId, stat]) => {
        const accuracy = stat.total > 0 ? stat.correct / stat.total : 0;
        const prevState = subjEntry[topicId] || defaultTopicState;
        const prevAttempts = prevState.attempts || 0;
        const newAttempts = prevAttempts + 1;
        const newScore =
          prevAttempts === 0
            ? accuracy
            : (prevState.score * prevAttempts + accuracy) / newAttempts;

        let label = "Не начато";
        if (newScore >= 0.8) label = "Уверен";
        else if (newScore >= 0.4) label = "Требует практики";
        else if (newScore > 0) label = "Слабая зона";

        subjEntry[topicId] = {
          score: newScore,
          label,
          attempts: newAttempts,
          lastUpdated: new Date().toISOString(),
        };
      });

      copy[subject] = subjEntry;
      return copy;
    });
  };

  // --- Старт теста ---
  const handleStartTest = async () => {
    setUiError("");
    setFeedback("");
    setReviewText("");
    setReviewError("");
    resetCurrentTest();

    let topicsForTest = [];

    if (topicSource === "custom") {
      const title = customTopicTitle.trim();
      if (!title) {
        setUiError("Напиши тему, по которой хочешь пройти тест.");
        return;
      }
      topicsForTest = [{ id: "custom", title }];
    } else {
      if (weakTopicsForSubject.length === 0) {
        setUiError(
          "По выбранному предмету нет слабых тем. Отметь слабые темы в карте знаний."
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
      topicsForTest = selected.map((t) => ({ id: t.id, title: t.title }));
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: selectedSubject,
          topics: topicsForTest,
          questionCount,
          difficulty,
        }),
      });

      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        throw new Error(
          data.error ||
            data.details ||
            "Ошибка при генерации теста. Попробуй ещё раз."
        );
      }

      const data = await res.json();
      const questions = Array.isArray(data.questions) ? data.questions : [];

      if (questions.length === 0) {
        throw new Error(
          "Не получилось получить вопросы для теста. Попробуй ещё раз."
        );
      }

      const testId = Date.now();
      setCurrentTest({
        id: testId,
        subject: selectedSubject,
        topicSource,
        topics: topicsForTest,
        questions,
      });
      setCurrentQuestionIndex(0);
      setSelectedOptionIndex(null);
      setQuestionResults([]);
      setTestFinished(false);
      setTestSummary(null);
      setFeedback("");
    } catch (error) {
      console.error(error);
      setUiError(
        error?.message ||
          "Произошла ошибка при генерации теста. Попробуй ещё раз."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Ответ и переход ---
  const handleAnswerAndNext = () => {
    if (!currentTest || !currentTest.questions) return;
    const questions = currentTest.questions;
    const q = questions[currentQuestionIndex];

    if (selectedOptionIndex === null) {
      setUiError("Выбери вариант ответа перед продолжением.");
      return;
    }

    setUiError("");
    const isCorrect = selectedOptionIndex === q.correctIndex;

    setQuestionResults((prev) => {
      const copy = [...prev];
      copy[currentQuestionIndex] = {
        selectedIndex: selectedOptionIndex,
        isCorrect,
      };
      return copy;
    });

    const isLast = currentQuestionIndex === questions.length - 1;
    if (isLast) {
      const allResults = [
        ...questionResults.slice(0, currentQuestionIndex),
        { selectedIndex: selectedOptionIndex, isCorrect },
      ];
      finishTest(currentTest, allResults);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOptionIndex(null);
    }
  };

  const finishTest = (test, results) => {
    const questions = test.questions || [];
    const total = questions.length;
    const correctCount = results.filter((r) => r && r.isCorrect).length;

    const perTopic = {};
    questions.forEach((q, index) => {
      const topicId = q.topicId || "custom";
      const topicTitle = q.topicTitle || "Тема";
      if (!perTopic[topicId]) {
        perTopic[topicId] = {
          title: topicTitle,
          correct: 0,
          total: 0,
        };
      }
      perTopic[topicId].total += 1;
      const r = results[index];
      if (r && r.isCorrect) {
        perTopic[topicId].correct += 1;
      }
    });

    setTestSummary({
      correctCount,
      total,
      perTopic,
    });
    setTestFinished(true);
    setLastResults(results);

    updateKnowledgeAfterTest(test.subject, test.topics, questions, results);

    setTestHistory((prev) => {
      const entry = {
        id: test.id,
        subject: test.subject,
        mode: selectedMode,
        topicSource: test.topicSource,
        topicIds: test.topics.map((t) => t.id),
        topicTitles: test.topics.map((t) => t.title),
        questionCount: total,
        correctCount,
        createdAt: new Date().toISOString(),
      };
      return [entry, ...prev].slice(0, 20);
    });

    setFeedback(
      `Тест завершён: ${correctCount} из ${total} верно. Карта знаний обновлена по темам теста.`
    );
  };

  const handleQuickStartRecommendation = (topic) => {
    setTopicSource("custom");
    setSelectedSubject(context.subject);
    setCustomTopicTitle(topic.title);
    setSelectedTopicsMulti([]);
    setFeedback("");
    setUiError("");
    resetCurrentTest();
  };

  const handleReviewErrors = async () => {
    setReviewError("");
    setReviewText("");

    if (!currentTest || !currentTest.questions || lastResults.length === 0) {
      setReviewError("Сначала пройди тест, чтобы были ошибки для разбора.");
      return;
    }

    setReviewLoading(true);
    try {
      const res = await fetch("/api/review-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: currentTest.subject,
          topic: currentTest.topics.map((t) => t.title),
          questions: currentTest.questions,
          userAnswers: lastResults.map((r) =>
            r ? r.selectedIndex : null
          ),
        }),
      });

      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        throw new Error(
          data.error ||
            data.details ||
            "Не удалось получить разбор ошибок. Попробуй ещё раз."
        );
      }

      const data = await res.json();
      setReviewText(data.analysis || "Разбор получен, но текст пустой.");
    } catch (error) {
      console.error(error);
      setReviewError(
        error?.message ||
          "Произошла ошибка при разборе ошибок. Попробуй ещё раз."
      );
    } finally {
      setReviewLoading(false);
    }
  };

  const handleExplainTopic = async () => {
    setExplainError("");
    setExplainText("");

    let topicTitle = "";

    if (topicSource === "custom") {
      topicTitle = customTopicTitle.trim();
    } else {
      const selected = weakTopicsForSubject.filter((t) =>
        selectedTopicsMulti.includes(t.id)
      );
      if (selected.length > 0) {
        topicTitle = selected.map((t) => t.title).join(", ");
      } else if (weakTopicsForSubject.length > 0) {
        topicTitle = weakTopicsForSubject[0].title;
      }
    }

    if (!topicTitle) {
      setExplainError(
        "Чтобы объяснить тему, сначала укажи тему вручную или выбери слабые темы."
      );
      return;
    }

    setExplainLoading(true);
    try {
      const res = await fetch("/api/explain-topic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: selectedSubject,
          topic: topicTitle,
          level: context.level || "старшеклассник",
        }),
      });

      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        throw new Error(
          data.error ||
            data.details ||
            "Не удалось получить объяснение темы. Попробуй ещё раз."
        );
      }

      const data = await res.json();
      setExplainText(
        data.explanation || "Объяснение получено, но текст пустой."
      );
    } catch (error) {
      console.error(error);
      setExplainError(
        error?.message ||
          "Произошла ошибка при объяснении темы. Попробуй ещё раз."
      );
    } finally {
      setExplainLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to.black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from.white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
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

  const currentQuestion =
    currentTest && currentTest.questions
      ? currentTest.questions[currentQuestionIndex]
      : null;

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

      {/* Левое меню */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-60 md:w-64 p-6 space-y-6 transform transition-transform duration-300 z-40
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        bg-gradient-to-b from-black/50 via-[#2E003E]/85 to-black/80 border-r border-white/10`}
      >
        <div className="mb-3">
          <div className="text-3xl font-extrabold tracking-tight bg-gradient.to-r from-[#FDF2FF] via-[#E5DEFF] to-white text-transparent bg-clip-text">
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
                  ${item.key === "tests" ? "bg-white/10" : "hover:bg-white/5"}
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

      {/* Контент */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
          <div
            className="
              w-full max-w-5xl
              grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]
              bg-black/35 bg-clip-padding backdrop-blur-sm
              border border-white/10
              rounded-3xl
              p-4 md:p-6
              shadow-[0_18px_45px_rgba(0,0,0,0.55)]
            "
          >
            {/* Левая колонка */}
            <aside className="space-y-4">
              <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
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

              <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-xs shadow-md bg-gradient-to-br from-purple-100 to-white">
                      ✨
                    </span>
                    <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                      Рекомендации NOOLIX
                    </p>
                  </div>
                </div>
                {recommendedTopics.length === 0 ? (
                  <p className="text-[11px] text-purple-100">
                    По текущему предмету нет явных слабых тем. Позже здесь
                    появятся предложения на основе карты знаний.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recommendedTopics.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 bg-black/50 border border.white/10 rounded-xl px-3 py-2"
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
                          onClick={() =>
                            handleQuickStartRecommendation(t)
                          }
                          className="text-[10px] px-2.5 py-1 rounded-full bg-white text-black font-semibold hover:bg-purple-100.transition text-center leading-tight w-[135px]"
                        >
                          Усвоить материал
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {testHistory.length > 0 && (
                <section className="bg-black/40 border border.white/10 rounded-2xl p-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Последние тесты
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
                          : "свой вариант";
                      const resultLabel =
                        typeof t.correctCount === "number" &&
                        typeof t.questionCount === "number"
                          ? `${t.correctCount}/${t.questionCount}`
                          : "—";
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between.gap-2.py-1 border-b border-white/5 last:border-b-0"
                        >
                          <div>
                            <p className="font-medium">{topicsLabel}</p>
                            <p className="text-[10px] text-purple-200/80">
                              {t.subject} • {sourceLabel} • результат:{" "}
                              {resultLabel}
                            </p>
                          </div>
                          <span className="text-[10px] text-purple-200/70">
                            {new Date(
                              t.createdAt
                            ).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </aside>

            {/* Правая колонка */}
            <section className="flex flex-col gap-4">
              <header className="border-b border-white/10 pb-3 space-y-2">
                <div>
                  <h1 className="text-sm md:text-base font-semibold">
                    Тесты и тренировки по предмету
                  </h1>
                  <p className="text-[11px] text-purple-200 mt-1">
                    Выбери, как собирать тест, уровень сложности и темы. После
                    теста NOOLIX обновит карту знаний по тем темам, которые были
                    в вопросах.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                   .onClick={() => setSelectedMode("topic_quick")}
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
                    className="text-[11px] px-3 py-1 rounded-full border bg-black/40 border-white/15 text-purple-300/70.cursor-not-allowed"
                  >
                    Смешанный тест по предмету (скоро)
                  </button>
                </div>
              </header>

              {selectedMode === "topic_quick" && (
                <div className="space-y-4">
                  <section className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
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
                          onClick={() => {
                            setTopicSource("custom");
                            resetCurrentTest();
                          }}
                          className={`text-[11px] px-3 py-1 rounded-full border ${
                            topicSource === "custom"
                              ? "bg-white text-black border-white"
                              : "bg-black/40 text-purple-100 border-white/20 hover:bg-white/5"
                          } transition`}
                        >
                          Свой вариант
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTopicSource("weak");
                            resetCurrentTest();
                          }}
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

                    {/* Свой вариант */}
                    {topicSource === "custom" && (
                      <div className="grid gap-3 md:grid-cols-3 text-xs md:text-sm mt-2">
                        <div className="space-y-1">
                          <p className="text-[11px] text-purple-200/90">
                            Предмет
                          </p>
                          <select
                            className="w-full px-2 py-2 rounded-xl bg-black/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300"
                            value={selectedSubject}
                            onChange={(e) => {
                              setSelectedSubject(e.target.value);
                              setSelectedTopicsMulti([]);
                              resetCurrentTest();
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
                            Тема (напиши сам)
                          </p>
                          <input
                            type="text"
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border.border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300 text-xs md:text-sm"
                            placeholder='Например: «Интегралы», «Сложное предложение», «Второй закон Ньютона»'
                            value={customTopicTitle}
                            onChange={(e) =>
                              setCustomTopicTitle(e.target.value)
                            }
                          />
                        </div>
                      </div>

                    {/* Слабые темы */}
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
                                className="flex items-center justify-between gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-2.cursor-pointer"
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

                                        {/* Количество вопросов + сложность + пояснение */}
                    <div className="grid gap-3 md:grid-cols-4 text-xs md:text-sm mt-2">
                      {/* Количество вопросов */}
                      <div className="space-y-1">
                        <p className="text-[11px] text-purple-200/90">
                          Количество вопросов
                        </p>
                        <select
                          className="w-full px-2 py-2 rounded-xl bg-black/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-300"
                          value={questionCount}
                          onChange={(e) =>
                            setQuestionCount(Number(e.target.value))
                          }
                        >
                          <option value={5}>5 вопросов</option>
                          <option value={10}>10 вопросов</option>
                        </select>
                      </div>

                      {/* Сложность */}
                      <div className="space-y-1">
                        <p className="text-[11px] text-purple-200/90">
                          Сложность
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setDifficulty("easy")}
                            className={`text-[11px] px-3 py-1 rounded-full border ${
                              difficulty === "easy"
                                ? "bg-white text-black border-white"
                                : "bg-black/40 text-purple-100 border-white/20 hover:bg-white/5"
                            } transition`}
                          >
                            Лёгкий
                          </button>

                          <button
                            type="button"
                            onClick={() => setDifficulty("medium")}
                            className={`text-[11px] px-3 py-1 rounded-full border ${
                              difficulty === "medium"
                                ? "bg-white text-black border-white"
                                : "bg-black/40 text-purple-100 border-white/20 hover:bg-white/5"
                            } transition`}
                          >
                            Средний
                          </button>

                          <button
                            type="button"
                            onClick={() => setDifficulty("hard")}
                            className={`text-[11px] px-3 py-1 rounded-full border ${
                              difficulty === "hard"
                                ? "bg-white text-black border-white"
                                : "bg-black/40 text-purple-100 border-white/20 hover:bg-white/5"
                            } transition`}
                          >
                            Сложный
                          </button>
                        </div>
                      </div>

                      {/* Пояснение справа */}
                      <div className="space-y-1 md:col-span-2 text-[11px] text-purple-200/90">
                        <p>Что будет дальше?</p>
                        <p>
                          NOOLIX сгенерирует тест на выбранном уровне сложности
                          и после выполнения обновит карту знаний по тем темам,
                          которые были в тесте.
                        </p>
                      </div>
                    </div>
                    {/* Кнопки: объяснить тему + начать тест */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex flex-col gap-2 text-[11px] text-purple-200/80">
                        <p>
                          После завершения теста статус тем обновится в{" "}
                          <span className="font-semibold">
                            “Карте знаний”
                          </span>
                          .
                        </p>
                        <button
                          type="button"
                          onClick={handleExplainTopic}
                          disabled={explainLoading}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-white/30 hover:bg-white/5.disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {explainLoading
                            ? "Объясняем тему…"
                            : "Объяснить тему перед тестом"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartTest}
                        disabled={isGenerating}
                        className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold.shadow-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {isGenerating ? "Генерируем тест…" : "Начать тест"}
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
                    {explainError && (
                      <p className="text-[11px] text-red-300 mt-1">
                        {explainError}
                      </p>
                    )}
                  </section>

                  {/* Объяснение темы */}
                  {explainText && (
                    <section className="bg-black/45 border border-white/10 rounded-2xl p-4 space-y-2">
                      <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                        Объяснение темы
                      </p>
                      <div className="text-xs md:text-sm whitespace-pre-wrap text-purple-50">
                        {explainText}
                      </div>
                    </section>
                  )}

                  {/* Сам тест */}
                  {currentTest && currentQuestion && !testFinished && (
                    <section className="bg-black/45 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-purple-200/90">
                        <span>
                          Вопрос {currentQuestionIndex + 1} из{" "}
                          {currentTest.questions.length}
                        </span>
                        <span>
                          Тема: {currentQuestion.topicTitle} •{" "}
                          <span className="capitalize">
                            {currentQuestion.difficulty}
                          </span>
                        </span>
                      </div>
                      <div className="text-xs md:text-sm font-semibold">
                        {currentQuestion.question}
                      </div>
                      <div className="space-y-2 text-xs md:text-sm">
                        {currentQuestion.options.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedOptionIndex(idx)}
                            className={`w-full text-left px-3 py-2 rounded-xl border.transiton ${
                              selectedOptionIndex === idx
                                ? "bg-purple-500/80 border-purple-300 text-white"
                                : "bg-black/60 border-white/15 hover:bg-white/5"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAnswerAndNext}
                          className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-md hover:bg-purple-100 transition"
                        >
                          {currentQuestionIndex ===
                          currentTest.questions.length - 1
                            ? "Завершить тест"
                            : "Ответить и дальше"}
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Результат теста + разбор ошибок */}
                  {testFinished && testSummary && (
                    <section className="bg-black/45 border.border-white/10 rounded-2xl p-4 space-y-3">
                      <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                        Результат теста
                      </p>
                      <p className="text-xs md:text-sm text-purple-50">
                        Ты ответил правильно на{" "}
                        <span className="font-semibold">
                          {testSummary.correctCount} из {testSummary.total}
                        </span>{" "}
                        вопросов. Карта знаний по этим темам обновлена.
                      </p>
                      <div className="space-y-1 text-[11px] text-purple-200/90">
                        {Object.entries(testSummary.perTopic).map(
                          ([topicId, stat]) => {
                            if (topicId === "custom") return null;
                            const accuracy =
                              stat.total > 0
                                ? Math.round(
                                    (stat.correct / stat.total) * 100
                                  )
                                : 0;
                            return (
                              <div
                                key={topicId}
                                className="flex.items-center justify-between.gap-2"
                              >
                                <span>{stat.title}</span>
                                <span>{accuracy}% верных ответов</span>
                              </div>
                            );
                          }
                        )}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleReviewErrors}
                          disabled={reviewLoading}
                          className="px-4 py-2 rounded-full border border-white/40 text-xs text-purple-100 hover:bg-white/5.disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reviewLoading
                            ? "Разбираем ошибки…"
                            : "Разбор ошибок"}
                        </button>
                        <button
                          type="button"
                          onClick={resetCurrentTest}
                          className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-md hover:bg-purple-100.transition"
                        >
                          Пройти ещё один тест
                        </button>
                      </div>
                      {reviewError && (
                        <p className="text-[11px] text-red-300 mt-1">
                          {reviewError}
                        </p>
                      )}
                      {reviewText && (
                        <div className="mt-3 border-t border-white/10 pt-3">
                          <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                            Разбор ошибок
                          </p>
                          <div className="text-xs md:text-sm whitespace-pre-wrap text-purple-50">
                            {reviewText}
                          </div>
                        </div>
                      )}
                    </section>
                  )}
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
