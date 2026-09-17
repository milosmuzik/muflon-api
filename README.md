# muflon-api

Jedno API, dva kanály. v1: TSV ingest + čtení karet. Bez Gemini, Zeno, příběhů.

## Env

- `DATABASE_URL` — Neon (nová DB, ne Core). Pokud Vercel dá `POSTGRES_PRISMA_URL`, zkopíruj ji sem.
- `INGEST_SECRET` — volitelné, hlavička `x-ingest-secret`

## Po deployi

```
POST /api/ingest?kanal=cz
GET  /api/interpreti?kanal=cz
GET  /api/interpreti/vanaheim?kanal=cz
GET  /api/kalendar?kanal=cz
```

Promo a reklamy se zahazují. Vanaheim = česká kapela.
