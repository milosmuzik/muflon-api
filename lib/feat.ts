const FEAT_ODDELOVAC = /\s+(?:feat(?:uring)?\.?|ft\.?)\s+/i;
const FEAT_V_ZAVORCE = /^(.*?)\s*[\(\[]\s*(?:feat(?:uring)?\.?|ft\.?)\s+(.+?)[\)\]]\s*$/i;
const HOST_ODDELOVAC = /\s*(?:,|;|&|\band\b|\ba\b)\s*/i;

export function jePromoNeboReklama(interpret: string, skladba: string): boolean {
  const i = interpret.toLowerCase();
  const s = skladba.toLowerCase();
  if (i.includes("rádio muflon") || i.includes("radio muflon")) return true;
  if (i.includes("www.sapho") || i.includes("sapho.cz")) return true;
  if (s.startsWith("promo_") || s.startsWith("reklama")) return true;
  if (i.startsWith("www.")) return true;
  return false;
}

function rozdelHosty(surove: string): string[] {
  return surove
    .split(HOST_ODDELOVAC)
    .map((c) => c.replace(/^[\(\[]|[\)\]]$/g, "").trim())
    .filter((c) => c.length > 1);
}

export function rozdelFeat(nazev: string): { primarni: string; hoste: string[] } {
  const vZavorce = nazev.match(FEAT_V_ZAVORCE);
  if (vZavorce) {
    const primarni = vZavorce[1].trim();
    const hoste = rozdelHosty(vZavorce[2]);
    if (primarni && hoste.length) return { primarni, hoste };
  }
  const casti = nazev.split(FEAT_ODDELOVAC).map((c) => c.trim()).filter(Boolean);
  if (casti.length >= 2) {
    return { primarni: casti[0], hoste: rozdelHosty(casti.slice(1).join(", ")) };
  }
  return { primarni: nazev.trim(), hoste: [] };
}
