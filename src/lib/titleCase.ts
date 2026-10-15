const SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "for",
  "nor",
  "or",
  "so",
  "yet",
  "at",
  "by",
  "in",
  "of",
  "on",
  "to",
  "up",
  "as",
  "via",
  "per",
  "vs",
]);

const ACRONYM = /^[A-Z0-9]{2,}$/;
const ACRONYM_SUFFIX = /^[A-Z]{2,}\d*$/;

const capitalizeCore = (segment: string): string => {
  if (!segment) return segment;
  if (ACRONYM.test(segment) || ACRONYM_SUFFIX.test(segment)) return segment;
  const lower = segment.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const titleCaseToken = (token: string, capitalize: boolean): string => {
  const match = token.match(/^([^A-Za-z0-9]*)([A-Za-z0-9][A-Za-z0-9'’]*)([^A-Za-z0-9]*)$/);
  if (!match) return token;

  const [, prefix, core, suffix] = match;
  const coreLower = core.toLowerCase();

  if (!capitalize && SMALL_WORDS.has(coreLower)) {
    return `${prefix}${coreLower}${suffix}`;
  }

  if (core.includes("'") || core.includes("’")) {
    const apostrophe = core.includes("'") ? "'" : "’";
    const [head, ...tail] = core.split(apostrophe);
    const formatted = [capitalizeCore(head), ...tail.map((part) => part.toLowerCase())].join(apostrophe);
    return `${prefix}${formatted}${suffix}`;
  }

  return `${prefix}${capitalizeCore(core)}${suffix}`;
};

const titleCasePart = (part: string, capitalize: boolean): string => {
  if (part.includes("-")) {
    const pieces = part.split("-");
    return pieces
      .map((piece, index) =>
        titleCaseToken(piece, capitalize || index === 0 || index === pieces.length - 1)
      )
      .join("-");
  }
  return titleCaseToken(part, capitalize);
};

/** AP-style Title Case for headlines and section titles. */
export const toTitleCase = (input: string): string => {
  if (!input?.trim()) return input ?? "";

  const words = input.trim().split(/\s+/);
  const last = words.length - 1;

  return words
    .map((word, index) => titleCasePart(word, index === 0 || index === last))
    .join(" ");
};
