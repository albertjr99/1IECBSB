import { useCallback, useEffect, useState } from "react";
import { FileDown, FilePlus2, Loader2, Newspaper, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { boletimModelo, dataPorExtenso, duplicarParaProximo, proximoDomingo, type Boletim, type ResumoBoletim } from "@/lib/boletim";
import { excluirBoletim, listarBoletinsPainel, obterBoletimPainel, salvarBoletim } from "@/lib/api-boletim";
import { cn } from "@/lib/utils";
import { EstudioBoletim } from "./Estudio";

const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export function ModuloBoletim() {
  const [aberto, setAberto] = useState<string | null>(null);
  return aberto ? <EstudioBoletim id={aberto} aoVoltar={() => setAberto(null)} /> : <ListaBoletins aoAbrir={setAberto} />;
}

// ─── Lista ──────────────────────────────────────────────────────────────────

function ListaBoletins({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  const [lista, setLista] = useState<ResumoBoletim[] | null>(null);
  const [criando, setCriando] = useState(false);
  const carregar = useCallback(() => { listarBoletinsPainel().then(setLista).catch((e) => toast.error(e.message)); }, []);
  useEffect(carregar, [carregar]);

  const criar = async (deModelo: boolean) => {
    setCriando(true);
    try {
      let novo: Boletim;
      if (!deModelo && lista && lista[0]) {
        const { boletim } = await obterBoletimPainel({ data: { id: lista[0].id } });
        novo = duplicarParaProximo(boletim);
        while (lista.some((x) => x.data === novo.data)) novo = duplicarParaProximo(novo);
      } else {
        novo = boletimModelo();
        if (lista?.some((x) => x.data === novo.data)) novo.data = proximoDomingo();
      }
      await salvarBoletim({ data: { boletim: novo, acao: "Criou boletim" } });
      aoAbrir(novo.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar.");
    } finally { setCriando(false); }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Boletim</h1>
          <p className="text-[13.5px] text-p-suave">Monte o boletim dominical no modelo da igreja, publique no site e compartilhe em PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lista && lista.length > 0 && (
            <button disabled={criando} onClick={() => criar(false)} className="btn-primario !h-9 !px-3.5 !text-[13.5px] ">
              {criando ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />} Novo boletim
            </button>
          )}
        </div>
      </div>

      {!lista ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-p-suave" /></div>
      ) : lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-p-borda-forte bg-p-superficie p-10 text-center">
          <Newspaper className="mx-auto text-p-acento" size={36} />
          <h2 className="mt-4 text-lg font-bold">Comece pelo boletim de 22 de novembro</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-p-suave">
            Transcrevemos o boletim de 22/11/2026 no modelo da igreja. A partir dele, cada novo boletim já nasce com as mesmas seções — é só atualizar.
          </p>
          <button disabled={criando} onClick={() => criar(true)} className="btn-primario !h-9 !px-3.5 !text-[13.5px] mt-6">
            {criando ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />} Criar a partir do modelo
          </button>
        </div>
      ) : (
        <ul className="grid gap-2">
          {lista.map((b) => (
            <li key={b.id} className="group flex flex-wrap items-center gap-3 rounded-lg border border-p-borda bg-p-superficie p-3 pr-4 transition hover:border-p-borda-forte hover:shadow-sm">
              <button onClick={() => aoAbrir(b.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <span className="grid w-14 shrink-0 overflow-hidden rounded-md border border-p-borda text-center">
                  <span className="bg-p-acento py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(b.data.slice(5, 7)) - 1]}</span>
                  <span className="py-1 text-[20px] font-bold leading-none text-p-texto">{Number(b.data.slice(8, 10))}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-p-texto">{b.titulo} – {dataPorExtenso(b.data)}</span>
                  <span className="block text-[12.5px] text-p-suave">{b.paginas} páginas · alterado por {b.atualizadoPor || "—"} em {new Date(b.atualizadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </span>
              </button>
              <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-bold", b.publicado ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-800 dark:text-amber-300")}>
                {b.publicado ? "No site" : "Rascunho"}
              </span>
              <button onClick={() => aoAbrir(b.id)} className="hidden items-center gap-1.5 rounded-md bg-p-acento px-3 py-1.5 text-[12.5px] font-semibold text-white opacity-0 transition group-hover:opacity-100 sm:inline-flex"><PenLine size={14} /> Abrir</button>
              <a href={`/api/boletim/${b.id}/pdf`} target="_blank" rel="noopener" className="rounded-lg p-2 text-p-suave hover:bg-p-hover" title="Abrir PDF"><FileDown size={17} /></a>
              <button
                title="Excluir"
                onClick={async () => {
                  if (!confirm(`Excluir o boletim de ${dataBR(b.data)}? Esta ação não pode ser desfeita.`)) return;
                  try { await excluirBoletim({ data: { id: b.id } }); carregar(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                }}
                className="rounded-lg p-2 text-p-suave hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
              ><Trash2 size={17} /></button>
            </li>
          ))}
        </ul>
      )}
      {lista && lista.length > 0 && (
        <p className="text-[12.5px] text-p-suave">“Novo boletim” copia o mais recente para o domingo seguinte — com as mesmas seções, prontas para atualizar.</p>
      )}
    </div>
  );
}

