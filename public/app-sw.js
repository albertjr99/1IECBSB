/*
 * Service worker do aplicativo dos membros (/app).
 * - Bíblia, fontes, marca e arquivos do app: guardados no aparelho (funcionam sem internet).
 * - Telas do app: busca na rede; sem internet, usa a última versão guardada.
 * - Dados (funções do servidor): sempre da rede.
 */
const VERSAO = "iecb-app-v2";
const ESSENCIAIS = ["/app", "/app/manifest.webmanifest", "/app/icone-192.png", "/biblia/indice.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO && !k.startsWith("iecb-biblia")).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const guardado = (req) => caches.match(req);
async function primeiroCache(req) {
  const c = await guardado(req);
  if (c) return c;
  const r = await fetch(req);
  if (r.ok) (await caches.open(VERSAO)).put(req, r.clone());
  return r;
}
async function primeiroRede(req) {
  try {
    const r = await fetch(req);
    if (r.ok) (await caches.open(VERSAO)).put(req, r.clone());
    return r;
  } catch {
    return (await guardado(req)) || (await guardado("/app")) || Response.error();
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/api/")) return;
  if (/^\/(biblia|fontes|marca|assets|app\/)/.test(url.pathname) && !req.mode.includes("navigate")) { e.respondWith(primeiroCache(req)); return; }
  if (req.mode === "navigate" && url.pathname.startsWith("/app")) { e.respondWith(primeiroRede(req)); return; }
});
