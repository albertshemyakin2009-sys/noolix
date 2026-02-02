// lib/topicMigration.js
// Centralized topic sanitization + migration for NOOLIX (client-side safe).
// Goal: prevent service strings from becoming "topics" and clean legacy data consistently.

export const TOPIC_BASELINE_TITLE = "Базовые темы";
export const TOPIC_BASELINE_KEY = TOPIC_BASELINE_TITLE;

export const NO_TOPIC_KEYS = new Set([
  "__no_topic__",
  "без темы",
  "без названия",
  "no topic",
  "no_topic",
  "notopic",
  "general",
  "общее",
  "прочее",
  "разное",
  "тест",
]);

const STATUS_WORDS = new Set([
  "изучено",
  "изучаю",
  "в процессе",
  "не начато",
  "повторить",
  "пройдено",
  "усвоено",
  "готово",
  "сдано",
]);

function normSpaces(s) {
  return String(s || "")
    .replace(/\u00A0/g, " ")              // NBSP
    .replace(/[\u2000-\u200B]/g, " ")     // misc spaces
    .replace(/\s+/g, " ")
    .trim();
}

function normDashes(s) {
  // normalize dash variants to en-dash for stable display, but comparisons use '-'
  return String(s || "").replace(/[\u2012\u2013\u2014\u2015]/g, "–");
}

export function normalizeForCompare(s) {
  return normSpaces(s).replace(/[\u2012\u2013\u2014\u2015]/g, "-");
}

export function isGradeOnly(raw) {
  const t = normalizeForCompare(raw).toLowerCase();
  // 7–9 класс / 7-9 класс / 7–9кл
  return /^(\d{1,2}\s*-\s*\d{1,2}|\d{1,2})\s*(класс|кл\.?)$/i.test(t);
}

export function stripDecorations(raw) {
  let t = normSpaces(raw);
  t = t.replace(/[«»"]/g, "").trim();
  t = t.replace(/^тема\s*[:\-—]\s*/i, "").trim();
  t = t.replace(/[?!\.]+$/g, "").trim();
  return t;
}

export function sanitizeTopicTitle(input) {
  let raw = stripDecorations(input);
  if (!raw) return "";

  raw = raw.replace(/^__no_topic__$/i, "").trim();
  raw = raw.replace(/^без\s+(темы|названия)$/i, "").trim();

  // Remove diagnostic/test UI wrappers
  raw = raw.replace(/^диагностика\b[^\n]*?\bпо\s+/i, "").trim();
  raw = raw.replace(/^проверка\s+понимания\s*[:\-—]\s*/i, "").trim();
  raw = raw.replace(/^тест\s*[:\-—]\s*/i, "").trim();

  raw = normSpaces(normDashes(raw));

  // If it's just a grade range — not a topic
  if (isGradeOnly(raw)) return "";

  // Hard length guards (avoid paragraphs / answers becoming a topic)
  const words = raw.split(/\s+/).filter(Boolean);
  if (raw.length > 70) return "";
  if (words.length > 8) return "";
  if (/[\n\r]/.test(raw)) return "";
  if (/[?!\.]/.test(raw)) return "";

  // Status words should not become a topic title
  if (STATUS_WORDS.has(raw.toLowerCase())) return "";

  return raw;
}

export function isBadTopicTitle(raw) {
  const s = sanitizeTopicTitle(raw);
  if (!s) return true;

  const low = normalizeForCompare(s).toLowerCase();
  if (NO_TOPIC_KEYS.has(low)) return true;
  if (/^диагностика\b/i.test(low)) return true;
  if (/^тест\b/i.test(low)) return true;

  // "Диагностика по Математика" etc should have been stripped already
  // but keep extra guard:
  if (/\bдиагностика\b/.test(low) && /\bпо\b/.test(low)) return true;

  return false;
}

export function coerceTopicTitleFromAnything(raw) {
  if (!raw) return "";
  // Split comma-separated "Topic, 7–9 класс" and drop grade parts.
  const parts = String(raw)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const cleaned = [];
  for (const p of parts.length ? parts : [String(raw)]) {
    const t = sanitizeTopicTitle(p);
    if (!t) continue;
    if (isGradeOnly(t)) continue;
    const low = normalizeForCompare(t).toLowerCase();
    if (NO_TOPIC_KEYS.has(low)) continue;
    if (STATUS_WORDS.has(low)) continue;
    cleaned.push(t);
  }

  // Special case: "Диагностика по Математика" without comma
  if (!cleaned.length) {
    const t = sanitizeTopicTitle(String(raw));
    if (t) cleaned.push(t);
  }

  return cleaned[0] || "";
}

export function canonicalTopicKey(rawKey) {
  const title = coerceTopicTitleFromAnything(rawKey);
  if (!title) return TOPIC_BASELINE_KEY;
  return title; // keep human-readable keys
}

function safeParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function mergeProgress(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    if (typeof v === "number" && typeof out[k] === "number") out[k] += v;
    else if (k === "score" && typeof v === "number") {
      const prev = typeof out.score === "number" ? out.score : 1;
      out.score = Math.min(prev, v);
    } else if (k === "updatedAt" || k === "updated") {
      const prev = out[k] ? new Date(out[k]).getTime() : 0;
      const next = v ? new Date(v).getTime() : 0;
      out[k] = next > prev ? v : out[k];
    } else if (out[k] === undefined) out[k] = v;
  }
  return out;
}

function migrateKnowledgeMap(km) {
  if (!km || typeof km !== "object") return { changed: false, km };

  let changed = false;
  const next = Array.isArray(km) ? km : { ...km };

  for (const subject of Object.keys(next)) {
    const subj = next[subject];
    if (!subj || typeof subj !== "object") continue;

    // Detect shape A) subject -> topicLeaf OR B) subject -> level -> topicLeaf
    const subjKeys = Object.keys(subj);
    const looksLikeLevelMap = subjKeys.some((k) => typeof subj[k] === "object" && subj[k] && !("score" in subj[k]));

    if (!looksLikeLevelMap) {
      // A) subject -> topicLeaf
      const newSubj = { ...subj };
      for (const topicKey of Object.keys(subj)) {
        const leaf = subj[topicKey];
        if (!leaf || typeof leaf !== "object") continue;
        const norm = canonicalTopicKey(topicKey);
        if (norm !== topicKey) {
          changed = true;
          delete newSubj[topicKey];
          const target = newSubj[norm] || {};
          newSubj[norm] = mergeProgress(target, leaf);
        }
      }
      next[subject] = newSubj;
      continue;
    }

    // B) subject -> level -> topicLeaf
    const newSubj = { ...subj };
    for (const level of Object.keys(subj)) {
      const lvl = subj[level];
      if (!lvl || typeof lvl !== "object") continue;

      const newLvl = { ...lvl };
      for (const topicKey of Object.keys(lvl)) {
        const leaf = lvl[topicKey];
        if (!leaf || typeof leaf !== "object") continue;

        const isLeaf =
          typeof leaf.score === "number" ||
          typeof leaf.updatedAt === "string" ||
          Object.keys(leaf).some((k) => ["score", "updatedAt", "updated", "source"].includes(k));
        if (!isLeaf) continue;

        const norm = canonicalTopicKey(topicKey);
        if (norm !== topicKey) {
          changed = true;
          delete newLvl[topicKey];
          const target = newLvl[norm] || {};
          newLvl[norm] = mergeProgress(target, leaf);
        }
      }
      newSubj[level] = newLvl;
    }
    next[subject] = newSubj;
  }

  return { changed, km: next };
}

function migrateGoals(goals) {
  if (!Array.isArray(goals)) return { changed: false, goals };

  let changed = false;
  const next = goals.map((g) => {
    const goal = g && typeof g === "object" ? { ...g } : g;
    if (!goal || typeof goal !== "object") return goal;

    const t = coerceTopicTitleFromAnything(goal.topic || goal.topicTitle || "");
    const normKey = t ? t : TOPIC_BASELINE_KEY;
    if ((goal.topic || "") !== normKey) {
      goal.topic = normKey;
      changed = true;
    }
    // also sanitize any derived titles stored elsewhere
    if (goal.topicTitle && goal.topicTitle !== t) {
      goal.topicTitle = t || "";
      changed = true;
    }
    return goal;
  });

  return { changed, goals: next };
}

function migrateLibrary(list) {
  if (!Array.isArray(list)) return { changed: false, list };

  let changed = false;
  const next = list.map((it) => {
    const item = it && typeof it === "object" ? { ...it } : it;
    if (!item || typeof item !== "object") return item;

    const meta = item.meta && typeof item.meta === "object" ? { ...item.meta } : null;

    // Prefer explicit topic fields, never title/preview
    const candidate =
      meta?.explainTopicTitle ||
      item.topic ||
      item.topicTitle ||
      item.explainTopicTitle ||
      "";

    const title = coerceTopicTitleFromAnything(candidate);
    const normKey = title ? title : TOPIC_BASELINE_KEY;

    if (item.topic !== normKey) {
      item.topic = normKey;
      changed = true;
    }
    if (meta) {
      if (meta.explainTopicTitle !== title) {
        meta.explainTopicTitle = title || "";
        changed = true;
      }
      item.meta = meta;
    }
    return item;
  });

  return { changed, list: next };
}

function migrateContext(ctx) {
  if (!ctx || typeof ctx !== "object") return { changed: false, ctx };

  let changed = false;
  const next = { ...ctx };
  const cand = coerceTopicTitleFromAnything(next.currentTopic || next.topic || "");
  const normKey = cand ? cand : "";

  if (next.currentTopic && next.currentTopic !== normKey) {
    next.currentTopic = normKey;
    changed = true;
  }
  if (next.topic && next.topic !== normKey) {
    next.topic = normKey;
    changed = true;
  }
  return { changed, ctx: next };
}

export function migrateAllLocalStorage() {
  if (typeof window === "undefined") return { changed: false };

  let changedAny = false;

  // Knowledge map
  try {
    const raw = window.localStorage.getItem("noolixKnowledgeMap");
    const km = safeParse(raw, null);
    const { changed, km: nextKm } = migrateKnowledgeMap(km);
    if (changed) {
      window.localStorage.setItem("noolixKnowledgeMap", JSON.stringify(nextKm));
      changedAny = true;
    }
  } catch (_) {}

  // Goals
  try {
    const raw = window.localStorage.getItem("noolixGoals");
    const goals = safeParse(raw, null);
    const { changed, goals: nextGoals } = migrateGoals(goals);
    if (changed) {
      window.localStorage.setItem("noolixGoals", JSON.stringify(nextGoals));
      changedAny = true;
    }
  } catch (_) {}

  // Library saved
  try {
    const raw = window.localStorage.getItem("noolixLibrarySaved");
    const list = safeParse(raw, null);
    const { changed, list: nextList } = migrateLibrary(list);
    if (changed) {
      window.localStorage.setItem("noolixLibrarySaved", JSON.stringify(nextList));
      changedAny = true;
    }
  } catch (_) {}

  // Tests history (if present): normalize stored topic field(s)
  try {
    const raw = window.localStorage.getItem("noolixTestsHistory");
    const hist = safeParse(raw, null);
    if (Array.isArray(hist)) {
      let changed = false;
      const next = hist.map((h) => {
        const item = h && typeof h === "object" ? { ...h } : h;
        if (!item || typeof item !== "object") return item;
        const cand = coerceTopicTitleFromAnything(item.topic || item.topicTitle || "");
        const normKey = cand ? cand : TOPIC_BASELINE_KEY;
        if (item.topic !== normKey) {
          item.topic = normKey;
          changed = true;
        }
        if (item.topicTitle && item.topicTitle !== cand) {
          item.topicTitle = cand || "";
          changed = true;
        }
        return item;
      });
      if (changed) {
        window.localStorage.setItem("noolixTestsHistory", JSON.stringify(next));
        changedAny = true;
      }
    }
  } catch (_) {}

  // Context
  try {
    const raw = window.localStorage.getItem("noolixContext");
    const ctx = safeParse(raw, null);
    const { changed, ctx: nextCtx } = migrateContext(ctx);
    if (changed) {
      window.localStorage.setItem("noolixContext", JSON.stringify(nextCtx));
      changedAny = true;
    }
  } catch (_) {}

  // current goal
  try {
    const raw = window.localStorage.getItem("noolixCurrentGoal");
    const g = safeParse(raw, null);
    if (g && typeof g === "object") {
      const cand = coerceTopicTitleFromAnything(g.topic || g.topicTitle || "");
      const normKey = cand ? cand : TOPIC_BASELINE_KEY;
      const next = { ...g, topic: normKey };
      if (JSON.stringify(next) !== JSON.stringify(g)) {
        window.localStorage.setItem("noolixCurrentGoal", JSON.stringify(next));
        changedAny = true;
      }
    }
  } catch (_) {}

  // last topic candidate
  try {
    const raw = window.localStorage.getItem("noolixLastTopicCandidate");
    const cand = coerceTopicTitleFromAnything(raw || "");
    if (!cand) {
      // if it was a garbage value, remove it so it won't propagate
      if (raw && String(raw).trim()) {
        window.localStorage.removeItem("noolixLastTopicCandidate");
        changedAny = true;
      }
    } else {
      const prev = String(raw || "").trim();
      if (prev !== cand) {
        window.localStorage.setItem("noolixLastTopicCandidate", cand);
        changedAny = true;
      }
    }
  } catch (_) {}

  return { changed: changedAny };
}

// Convenient button hook
export function repairTopicsNow() {
  const { changed } = migrateAllLocalStorage();
  return changed;
}
