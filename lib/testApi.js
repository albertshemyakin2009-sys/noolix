const JSON_HEADERS = { "Content-Type": "application/json" };

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch (_) {
    return {};
  }
}

async function postJson(url, body, signal) {
  const response = await fetch(url, {
    method: "POST",
    headers: JSON_HEADERS,
    signal,
    body: JSON.stringify(body || {}),
  });

  const data = await readJsonSafe(response);
  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || "Не удалось выполнить запрос."
    );
  }
  return data;
}

export async function explainQuestionRequest(payload, signal) {
  return postJson("/api/explain-question", payload, signal);
}

export async function generateTestRequest(payload, signal) {
  return postJson("/api/generate-test", payload, signal);
}

export async function reviewTestRequest(payload, signal) {
  return postJson("/api/review-test", payload, signal);
}
