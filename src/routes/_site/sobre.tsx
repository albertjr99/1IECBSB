import { createFileRoute } from "@tanstack/react-router";
import { useConteudo } from "@/lib/contexto";
import { paragrafos } from "@/lib/utils";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/sobre")({ component: Sobre, head: () => ({ meta: [{ title: "A Igreja" }] }) });

function Sobre() {
  const { sobre: s } = useConteudo();
  return (
    <>
      <CapaPagina titulo={s.titulo} texto={s.introducao} />

      <section className={`container-site grid gap-12 py-20 ${s.imagem ? "lg:grid-cols-[1.2fr_1fr] lg:items-start" : ""}`}>
        <div className="max-w-3xl">
          <h2 className="titulo-secao">{s.historiaTitulo}</h2>
          <div className="texto-corrido mt-6 text-[17.5px] leading-relaxed text-tinta-suave">
            {paragrafos(s.historia).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
        {s.imagem && <img src={s.imagem} alt="" className="aspect-[4/5] w-full rounded-lg object-cover" />}
      </section>

      {(s.missao || s.visao || s.valores.length > 0) && (
        <section className="border-y border-linha/60 bg-papel">
          <div className="container-site grid gap-10 py-16 md:grid-cols-3">
            {s.missao && <Pilar titulo="Missão" texto={s.missao} />}
            {s.visao && <Pilar titulo="Visão" texto={s.visao} />}
            {s.valores.length > 0 && (
              <div className="border-t-2 border-marca pt-5">
                <h3 className="text-lg font-semibold text-marca-funda">Valores</h3>
                <ul className="mt-3 grid gap-1.5 text-tinta-suave">
                  {s.valores.filter(Boolean).map((v) => <li key={v}>{v}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {s.fe.length > 0 && (
        <section id="fe" className="container-site scroll-mt-24 py-20">
          <h2 className="titulo-secao">{s.feTitulo}</h2>
          {s.feIntroducao && <p className="mt-3 max-w-2xl text-tinta-suave">{s.feIntroducao}</p>}
          <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {s.fe.map((f) => (
              <div key={f.id} className="border-t border-linha pt-5">
                <dt className="text-lg font-semibold text-marca-funda">{f.titulo}</dt>
                <dd className="mt-2 leading-relaxed text-tinta-suave">{f.texto}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  );
}

function Pilar({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="border-t-2 border-marca pt-5">
      <h3 className="text-lg font-semibold text-marca-funda">{titulo}</h3>
      <p className="mt-3 leading-relaxed text-tinta-suave">{texto}</p>
    </div>
  );
}
