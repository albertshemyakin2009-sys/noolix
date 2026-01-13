import "../styles/globals.css";
import { useEffect } from "react";
import { Inter, Manrope } from "next/font/google";

const KNOWLEDGE_STORAGE_KEY = "noolixKnowledgeMap";

// UI / body text
const uiFont = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-ui",
});

// Headlines / titles
const displayFont = Manrope({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-display",
});

const normalizeTopicKey = (t) => {
  let raw = String(t || "").trim();
  if (!raw) return "Общее";

  raw = raw.replace(/^["'«]+/, "").replace(/["'»]+$/, "").trim();
  raw = raw.replace(/\s+/g, " ");

  // Prefer quoted fragment if present
  const q1 = raw.match(/«([^»]{2,80})»/);
  const q2 = raw.match(/"([^"]{2,80})"/);
  if (q1?.[1]) raw = q1[1].trim();
  else if (q2?.[1]) raw = q2[1].trim();

  // Extract "real topic" from common learning prompts
  const patterns = [
    /^(?:что такое|что значит|что означает)\s+(.+)$/i,
    /^(?:как решать|как решить|как найти|как сделать|как понять|как работает)\s+(.+)$/i,
    /^(?:объясни(?:те)?(?: мне)?|поясни(?:те)?|расскажи(?:те)?|разбери(?:те)?|помоги(?:те)?(?: мне)?(?: понять|с)?)\s+(.+)$/i,
    /^(?:тема|по теме)\s*[:\-—]?\s*(.+)$/i,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m?.[1]) {
      raw = m[1].trim();
      break;
    }
  }

  raw = raw.replace(/[\?\!\.]+$/g, "").trim();

  // If it still looks like a sentence — fall back to "Общее"
  const words = raw.split(/\s+/).filter(Boolean);
  const tooLong = raw.length > 60;
  const tooManyWords = words.length > 8;
  const hasSentenceMarks = /[\?\!\.]/.test(raw);
  if (tooLong || tooManyWords || hasSentenceMarks) return "Общее";

  return raw || "Общее";
};

const safeParse = (raw, fallback) => {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
};

const mergeProgress = (a, b) => {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    if (typeof v === "number" && typeof out[k] === "number") out[k] += v;
    else if (k === "score" && typeof v === "number") {
      const prev = typeof out.score === "number" ? out.score : 1;
      out.score = Math.min(prev, v); // conservative merge for weakness
    } else if (k === "updatedAt" || k === "updated") {
      const prev = out[k] ? new Date(out[k]).getTime() : 0;
      const next = v ? new Date(v).getTime() : 0;
      out[k] = next > prev ? v : out[k];
    } else if (out[k] === undefined) out[k] = v;
  }
  return out;
};

const migrateKnowledgeMapTopics = () => {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
  const km = safeParse(raw, null);
  if (!km || typeof km !== "object") return;

  let changed = false;
  const nextKm = Array.isArray(km) ? km : { ...km };

  for (const subject of Object.keys(nextKm)) {
    const subj = nextKm[subject];
    if (!subj || typeof subj !== "object") continue;

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
          typeof leaf.updated === "string" ||
          Object.keys(leaf).some((k) => ["score", "updatedAt", "updated", "source"].includes(k));

        if (!isLeaf) continue;

        const norm = normalizeTopicKey(topicKey);
        if (norm !== topicKey) {
          changed = true;
          delete newLvl[topicKey];
          if (newLvl[norm]) newLvl[norm] = mergeProgress(newLvl[norm], leaf);
          else newLvl[norm] = leaf;
        }
      }

      if (changed) {
        nextKm[subject] = { ...(nextKm[subject] || {}), [level]: newLvl };
      }
    }
  }

  if (changed) {
    window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(nextKm));
  }
};

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // тихая миграция названий тем: убирает "тема = последнее сообщение"
    migrateKnowledgeMapTopics();
  }, []);

  return (
    <div className={`${uiFont.variable} ${displayFont.variable}`}>
      <style jsx global>{`
        :root {
          --font-ui: ${uiFont.style.fontFamily};
          --font-display: ${displayFont.style.fontFamily};
        }

        html,
        body {
          font-family: var(--font-ui), ui-sans-serif, system-ui, -apple-system,
            Segoe UI, Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif;
        }

        /* ZONE: Display / Headlines */
        h1,
        h2,
        h3,
        .font-display {
          font-family: var(--font-display), var(--font-ui);
          letter-spacing: -0.02em;
        }

        /* ZONE: UI micro */
        .ui-micro {
          font-family: var(--font-ui);
          letter-spacing: 0;
        }

        /* ZONE: Buttons/CTA (keep readable) */
        button,
        .btn,
        .cta {
          font-family: var(--font-ui);
        }

        .font-ui {
          font-family: var(--font-ui);
        }
      `}</style>

      <Component {...pageProps} />
    </div>
  );
}
