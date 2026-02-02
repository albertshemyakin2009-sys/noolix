import "../styles/globals.css";
import { useEffect } from "react";
import { Manrope, Unbounded } from "next/font/google";
import { migrateAllLocalStorage } from "../lib/topicMigration";

// UI / body text
const uiFont = Manrope({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-ui",
});

// Headlines / titles (premium display)
const displayFont = Unbounded({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-display",
});

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Global one-time topic migration:
    // - cleans legacy "Без темы / __no_topic__ / Тест / Диагностика..." keys
    // - normalizes topic across KM / goals / library / tests history / context
    try {
      migrateAllLocalStorage();

      // Optional: expose manual repair for debugging (can be removed later)
      // eslint-disable-next-line no-undef
      if (typeof window !== "undefined") window.__NOOLIX_REPAIR_TOPICS__ = migrateAllLocalStorage;
    } catch (e) {
      console.warn("NOOLIX: migration failed", e);
    }
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

        /* Premium typography rendering */
        html {
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
        }

        /* Display scale */
        h1 {
          font-weight: 700;
          line-height: 1.12;
        }
        h2 {
          font-weight: 650;
          line-height: 1.16;
        }
        h3 {
          font-weight: 650;
          line-height: 1.2;
        }

        .title {
          font-family: var(--font-display), var(--font-ui);
          font-weight: 650;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        h1,
        h2,
        h3,
        .font-display {
          font-family: var(--font-display), var(--font-ui);
          letter-spacing: -0.03em;
        }

        h1 {
          letter-spacing: -0.02em;
        }

        .ui-micro {
          font-family: var(--font-ui);
        }

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
