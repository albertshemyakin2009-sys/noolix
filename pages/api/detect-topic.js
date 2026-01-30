// pages/api/detect-topic.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY не задан в переменных окружения",
    });
  }

  try {
    const { subject, level, userText, assistantText } = req.body || {};
    const subj = String(subject || "").trim();
    const lvl = String(level || "").trim();
    const u = String(userText || "").trim();
    const a = String(assistantText || "").trim();

    if (!subj || !u) {
      return res.status(400).json({ error: "Нужны subject и userText" });
    }

    const systemPrompt = `
Ты — компонент NOOLIX, который определяет НАЗВАНИЕ ТЕМЫ по фрагменту диалога.

Задача:
- Верни короткое название темы (2–6 слов), по-русски.
- Это должна быть конкретная учебная тема, а не общий предмет.
- НЕЛЬЗЯ: "Математика", "Физика", "Русский язык", "Диагностика", "Базовые темы", "Изучено", "Без темы", "Общее".
- Нельзя возвращать целые предложения, вопросы, абзацы, кавычки и переносы строк.
- Если нельзя уверенно выделить тему — верни пустую строку "".

Формат ответа: СТРОГО JSON и ничего больше:
{"topicTitle":"..."}
`.trim();

    const userPrompt = `
Предмет: ${subj}
Уровень: ${lvl || "не указан"}

Сообщение ученика:
${u}

Ответ тьютора (если есть):
${a || "—"}
`.trim();

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
        temperature: 0.2,
        max_tokens: 120,
      }),
    });

    if (!response.ok) {
      let errText = "";
      try { errText = await response.text(); } catch (_) {}
      console.error("OpenAI detect-topic error:", response.status, errText);
      return res.status(500).json({
        error: "Ошибка при обращении к OpenAI (detect-topic)",
        details: errText || response.statusText,
      });
    }

    const data = await response.json();
    const raw = String(data?.choices?.[0]?.message?.content || "").trim();

    // Parse JSON safely
    let topicTitle = "";
    try {
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
        if (parsed && typeof parsed.topicTitle === "string") topicTitle = parsed.topicTitle.trim();
      }
    } catch (_) {
      topicTitle = "";
    }

    // Final sanitization on server
    topicTitle = String(topicTitle || "").replace(/[\n\r\t]+/g, " ").replace(/\s+/g, " ").trim();
    if (topicTitle.length > 80) topicTitle = "";
    if (/^(математика|физика|русский язык|английский язык)$/i.test(topicTitle)) topicTitle = "";
    if (/^диагностика\b/i.test(topicTitle)) topicTitle = "";
    if (/^базовые\s+темы\b/i.test(topicTitle)) topicTitle = "";
    if (/^(без темы|без названия|общее|general|изучено)$/i.test(topicTitle)) topicTitle = "";
    if (/[\?\!\.]/.test(topicTitle)) topicTitle = "";

    return res.status(200).json({ topicTitle });
  } catch (error) {
    console.error("detect-topic API error:", error);
    return res.status(500).json({
      error: "Internal server error в detect-topic",
      details: typeof error?.message === "string" ? error.message : "Unknown error",
    });
  }
}
