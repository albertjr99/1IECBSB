import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { CapaPagina } from "@/components/site/Layout";
import { acharHino, buscarHinos } from "@/lib/hinario";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_site/hinario/")({
  component: Hinario,
  head: () => ({ meta: [{ title: "Hinário — Salmos e Hinos" }, { name: "description", content: "Coletânea dos Salmos e Hinos cantados na 1ª IEC Brasília." }] }),
});

function Hinario() {
  const [q, setQ] = useState("");
  const [ordem, setOrdem] = useState<"numero" | "titulo">("numero");
  const navegar = useNavigate();
  const exato = /^\d+$/.test(q.trim()) ? acharHino(Number(q.trim())) : null;
  const lista = useMemo(() => {
    const l = buscarHinos(q);
    return ordem === "titulo" ? [...l].sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR")) : l;
  }, [q, ordem]);
  return (
    <>
      <CapaPagina rotulo="Louvor" titulo="Hinário" texto="A coletânea dos Salmos e Hinos que cantamos em nossos cultos. Procure pelo número, pelo título ou por um trecho da letra." />
      <section className="container-site py-12 sm:py-16">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={(e) => { e.preventDefault(); if (exato) navegar({ to: "/hinario/$numero", params: { numero: String(exato.numero) } }); }} className="flex h-12 min-w-0 flex-1 items-center gap-3 border border-linha bg-white px-4 focus-within:border-marca">
            <Search size={18} className="text-tinta-suave" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="go" placeholder="Número, título ou trecho do hino" className="min-w-0 flex-1 bg-transparent text-[15.5px] outline-none" />
          </form>
          <div className="flex border border-linha bg-white">
            {(["numero", "titulo"] as const).map((o) => (
              <button key={o} type="button" onClick={() => setOrdem(o)} className={cn("h-12 px-4 text-[11.5px] font-bold uppercase tracking-[0.14em]", ordem === o ? "bg-marca text-white" : "text-tinta-suave hover:text-marca")}>
                {o === "numero" ? "Por número" : "De A a Z"}
              </button>
            ))}
          </div>
        </div>
        {exato && (
          <Link to="/hinario/$numero" params={{ numero: String(exato.numero) }} className="mt-3 flex items-center gap-4 bg-marca px-5 py-4 text-white transition-colors hover:bg-marca-funda">
            <span className="text-[26px] font-extrabold leading-none">{exato.numero}</span><span className="flex-1 text-[17px] font-bold">{exato.titulo}</span><span className="hidden text-[11.5px] font-bold uppercase tracking-[0.14em] sm:inline">Abrir hino</span><ArrowRight size={19} />
          </Link>
        )}
        <p className="mt-4 text-[13px] text-tinta-suave">{lista.length} {lista.length === 1 ? "hino" : "hinos"}</p>
        <ul className="mt-5 grid gap-px border border-linha bg-linha sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((h) => (
            <li key={h.numero} className="bg-white">
              <Link to="/hinario/$numero" params={{ numero: String(h.numero) }} className="group flex h-full items-start gap-4 p-5 transition-colors hover:bg-papel">
                <span className="w-12 flex-none text-[24px] font-extrabold leading-none tracking-[-0.02em] text-marca tabular-nums">{h.numero}</span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-bold leading-snug text-marca-funda group-hover:text-marca">{h.titulo}</span>
                  <span className="mt-1 block truncate font-escritura text-[14px] italic text-tinta-suave">{h.partes[0]?.linhas[0]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {!lista.length && <p className="py-16 text-center text-tinta-suave">Nenhum hino encontrado.</p>}
      </section>
    </>
  );
}
