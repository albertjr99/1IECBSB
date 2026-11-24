import { createFileRoute } from "@tanstack/react-router";

/**
 * Reconciliação completa com o GRATIA HUB — garante que os dois lados acabam
 * iguais mesmo que um aviso se perca. Chamada pelo agendamento da Vercel
 * ("Authorization: Bearer $CRON_SECRET").
 */
async function rodar(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { reconciliar } = await import("@/server/chamados");
  return Response.json(await reconciliar());
}

export const Route = createFileRoute("/api/hub/sincronizar")({
  server: { handlers: { GET: ({ request }) => rodar(request), POST: ({ request }) => rodar(request) } },
});
