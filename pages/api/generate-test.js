// pages/api/generate-test.js


const extractJsonObject = (text) => {
  if (!text || typeof text !== "string") return null;
  const s = text.trim();

  // Fast path: already pure JSON
  if (s.startsWith("{") && s.endsWith("}")) return s;

  // Try to find the first {...} JSON object in the text
  const firstBrace = s.indexOf("{");
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      return s.slice(firstBrace, i + 1);
    }
  }
  return null;
};

const normalizeQuestions = ({ parsed, topics, difficultyToken, safeQuestionCount }) => {
  let questions = Array.isArray(parsed?.questions) ? parsed.questions : [];

  const topicById = new Map(
    (Array.isArray(topics) ? topics : [])
      .map((t) => ({
        id: typeof t?.id === "string" ? t.id.trim() : "",
        title: typeof t?.title === "string" ? t.title.trim() : "",
      }))
      .filter((t) => t.id)
      .map((t) => [t.id, t])
  );

  const normalizeDifficulty = (d) =>
    ["easy", "medium", "hard"].includes(d) ? d : difficultyToken;

  const cleanStr = (v) => String(v ?? "").trim();

  const cleanOptions = (opts) =>
    (Array.isArray(opts) ? opts : [])
      .map((o) => cleanStr(o))
      .filter(Boolean)
      .slice(0, 4);

  const isOkIndex = (x) =>
    Number.isInteger(x) && x >= 0 && x < 4;

  const seenStems = new Set();
  const out = [];

  for (const q of questions) {
    if (!q || typeof q.question !== "string") continue;

    const question = cleanStr(q.question);
    if (!question) continue;

    const options = cleanOptions(q.options);
    if (options.length !== 4) continue;

    // avoid duplicate options
    const optKey = options.map((o) => o.toLowerCase()).join("||");
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) continue;

    const correctIndex = Number(q.correctIndex);
    if (!isOkIndex(correctIndex)) continue;

    const stem = question.toLowerCase().replace(/\s+/g, " ").slice(0, 140);
    if (seenStems.has(stem)) continue;
    seenStems.add(stem);

    let topicId = cleanStr(q.topicId);
    let topicTitle = cleanStr(q.topicTitle);

    if (!topicId) topicId = topics?.[0]?.id || "custom";
    if (!topicTitle) topicTitle = topics?.[0]?.title || "Тема";

    if (topicById.has(topicId)) {
      const t = topicById.get(topicId);
      if (!topicTitle) topicTitle = t.title || topicTitle;
    }

    out.push({
      question,
      options,
      correctIndex,
      topicId,
      topicTitle,
      difficulty: normalizeDifficulty(q.difficulty),
    });

    if (out.length >= safeQuestionCount) break;
  }

  return out.map((q, index) => ({ ...q, index }));
};

const lower = (v) => String(v || "").toLowerCase();

const detectTopicMode = (topics) => {
  const t = (Array.isArray(topics) ? topics : []).map((x) => lower(x?.title)).join(" ");
  const isGeometry =
    /(геометр|треуголь|окружн|угол|вектор|площад|параллел|трапец|ромб)/.test(t);
  const isAlgebra =
    /(алгебр|уравнен|квадратн|неравенств|функц|логарифм|степен|прогресс|многочлен|корен)/.test(t);
  if (isGeometry && !isAlgebra) return "geometry";
  if (isAlgebra && !isGeometry) return "algebra";
  return "mixed";
};

const buildForbiddenText = (topics, subject) => {
  const mode = detectTopicMode(topics);
  const subj = lower(subject);
  if (subj.includes("матем")) {
    if (mode === "algebra") {
      return [
        "Запрещено уходить в геометрию (треугольники/окружности/углы/площади/векторы/подобие).",
        "Все вопросы должны быть именно по алгебре и строго по выбранным темам.",
      ].join("\n");
    }
    if (mode === "geometry") {
      return [
        "Запрещено уходить в алгебру (уравнения/неравенства/логарифмы/функции/прогрессии), если это не часть выбранных тем.",
        "Все вопросы должны быть именно по геометрии и строго по выбранным темам.",
      ].join("\n");
    }
  }
  return "Не уходи в другие разделы предмета: все вопросы должны строго соответствовать выбранным темам.";
};

const looksOffTopic = (questions, topics, subject) => {
  const subj = lower(subject);
  if (!subj.includes("матем")) return false;
  const mode = detectTopicMode(topics);
  if (mode === "mixed") return false;

  const geoKw = /(треуголь|окружн|угол|площад|вектор|параллел|трапец|ромб|диагонал)/i;
  const algKw = /(уравнен|неравенств|функц|логарифм|степен|прогресс|корен|многочлен)/i;

  let bad = 0;
  for (const q of questions || []) {
    const s = String(q?.question || "");
    if (mode === "algebra" && geoKw.test(s)) bad++;
    if (mode === "geometry" && algKw.test(s)) bad++;
  }
  // if 2+ questions clearly from the other area — treat as drift
  return bad >= 2;
};

const buildRepairPrompt = ({ rawText, subject, topicsListForPrompt, safeQuestionCount, difficultyToken, difficultyLabel, avoidText }) => {
  return `
Твоя задача — ИСПРАВИТЬ ответ так, чтобы он стал строго валидным JSON по схеме теста.
Не меняй смысл предмета/уровня сложности, но исправь структуру, недостающие поля, количество вариантов, индексы и т.д.
Если в исходном тексте несколько объектов — оставь один.

Предмет: ${subject}
Количество вопросов: ${safeQuestionCount}
Сложность: ${difficultyToken} (${difficultyLabel})

Темы:
${topicsListForPrompt}

${avoidText ? `Ограничение: НЕ используй формулировки, близкие к этим стемам:\n${avoidText}\n` : ""}

Верни СТРОГО ОДИН JSON без текста до/после:

{
  "questions": [
    {
      "question": "текст вопроса",
      "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
      "correctIndex": 0,
      "topicId": "topicId из списка или custom",
      "topicTitle": "название темы",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

Ниже исходный ответ, который нужно поправить:

${rawText}
`.trim();
};


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Метод не разрешён. Используй POST." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "Отсутствует OPENAI_API_KEY на сервере. Добавь его в переменные окружения Vercel.",
    });
  }

  try {
    const {
      subject,
      topics,
      questionCount = 5,
      difficulty = "medium",
      avoid,
    } = req.body || {};

    if (!subject || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        error:
          "Нужно передать subject и массив topics (минимум одна тема) для генерации теста.",
      });
    }

    const safeQuestionCount =
      typeof questionCount === "number" &&
      questionCount > 0 &&
      questionCount <= 20
        ? questionCount
        : 5;

    const difficultyLabelMap = {
      easy: "лёгкий уровень — базовые школьные задания, 1 шаг решения, без подвохов",
      medium:
        "средний уровень — задания из экзаменов/контрольных, 2–3 шага решения, иногда лишние данные",
      hard: "сложный уровень — повышенная/олимпиадная сложность, нестандартные формулировки, требуется глубокое понимание темы",
    };

    const difficultyToken =
      difficulty === "easy" || difficulty === "hard" || difficulty === "medium"
        ? difficulty
        : "medium";

    const difficultyLabel = difficultyLabelMap[difficultyToken];

    const topicsListForPrompt = topics
      .map((t, i) => {
        const id = t.id || `topic_${i + 1}`;
        const title = t.title || "Без названия";
        return `- topicId: "${id}", title: "${title}"`;
      })
      .join("\n");

    const avoidArr = Array.isArray(avoid) ? avoid : [];
    const avoidText = avoidArr
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .slice(0, 30)
      .map((s) => `- ${s}`)
      .join("\n");

    const systemPrompt =
      "Ты — опытный преподаватель и составитель школьных тестов (ЕГЭ, ОГЭ, олимпиадных заданий) по разным предметам. " +
      "Твоя задача — генерировать проверяемые тестовые вопросы с одним правильным ответом и понятной структурой JSON.";

    const userPrompt = `
Составь тест по предмету: ${subject}.

Темы для теста (используй их содержательно, НЕ игнорируй):
${topicsListForPrompt}

${buildForbiddenText(topics, subject)}

Количество вопросов: ${safeQuestionCount}

Уровень сложности: ${difficultyToken}.
Описание уровня: ${difficultyLabel}.

Требования к вопросам:
- Все вопросы должны соответствовать указанному уровню сложности.
- Вариантов ответа всегда РОВНО 4.
- Правильный ответ всегда ТОЛЬКО один.
- Варианты ответа должны быть правдоподобными (никаких очевидно шуточных или бессмысленных вариантов).
- Нельзя повторять один и тот же вопрос.
- Формулировки должны быть естественными для школьных заданий.
\nЕсли передан список avoid — НЕ повторяй и не перефразируй вопросы, похожие на эти стемы (это чтобы не повторять тесты):\n${avoidText || "(нет)"}.\n\nОбязательный формат ответа (СТРОГО JSON, без текста до или после):

{
  "questions": [
    {
      "question": "текст вопроса",
      "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
      "correctIndex": 0,
      "topicId": "идентификатор_темы_из_списка_выше_или_custom",
      "topicTitle": "название темы",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

Правила по полям:
- "correctIndex" — целое число от 0 до 3.
- "topicId" — используй topicId из списка выше, если он есть; если тема одна и она свободная — используй "custom".
- "difficulty" для каждого вопроса должен быть согласован с общим уровнем сложности теста:
  - если выбран лёгкий уровень — ставь "easy";
  - если средний — "medium";
  - если сложный — "hard".
- НЕ добавляй никаких комментариев, пояснений, markdown, текста до или после JSON.
Только один корректный JSON-объект.
`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: difficultyToken === "hard" ? 0.5 : 0.3,
          max_tokens: 1200,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorBody);
      return res.status(500).json({
        error: "Ошибка при обращении к OpenAI API",
        details: errorBody,
      });
    }

    const completion = await openaiResponse.json();
    const raw =
      completion.choices?.[0]?.message?.content &&
      String(completion.choices[0].message.content).trim();

    if (!raw) {
      return res.status(500).json({
        error: "Модель не вернула контент при генерации теста.",
      });
    }

    let parsed;
    let rawForParse = raw;

    // 1) Try parse directly, then try extract JSON object from surrounding text.
    const extracted = extractJsonObject(rawForParse);
    if (extracted) rawForParse = extracted;

    try {
      parsed = JSON.parse(rawForParse);
    } catch (e) {
      parsed = null;
    }

    // 2) Normalize & validate.
    let questions = parsed ? normalizeQuestions({ parsed, topics, difficultyToken, safeQuestionCount }) : [];
// 2.5) If the model drifted away from the selected topics (e.g., algebra topic but geometry questions),
// try one strict re-generation pass (content fix, not just JSON repair).
if (questions && questions.length > 0 && looksOffTopic(questions, topics, subject)) {
  const strictSystem =
    systemPrompt +
    " ВАЖНО: ты строго соблюдаешь темы теста и НЕ уходишь в другие разделы. Если тема алгебра — никакой геометрии и наоборот.";

  const strictUser = userPrompt + "\n\nПроверь каждый вопрос: он должен быть строго по выбранным темам. Если не по теме — замени на вопрос по теме.";

  const strictResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: strictSystem },
        { role: "user", content: strictUser },
      ],
      temperature: 0.0,
      max_tokens: 1200,
    }),
  });

  if (strictResp.ok) {
    const strictData = await strictResp.json();
    const strictRaw = String(strictData?.choices?.[0]?.message?.content || "").trim();
    const strictExtracted = extractJsonObject(strictRaw) || strictRaw;
    try {
      const strictParsed = JSON.parse(strictExtracted);
      const strictQuestions = normalizeQuestions({
        parsed: strictParsed,
        topics,
        difficultyToken,
        safeQuestionCount,
      });
      if (strictQuestions && strictQuestions.length > 0 && !looksOffTopic(strictQuestions, topics, subject)) {
        questions = strictQuestions;
      }
    } catch (_) {}
  }
}

    // 3) If failed, attempt a single repair pass with the model.
    if (!questions || questions.length === 0) {
      const systemFix =
        "Ты — строгий валидатор и редактор JSON. Ты возвращаешь только валидный JSON без пояснений.";

      const userFix = buildRepairPrompt({
        rawText: raw,
        subject,
        topicsListForPrompt,
        safeQuestionCount,
        difficultyToken,
        difficultyLabel,
        avoidText,
      });

      const fixResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: systemFix },
            { role: "user", content: userFix },
          ],
          temperature: 0.0,
          max_tokens: 1400,
        }),
      });

      if (fixResp.ok) {
        const fixData = await fixResp.json();
        const fixRaw = String(fixData?.choices?.[0]?.message?.content || "").trim();
        const fixExtracted = extractJsonObject(fixRaw) || fixRaw;
        try {
          const fixParsed = JSON.parse(fixExtracted);
          questions = normalizeQuestions({ parsed: fixParsed, topics, difficultyToken, safeQuestionCount });
        } catch (_) {}
      }
    }

    if (!questions || questions.length === 0) {
      console.error("generate-test: could not validate questions", { raw: raw?.slice?.(0, 500) });
      return res.status(500).json({
        error: "Не удалось получить валидные вопросы теста. Попробуй ещё раз.",
      });
    }

    return res.status(200).json({ questions });
  } catch (error) {
    console.error("Error in /api/generate-test:", error);
    return res.status(500).json({
      error: "Внутренняя ошибка при генерации теста.",
      details: error.message || String(error),
    });
  }
}
