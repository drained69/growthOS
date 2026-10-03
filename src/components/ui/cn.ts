/** Join class names, dropping falsy values. */
export function cn(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}
