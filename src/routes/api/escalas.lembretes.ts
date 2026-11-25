import { createFileRoute } from "@tanstack/react-router";

/**
 * Lembrete da véspera: todo dia às 18h (Brasília) avisa no celular quem está
 * escalado para o dia seguinte — e lembra quem ainda não respondeu.
 * Chamada pelo agendamento da Vercel ("Authorization: Bearer $CRON_SECRET").
 */
async function rodar(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { lerEscalas, lerMinisterios } = await import("@/server/escalas");
  const { avisarUmaVez } = await import("@/server/push");
  const { diaDe } = await import("@/lib/escalas");
  const { hora } = await import("@/lib/datas");
  const amanha = diaDe(new Date(Date.now() + 864e5).toISOString());
  const ms = new Map((await lerMinisterios()).map((m) => [m.id, m]));
  let enviados = 0;
  for (const e of await lerEscalas()) {
    if (e.situacao !== "publicada" || diaDe(e.inicio) !== amanha) continue;
    const m = ms.get(e.ministerioId);
    if (!m) continue;
    const fn = new Map(m.funcoes.map((f) => [f.id, f.nome]));
    const pessoas = new Set(e.vagas.filter((v) => v.membroId && v.resposta !== "recusado").map((v) => v.membroId!));
    for (const id of pessoas) {
      const minhas = e.vagas.filter((v) => v.membroId === id);
      const pend = minhas.some((v) => v.resposta === "pendente");
      await avisarUmaVez(`vespera:${e.id}:${id}`, [id], {
        titulo: pend ? `Amanhã você serve — confirme` : `Amanhã você serve`,
        texto: `${m.nome} · ${e.titulo}, às ${hora(e.inicio)} (${minhas.map((v) => fn.get(v.funcaoId)).join(", ")}).`,
        dados: { tela: "escala", id: e.id },
      });
      enviados++;
    }
  }
  return Response.json({ ok: true, enviados });
}

export const Route = createFileRoute("/api/escalas/lembretes")({
  server: { handlers: { GET: ({ request }) => rodar(request), POST: ({ request }) => rodar(request) } },
});
