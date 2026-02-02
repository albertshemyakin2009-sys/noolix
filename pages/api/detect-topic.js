// pages/api/detect-topic.js
// Умное определение темы по диалогу: возвращает короткое название темы (2–6 слов) или пустую строку.

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
    const { subject, level, messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Нужен массив messages" });
    }

    const subj = String(subject || "").trim();
    const lvl = String(level || "").trim();

    // берём кусок истории (чтобы не жечь токены)
    const slice = messages
      .slice(-12)
      .map((m) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: String(m?.content || ""),
      }))
      .filter((m) => m.content.trim());

    const systemPrompt = `
Ты — модуль NOOLIX, который определяет ТОЛЬКО название темы по диалогу ученика с тьютором.

Правила:
- Верни JSON строго вида: {"topic":"..."}.
- topic — короткое название темы (2–6 слов), без кавычек внутри, без точек.
- НЕЛЬЗЯ возвращать: "__no_topic__", "Без темы", "Тест", "Диагностика", "Общее", названия классов ("7–9 класс"), уровни ("10–11 класс").
- НЕ возвращай название предмета (${subj || "предмет"}) как тему.
- Если по диалогу нельзя уверенно выделить тему — верни {"topic":""}.
`.trim();

    const userPrompt = `
Предмет: ${subj || "не указан"}
Уровень: ${lvl || "не указан"}

Фрагмент диалога:
${slice
  .map((m) => `${m.role === "user" ? "Ученик" : "Тьютор"}: ${m.content}`)
  .join("\n\n")}
`.trim();

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
        temperature: 0,
      }),
    });

    if (!openaiRes.ok) {
      let errText = "";
      try {
        errText = await openaiRes.text();
      } catch (_) {}
      console.error("OpenAI detect-topic error:", openaiRes.status, errText);
      return res.status(500).json({
        error: "Ошибка при обращении к OpenAI (detect-topic)",
        details: errText || openaiRes.statusText,
      });
    }

    const data = await openaiRes.json();
    const content = data?.choices?.[0]?.message?.content || "";

    // Парсим JSON максимально бережно
    let topic = "";
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const obj = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      topic = typeof obj?.topic === "string" ? obj.topic : "";
    } catch (_) {
      // fallback: если модель вернула просто строку
      topic = String(content || "").trim();
    }

    // финальная санитарка на сервере
    topic = topic.replace(/[«»"]/g, "").trim();
    topic = topic.replace(/[.!?…]+$/g, "").trim();

    const low = topic.toLowerCase();
    const banned = [
      "__no_topic__",
      "без темы",
      "без названия",
      "общее",
      "general",
      "тест",
      "тесты",
      "диагностика",
    ];
    const isGrade = /\b\d{1,2}\s*(?:[–—-]\s*\d{1,2})?\s*класс\b/i.test(topic);
    if (!topic || banned.includes(low) || isGrade) topic = "";

    if (subj && low === subj.toLowerCase()) topic = "";

    // ограничим длину на всякий случай
    if (topic.length > 80) topic = "";

    return res.status(200).json({ topic });
  } catch (error) {
    console.error("detect-topic API error:", error);
    return res.status(500).json({
      error: "Internal server error в detect-topic",
      details: typeof error?.message === "string" ? error.message : "Unknown error",
    });
  }
}
