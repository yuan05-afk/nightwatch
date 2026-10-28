/**
 * Where to send the user after signing in. Only same-origin paths are allowed: anything starting with
 * "//" or containing a backslash is rejected, because browsers read "/\evil.com" as "//evil.com".
 */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/console";
  return value;
}
