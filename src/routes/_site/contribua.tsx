import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/contribua")({ component: Contribua, head: () => ({ meta: [{ title: "Contribua" }] }) });

function Copiar({ valor }: { valor: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(valor).then(() => { setOk(true); setTimeout(() => setOk(false), 2000); })}
      className="btn-contorno !h-10"
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
      <CapaPagina rotulo="Dízimos e ofertas" titulo={c.titulo} texto={c.texto} />
      <section className="container-site grid gap-10 py-20 lg:grid-cols-[1fr_1.1fr]">
        <div>
          {c.versiculo && (
            <figure className="border-l-[3px] border-destaque pl-6">
              <blockquote className="escritura text-[1.65rem] leading-snug text-marca-funda">{c.versiculo}</blockquote>
              {c.referencia && <figcaption className="referencia mt-5 text-tinta-suave">{c.referencia}</figcaption>}
            </figure>
          )}
        </div>
        <div className="grid content-start gap-5">
          {c.pixChave && (
            <div data-tilt="4" className="border border-linha border-t-[3px] border-t-marca bg-white p-8">
              <h2 className="text-lg font-bold text-marca">PIX</h2>
              <p className="mt-2 text-sm text-tinta-suave">Chave {c.pixTipo}</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
                <p className="break-all text-2xl font-bold text-marca tabular-nums">{c.pixChave}</p>
                <Copiar valor={c.pixChave} />
              </div>
              {c.pixFavorecido && <p className="mt-3 text-sm text-tinta-suave">Favorecido: <strong className="text-tinta">{c.pixFavorecido}</strong></p>}
            </div>
          )}
          {c.contas.map((k) => (
            <div key={k.id} data-tilt="4" className="flex gap-5 border border-linha bg-white p-8">
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-[15px]">
                <dt className="col-span-2 text-lg font-bold text-marca">{k.banco}</dt>
                {k.agencia && <><dt className="text-tinta-suave">Agência</dt><dd className="font-semibold">{k.agencia}</dd></>}
                {k.conta && <><dt className="text-tinta-suave">Conta</dt><dd className="font-semibold">{k.conta}</dd></>}
                {k.favorecido && <><dt className="text-tinta-suave">Favorecido</dt><dd className="font-semibold">{k.favorecido}</dd></>}
                {k.documento && <><dt className="text-tinta-suave">CNPJ</dt><dd className="font-semibold">{k.documento}</dd></>}
              </dl>
            </div>
          ))}
          {semDados && (
            <p className="rounded-lg bg-white p-8 text-tinta-suave border border-linha">Os dados para contribuição serão publicados em breve. Fale com a secretaria da igreja.</p>
          )}
        </div>
      </section>
    </>
  );
}
