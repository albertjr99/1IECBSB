import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Compass, Target } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { paragrafos } from "@/lib/utils";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/sobre")({ component: Sobre, head: () => ({ meta: [{ title: "A Igreja" }] }) });

function Sobre() {
  const { sobre: s, geral } = useConteudo();
  return (
    <>
      <CapaPagina rotulo={geral.nomeCurto} titulo={s.titulo} texto={s.introducao} />

      <section className="container-site grid gap-12 py-20 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div>
          <p className="rotulo-secao">Desde o início</p>
          <h2 className="titulo-secao mt-3">{s.historiaTitulo}</h2>
          <div className="texto-corrido mt-6 text-[17.5px] text-tinta-suave">
            {paragrafos(s.historia).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
        {s.imagem ? (
          <img src={s.imagem} alt="" className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-xl" />
        ) : (
          <div className="grid aspect-[4/5] place-items-center rounded-[2rem] bg-marca shadow-xl"><img src="/simbolo-negativo.svg" alt="" className="w-3/5" /></div>
        )}
      </section>

      {(s.missao || s.visao || s.valores.length > 0) && (
        <section className="bg-papel">
          <div className="container-site grid gap-6 py-20 md:grid-cols-3">
            {s.missao && <Pilar Icone={Target} titulo="Missão" texto={s.missao} />}
            {s.visao && <Pilar Icone={Compass} titulo="Visão" texto={s.visao} />}
            {s.valores.length > 0 && (
              <div className="rounded-3xl bg-marca p-8 text-white">
                <BookOpen className="text-white/70" />
                <h3 className="mt-4 text-xl font-bold">Valores</h3>
                <ul className="mt-3 grid gap-2 text-white/85">
                  {s.valores.filter(Boolean).map((v) => <li key={v} className="flex gap-2"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-destaque" />{v}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {s.fe.length > 0 && (
        <section id="fe" className="container-site scroll-mt-24 py-20">
          <p className="rotulo-secao">Confissão</p>
          <h2 className="titulo-secao mt-3">{s.feTitulo}</h2>
          {s.feIntroducao && <p className="mt-4 max-w-2xl text-tinta-suave">{s.feIntroducao}</p>}
          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {s.fe.map((f, i) => (
              <div key={f.id} className="flex gap-5 border-t border-linha/70 pt-6">
                <span className="text-3xl font-extrabold text-marca-suave font-[family-name:var(--font-titulo)]">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg font-bold text-marca-funda">{f.titulo}</h3>
                  <p className="mt-2 text-tinta-suave">{f.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Pilar({ Icone, titulo, texto }: { Icone: typeof Target; titulo: string; texto: string }) {
  return (
    <div className="rounded-3xl bg-white p-8 ring-1 ring-linha/60">
      <Icone className="text-destaque" />
      <h3 className="mt-4 text-xl font-bold text-marca-funda">{titulo}</h3>
      <p className="mt-3 text-tinta-suave">{texto}</p>
    </div>
  );
}
