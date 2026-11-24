import { createFileRoute } from "@tanstack/react-router";

/**
 * Aviso do GRATIA HUB: a equipe decidiu algo sobre um chamado (classificou,
 * mudou a situação, respondeu). Chega assinado; sem assinatura válida, nada
 * é gravado.
 */
export const Route = createFileRoute("/api/hub/retorno")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { aplicarNoBanco, assinaturaValida } = await import("@/server/chamados");
        const corpo = await request.text();
        if (!assinaturaValida(corpo, request.headers.get("x-hub-momento"), request.headers.get("x-hub-assinatura"))) {
          return Response.json({ erro: "Assinatura inválida." }, { status: 401 });
        }
        const dados = JSON.parse(corpo) as { teste?: boolean; chamado?: import("@/server/chamados").EstadoDoHub; excluido?: string };
        if (dados.teste) return Response.json({ ok: true, teste: true });
        if (dados.excluido) return Response.json({ ok: true, aplicados: await aplicarNoBanco([], [dados.excluido]) });
        if (!dados.chamado?.idOrigem) return Response.json({ erro: "Chamado ausente." }, { status: 400 });
        return Response.json({ ok: true, aplicados: await aplicarNoBanco([dados.chamado]) });
      },
    },
  },
});
