import { prisma } from "./prisma";
import { slugKlic } from "./klic";
import { jePromoNeboReklama, rozdelFeat } from "./feat";

const TSV_URL: Record<string, string> = {
  cz: "https://raw.githubusercontent.com/milosmuzik/muflon-core/main/prisma/data/playlist.tsv",
};

const MIN_POMER = 0.5;

type Radek = {
  interpretSurovy: string;
  skladbaSurova: string;
  primarni: string;
  klic: string;
  hoste: string[];
  nazevSkladby: string;
};

export async function ingestKanal(kanal: "cz" | "com") {
  const url = TSV_URL[kanal];
  if (!url) throw new Error(`TSV pro kanál ${kanal} není`);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TSV ${res.status}`);
  const text = await res.text();
  const radky = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (radky.length < 2) throw new Error("prázdný TSV");

  const data = radky.slice(1);
  const predchozi = await prisma.ingestStav.findUnique({ where: { id: kanal } });
  if (predchozi && predchozi.radku > 20 && data.length < predchozi.radku * MIN_POMER) {
    return { stop: true, duvod: "TSV výrazně kratší než minule", minule: predchozi.radku, ted: data.length };
  }

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
  const idByKlic = new Map<string, string>();
  let novych = 0;

  for (let i = 0; i < klice.length; i++) {
    const klic = klice[i];
    const nazev = unique.get(klic) as string;
    const row = await prisma.interpret.upsert({
      where: { klic },
      create: { klic, nazev, stav: "aktivni" },
      update: { stav: "aktivni" },
    });
    if (row.createdAt.getTime() === row.updatedAt.getTime()) novych++;
    idByKlic.set(klic, row.id);
    await prisma.kanalPrislusnost.upsert({
      where: { interpretId_kanal: { interpretId: row.id, kanal } },
      create: { interpretId: row.id, kanal, stav: "aktivni" },
      update: { stav: "aktivni" },
    });
  }

  const existSkladby = await prisma.skladba.findMany({ select: { nazevSurovy: true } });
  const skladbaIds = new Set(existSkladby.map((s) => s.nazevSurovy));
  let skladebNovych = 0;

  for (const r of parsed) {
    const surovy = r.interpretSurovy + "\t" + r.skladbaSurova;
    if (skladbaIds.has(surovy)) continue;
    const interpretId = idByKlic.get(r.klic);
    if (!interpretId) continue;
    const hostHrany = r.hoste
      .map((h) => idByKlic.get(slugKlic(h)))
      .filter((id): id is string => Boolean(id) && id !== interpretId);
    try {
      await prisma.skladba.create({
        data: {
          nazev: r.nazevSkladby,
          nazevSurovy: surovy,
          hosteRaw: r.hoste,
          vPlaylistu: true,
          interpreti: {
            create: [{ interpretId, role: "primarni" }].concat(
              hostHrany.map((id) => ({ interpretId: id, role: "host" }))
            ),
          },
        },
      });
      skladbaIds.add(surovy);
      skladebNovych++;
    } catch {
      skladbaIds.add(surovy);
    }
  }

  const videne = new Set(klice);
  const aktivni = await prisma.kanalPrislusnost.findMany({
    where: { kanal, stav: "aktivni" },
    include: { interpret: { select: { id: true, klic: true } } },
  });
  let vyrazeno = 0;
  for (const p of aktivni) {
    if (videne.has(p.interpret.klic)) continue;
    await prisma.kanalPrislusnost.update({ where: { id: p.id }, data: { stav: "vyrazeno" } });
    const jine = await prisma.kanalPrislusnost.count({
      where: { interpretId: p.interpretId, stav: "aktivni", NOT: { kanal } },
    });
    if (jine === 0) {
      await prisma.interpret.update({ where: { id: p.interpretId }, data: { stav: "vyrazeno" } });
    }
    vyrazeno++;
  }

  await prisma.ingestStav.upsert({
    where: { id: kanal },
    create: { id: kanal, radku: data.length },
    update: { radku: data.length },
  });

  return {
    stop: false,
    kanal,
    radkuTsv: data.length,
    interpreti: unique.size,
    novychInterpretu: novych,
    skladebNovych,
    preskoceno,
    vyrazeno,
  };
}
