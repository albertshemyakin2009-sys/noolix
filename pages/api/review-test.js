// pages/api/review-test.js

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
    const { subject, topic, questions, userAnswers, reviewStyleKey, reviewStyleLabel, reviewStyleInstruction } = req.body || {};

    if (!Array.isArray(questions) || !Array.isArray(userAnswers)) {
      return res.status(400).json({
        error: "Нужны массивы questions и userAnswers",
      });
    }

    if (questions.length !== userAnswers.length) {
      return res.status(400).json({
        error: "Длины questions и userAnswers должны совпадать",
      });
    }

    const mistakes = [];
    questions.forEach((q, index) => {
      const ua = userAnswers[index];
      if (
        ua === null ||
        ua === undefined ||
        typeof ua !== "number" ||
        !Array.isArray(q.options)
      ) {
        return;
      }
      if (ua !== q.correctIndex) {
        mistakes.push({
          index: index + 1,
          question: q.question,
          options: q.options,
          userIndex: ua,
          correctIndex: q.correctIndex,
          topicTitle: q.topicTitle || "",
        });
      }
    });

    if (mistakes.length === 0) {
      return res.status(200).json({
        analysis:
          "Во всех вопросах ты ответил(а) верно. Ошибок для разбора нет — это отлично!",
      });
    }

    const subjectText = subject || "предмет не указан";
    const topicText = Array.isArray(topic) ? topic.join(", ") : topic || "";

    const mistakesText = mistakes
      .map((m) => {
        const userAnswer =
          m.options[m.userIndex] !== undefined
            ? m.options[m.userIndex]
            : "—";
        const correctAnswer =
          m.options[m.correctIndex] !== undefined
            ? m.options[m.correctIndex]
            : "—";
        return [
          `Вопрос ${m.index}: ${m.question}`,
          `Варианты:`,
          m.options
            .map((opt, i) => `  ${i + 1}) ${opt}`)
            .join("\n"),
          `Твой ответ: ${m.userIndex + 1}) ${userAnswer}`,
          `Правильный ответ: ${m.correctIndex + 1}) ${correctAnswer}`,
          m.topicTitle ? `Тема: ${m.topicTitle}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n---\n\n");

    const systemPrompt = `
Ты — тьютор NOOLIX. Твоя задача — делать разбор ошибок после теста.

Формат ответа:
- Пиши по-блочно, по каждому вопросу.
- Для КАЖДОЙ ошибки дай:
  1) краткий разбор: в чём именно ошибка;
  2) напоминание правила/идеи;
  3) 1–2 своих примера;
  4) маленькое мини-упражнение (1–2 задания без ответа).

Пиши по-русски, структурировано, с подзаголовками "Вопрос X", списками и понятным языком.
Избегай лишней воды, но НЕ будь слишком кратким.


Доп. стиль разбора (если задан):
- Стиль: ${reviewStyleLabel || ""}
- Указание: ${reviewStyleInstruction || ""}
Если стиль/указание пустые — используй базовый формат.
`.trim();

    const userPrompt = `
Предмет: ${subjectText}
Тема(ы): ${topicText || "не указаны явно"}
Стиль разбора: ${reviewStyleLabel || "Стандарт"}

Ниже перечислены вопросы, в которых ученик ошибся (с вариантами, его ответом и правильным ответом):

${mistakesText}

Сделай подробный, но понятный разбор по каждому из этих вопросов, строго следуя формату из system prompt.
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
          temperature: 0.5,
        }),
      }
    );

    if (!response.ok) {
      let errText = "";
      try {
        errText = await response.text();
      } catch (_) {}
      console.error("OpenAI review-test error:", response.status, errText);
      return res.status(500).json({
        error: "Ошибка при обращении к OpenAI (review-test)",
        details: errText || response.statusText,
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    return res.status(200).json({ analysis: content, styleUsed: { key: reviewStyleKey || "", label: reviewStyleLabel || "" } });
  } catch (error) {
    console.error("review-test API error:", error);
    return res.status(500).json({
      error: "Internal server error в разборе теста",
      details:
        typeof error?.message === "string" ? error.message : "Unknown error",
    });
  }
}
