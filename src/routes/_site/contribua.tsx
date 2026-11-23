import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Landmark } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/contribua")({ component: Contribua, head: () => ({ meta: [{ title: "Contribua" }] }) });

function Copiar({ valor }: { valor: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(valor).then(() => { setOk(true); setTimeout(() => setOk(false), 2000); })}
      className="btn-primario !px-4 !py-2.5"
    >
      {ok ? <Check size={16} /> : <Copy size={16} />} {ok ? "Copiado!" : "Copiar"}
    </button>
  );
}

function Contribua() {
  const { contribua: c } = useConteudo();
  const semDados = !c.pixChave && !c.contas.length;
  return (
    <>
      <CapaPagina rotulo="Generosidade" titulo={c.titulo} texto={c.texto} />
      <section className="container-site grid gap-10 py-20 lg:grid-cols-[1fr_1.1fr]">
        <div>
          {c.versiculo && (
            <figure className="rounded-3xl bg-marca p-10 text-white">
              <blockquote className="escritura text-[1.8rem] leading-snug">“{c.versiculo}”</blockquote>
              {c.referencia && <figcaption className="mt-5 text-[13px] font-bold uppercase tracking-[0.2em] text-white/70">{c.referencia}</figcaption>}
            </figure>
          )}
        </div>
        <div className="grid content-start gap-5">
          {c.pixChave && (
            <div className="rounded-3xl bg-white p-8 ring-1 ring-linha/60">
              <p className="rotulo-secao">PIX</p>
              <p className="mt-3 text-sm text-tinta-suave">Chave {c.pixTipo}</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
                <p className="break-all text-2xl font-bold text-marca-funda font-[family-name:var(--font-titulo)]">{c.pixChave}</p>
                <Copiar valor={c.pixChave} />
              </div>
              {c.pixFavorecido && <p className="mt-3 text-sm text-tinta-suave">Favorecido: <strong className="text-tinta">{c.pixFavorecido}</strong></p>}
            </div>
          )}
          {c.contas.map((k) => (
            <div key={k.id} className="flex gap-5 rounded-3xl bg-white p-8 ring-1 ring-linha/60">
              <Landmark className="mt-1 shrink-0 text-destaque" />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-[15px]">
                <dt className="col-span-2 text-lg font-bold text-marca-funda">{k.banco}</dt>
                {k.agencia && <><dt className="text-tinta-suave">Agência</dt><dd className="font-semibold">{k.agencia}</dd></>}
                {k.conta && <><dt className="text-tinta-suave">Conta</dt><dd className="font-semibold">{k.conta}</dd></>}
                {k.favorecido && <><dt className="text-tinta-suave">Favorecido</dt><dd className="font-semibold">{k.favorecido}</dd></>}
                {k.documento && <><dt className="text-tinta-suave">CNPJ</dt><dd className="font-semibold">{k.documento}</dd></>}
              </dl>
            </div>
          ))}
          {semDados && (
            <p className="rounded-3xl bg-white p-8 text-tinta-suave ring-1 ring-linha/60">Os dados para contribuição serão publicados em breve. Fale com a secretaria da igreja.</p>
          )}
        </div>
      </section>
    </>
  );
}
