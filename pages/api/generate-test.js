// pages/api/generate-test.js

async function callOpenAI(apiKey, systemPrompt, userPrompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    let errText = "";
    try {
      errText = await response.text();
    } catch (_) {}
    throw new Error(
      `OpenAI error ${response.status}: ${errText || response.statusText}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Пустой ответ от OpenAI при генерации теста");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(
      "Не удалось распарсить JSON от OpenAI при генерации теста"
    );
  }

  const questions = parsed?.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("OpenAI вернул некорректную структуру вопросов (questions)");
  }

  return questions;
}

function isNNTopicTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  return (
    t.includes("н и нн") ||
    t.includes("н/нн") ||
    t.includes("н и н н") ||
    t.includes("нн и н")
  );
}

function isQuestionValid(rawQ, topicsMap, isNNTest) {
  if (!rawQ) return false;

  const qText = (rawQ.question || "").toString().trim();
  if (!qText || qText.length < 5) return false;

  if (!Array.isArray(rawQ.options) || rawQ.options.length !== 4) return false;

  const options = rawQ.options.map((o) => (o || "").toString().trim());
  if (options.some((o) => !o)) return false;

  // Варианты не должны быть все одинаковые
  const uniqueOpts = new Set(options);
  if (uniqueOpts.size < 2) return false;

  const ci = rawQ.correctIndex;
  if (typeof ci !== "number" || ci < 0 || ci > 3) return false;

  // Убедимся, что правильный вариант входит в массив
  if (!options[ci]) return false;

  // Привязка к теме
  const topicId = rawQ.topicId;
  if (!topicId || !topicsMap[topicId]) {
    return false;
  }

  // Дополнительная проверка для темы Н/НН
  if (isNNTest) {
    // Очень грубый, но полезный фильтр:
    // — Вопрос должен содержать либо Н/н, либо подчёркивания "__"
    const hasN = /н/iu.test(qText);
    const hasGap = qText.includes("__") || qText.includes("_");
    if (!hasN && !hasGap) {
      return false;
    }
  }

  return true;
}

function normalizeQuestion(rawQ, index, defaultTopic, diff) {
  const topicId = rawQ.topicId || defaultTopic.id;
  const topicTitle = rawQ.topicTitle || defaultTopic.title;

  return {
    id: rawQ.id ?? index + 1,
    question: String(rawQ.question || "").trim(),
    options: Array.isArray(rawQ.options)
      ? rawQ.options.map((o) => String(o || ""))
      : [],
    correctIndex:
      typeof rawQ.correctIndex === "number" &&
      rawQ.correctIndex >= 0 &&
      rawQ.correctIndex <= 3
        ? rawQ.correctIndex
        : 0,
    topicId,
    topicTitle,
    difficulty: rawQ.difficulty || diff,
    explanation: rawQ.explanation
      ? String(rawQ.explanation)
      : "Правильный ответ основан на определении или базовом свойстве темы.",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY не задан в переменных окружения" });
  }

  try {
    const {
      subject,
      topics,
      questionCount,
      difficulty,
      previousQuestions,
    } = req.body || {};
    const count = Number(questionCount) || 5;

    const diff = ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "medium";

    if (!subject || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        error: "Нужны subject и хотя бы одна тема в массиве topics",
      });
    }

    const topicsMap = {};
    topics.forEach((t) => {
      if (t && t.id) topicsMap[t.id] = t;
    });

    const isNNTest = topics.some((t) => isNNTopicTitle(t.title));
    const bannedQuestions = Array.isArray(previousQuestions)
      ? previousQuestions.map((q) => (q || "").toString().trim())
      : [];

    const topicsForPrompt = topics
      .map((t) => `- ID: ${t.id}, название: "${t.title}"`)
      .join("\n");

    const systemPrompt = [
      "Ты — генератор тестовых вопросов для школьников и студентов.",
      "Всегда отвечай строго в формате валидного JSON, без пояснений и текста вне JSON.",
      "Структура ответа:",
      "{",
      '  "questions": [',
      "    {",
      '      "id": 1,',
      '      "question": "Текст вопроса",',
      '      "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],',
      '      "correctIndex": 0,',
      '      "topicId": "ID_из_списка",',
      '      "topicTitle": "Название темы из списка",',
      '      "difficulty": "easy | medium | hard",',
      '      "explanation": "Краткое объяснение правильного ответа"',
      "    }",
      "  ]",
      "}",
      "Не добавляй никакого текста вне JSON. Только JSON-объект.",
    ].join("\n");

    const difficultyText =
      diff === "easy"
        ? "Уровень сложности: лёгкий. Делай вопросы базового уровня, одношаговые, без сложных комбинаций и длинных вычислений."
        : diff === "hard"
        ? "Уровень сложности: сложный. Используй задания повышенной сложности, допускаются элементы олимпиадного уровня, но оставайся в рамках школьной программы. Вопросы могут требовать 2–4 шага рассуждения."
        : "Уровень сложности: средний. Стандартный школьный/ЕГЭ уровень: вопросы с 2–3 шагами рассуждения, но без экстремальной сверхсложности.";

    const nnText = isNNTest
      ? [
          "",
          "Дополнительные жёсткие требования:",
          '— Темы связаны с правописанием Н и НН. ВСЕ вопросы должны проверять именно Н/НН в прилагательных, причастиях и отглагольных прилагательных.',
          "— НЕЛЬЗЯ смешивать сюда другие орфограммы (пропущенные гласные, согласные и т.п.).",
          '— НЕЛЬЗЯ давать слово целиком в правильном написании внутри формулировки. Используй пропуски или подчёркивания: например, "деревя__ый дом", "глиня__ая посуда".',
        ].join("\n")
      : "";

    const avoidText =
      bannedQuestions.length > 0
        ? [
            "",
            "Избегай формулировок, слишком похожих на эти вопросы (не копируй их дословно):",
            bannedQuestions
              .map((q, i) => `${i + 1}) ${q}`)
              .join("\n"),
          ].join("\n")
        : "";

    const baseUserPrompt = [
      `Предмет: ${subject}.`,
      `Нужно сгенерировать ${count} вопросов с вариантами ответов (4 варианта, один правильный).`,
      difficultyText,
      "",
      "Каждый вопрос должен быть привязан к одной из тем из списка ниже.",
      "Список тем:",
      topicsForPrompt,
      "",
      "Критически важные правила для всех вопросов:",
      "1) Варианты ответов:",
      "   - Всегда РОВНО ОДИН правильный вариант среди четырёх.",
      "   - Остальные варианты должны быть правдоподобными, но неправильными.",
      "",
      "2) НИКАКИХ подсказок в самом вопросе:",
      "   - Если проверяется правописание, НИКОГДА не давай слово полностью в правильном виде внутри формулировки.",
      '   - Используй подчёркивания или пропуски: например, "деревя__ый дом", "глиня__ая посуда".',
      '   - НЕ пиши слово целиком как "глиняный", если вопрос про Н/НН в этом слове.',
      "",
      "3) Тематическая чистота:",
      "   - Строго придерживайся тем из списка.",
      "4) Структура вопросов:",
      "   - Формулировки должны быть чёткими и однозначными.",
      "   - Вопрос не должен допускать два правильных ответа.",
      "",
      "5) Объяснение:",
      "   - explanation должно кратко объяснять, ПОЧЕМУ выбранный вариант правильный и чем неправильные отличаются.",
      nnText,
      avoidText,
      "",
      "Сгенерируй массив questions, соблюдая эту спецификацию.",
    ].join("\n");

    const collected = [];
    const seenQuestions = new Set(bannedQuestions);

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (collected.length >= count) break;

      let rawQuestions;
      try {
        rawQuestions = await callOpenAI(apiKey, systemPrompt, baseUserPrompt);
      } catch (err) {
        // Если это первая попытка — выкинем ошибку дальше,
        // если нет — попробуем ещё раз
        if (attempt === maxAttempts - 1) {
          throw err;
        } else {
          continue;
        }
      }

      for (const rawQ of rawQuestions) {
        if (collected.length >= count) break;

        const defaultTopic = topics[0];
        const normQuestion = normalizeQuestion(
          rawQ,
          collected.length,
          defaultTopic,
          diff
        );

        const qText = normQuestion.question.trim();
        if (!qText || seenQuestions.has(qText)) {
          continue;
        }

        if (!isQuestionValid(normQuestion, topicsMap, isNNTest)) {
          continue;
        }

        collected.push(normQuestion);
        seenQuestions.add(qText);
      }
    }

    if (collected.length === 0) {
      return res.status(500).json({
        error:
          "Не удалось собрать корректные вопросы для теста. Попробуй ещё раз или сократи количество вопросов.",
      });
    }

    const finalQuestions = collected.slice(0, count);

    return res.status(200).json({ questions: finalQuestions });
  } catch (error) {
    console.error("generate-test API error:", error);
    return res.status(500).json({
      error: "Internal server error в генерации теста",
      details:
        typeof error?.message === "string" ? error.message : "Unknown error",
    });
  }
}
