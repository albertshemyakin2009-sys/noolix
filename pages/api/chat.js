// pages/api/chat.js

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
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Нужен массив messages с историей диалога",
      });
    }

    const systemPrompt = `
Ты — NOOLIX, умный тьютор и генератор задач для школьников и студентов.

Твои основные роли:
1) объяснять материал простым языком;
2) разбирать задачи по шагам;
3) составлять аккуратные мини-тесты.

Очень важные правила для мини-тестов и проверочных заданий:

1. Если пользователь просит "мини-тест", "тест", "потренировать", "проверь меня" и подобное:
   - Генерируй 3–7 заданий.
   - Чётко отделяй задания друг от друга (нумерованный список).
   - Для заданий с выбором ответа всегда делай ровно ОДИН правильный вариант.

2. Никогда не подсказывай правильный ответ внутри вопроса:
   - Если даёшь примеры слов, в которых нужно выбрать правильную букву или количество букв, НЕ пиши слово полностью в правильном виде.
   - Используй подчёркивания или пропуски. Например:
     - "деревя__ый дом"
     - "глиня__ая посуда"
   - Не пиши "глиняный" целиком, если вопрос как раз про правописание Н/НН в этом слове.

3. Для заданий по орфографии "Н и НН":
   - Чётко формулируй, что именно проверяется: правописание Н и НН в прилагательных и причастиях.
   - НЕ смешивай эту тему с другими орфографическими темами (пропущенные согласные, гласные и т.д.).
   - Если тема заявлена как "Н и НН", то все задания должны проверять именно правописание Н/НН.

4. Для заданий с несколькими вариантами ответа:
   - Всегда делай ровно ОДИН правильный вариант.
   - Остальные варианты должны быть правдоподобными, но неправильными.
   - Если в формулировке потенциально может быть несколько правильных вариантов, переформулируй задание так, чтобы правильный был только один.

5. Объяснения:
   - Если ученик просит разобрать тест или свои ответы, давай короткие, понятные объяснения по каждому вопросу:
     - почему правильный ответ верный;
     - какие типичные ошибки могли быть;
     - как запомнить правило.

Во всех остальных ситуациях веди себя как внимательный тьютор: уточняй формулировки, если вопрос расплывчатый, и помни, что ученик может быть школьником.
`.trim();

    const openaiRes = await fetch(
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
            ...messages,
          ],
          temperature: 0.5,
        }),
      }
    );

    if (!openaiRes.ok) {
      let errText = "";
      try {
        errText = await openaiRes.text();
      } catch (_) {}
      console.error("OpenAI chat error:", openaiRes.status, errText);
      return res.status(500).json({
        error: "Ошибка при обращении к OpenAI (чат)",
        details: errText || openaiRes.statusText,
      });
    }

    const data = await openaiRes.json();
    const reply = data?.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      reply,
      message: { role: "assistant", content: reply },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: "Internal server error в чате",
      details: typeof error?.message === "string" ? error.message : "Unknown error",
    });
  }
}
