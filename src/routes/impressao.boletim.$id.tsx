import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { obterBoletimImpressao } from "@/lib/api-boletim";
import { Folhas } from "@/components/boletim/Folhas";

/** Página só com as folhas A4 — usada pelo gerador de PDF e pela impressão. */
export const Route = createFileRoute("/impressao/boletim/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    ...(typeof s.t === "string" ? { t: s.t } : {}),
    ...(s.imprimir ? { imprimir: 1 } : {}),
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: ({ params, deps }) => obterBoletimImpressao({ data: { id: params.id, ...(deps.t ? { t: deps.t } : {}) } }),
  head: () => ({ meta: [{ name: "robots", content: "noindex" }, { title: "Boletim" }] }),
  component: Impressao,
});

function Impressao() {
  const b = Route.useLoaderData();
  const { imprimir } = Route.useSearch();
  useEffect(() => {
    if (!imprimir || !b) return;
    document.fonts.ready.then(() => setTimeout(() => window.print(), 300));
  }, [imprimir, b]);
  if (!b) return <p style={{ padding: 40, fontFamily: "sans-serif" }}>Boletim não encontrado.</p>;
  return (
    <div style={{ background: "#fff" }}>
      <style>{`@media screen { body { background: #e5e7eb; } .bol-folhas { display: grid; gap: 16px; justify-content: center; padding: 16px 0; } .bol-pagina { box-shadow: 0 2px 12px rgba(0,0,0,.2); } }`}</style>
      <Folhas boletim={b} />
    </div>
  );
}
