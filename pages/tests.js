// pages/tests.js
import React, { useEffect, useMemo, useRef, useState } from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error: error ? String(error?.message || error) : "Unknown error" };
  }
  componentDidCatch(error) {
    try {
      // eslint-disable-next-line no-console
      console.error("Tests page crashed:", error);
    } catch (_) {}
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen w-full bg-black text-purple-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0B0B10]/90 p-5 shadow-2xl">
            <div className="text-[14px] font-semibold">Ошибка на странице тестов</div>
            <div className="mt-2 text-[12px] text-purple-100/80 whitespace-pre-wrap leading-relaxed">
              {this.state.error}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("noolix_tests_session_v5");
                    localStorage.removeItem("noolix_tests_session_v4");
                    localStorage.removeItem("noolix_tests_session_v3");
                    localStorage.removeItem("noolix_tests_session_v2");
                    localStorage.removeItem("noolix_tests_session_v1");
                  } catch (_) {}
                  try { location.reload(); } catch (_) {}
                }}
                className="w-full px-4 py-3 rounded-2xl bg-purple-200 text-black text-[12px] font-semibold hover:bg-purple-100 transition"
              >
                Сбросить сохранённый тест и перезагрузить
              </button>
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="w-full px-4 py-3 rounded-2xl border border-white/20 bg-black/30 text-[12px] text-purple-50 hover:bg-white/5 transition"
              >
                Попробовать продолжить
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
const TEST_HISTORY_KEY = "noolixTestsHistory";
const TEST_HISTORY_BY_SUBJECT_KEY = "noolixTestsHistoryBySubject";
const MISTAKE_STATS_KEY = "noolixMistakeStats";
const LAST_TOPIC_KEY = "noolixLastTopicCandidate";

const ACTION_BTN = "inline-flex items-center justify-center whitespace-nowrap px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition no-underline";
const ACTION_BTN_DISABLED = ACTION_BTN + " disabled:opacity-50 disabled:cursor-not-allowed";







const normalizeLevel = (lvl) => {
  const v = String(lvl || "").trim();
  if (v === "7–9 класс") return "7–9 класс";
  if (v === "10–11 класс") return "10–11 класс";
  return "10–11 класс";
};

const SUBJECTS = ["Математика", "Русский язык", "Физика", "Английский язык"];

const DIFFICULTIES = [
  { key: "easy", label: "Лёгкий" },
  { key: "medium", label: "Средний" },
  { key: "hard", label: "Сложный" },
];

const difficultyHint = (k) => {
  if (k === "easy") return "Лёгкий: базовые формулы/правила, 1–2 шага, простые числа, без ловушек.";
  if (k === "hard") return "Сложный: комбинированные задачи, несколько идей/шагов, экзаменационный/углублённый уровень.";
  return "Средний: стандартные задачи, 2–4 шага, умеренная сложность.";
};

// 10–12 тем на каждый уровень (7–9 и 10–11) для 4 предметов.
// Позже расширим и персонализируем под ученика.
const TOPIC_BANK = {
  "Математика": {
    "7–9 класс": [
      "Линейные уравнения и неравенства",
      "Системы линейных уравнений",
      "Проценты и задачи на проценты",
      "Пропорции и дроби",
      "Функции и графики (база)",
      "Квадратные уравнения (база)",
      "Разложение на множители",
      "Степени и корни (база)",
      "Геометрия: треугольники и подобие",
      "Геометрия: окружность (база)",
      "Прогрессии (база)",
      "Вероятность (введение)",
    ],
    "10–11 класс": [
      "Квадратные уравнения (ЕГЭ/углубл.)",
      "Тригонометрия: формулы и уравнения",
      "Показательные и логарифмические уравнения",
      "Производная: правила и вычисления",
      "Исследование функций (ЕГЭ)",
      "Планиметрия: окружности (ЕГЭ)",
      "Стереометрия (ЕГЭ)",
      "Неравенства (ЕГЭ): интервалы",
      "Текстовые задачи (ЕГЭ)",
      "Вероятность и статистика (ЕГЭ)",
      "Параметры (ЕГЭ): базовые подходы",
      "Комбинаторика (ЕГЭ)",
    ],
  },

  "Русский язык": {
    "7–9 класс": [
      "Орфография: гласные и согласные в корне",
      "Орфография: приставки и суффиксы",
      "Пунктуация: однородные члены",
      "Пунктуация: вводные слова и обращения",
      "Сложное предложение (база)",
      "Прямая речь и диалог",
      "Части речи: правописание (база)",
      "Лексика и фразеология",
      "Стили речи (база)",
      "Текст: тема и основная мысль",
      "Синтаксический разбор (база)",
      "Орфоэпия (база)",
    ],
    "10–11 класс": [
      "ЕГЭ: орфография (сложные случаи)",
      "ЕГЭ: пунктуация (СПП/БСП/однородные)",
      "ЕГЭ: лексические нормы и паронимы",
      "ЕГЭ: грамматические нормы",
      "ЕГЭ: орфоэпия",
      "ЕГЭ: средства выразительности",
      "ЕГЭ: анализ текста (микротемы)",
      "ЕГЭ: логика и связность текста",
      "ЕГЭ: сочинение (структура)",
      "ЕГЭ: сочинение (аргументация)",
      "ЕГЭ: типовые ошибки",
      "ЕГЭ: практика вариантов",
    ],
  },

  "Физика": {
    "7–9 класс": [
      "Путь, скорость, ускорение (база)",
      "Силы и законы Ньютона (база)",
      "Давление и архимедова сила",
      "Работа, мощность, энергия (база)",
      "Тепловые явления (база)",
      "Электрический ток: U, I, R",
      "Соединение резисторов (база)",
      "Магнитные явления (введение)",
      "Оптика: отражение и преломление",
      "Колебания и волны (введение)",
      "Графики физических величин",
      "Перевод единиц и порядок величин",
    ],
    "10–11 класс": [
      "Кинематика (ЕГЭ): графики и формулы",
      "Динамика (ЕГЭ): силы и движение",
      "Законы сохранения (ЕГЭ): импульс/энергия",
      "МКТ и термодинамика (ЕГЭ)",
      "Электростатика (ЕГЭ)",
      "Постоянный ток (ЕГЭ): цепи",
      "Индукция и магнитное поле (ЕГЭ)",
      "Колебания и волны (ЕГЭ)",
      "Геометрическая оптика (ЕГЭ)",
      "Квантовая физика (ЕГЭ)",
      "Атомная и ядерная физика",
      "Стратегии решения задач ЕГЭ",
    ],
  },

  "Английский язык": {
    "7–9 класс": [
      "Present Simple / Continuous",
      "Past Simple / Continuous",
      "Future (will / going to)",
      "Comparatives & Superlatives",
      "Modal verbs (can/must/should)",
      "Articles (a/an/the) — база",
      "Prepositions of time/place",
      "Reading: main idea & details",
      "Listening: short dialogues",
      "Vocabulary: school & hobbies",
      "Writing: short email/message",
      "Speaking: describing people/places",
    ],
    "10–11 класс": [
      "Tenses review (all) + signal words",
      "Conditionals (0–3) & mixed",
      "Passive voice (exam)",
      "Reported speech",
      "Gerund / Infinitive patterns",
      "Phrasal verbs (core set)",
      "Reading: inference & context",
      "Listening: longer texts (exam)",
      "Writing: essay/opinion (exam)",
      "Writing: formal email/letter",
      "Speaking: сравнение картинок",
      "Use of English: transformations",
    ],
  },
};

const getTopicBank = (subject, level) => {
  const s = TOPIC_BANK?.[subject];
  if (!s) return [];
  return Array.isArray(s[level]) ? s[level] : [];
};

const pickRandom = (arr, n = 3) => {
  const a = Array.isArray(arr) ? [...arr] : [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};
// Anti-repeats (MVP): remember recent question stems per subject+level+topic
const QUESTION_BANK_KEY = "noolixQuestionBankV1";

// Review styles: rotate mistake analysis styles so repeated reviews feel different
const REVIEW_STYLE_KEY = "noolixReviewStyleHistoryV1";

const REVIEW_STYLES = [
  {
    key: "standard",
    label: "Стандарт",
    instruction:
      "Сделай разбор по каждому вопросу: где ошибка → почему → как правильно. 1 пример и 1 мини‑упражнение.",
  },
  {
    key: "steps",
    label: "По шагам",
    instruction:
      "Разбор строго по шагам: (1) что нужно было сделать, (2) где свернул не туда, (3) как проверить себя, (4) мини‑пример.",
  },
  {
    key: "traps",
    label: "Ловушки",
    instruction:
      "Фокус на типичных ловушках: почему этот вариант кажется правильным, но это ошибка. Дай чек‑лист проверки.",
  },
  {
    key: "algorithm",
    label: "Алгоритм",
    instruction:
      "Дай короткий алгоритм решения (2–6 пунктов), затем разбор по каждому вопросу через этот алгоритм.",
  },
  {
    key: "training",
    label: "Мини‑тренировка",
    instruction:
      "После разбора добавь 2 похожих мини‑задания (без ответа), чтобы закрепить именно эту ошибку.",
  },
];

const loadReviewStyleHistory = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REVIEW_STYLE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
};

const saveReviewStyleHistory = (map) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REVIEW_STYLE_KEY, JSON.stringify(map || {}));
  } catch (_) {}
};

const pickNextReviewStyle = (topicKey) => {
  const key = String(topicKey || "").trim() || "general";
  const map = loadReviewStyleHistory();
  const entry = map[key] && typeof map[key] === "object" ? map[key] : { used: [] };
  const used = Array.isArray(entry.used) ? entry.used : [];

  let next = REVIEW_STYLES.find((s) => !used.includes(s.key));
  if (!next) {
    next = REVIEW_STYLES[0];
    entry.used = [];
  }

  return { next, key, map, entry };
};

const markReviewStyleUsed = (topicKey, styleKey) => {
  const key = String(topicKey || "").trim() || "general";
  const map = loadReviewStyleHistory();
  const entry = map[key] && typeof map[key] === "object" ? map[key] : { used: [] };

  const used = Array.isArray(entry.used) ? entry.used : [];
  if (styleKey && !used.includes(styleKey)) used.push(styleKey);

  map[key] = { ...entry, used, updatedAt: new Date().toISOString() };
  saveReviewStyleHistory(map);
};


const QUESTION_BANK_MAX_PER_TOPIC = 220;
const QUESTION_AVOID_LIMIT = 24;

// Combine avoid stems across multiple topics (so multi-topic tests don't repeat)
const getAvoidStemsMulti = ({ subject, level, topicTitles, limit = QUESTION_AVOID_LIMIT }) => {
  const titles = Array.isArray(topicTitles) ? topicTitles.map(String).map((s) => s.trim()).filter(Boolean) : [];
  const merged = [];
  const seen = new Set();
  for (const t of titles) {
    const arr = getAvoidStems({ subject, level, topicTitle: t, limit });
    for (const s of arr) {
      const k = String(s || "").toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      merged.push(s);
      if (merged.length >= limit) return merged;
    }
  }
  return merged;
};

// ---- Explanation cache (localStorage) ----
const EXPL_CACHE_KEY = "noolix_mistake_expl_cache_v1";
const HISTORY_OPEN_KEY = "noolix_tests_history_open_v1";
const TEST_SESSION_KEY = "noolix_tests_session_v3";
const hashQuestion = (q) => {
  const s = String(q || "").trim().toLowerCase();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

const loadExplCache = () => {
  try {
    const raw = localStorage.getItem(EXPL_CACHE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch (_) {
    return {};
  }
};

const saveExplCache = (cacheObj) => {
  try {
    localStorage.setItem(EXPL_CACHE_KEY, JSON.stringify(cacheObj || {}));
  } catch (_) {}
};

// ---- Current test session persistence (localStorage) ----
const loadTestSession = () => {
  try {
    const raw = window.localStorage.getItem(TEST_SESSION_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch (_) {
    return null;
  }
};

const saveTestSession = (session) => {
  try {
    window.localStorage.setItem(TEST_SESSION_KEY, JSON.stringify(session || null));
  } catch (_) {}
};

const clearTestSession = () => {
  try {
    window.localStorage.removeItem(TEST_SESSION_KEY);
  } catch (_) {}
};



const safeJsonParse = (raw, fallback) => {
  try { return JSON.parse(raw); } catch (_) { return fallback; }
};

const getTopicScopeKey = (subject, level, topicTitle) => {
  const s = String(subject || "").trim() || "_";
  const l = String(level || "").trim() || "_";
  const t = normalizeTopicKey(topicTitle);
  return `${s}|${l}|${t}`;
};

const getQuestionStem = (q) => {
  const raw = String(q?.question || q?.prompt || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  // cut long texts: enough for avoidance, not too big for prompt
  return raw.length > 220 ? raw.slice(0, 220) + "…" : raw;
};

const getQuestionSignature = (q) => {
  const text = String(q?.question || q?.prompt || "").toLowerCase();
  const cleaned = text
    .replace(/[^a-z0-9а-яё\s]+/gi, " " )
    .replace(/\s+/g, " " )
    .trim();
  if (!cleaned) return "";
  const stop = new Set([
    "и","в","во","на","по","к","ко","из","у","о","об","от","для","что","это","как","какой","какая","какие","сколько","найди","определи","выбери","верно","неверно"
  ]);
  const tokens = cleaned.split(" " ).filter(t => t && t.length > 2 && !stop.has(t));
  // keep first 14 unique tokens to represent 'meaning'
  const uniq = [];
  const seen = new Set();
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
    if (uniq.length >= 14) break;
  }
  return uniq.join(" " );
};

const loadQuestionBank = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(QUESTION_BANK_KEY);
    return raw ? safeJsonParse(raw, {}) : {};
  } catch (_) {
    return {};
  }
};

const saveQuestionBank = (bank) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(bank || {}));
  } catch (_) {}
};

const getAvoidStems = ({ subject, level, topicTitle, limit = QUESTION_AVOID_LIMIT }) => {
  const bank = loadQuestionBank();
  const key = getTopicScopeKey(subject, level, topicTitle);
  const arr = Array.isArray(bank?.[key]) ? bank[key] : [];
  // take most recent unique
  const uniq = [];
  const seen = new Set();
  for (let i = arr.length - 1; i >= 0 && uniq.length < limit; i--) {
    const stem = String(arr[i]?.stem || "").trim();
    const sig = String(arr[i]?.sig || "").trim();
    // use signature first (better anti-paraphrase), then stem
    if (sig) {
      const k = ("sig:" + sig).toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(`ключевые слова: ${sig}`);
        if (uniq.length >= limit) break;
      }
    }
    if (!stem) continue;
    const k2 = stem.toLowerCase();
    if (seen.has(k2)) continue;
    seen.add(k2);
    uniq.push(stem);
  }
  return uniq;
};

const pushQuestionsToBank = ({ subject, level, topicTitle, questions }) => {
  const bank = loadQuestionBank();
  const key = getTopicScopeKey(subject, level, topicTitle);
  const prev = Array.isArray(bank?.[key]) ? bank[key] : [];
  const next = prev.slice();

  const now = Date.now();
  for (const q of Array.isArray(questions) ? questions : []) {
    const stem = getQuestionStem(q);
    if (!stem) continue;
    const sig = getQuestionSignature(q);
    next.push({ stem, sig, ts: now });
  }

  // keep last N
  bank[key] = next.slice(-QUESTION_BANK_MAX_PER_TOPIC);
  saveQuestionBank(bank);
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const getToday = () => new Date().toISOString().slice(0, 10);

// Сглаживание: новый результат не перетирает старый резко
const blendScore = (oldScore, newScore, alpha = 0.35) => {
  const o = typeof oldScore === "number" ? oldScore : 0;
  return clamp01(o * (1 - alpha) + newScore * alpha);
};

const parseTopicsInput = (raw) => {
  const txt = typeof raw === "string" ? raw : "";
  const parts = txt
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // убираем дубликаты сохраняя порядок
  const seen = new Set();
  const unique = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique;
};


const normalizeTopicKeySingle = (t) => {
  let raw = String(t || "").trim();
  if (!raw) return "Общее";

  raw = raw.replace(/^["'«]+/, "").replace(/[\"'»]+$/, "").trim();
  raw = raw.replace(/\s+/g, " ");

  const q1 = raw.match(/«([^»]{2,80})»/);
  const q2 = raw.match(/"([^"]{2,80})"/);
  if (q1?.[1]) raw = q1[1].trim();
  else if (q2?.[1]) raw = q2[1].trim();

  const patterns = [
    /^(?:что такое|что значит|что означает)\s+(.+)$/i,
    /^(?:как решать|как решить|как найти|как сделать|как понять|как работает)\s+(.+)$/i,
    /^(?:объясни(?:те)?(?: мне)?|поясни(?:те)?|расскажи(?:те)?|разбери(?:те)?|помоги(?:те)?(?: мне)?(?: понять|с)?)\s+(.+)$/i,
    /^(?:тема|по теме)\s*[:\-—]?\s*(.+)$/i,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m?.[1]) {
      raw = m[1].trim();
      break;
    }
  }

  raw = raw.replace(/[\?\!\.]+$/g, "").trim();

  const words = raw.split(/\s+/).filter(Boolean);
  const tooLong = raw.length > 60;
  const tooManyWords = words.length > 8;
  const hasSentenceMarks = /[\?\!\.]/.test(raw);
  if (tooLong || tooManyWords || hasSentenceMarks) return "Общее";

  return raw || "Общее";
};

// Supports multi-topic strings like "Тема 1, Тема 2" (used in UI/history).
// Returns a stable, human-readable key (comma-separated list of normalized topic keys).
const normalizeTopicKey = (t) => {
  const raw = String(t || "").trim();
  if (!raw) return "Общее";

  // If it's a comma-separated list, normalize each part separately.
  // Keep up to 3 topics in the key to avoid very long entries.
  if (raw.includes(",")) {
    const parts = parseTopicsInput(raw);
    const norm = [];
    const seen = new Set();
    for (const p of parts) {
      const k = normalizeTopicKeySingle(p);
      if (!k || k === "Общее") continue;
      const low = k.toLowerCase();
      if (seen.has(low)) continue;
      seen.add(low);
      norm.push(k);
      if (norm.length >= 3) break;
    }
    if (norm.length > 0) return norm.join(", ");
  }

  return normalizeTopicKeySingle(raw);
};


const toDativeRu = (subject) => {
  const s = String(subject || "").trim().toLowerCase();
  // минимум, но даёт нормальную фразу: "по математике", "по физике"
  const map = {
    "математика": "математике",
    "физика": "физике",
    "русский": "русскому языку",
    "русский язык": "русскому языку",
    "английский": "английскому",
    "английский язык": "английскому",
  };
  return map[s] || (subject ? String(subject) : "предмету");
};

// для диагностики/общих заглушек — не считаем это "реальной темой"
const looksDiagnostic = (s) => /^\s*Диагностика\b/i.test(String(s || "").trim());
const looksTooGeneric = (s) => /^\s*Базовые\s+темы\b/i.test(String(s || "").trim());
const isBadManualTopic = (s) => {
  const v = String(s || "").trim();
  if (!v) return true;
  if (looksDiagnostic(v)) return true;
  if (looksTooGeneric(v)) return true;
  if (/^\s*без\s+названия\b/i.test(v)) return true;
  return false;
};


const getWeakestTopicFromProgress = (subject, level) => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
  const km = safeParse(raw, {});
  const subj = km?.[subject];
  const lvl = subj?.[level];
  if (!lvl || typeof lvl !== "object") return null;

  // нормализуем "битые" темы (когда ключом становилась фраза/сообщение)
  const merged = {};
  Object.entries(lvl).forEach(([topic, data]) => {
    const k = normalizeTopicKey(topic);
    const score = typeof data?.score === "number" ? data.score : 0;
    const prev = merged[k];
    if (!prev) merged[k] = { score };
    else merged[k].score = Math.min(prev.score, score);
  });

  const entries = Object.entries(merged)
    .map(([topic, data]) => ({ topic, score: typeof data?.score === "number" ? data.score : 0 }))
    .sort((a, b) => a.score - b.score);
  return entries[0]?.topic || null;
};


const safeParse = (raw, fallback) => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
};


const hashString = (s) => {
  let h = 2166136261;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

// Нужен для /api/generate-test: topicId должен быть стабильным и безопасным
// (иначе, при передаче строк в topics, сервер может подставлять "Без названия")
const slugifyId = (s) => {
  const raw = String(s || "").trim().toLowerCase();
  if (!raw) return `topic-${Math.random().toString(36).slice(2, 9)}`;

  // минимальная RU->EN транслитерация для стабильных id
  const map = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  let out = "";
  for (const ch of raw) out += map[ch] !== undefined ? map[ch] : ch;

  out = out
    .replace(/[^a-z0-9\s\-]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-+|\-+$/g, "");

  return out || `topic-${Math.random().toString(36).slice(2, 9)}`;
};

const classifyMistake = ({ timeSec, confident, repeats }) => {
  const t = typeof timeSec === "number" ? timeSec : null;
  const r = typeof repeats === "number" ? repeats : 1;
  const c = !!confident;

  if (r >= 3) return "повторяется";
  if (c && r >= 2) return "путаю понятия";
  if (c) return "уверенно ошибся";
  if (t !== null && t < 7 && r <= 1) return "скорее невнимательность";
  if (t !== null && t >= 12 && r >= 2) return "пробел в знании";
  if (r >= 2) return "нужно закрепить";
  return "разобрать и закрепить";
};

const readMistakeStats = () => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(MISTAKE_STATS_KEY);
  return safeParse(raw, {});
};

const writeMistakeStats = (stats) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MISTAKE_STATS_KEY, JSON.stringify(stats || {}));
};

const updateMistakeStats = ({ subject, level, topic, mistakes }) => {
  if (typeof window === "undefined") return;
  if (!subject || !level || !Array.isArray(mistakes) || mistakes.length === 0) return;

  const stats = readMistakeStats();
  if (!stats[subject] || typeof stats[subject] !== "object") stats[subject] = {};
  if (!stats[subject][level] || typeof stats[subject][level] !== "object") stats[subject][level] = {};

  const lvl = stats[subject][level];
  const now = new Date().toISOString();

  for (const m of mistakes) {
    const qHash = hashString(m.question || "");
    const key = `${topic || ""}::${qHash}::${m.correctIndex}::${m.userIndex}`;
    const prev = lvl[key] && typeof lvl[key] === "object" ? lvl[key] : {};
    const prevCount = typeof prev.count === "number" ? prev.count : 0;
    const nextCount = prevCount + 1;

    const prevAvgTime = typeof prev.avgTimeSec === "number" ? prev.avgTimeSec : null;
    const t = typeof m.timeSec === "number" ? m.timeSec : null;
    const nextAvgTime =
      t === null ? prevAvgTime : prevAvgTime === null ? t : +(prevAvgTime * 0.7 + t * 0.3).toFixed(2);

    const prevConfWrong = typeof prev.confidentWrongCount === "number" ? prev.confidentWrongCount : 0;
    const nextConfWrong = prevConfWrong + (m.confident ? 1 : 0);

    lvl[key] = {
      key,
      subject,
      level,
      topic: topic || "",
      question: m.question || "",
      correctIndex: m.correctIndex,
      userIndex: m.userIndex,
      count: nextCount,
      avgTimeSec: nextAvgTime,
      confidentWrongCount: nextConfWrong,
      lastAt: now,
    };
  }

  stats[subject][level] = lvl;
  writeMistakeStats(stats);
};

const getTopRepeatedMistakes = ({ subject, level, limit = 3 }) => {
  if (typeof window === "undefined") return [];
  const stats = readMistakeStats();
  const lvl = stats?.[subject]?.[level];
  if (!lvl || typeof lvl !== "object") return [];
  return Object.values(lvl)
    .filter((x) => x && typeof x === "object" && typeof x.count === "number" && x.count >= 2)
    .sort((a, b) => (b.count - a.count) || ((b.confidentWrongCount || 0) - (a.confidentWrongCount || 0)))
    .slice(0, limit);
};


const updateKnowledgeFromTest = ({ subject, level, topic, correctCount, totalCount, signals }) => {
  if (typeof window === "undefined") return { ok: false, error: "no-window" };
  const topicKey = normalizeTopicKey(topic);
  if (!subject || !level || !topicKey || !totalCount || totalCount <= 0)
    return { ok: false, error: "missing-context" };

  try {
    const raw = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
    const km = safeParse(raw, {});

    if (!km[subject] || typeof km[subject] !== "object") km[subject] = {};
    if (!km[subject][level] || typeof km[subject][level] !== "object") km[subject][level] = {};

    // base score from correctness
    let newScore = clamp01(correctCount / totalCount);

    // мягкая корректировка по сигналам (MVP)
    const sig = signals && typeof signals === "object" ? signals : null;
    if (sig) {
      const confidentWrong = typeof sig.confidentWrong === "number" ? sig.confidentWrong : 0;
      const uncertainCorrect = typeof sig.uncertainCorrect === "number" ? sig.uncertainCorrect : 0;
      const confidentCorrect = typeof sig.confidentCorrect === "number" ? sig.confidentCorrect : 0;
      const avgTime = typeof sig.avgTimeSec === "number" ? sig.avgTimeSec : null;

      // уверенные ошибки — сильнее штраф
      if (confidentWrong > 0) {
        const frac = confidentWrong / Math.max(1, totalCount);
        newScore = clamp01(newScore - 0.10 * frac);
      }

      // уверенные правильные — небольшой бонус (не разгоняем резко)
      if (confidentCorrect > 0 && newScore < 0.95) {
        const frac = confidentCorrect / Math.max(1, totalCount);
        newScore = clamp01(newScore + 0.03 * frac);
      }

      // неуверенные правильные — маленький бонус, но меньше чем уверенные
      if (uncertainCorrect > 0 && newScore < 0.95) {
        const frac = uncertainCorrect / Math.max(1, totalCount);
        newScore = clamp01(newScore + 0.015 * frac);
      }

      // слишком быстро + плохой результат => чуть-чуть штраф (невнимательность)
      if (avgTime !== null && avgTime < 6 && newScore < 0.6) {
        newScore = clamp01(newScore - 0.04);
      }
    }

    const prev = km[subject][level][topicKey] || {};
    const nextScore = blendScore(prev.score, newScore, 0.35);

    // накопительная статистика по сигналам
    const prevSig = prev.signals && typeof prev.signals === "object" ? prev.signals : {};
    const nextSig = { ...prevSig };
    nextSig.testsCount = (typeof prevSig.testsCount === "number" ? prevSig.testsCount : 0) + 1;

    if (sig) {
      const avgTime = typeof sig.avgTimeSec === "number" ? sig.avgTimeSec : null;
      if (avgTime !== null) {
        const prevAvg = typeof prevSig.avgTimeSec === "number" ? prevSig.avgTimeSec : null;
        nextSig.avgTimeSec = prevAvg === null ? avgTime : +(prevAvg * 0.7 + avgTime * 0.3).toFixed(2);
      }
      nextSig.confidentWrong = (typeof prevSig.confidentWrong === "number" ? prevSig.confidentWrong : 0) + (sig.confidentWrong || 0);
      nextSig.uncertainCorrect = (typeof prevSig.uncertainCorrect === "number" ? prevSig.uncertainCorrect : 0) + (sig.uncertainCorrect || 0);
      nextSig.confidentCorrect = (typeof prevSig.confidentCorrect === "number" ? prevSig.confidentCorrect : 0) + (sig.confidentCorrect || 0);
      nextSig.lastTestAt = new Date().toISOString();
    }

    km[subject][level][topicKey] = {
      ...prev,
      score: nextScore,
      signals: nextSig,
      updatedAt: getToday(),
    };

    window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(km));
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e?.message || "km-write-failed" };
  }
};


const pushTestHistory = ({ subject, level, topic, score, correctCount, totalCount, mistakesSummary }) => {
  const topicKey = normalizeTopicKey(topic);
  if (typeof window === "undefined") return { ok: false, count: 0, error: "no-window" };

  try {
    const subjKey = (subject || "Без предмета").toString().trim() || "Без предмета";

    // читаем/мигрируем: сначала новый формат (объект по предметам)
    const rawBy = window.localStorage.getItem(TEST_HISTORY_BY_SUBJECT_KEY);
    let by = safeParse(rawBy, null);

    if (!by || typeof by !== "object" || Array.isArray(by)) {
      // миграция из legacy массива
      const rawLegacy = window.localStorage.getItem(TEST_HISTORY_KEY);
      const legacyArr = safeParse(rawLegacy, []);
      const legacy = Array.isArray(legacyArr) ? legacyArr : [];
      const migrated = {};
      for (const item of legacy) {
        const s = (item?.subject || "Без предмета").toString().trim() || "Без предмета";
        if (!migrated[s]) migrated[s] = [];
        migrated[s].push(item);
      }
      by = migrated;
      // сохраняем миграцию, чтобы дальше не читать legacy
      window.localStorage.setItem(TEST_HISTORY_BY_SUBJECT_KEY, JSON.stringify(by));
    }

    const list = Array.isArray(by[subjKey]) ? by[subjKey] : [];

    list.unshift({
      id: Date.now(),
      subject: subjKey,
      level,
      topic: topicKey,
      score,
      correctCount,
      totalCount,
      createdAt: new Date().toISOString(),
      mistakesSummary: mistakesSummary || null,
    });

    const trimmed = list.slice(0, 50);
    by[subjKey] = trimmed;
    window.localStorage.setItem(TEST_HISTORY_BY_SUBJECT_KEY, JSON.stringify(by));

    return { ok: true, count: trimmed.length, error: null };
  } catch (e) {
    return { ok: false, count: 0, error: e?.message || "history-write-failed" };
  }
};


export default function TestsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [context, setContext] = useState({
    subject: "Математика",
    level: "10–11 класс",
    mode: "exam_prep",
  });

  

  const [difficulty, setDifficulty] = useState('medium');
const [topic, setTopic] = useState("");
  const mistakeExplainAbortRef = useRef(null);
  const restoredSessionRef = useRef(false);
  const skipContextResetRef = useRef(false);
  const topicInputRef = useRef("");
  useEffect(() => { topicInputRef.current = topic; }, [topic]);

  

  
  // SESSION_GUARD_V5: safely read/validate saved session once (prevents crashes from corrupted localStorage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TEST_SESSION_KEY);
      if (!raw) {
        setSavedTestSession(null);
        setSessionGuardReady(true);
        return;
      }
      try {
        const obj = JSON.parse(raw);
        const ok = obj && typeof obj === "object" && Array.isArray(obj.questions) && obj.questions.length > 0;
        if (!ok) {
          window.localStorage.removeItem(TEST_SESSION_KEY);
          setSavedTestSession(null);
        } else {
          setSavedTestSession(obj);
        }
      } catch (_) {
        // corrupted JSON
        try { window.localStorage.removeItem(TEST_SESSION_KEY); } catch (_) {}
        setSavedTestSession(null);
      }
    } catch (_) {
      setSavedTestSession(null);
    } finally {
      setSessionGuardReady(true);
    }
  }, []);

// RESUME_MODAL_V5: prompt only when saved test STRICTLY matches current subject+level
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!sessionGuardReady) return;
      if (resumeDismissedRef.current) return;

      if (Array.isArray(questions) && questions.length) return;
      if (generating) return;
      if (result !== null) return;

      const saved = savedTestSession;
      if (!saved) return;

      const savedQuestions = Array.isArray(saved.questions) ? saved.questions : [];
      if (!savedQuestions.length) return;
      if (saved.result !== null && saved.result !== undefined) return;

      const savedSubject = typeof saved.subject === "string" ? saved.subject.trim() : "";
      const savedLevel = typeof saved.level === "string" ? saved.level.trim() : "";
      const curSubject = typeof context.subject === "string" ? context.subject.trim() : "";
      const curLevel = typeof context.level === "string" ? context.level.trim() : "";

      const okMatch = !!savedSubject && !!savedLevel && !!curSubject && !!curLevel &&
        savedSubject === curSubject && savedLevel === curLevel;

      if (!okMatch) return;

      setPendingSession(saved);
      setShowResumeModal(true);
    } catch (_) {}
  }, [context.subject, context.level, questions.length, generating, result]);

  // SAVE_SESSION_V5: save only in-progress test (strict subject+level)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (generating) return;
      if (!Array.isArray(questions) || !questions.length) return;
      if (result !== null) return;

      const subj = typeof context.subject === "string" ? context.subject.trim() : "";
      const lvl = typeof context.level === "string" ? context.level.trim() : "";
      if (!subj || !lvl) return;

      const topicToSave =
        (typeof sentTopicForGeneration === "string" && sentTopicForGeneration.trim())
          ? sentTopicForGeneration
          : (typeof topic === "string" ? topic : "");

      saveTestSession({
        subject: subj,
        level: lvl,
        topic: topicToSave,
        sentTopicForGeneration: topicToSave,
        diagnosticLabel: typeof diagnosticLabel === "string" ? diagnosticLabel : "",
        questions,
        userAnswers: Array.isArray(userAnswers) ? userAnswers : [],
        questionShownAt: Array.isArray(questionShownAt) ? questionShownAt : [],
        timeToFirstAnswerSec: Array.isArray(timeToFirstAnswerSec) ? timeToFirstAnswerSec : [],
        analysis: typeof analysis === "string" ? analysis : "",
        reviewing: !!reviewing,
        result: null,
        ts: Date.now(),
      });
      try { setSavedTestSession(loadTestSession()); } catch (_) {}

    } catch (_) {}
  }, [context.subject, context.level, generating, questions, userAnswers, questionShownAt, timeToFirstAnswerSec, analysis, reviewing, result, topic, sentTopicForGeneration, diagnosticLabel]);

  useEffect(() => {
    if (result === null) return;
    try { clearTestSession(); } catch (_) {}
    setSavedTestSession(null)
  }, [result]);
// If we came from Progress via /tests?topic=..., we may want to auto-generate a mini-test for that topic.
  const pendingAutoTopicRef = useRef(null);
  const autoStartedFromQueryRef = useRef(false);
  

  const [suggestedTopics, setSuggestedTopics] = useState([]);
const [sentTopicForGeneration, setSentTopicForGeneration] = useState("");
  const [diagnosticLabel, setDiagnosticLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sessionGuardReady, setSessionGuardReady] = useState(false);
  const [savedTestSession, setSavedTestSession] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const resumeDismissedRef = useRef(false);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState([]); // [{question, options, correctIndex, topicTitle?}]
  const [userAnswers, setUserAnswers] = useState([]); // number|null
  const [questionShownAt, setQuestionShownAt] = useState([]); // ms timestamps
  const [timeToFirstAnswerSec, setTimeToFirstAnswerSec] = useState([]); // number|null

  const [result, setResult] = useState(null); // {correctCount,totalCount,scorePercent}
  const [analysis, setAnalysis] = useState("");
  const [reviewStyleLabel, setReviewStyleLabel] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [mistakeExplanations, setMistakeExplanations] = useState({});
  const [mistakeExplainErrors, setMistakeExplainErrors] = useState({}); // { [index]: string }
 // { [questionIndex]: string }
  const [mistakeExplaining, setMistakeExplaining] = useState(false);
  const [saveInfo, setSaveInfo] = useState(null); // {historyCount, kmTouched, ts, error}

  const [testHistory, setTestHistory] = useState([]);
  const [historyTick, setHistoryTick] = useState(0);
  const [historyScope, setHistoryScope] = useState("current"); // "current" | "all"
  const [historyOpen, setHistoryOpen] = useState(() => {
    if (typeof window === "undefined") return false; // default collapsed
    try {
      const v = window.localStorage.getItem(HISTORY_OPEN_KEY);
      
  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_OPEN_KEY, historyOpen ? "1" : "0");
    } catch (_) {}
  }, [historyOpen]);


  

  // RESTORE_TEST_SESSION_V3: restore unfinished test after reload/navigation
  useEffect(() => {
    if (restoredSessionRef.current) return;
    restoredSessionRef.current = true;
    skipContextResetRef.current = true;

    try {
      const saved = savedTestSession;
      if (!saved) return;

      // Only restore if there is a real unfinished session
      const savedQuestions = Array.isArray(saved.questions) ? saved.questions : [];
      const savedResult = saved.result ?? null;
      if (!savedQuestions.length) return;
      if (savedResult !== null) return;

      // Do not override an already active session in memory
      if (Array.isArray(questions) && questions.length) return;

      setGenerating(false);
      setSubmitting(false);
      setError("");

      setTopic(typeof saved.topic === "string" ? saved.topic : "");
      setSentTopicForGeneration(typeof saved.sentTopicForGeneration === "string" ? saved.sentTopicForGeneration : (typeof saved.topic === "string" ? saved.topic : ""));
      setQuestions(savedQuestions);
      setUserAnswers(Array.isArray(saved.userAnswers) ? saved.userAnswers : []);


  // SAVE_TEST_SESSION_V3: persist current test while in progress (no subject/level binding)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Save only when we have a real generated test, and we are not generating right now
    if (generating) return;
    if (!Array.isArray(questions) || !questions.length) return;

    // Do not persist finished sessions
    if (result !== null) return;

    const session = {
      topic: typeof topic === "string" ? topic : "",
      sentTopicForGeneration: typeof sentTopicForGeneration === "string" ? sentTopicForGeneration : "",
      questions,
      userAnswers: Array.isArray(userAnswers) ? userAnswers : [],
      questionShownAt: Array.isArray(questionShownAt) ? questionShownAt : [],
      timeToFirstAnswerSec: Array.isArray(timeToFirstAnswerSec) ? timeToFirstAnswerSec : [],
      analysis: typeof analysis === "string" ? analysis : "",
      reviewing: !!reviewing,
      result: null,
      ts: Date.now(),
    };

    saveTestSession(session);
  }, [generating, questions, userAnswers, questionShownAt, timeToFirstAnswerSec, analysis, reviewing, result, topic, sentTopicForGeneration]);

  // CLEAR_TEST_SESSION_V3: clear persisted session after finishing
  useEffect(() => {
    if (result === null) return;
    try { clearTestSession(); } catch (_) {}
  }, [result]);
      setQuestionShownAt(Array.isArray(saved.questionShownAt) ? saved.questionShownAt : []);
      setTimeToFirstAnswerSec(Array.isArray(saved.timeToFirstAnswerSec) ? saved.timeToFirstAnswerSec : []);
      setAnalysis(typeof saved.analysis === "string" ? saved.analysis : "");
      setReviewing(!!saved.reviewing);

      setResult(null);
      setRestoredNotice(true);

      // keep history collapsed while continuing
      setHistoryOpen(false);
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.subject, context.level]);
// RESTORE_TEST_SESSION: restore unfinished test after reload/navigation (once per subject/level)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (restoredSessionRef.current) return;

    // wait until context is available
    const subj = (context && context.subject) ? String(context.subject) : "";
    const lvl = (context && context.level) ? String(context.level) : "";
    // Preserve non-empty subject/level from previous saved session if context not ready yet
    const prevSaved = loadTestSession();
    const subjToSave = subj || String(prevSaved?.subject || "");
    const lvlToSave = lvl || String(prevSaved?.level || "");

    // do not override an active test already in memory
    if (Array.isArray(questions) && questions.length) {
      restoredSessionRef.current = true;
      return;
    }

    const saved = savedTestSession;
    if (!saved || saved.finished) {
      restoredSessionRef.current = true;
      return;
    }

        const savedSubj = String(saved.subject || "");
    // If either side is empty, don't block restore (context may load after mount)
    if (savedSubj && subj && savedSubj !== subj) {
      restoredSessionRef.current = true;
      return;
    }
    // If both sides have a non-empty level, require match; otherwise ignore level.
    if (lvl && String(saved.level || "") && String(saved.level || "") !== lvl) {
      restoredSessionRef.current = true;
      return;
    }

    if (!Array.isArray(saved.questions) || !saved.questions.length) {
      restoredSessionRef.current = true;
      return;
    }

    setTopic(typeof saved.topic === "string" ? saved.topic : "");
    setSentTopicForGeneration(typeof saved.sentTopicForGeneration === "string" ? saved.sentTopicForGeneration : "");
    setDiagnosticLabel(typeof saved.diagnosticLabel === "string" ? saved.diagnosticLabel : "");
    setReviewStyleLabel(typeof saved.reviewStyleLabel === "string" ? saved.reviewStyleLabel : "");
    setQuestions(saved.questions);
    setUserAnswers(Array.isArray(saved.userAnswers) ? saved.userAnswers : []);
    setQuestionShownAt(Array.isArray(saved.questionShownAt) ? saved.questionShownAt : []);
    setTimeToFirstAnswerSec(Array.isArray(saved.timeToFirstAnswerSec) ? saved.timeToFirstAnswerSec : []);
    setResult(saved.result ?? null);
    setAnalysis(typeof saved.analysis === "string" ? saved.analysis : "");
    setGenerating(!!saved.generating);
    setSubmitting(!!saved.submitting);
    setError(typeof saved.error === "string" ? saved.error : "");

    // keep history closed so user sees the restored test
    setHistoryOpen(false);

    restoredSessionRef.current = true;
  }, [context.subject, context.level, questions.length]);

  // SAVE_TEST_SESSION: persist while there are questions and test not finished
  useEffect(() => {
    if (typeof window === "undefined") return;

    const subj = (context && context.subject) ? String(context.subject) : "";
    const lvl = (context && context.level) ? String(context.level) : "";

    // If nothing to save, don't overwrite
    if (!Array.isArray(questions) || !questions.length) return;

    const session = {
      subject: subjToSave,
      level: lvlToSave,
      topic: typeof topic === "string" ? topic : "",
      sentTopicForGeneration: typeof sentTopicForGeneration === "string" ? sentTopicForGeneration : "",
      diagnosticLabel: typeof diagnosticLabel === "string" ? diagnosticLabel : "",
      reviewStyleLabel: typeof reviewStyleLabel === "string" ? reviewStyleLabel : "",
      questions,
      userAnswers: Array.isArray(userAnswers) ? userAnswers : [],
      questionShownAt: Array.isArray(questionShownAt) ? questionShownAt : [],
      timeToFirstAnswerSec: Array.isArray(timeToFirstAnswerSec) ? timeToFirstAnswerSec : [],
      result: result ?? null,
      analysis: typeof analysis === "string" ? analysis : "",
      generating: !!generating,
      submitting: !!submitting,
      error: typeof error === "string" ? error : "",
      finished: !!result, // finished when result exists
      ts: Date.now(),
    };

    saveTestSession(session);
  }, [context.subject, context.level, topic, sentTopicForGeneration, diagnosticLabel, reviewStyleLabel, questions, userAnswers, questionShownAt, timeToFirstAnswerSec, result, analysis, generating, submitting, error]);

  // CLEAR_TEST_SESSION_ON_FINISH: clear persisted session after finishing
  useEffect(() => {
    if (!result) return;
    try { clearTestSession(); } catch (_) {}
  }, [result]);
if (v === null) return false;
      return v === "1";
    } catch (_) {
      return false;
    }
  });

  const mistakeExpRef = useRef({});
  useEffect(() => {
    mistakeExpRef.current = mistakeExplanations || {};
  }, [mistakeExplanations]);

  // Auto-generate short explanations for wrong answers (once per question)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!result) return;
    if (!Array.isArray(questions) || !Array.isArray(userAnswers)) return;
    if (!questions.length) return;
    const wrong = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q) continue;
      if (userAnswers[i] === q.correctIndex) continue;
      if ((mistakeExpRef.current || {})[i]) continue;
      wrong.push(i);
    }
    if (!wrong.length) return;

    let cancelled = false;
    (async () => {
      setMistakeExplaining(true);
    setMistakeExplainErrors({});
    try { mistakeExplainAbortRef.current && mistakeExplainAbortRef.current.abort(); } catch (_) {}
    const controller = new AbortController();
    mistakeExplainAbortRef.current = controller;
      try {
        for (const idx of wrong) {
          if (cancelled) return;
          if ((mistakeExpRef.current || {})[idx]) continue;
          const q = questions[idx];
          const payload = {
            subject: context?.subject || "Математика",
            topicTitle: q?.topicTitle || (parseTopicsInput(topic)[0] || ""),
            question: q?.question,
            options: q?.options,
            correctIndex: q?.correctIndex,
            userAnswerIndex: userAnswers[idx],
          };
          try {
            const resp = await fetch("/api/explain-question", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
        signal: controller.signal,
              body: JSON.stringify(payload),
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(data?.error || "explain-failed");
            const explanation = typeof data?.explanation === "string" ? data.explanation.trim() : "";
            if (!explanation) continue;
            if (cancelled) return;
            setMistakeExplanations((prev) => ({ ...(prev || {}), [idx]: explanation }));
          } catch (_) {
            // silently ignore per-question failures
          }
        }
      } finally {
        if (!cancelled) setMistakeExplaining(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // init context
  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawCtx = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
    const parsed = safeParse(rawCtx, null);
    if (parsed && typeof parsed === "object") {
      setContext((prev) => ({ ...prev, ...parsed, level: normalizeLevel(parsed?.level) }));
    }
  }, []);

  // If user came from Progress page ("Мини‑тест" button), we may have ?topic=...
  // In that case, prefill the topic input and auto-generate a short mini-test once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("topic");
      if (t && String(t).trim()) {
        const decoded = String(t).trim();
        pendingAutoTopicRef.current = decoded;
        setTopic(decoded);
      }
    } catch (_) {}
  }, []);

  const applyContextChange = (nextCtx) => {
    const safeNext = { ...nextCtx, level: normalizeLevel(nextCtx?.level) };
    setContext(safeNext);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(safeNext));
    }
  };

  const refreshSuggestedTopics = () => {
    const bank = getTopicBank(context.subject, context.level);
    setSuggestedTopics(pickRandom(bank, 3));
  };

  useEffect(() => {
    refreshSuggestedTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.subject, context.level]);


  
const loadTestHistory = () => {
  if (typeof window === "undefined") return;

  // новый формат
  const rawBy = window.localStorage.getItem(TEST_HISTORY_BY_SUBJECT_KEY);
  let by = safeParse(rawBy, null);

  // если нет — мигрируем из legacy
  if (!by || typeof by !== "object" || Array.isArray(by)) {
    const rawLegacy = window.localStorage.getItem(TEST_HISTORY_KEY);
    const legacyArr = safeParse(rawLegacy, []);
    const legacy = Array.isArray(legacyArr) ? legacyArr : [];
    const migrated = {};
    for (const item of legacy) {
      const s = (item?.subject || "Без предмета").toString().trim() || "Без предмета";
      if (!migrated[s]) migrated[s] = [];
      migrated[s].push(item);
    }
    by = migrated;
    try { window.localStorage.setItem(TEST_HISTORY_BY_SUBJECT_KEY, JSON.stringify(by)); } catch (_) {}
  }

  const subjKey = (context.subject || "Без предмета").toString().trim() || "Без предмета";
  const curList = Array.isArray(by?.[subjKey]) ? by[subjKey] : [];

  let scoped = curList;

  // scope: current = текущий предмет (все уровни), all = все предметы
  if (historyScope === "all") {
    scoped = Object.values(by || {}).flat().filter(Boolean);
  }

  // newest first
  scoped = scoped.slice().sort((a, b) => {
    const da = new Date(a?.createdAt || a?.ts || a?.savedAt || 0).getTime();
    const db = new Date(b?.createdAt || b?.ts || b?.savedAt || 0).getTime();
    return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0);
  });

  setTestHistory(scoped.slice(0, 20));
};

  
const clearTestHistory = () => {
  if (typeof window === "undefined") return;

  const rawBy = window.localStorage.getItem(TEST_HISTORY_BY_SUBJECT_KEY);
  let by = safeParse(rawBy, null);
  if (!by || typeof by !== "object" || Array.isArray(by)) by = {};

  const subjKey = (context.subject || "Без предмета").toString().trim() || "Без предмета";

  if (historyScope === "current") {
    // очищаем историю только по текущему предмету
    by[subjKey] = [];
  } else {
    // очищаем всю историю
    by = {};
  }

  try { window.localStorage.setItem(TEST_HISTORY_BY_SUBJECT_KEY, JSON.stringify(by)); } catch (_) {}
  setHistoryTick((t) => t + 1);
};

  const canGenerate = useMemo(() => {
    return !generating && context.subject && context.level;
  }, [generating, context.subject, context.level]);

  const topRepeatedMistakes = useMemo(() => {
    if (typeof window === "undefined") return [];
    return getTopRepeatedMistakes({ subject: context.subject, level: context.level, limit: 3 });
  }, [context.subject, context.level, historyTick]);

  const canSubmit = useMemo(() => {
    if (!questions.length) return false;
    if (submitting) return false;
    // разрешаем отправить даже если не все ответы выбраны — это MVP
    return true;
  }, [questions.length, submitting]);

  const makeMistakesTopics = () => {
    try {
      if (!Array.isArray(questions) || !Array.isArray(userAnswers)) return [];
      const set = new Set();
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q) continue;
        if (userAnswers[i] === q.correctIndex) continue;
        const t = normalizeTopicKey(q.topicTitle || "");
        if (t) set.add(t);
      }
      const arr = Array.from(set);
      if (arr.length) return arr;
      const fallback = normalizeTopicKey(parseTopicsInput(topic)[0] || topic || "");
      return fallback ? [fallback] : [];
    } catch (_) {
      return [];
    }
  };

  
  // Сбрасываем тему/сессию при смене предмета или уровня
  useEffect(() => {
    // Если пришли из прогресса с ?topic=..., не затираем тему (иначе пользователь видит пустой экран)
    const pending = pendingAutoTopicRef.current;
    if (pending && String(pending).trim()) {
      setTopic(String(pending).trim());
    } else {
      setTopic("");
    }
    setSentTopicForGeneration("");
    setDiagnosticLabel("");
    if (skipContextResetRef.current) {
      // We restored an unfinished session; don't wipe it on this context sync.
      skipContextResetRef.current = false;
    } else {
      resetSession();
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.subject, context.level]);

useEffect(() => {
    loadTestHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.subject, context.level, historyScope, historyTick]);

  const resetSession = () => {
    try { clearTestSession(); } catch (_) {}
    setError("");
    setQuestions([]);
    setUserAnswers([]);
    setQuestionShownAt([]);
    setTimeToFirstAnswerSec([]);
setResult(null);
    setAnalysis("");
    setReviewing(false);
    // keep historyOpen as-is
  };

  const applySavedSession = (saved) => {
    try {
      const savedQuestions = Array.isArray(saved?.questions) ? saved.questions : [];
      if (!savedQuestions.length) return;

      const topicDisplay =
        (typeof saved.sentTopicForGeneration === "string" && saved.sentTopicForGeneration.trim())
          ? saved.sentTopicForGeneration
          : (typeof saved.topic === "string" ? saved.topic : "");

      setTopic(topicDisplay);
      setSentTopicForGeneration(topicDisplay);
      try { topicInputRef.current = topicDisplay; } catch (_) {}

      setDiagnosticLabel(typeof saved.diagnosticLabel === "string" ? saved.diagnosticLabel : "");

      setQuestions(savedQuestions);
      setUserAnswers(Array.isArray(saved.userAnswers) ? saved.userAnswers : []);
      setQuestionShownAt(Array.isArray(saved.questionShownAt) ? saved.questionShownAt : []);
      setTimeToFirstAnswerSec(Array.isArray(saved.timeToFirstAnswerSec) ? saved.timeToFirstAnswerSec : []);

      setAnalysis(typeof saved.analysis === "string" ? saved.analysis : "");
      setReviewing(!!saved.reviewing);

      setResult(null);
      setGenerating(false);
      setSubmitting(false);
      setError("");

      setHistoryOpen(false);
    } catch (_) {}
  };


  const generateFocusedTest = async (forcedTopicTitles, count = 2) => {
    setError("");
    setGenerating(true);
    setAnalysis("");
    setResult(null);
    setHistoryOpen(false);
    try {
      if (!context?.subject || !context?.level) {
        throw new Error("Нужно выбрать предмет и уровень, чтобы сгенерировать тест.");
      }
      const titles = Array.isArray(forcedTopicTitles)
        ? forcedTopicTitles.map(normalizeTopicKey).filter(Boolean)
        : [];
      if (!titles.length) throw new Error("Нет темы для закрепления.");

      const topicsToSend = titles.map((t) => ({ id: slugifyId(t), title: t }));
      setSentTopicForGeneration(titles.join(", ") || "");

      const avoid = getAvoidStemsMulti({
        subject: context.subject,
        level: context.level,
        topicTitles: titles,
      });

      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: context.subject,
          topics: topicsToSend,
          questionCount: count,
          difficulty,
          avoid,
        }),
      });

      if (!res.ok) {
        let msg = "";
        try { msg = (await res.json())?.error || ""; } catch (_) {}
        throw new Error(msg || "Не удалось сгенерировать тест");
      }

      const data = await res.json();
      const q = Array.isArray(data?.questions) ? data.questions : [];
      if (!q.length) throw new Error("Пустой тест. Попробуй ещё раз.");

      // Real topic from server
      const serverTopic = normalizeTopicKey(data?.topicTitle || q?.[0]?.topicTitle || titles[0] || "");

      resetSession();
      setQuestions(q.map((qq) => ({ ...qq, topicTitle: qq?.topicTitle || serverTopic })));
      setUserAnswers(new Array(q.length).fill(null));
      const nowMs = Date.now();
      setQuestionShownAt(new Array(q.length).fill(nowMs));
      setTimeToFirstAnswerSec(new Array(q.length).fill(null));
setTopic(serverTopic);
      setGenerating(false);
    } catch (e) {
      setError(e?.message || "Ошибка");
      setGenerating(false);
    }
  };

  // Auto-generate mini-test when opened as /tests?topic=...
  useEffect(() => {
    const pending = pendingAutoTopicRef.current;
    if (!pending || autoStartedFromQueryRef.current) return;
    if (generating) return;
    if (!context?.subject || !context?.level) return;
    if (questions.length) return;

    autoStartedFromQueryRef.current = true;

    // Generate a short mini-test (5 questions) for the chosen topic.
    // Defer to next paint so UI can render the prefilled topic first.
    const id = window.requestAnimationFrame(() => {
      generateFocusedTest([String(pending).trim()], 5);
      // Clear query param to avoid re-trigger on back/forward
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("topic");
        window.history.replaceState({}, "", url.toString());
      } catch (_) {}
    });

    return () => {
      try { window.cancelAnimationFrame(id); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.subject, context.level, generating, questions.length]);

  const generateTest = async () => {
    setError("");
    setGenerating(true);
    setAnalysis("");
    setResult(null);

    try {
      // если в инпуте отображалась "Диагностика..." — не принимаем это как настоящую тему
      const manualTopics = parseTopicsInput(topicInputRef.current || topic)
        .map(normalizeTopicKey)
        .filter((t) => t && !isBadManualTopic(t));
      const autoWeakest = getWeakestTopicFromProgress(context.subject, context.level);

      if (!context.subject) {
        throw new Error("Выбери предмет (subject), чтобы сгенерировать тест.");
      }

      // 1) Тема для генерации (никогда не пустая)
      let titles = manualTopics.length > 0 ? manualTopics : (autoWeakest ? [autoWeakest] : []);

      // Если нет ни ручной темы, ни слабой — запускаем диагностику.
      // В UI видим "Диагностика...", но в прогресс сохраняем реальную тему (fallback ниже).
      if (!titles.length) {
        const diag = `Диагностика по ${toDativeRu(context.subject)}`;
        setDiagnosticLabel(diag);
        topicInputRef.current = diag;
        setTopic(diag);
        const gen = `Базовые темы по ${context.subject}`;
        titles = [gen];
      } else {
        setDiagnosticLabel("");
        if (manualTopics.length > 0) { const v = manualTopics.join(", "); topicInputRef.current = v; setTopic(v); }
      }

      setSentTopicForGeneration(titles.join(", ") || "");

      // 2) В API отправляем объекты {id,title}.
      // Если отправить строки, /api/generate-test подставит "Без названия" в промпт.
      const topicsPayload = titles.map((t) => ({ id: slugifyId(t), title: t }));

      const avoid = getAvoidStemsMulti({
        subject: context.subject,
        level: context.level,
        topicTitles: titles,
      });

      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: context.subject,
          topics: topicsPayload,
          questionCount: 5,
          difficulty,
          avoid,
          diagnostic: manualTopics.length === 0 && !autoWeakest,
        }),
      });

      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch (_) {}
        throw new Error(data?.error || data?.message || "Не удалось сгенерировать тест.");
      }

      const data = await res.json();

      const q =
        Array.isArray(data?.questions) ? data.questions :
        Array.isArray(data?.test?.questions) ? data.test.questions :
        Array.isArray(data) ? data :
        [];

      if (!Array.isArray(q) || q.length === 0) {
        throw new Error("Сервер вернул пустой тест. Попробуй другую тему.");
      }

      // --- определяем и фиксируем финальные темы (может быть 1+), но для fallback храним первую ---
      const serverTopicRaw =
        data?.topicTitle || data?.topic || data?.test?.topicTitle || data?.test?.topic || "";

      // Если сервер вернул одну строку, берём её; иначе вытащим темы из вопросов
      let resolvedTopic = normalizeTopicKey(
        serverTopicRaw || q?.[0]?.topicTitle || sentTopicForGeneration || titles[0] || ""
      );

      // не даём теме стать пустой/"Общее"
      if (!resolvedTopic || resolvedTopic === "Общее") {
        try { resolvedTopic = normalizeTopicKey(window.localStorage.getItem(LAST_TOPIC_KEY) || ""); } catch (_) {}
      }
      if (!resolvedTopic || resolvedTopic === "Общее") {
        resolvedTopic = normalizeTopicKey(`Базовые темы по ${context.subject}`);
      }

      // запоминаем только первую тему, чтобы fallback не превращался в "Общее"
      try {
        const firstForRemember = String(resolvedTopic || "").split(",")[0]?.trim() || resolvedTopic;
        window.localStorage.setItem(LAST_TOPIC_KEY, firstForRemember);
      } catch (_) {}

      // Если показывали диагностику — теперь переключаемся на реальную тему
      setDiagnosticLabel("");

      const qWithTopic = q.map((qq) => {
        const rawT = (typeof qq?.topicTitle === "string" && qq.topicTitle.trim())
          ? qq.topicTitle.trim()
          : resolvedTopic;
        // IMPORTANT: topicTitle per question must be a single topic key
        const normSingle = normalizeTopicKeySingle(rawT);
        return { ...qq, topicTitle: normSingle };
      });

      // UI: показываем список тем теста (уникально), чтобы не оставалась только первая
      const topicSet = [];
      const seenTopics = new Set();
      for (const qq of qWithTopic) {
        const t = normalizeTopicKeySingle(qq?.topicTitle || "");
        if (!t || t === "Общее") continue;
        const low = t.toLowerCase();
        if (seenTopics.has(low)) continue;
        seenTopics.add(low);
        topicSet.push(t);
        if (topicSet.length >= 3) break;
      }
      const displayTopic = topicSet.length > 0 ? topicSet.join(", ") : resolvedTopic;
      setTopic(displayTopic);

      setQuestions(qWithTopic);
      setHistoryOpen(false);
      setUserAnswers(new Array(qWithTopic.length).fill(null));
      const nowMs = Date.now();
      setQuestionShownAt(new Array(qWithTopic.length).fill(nowMs));
      setTimeToFirstAnswerSec(new Array(qWithTopic.length).fill(null));
} catch (e) {
      setError(typeof e?.message === "string" ? e.message : "Ошибка генерации теста.");
    } finally {
      setGenerating(false);
    }
  };

  const submitTest = async () => {
    setSubmitting(true);
    setError("");
    setAnalysis("");

    try {
      const totalCount = questions.length;

      let correctCount = 0;
      const mistakes = [];
      questions.forEach((q, idx) => {
        const ua = userAnswers[idx];
        const isCorrect = typeof ua === "number" && ua === q.correctIndex;
        if (isCorrect) {
          correctCount += 1;
        } else {
          const opts = Array.isArray(q.options) ? q.options : [];
          const tSec = Array.isArray(timeToFirstAnswerSec) ? timeToFirstAnswerSec[idx] : null;
          mistakes.push({
            idx,
            question: q.question || q.text || "",
            options: opts,
            correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
            userIndex: typeof ua === "number" ? ua : null,
            explanation: q.explanation || "",
            timeSec: typeof tSec === "number" ? tSec : null,
            confident: false,
          });
        }
      });

      const score = totalCount > 0 ? correctCount / totalCount : 0;
      const scorePercent = Math.round(score * 100);

      setResult({ correctCount, totalCount, scorePercent });

      const topicRaw = String(topic || "").trim();
      const isDiag = /^Диагностика\b/i.test(topicRaw);

      // For history/review: keep a readable multi-topic label.
      let finalTopicForHistory = (!isDiag && topicRaw)
        ? normalizeTopicKey(topicRaw)
        : normalizeTopicKey(questions?.[0]?.topicTitle || sentTopicForGeneration || `Базовые темы по ${context.subject}`);

      // Remember only the FIRST topic for fallback purposes (so it doesn't become "Общее").
      try {
        const firstForRemember = String(finalTopicForHistory || "").split(",")[0]?.trim() || finalTopicForHistory;
        window.localStorage.setItem(LAST_TOPIC_KEY, firstForRemember);
      } catch (_) {}

      // --- Per-topic aggregation (so progress updates go into correct topics) ---
      const perTopic = {};
      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
        const t = normalizeTopicKeySingle(
          (typeof q?.topicTitle === "string" && q.topicTitle.trim())
            ? q.topicTitle.trim()
            : (sentTopicForGeneration || `Базовые темы по ${context.subject}`)
        );
        const key = t || "Общее";
        if (!perTopic[key]) perTopic[key] = { total: 0, correct: 0, questions: [], mistakes: [] };
        perTopic[key].total += 1;
        const ua = userAnswers[idx];
        const isCorrect = typeof ua === "number" && ua === q.correctIndex;
        if (isCorrect) perTopic[key].correct += 1;
        perTopic[key].questions.push(q);
      }

      // Attach topicTitle to mistakes for accurate per-topic stats
      const mistakesWithTopic = mistakes.map((m) => {
        const qt = questions?.[m.idx]?.topicTitle || sentTopicForGeneration || `Базовые темы по ${context.subject}`;
        return { ...m, topicTitle: normalizeTopicKeySingle(qt) };
      });

      // Remember questions to avoid repeats in future tests (per topic)
      Object.entries(perTopic).forEach(([tKey, info]) => {
        if (!tKey || tKey === "Общее") return;
        pushQuestionsToBank({
          subject: context.subject,
          level: context.level,
          topicTitle: tKey,
          questions: info.questions,
        });
      });


      // агрегаты по ошибкам
      const avgTime =
        mistakes.filter((m) => typeof m.timeSec === "number").reduce((s, m) => s + m.timeSec, 0) /
        Math.max(1, mistakes.filter((m) => typeof m.timeSec === "number").length);
      const confidentWrong = mistakes.filter((m) => m.confident).length;

      const _mistakesSummary = {
        wrongCount: mistakes.length,
        avgTimeSec: Number.isFinite(avgTime) ? +avgTime.toFixed(1) : null,
        confidentWrongCount: confidentWrong,
      };

      // обновляем карту знаний
            // сигналы для прогресса: уверенность + время
            const uncertainCorrectCount = 0;
      const confidentCorrectCount = 0;

      const timeNums = (Array.isArray(timeToFirstAnswerSec) ? timeToFirstAnswerSec : []).filter(
        (x) => typeof x === "number" && Number.isFinite(x)
      );
      const avgTimeAll =
        timeNums.length > 0 ? +(timeNums.reduce((s, x) => s + x, 0) / timeNums.length).toFixed(2) : null;

      const signals = {
        confidentWrong: confidentWrong,
        uncertainCorrect: uncertainCorrectCount,
        confidentCorrect: confidentCorrectCount,
        avgTimeSec: avgTimeAll,
      };

      // обновляем карту знаний
      // обновляем карту знаний по каждой теме отдельно
      const kmErrors = [];
      Object.entries(perTopic).forEach(([tKey, info]) => {
        if (!tKey || tKey === "Общее") return;
        const r = updateKnowledgeFromTest({
          subject: context.subject,
          level: context.level,
          topic: tKey,
          correctCount: info.correct,
          totalCount: info.total,
          signals,
        });
        if (!(r?.ok === true)) kmErrors.push(`${tKey}: ${r?.error || "unknown"}`);
      });
      const kmRes = kmErrors.length > 0 ? { ok: false, error: kmErrors.join("; ") } : { ok: true, error: null };

      // обновляем статистику ошибок (по каждой теме)
      const mistakesByTopic = {};
      for (const m of mistakesWithTopic) {
        const tKey = normalizeTopicKeySingle(m?.topicTitle || "");
        if (!tKey || tKey === "Общее") continue;
        if (!mistakesByTopic[tKey]) mistakesByTopic[tKey] = [];
        mistakesByTopic[tKey].push(m);
      }
      Object.entries(mistakesByTopic).forEach(([tKey, arr]) => {
        updateMistakeStats({
          subject: context.subject,
          level: context.level,
          topic: tKey,
          mistakes: arr,
        });
      });

      // пишем историю тестов
      const hRes = pushTestHistory({
        subject: context.subject,
        level: context.level,
        topic: finalTopicForHistory,
        score: clamp01(score),
        correctCount,
        totalCount,
        mistakesSummary: _mistakesSummary,
      });

      setSaveInfo({
        ts: new Date().toISOString(),
        historyOk: hRes?.ok === true,
        historyCount: hRes?.count || 0,
        historyError: hRes?.error || null,
        kmOk: kmRes?.ok === true,
        kmError: kmRes?.error || null,
      });

      if (!(hRes?.ok === true)) {
        setError(`Не удалось сохранить историю теста: ${hRes?.error || "unknown"}`);
      } else if (!(kmRes?.ok === true)) {
        setError(`История сохранена, но прогресс не обновился: ${kmRes?.error || "unknown"}`);
      }

      // обновим блок истории тестов на странице
      setHistoryTick((t) => t + 1);
      try { loadTestHistory(); } catch (_) {}
    } catch (e) {
      setError(typeof e?.message === "string" ? e.message : "Ошибка при проверке теста.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewMistakes = async () => {
    setReviewing(true);
    setError("");
    setAnalysis("");

    try {
      const topicRaw = String(topic || "").trim();
      const isDiag = /^Диагностика\b/i.test(topicRaw);

      let finalTopic = (!isDiag && topicRaw)
        ? topicRaw
        : (questions?.[0]?.topicTitle || sentTopicForGeneration || "");

      if (!finalTopic) {
        try { finalTopic = window.localStorage.getItem(LAST_TOPIC_KEY) || ""; } catch (_) {}
      }

      if (!finalTopic) finalTopic = `Базовые темы по ${context.subject}`;

      finalTopic = normalizeTopicKey(finalTopic);

      try { window.localStorage.setItem(LAST_TOPIC_KEY, finalTopic); } catch (_) {}

      const reviewTopicKey = `${context.subject}|${context.level}|${finalTopic}`;
      const pickedReview = pickNextReviewStyle(reviewTopicKey);
      const reviewStyle = pickedReview.next;
      setReviewStyleLabel(reviewStyle.label);


      // Remember questions to avoid repeats in future tests
      pushQuestionsToBank({
        subject: context.subject,
        level: context.level,
        topicTitle: finalTopic,
        questions,
      });

      const res = await fetch("/api/review-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: context.subject,
          topic: finalTopic,
          questions,
          userAnswers,
          reviewStyleKey: reviewStyle?.key || "",
          reviewStyleLabel: reviewStyle?.label || "",
          reviewStyleInstruction: reviewStyle?.instruction || "",
        }),
      });

      if (!res.ok) {
        let data = {};
        try {
          data = await res.json();
        } catch (_) {}
        throw new Error(data?.error || data?.message || "Не удалось получить разбор ошибок.");
      }

      const data = await res.json();
      setAnalysis(typeof data?.analysis === "string" ? data.analysis : "");
      try { markReviewStyleUsed(reviewTopicKey, reviewStyle?.key); } catch (_) {}
    } catch (e) {
      setError(typeof e?.message === "string" ? e.message : "Ошибка разбора ошибок.");
    } finally {
      setReviewing(false);
    }
  };

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
          
        {showResumeModal && pendingSession ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0B0B10]/90 p-5 text-purple-50 shadow-2xl">
              <div className="text-[14px] font-semibold">Незавершённый тест</div>
              <div className="mt-2 text-[12px] text-purple-100/80 leading-relaxed">
                У тебя есть незавершённый тест в этой сессии. Продолжим или сбросим?
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResumeModal(false);
                    resumeDismissedRef.current = true;
                    applySavedSession(pendingSession);
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-purple-200 text-black text-[12px] font-semibold hover:bg-purple-100 transition"
                >
                  Продолжить
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResumeModal(false);
                    resumeDismissedRef.current = true;
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-white/20 bg-black/30 text-[12px] text-purple-50 hover:bg-white/5 transition"
                >
                  Отложить
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResumeModal(false);
                    resumeDismissedRef.current = true;
                    try { clearTestSession(); } catch (_) {}
                    resetSession();
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-white/20 bg-black/20 text-[12px] text-purple-100/80 hover:bg-white/5 transition"
                >
                  Сбросить тест
                </button>
              </div>
            </div>
          </div>
        ) : null}

<div className="w-full max-w-5xl flex flex-col gap-6 bg-white/5 bg-clip-padding backdrop-blur-sm border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-purple-200/80 bg-white/5 px-3 py-1 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-300" />
                  <span>Мини-тесты</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold">Тесты</h1>
                  <p className="text-xs md:text-sm text-purple-200 mt-1 max-w-xl">
                    Сгенерируй мини-тест, пройди его — и прогресс по теме обновится автоматически.
                  </p>
                </div>
              </div>

              <div className="w-full md:w-[280px] space-y-2">
                <div>
                  <p className="text-[11px] text-purple-200/80 mb-1">Предмет</p>
                  <select
                      value={context.subject}
                      onChange={(e) => applyContextChange({ ...context, subject: e.target.value })}
                      disabled={generating}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                </div>

                <div>
                  <p className="text-[11px] text-purple-200/80 mb-1">Уровень</p>
                  <select
                    value={context.level}
                    onChange={(e) =>
                      applyContextChange({ ...context, level: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    disabled={generating}
                  >
                    <option>7–9 класс</option>
                    <option>10–11 класс</option>
                    
                  </select>
                </div>


                <div>
                  <p className="text-[11px] text-purple-200/80 mb-1">Сложность</p>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    disabled={generating}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-purple-200/80 mt-1">{difficultyHint(difficulty)}</p>
                </div>

              </div>
            </section>

            <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    Тема теста
                  </p>
                  <input
                    value={topic}
                    onChange={(e) => { const v = e.target.value; topicInputRef.current = v; setTopic(v); }}
                    disabled={generating}
                    placeholder="Например: Производная, Кинематика, Причастные обороты…"
                    className="mt-2 w-full text-xs md:text-sm px-3 py-2 rounded-xl bg-black/30 border border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-purple-300/70"
                  />
                  <p className="text-[11px] text-purple-200/80 mt-2">
                    Можно оставить пустым — NOOLIX возьмёт самую слабую тему из прогресса. Если прогресса ещё нет — введи тему.
                  </p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-wide text-purple-300/80">Предложенные темы</p>
                      <button
                        type="button"
                        onClick={refreshSuggestedTopics}
                        disabled={generating}
                        className="px-3 py-1.5 rounded-full border border-white/15 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Заменить темы
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestedTopics.map((t) => (
                        <button
                          key={t}
                          type="button"
                          disabled={generating}
                          onClick={() => {
                            setTopic((prev) => {
                              const cur = parseTopicsInput(prev);
                              const exists = cur.some((x) => x.toLowerCase() === String(t).toLowerCase());
                              const merged = exists
                                ? cur.filter((x) => x.toLowerCase() !== String(t).toLowerCase())
                                : [...cur, t];
                              const next = merged.join(", ");
                              topicInputRef.current = next;
                              return next;
                            });
                          }}
                          className="px-3 py-2 rounded-full border text-[11px] transition bg-black/30 border-white/20 text-purple-50 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t}
                        </button>
                      ))}
                      {(!suggestedTopics || suggestedTopics.length === 0) ? (
                        <span className="text-[11px] text-purple-200/70">Пока нет банка тем для этого выбора — введи тему вручную.</span>
                      ) : null}
                    </div>
                  </div>

                </div>

                <div className="flex gap-2 md:justify-end">
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => { if (generating) return; topicInputRef.current = ""; setTopic(""); resetSession(); }}
                    className={ACTION_BTN}
                  >
                    Сброс
                  </button>

                  <button
                    type="button"
                    onClick={generateTest}
                    disabled={!canGenerate}
                    className={ACTION_BTN_DISABLED}
                  >
                    {generating ? "Генерация…" : "Сгенерировать тест"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-black/40 border border-red-400/30 rounded-xl p-3 text-xs text-red-200">
                  {error}
                </div>
              )}

            {restoredNotice ? (
              <div className="mt-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-[12px] text-purple-50/90 flex items-center justify-between gap-3">
                <span>Восстановлен незавершённый тест.</span>
                <button
                  type="button"
                  onClick={() => {
                    resetSession();
                    setRestoredNotice(false);
                  }}
                  className="px-3 py-2 rounded-full border border-white/20 bg-black/30 text-[11px] text-purple-50 hover:bg-white/5 transition whitespace-nowrap"
                >
                  Сбросить
                </button>
              </div>
            ) : null}

            </section>

            {/* История тестов */}
            <section className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                    История тестов
                  </p>
                  <p className="text-xs md:text-sm text-purple-100/90">
                    {historyScope === "current"
                    ? "Последние попытки по текущему предмету (все уровни)."
                    : "Последние попытки по всем предметам и уровням."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className={ACTION_BTN}
                >
                  {historyOpen ? "Свернуть" : "Развернуть"}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryScope((s) => (s === "current" ? "all" : "current"))}
                  className={ACTION_BTN}
                >
                  {historyScope === "current" ? "Показать все" : "Только текущие"}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTick((t) => t + 1)}
                  className={ACTION_BTN}
                >
                  Обновить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      historyScope === "current"
                        ? "Очистить историю по текущему предмету (все уровни)?"
                        : "Очистить ВСЮ историю мини‑тестов?"
                    );
                    if (ok) clearTestHistory();
                  }}
                  className="px-3 py-2 rounded-full border border-red-300/30 bg-black/30 text-[11px] text-red-100 hover:bg-white/5 transition"
                >
                  Очистить
                </button>
              </div>
              </div>

              {historyOpen ? (
                <>

              {testHistory.length > 0 && (
                <div className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-purple-100/90 flex flex-wrap gap-2">
                  <span>Показано: <b>{testHistory.length}</b></span>
                  <span>•</span>
                  <span>
                    Средний результат:{" "}
                    <b>
                      {Math.round(
                        (testHistory.reduce((sum, x) => sum + (x?.score ?? 0), 0) /
                          Math.max(1, testHistory.length)) *
                          100
                      )}
                      %
                    </b>
                  </span>
                </div>
              )}

              {testHistory.length === 0 ? (
                <p className="text-xs text-purple-200/80">
                  Пока нет попыток. Пройди мини-тест — и здесь появится история.
                </p>
              ) : (
                <div className="space-y-2">
                  {testHistory.map((h) => {
                    const pct = Math.round((h?.score ?? 0) * 100);
                    const when = h?.createdAt ? new Date(h.createdAt).toLocaleString() : "";
                    return (
                      <div
                        key={h.id}
                        className="bg-black/20 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {h.topic || "Тема"}
                          </p>
                          <p className="text-[11px] text-purple-200/80">
                            Результат: {pct}% • {h.correctCount}/{h.totalCount} • {h.level}
                            {when ? ` • ${when}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <a
                            href={`/chat?topic=${encodeURIComponent(h.topic || "")}`}
                            className={ACTION_BTN}
                          >
                            Разобрать в чате →
                          </a>
                          <a
                            href="/progress"
                            className={ACTION_BTN}
                          >
                            Прогресс
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

                </>
              ) : null}
            </section>

            {/* questions */}
            {questions.length > 0 && (
              <section className="space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                  Вопросы
                </p>

                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-sm">
                          {idx + 1}. {q.question}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {(Array.isArray(q.options) ? q.options : []).map((opt, oi) => {
                          const checked = userAnswers[idx] === oi;
                          return (
                            <label
                              key={oi}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition cursor-pointer
                                ${
                                  checked
                                    ? "bg-white/10 border-purple-300/60"
                                    : "bg-black/20 border-white/10 hover:bg-white/5"
                                }`}
                            >
                              <input
                                type="radio"
                                name={`q_${idx}`}
                                checked={checked}
                                onChange={() => {
                                  setTimeToFirstAnswerSec((prev) => {
                                    const next = Array.isArray(prev) ? [...prev] : [];
                                    if (next[idx] === null || typeof next[idx] !== "number") {
                                      const shown = Array.isArray(questionShownAt) ? questionShownAt[idx] : null;
                                      if (typeof shown === "number") {
                                        const sec = (Date.now() - shown) / 1000;
                                        next[idx] = +sec.toFixed(1);
                                      } else {
                                        next[idx] = null;
                                      }
                                    }
                                    return next;
                                  });
                                  setUserAnswers((prev) => {
                                    const next = [...prev];
                                    next[idx] = oi;
                                    return next;
                                  });
                                }}
                              />
                              <span className="text-xs md:text-sm text-purple-50">
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={submitTest}
                    disabled={!canSubmit}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-br from-purple-300 to-purple-500 text-black text-xs md:text-sm font-semibold shadow-lg hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Проверяем…" : "Завершить и сохранить результат"}
                  </button>

                  <a
                    href="/progress"
                    className="px-4 py-2 rounded-2xl border border-white/20 bg-black/30 text-xs md:text-sm text-purple-50 hover:bg-white/5 transition"
                  >
                    Перейти в прогресс
                  </a>
                </div>

                {result && (
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                      Результат
                    </p>
                    <p className="text-sm">
                      Правильных:{" "}
                      <span className="font-semibold">
                        {result.correctCount}/{result.totalCount}
                      </span>{" "}
                      · Итог:{" "}
                      <span className="font-semibold">{result.scorePercent}%</span>
                    </p>
                    <p className="text-[11px] text-purple-200/80">
                      Прогресс по теме обновлён (см. страницу “Прогресс”).
                    </p>
                    {saveInfo ? (
                      <p className="text-[11px] text-purple-200/80">
                        Сохранение: история {saveInfo.historyOk ? "✓" : "✕"} (в памяти: {saveInfo.historyCount}) • прогресс {saveInfo.kmOk ? "✓" : "✕"}
                      </p>
                    ) : null}


                    {result && Array.isArray(questions) && Array.isArray(userAnswers) && questions.length > 0 ? (
                      <div className="mt-3 bg-black/20 border border-white/10 rounded-2xl p-3 space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                          Ошибки по этому тесту
                        </p>

                        <div className="space-y-2">
                          {questions
                            .map((q, i) => ({ q, i }))
                            .filter(({ q, i }) => userAnswers[i] !== q.correctIndex)
                            .map(({ q, i }) => {
                              const userIdx = userAnswers[i];
                              const userText =
                                typeof userIdx === "number" && q.options?.[userIdx]
                                  ? q.options[userIdx]
                                  : "—";
                              const correctText =
                                typeof q.correctIndex === "number" && q.options?.[q.correctIndex]
                                  ? q.options[q.correctIndex]
                                  : "—";
                              const topicTitle = q.topicTitle || (parseTopicsInput(topic)[0] || "");
                              const chatHref = `/chat?topic=${encodeURIComponent(topicTitle || "Разбор ошибки")}&prefill=${encodeURIComponent(
                                `Разбери ошибку по вопросу: "${q.question}". Я ответил: "${userText}", правильный ответ: "${correctText}". Объясни, где ошибка, и дай 1 похожий пример.`
                              )}&autosend=1`;

                              return (
                                <div
                                  key={i}
                                  className="bg-black/30 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">
                                      {i + 1}. {q.question}
                                    </p>
                                    <p className="text-[11px] text-purple-200/80">
                                      Твой ответ: {userText} • Правильно: {correctText}
                                    </p>
                                    {mistakeExplanations[i] ? (
                                      <p className="mt-1 text-[11px] text-purple-100/80 whitespace-pre-wrap leading-relaxed">
                                        <span className="text-purple-300/80">Объяснение:</span> {mistakeExplanations[i]}
                                        {mistakeExplainErrors[i] ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              (async () => {
                                                try {
                                                  const controller = new AbortController();
                                                  mistakeExplainAbortRef.current = controller;
                                                  const resp = await fetch("/api/explain-question", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    signal: controller.signal,
                                                    body: JSON.stringify({
                                                      question: mistakes[i]?.question,
                                                      options: mistakes[i]?.options,
                                                      correctIndex: mistakes[i]?.correctIndex,
                                                      topicTitle: mistakes[i]?.topicTitle,
                                                      subject: context.subject,
                                                      level: context.level,
                                                    }),
                                                  });
                                                  const data = await resp.json();
                                                  const exp = data?.explanation || data?.text || "";
                                                  setMistakeExplanations((prev) => {
                                                    const next = Array.isArray(prev) ? [...prev] : [];
                                                    next[i] = exp || "Не удалось получить объяснение.";
                                                    return next;
                                                  });
                                                  setMistakeExplainErrors((prev) => {
                                                    const n = { ...(prev || {}) };
                                                    delete n[i];
                                                    return n;
                                                  });
                                                } catch (_) {}
                                              })();
                                            }}
                                            className="ml-2 underline text-[11px] text-purple-200/80 hover:text-purple-100"
                                          >
                                            Повторить
                                          </button>
                                        ) : null}
                                      </p>
                                    ) : (mistakeExplaining ? (
                                      <p className="mt-1 text-[11px] text-purple-200/50">Готовим объяснение…</p>
                                    ) : null)}
                                  </div>
                                  <div className="flex gap-2 flex-wrap md:justify-end">
                                    <a
                                      href={chatHref}
                                      className={ACTION_BTN}
                                    >
                                      Разобрать в диалоге →
                                    </a>
                                  </div>
                                </div>
                              );
                            })}

                          {questions.filter((q, i) => userAnswers[i] !== q.correctIndex).length === 0 ? (
                            <p className="text-xs text-purple-200/80">
                              Ошибок нет — отлично.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {topRepeatedMistakes.length > 0 && (
                      <div className="mt-3 bg-black/20 border border-white/10 rounded-2xl p-3 space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                          Повторяющиеся ошибки
                        </p>
                        <div className="space-y-2">
                          {topRepeatedMistakes.map((m) => {
                            const repeats = m.count || 2;
                            const tag = classifyMistake({
                              timeSec: typeof m.avgTimeSec === "number" ? m.avgTimeSec : null,
                              confident: (m.confidentWrongCount || 0) >= 1,
                              repeats,
                            });
                            return (
                              <div
                                key={m.key}
                                className="bg-black/30 border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">
                                    {m.topic || "Тема"}
                                  </p>
                                  <p className="text-[11px] text-purple-200/80">
                                    {tag} • повторов: {repeats}
                                    {typeof m.avgTimeSec === "number" ? ` • сред. время: ${m.avgTimeSec}s` : ""}
                                  </p>
                                </div>
                                <div className="flex gap-2 flex-wrap md:justify-end">
                                  <button
                                    type="button"
                                    onClick={() => generateFocusedTest([m.topic || topic?.trim() || "Базовые понятия"], 2)}
                                    className={ACTION_BTN}
                                  >
                                    Закрепить (2)
                                  </button>
                                  <a
                                    href={`/chat?topic=${encodeURIComponent(m.topic || "")}`}
                                    className={ACTION_BTN}
                                  >
                                    Разобрать в чате →
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}


                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const topicsForMistakes = makeMistakesTopics();
                          if (topicsForMistakes.length) generateFocusedTest(topicsForMistakes, 5);
                        }}
                        disabled={generating || !result || questions.filter((q, i) => userAnswers[i] !== q.correctIndex).length === 0}
                        className={ACTION_BTN_DISABLED}
                      >
                        Ещё 5 вопросов по ошибкам
                      </button>

                      <button
                        type="button"
                        onClick={reviewMistakes}
                        disabled={reviewing}
                        className={ACTION_BTN_DISABLED}
                      >
                        {reviewing ? "Делаем разбор…" : "Разобрать ошибки"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          try {
                            const topicsForExplain = makeMistakesTopics();
                            const topicText = topicsForExplain && topicsForExplain.length
                              ? topicsForExplain.join(", ")
                              : (parseTopicsInput(topic)[0] || topic || "эту тему");

                            const prefill =
                              `Объясни тему: ${topicText}.

` +
                              `Сделай так:
` +
                              `1) Очень простое объяснение.
` +
                              `2) 3 коротких примера.
` +
                              `3) 2 тренировочные задачи (с ответами).
` +
                              `4) Типичные ошибки и как их избежать.
`;

                            const href = `/chat?prefill=${encodeURIComponent(prefill)}&autosend=1`;
                            window.location.href = href;
                          } catch (_) {
                            window.location.href = "/chat";
                          }
                        }}
                        disabled={generating || !result}
                        className={ACTION_BTN_DISABLED}
                      >
                        Объяснить тему →
                      </button>

                      <a
                        href="/chat"
                        className={ACTION_BTN}
                      >
                        Обсудить в диалоге →
                      </a>
                    </div>
                  </div>
                )}

                {analysis && (
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-purple-300/80">
                      Разбор ошибок
                    </p>
                    {reviewStyleLabel ? (
                      <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-purple-100/90">
                        <span>🧠</span>
                        <span>Разбор: {reviewStyleLabel}</span>
                      </div>
                    ) : null}
                    <div className="text-xs md:text-sm text-purple-50 whitespace-pre-wrap leading-relaxed">
                      
              {result && Array.isArray(questions) && Array.isArray(userAnswers) && questions.length > 0 ? (
                <div className="mt-4 bg-black/30 border border-white/10 rounded-3xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Твои ошибки</p>
                    <p className="text-[11px] text-purple-200/80">
                      Показаны только неверные ответы
                    </p>
                  </div>

                  <div className="mt-3 space-y-3">
                    {questions
                      .map((q, i) => ({ q, i }))
                      .filter(({ q, i }) => userAnswers[i] !== q.correctIndex)
                      .map(({ q, i }) => {
                        const userIdx = userAnswers[i];
                        const userText =
                          typeof userIdx === "number" && q.options?.[userIdx]
                            ? q.options[userIdx]
                            : "—";
                        const correctText =
                          typeof q.correctIndex === "number" && q.options?.[q.correctIndex]
                            ? q.options[q.correctIndex]
                            : "—";
                        const topicTitle = q.topicTitle || (parseTopicsInput(topic)[0] || "");
                        const chatHref = `/chat?topic=${encodeURIComponent(topicTitle || "Разбор ошибки")}&prefill=${encodeURIComponent(
                          `Разбери ошибку по вопросу: "${q.question}". Я ответил: "${userText}", правильный ответ: "${correctText}". Объясни и дай 1 похожий пример.`
                        )}&autosend=1`;

                        return (
                          <div key={i} className="bg-black/30 border border-white/10 rounded-2xl p-3">
                            <p className="text-sm font-semibold">
                              {i + 1}. {q.question}
                            </p>
                            <div className="mt-2 grid md:grid-cols-2 gap-2">
                              <div className="text-[12px] text-purple-100/90">
                                <span className="text-purple-300/80">Твой ответ:</span>{" "}
                                {userText}
                              </div>

                            {mistakeExplanations[i] ? (
                              <p className="mt-2 text-[12px] text-purple-100/90 whitespace-pre-wrap leading-relaxed">
                                <span className="text-purple-300/80">Объяснение:</span> {mistakeExplanations[i]}
                              </p>
                            ) : (mistakeExplaining ? (
                              <p className="mt-2 text-[11px] text-purple-200/50">Готовим объяснение…</p>
                            ) : null)}
                              <div className="text-[12px] text-purple-100/90">
                                <span className="text-purple-300/80">Правильно:</span>{" "}
                                {correctText}
                              </div>
                            </div>

                            <div className="mt-3 flex gap-2">
                              <a
                                href={chatHref}
                                className={ACTION_BTN}
                              >
                                Разобрать в диалоге →
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    {questions.filter((q, i) => userAnswers[i] !== q.correctIndex).length === 0 ? (
                      <p className="text-xs text-purple-200/80">
                        Ошибок нет — идеально.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

{analysis}
                    </div>
                  </div>
                )}
              </section>
            )}
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
