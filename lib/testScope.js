export const normalizeKey = (value) => String(value || "").trim().toLowerCase();

export const normalizeLevel = (lvl) => {
  const s = String(lvl || "").trim().toLowerCase();
  if (!s) return "10–11 класс";

  if (
    s.includes("7–9") || s.includes("7-9") || s.includes("7 — 9") || s.includes("7—9") ||
    s.includes("7 9") || s.includes("7– 9") || s.includes("7 - 9") ||
    (s.includes("7") && (s.includes("8") || s.includes("9"))) ||
    s.includes("7 класс") || s.includes("8 класс") || s.includes("9 класс")
  ) {
    return "7–9 класс";
  }

  if (
    s.includes("10–11") || s.includes("10-11") || s.includes("10 — 11") || s.includes("10—11") ||
    s.includes("10 11") || s.includes("10– 11") || s.includes("10 - 11") ||
    s.includes("10 класс") || s.includes("11 класс") || s.includes("10") || s.includes("11")
  ) {
    return "10–11 класс";
  }

  return "10–11 класс";
};

export const makeScopeKey = (subject, level) => {
  const s = normalizeKey(subject);
  const l = normalizeKey(normalizeLevel(level));
  return `${s}|${l}`;
};

export const isSameScope = (left, right) => {
  return makeScopeKey(left?.subject, left?.level) === makeScopeKey(right?.subject, right?.level);
};
