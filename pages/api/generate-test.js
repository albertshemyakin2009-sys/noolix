// pages/api/generate-test.js

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
    const { subject, topics, questionCount, difficulty } = req.body || {};
    const count = Number(questionCount) || 5;

    const diff = ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "medium";

    if (!subject || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        error: "Нужны subject и хотя бы одна тема в массиве topics",
      });
    }

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
        ? "Уровень сложности: сложный. Используй задания повышенной сложности, допускаются элементы олимпиадного уровня, но оставайся в рамках школьной программы."
        : "Уровень сложности: средний. Стандартный школьный/ЕГЭ уровень: вопросы с 2–3 шагами рассуждения, но без экстремальной сверхсложности.";

    const userPrompt = [
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
      '   - Если тема связана с правописанием Н и НН (например, содержит слова "Н и НН" или близкую формулировку), ВСЕ вопросы должны проверять именно Н/НН.',
      "   - Не смешивай в таких тестах другие орфограммы (пропущенные согласные, гласные и т.п.).",
      "",
      "4) Структура вопросов:",
      "   - Формулировки должны быть чёткими и однозначными.",
      "   - Вопрос не должен допускать два правильных ответа.",
      "",
      "5) Объяснение:",
      "   - explanation должно кратко объяснять, ПОЧЕМУ выбранный вариант правильный и чем неправильные отличаются.",
      "",
      "Сгенерируй массив questions, соблюдая эту спецификацию.",
    ].join("\n");

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
          temperature: 0.5,
        }),
      }
    );

    if (!openaiResponse.ok) {
      let errText = "";
      try {
        errText = await openaiResponse.text();
      } catch (_) {}
      console.error(
        "OpenAI generate-test error:",
        openaiResponse.status,
        errText
      );
      return res.status(500).json({
        error: "Ошибка при обращении к OpenAI (генерация теста)",
        details: errText || openaiResponse.statusText,
      });
    }

    const data = await openaiResponse.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return res.status(500).json({
        error: "Пустой ответ от OpenAI при генерации теста",
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error in generate-test:", e, content);
      return res.status(500).json({
        error: "Не удалось распарсить JSON от OpenAI",
        details:
          "Попробуй ещё раз. Если ошибка повторяется — чуть измени параметры теста.",
      });
    }

    const questions = parsed?.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({
        error: "OpenAI вернул некорректную структуру вопросов",
      });
    }

    const normalized = questions.map((q, index) => ({
      id: q.id ?? index + 1,
      question: String(q.question || "").trim(),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correctIndex:
        typeof q.correctIndex === "number" ? q.correctIndex : 0,
      topicId: q.topicId || topics[0].id,
      topicTitle: q.topicTitle || topics[0].title,
      difficulty: q.difficulty || diff,
      explanation: q.explanation
        ? String(q.explanation)
        : "Правильный ответ основан на определении или базовом свойстве темы.",
    }));

    return res.status(200).json({ questions: normalized });
  } catch (error) {
    console.error("generate-test API error:", error);
    return res.status(500).json({
      error: "Internal server error в генерации теста",
      details:
        typeof error?.message === "string" ? error.message : "Unknown error",
    });
  }
}
