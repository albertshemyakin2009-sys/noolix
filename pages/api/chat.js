// pages/api/chat.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, context } = req.body || {};
    const {
      subject = "Математика",
      level = "10–11 класс",
      mode = "exam_prep",
    } = context || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const systemPrompt = [
      "Ты — дружелюбный и терпеливый тьютор по школьным и базовым вузовским предметам.",
      `Текущий предмет: ${subject}. Уровень: ${level}. Режим: ${mode}.`,
      "Объясняй по шагам, простым языком, как для старшеклассника.",
      "Если у ученика задача, сначала помоги ему самому дойти до решения, задавая наводящие вопросы.",
      "Не придумывай факты. Если чего-то не знаешь, честно скажи об этом и предложи общую стратегию.",
    ].join(" ");

    const openAiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || ""),
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: openAiMessages,
      temperature: 0.5,
    });

    const answer =
      completion.choices?.[0]?.message?.content ||
      "Извини, у меня не получилось сформировать ответ. Попробуй переформулировать вопрос.";

    return res.status(200).json({ reply: answer });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details:
        typeof error?.message === "string" ? error.message : "Unknown error",
    });
  }
}
