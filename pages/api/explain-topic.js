// pages/api/explain-topic.js

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
    const { subject, topic, level } = req.body || {};

    if (!subject || !topic) {
      return res.status(400).json({
        error: "Нужны subject и topic для объяснения темы",
      });
    }

    const levelText = level || "старшеклассник (8–11 класс)";

    const systemPrompt = `
Ты — тьютор NOOLIX. Твоя задача — подробно и понятно объяснять темы школьной программы.

Формат объяснения:
1. Краткая интуитивная идея (2–3 предложения).
2. Формальное правило/определение.
3. 3–5 примеров с пояснениями.
4. Типичные ошибки и ловушки.
5. Мини-практика: 3–5 небольших заданий без ответов (чтобы ученик сначала подумал сам).

Требования:
- Объясняй по-русски, простым языком, но не примитивно.
- Структурируй ответ заголовками и списками.
- Не сокращай объяснение слишком сильно — лучше чуть подробнее, чем слишком кратко.
`.trim();

    const userPrompt = `
Предмет: ${subject}
Тема: ${topic}
Уровень ученика: ${levelText}

Сделай объяснение по указанному формату.
`.trim();

    const response = await fetch(
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
          temperature: 0.4,
        }),
      }
    );

    if (!response.ok) {
      let errText = "";
      try {
        errText = await response.text();
      } catch (_) {}
      console.error("OpenAI explain-topic error:", response.status, errText);
      return res.status(500).json({
        error: "Ошибка при обращении к OpenAI (explain-topic)",
        details: errText || response.statusText,
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    return res.status(200).json({ explanation: content });
  } catch (error) {
    console.error("explain-topic API error:", error);
    return res.status(500).json({
      error: "Internal server error в explain-topic",
      details:
        typeof error?.message === "string" ? error.message : "Unknown error",
    });
  }
}
