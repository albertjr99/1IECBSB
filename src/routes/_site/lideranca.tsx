import { createFileRoute } from "@tanstack/react-router";
import { useConteudo } from "@/lib/contexto";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/lideranca")({ component: Lideranca, head: () => ({ meta: [{ title: "Liderança" }] }) });

function iniciais(n: string) {
  return n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function Lideranca() {
  const { lideranca: l } = useConteudo();
  return (
    <>
      <CapaPagina rotulo="Quem nos pastoreia" titulo={l.titulo} texto={l.introducao} />
      <div className="container-site py-16">
        {l.grupos.filter((g) => g.membros.length).map((g) => (
          <section key={g.id} className="py-8">
            <h2 className="titulo-secao">{g.nome}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {g.membros.map((m) => (
                <article key={m.id} className="overflow-hidden border border-linha bg-white">
                  {m.foto ? (
                    <img src={m.foto} alt={m.nome} className="aspect-[4/4.2] w-full object-cover object-top" loading="lazy" />
                  ) : (
                    <div className="grid aspect-[4/4.2] place-items-center bg-papel text-4xl font-bold tracking-[0.04em] text-marca/30">{iniciais(m.nome)}</div>
                  )}
                  <div className="p-6">
                    <h3 className="filete text-[1.1rem] font-bold leading-snug text-marca">{m.nome}</h3>
                    <p className="mt-1 text-[11.5px] font-bold uppercase tracking-[0.18em] text-tinta-suave">{m.cargo}</p>
                    {m.bio && <p className="texto-justificado mt-3 text-[15px] leading-relaxed text-tinta">{m.bio}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
