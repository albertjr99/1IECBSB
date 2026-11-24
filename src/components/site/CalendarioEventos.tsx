import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import type { Evento } from "@/lib/conteudo";
import { cn, hojeISO, periodo } from "@/lib/utils";
import { LinkSite } from "./Link";

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const iso = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const fimDe = (ev: Evento) => (ev.dataFim && ev.dataFim > ev.data ? ev.dataFim : ev.data);
const ocorreEm = (ev: Evento, dia: string) => ev.data <= dia && dia <= fimDe(ev);

function diaPorExtenso(dia: string) {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

/** Link "adicionar ao Google Agenda" (dia inteiro; o horário vai na descrição). */
function linkAgenda(ev: Evento) {
  const f = (s: string) => s.replace(/-/g, "");
  const [a, m, d] = fimDe(ev).split("-").map(Number);
  const depois = new Date(a, m - 1, d + 1);
  const fim = iso(depois.getFullYear(), depois.getMonth(), depois.getDate());
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.titulo,
    dates: `${f(ev.data)}/${f(fim)}`,
    details: [ev.horario && `Horário: ${ev.horario}`, ev.descricao].filter(Boolean).join("\n\n"),
    location: ev.local,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function CalendarioEventos({ eventos }: { eventos: Evento[] }) {
  const hoje = hojeISO();
  const ordenados = useMemo(() => [...eventos].sort((a, b) => a.data.localeCompare(b.data)), [eventos]);
  const proximo = ordenados.find((e) => fimDe(e) >= hoje);
  const inicial = proximo ? (proximo.data < hoje ? hoje : proximo.data) : hoje;

  const [mes, setMes] = useState(() => ({ a: Number(inicial.slice(0, 4)), m: Number(inicial.slice(5, 7)) - 1 }));
  const [selecionado, setSelecionado] = useState(inicial);

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.a, mes.m, 1);
    const inicio = new Date(mes.a, mes.m, 1 - primeiro.getDay());
    const diasNoMes = new Date(mes.a, mes.m + 1, 0).getDate();
    const total = Math.ceil((primeiro.getDay() + diasNoMes) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      const dia = iso(d.getFullYear(), d.getMonth(), d.getDate());
      return { dia, n: d.getDate(), doMes: d.getMonth() === mes.m, semana: d.getDay(), eventos: ordenados.filter((e) => ocorreEm(e, dia)) };
    });
  }, [mes, ordenados]);

  const doDia = ordenados.filter((e) => ocorreEm(e, selecionado));
  const prefixo = iso(mes.a, mes.m, 1).slice(0, 7);
  const doMes = ordenados.filter((e) => e.data.slice(0, 7) <= prefixo && fimDe(e).slice(0, 7) >= prefixo);

  const mover = (delta: number) => setMes(({ a, m }) => {
    const d = new Date(a, m + delta, 1);
    return { a: d.getFullYear(), m: d.getMonth() };
  });
  const irPara = (dia: string) => {
    setSelecionado(dia);
    setMes({ a: Number(dia.slice(0, 4)), m: Number(dia.slice(5, 7)) - 1 });
  };

  return (
    <div className="grid overflow-hidden rounded-lg border border-linha bg-white lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Mês */}
      <div className="p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="font-[family-name:var(--font-titulo)] text-[1.25rem] font-bold text-marca">
            {MESES[mes.m]} <span className="font-normal text-tinta-suave">{mes.a}</span>
          </h3>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => irPara(hoje)} className="mr-1 h-9 rounded-md border border-linha px-3 text-[13.5px] font-medium text-tinta-suave hover:border-marca/40 hover:text-marca">Hoje</button>
            <button type="button" onClick={() => mover(-1)} className="grid size-9 place-items-center rounded-md text-tinta-suave hover:bg-fundo hover:text-marca" aria-label="Mês anterior"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => mover(1)} className="grid size-9 place-items-center rounded-md text-tinta-suave hover:bg-fundo hover:text-marca" aria-label="Próximo mês"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-linha pb-2">
          {SEMANA.map((s) => (
            <div key={s} className="text-center text-[11.5px] font-semibold uppercase tracking-[.1em] text-tinta-suave">{s}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {celulas.map((c) => {
            const sel = c.dia === selecionado;
            const ehHoje = c.dia === hoje;
            return (
              <button
                key={c.dia}
                type="button"
                onClick={() => setSelecionado(c.dia)}
                aria-pressed={sel}
                aria-label={`${diaPorExtenso(c.dia)}${c.eventos.length ? `, ${c.eventos.length} evento${c.eventos.length > 1 ? "s" : ""}` : ""}`}
                className={cn(
                  "group relative flex min-h-[58px] flex-col items-center border-b border-linha/50 pt-2 text-left transition-colors sm:min-h-[92px] sm:items-stretch sm:px-1.5",
                  c.doMes ? "text-tinta" : "text-tinta-suave/45",
                  sel ? "bg-marca-clara" : "hover:bg-fundo/60",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center self-center rounded-full text-[13.5px] tabular-nums sm:self-start",
                    ehHoje && "bg-marca font-semibold text-white",
                    !ehHoje && sel && "font-semibold text-marca",
                  )}
                >
                  {c.n}
                </span>

                {/* Celular: pontos */}
                {c.eventos.length > 0 && (
                  <span className="mt-1 flex gap-1 sm:hidden">
                    {c.eventos.slice(0, 3).map((e) => (
                      <span key={e.id} className={cn("size-1.5 rounded-full", e.destaque ? "bg-marca-funda" : "bg-marca")} />
                    ))}
                  </span>
                )}

                {/* Telas maiores: faixas com o título */}
                <span className="mt-1 hidden flex-col gap-1 sm:flex">
                  {c.eventos.slice(0, 2).map((e) => {
                    const comeca = e.data === c.dia || c.semana === 0;
                    const termina = fimDe(e) === c.dia || c.semana === 6;
                    return (
                      <span
                        key={e.id}
                        className={cn(
                          "block truncate py-[3px] text-[11.5px] font-semibold leading-tight",
                          e.destaque ? "bg-marca text-white" : "bg-marca-suave text-marca-funda",
                          comeca ? "rounded-l pl-1.5" : "-ml-1.5 pl-1.5",
                          termina ? "rounded-r pr-1.5" : "-mr-1.5",
                          !c.doMes && "opacity-50",
                        )}
                        title={e.titulo}
                      >
                        {comeca ? e.titulo : " "}
                      </span>
                    );
                  })}
                  {c.eventos.length > 2 && <span className="pl-1.5 text-[11px] font-medium text-tinta-suave">+{c.eventos.length - 2}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {doMes.length === 0 && (
          <p className="mt-4 text-center text-[14px] text-tinta-suave">Nenhum evento em {MESES[mes.m].toLowerCase()}.</p>
        )}
      </div>

      {/* Detalhes do dia */}
      <aside className="border-t border-linha bg-papel/60 p-5 sm:p-6 lg:border-l lg:border-t-0">
        <p className="text-[12px] font-semibold uppercase tracking-[.14em] text-tinta-suave first-letter:uppercase">{diaPorExtenso(selecionado)}</p>

        {doDia.length ? (
          <div className="mt-4 space-y-6">
            {doDia.map((ev) => (
              <article key={ev.id}>
                {ev.imagem && <img src={ev.imagem} alt="" className="mb-4 aspect-[16/10] w-full rounded-md object-cover" />}
                {ev.destaque && <span className="mb-2 inline-block rounded bg-marca px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[.08em] text-white">Destaque</span>}
                <h4 className="font-[family-name:var(--font-titulo)] text-[1.15rem] font-bold leading-snug text-marca">{ev.titulo}</h4>
                <ul className="mt-3 space-y-1.5 text-[14.5px] text-tinta-suave">
                  <li className="flex gap-2"><Clock size={16} className="mt-[3px] shrink-0 text-marca" />{periodo(ev.data, ev.dataFim)}{ev.horario && ` · ${ev.horario}`}</li>
                  {ev.local && <li className="flex gap-2"><MapPin size={16} className="mt-[3px] shrink-0 text-marca" />{ev.local}</li>}
                </ul>
                {ev.descricao && <p className="texto-justificado mt-3 whitespace-pre-line text-[15px] leading-relaxed text-tinta">{ev.descricao}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {ev.link && (
                    <LinkSite para={ev.link} className="text-[14.5px] font-semibold text-marca hover:text-marca-escura">
                      {ev.rotuloLink || "Saiba mais"} →
                    </LinkSite>
                  )}
                  <a href={linkAgenda(ev)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-tinta-suave hover:text-marca">
                    <CalendarPlus size={16} /> Adicionar à agenda
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-[15px] text-tinta-suave">Nenhum evento neste dia.</p>
            {(() => {
              const seguintes = ordenados.filter((e) => fimDe(e) >= selecionado).slice(0, 3);
              if (!seguintes.length) return null;
              return (
                <>
                  <p className="mt-6 text-[12px] font-semibold uppercase tracking-[.14em] text-tinta-suave">A seguir</p>
                  <ul className="mt-3 divide-y divide-linha/60">
                    {seguintes.map((e) => (
                      <li key={e.id}>
                        <button type="button" onClick={() => irPara(e.data < selecionado ? selecionado : e.data)} className="group flex w-full items-baseline gap-3 py-3 text-left">
                          <span className="w-12 shrink-0 text-[13px] font-semibold uppercase text-marca tabular-nums">
                            {e.data.slice(8, 10)}/{e.data.slice(5, 7)}
                          </span>
                          <span className="text-[15px] font-medium text-tinta group-hover:text-marca">{e.titulo}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              );
            })()}
          </div>
        )}
      </aside>
    </div>
  );
}
