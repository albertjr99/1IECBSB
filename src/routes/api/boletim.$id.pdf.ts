import { createFileRoute } from "@tanstack/react-router";

/**
 * PDF do boletim. Publicado: qualquer pessoa baixa (com cache na Vercel).
 * Rascunho: só com sessão do painel.
 */
export const Route = createFileRoute("/api/boletim/$id/pdf")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { obter, obterPorData, tokenImpressao } = await import("@/server/boletins");
        const { sessaoAtual } = await import("@/server/auth");
        const { gerarPdf } = await import("@/server/pdf");
        const id = params.id;
        const b = /^\d{4}-\d{2}-\d{2}$/.test(id) ? await obterPorData(id) : await obter(id);
        if (!b || (!b.publicado && !sessaoAtual())) return new Response("Boletim não encontrado.", { status: 404 });
        const origem = new URL(request.url).origin;
        const url = `${origem}/impressao/boletim/${b.id}?t=${encodeURIComponent(tokenImpressao(b.id))}`;
        try {
          const pdf = await gerarPdf(url);
          const nome = `boletim-${b.data}.pdf`;
          return new Response(pdf as unknown as BodyInit, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `${new URL(request.url).searchParams.has("baixar") ? "attachment" : "inline"}; filename="${nome}"`,
              "Cache-Control": b.publicado ? "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" : "no-store",
            },
          });
        } catch (e) {
          console.error("[pdf]", e);
          // Sem o gerador, cai para a página de impressão do próprio navegador.
          return Response.redirect(`${url}&imprimir=1`, 302);
        }
      },
    },
  },
});
