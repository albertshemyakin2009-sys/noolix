// pages/api/generate-test.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Метод не разрешён. Используй POST." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "Отсутствует OPENAI_API_KEY на сервере. Добавь его в переменные окружения Vercel.",
    });
  }

  try {
    const {
      subject,
      topics,
      questionCount = 5,
      difficulty = "medium",
      // Anti-repeats: recent question stems to avoid
      avoid = [],
      // optional: client may mark diagnostic runs
      diagnostic = false,
    } = req.body || {};

    // Поддержка topics как массива строк (и массива объектов):
    // - строка => { id: topic_<n>, title: <строка> }
    // - объект => { id, title }
    const normalizedTopics = Array.isArray(topics)
      ? topics
          .map((t, i) => {
            if (typeof t === "string") {
              const title = t.trim();
              return { id: `topic_${i + 1}`, title: title || "" };
            }
            if (t && typeof t === "object") {
              const id = (t.id || `topic_${i + 1}`).toString();
              const title = (t.title || "").toString().trim();
              return { id, title };
            }
            return { id: `topic_${i + 1}`, title: "" };
          })
          .filter((x) => x && typeof x.title === "string")
      : [];

    if (!subject) {
      return res.status(400).json({
        error: "Нужно передать subject для генерации теста.",
      });
    }

    // If topics are empty/messy, fall back to a safe general topic.
    // IMPORTANT: never lock in diagnostic UI labels as a real topic.
    const looksDiagnostic = (s) => /^\s*Диагностика\b/i.test(String(s || "").trim());
    const looksTooGeneric = (s) => /^\s*Базовые\s+темы\b/i.test(String(s || "").trim());

    let isDiagnosticMode = !!diagnostic;
    let fallbackTopicTitle = "";

    if (normalizedTopics.length === 0) {
      isDiagnosticMode = true;
      fallbackTopicTitle = `Базовые темы по ${subject}`;
      normalizedTopics.push({ id: "custom", title: fallbackTopicTitle });
    } else {
      const firstTitle = normalizedTopics[0]?.title || "";
      if (looksDiagnostic(firstTitle)) {
        isDiagnosticMode = true;
        fallbackTopicTitle = `Базовые темы по ${subject}`;
        normalizedTopics[0] = { ...normalizedTopics[0], title: fallbackTopicTitle };
      } else {
        fallbackTopicTitle = firstTitle || `Базовые темы по ${subject}`;
      }
    }


    const safeQuestionCount =
      typeof questionCount === "number" &&
      questionCount > 0 &&
      questionCount <= 20
        ? questionCount
        : 5;

    const difficultyLabelMap = {
      easy: "лёгкий уровень — базовые школьные задания, 1 шаг решения, без подвохов",
      medium:
        "средний уровень — задания из экзаменов/контрольных, 2–3 шага решения, иногда лишние данные",
      hard: "сложный уровень — повышенная/олимпиадная сложность, нестандартные формулировки, требуется глубокое понимание темы",
    };

    const difficultyToken =
      difficulty === "easy" || difficulty === "hard" || difficulty === "medium"
        ? difficulty
        : "medium";

    const difficultyLabel = difficultyLabelMap[difficultyToken];

    const topicsListForPrompt = normalizedTopics
      .map((t, i) => {
        const id = t.id || `topic_${i + 1}`;
        const title = (t.title || "").trim() || `Тема ${i + 1}`;
        return `- topicId: "${id}", title: "${title}"`;
      })
      .join("\n");

    const avoidListForPrompt = Array.isArray(avoid)
      ? avoid
          .map((s) => String(s || "").trim())
          .filter(Boolean)
          .slice(0, 24)
      : [];

    const avoidSection = avoidListForPrompt.length
      ? `\n\nНЕ ПОВТОРЯЙ вопросы, похожие на эти формулировки (уже были):\n${avoidListForPrompt
          .map((s) => `- ${s}`)
          .join('\n')}\n\nСделай вопросы и типы заданий другими (например: вместо прямого вычисления — задача на применение, сравнение, выбор свойства, контрпример, короткая текстовая задача, интерпретация, подбор примера и т.д.).

ЖЁСТКОЕ ПРАВИЛО: если вопрос по смыслу похож на любой из списка (совпадение ключевых слов/структуры/чисел), он ЗАПРЕЩЁН — придумай другой.`
      : "";

    const systemPrompt =
      "Ты — опытный преподаватель и составитель школьных тестов (ЕГЭ, ОГЭ, олимпиадных заданий) по разным предметам. " +
      "Твоя задача — генерировать проверяемые тестовые вопросы с одним правильным ответом и понятной структурой JSON.";

    const userPrompt = `
Составь тест по предмету: ${subject}.

Если темы слишком общие (например "Базовые темы...") или тест запущен как диагностика, ты ДОЛЖЕН:
- выбрать ОДНУ конкретную учебную тему сам (например: "Дроби", "Квадратные уравнения", "Причастный оборот"),
- использовать её как ЕДИНУЮ тему теста,
- вернуть её в поле "testTitle" (см. формат ниже),
- и проставить topicTitle в каждом вопросе.

Темы для теста (используй их содержательно, НЕ игнорируй):
${topicsListForPrompt}

Количество вопросов: ${safeQuestionCount}

Уровень сложности: ${difficultyToken}.
Описание уровня: ${difficultyLabel}.

Требования к вопросам:
- Все вопросы должны соответствовать указанному уровню сложности.
- Вариантов ответа всегда РОВНО 4.
- Правильный ответ всегда ТОЛЬКО один.
- Варианты ответа должны быть правдоподобными (никаких очевидно шуточных или бессмысленных вариантов).
- Нельзя повторять один и тот же вопрос.
- Формулировки должны быть естественными для школьных заданий.
${avoidSection}

- Дополнительно: НЕ повторяй и НЕ перефразируй вопросы, похожие на список ниже (это уже спрашивали раньше).

Обязательный формат ответа (СТРОГО JSON, без текста до или после):

{
  "testTitle": "короткое название темы теста",
  "questions": [
    {
      "question": "текст вопроса",
      "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
      "correctIndex": 0,
      "topicId": "идентификатор_темы_из_списка_выше_или_custom",
      "topicTitle": "название темы",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

Правила по полям:
- "correctIndex" — целое число от 0 до 3.
- "topicId" — используй topicId из списка выше, если он есть; если тема одна и она свободная — используй "custom".
- "difficulty" для каждого вопроса должен быть согласован с общим уровнем сложности теста:
  - если выбран лёгкий уровень — ставь "easy";
  - если средний — "medium";
  - если сложный — "hard".
- НЕ добавляй никаких комментариев, пояснений, markdown, текста до или после JSON.
Только один корректный JSON-объект.
`;

    

    const normalizeText = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9а-яё\s]+/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    const tokenize = (s) => {
      const t = normalizeText(s);
      if (!t) return [];
      const stop = new Set([
        "и","в","во","на","по","к","ко","с","со","а","но","или","что","это","как","для","от","из","у","о","об","про","при","над","под","до","после","без","же","ли","не","ни",
      ]);
      return t.split(" ").filter((w) => w && w.length > 2 && !stop.has(w));
    };

    const jaccard = (a, b) => {
      const A = new Set(tokenize(a));
      const B = new Set(tokenize(b));
      if (A.size === 0 || B.size === 0) return 0;
      let inter = 0;
      for (const x of A) if (B.has(x)) inter += 1;
      const union = A.size + B.size - inter;
      return union ? inter / union : 0;
    };

    const isTooSimilar = (qText, avoidArr) => {
      for (const a of avoidArr) {
        if (jaccard(qText, a) >= 0.55) return true;
      }
      return false;
    };

    const hasInternalDuplicates = (qs) => {
      const arr = Array.isArray(qs) ? qs : [];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const qi = arr[i]?.question;
          const qj = arr[j]?.question;
          if (!qi || !qj) continue;
          if (jaccard(qi, qj) >= 0.72) return true;
        }
      }
      return false;
    };

    const callOpenAI = async ({ prompt, temperature }) => {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature,
          max_tokens: 1200,
        }),
      });

      if (!resp.ok) {
        const errorBody = await resp.text();
        console.error("OpenAI API error:", resp.status, errorBody);
        throw new Error(errorBody || `OpenAI error ${resp.status}`);
      }

      const completion = await resp.json();
      const raw = completion.choices?.[0]?.message?.content && String(completion.choices[0].message.content).trim();
      if (!raw) throw new Error("Модель не вернула контент");
      return raw;
    };
let raw = "";

    // HARD anti-repeat mode: retry once or twice if overlap is high.
    const avoidHard = avoidListForPrompt;
    const maxAttempts = 3;
    const baseTemp = difficultyToken === "hard" ? 0.6 : 0.45;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const temp = baseTemp + (attempt - 1) * 0.12;
      const attemptPrompt = attempt === 1
        ? userPrompt
        : userPrompt + `

ПРЕДЫДУЩАЯ ПОПЫТКА ПОВТОРЯЛАСЬ. Попытка #${attempt}: СДЕЛАЙ СИЛЬНО ИНАЧЕ. Не используй те же числа/шаблоны/типы задач. Сконцентрируйся на других подтипах темы.`;

      try {
        raw = await callOpenAI({ prompt: attemptPrompt, temperature: temp });
      } catch (e) {
        // if OpenAI fails, rethrow on last attempt
        if (attempt === maxAttempts) throw e;
        continue;
      }

      // try parse and early validate repeats
      let parsedTry = null;
      try { parsedTry = JSON.parse(raw); } catch (_) { parsedTry = null; }
      const qsTry = Array.isArray(parsedTry?.questions) ? parsedTry.questions : [];

      const anySimilar = qsTry.some((q) => isTooSimilar(q?.question, avoidHard));
      const dup = hasInternalDuplicates(qsTry);

      if (!anySimilar && !dup && qsTry.length > 0) {
        break;
      }

      if (attempt === maxAttempts) {
        // keep raw as is, will fall through to normal parsing/cleanup
        break;
      }
    }

    // parsed will be obtained below from `raw`

    if (!raw) {
      return res.status(500).json({
        error: "Модель не вернула контент при генерации теста.",
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse error in /api/generate-test:", e, raw);
      return res.status(500).json({
        error:
          "Не удалось разобрать ответ модели как JSON. Попробуй ещё раз.",
      });
    }

    const safeString = (x) => (typeof x === "string" ? x.trim() : "");
    const rawTestTitle = safeString(parsed.testTitle);
    let questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    // pick a good topic title:
    // 1) explicit testTitle
    // 2) most frequent non-generic question.topicTitle
    // 3) fallbackTopicTitle
    const isBadTopic = (t) => {
      const v = safeString(t);
      if (!v) return true;
      if (looksDiagnostic(v)) return true;
      if (looksTooGeneric(v)) return true;
      if (/^\s*тема\b/i.test(v)) return true;
      if (/^\s*без\s+названия\b/i.test(v)) return true;
      return false;
    };

    let resolvedTopicTitle = rawTestTitle;
    if (isBadTopic(resolvedTopicTitle)) {
      const freq = {};
      for (const q of questions) {
        const tt = safeString(q?.topicTitle);
        if (isBadTopic(tt)) continue;
        freq[tt] = (freq[tt] || 0) + 1;
      }
      const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      resolvedTopicTitle = best || fallbackTopicTitle;
    }

    if (isBadTopic(resolvedTopicTitle)) {
      resolvedTopicTitle = `Базовые темы по ${subject}`;
    }

    questions = questions
      .filter(
        (q) =>
          q &&
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correctIndex === "number" &&
          q.correctIndex >= 0 &&
          q.correctIndex < 4
      )
      .slice(0, safeQuestionCount)
      .map((q, index) => {
        const topicTitle = !isBadTopic(q?.topicTitle)
          ? safeString(q.topicTitle)
          : resolvedTopicTitle;

        const topicId =
          typeof q.topicId === "string" && q.topicId.trim()
            ? q.topicId.trim()
            : normalizedTopics[0]?.id || "custom";

        let normalizedDifficulty = q.difficulty;
        if (!["easy", "medium", "hard"].includes(normalizedDifficulty)) {
          normalizedDifficulty = difficultyToken;
        }

        return {
          question: String(q.question).trim(),
          options: q.options.map((opt) => String(opt).trim()),
          correctIndex: q.correctIndex,
          topicId,
          topicTitle,
          difficulty: normalizedDifficulty,
          index,
        };
      });

    if (questions.length === 0) {
      return res.status(500).json({
        error:
          "Удалось разобрать ответ модели, но список вопросов пуст. Попробуй ещё раз.",
      });
    }

    return res.status(200).json({
      topicTitle: resolvedTopicTitle,
      diagnostic: isDiagnosticMode,
      questions,
    });
  } catch (error) {
    console.error("Error in /api/generate-test:", error);
    return res.status(500).json({
      error: "Внутренняя ошибка при генерации теста.",
      details: error.message || String(error),
    });
  }
}
