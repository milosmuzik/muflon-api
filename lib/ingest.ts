import { prisma } from "./prisma";
import { slugKlic } from "./klic";
import { jePromoNeboReklama, rozdelFeat } from "./feat";

const TSV_URL: Record<string, string> = {
  cz: "https://raw.githubusercontent.com/milosmuzik/muflon-core/main/prisma/data/playlist.tsv",
};

type Radek = {
  interpretSurovy: string;
  skladbaSurova: string;
  primarni: string;
  klic: string;
  hoste: string[];
  nazevSkladby: string;
};

export async function ingestKanal(
  kanal: "cz" | "com",
  volby: { offset?: number; limit?: number } = {}
) {
  const offset = volby.offset ?? 0;
  const limit = volby.limit ?? 80;
  const url = TSV_URL[kanal];
  if (!url) throw new Error(`TSV pro kanál ${kanal} není`);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TSV ${res.status}`);
  const text = await res.text();
  const radky = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (radky.length < 2) throw new Error("prázdný TSV");
  const data = radky.slice(1);

  const parsed: Radek[] = [];
  let preskoceno = 0;
  for (const radek of data) {
    const casti = radek.split("\t");
    if (casti.length < 2) continue;
    const interpretSurovy = casti[0].trim();
    const skladbaSurova = casti[1].trim();
    if (!interpretSurovy || !skladbaSurova) continue;
    if (jePromoNeboReklama(interpretSurovy, skladbaSurova)) {
      preskoceno++;
      continue;
    }
    const zInterpret = rozdelFeat(interpretSurovy);
    const zSkladba = rozdelFeat(skladbaSurova);
    const primarni = zInterpret.primarni;
    const hoste = zInterpret.hoste.concat(zSkladba.hoste.filter((h) => h !== primarni));
    const klic = slugKlic(primarni);
    if (!klic) continue;
    parsed.push({
      interpretSurovy,
      skladbaSurova,
      primarni,
      klic,
      hoste,
      nazevSkladby: zSkladba.hoste.length ? zSkladba.primarni : skladbaSurova,
    });
  }

  const unique = new Map<string, string>();
  for (const r of parsed) unique.set(r.klic, r.primarni);
  const klice = Array.from(unique.keys());
  const davka = klice.slice(offset, offset + limit);
  const davkaSet = new Set(davka);
  const idByKlic = new Map<string, string>();
  let novych = 0;

  for (let i = 0; i < davka.length; i++) {
    const klic = davka[i];
    const nazev = unique.get(klic) as string;
    const row = await prisma.interpret.upsert({
      where: { klic },
      create: { klic, nazev, stav: "aktivni" },
      update: { stav: "aktivni" },
    });
    idByKlic.set(klic, row.id);
    await prisma.kanalPrislusnost.upsert({
      where: { interpretId_kanal: { interpretId: row.id, kanal } },
      create: { interpretId: row.id, kanal, stav: "aktivni" },
      update: { stav: "aktivni" },
    });
    novych++;
  }

  const existSkladby = await prisma.skladba.findMany({ select: { nazevSurovy: true } });
  const skladbaIds = new Set(existSkladby.map((s) => s.nazevSurovy));
  let skladebNovych = 0;
  for (const r of parsed) {
    if (!davkaSet.has(r.klic)) continue;
    const surovy = r.interpretSurovy + "\t" + r.skladbaSurova;
    if (skladbaIds.has(surovy)) continue;
    const interpretId = idByKlic.get(r.klic);
    if (!interpretId) continue;
    try {
      await prisma.skladba.create({
        data: {
          nazev: r.nazevSkladby,
          nazevSurovy: surovy,
          hosteRaw: r.hoste,
          vPlaylistu: true,
          interpreti: { create: [{ interpretId, role: "primarni" }] },
        },
      });
      skladbaIds.add(surovy);
      skladebNovych++;
    } catch {
      skladbaIds.add(surovy);
    }
  }

  const dalsi = offset + limit;
  const hotovo = dalsi >= klice.length;
  if (hotovo) {
    await prisma.ingestStav.upsert({
      where: { id: kanal },
      create: { id: kanal, radku: data.length },
      update: { radku: data.length },
    });
  }

  return {
    stop: false,
    kanal,
    offset,
    limit,
    dalsiOffset: hotovo ? null : dalsi,
    hotovo,
    interpretuCelkem: klice.length,
    vDavce: davka.length,
    novychInterpretu: novych,
    skladebNovych,
    preskoceno,
    radkuTsv: data.length,
  };
}
