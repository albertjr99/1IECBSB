import { createFileRoute } from "@tanstack/react-router";

/**
 * Foto de um membro (para as escalas e equipes). Só para quem está logado no
 * app (cookie no site, "Authorization: Bearer" no app das lojas) ou no painel.
 * A versão (?v=) muda quando a foto muda, então o celular guarda por muito tempo.
 */
async function foto(id: string) {
  const { membroAtual, lerMembros } = await import("@/server/membros");
  const eu = await membroAtual();
  let ok = !!eu && eu.situacao === "ativo";
  if (!ok) {
    const { sessaoFresca } = await import("@/server/auth");
    ok = !!(await sessaoFresca().catch(() => null));
  }
  if (!ok) return new Response("Não autorizado", { status: 401 });
  const m = (await lerMembros()).find((x) => x.id === id);
  const r = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(m?.foto ?? "");
  if (!r) return new Response("Sem foto", { status: 404 });
  return new Response(Buffer.from(r[2]!, "base64"), {
    headers: { "content-type": r[1]!, "cache-control": "private, max-age=31536000, immutable", "access-control-allow-origin": "*" },
  });
}

export const Route = createFileRoute("/api/foto/$id")({
  server: { handlers: { GET: ({ params }) => foto(params.id) } },
});
