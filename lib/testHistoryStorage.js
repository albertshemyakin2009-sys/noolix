const TEST_HISTORY_KEY = "noolixTestsHistory";
const TEST_HISTORY_BY_SUBJECT_KEY = "noolixTestsHistoryBySubject";

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function normalizeSubject(subject) {
  return (subject || "Без предмета").toString().trim() || "Без предмета";
}

function normalizeTopic(topic) {
  const value = String(topic || "").trim();
  return value || "Общее";
}

function readHistoryMap() {
  if (typeof window === "undefined") return {};

  const rawBy = window.localStorage.getItem(TEST_HISTORY_BY_SUBJECT_KEY);
  let by = safeParse(rawBy, null);

  if (by && typeof by === "object" && !Array.isArray(by)) {
    return by;
  }

  const rawLegacy = window.localStorage.getItem(TEST_HISTORY_KEY);
  const legacyArr = safeParse(rawLegacy, []);
  const legacy = Array.isArray(legacyArr) ? legacyArr : [];
  const migrated = {};

  for (const item of legacy) {
    const subject = normalizeSubject(item?.subject);
    if (!migrated[subject]) migrated[subject] = [];
    migrated[subject].push(item);
  }

  try {
    window.localStorage.setItem(TEST_HISTORY_BY_SUBJECT_KEY, JSON.stringify(migrated));
  } catch (_) {}

  return migrated;
}

function writeHistoryMap(by) {
  if (typeof window === "undefined") return { ok: false, error: "no-window" };
  try {
    window.localStorage.setItem(TEST_HISTORY_BY_SUBJECT_KEY, JSON.stringify(by || {}));
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e?.message || "history-write-failed" };
  }
}

export function saveTestHistoryEntry({
  subject,
  level,
  topic,
  score,
  correctCount,
  totalCount,
  mistakesSummary,
}) {
  if (typeof window === "undefined") return { ok: false, count: 0, error: "no-window" };

  try {
    const by = readHistoryMap();
    const subjKey = normalizeSubject(subject);
    const list = Array.isArray(by[subjKey]) ? by[subjKey] : [];

    list.unshift({
      id: Date.now(),
      subject: subjKey,
      level,
      topic: normalizeTopic(topic),
      score,
      correctCount,
      totalCount,
      createdAt: new Date().toISOString(),
      mistakesSummary: mistakesSummary || null,
    });

    const trimmed = list.slice(0, 50);
    by[subjKey] = trimmed;
    const res = writeHistoryMap(by);

    return {
      ok: res.ok,
      count: trimmed.length,
      error: res.error,
    };
  } catch (e) {
    return { ok: false, count: 0, error: e?.message || "history-write-failed" };
  }
}

export function loadTestHistory({ subject, historyScope = "current" } = {}) {
  if (typeof window === "undefined") return [];

  try {
    const by = readHistoryMap();
    const subjKey = normalizeSubject(subject);

    if (historyScope === "current") {
      return Array.isArray(by[subjKey]) ? by[subjKey] : [];
    }

    const all = [];
    for (const key of Object.keys(by || {})) {
      const arr = Array.isArray(by[key]) ? by[key] : [];
      for (const item of arr) all.push(item);
    }

    all.sort((a, b) => {
      const ta = Date.parse(a?.createdAt || "") || 0;
      const tb = Date.parse(b?.createdAt || "") || 0;
      return tb - ta;
    });

    return all.slice(0, 200);
  } catch (_) {
    return [];
  }
}

export function clearTestHistory({ subject, historyScope = "current" } = {}) {
  if (typeof window === "undefined") return { ok: false, error: "no-window" };

  try {
    let by = readHistoryMap();

    if (historyScope === "current") {
      by[normalizeSubject(subject)] = [];
    } else {
      by = {};
    }

    return writeHistoryMap(by);
  } catch (e) {
    return { ok: false, error: e?.message || "history-clear-failed" };
  }
}
