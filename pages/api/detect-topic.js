// pages/api/detect-topic.js

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4.1-mini";
const BASE_TOPIC = "Базовые темы";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

const normalizeTopicKey = (t) => {
  let s = String(t || "").trim();
  if (!s) return BASE_TOPIC;

  s = s
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[«»"']/g, "")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  s = s.replace(/^Диагностика\b[^\n]*?по\s+/i, "").trim();
  s = s.replace(/^Проверка\s+понимания\s*[:\-]\s*/i, "").trim();
  s = s.replace(/^Тема\s*[:\-—]?\s*/i, "").trim();
  s = s.replace(/[?!\.]+$/g, "").trim();

  const lower = s.toLowerCase();
  const bad = new Set([
    "__no_topic__",
    "no_topic",
    "без темы",
    "без названия",
    "тест",
    "диагностика",
    "изучено",
    "изученный",
    "изучена",
    "уверенно",
    "в процессе",
    "не начато",
    "средне",
    "слабые",
    "сильные",
    "средние",
    "прогресс",
    "результаты",
    "математика",
    "физика",
    "русский язык",
    "английский язык",
  ]);
  if (!lower || bad.has(lower)) return BASE_TOPIC;

  const gradeOnly = lower.replace(/\s+/g, "").replace(/[—–]/g, "-");
  if (/^\d{1,2}-\d{1,2}класс$/.test(gradeOnly)) return BASE_TOPIC;
  if (/^\d{1,2}-\d{1,2}$/.test(gradeOnly)) return BASE_TOPIC;
  if (/^\d{1,2}класс$/.test(gradeOnly)) return BASE_TOPIC;

  const words = s.split(/\s+/).filter(Boolean);
  if (s.length > 80 || words.length > 12 || /[.!?]/.test(s)) return BASE_TOPIC;

  return s || BASE_TOPIC;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ topic: BASE_TOPIC, error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // topic-detect is non-critical: always return BASE_TOPIC
    return res.status(200).json({ topic: BASE_TOPIC, error: "OPENAI_API_KEY missing" });
  }

  try {
    const { messages, context } = req.body || {};
    const arr = Array.isArray(messages) ? messages : [];
    const subject = String(context?.subject || "").trim();
    const level = String(context?.level || "").trim();

    // Take last user message as main signal
    const lastUser = [...arr].reverse().find((m) => m?.role === "user" && String(m?.content || "").trim());
    const text = String(lastUser?.content || "").trim().slice(0, 2500);

    if (!text) {
      return res.status(200).json({ topic: BASE_TOPIC });
    }

    const system = `Ты помогаешь определить КОРОТКУЮ тему запроса ученика.
Верни ТОЛЬКО название темы (2–5 слов), без кавычек, без точки, без двоеточий.
Запрещено возвращать:
- уровни/классы (например, "7-9 класс", "10-11 класс")
- статусы ("изучено", "уверенно", "слабые", "сильные")
- служебные слова ("тест", "диагностика", "прогресс")
- название предмета само по себе ("Математика")
Если не уверен — верни "Базовые темы".`;

    const prompt = `Предмет: ${subject || "(не указан)"}
Уровень: ${level || "(не указан)"}

Текст ученика:
${text}

Тема:`;

    const payload = {
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const maxAttempts = 2;
    const timeoutMs = 18000;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const openaiRes = await fetchWithTimeout(
          OPENAI_URL,
          { method: "POST", headers, body: JSON.stringify(payload) },
          timeoutMs
        );

        if (!openaiRes.ok) {
          const transient = [408, 429, 500, 502, 503, 504].includes(openaiRes.status);
          if (transient && attempt < maxAttempts) {
            await sleep(650 + attempt * 450);
            continue;
          }
          return res.status(200).json({ topic: BASE_TOPIC, error: `OpenAI status ${openaiRes.status}` });
        }

        const data = await openaiRes.json();
        const raw = String(data?.choices?.[0]?.message?.content || "").trim();
        const topic = normalizeTopicKey(raw);
        return res.status(200).json({ topic });
      } catch (err) {
        if (attempt < maxAttempts) {
          await sleep(700 + attempt * 500);
          continue;
        }
        return res.status(200).json({ topic: BASE_TOPIC, error: "detect-topic failed" });
      }
    }

    return res.status(200).json({ topic: BASE_TOPIC });
  } catch (_) {
    return res.status(200).json({ topic: BASE_TOPIC });
  }
}
