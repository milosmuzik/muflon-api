import { NextRequest, NextResponse } from "next/server";
import { ingestKanal } from "@/lib/ingest";
import { parseKanal } from "@/lib/kanal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (secret && req.headers.get("x-ingest-secret") !== secret) {
    return NextResponse.json({ chyba: "unauthorized" }, { status: 401 });
  }
  const kanal = parseKanal(req.nextUrl.searchParams.get("kanal"));
  if (!kanal) return NextResponse.json({ chyba: "kanal cz|com" }, { status: 400 });
  if (kanal === "com") return NextResponse.json({ chyba: "COM TSV ještě není" }, { status: 400 });
  try {
    const vysledek = await ingestKanal(kanal);
    return NextResponse.json(vysledek);
  } catch (e) {
    return NextResponse.json({ chyba: e instanceof Error ? e.message : "ingest" }, { status: 500 });
  }
}
