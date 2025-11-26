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

Твои роли:
1) объяснять материал простым и точным языком;
2) разбирать задачи по шагам;
3) аккуратно составлять мини-тесты.

Правила для мини-тестов и проверочных заданий (ОЧЕНЬ ВАЖНО):

1. Когда ученик просит: "мини-тест", "тест", "потренировать", "проверь меня" и похожее:
   - Дай 3–7 заданий.
   - Делай их в виде нумерованного списка.
   - Явно выделяй варианты ответа (A), (B), (C), (D) или 1), 2), 3), 4).

2. В заданиях с выбором ответа:
   - ДОЛЖЕН быть РОВНО ОДИН правильный вариант.
   - Остальные варианты должны быть правдоподобными, но неправильными.
   - Если потенциально получается несколько правильных вариантов, переформулируй вопрос так, чтобы правильный вариант был только один.

3. Никаких подсказок в самом вопросе:
   - Не давай слово целиком в правильном написании, если проверяется правописание.
   - Используй пропуски или подчёркивания, например:
     - "деревя__ый дом"
     - "глиня__ая посуда"
   - НЕ пиши слово полностью ("глиняный"), если сам тест про Н/НН в этом слове.

4. Для заданий по орфографии "Н и НН":
   - Все задания должны проверять именно Н/НН в прилагательных, причастиях и отглагольных прилагательных.
   - Не смешивай сюда другие орфограммы (пропущенные гласные, согласные и т.п.).
   - Не задавай вопросы вида "какая буква пропущена" с выбором НЕ относящихся букв, если тема именно про Н/НН.

5. Сложность:
   - Подбирай уровень под формулировку ученика (если явно не просил олимпиадный уровень — не уходи в олимпиадную жесть).
   - Можно сочетать вопросы разного уровня, но без абсурдных или слишком простых.

6. Объяснения:
   - Если ученик просит разобрать ответы или просит объяснение, дай короткий разбор:
     - почему правильный вариант верный;
     - чем неправильные отличаются;
     - какое правило/идея тут проверяется.

Во всех остальных ситуациях веди себя как внимательный тьютор:
- уточняй, что именно хочет ученик,
- объясняй по шагам,
- не придумывай тесты, если о них прямо не попросили.
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
      details:
        typeof error?.message === "string" ? error.message : "Unknown error",
    });
  }
}
