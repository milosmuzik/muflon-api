import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseKanal } from "@/lib/kanal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { klic: string } }) {
  const kanal = parseKanal(req.nextUrl.searchParams.get("kanal"));
  if (!kanal) return NextResponse.json({ chyba: "kanal cz|com" }, { status: 400 });
  const interpret = await prisma.interpret.findUnique({
    where: { klic: params.klic },
    include: {
      kanaly: true,
      clenstvi: { include: { hudebnik: true } },
      alba: { include: { album: true } },
      skladby: { where: { role: "primarni" }, include: { skladba: true }, take: 50 },
      pole: true,
    },
  });
  if (!interpret) return NextResponse.json({ chyba: "nenalezeno" }, { status: 404 });
  const prisl = interpret.kanaly.find((k) => k.kanal === kanal);
  if (!prisl || prisl.stav !== "aktivni" || interpret.stav !== "aktivni") {
    return NextResponse.json({ chyba: "neni na kanálu" }, { status: 404 });
  }
  return NextResponse.json({
    kanal,
    klic: interpret.klic,
    nazev: interpret.nazev,
    stav: interpret.stav,
    zeme: interpret.zeme,
    rokVzniku: interpret.rokVzniku,
    popis: kanal === "com" ? interpret.popisEn : interpret.popisCs,
    historie: kanal === "com" ? interpret.historieEn : interpret.historieCs,
    clenove: interpret.clenstvi.map((c) => ({
      jmeno: c.hudebnik.jmeno,
      role: c.role,
      nastroj: c.nastroj,
      obdobiOd: c.obdobiOd,
      obdobiDo: c.obdobiDo,
      narozeni: c.hudebnik.datumNarozeni,
      umrti: c.hudebnik.datumUmrti,
    })),
    alba: interpret.alba.map((a) => ({ nazev: a.album.nazev, datumVydani: a.album.datumVydani })),
    skladby: interpret.skladby.map((s) => ({ nazev: s.skladba.nazev, hoste: s.skladba.hosteRaw })),
    zdroje: interpret.pole.map((p) => ({ pole: p.pole, zdroj: p.zdroj, url: p.url })),
  });
}
