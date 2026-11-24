import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FileDown, Globe, Loader2, Newspaper, PenLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { dataPorExtenso, type ResumoBoletim } from "@/lib/boletim";
import { domingoDaVez } from "@/lib/boletim-facil";
import { criarBoletimDaSemana, excluirBoletim, listarBoletinsPainel } from "@/lib/api-boletim";
import { cn } from "@/lib/utils";
import { EditorFacil } from "./EditorFacil";
import { EstudioBoletim } from "./Estudio";

type Aberto = { id: string; modo: "facil" | "avancado"; lembretes?: string[] };

export function ModuloBoletim() {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  if (aberto?.modo === "avancado") return <EstudioBoletim id={aberto.id} aoVoltar={() => setAberto({ id: aberto.id, modo: "facil" })} />;
  if (aberto) {
    return (
      <EditorFacil
        key={aberto.id}
        id={aberto.id}
        {...(aberto.lembretes ? { lembretes: aberto.lembretes } : {})}
        aoVoltar={() => setAberto(null)}
        aoModoAvancado={() => setAberto({ id: aberto.id, modo: "avancado" })}
      />
    );
  }
  return <ListaBoletins aoAbrir={(id, lembretes) => setAberto({ id, modo: "facil", ...(lembretes ? { lembretes } : {}) })} />;
}

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function Calendario({ data, grande }: { data: string; grande?: boolean }) {
  return (
    <span className={cn("grid shrink-0 overflow-hidden rounded-xl border-2 border-p-borda bg-p-superficie text-center", grande ? "w-20" : "w-14")}>
      <span className={cn("bg-p-acento font-bold uppercase tracking-wider text-white", grande ? "py-1 text-[12px]" : "py-0.5 text-[10px]")}>{MES[Number(data.slice(5, 7)) - 1]}</span>
      <span className={cn("font-bold leading-none text-p-texto", grande ? "py-2 text-[30px]" : "py-1.5 text-[20px]")}>{Number(data.slice(8, 10))}</span>
    </span>
  );
}

function ListaBoletins({ aoAbrir }: { aoAbrir: (id: string, lembretes?: string[]) => void }) {
  const [lista, setLista] = useState<ResumoBoletim[] | null>(null);
  const [criando, setCriando] = useState(false);
  const carregar = useCallback(() => { listarBoletinsPainel().then(setLista).catch((e) => toast.error(e.message)); }, []);
  useEffect(carregar, [carregar]);

  const domingo = domingoDaVez();
  const daVez = lista?.find((x) => x.data === domingo) ?? [...(lista ?? [])].reverse().find((x) => x.data > domingo);
  const outros = lista?.filter((x) => x !== daVez) ?? [];

  const criar = async () => {
    setCriando(true);
    try {
      const r = await criarBoletimDaSemana();
      aoAbrir(r.id, r.lembretes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar.");
    } finally { setCriando(false); }
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-7 p-4 sm:p-8">
      <div>
        <h1 className="text-[26px] font-bold text-p-texto">Boletim dominical</h1>
        <p className="mt-1 text-[15.5px] text-p-suave">Escreva o boletim em poucos passos. Ele fica pronto para o site e para imprimir.</p>
      </div>

      {!lista ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-p-suave" size={28} /></div>
      ) : (
        <>
          {/* o boletim da vez */}
          {daVez ? (
            <section className="rounded-3xl border-2 border-p-acento/25 bg-p-realce p-5 sm:p-7">
              <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-p-acento">{daVez.data === domingo ? "Boletim deste domingo" : "Próximo boletim"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Calendario data={daVez.data} grande />
                <div className="min-w-0 flex-1">
                  <p className="text-[21px] font-bold leading-tight text-p-texto">{dataPorExtenso(daVez.data)}</p>
                  <p className="mt-1 text-[14.5px] text-p-suave">
                    {daVez.publicado ? "Já está no site." : "Ainda é rascunho."} Última alteração: {daVez.atualizadoPor || "—"}, {new Date(daVez.atualizadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => aoAbrir(daVez.id)} className="inline-flex h-14 items-center gap-2 rounded-xl bg-p-acento px-7 text-[17px] font-bold text-white shadow-sm transition hover:brightness-110">
                  <PenLine size={20} /> Continuar o boletim <ArrowRight size={20} />
                </button>
                <a href={`/api/boletim/${daVez.id}/pdf`} target="_blank" rel="noopener" className="inline-flex h-14 items-center gap-2 rounded-xl border-2 border-p-borda bg-p-superficie px-5 text-[15px] font-semibold text-p-texto hover:border-p-acento hover:text-p-acento"><FileDown size={19} /> Baixar PDF</a>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border-2 border-dashed border-p-acento/40 bg-p-superficie p-6 text-center sm:p-9">
              <Newspaper className="mx-auto text-p-acento" size={40} />
              <p className="mt-3 text-[21px] font-bold text-p-texto">Fazer o boletim de {dataPorExtenso(domingo)}</p>
              <p className="mx-auto mt-1.5 max-w-md text-[15px] text-p-suave">
                {lista.length ? "Ele já vem preparado a partir do último: mesmos avisos, escala adiantada e agenda atualizada. É só revisar e escrever as pastorais." : "Ele já vem no modelo da igreja, com todas as seções."}
              </p>
              <button disabled={criando} onClick={criar} className="mt-6 inline-flex h-14 items-center gap-2 rounded-xl bg-p-acento px-8 text-[17px] font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
                {criando ? <Loader2 size={20} className="animate-spin" /> : <Plus size={21} />} Começar o boletim
              </button>
            </section>
          )}

          {outros.length > 0 && (
            <section>
              <h2 className="mb-3 text-[17px] font-bold text-p-texto">Boletins anteriores</h2>
              <ul className="grid gap-2">
                {outros.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-p-borda bg-p-superficie p-3 pr-4">
                    <Calendario data={b.data} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15.5px] font-bold text-p-texto">{dataPorExtenso(b.data)}</span>
                      <span className={cn("mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-px text-[11.5px] font-bold", b.publicado ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-800 dark:text-amber-300")}>
                        {b.publicado ? <><Globe size={11} /> No site</> : "Rascunho"}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1">
                      <button onClick={() => aoAbrir(b.id)} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold text-p-acento hover:bg-p-realce"><PenLine size={16} /> Editar</button>
                      <a href={`/api/boletim/${b.id}/pdf`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold text-p-texto-2 hover:bg-p-hover"><FileDown size={16} /> PDF</a>
                      <button
                        title="Apagar"
                        onClick={async () => {
                          if (!confirm(`Apagar o boletim de ${dataPorExtenso(b.data)}? Ele sai do site e não poderá ser recuperado.`)) return;
                          try { await excluirBoletim({ data: { id: b.id } }); carregar(); toast.success("Boletim apagado."); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                        }}
                        className="inline-flex h-10 items-center rounded-xl px-2.5 text-p-suave hover:bg-red-500/10 hover:text-red-600"
                      ><Trash2 size={17} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
