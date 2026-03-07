const SUGGESTED_TOPICS_BANK = {
  default: [
    "Алгебра: уравнения",
    "Геометрия: треугольники",
    "Функции и графики",
    "Проценты и пропорции",
    "Текстовые задачи",
    "Вероятность и статистика",
  ],
  "Математика": {
    "7–9 класс": [
      "Линейные уравнения",
      "Квадратные уравнения",
      "Системы уравнений",
      "Дроби и проценты",
      "Геометрия: углы и треугольники",
      "Неравенства",
      "Графики функций",
    ],
    "10–11 класс": [
      "ЕГЭ: производная",
      "ЕГЭ: тригонометрия",
      "ЕГЭ: планиметрия",
      "ЕГЭ: стереометрия",
      "ЕГЭ: логарифмы",
      "ЕГЭ: параметры",
      "ЕГЭ: вероятность",
    ],
    default: [
      "Уравнения и неравенства",
      "Функции",
      "Геометрия",
      "Тригонометрия",
      "Вероятность",
      "Текстовые задачи",
    ],
  },
};

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

export function getSuggestedTopics(subject, level, limit = 3) {
  const subj = String(subject || "").trim() || "Математика";
  const lvl = String(level || "").trim();
  const subjectBank = SUGGESTED_TOPICS_BANK[subj];
  const bank = (subjectBank && (subjectBank[lvl] || subjectBank.default)) || SUGGESTED_TOPICS_BANK.default;
  const unique = Array.from(new Set((bank || []).filter(Boolean)));
  return shuffle(unique).slice(0, Math.max(0, Number(limit) || 3));
}

export { SUGGESTED_TOPICS_BANK };
