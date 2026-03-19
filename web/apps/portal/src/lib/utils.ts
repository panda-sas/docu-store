/**
 * Extract up to 2 initials from a name string.
 * "John Doe" → "JD", "Alice" → "A", "" → "?"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}
