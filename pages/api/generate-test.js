// pages/api/generate-test.js

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

    // Поддержка topics как массива строк (и массива объектов):
    // - строка => { id: topic_<n>, title: <строка> }
    // - объект => { id, title }
    const normalizedTopics = Array.isArray(topics)
      ? topics
          .map((t, i) => {
            if (typeof t === 'string') {
              const title = t.trim();
              return { id: `topic_${i + 1}`, title: title || 'Без названия' };
            }
            if (t && typeof t === 'object') {
              const id = (t.id || `topic_${i + 1}`).toString();
              const title = (t.title || '').toString().trim() || 'Без названия';
              return { id, title };
            }
            return { id: `topic_${i + 1}`, title: 'Без названия' };
          })
          .filter((x) => x && x.title)
      : [];


    if (!subject || !Array.isArray(topics) || normalizedTopics.length === 0) {
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

    const topicsListForPrompt = normalizedTopics
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

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
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
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse error in /api/generate-test:", e, raw);
      return res.status(500).json({
        error:
          "Не удалось разобрать ответ модели как JSON. Попробуй ещё раз.",
      });
    }

    let questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    questions = questions
      .filter(
        (q) =>
          q &&
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correctIndex === "number" &&
          q.correctIndex >= 0 &&
          q.correctIndex < 4
      )
      .slice(0, safeQuestionCount)
      .map((q, index) => {
        const topicTitle =
          typeof q.topicTitle === "string" && q.topicTitle.trim()
            ? q.topicTitle.trim()
            : normalizedTopics[0]?.title || "Тема";

        const topicId =
          typeof q.topicId === "string" && q.topicId.trim()
            ? q.topicId.trim()
            : normalizedTopics[0]?.id || "custom";

        let normalizedDifficulty = q.difficulty;
        if (!["easy", "medium", "hard"].includes(normalizedDifficulty)) {
          normalizedDifficulty = difficultyToken;
        }

        return {
          question: String(q.question).trim(),
          options: q.options.map((opt) => String(opt).trim()),
          correctIndex: q.correctIndex,
          topicId,
          topicTitle,
          difficulty: normalizedDifficulty,
          index,
        };
      });

    if (questions.length === 0) {
      return res.status(500).json({
        error:
          "Удалось разобрать ответ модели, но список вопросов пуст. Попробуй ещё раз.",
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
