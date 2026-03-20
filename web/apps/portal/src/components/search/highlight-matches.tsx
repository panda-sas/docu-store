import type { ReactNode } from "react";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "not", "nor", "so", "yet",
  "in", "on", "at", "to", "of", "for", "by", "up", "as", "is", "it",
  "be", "am", "are", "was", "were", "been", "do", "did", "does",
  "has", "had", "have", "may", "can", "will", "shall", "should",
  "would", "could", "might", "must", "that", "this", "with", "from",
  "into", "over", "under", "both", "each", "all", "any", "few",
  "more", "most", "some", "such", "than", "too", "very", "also",
  "just", "about", "above", "after", "again", "between", "down",
  "during", "further", "here", "how", "its", "no", "only", "other",
  "out", "own", "same", "she", "they", "them", "then", "there",
  "these", "those", "through", "what", "when", "where", "which",
  "while", "who", "whom", "why", "within", "without",
]);

/**
 * Splits text by query words and wraps substring matches in underlined spans.
 * Case-insensitive, substring matching (e.g. "inhibit" matches "inhibitors").
 * Filters out stopwords and words shorter than 3 characters.
 */
export function highlightMatches(text: string, query: string): ReactNode {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()));
  if (words.length === 0) return text;

  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);

  // With a capturing group in split, odd indices are the matched portions
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span
        key={i}
        className="font-semibold underline decoration-accent-text/70 underline-offset-2"
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}
