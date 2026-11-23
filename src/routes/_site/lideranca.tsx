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
      <CapaPagina rotulo="Quem nos serve" titulo={l.titulo} texto={l.introducao} />
      <div className="container-site py-16">
        {l.grupos.filter((g) => g.membros.length).map((g) => (
          <section key={g.id} className="py-8">
            <h2 className="text-2xl font-bold text-marca-funda">{g.nome}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {g.membros.map((m) => (
                <article key={m.id} className="overflow-hidden rounded-3xl bg-white ring-1 ring-linha/60">
                  {m.foto ? (
                    <img src={m.foto} alt={m.nome} className="aspect-[4/4.2] w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid aspect-[4/4.2] place-items-center bg-marca-clara text-5xl font-extrabold text-marca/40 font-[family-name:var(--font-titulo)]">{iniciais(m.nome)}</div>
                  )}
                  <div className="p-6">
                    <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-destaque">{m.cargo}</p>
                    <h3 className="mt-1 text-xl font-bold text-marca-funda">{m.nome}</h3>
                    {m.bio && <p className="mt-3 text-[15px] text-tinta-suave">{m.bio}</p>}
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
