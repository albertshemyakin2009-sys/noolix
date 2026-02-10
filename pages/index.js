import { useState, useEffect } from 'react';

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

const normalizeLevel = (lvl) => {
  const s = String(lvl || "").toLowerCase();
  if (!s) return "10–11 класс";
  if (s.includes("7") || s.includes("8") || s.includes("9")) return "7–9 класс";
  if (s.includes("10") || s.includes("11")) return "10–11 класс";
  if (s.includes("студ") || s.includes("вуз") || s.includes("курс")) return "10–11 класс";
  return "10–11 класс";
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subject, setSubject] = useState('Математика');
  const [level, setLevel] = useState('10–11 класс');
  const [greeting, setGreeting] = useState('Добро пожаловать');
  const [lastActivity, setLastActivity] = useState('Математика — логарифмы (пример, до реальных данных)');

  // имитация загрузки
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // приветствие по времени суток
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) {
      setGreeting('Доброе утро');
    } else if (hour < 18) {
      setGreeting('Добрый день');
    } else {
      setGreeting('Добрый вечер');
    }
  }, []);

  // подтягиваем контекст и последнюю активность из localStorage
  useEffect(() => {
    try {
      const rawContext = window.localStorage.getItem('noolixContext');
      if (rawContext) {
        const data = JSON.parse(rawContext);
        if (data.subject) setSubject(data.subject);
        if (data.level) setLevel(normalizeLevel(data.level));
      }

      const rawHistory = window.localStorage.getItem('noolixChatHistory');
      if (rawHistory) {
        const arr = JSON.parse(rawHistory);
        if (Array.isArray(arr) && arr.length > 0) {
          const reversed = [...arr].reverse();
          const lastUser = reversed.find((m) => m.role === 'user');
          const base = lastUser?.content || arr[arr.length - 1].content;
          if (base && typeof base === 'string') {
            const trimmed = base.length > 80 ? base.slice(0, 80) + '…' : base;
            setLastActivity(trimmed);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to read context/history', e);
    }
  }, []);

  // сохраняем текущий контекст
  useEffect(() => {
    try {
      const payload = {
        subject,
        level,
        mode: 'exam_prep',
      };
      window.localStorage.setItem('noolixContext', JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save context', e);
    }
  }, [subject, level]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white gap-3">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent animate-pulse tracking-wide">
          NOOLIX
        </h1>
        <div className="flex gap-1 text-sm text-purple-100">
          <span className="animate-pulse">•</span>
          <span className="animate-pulse opacity-70">•</span>
          <span className="animate-pulse opacity-40">•</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex relative">
      {/* Оверлей при открытом меню на мобильных */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Кнопка меню для мобильных */}
      <button
        className="absolute top-4 left-4 z-50 bg-white/95 text-black px-4 py-2 rounded shadow-md md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰ Меню
      </button>

      {/* Сайдбар */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-60 md:w-64 p-6 space-y-6
        transform transition-transform duration-300 z-40
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
                  ${item.key === 'home' ? 'bg-white/15' : 'hover:bg-white/5'}
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md
                    bg-gradient-to-br from-purple-100 to-white
                    ${item.key === 'home' ? 'ring-2 ring-purple-200' : ''}
                  `}
                >
                  {item.icon}
                </span>
                <span className={item.key === 'home' ? 'font-semibold' : ''}>
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

      {/* Основная зона */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
          <div className="w-full max-w-5xl flex flex-col gap-8 bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl px-4 py-6 md:px-8 md:py-8 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {/* Hero-блок */}
            <section className="space-y-4">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-purple-200/80 bg-white/5 px-3 py-1 rounded-full shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-300" />
                <span>Сегодня • Учёба в твоём ритме</span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {greeting}! Добро пожаловать в NOOLIX
                  </h1>
                  <p className="text-sm md:text-base text-purple-200 max-w-xl">
                    Начни с выбора предмета или перейди сразу к диалогу с тьютором. Всё обучение — в одном месте.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <a
                      href="/chat"
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white text-black text-xs md:text-sm font-semibold shadow-md hover:bg-purple-100 transition cursor-pointer"
                    >
                      Начать диалог с тьютором
                    </a>
                    <a
                      href="/tests"
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-white/40 text-xs md:text-sm text-purple-100 hover:bg-white/10 transition cursor-pointer"
                    >
                      Пройти тест
                    </a>
                  </div>

                  <p className="text-xs md:text-sm text-purple-300/90">
                    На этой неделе: <span className="font-semibold">3</span> сессии •{' '}
                    <span className="font-semibold">28</span> вопросов •{' '}
                    <span className="font-semibold">2</span> теста
                  </p>
                  <p className="text-[11px] text-purple-300/80">
                    Режим: подготовка к экзамену
                  </p>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-xs text-purple-100 flex flex-col gap-1 max-w-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-purple-300/80">
                      Выбранный предмет
                    </span>
                    <span className="text-lg">📘</span>
                  </div>
                  <div className="font-semibold text-sm">{subject}</div>
                  <div className="text-[11px] text-purple-300/80">Уровень: {level}</div>
                </div>
              </div>
            </section>

            {/* Зона: продолжить обучение */}
            <section className="bg-black/20 border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                  Зона: продолжить обучение
                </p>
                <h2 className="text-sm md:text-base font-semibold mb-1">
                  Продолжить с того места, где ты остановился
                </h2>
                <p className="text-xs text-purple-200">
                  Последняя активность: {lastActivity}
                </p>
              </div>
              <a
                href="/chat"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-white/30 text-xs md:text-sm text-purple-100 hover:bg-white/10 transition cursor-pointer"
              >
                Продолжить →
              </a>
            </section>

            {/* Зона выбора предмета / селекты */}
            <section className="bg-black/25 border border-white/10 rounded-2xl p-5 md:p-6 max-w-xl space-y-3">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80 mb-1">
                Зона: выбор предмета и уровня
              </p>
              <h2 className="text-xl font-semibold mb-1">Быстрый старт</h2>
              <p className="text-xs md:text-sm text-purple-200 mb-2">
                Выбери, с чего ты хочешь начать сегодня.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-purple-200 mb-1">
                    Предмет
                  </label>
                  <select
                    className="text-black px-3 py-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option>Математика</option>
                    <option>Физика</option>
                    <option>Русский язык</option>
                    <option>Английский язык</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-purple-200 mb-1">
                    Уровень
                  </label>
                  <select
                    className="text-black px-3 py-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option>7–9 класс</option>
                    <option>10–11 класс</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Зона быстрых действий */}
            <section className="space-y-3">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Зона: быстрые действия
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-black/20 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:-translate-y-0.5 hover:shadow-xl hover:border-white/20 transition-all duration-200 shadow-md">
                  <div className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-white text-black text-sm shadow-md">
                    💬
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-lg">Задать вопрос</h3>
                    <p className="text-xs text-purple-200 mb-3">
                      Перейди в диалог с тьютором и получи объяснение любой темы.
                    </p>
                  </div>
                  <a
                    href="/chat"
                    className="text-xs font-semibold text-purple-200 hover:underline cursor-pointer"
                  >
                    Открыть диалог →
                  </a>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:-translate-y-0.5 hover:shadow-xl hover:border-white/20 transition-all duration-200 shadow-md">
                  <div className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-white text-black text-sm shadow-md">
                    🧪
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-lg">Пройти тест</h3>
                    <p className="text-xs text-purple-200 mb-3">
                      Проверь свои знания по выбранному предмету и уровню.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-purple-200">
                    <a
                      href="/tests"
                      className="font-semibold hover:underline cursor-pointer"
                    >
                      К тестам →
                    </a>
                    <span className="opacity-80 cursor-pointer hover:underline">
                      Подробнее
                    </span>
                  </div>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:-translate-y-0.5 hover:shadow-xl hover:border-white/20 transition-all duration-200 shadow-md">
                  <div className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-white text-black text-sm shadow-md">
                    📈
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-lg">Посмотреть прогресс</h3>
                    <p className="text-xs text-purple-200 mb-3">
                      Отслеживай темы, в которых ты уже силён, и зоны для роста.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-purple-200">
                    <a
                      href="/progress"
                      className="font-semibold hover:underline cursor-pointer"
                    >
                      К прогрессу →
                    </a>
                    <span className="opacity-80 cursor-pointer hover:underline">
                      Подробнее
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Новости */}
            <section className="bg-black/25 border border-white/10 rounded-2xl p-5 md:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-white text-black text-sm shadow-md">
                  🔔
                </span>
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Зона: информация и рекомендации
                </p>
              </div>
              <h2 className="text-xl font-semibold mb-1">Новости и обновления</h2>
              <p className="text-xs text-purple-200">
                Здесь в будущем будут отображаться новые функции, обновления платформы и
                твои персональные рекомендации.
              </p>
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
