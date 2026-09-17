export type Kanal = "cz" | "com";

export function parseKanal(raw: string | null): Kanal | null {
  if (!raw) return "cz";
  const k = raw.toLowerCase();
  if (k === "cz" || k === "com") return k;
  return null;
}
