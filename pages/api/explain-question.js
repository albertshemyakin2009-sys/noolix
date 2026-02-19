// pages/api/explain-question.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не разрешён. Используй POST." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Отсутствует OPENAI_API_KEY на сервере. Добавь его в переменные окружения Vercel.",
    });
  }

  try {
    const {
      subject = "Математика",
      topicTitle = "",
      question = "",
      options = [],
      correctIndex,
      userAnswerIndex,
    } = req.body || {};

    const qText = String(question || "").trim();
    const opts = Array.isArray(options) ? options.map((o) => String(o ?? "").trim()).filter(Boolean) : [];

    if (!qText || opts.length < 2 || !Number.isInteger(Number(correctIndex))) {
      return res.status(400).json({ error: "Некорректные входные данные для объяснения." });
    }

    const cIdx = Number(correctIndex);
    const uIdx = Number.isInteger(Number(userAnswerIndex)) ? Number(userAnswerIndex) : null;

    const correct = opts[cIdx] ?? "";
    const chosen = uIdx !== null ? (opts[uIdx] ?? "") : "";

    const systemPrompt =
      "Ты — школьный репетитор. Дай короткое, понятное объяснение ошибки и правильного решения. " +
      "Пиши по-русски, без лишней воды, без markdown, 2–5 предложений. " +
      "Не используй формулировки 'как ИИ'. Не ссылайся на источники.";

    const userPrompt = `
Предмет: ${subject}
Тема: ${topicTitle || "(не указано)"}

Вопрос: ${qText}

Варианты:
${opts.map((o, i) => `${i + 1}) ${o}`).join("\n")}

Правильный ответ: ${cIdx + 1}) ${correct}
Ответ ученика: ${uIdx !== null ? `${uIdx + 1}) ${chosen}` : "(не выбран)"}

Сформулируй:
1) Где ошибка/что нужно помнить (1–2 предложения)
2) Мини-объяснение как решить/проверить (1–3 предложения)
`.trim();

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
        temperature: 0.2,
        max_tokens: 220,
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorBody);
      return res.status(500).json({ error: "Ошибка при обращении к OpenAI API", details: errorBody });
    }

    const completion = await openaiResponse.json();
    const raw = completion.choices?.[0]?.message?.content && String(completion.choices[0].message.content).trim();

    const explanation = raw ? raw.replace(/\s+$/g, "").trim() : "";
    if (!explanation) {
      return res.status(500).json({ error: "Модель не вернула объяснение." });
    }

    return res.status(200).json({ explanation });
  } catch (e) {
    console.error("explain-question error:", e);
    return res.status(500).json({ error: "Не удалось сгенерировать объяснение." });
  }
}
