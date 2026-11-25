import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ExternalLink, FileDown, Loader2, PenLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
import { dataPorExtenso, type Boletim, type ResumoBoletim } from "@/lib/boletim";
import { domingoDaVez } from "@/lib/boletim-facil";
import { criarBoletimDaSemana, excluirBoletim, listarBoletinsPainel, obterBoletimPainel } from "@/lib/api-boletim";
import { cn } from "@/lib/utils";
import { EditorFacil } from "./EditorFacil";
import { EstudioBoletim } from "./Estudio";
import "./editor.css";
import { dataHora } from "@/lib/datas";

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
const quando = (iso: string) => dataHora(iso);

/** A primeira página do boletim, em pé e em perspectiva, com uma folha atrás. */
function Capa3D({ boletim, apagada }: { boletim: Boletim | null; apagada?: boolean }) {
  return (
    <div className="ef-vitrine-cena relative mx-auto w-[210px] sm:w-[236px]" aria-hidden>
      <div className="ef-folha-atras absolute inset-0" />
      <div className={cn("ef-capa3d relative overflow-hidden bg-white", apagada && "opacity-80")} style={{ aspectRatio: "210 / 297" }}>
        {boletim ? (
          <div className="pointer-events-none">
            <FolhasEscaladas boletim={boletim} somentePagina={boletim.paginas[0]?.id} espaco={0} />
          </div>
        ) : <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-[#5b7f99]" /></div>}
      </div>
    </div>
  );
}

function ListaBoletins({ aoAbrir }: { aoAbrir: (id: string, lembretes?: string[]) => void }) {
  const [lista, setLista] = useState<ResumoBoletim[] | null>(null);
  const [capa, setCapa] = useState<Boletim | null>(null);
  const [criando, setCriando] = useState(false);
  const carregar = useCallback(() => { listarBoletinsPainel().then(setLista).catch((e) => toast.error(e.message)); }, []);
  useEffect(carregar, [carregar]);

  const domingo = domingoDaVez();
  const daVez = lista?.find((x) => x.data === domingo) ?? [...(lista ?? [])].reverse().find((x) => x.data > domingo);
  const base = daVez ?? lista?.[0];
  const outros = lista?.filter((x) => x !== daVez) ?? [];

  useEffect(() => {
    if (!base) return;
    obterBoletimPainel({ data: { id: base.id } }).then((r) => setCapa(r.boletim)).catch(() => {});
  }, [base?.id]);

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
    <div className="ef ef-mesa min-h-full">
      <div className="mx-auto grid max-w-[1040px] gap-9 px-4 py-6 sm:px-8 sm:py-10">
        <header>
          <p className="ef-sobre">Igreja</p>
          <h1 className="ef-titulo mt-3">Boletim dominical</h1>
          <p className="ef-sub mt-1.5 max-w-[60ch]">Escreva em poucos passos. O boletim sai no padrão da igreja, pronto para o site e para a impressão.</p>
        </header>

        {!lista ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-p-suave" size={26} /></div>
        ) : (
          <>
            {/* vitrine: o boletim da vez */}
            <section className="ef-vitrine grid items-center gap-10 px-6 py-9 sm:px-10 md:grid-cols-[minmax(0,1fr)_300px] md:py-12">
              <div className="min-w-0">
                {daVez ? (
                  <>
                    <p className="ef-sobre !text-white/80">{daVez.data === domingo ? "Boletim deste domingo" : "Próximo boletim"}</p>
                    <h2 className="mt-4 text-[clamp(28px,3.6vw,42px)] font-bold leading-[1.05] tracking-[-0.025em]">{dataPorExtenso(daVez.data)}</h2>
                    <div className="mt-5 flex flex-wrap items-center gap-3 text-[13px] text-white/70">
                      <span className="ef-chip-vidro"><span className={cn("ef-ponto", !daVez.publicado && "ef-ponto-rascunho")} /> {daVez.publicado ? "No site" : "Rascunho"}</span>
                      <span className="ef-num">Alterado por {daVez.atualizadoPor || "—"} · {quando(daVez.atualizadoEm)}</span>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-2.5">
                      <button onClick={() => aoAbrir(daVez.id)} className="ef-btn ef-btn-branco !h-[52px] !px-7"><PenLine size={17} /> Continuar o boletim <ArrowRight size={17} /></button>
                      <a href={`/api/boletim/${daVez.id}/pdf`} target="_blank" rel="noopener" className="ef-btn ef-btn-vidro !h-[52px]"><FileDown size={17} /> PDF</a>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="ef-sobre !text-white/80">Próximo domingo</p>
                    <h2 className="mt-4 text-[clamp(28px,3.6vw,42px)] font-bold leading-[1.05] tracking-[-0.025em]">{dataPorExtenso(domingo)}</h2>
                    <p className="mt-4 max-w-[50ch] text-[15px] leading-relaxed text-white/75">
                      {lista.length
                        ? `O boletim já começa preparado a partir do de ${dataPorExtenso(lista[0]!.data)}: mesmos avisos, escala adiantada e agenda sem o que já passou. Falta revisar e escrever as pastorais.`
                        : "O boletim começa no modelo da igreja, com todas as seções."}
                    </p>
                    <button disabled={criando} onClick={criar} className="ef-btn ef-btn-branco mt-8 !h-[52px] !px-7">
                      {criando ? <Loader2 size={17} className="animate-spin" /> : <Plus size={18} strokeWidth={2.4} />} Começar o boletim
                    </button>
                  </>
                )}
              </div>
              {base && <Capa3D boletim={capa} apagada={!daVez} />}
            </section>

            {outros.length > 0 && (
              <section>
                <div className="mb-3 flex items-end justify-between border-b border-p-borda pb-2.5">
                  <h2 className="ef-h2">Arquivo</h2>
                  <span className="ef-num text-[12.5px] text-p-suave">{outros.length} {outros.length === 1 ? "boletim" : "boletins"}</span>
                </div>
                <ul className="ef-peca">
                  {outros.map((b) => (
                    <li key={b.id} className="ef-linha">
                      <span className="ef-data"><b>{Number(b.data.slice(8, 10))}</b><small>{MES[Number(b.data.slice(5, 7)) - 1]}</small></span>
                      <button onClick={() => aoAbrir(b.id)} className="min-w-0 text-left">
                        <span className="block truncate text-[15px] font-bold text-p-texto">{dataPorExtenso(b.data)}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-p-suave">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-p-texto-2"><span className={cn("ef-ponto !size-1.5", !b.publicado && "ef-ponto-rascunho")} /> {b.publicado ? "No site" : "Rascunho"}</span>
                          <span className="ef-num">{b.atualizadoPor || "—"} · {quando(b.atualizadoEm)}</span>
                        </span>
                      </button>
                      <span className="flex items-center gap-0.5">
                        <button onClick={() => aoAbrir(b.id)} className="ef-btn ef-btn-fantasma !text-p-acento"><PenLine size={15} /> <span className="hidden sm:inline">Editar</span></button>
                        <a href={`/api/boletim/${b.id}/pdf`} target="_blank" rel="noopener" className="ef-btn ef-btn-fantasma" title="Baixar PDF"><FileDown size={15} /> <span className="hidden sm:inline">PDF</span></a>
                        {b.publicado && <a href={`/boletim/${b.data}`} target="_blank" rel="noopener" className="ef-btn ef-btn-fantasma !px-2.5" title="Ver no site" aria-label="Ver no site"><ExternalLink size={15} /></a>}
                        <button
                          title="Apagar"
                          aria-label="Apagar"
                          onClick={async () => {
                            if (!confirm(`Apagar o boletim de ${dataPorExtenso(b.data)}? Ele sai do site e não poderá ser recuperado.`)) return;
                            try { await excluirBoletim({ data: { id: b.id } }); carregar(); toast.success("Boletim apagado."); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                          }}
                          className="ef-btn ef-btn-perigo"
                        ><Trash2 size={15} /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
