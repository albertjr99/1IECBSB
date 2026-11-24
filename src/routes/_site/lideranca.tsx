import { createFileRoute } from "@tanstack/react-router";
import { UmaLinha } from "@/components/site/UmaLinha";
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
                <article key={m.id} data-tilt="6" className="group overflow-hidden border border-linha bg-white hover:border-marca-media/60">
                  {m.foto ? (
                    <div className="relative overflow-hidden"><img src={m.foto} alt={m.nome} className="zoom-foto aspect-[4/4.2] w-full object-cover object-top" loading="lazy" /><span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-marca-funda/35 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" /></div>
                  ) : (
                    <div className="grid aspect-[4/4.2] place-items-center bg-papel text-4xl font-bold tracking-[0.04em] text-marca/30">{iniciais(m.nome)}</div>
                  )}
                  <div className="p-6">
                    <h3 className="filete text-[1.1rem] font-bold leading-snug text-marca"><UmaLinha>{m.nome}</UmaLinha></h3>
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
