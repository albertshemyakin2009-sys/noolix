import { useState, useEffect } from "react";

const brandConfig = {
  brandName: "NOOLIX",
  tagline: "AI-платформа для учёбы",
  supportEmail: "support@noolix.ai",
  footerDescription: "образовательная платформа будущего",
};

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

function getWeakTopicsForSubject(knowledgeMap, subject) {
  if (!knowledgeMap || typeof knowledgeMap !== "object") return [];
  const subjEntry = knowledgeMap[subject];
  if (!subjEntry || typeof subjEntry !== "object") return [];

  const topics = Object.entries(subjEntry)
    .filter(([_, v]) => v && typeof v.score === "number")
    .map(([name, v]) => ({ name, score: v.score }));

  const weak = topics.filter((t) => t.score < 0.8);
  weak.sort((a, b) => a.score - b.score);
  return weak;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [context, setContext] = useState({
    subject: "Математика",
    level: "10–11 класс",
    mode: "exam_prep",
  });
  const [continueChats, setContinueChats] = useState([]);
  const [recommendedTopics, setRecommendedTopics] = useState([]);
  const [currentGoal, setCurrentGoal] = useState(null);

  // Инициализация: контекст, цель, "твои чаты", рекомендации
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // контекст
      const rawContext = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
      let ctx = {
        subject: "Математика",
        level: "10–11 класс",
        mode: "exam_prep",
      };
      if (rawContext) {
        const parsed = JSON.parse(rawContext);
        ctx = { ...ctx, ...parsed };
      }

      // текущая цель
      let goal = null;
      try {
        const rawGoal = window.localStorage.getItem("noolixCurrentGoal");
        if (rawGoal) {
          const parsedGoal = JSON.parse(rawGoal);
          if (parsedGoal && typeof parsedGoal === "object") {
            goal = parsedGoal;
            if (parsedGoal.subject) {
              ctx = { ...ctx, subject: parsedGoal.subject };
            }
          }
        }
      } catch (eGoal) {
        console.warn("Failed to read noolixCurrentGoal", eGoal);
      }

      setContext(ctx);
      if (goal) setCurrentGoal(goal);

      // "твои чаты"
      try {
        const rawContinue = window.localStorage.getItem(
          "noolixLibraryContinue"
        );
        if (rawContinue) {
          const parsed = JSON.parse(rawContinue);
          if (Array.isArray(parsed)) {
            const sorted = [...parsed].sort((a, b) => {
              const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
              const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
              return db - da;
            });
            setContinueChats(sorted.slice(0, 3));
          }
        }
      } catch (eCont) {
        console.warn("Failed to read noolixLibraryContinue", eCont);
      }

      // рекомендации по слабым темам
      try {
        const rawKnowledge = window.localStorage.getItem("noolixKnowledgeMap");
        if (rawKnowledge) {
          const knowledge = JSON.parse(rawKnowledge);
          const weak = getWeakTopicsForSubject(knowledge, ctx.subject);
          setRecommendedTopics(weak.slice(0, 3));
        }
      } catch (eK) {
        console.warn("Failed to read noolixKnowledgeMap on home", eK);
      }
    } catch (e) {
      console.warn("Failed to init home page", e);
    }
  }, []);

  const hasRecommendations = recommendedTopics.length > 0;

  const steps = [
    {
      number: 1,
      title: "Выбери предмет и уровень",
      text: "Задай контекст: ОГЭ, ЕГЭ или просто класс и предмет. Так тьютор понимает твой уровень.",
      icon: "🎯",
    },
    {
      number: 2,
      title: "Сформулируй цель",
      text: "Например: «Подготовиться к пробнику по физике» или «Подтянуть дроби за 8 класс».",
      icon: "📝",
    },
    {
      number: 3,
      title: "Начни диалог",
      text: "Попроси объяснить тему, разобрать задачу по шагам или дать мини-тест.",
      icon: "💬",
    },
  ];

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
        className="absolute top-4 left-4 z-50 bg-white/95 text-black px-4 py-2 rounded shadow-md md:hidden text-xs font-semibold"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰ Меню
      </button>

      {/* Левое меню — тот же паттерн, что на библиотеке/диалоге */}
      <aside
        className={`fixed md:static top-0 left-0 h-full w-60 md:w-64 p-6 space-y-6 transform transition-transform.duration-300 z-40
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        bg-gradient-to-b from-black/40 via-[#2E003E]/85 to-transparent`}
      >
        <div className="mb-3">
          <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#FDF2FF] via-[#E5DEFF] to-white text-transparent bg-clip-text">
            {brandConfig.brandName}
          </div>
          <p className="text-xs text-purple-200 mt-1 opacity-80">
            {brandConfig.tagline}
          </p>
        </div>

        <nav className="space-y-3 text-sm md:text-base">
          <div className="space-y-2">
            {primaryMenuItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition ${
                  item.key === "home" ? "bg-white/15" : "hover:bg-white/5"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white ${
                    item.key === "home" ? "ring-2 ring-purple-200" : ""
                  }`}
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

      {/* Правая часть */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
          <div className="w-full max-w-5xl flex flex-col gap-6 bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {/* HERO */}
            <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] items-center">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-purple-200/80 bg-white/5 px-3 py-1 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>Личный ИИ-тьютор для школьников и студентов</span>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight">
                  Учись осознанно. <br className="hidden md:block" />
                  {brandConfig.brandName} помогает ставить цели, разбирать темы и закреплять их в
                  диалоге.
                </h1>
                <p className="text-xs md:text-sm text-purple-100/90 max-w-xl">
                  Настрой предмет и уровень, сформулируй цель — и дальше
                  платформа поможет шаг за шагом закрывать темы, тренировать
                  слабые места и готовиться к экзаменам.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="/chat"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-gradient-to-br from-purple-300 to-purple-500 text-black text-xs md:text-sm font-semibold shadow-lg hover:opacity-95 transition"
                  >
                    Начать с диалога →
                  </a>
                  <a
                    href="/goals"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/20 bg-black/30 text-xs md:text-sm text-purple-50 hover:bg-white/5 transition"
                  >
                    Настроить учебные цели
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-purple-100 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Контекст сейчас
                  </p>
                  <div className="space-y-2">
  <div>
    <p className="text-[11px] text-purple-200/80 mb-1">Предмет</p>
    <select
      value={context.subject}
      onChange={(e) => {
        const next = { ...context, subject: e.target.value };
        setContext(next);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(next));
        }

        // обновим рекомендации сразу (по слабым темам)
        try {
          const rawKnowledge = window.localStorage.getItem("noolixKnowledgeMap");
          if (rawKnowledge) {
            const knowledge = JSON.parse(rawKnowledge);
            const weak = getWeakTopicsForSubject(knowledge, e.target.value);
            setRecommendedTopics(weak.slice(0, 3));
          } else {
            setRecommendedTopics([]);
          }
        } catch (_) {
          setRecommendedTopics([]);
        }
      }}
      className="w-full text-xs px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
    >
      <option>Математика</option>
      <option>Физика</option>
      <option>Русский язык</option>
      <option>Английский язык</option>
    </select>
  </div>

  <div>
    <p className="text-[11px] text-purple-200/80 mb-1">Уровень</p>
    <select
      value={context.level}
      onChange={(e) => {
        const next = { ...context, level: e.target.value };
        setContext(next);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(next));
        }
      }}
      className="w-full text-xs px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
    >
      <option>7–9 класс</option>
      <option>10–11 класс</option>
          </select>
  </div>
</div>

                  {currentGoal && (
                    <p>
                      Цель:{" "}
                      <span className="font-semibold">{currentGoal.title}</span>
                    </p>
                  )}
                  {!currentGoal && (
                    <p className="text-purple-200/80">
                      Цель пока не выбрана. Можно задать её на странице целей —
                      и {brandConfig.brandName} подстроит диалог и тесты под неё.
                    </p>
                  )}
                </div>

                <div className="bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-purple-100.space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Что может {brandConfig.brandName}
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Объяснять темы простым языком и в диалоге</li>
                    <li>Готовить мини-тесты по темам и целям</li>
                    <li>Помогать с картой знаний и слабых мест</li>
                    <li>Сохранять важные объяснения в библиотеку</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Блок: с чего начать */}
            <section className="bg-black/40 border border-white/10 rounded-2xl p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    С чего начать
                  </p>
                  <p className="text-xs md:text-sm text-purple-100/90">
                    Три шага, чтобы {brandConfig.brandName} начал работать на твой результат.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3 pt-1">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 flex flex-col justify-between gap-3 
                               transform transition-transform duration-200 hover:scale-[1.02] hover:bg-white/10 hover:shadow-lg fade-in-up"
                  >
                    {/* Верхняя связка: кружок + иконка */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-300 to-purple-500 text-black font-bold flex items-center justify-center shadow-md">
                        {step.number}
                      </div>
                      <div className="text-xl leading-none">{step.icon}</div>
                    </div>

                    {/* Название шага */}
                    <p className="text-sm md:text-base font-semibold">
                      {step.title}
                    </p>

                    {/* Подтекст */}
                    <p className="text-[11px] md:text-xs text-purple-100/85 leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Блок: Продолжить учёбу */}
            <section className="bg-black/40 border border-white/10 rounded-2xl p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Продолжить учёбу
                  </p>
                  <p className="text-xs md:text-sm text-purple-100/90">
                    Быстрый доступ к последним активным чатам и сессиям.
                  </p>
                </div>
                <a
                  href="/library"
                  className="text-[11px] md:text-xs text-purple-100 underline underline-offset-2 hover:text-white"
                >
                  Открыть библиотеку
                </a>
              </div>

              {continueChats.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  Пока нет активных чатов. Начни диалог по предмету — и здесь
                  появятся удобные кнопки для продолжения.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {continueChats.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-xs text-purple-100 flex flex-col justify-between"
                    >
                      <div>
                        <p className="font-semibold text-sm mb-1">
                          {item.title || "Диалог с тьютором"}
                        </p>
                        <p className="text-[11px] text-purple-200/80">
                          {item.subject} • {item.level}
                        </p>
                        {item.type && (
                          <p className="text-[11px] text-purple-200/80 mt-0.5">
                            Формат: {item.type}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-purple-200/80">
                        <span>Обновлено: {item.updatedAt || "Недавно"}</span>
                        <a
                          href="/chat"
                          className="underline underline-offset-2 hover:text-white"
                        >
                          Открыть чат →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Блок: Рекомендуем сегодня */}
            <section className="bg-black/40 border border-white/10 rounded-2xl p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Рекомендуем сегодня
                  </p>
                  <p className="text-xs md:text-sm text-purple-100/90">
                    Темы, которые логично закрыть в ближайшую сессию.
                  </p>
                </div>
                <a
                  href="/progress"
                  className="text-[11px] md:text-xs text-purple-100 underline underline-offset-2 hover:text-white"
                >
                  Открыть прогресс
                </a>
              </div>

              {!hasRecommendations ? (
                <p className="text-xs text-purple-200/80">
                  Как только появятся данные по слабым темам и тестам, здесь
                  будут появляться конкретные рекомендации по темам. Пока можно
                  просто попросить тьютора объяснить любую тему по предмету.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recommendedTopics.map((t) => (
                    <a
                      key={t.name}
                      href={`/chat?topic=${encodeURIComponent(t.name)}`}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-purple-300/60 text-[11px] md:text-xs text-purple-50 hover:bg-white/10 transition"
                    >
                      {t.name} · уровень {Math.round(t.score * 100)}%
                    </a>
                  ))}
                </div>
              )}

              {currentGoal && (
                <p className="text-[11px] text-purple-200/80 pt-1">
                  Цель сейчас:{" "}
                  <span className="font-semibold">{currentGoal.title}</span>.
                  Любую тему из рекомендаций можно разобрать прямо в диалоге и
                  сохранить объяснение в библиотеку.
                </p>
              )}
            </section>

</div>
        </main>

        <footer className="bg-[#1A001F]/90 border-t border-white/10 text-center py-3 text-xs text-purple-200">
          © 2025 {brandConfig.brandName} — {brandConfig.footerDescription}. Связь:
          {brandConfig.supportEmail}
        </footer>
      </div>

      {/* Локальная анимация появления карточек шагов через styled-jsx */}
      <style jsx>{`
        .fade-in-up {
          animation: fade-in-up 0.35s ease-out both;
        }
        .fade-in-up:nth-of-type(2) {
          animation-delay: 0.05s;
        }
        .fade-in-up:nth-of-type(3) {
          animation-delay: 0.1s;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
