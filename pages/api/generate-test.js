// pages/api/generate-test.js

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

function normalizeText(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function validateAndNormalizeQuestions({
  parsed,
  topics,
  safeQuestionCount,
  difficultyToken,
}) {
  let questions = Array.isArray(parsed?.questions) ? parsed.questions : [];

  // Basic schema validation
  questions = questions
    .filter(
      (q) =>
        q &&
        isNonEmptyString(q.question) &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex < 4
    )
    .slice(0, safeQuestionCount);

  // Normalize + deeper validation
  const seenQuestions = new Set();
  const cleaned = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    const questionText = normalizeText(q.question);
    if (!questionText) continue;

    const key = questionText.toLowerCase();
    if (seenQuestions.has(key)) continue;

    const options = q.options.map((opt) => normalizeText(opt));
    if (options.some((opt) => !opt)) continue;

    // Disallow duplicate options (case-insensitive)
    const optSet = new Set(options.map((o) => o.toLowerCase()));
    if (optSet.size !== 4) continue;

    const correctIndex = q.correctIndex;
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3)
      continue;

    const topicTitle =
      isNonEmptyString(q.topicTitle) ? normalizeText(q.topicTitle) : topics?.[0]?.title || "Тема";
    const topicId =
      isNonEmptyString(q.topicId) ? normalizeText(q.topicId) : topics?.[0]?.id || "custom";

    let normalizedDifficulty = q.difficulty;
    if (!['easy', 'medium', 'hard'].includes(normalizedDifficulty)) {
      normalizedDifficulty = difficultyToken;
    }

    cleaned.push({
      question: questionText,
      options,
      correctIndex,
      topicId,
      topicTitle,
      difficulty: normalizedDifficulty,
      index: cleaned.length,
    });

    seenQuestions.add(key);
  }

  return cleaned;
}

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

    const systemPrompt =
      "Ты — опытный преподаватель и составитель школьных тестов (ЕГЭ, ОГЭ, олимпиадных заданий) по разным предметам. " +
      "Твоя задача — генерировать проверяемые тестовые вопросы с одним правильным ответом и понятной структурой JSON.";

    const userPrompt = `
Составь тест по предмету: ${subject}.

Темы для теста (используй их содержательно, НЕ игнорируй):
${topicsListForPrompt}

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

Обязательный формат ответа (СТРОГО JSON, без текста до или после):

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

    const temperature = difficultyToken === "hard" ? 0.5 : 0.3;

    const requestOnce = async (extraInstruction = "") => {
      const combinedUserPrompt = `${userPrompt}\n\n${extraInstruction}`.trim();

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
              { role: "user", content: combinedUserPrompt },
            ],
            temperature,
            max_tokens: 1200,
          }),
        }
      );

      if (!openaiResponse.ok) {
        const errorBody = await openaiResponse.text();
        return { ok: false, errorBody, status: openaiResponse.status };
      }

      const completion = await openaiResponse.json();
      const raw =
        completion.choices?.[0]?.message?.content &&
        String(completion.choices[0].message.content).trim();

      return { ok: true, raw: raw || "" };
    };

    const strictFixInstruction = `
Проверь ответ перед отправкой и исправь формат. Требования:
- Верни только один JSON-объект (без текста/markdown).
- questions: массив объектов.
- Для каждого вопроса: ровно 4 уникальных непустых options.
- correctIndex: целое 0..3.
- topicId/topicTitle: соответствуют списку тем.
Если сомневаешься — переформулируй вопрос и варианты так, чтобы формат был валиден.
`;

    const attempts = [
      { extra: "" },
      { extra: strictFixInstruction },
    ];

    let lastRaw = "";
    let questions = [];

    for (let attempt = 0; attempt < attempts.length; attempt++) {
      const r = await requestOnce(attempts[attempt].extra);

      if (!r.ok) {
        console.error("OpenAI API error:", r.status, r.errorBody);
        return res.status(500).json({
          error: "Ошибка при обращении к OpenAI API",
          details: r.errorBody,
        });
      }

      lastRaw = r.raw;
      if (!lastRaw) continue;

      let parsed;
      try {
        parsed = JSON.parse(lastRaw);
      } catch (e) {
        console.error("JSON parse error in /api/generate-test:", e);
        continue;
      }

      questions = validateAndNormalizeQuestions({
        parsed,
        topics,
        safeQuestionCount,
        difficultyToken,
      });

      // Consider generation "good" if we have at least 2 questions (or 1 if asked for 1)
      const minAcceptable = safeQuestionCount === 1 ? 1 : 2;
      if (questions.length >= minAcceptable) break;
    }

    if (questions.length === 0) {
      console.error("Failed to generate valid questions. Last raw:", lastRaw);
      return res.status(500).json({
        error:
          "Не удалось сгенерировать корректный тест (формат/варианты ответов). Попробуй ещё раз.",
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
