export default function Page() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>muflon-api v1</h1>
      <ul>
        <li>GET /api/interpreti?kanal=cz</li>
        <li>GET /api/interpreti/vanaheim?kanal=cz</li>
        <li>GET /api/kalendar?kanal=cz</li>
        <li>POST /api/ingest?kanal=cz</li>
      </ul>
    </main>
  );
}
