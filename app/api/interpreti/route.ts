import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseKanal } from "@/lib/kanal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const kanal = parseKanal(req.nextUrl.searchParams.get("kanal"));
  if (!kanal) return NextResponse.json({ chyba: "kanal cz|com" }, { status: 400 });
  const rows = await prisma.kanalPrislusnost.findMany({
    where: { kanal, stav: "aktivni", interpret: { stav: "aktivni" } },
    orderBy: { interpret: { nazev: "asc" } },
    select: { interpret: { select: { klic: true, nazev: true, stav: true } } },
  });
  return NextResponse.json({ kanal, pocet: rows.length, interpreti: rows.map((r) => r.interpret) });
}
