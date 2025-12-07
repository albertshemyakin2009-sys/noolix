// pages/index.js
import { useState, useEffect } from "react";

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

const SUBJECT_OPTIONS = [
  "Математика",
  "Физика",
  "Русский язык",
  "Английский язык",
];

const LEVEL_OPTIONS = ["7–9 класс", "10–11 класс", "1 курс вуза"];

const CONTEXT_STORAGE_KEY = "noolixContext";

function getGreetingByHour() {
  const h = new Date().getHours();
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subject, setSubject] = useState("Математика");
  const [level, setLevel] = useState("10–11 класс");
  const [greeting, setGreeting] = useState("Добро пожаловать");
  const [lastActivity, setLastActivity] = useState(
    "Математика — логарифмы (пример, до реальных данных)"
  );

  // Инициализация: подтягиваем контекст
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
      if (raw) {
        const ctx = JSON.parse(raw);
        if (ctx.subject && SUBJECT_OPTIONS.includes(ctx.subject)) {
          setSubject(ctx.subject);
        }
        if (ctx.level && LEVEL_OPTIONS.includes(ctx.level)) {
          setLevel(ctx.level);
        }
      }
    } catch (e) {
      console.warn("Failed to read context on home", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Сохраняем контекст
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const ctx = {
        subject,
        level,
        mode: "exam_prep",
      };
      window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(ctx));
    } catch (e) {
      console.warn("Failed to save context on home", e);
    }
  }, [subject, level]);

  // Приветствие по времени суток
  useEffect(() => {
    setGreeting(getGreetingByHour());
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">
            Загружаем твоё пространство учёбы…
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

      {/* Левое меню */}
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
            Тьютор с ИИ для школьников и студентов
          </p>
        </div>

        <nav className="space-y-3 text-sm md:text-base">
          <div className="space-y-2">
            {primaryMenuItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition
                  ${item.key === "home" ? "bg-white/15" : "hover:bg-white/5"}
                `}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md
                    bg-gradient-to-br from-purple-100 to-white
                    ${item.key === "home" ? "ring-2 ring-purple-200" : ""}
                  `}
                >
                  {item.icon}
                </span>
                <span className={item.key === "home" ? "font-semibold" : ""}>
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
      <div className="flex-1 flex flex-col.min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex.justify-center">
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
                    Начни с выбора предмета или перейди сразу к диалогу с
                    тьютором. Всё обучение — в одном месте.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <a
                      href="/chat"
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white text-black text-xs md:text-sm font-semibold shadow-md hover:bg-purple-100 transition cursor-pointer"
                    >
                      Начать диалог с тьютором
                    </a>
                    <a
                      href="/progress"
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-white/40 text-xs md:text-sm text-purple-100 hover:bg-white/10 transition cursor-pointer"
                    >
                      Открыть карту знаний
                    </a>
                  </div>

                  <p className="text-xs md:text-sm text-purple-300/90">
                    Последняя активность:{" "}
                    <span className="font-semibold">{lastActivity}</span>
                  </p>
                  <p className="text-[11px] text-purple-300/80">
                    Режим: подготовка к экзамену
                  </p>
                </div>

                {/* Краткий контекст: предмет и уровень */}
                <div className="w-full md:w-[260px] bg-black/35 border border-white/15 rounded-2xl p-4 space-y-3">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Твой контекст
                  </p>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-purple-200">Предмет</p>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded-2xl bg-black/60 border border-white/20 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                      >
                        {SUBJECT_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-purple-200">Уровень</p>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full rounded-2xl bg-black/60 border border-white/20 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-300/70"
                      >
                        {LEVEL_OPTIONS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-purple-200/80">
                    Эти настройки используются в диалоге, карте знаний, целях и
                    библиотеке.
                  </p>
                </div>
              </div>
            </section>

            {/* Онбординг: с чего начать */}
            <section className="bg-black/25 border border-white/10 rounded-2xl p-5 md:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-white text-black text-sm shadow-md">
                  🧭
                </span>
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Если ты здесь впервые
                </p>
              </div>
              <h2 className="text-lg md:text-xl font-semibold">
                С чего начать в NOOLIX
              </h2>
              <div className="grid md:grid-cols-3 gap-3 text-xs md:text-sm text-purple-100">
                <div className="space-y-1 bg-white/5 rounded-2xl p-3 border border-white/10">
                  <p className="text-[11px] font-semibold text-purple-100 flex items-center gap-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-300/90 text-black text-[10px]">
                      1
                    </span>
                    Выбери предмет и уровень
                  </p>
                  <p className="text-[11px] text-purple-200/90">
                    В блоке справа задай, что тебе актуально — например,
                    “Математика, 10–11 класс”.
                  </p>
                </div>
                <div className="space-y-1 bg-white/5 rounded-2xl p-3 border border-white/10">
                  <p className="text-[11px] font-semibold text-purple-100 flex items-center gap-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-300/90 text-black text-[10px]">
                      2
                    </span>
                    Задай вопрос в диалоге
                  </p>
                  <p className="text-[11px] text-purple-200/90">
                    Перейди в диалог и расскажи, что тебе сейчас сложно —
                    тему, задачу или экзамен.
                  </p>
                  <a
                    href="/chat"
                    className="inline-flex mt-1 text-[11px] text-purple-100 underline underline-offset-2 hover:text-white"
                  >
                    Открыть диалог →
                  </a>
                </div>
                <div className="space-y-1 bg-white/5 rounded-2xl p-3 border border-white/10">
                  <p className="text-[11px] font-semibold text-purple-100 flex items-center gap-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-300/90 text-black text-[10px]">
                      3
                    </span>
                    Отметь темы и создай цель
                  </p>
                  <p className="text-[11px] text-purple-200/90">
                    В карте знаний отмечай, что даётся сложно, а в целях
                    зафиксируй, чего хочешь добиться.
                  </p>
                  <div className="flex gap-2 mt-1">
                    <a
                      href="/progress"
                      className="text-[11px] text-purple-100 underline underline-offset-2 hover:text-white"
                    >
                      К карте знаний →
                    </a>
                    <a
                      href="/goals"
                      className="text-[11px] text-purple-100 underline underline-offset-2 hover:text-white"
                    >
                      К целям →
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Блок: быстрые действия */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7.items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-white text-black text-sm shadow-md">
                  ⚡
                </span>
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Зона: быстрые действия
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-xs md:text-sm">
                <a
                  href="/chat"
                  className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:-translate-y-0.5 hover:shadow-xl hover:border-white/20 transition-all duration-200 shadow-md"
                >
                  <div className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to.white text-black text-sm shadow-md">
                    💬
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-lg">
                      Задать вопрос тьютору
                    </h3>
                    <p className="text-xs text-purple-200 mb-3">
                      Объяснение темы, разбор задачи, мини-тест — в одном
                      диалоге.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-purple-200">
                    <span className="font-semibold">К диалогу →</span>
                    <span className="opacity-80">
                      {subject} • {level}
                    </span>
                  </div>
                </a>

                <a
                  href="/goals"
                  className="bg-black/30 border border-white/10 rounded-2xl p-4 flex.flex-col justify-between relative overflow-hidden hover:-translate-y-0.5 hover:shadow-xl hover:border-white/20 transition-all.duration-200 shadow-md"
                >
                  <div className="absolute top-3 right-3 inline-flex h-7 w-7.items-center justify-center rounded-full bg-gradient-to-br.from-purple-100 to-white text-black text-sm shadow-md">
                    🎯
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-lg">
                      Поставить цель по предмету
                    </h3>
                    <p className="text-xs text-purple-200 mb-3">
                      Сформулируй одну цель — например, подготовку к пробнику
                      или экзамену.
                    </p>
                  </div>
                  <div className="flex items-center.justify-between text-xs text-purple-200">
                    <span className="font-semibold">К целям →</span>
                    <span className="opacity-80">Шаги и прогресс</span>
                  </div>
                </a>

                <a
                  href="/progress"
                  className="bg-black/30 border border-white/10 rounded-2xl p-4.flex flex-col justify-between relative overflow-hidden hover:-translate-y-0.5 hover:shadow-xl hover:border-white/20 transition-all duration-200.shadow-md"
                >
                  <div className="absolute top-3 right-3 inline-flex h-7 w-7.items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-white text-black text-sm shadow-md">
                    📈
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-lg">
                      Посмотреть прогресс
                    </h3>
                    <p className="text-xs text-purple-200 mb-3">
                      Отслеживай темы, в которых ты уже силён, и зоны для
                      роста.
                    </p>
                  </div>
                  <div className="flex items-center.justify-between text-xs text-purple-200">
                    <span className="font-semibold">К прогрессу →</span>
                    <span className="opacity-80">Карта знаний</span>
                  </div>
                </a>
              </div>
            </section>

            {/* Новости */}
            <section className="bg-black/25 border border-white/10 rounded-2xl p-5 md:p-6 space-y-3">
              <div className="flex items-center.gap-2">
                <span className="inline-flex h-7 w-7 items-center.justify-center rounded-full bg-gradient-to-br from-purple-100 to-white text-black text-sm shadow-md">
                  🔔
                </span>
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Зона: информация и рекомендации
                </p>
              </div>
              <h2 className="text-xl font-semibold mb-1">
                Новости и обновления
              </h2>
              <p className="text-xs text-purple-200">
                Здесь в будущем будут отображаться новые функции, обновления
                платформы и твои персональные рекомендации.
              </p>
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
