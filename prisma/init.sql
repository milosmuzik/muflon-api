CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "Interpret" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "klic" TEXT NOT NULL UNIQUE,
  "nazev" TEXT NOT NULL,
  "aliasy" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "stav" TEXT NOT NULL DEFAULT 'aktivni',
  "zeme" TEXT,
  "rokVzniku" INTEGER,
  "popisCs" TEXT,
  "popisEn" TEXT,
  "historieCs" TEXT,
  "historieEn" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "KanalPrislusnost" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "interpretId" TEXT NOT NULL REFERENCES "Interpret"("id") ON DELETE CASCADE,
  "kanal" TEXT NOT NULL,
  "stav" TEXT NOT NULL DEFAULT 'aktivni',
  UNIQUE ("interpretId", "kanal")
);
CREATE INDEX IF NOT EXISTS "KanalPrislusnost_kanal_stav_idx" ON "KanalPrislusnost"("kanal", "stav");

CREATE TABLE IF NOT EXISTS "Hudebnik" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "klic" TEXT NOT NULL UNIQUE,
  "jmeno" TEXT NOT NULL,
  "aliasy" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "datumNarozeni" TEXT,
  "datumUmrti" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Clenstvi" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "hudebnikId" TEXT NOT NULL REFERENCES "Hudebnik"("id") ON DELETE CASCADE,
  "interpretId" TEXT NOT NULL REFERENCES "Interpret"("id") ON DELETE CASCADE,
  "role" TEXT,
  "nastroj" TEXT,
  "obdobiOd" TEXT,
  "obdobiDo" TEXT
);

CREATE TABLE IF NOT EXISTS "Album" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "nazev" TEXT NOT NULL,
  "datumVydani" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AlbumInterpret" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "albumId" TEXT NOT NULL REFERENCES "Album"("id") ON DELETE CASCADE,
  "interpretId" TEXT NOT NULL REFERENCES "Interpret"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Skladba" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "nazev" TEXT NOT NULL,
  "nazevSurovy" TEXT NOT NULL,
  "hosteRaw" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "vPlaylistu" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SkladbaInterpret" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "skladbaId" TEXT NOT NULL REFERENCES "Skladba"("id") ON DELETE CASCADE,
  "interpretId" TEXT NOT NULL REFERENCES "Interpret"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'primarni',
  UNIQUE ("skladbaId", "interpretId", "role")
);

CREATE TABLE IF NOT EXISTS "SkladbaHudebnik" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "skladbaId" TEXT NOT NULL REFERENCES "Skladba"("id") ON DELETE CASCADE,
  "hudebnikId" TEXT NOT NULL REFERENCES "Hudebnik"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'host'
);

CREATE TABLE IF NOT EXISTS "PoleZdroj" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pole" TEXT NOT NULL,
  "zdroj" TEXT NOT NULL,
  "url" TEXT,
  "jazyk" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "interpretId" TEXT REFERENCES "Interpret"("id") ON DELETE CASCADE,
  "hudebnikId" TEXT REFERENCES "Hudebnik"("id") ON DELETE CASCADE,
  "albumId" TEXT REFERENCES "Album"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "IngestStav" (
  "id" TEXT PRIMARY KEY,
  "radku" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
