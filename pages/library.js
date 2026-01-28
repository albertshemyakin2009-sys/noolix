// pages/library.js
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

// Fallback-моки, если localStorage ещё пуст
const mockContinue = [
  {
    id: 1,
    title: "Диалог: Математика, 8–9 класс",
    subject: "Математика",
    level: "8–9 класс",
    type: "Диалог с тьютором",
    updatedAt: "Вчера",
  },
];

const mockSaved = [
  {
    id: 1,
    title: "Разбор задачи про вторую космическую скорость",
    subject: "Физика",
    level: "10–11 класс",
    from: "из диалога",
    savedAt: "3 дня назад",
  },
];

const mockCollections = [
  {
    id: 1,
    title: "ОГЭ: База по математике",
    subject: "Математика",
    level: "9 класс",
    topics: 14,
    tag: "ОГЭ",
  },
  {
    id: 2,
    title: "ЕГЭ: Кинематика",
    subject: "Физика",
    level: "10–11 класс",
    topics: 9,
    tag: "ЕГЭ",
  },
  {
    id: 3,
    title: "Русский: Подготовка к сочинению",
    subject: "Русский язык",
    level: "9–11 класс",
    topics: 7,
    tag: "Сочинение",
  },
  {
    id: 4,
    title: "Английский: Основные времена",
    subject: "Английский язык",
    level: "7–9 класс",
    topics: 10,
    tag: "Грамматика",
  },
];

const CONTEXT_STORAGE_KEY = "noolixContext";

export default function LibraryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("Все предметы");
  const [levelFilter, setLevelFilter] = useState("Все уровни");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [savedFromStorage, setSavedFromStorage] = useState(null);
  const [continueFromStorage, setContinueFromStorage] = useState(null);
  const [showSaved, setShowSaved] = useState(false);

  // Подтягиваем предмет/уровень из контекста, чтобы фильтры были "в теме"
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const rawContext = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
      if (rawContext) {
        const ctx = JSON.parse(rawContext);
        if (ctx.subject) setSubjectFilter(ctx.subject);
        if (ctx.level) setLevelFilter(ctx.level);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to load context for library", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Читаем сохранённые объяснения из localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("noolixLibrarySaved");
      if (!raw) {
        setSavedFromStorage(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedFromStorage(parsed);
      } else {
        setSavedFromStorage(null);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to read noolixLibrarySaved", e);
      setSavedFromStorage(null);
    }
  }, []);

  // Читаем "твои чаты" (раньше "Продолжить") из localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("noolixLibraryContinue");
      if (!raw) {
        setContinueFromStorage(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setContinueFromStorage(parsed);
      } else {
        setContinueFromStorage(null);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to read noolixLibraryContinue", e);
      setContinueFromStorage(null);
    }
  }, []);

  const normalize = (s) => (s || "").toLowerCase();

  const safeString = (v) => (v == null ? "" : String(v));

  const parseDateMaybe = (value) => {
    if (value == null) return null;

    // number (ms or sec)
    if (typeof value === "number" && Number.isFinite(value)) {
      const ms = value < 1e12 ? value * 1000 : value;
      const dt = new Date(ms);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    const s = String(value).trim();
    if (!s) return null;

    // numeric string (ms or sec)
    if (/^\d{10,13}$/.test(s)) {
      const num = Number(s);
      const ms = s.length == 10 ? num * 1000 : num;
      const dt = new Date(ms);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };


  const formatRelativeTime = (value) => {
    const s = safeString(value).trim();
    // If already human text like "3 дня назад" — keep it
    if (!s) return "";
    if (/[а-яА-Я]/.test(s) && /назад|вчера|сегодня|дн|час|мин/.test(s)) return s;

    const dt = parseDateMaybe(value) || parseDateMaybe(s);
    if (!dt) return s;

    let diffMs = Date.now() - dt.getTime();
    if (!Number.isFinite(diffMs)) return s;
    if (diffMs < 0) diffMs = 0;

    const min = Math.round(diffMs / 60000);
    if (min < 1) return "только что";
    if (min < 60) return `${min} мин назад`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} ч назад`;
    const d = Math.round(h / 24);
    if (d === 1) return "вчера";
    if (d < 30) return `${d} дн назад`;
    const mo = Math.round(d / 30);
    if (mo < 12) return `${mo} мес назад`;
    const y = Math.round(mo / 12);
    return `${y} г назад`;
  };

  const formatSavedAt = (value) => {
    const s = safeString(value).trim();
    if (!s) return "";
    const dt = parseDateMaybe(value) || parseDateMaybe(s);
    if (!dt) return s;
    try {
      return dt.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return s;
    }
  };


  const titleFromSaved = (item) => {
    const t = safeString(item?.title).trim();
    const topic = safeString(item?.topic).trim();
    if (t && t.toLowerCase() !== "без названия") return t;
    if (topic) return topic;
    return "Сохранённое объяснение";
  };

  const topicFromSaved = (item) => {
    const topic = safeString(item?.topic).trim();
    if (topic) return topic;

    // fallback: try parse from title
    const t = safeString(item?.title).trim();
    if (!t) return "";
    // remove typical prefixes like "Диагностика по ..." etc
    return t.replace(/^диагностика\s+по\s+/i, "").trim();
  };



  const matchesFilters = (item) => {
    const bySubject =
      subjectFilter === "Все предметы" || item.subject === subjectFilter;

    const byLevel =
      levelFilter === "Все уровни" ||
      item.level === levelFilter ||
      (item.level &&
        item.level.toLowerCase().includes(levelFilter.toLowerCase()));

    const bySearch =
      !search.trim() ||
      normalize(item.title).includes(normalize(search)) ||
      normalize(item.subject).includes(normalize(search));

    return bySubject && byLevel && bySearch;
  };

  // Источник для "Твои чаты"
  const baseContinueRaw =
    continueFromStorage &&
    Array.isArray(continueFromStorage) &&
    continueFromStorage.length > 0
      ? continueFromStorage
      : mockContinue;

  // Дедуп по (subject, level), чтобы не было 10 карточек одного и того же чата
  const seenChatKeys = new Set();
  const baseContinue = baseContinueRaw.filter((item) => {
    const key = `${item.subject}__${item.level}`;
    if (seenChatKeys.has(key)) return false;
    seenChatKeys.add(key);
    return true;
  });

  const filteredContinue = baseContinue.filter(matchesFilters);

  // Источник для "Сохранённые объяснения"
  const baseSaved =
    savedFromStorage &&
    Array.isArray(savedFromStorage) &&
    savedFromStorage.length > 0
      ? savedFromStorage
      : mockSaved;
  const filteredSaved = baseSaved
    .slice()
    .sort((a, b) => {
      const da = new Date(a?.savedAt || a?.ts || a?.createdAt || 0).getTime();
      const db = new Date(b?.savedAt || b?.ts || b?.createdAt || 0).getTime();
      return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0);
    })
    .filter(matchesFilters);
  const savedCount = baseSaved.length;

  const filteredCollections = mockCollections.filter(matchesFilters);

  const nothingFound =
    filteredContinue.length === 0 &&
    filteredSaved.length === 0 &&
    filteredCollections.length === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
            NOOLIX
          </div>
          <p className="text-xs text-purple-100/80">
            Загружаем твою библиотеку…
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

      {/* Левое меню — тот же градиент, что и на других страницах */}
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
                className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-white/5 transition"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>

          <div className="h-px bg-white/10 my-2" />

          <div className="space-y-2">
            {secondaryMenuItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-2 py-2 rounded-2xl transition ${
                  item.key === "library" ? "bg-white/15" : "hover:bg-white/5"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-black text-sm shadow-md bg-gradient-to-br from-purple-100 to-white ${
                    item.key === "library" ? "ring-2 ring-purple-200" : ""
                  }`}
                >
                  {item.icon}
                </span>
                <span
                  className={item.key === "library" ? "font-semibold" : ""}
                >
                  {item.label}
                </span>
              </a>
            ))}
          </div>
        </nav>
      </aside>

      {/* Основная зона */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 flex justify-center">
          <div className="w-full max-w-5xl flex flex-col gap-6 bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {/* Хедер библиотеки */}
            <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-purple-200/80 bg-white/5 px-3 py-1 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-300" />
                  <span>Твоя учебная библиотека</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold">
                    Библиотека
                  </h1>
                  <p className="text-xs md:text-sm text-purple-200 mt-1 max-w-xl">
                    Здесь собираются твои чаты, сохранённые объяснения и
                    подборки тем от NOOLIX.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-[260px]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по темам и объяснениям…"
                  className="w-full text-xs md:text-sm px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-purple-300/70"
                />
                <div className="flex gap-2">
                  <select
                    className="flex-1 text-[11px] md:text-xs px-2 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                  >
                    <option>Все предметы</option>
                    <option>Математика</option>
                    <option>Физика</option>
                    <option>Русский язык</option>
                    <option>Английский язык</option>
                  </select>
                  <select
                    className="flex-1 text-[11px] md:text-xs px-2 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                  >
                    <option>Все уровни</option>
                    <option>7–9 класс</option>
                    <option>10–11 класс</option>
                    <option>1 курс вуза</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Если по фильтрам вообще ничего не найдено */}
            {nothingFound && (
              <section className="bg-black/30 border border-dashed border-purple-300/70 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  По текущим фильтрам ничего не найдено
                </p>
                <p className="text-xs text-purple-100/85">
                  Попробуй изменить фильтры или задать вопрос напрямую в
                  диалоге — мы поможем найти или создать нужное объяснение.
                </p>
                <a
                  href="/chat"
                  className="inline-flex items-center justify-center mt-1 px-3 py-1.5 rounded-full bg-white text-black text-[11px] font-semibold shadow-md hover:bg-purple-100 transition"
                >
                  Спросить в диалоге
                </a>
              </section>
            )}

            {/* Твои чаты */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Твои чаты
                </p>
              </div>
              {filteredContinue.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  Пока нет активных чатов. Начни с диалога — и здесь появятся
                  сессии по предметам и уровням.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {filteredContinue.map((item) => (
                    <div
                      key={item.id}
                      className="bg-black/30 border border-white/10 rounded-2xl p-3 flex flex-col justify-between text-xs text-purple-100"
                    >
                      <div>
                        <p className="font-semibold text-sm mb-1">
                          {item.title}
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
                      <div className="flex items-center justify-between mt-2 text-[11px] text-purple-200/80">
                        <span>Обновлено: {item.updatedAt || "Недавно"}</span>
                        <a
                          href="/chat"
                          className="underline underline-offset-2 hover:text-white"
                        >
                          Открыть чат
                        </a>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Сохранённые объяснения (свёрнуты по умолчанию) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Сохранённые объяснения
                </p>
                {savedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSaved((v) => !v)}
                    className="text-[11px] px-2 py-1 rounded-full bg-black/30 border border-white/15 hover:bg-white/5 transition"
                  >
                    {showSaved
                      ? `Скрыть (${savedCount})`
                      : `Показать (${savedCount})`}
                  </button>
                )}
              </div>

              {!showSaved ? (
                <p className="text-xs text-purple-200/80">
                  Здесь будут твои сохранённые объяснения из диалога. Любое
                  сообщение NOOLIX можно сохранить кнопкой «⭐ Сохранить в
                  библиотеку» прямо в чате.
                </p>
              ) : filteredSaved.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  Пока здесь пусто. Сохрани первое объяснение из диалога —
                  например, мини‑конспект по теме. NOOLIX сохранит тему и стиль объяснения.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredSaved.map((item) => {
                    const topic = topicFromSaved(item);
                    const scrollId = String(item?.messageId || item?.id || "");
                    const href = topic && String(topic).trim()
                      ? `/chat?topic=${encodeURIComponent(String(topic).trim())}&scrollTo=${encodeURIComponent(scrollId)}`
                      : `/chat?scrollTo=${encodeURIComponent(scrollId)}`;

                    return (
                      <div
                      key={item.id}
                      className="bg-black/30 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-purple-100"
                    >
                      <div>
                        <p className="font-semibold text-sm mb-0.5">
                          {titleFromSaved(item)}
                        </p>
                        <p className="text-[11px] text-purple-200/80">
                          {item.subject} • {item.level}
                        </p>

                        {/* chips */}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {topicFromSaved(item) ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-purple-100/90">
                              🏷 {topicFromSaved(item)}
                            </span>
                          ) : null}

                          {item?.explainStyleLabel ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-300/20 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-100/90">
                              🎛 {item.explainStyleLabel}
                            </span>
                          ) : null}

                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-purple-100/90">
                            📌 {item?.from || "из диалога"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-1 text-[11px]">
                        <span className="text-purple-200/80">
                          Сохранено: {formatSavedAt(item.savedAt || item.ts || item.createdAt)}
                          {item.savedAt || item.ts || item.createdAt ? (
                            <span className="text-[10px] text-purple-200/60"> • {formatRelativeTime(item.savedAt || item.ts || item.createdAt)}</span>
                          ) : null}
                        </span>
                        <a
                          href={href}
                          className="underline underline-offset-2 hover:text-white"
                        >
                          Продолжить в диалоге →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Подборки от NOOLIX */}
            <section className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                Подборки NOOLIX
              </p>
              {filteredCollections.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  Подборки по текущим фильтрам не найдены. Можно снять часть
                  фильтров или начать с диалога — и мы подберём темы под тебя.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {filteredCollections.map((c) => (
                    <div
                      key={c.id}
                      className="bg-black/30 border border-white/10 rounded-2xl p-3 flex flex-col justify-between text-xs text-purple-100"
                    >
                      <div>
                        <p className="font-semibold text-sm mb-0.5">
                          {c.title}
                        </p>
                        <p className="text-[11px] text-purple-200/80">
                          {c.subject} • {c.level}
                        </p>
                        <p className="text-[11px] text-purple-200/80 mt-0.5">
                          Тем в подборке: {c.topics} • {c.tag}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-purple-200/80">
                        <a
                          href={`/chat?topic=${encodeURIComponent(c.title)}`}
                          className="underline underline-offset-2 hover:text-white"
                        >
                          Попросить объяснить подборку →
                        </a>
                      </div>
                    </div>
                  ))}
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
