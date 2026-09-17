import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseKanal } from "@/lib/kanal";

export const dynamic = "force-dynamic";

function md(s: string | null): { m: string; d: string } | null {
  if (!s) return null;
  const m = s.match(/(\d{4}-)?(\d{2})-(\d{2})/);
  if (!m) return null;
  return { m: m[2], d: m[3] };
}

export async function GET(req: NextRequest) {
  const kanal = parseKanal(req.nextUrl.searchParams.get("kanal"));
  if (!kanal) return NextResponse.json({ chyba: "kanal cz|com" }, { status: 400 });
  const tz = kanal === "com" ? "UTC" : "Europe/Prague";
  const raw = req.nextUrl.searchParams.get("datum");
  const now = raw ? new Date(raw + "T12:00:00Z") : new Date();
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, month: "2-digit", day: "2-digit", year: "numeric" });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const mm = parts.month;
  const dd = parts.day;
  const prisl = await prisma.kanalPrislusnost.findMany({
    where: { kanal, stav: "aktivni", interpret: { stav: "aktivni" } },
    include: {
      interpret: {
        include: {
          clenstvi: { include: { hudebnik: true } },
          alba: { include: { album: true } },
        },
      },
    },
  });
  const events: { typ: string; nazev: string; klic: string; datum: string }[] = [];
  for (const p of prisl) {
    const i = p.interpret;
    for (const c of i.clenstvi) {
      const n = md(c.hudebnik.datumNarozeni);
      if (n && n.m === mm && n.d === dd) {
        events.push({ typ: "narozeni", nazev: `${c.hudebnik.jmeno} (${i.nazev})`, klic: i.klic, datum: c.hudebnik.datumNarozeni! });
      }
      const u = md(c.hudebnik.datumUmrti);
      if (u && u.m === mm && u.d === dd) {
        events.push({ typ: "umrti", nazev: `${c.hudebnik.jmeno} (${i.nazev})`, klic: i.klic, datum: c.hudebnik.datumUmrti! });
      }
    }
    for (const a of i.alba) {
      const d = md(a.album.datumVydani);
      if (d && d.m === mm && d.d === dd) {
        events.push({ typ: "album", nazev: `${a.album.nazev} — ${i.nazev}`, klic: i.klic, datum: a.album.datumVydani! });
      }
    }
  }
  return NextResponse.json({ kanal, pasmo: tz, den: `${mm}-${dd}`, pocet: Math.min(events.length, 15), udalosti: events.slice(0, 15) });
}
