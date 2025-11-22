// pages/progress.js
import { useEffect, useState } from 'react';

const primaryMenuItems = [
  { label: 'Главная', href: '/', icon: '🏛', key: 'home' },
  { label: 'Диалог', href: '/chat', icon: '💬', key: 'chat' },
  { label: 'Тесты', href: '/tests', icon: '🧪', key: 'tests' },
  { label: 'Прогресс', href: '/progress', icon: '📈', key: 'progress' },
];

const secondaryMenuItems = [
  { label: 'Библиотека', href: '/library', icon: '📚', key: 'library' },
  { label: 'Цели', href: '/goals', icon: '🎯', key: 'goals' },
  { label: 'Профиль', href: '/profile', icon: '👤', key: 'profile' },
];

// Базовый список тем по предметам (MVP)
const TOPICS = {
  'Математика': [
    { id: 'math_quadratic', title: 'Квадратные уравнения', area: 'Алгебра', levelHint: '8–9 класс' },
    { id: 'math_linear', title: 'Линейные уравнения и системы', area: 'Алгебра', levelHint: '7–8 класс' },
    { id: 'math_derivative', title: 'Производная и её смысл', area: 'Математический анализ', levelHint: '10–11 класс' },
    { id: 'math_trig', title: 'Тригонометрические уравнения', area: 'Алгебра', levelHint: '10–11 класс' },
  ],
  'Физика': [
    { id: 'phys_newton2', title: 'Второй закон Ньютона', area: 'Механика', levelHint: '9–10 класс' },
    { id: 'phys_kinematics', title: 'Равноускоренное движение', area: 'Механика', levelHint: '9 класс' },
    { id: 'phys_energy', title: 'Работа и энергия', area: 'Механика', levelHint: '9–10 класс' },
  ],
  'Русский язык': [
    { id: 'rus_participles', title: 'Причастные обороты', area: 'Синтаксис', levelHint: '7–9 класс' },
    { id: 'rus_spelling', title: 'Правописание Н и НН', area: 'Орфография', levelHint: '8–9 класс' },
    { id: 'rus_essay', title: 'Структура сочинения', area: 'Письменная речь', levelHint: '9–11 класс' },
  ],
  'Английский язык': [
    { id: 'eng_tenses', title: 'Основные времена (Present/Past/Future)', area: 'Грамматика', levelHint: '7–9 класс' },
    { id: 'eng_perf', title: 'Perfect времена', area: 'Грамматика', levelHint: '9–11 класс' },
    { id: 'eng_vocab', title: 'Расширение словарного запаса', area: 'Лексика', levelHint: 'Все уровни' },
  ],
};

const KNOWLEDGE_STORAGE_KEY = 'noolixKnowledgeMap';

// score: 0–1, label — текст, attempts — сколько раз обновляли
const defaultTopicState = {
  score: 0,
  label: 'Не начато',
  attempts: 0,
  lastUpdated: null,
};

function scoreToColor(score) {
  if (score >= 0.8) return 'bg-green-500/80';
  if (score >= 0.4) return 'bg-yellow-400/80';
  if (score > 0) return 'bg-red-500/80';
  return 'bg-slate-500/60';
}

function scoreToLabel(score) {
  if (score >= 0.8) return 'Уверенно';
  if (score >= 0.4) return 'Так себе';
  if (score > 0) return 'Слабая зона';
  return 'Не начато';
}

export default function ProgressPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [context, setContext] = useState({
    subject: 'Математика',
    level: '10–11 класс',
  });
  const [knowledgeMap, setKnowledgeMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Загружаем контекст и карту знаний
  useEffect(() => {
    try {
      const rawContext = window.localStorage.getItem('noolixContext');
      if (rawContext) {
        const ctx = JSON.parse(rawContext);
        setContext((prev) => ({
          ...prev,
          ...ctx,
        }));
      }

      const rawKnowledge = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
      if (rawKnowledge) {
        const parsed = JSON.parse(rawKnowledge);
        if (parsed && typeof parsed === 'object') {
          setKnowledgeMap(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load context/knowledge map', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Сохраняем карту знаний при изменениях
  useEffect(() => {
    try {
      window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(knowledgeMap));
    } catch (e) {
      console.warn('Failed to save knowledge map', e);
    }
  }, [knowledgeMap]);

  const subjectTopics = TOPICS[context.subject] || [];

  const getTopicState = (subject, topicId) => {
    const subjectEntry = knowledgeMap[subject];
    if (!subjectEntry || !subjectEntry[topicId]) return defaultTopicState;
    return subjectEntry[topicId];
  };

  const setTopicLevel = (subject, topicId, level) => {
    let score = 0;
    if (level === 'weak') score = 0.2;
    if (level === 'medium') score = 0.5;
    if (level === 'strong') score = 0.9;

    setKnowledgeMap((prev) => {
      const prevSubject = prev[subject] || {};
      const prevTopic = prevSubject[topicId] || defaultTopicState;
      const updatedTopic = {
        score,
        label: scoreToLabel(score),
        attempts: (prevTopic.attempts || 0) + 1,
        lastUpdated: new Date().toISOString(),
      };
      return {
        ...prev,
        [subject]: {
          ...prevSubject,
          [topicId]: updatedTopic,
        },
      };
    });
  };

  // Подсчёт статистики по текущему предмету
  const stats = subjectTopics.reduce(
    (acc, topic) => {
      const state = getTopicState(context.subject, topic.id);
      if (state.score >= 0.8) acc.strong += 1;
      else if (state.score >= 0.4) acc.medium += 1;
      else if (state.score > 0) acc.weak += 1;
      else acc.notStarted += 1;
      return acc;
    },
    { strong: 0, medium: 0, weak: 0, notStarted: 0 }
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from.white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">Загружаем карту знаний…</p>
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
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
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
                  ${item.key === 'progress' ? 'bg-white/15' : 'hover:bg-white/5'}
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white
                    ${item.key === 'progress' ? 'ring-2 ring-purple-200' : ''}
                  `}
                >
                  {item.icon}
                </span>
                <span className={item.key === 'progress' ? 'font-semibold' : ''}>
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
            {/* Левая колонка — резюме по предмету */}
            <aside className="space-y-4">
              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Карта знаний
                </p>
                <h2 className="text-sm font-semibold mb-1">
                  {context.subject}
                </h2>
                <p className="text-xs text-purple-100">
                  Уровень: <span className="font-semibold">{context.level}</span>
                </p>
                <p className="text-[11px] text-purple-300/80 mt-1">
                  Отмечай, насколько уверенно ты чувствуешь каждую тему.
                </p>
              </section>

              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Сводка по темам
                </p>
                <div className="space-y-2 text-[11px] text-purple-100">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      Уверенные темы
                    </span>
                    <span>{stats.strong}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-300" />
                      Средний уровень
                    </span>
                    <span>{stats.medium}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      Слабые зоны
                    </span>
                    <span>{stats.weak}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      Не трогал
                    </span>
                    <span>{stats.notStarted}</span>
                  </div>
                </div>
              </section>

              <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Как использовать
                </p>
                <p className="text-[11px] text-purple-100">
                  1. Поставь честные метки по темам.<br />
                  2. Начни с красных и жёлтых.<br />
                  3. Жми “Потренироваться в чате” — NOOLIX поможет закрыть пробелы.
                </p>
              </section>
            </aside>

            {/* Правая колонка — список тем */}
            <section className="flex flex-col gap-4">
              <header className="border-b border-white/10 pb-3">
                <h1 className="text-sm md:text-base font-semibold">
                  Темы по предмету: {context.subject}
                </h1>
                <p className="text-[11px] text-purple-200 mt-1">
                  Это твоя личная карта знаний. Отмечай уровень по каждой теме, а NOOLIX поможет их прокачать.
                </p>
              </header>

              {subjectTopics.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  Для этого предмета пока нет списка тем. Позже мы добавим сюда больше разделов.
                </p>
              ) : (
                <div className="space-y-3">
                  {subjectTopics.map((topic) => {
                    const state = getTopicState(context.subject, topic.id);
                    return (
                      <div
                        key={topic.id}
                        className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                              {topic.area}
                            </p>
                            <h3 className="text-sm font-semibold">
                              {topic.title}
                            </h3>
                            <p className="text-[11px] text-purple-200">
                              Рекомендуемый уровень: {topic.levelHint}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] ${scoreToColor(
                                state.score
                              )}`}
                            >
                              {state.label}
                            </span>
                            {state.lastUpdated && (
                              <span className="text-[10px] text-purple-200/80">
                                Обновлено: {new Date(state.lastUpdated).toLocaleDateString('ru-RU')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-purple-200/90 mr-1">
                            Как ты чувствуешь эту тему?
                          </span>
                          <button
                            type="button"
                            onClick={() => setTopicLevel(context.subject, topic.id, 'weak')}
                            className="px-3 py-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition"
                          >
                            Не понимаю
                          </button>
                          <button
                            type="button"
                            onClick={() => setTopicLevel(context.subject, topic.id, 'medium')}
                            className="px-3 py-1 rounded-full bg-yellow-400/80 hover:bg-yellow-400 text-black transition"
                          >
                            Так себе
                          </button>
                          <button
                            type="button"
                            onClick={() => setTopicLevel(context.subject, topic.id, 'strong')}
                            className="px-3 py-1 rounded-full bg-green-500/80 hover:bg-green-500 text-white transition"
                          >
                            Уверенно
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-purple-200/80">
                          <span>
                            Обновлений по теме: {state.attempts || 0}
                          </span>
    <a
  href={`/chat?topic=${encodeURIComponent(topic.title)}`}
  className="px-3 py-1 rounded-full border border-white/25 hover:bg-white/10 transition"
>
  Потренироваться в чате
</a>


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
          © 2025 NOOLIX — образовательная платформа будущего. Связь: support@noolix.ai
        </footer>
      </div>
    </div>
  );
}
