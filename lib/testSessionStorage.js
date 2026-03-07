import { normalizeKey, normalizeLevel, makeScopeKey } from "./testScope";

const TEST_SESSIONS_KEY = "noolix_tests_sessions_v1";
const LEGACY_TEST_SESSION_KEYS = [
  "noolix_tests_session_v5",
  "noolix_tests_session_v4",
  "noolix_tests_session_v3",
  "noolix_tests_session_v2",
  "noolix_tests_session_v1",
];

const emptyStore = () => ({ v: 1, sessions: {} });

const canUseWindow = () => typeof window !== "undefined" && window?.localStorage;

export const loadAllTestSessions = () => {
  if (!canUseWindow()) return emptyStore();
  try {
    const raw = window.localStorage.getItem(TEST_SESSIONS_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    if (obj && typeof obj === "object" && obj.sessions && typeof obj.sessions === "object") {
      return obj;
    }
    return emptyStore();
  } catch (_) {
    return emptyStore();
  }
};

export const saveAllTestSessions = (obj) => {
  if (!canUseWindow()) return;
  try {
    window.localStorage.setItem(TEST_SESSIONS_KEY, JSON.stringify(obj || emptyStore()));
  } catch (_) {}
};

export const migrateLegacySessionOnce = () => {
  if (!canUseWindow()) return;
  try {
    const existing = loadAllTestSessions();
    if (existing?.sessions && Object.keys(existing.sessions).length > 0) return;

    let legacyRaw = null;
    for (const key of LEGACY_TEST_SESSION_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        legacyRaw = raw;
        break;
      }
    }
    if (!legacyRaw) return;

    const legacy = JSON.parse(legacyRaw);
    if (!legacy || typeof legacy !== "object") return;

    const subject = legacy.normSubject || legacy.subject || "";
    const level = legacy.normLevel || legacy.level || "";
    const s = normalizeKey(subject);
    const l = normalizeKey(normalizeLevel(level));
    if (!s || !l) return;

    const sessions = {};
    sessions[makeScopeKey(s, l)] = {
      ...legacy,
      subject: s,
      level: l,
      normSubject: s,
      normLevel: l,
      ts: typeof legacy.ts === "number" ? legacy.ts : Date.now(),
    };
    saveAllTestSessions({ v: 1, sessions });
  } catch (_) {}
};

export const loadTestSession = (subject, level) => {
  try {
    migrateLegacySessionOnce();
    const all = loadAllTestSessions();
    const sessions = all?.sessions || {};

    const s = normalizeKey(subject);
    const l = normalizeKey(normalizeLevel(level));
    if (s && l) {
      const session = sessions[makeScopeKey(s, l)];
      return session && typeof session === "object" ? session : null;
    }

    let best = null;
    let bestTs = -1;
    for (const key of Object.keys(sessions)) {
      const session = sessions[key];
      if (!session || typeof session !== "object") continue;
      const questions = Array.isArray(session.questions) ? session.questions : [];
      const result = session.result ?? null;
      if (!questions.length || result !== null) continue;
      const ts = typeof session.ts === "number" ? session.ts : 0;
      if (ts > bestTs) {
        bestTs = ts;
        best = session;
      }
    }
    return best;
  } catch (_) {
    return null;
  }
};

export const saveTestSession = (session) => {
  try {
    migrateLegacySessionOnce();
    const subject = session?.normSubject || session?.subject || "";
    const level = session?.normLevel || session?.level || "";
    const s = normalizeKey(subject);
    const l = normalizeKey(normalizeLevel(level));
    if (!s || !l) return;

    const all = loadAllTestSessions();
    const sessions = all?.sessions && typeof all.sessions === "object" ? all.sessions : {};
    sessions[makeScopeKey(s, l)] = {
      ...(session || {}),
      subject: s,
      level: l,
      normSubject: s,
      normLevel: l,
      ts: typeof session?.ts === "number" ? session.ts : Date.now(),
    };
    saveAllTestSessions({ v: 1, sessions });
  } catch (_) {}
};

export const clearTestSession = (subject, level) => {
  if (!canUseWindow()) return;
  try {
    migrateLegacySessionOnce();
    const s = normalizeKey(subject);
    const l = normalizeKey(normalizeLevel(level));
    if (!s || !l) {
      window.localStorage.removeItem(TEST_SESSIONS_KEY);
      return;
    }

    const all = loadAllTestSessions();
    const sessions = all?.sessions && typeof all.sessions === "object" ? all.sessions : {};
    const key = makeScopeKey(s, l);
    if (sessions[key]) delete sessions[key];
    saveAllTestSessions({ v: 1, sessions });
  } catch (_) {}
};
