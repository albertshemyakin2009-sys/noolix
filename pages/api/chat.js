// pages/api/chat.js

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4.1-mini";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: "OPENAI_API_KEY не задан в переменных окружения" },
    });
  }

  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return res.status(400).json({
        error: { message: "Нужен массив messages с историей диалога" },
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

    const payload = {
      model: MODEL,
      temperature: 0.5,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    // Retry policy: 1 retry for transient errors/timeouts
    const maxAttempts = 2;
    const timeoutMs = 28000;

    let lastStatus = 0;
    let lastText = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const openaiRes = await fetchWithTimeout(
          OPENAI_URL,
          {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          },
          timeoutMs
        );

        lastStatus = openaiRes.status;

        if (!openaiRes.ok) {
          try {
            lastText = await openaiRes.text();
          } catch (_) {
            lastText = openaiRes.statusText || "";
          }

          const transient = [408, 429, 500, 502, 503, 504].includes(openaiRes.status);
          if (transient && attempt < maxAttempts) {
            await sleep(800 + attempt * 500);
            continue;
          }

          console.error("OpenAI chat error:", openaiRes.status, lastText);

          const mappedStatus = openaiRes.status === 429 ? 429 : 502;

          return res.status(mappedStatus).json({
            error: {
              message:
                openaiRes.status === 429
                  ? "Сервис ИИ перегружен (429). Попробуй ещё раз через минуту."
                  : "Ошибка при обращении к OpenAI (чат).",
              status: openaiRes.status,
              details: lastText || openaiRes.statusText,
            },
          });
        }

        const data = await openaiRes.json();
        const reply = data?.choices?.[0]?.message?.content || "";

        return res.status(200).json({
          reply,
          message: { role: "assistant", content: reply },
        });
      } catch (err) {
        const isAbort = err && (err.name === "AbortError" || String(err).includes("AbortError"));
        const transient = isAbort || true;

        if (attempt < maxAttempts && transient) {
          await sleep(900 + attempt * 600);
          continue;
        }

        console.error("Chat API error:", err);
        return res.status(isAbort ? 504 : 500).json({
          error: {
            message: isAbort
              ? "Таймаут при обращении к ИИ. Попробуй ещё раз."
              : "Internal server error в чате",
            details: typeof err?.message === "string" ? err.message : "Unknown error",
            status: lastStatus || undefined,
            openai: lastText || undefined,
          },
        });
      }
    }

    // Fallback (shouldn't happen)
    return res.status(500).json({
      error: { message: "Unexpected error in chat handler" },
    });
  } catch (error) {
    console.error("Chat API fatal:", error);
    return res.status(500).json({
      error: {
        message: "Internal server error в чате",
        details: typeof error?.message === "string" ? error.message : "Unknown error",
      },
    });
  }
}
