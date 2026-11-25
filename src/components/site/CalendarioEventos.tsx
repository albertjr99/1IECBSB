import { dataComDia } from "@/lib/datas";
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

/** "aaaa-mm-dd" → "quarta, 25/11/2026". */
function diaPorExtenso(dia: string) {
  return dataComDia(dia);
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

function diasAte(dia: string, hoje: string) {
  const [a, m, d] = dia.split("-").map(Number);
  const [ha, hm, hd] = hoje.split("-").map(Number);
  return Math.round((new Date(a, m - 1, d).getTime() - new Date(ha, hm - 1, hd).getTime()) / 86400000);
}
function quando(ev: Evento, hoje: string) {
  if (ev.data <= hoje && hoje <= fimDe(ev)) return "Acontecendo";
  const n = diasAte(ev.data, hoje);
  if (n < 0) return "Já aconteceu";
  if (n === 1) return "Amanhã";
  if (n < 7) return `Em ${n} dias`;
  if (n < 14) return "Semana que vem";
  return `Em ${Math.round(n / 7)} semanas`;
}

/** Inclinação 3D que acompanha o mouse, com reflexo de luz. */
function useInclinacao(max = 7) {
  const [t, setT] = useState({ rx: 0, ry: 0, x: 50, y: 50, ativo: false });
  return {
    estilo: {
      transform: `perspective(1100px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateZ(0)`,
      "--luz-x": `${t.x}%`,
      "--luz-y": `${t.y}%`,
    } as React.CSSProperties,
    ativo: t.ativo,
    eventos: {
      onMouseMove: (e: React.MouseEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        setT({ rx: (0.5 - py) * max, ry: (px - 0.5) * max, x: px * 100, y: py * 100, ativo: true });
      },
      onMouseLeave: () => setT({ rx: 0, ry: 0, x: 50, y: 50, ativo: false }),
    },
  };
}

export function CalendarioEventos({ eventos }: { eventos: Evento[] }) {
  const hoje = hojeISO();
  const ordenados = useMemo(() => [...eventos].sort((a, b) => a.data.localeCompare(b.data)), [eventos]);
  const proximo = ordenados.find((e) => fimDe(e) >= hoje);
  const inicial = proximo ? (proximo.data < hoje ? hoje : proximo.data) : hoje;

  const [mes, setMes] = useState(() => ({ a: Number(inicial.slice(0, 4)), m: Number(inicial.slice(5, 7)) - 1 }));
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const [selecionado, setSelecionado] = useState(inicial);
  const [indice, setIndice] = useState(0);
  const inclinar = useInclinacao();

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
  const ev = doDia[Math.min(indice, doDia.length - 1)];
  const prefixo = iso(mes.a, mes.m, 1).slice(0, 7);
  const doMes = ordenados.filter((e) => e.data.slice(0, 7) <= prefixo && fimDe(e).slice(0, 7) >= prefixo);
  const seguintes = ordenados.filter((e) => fimDe(e) >= hoje).slice(0, 6);

  const mover = (delta: 1 | -1) => {
    setDirecao(delta);
    setMes(({ a, m }) => { const d = new Date(a, m + delta, 1); return { a: d.getFullYear(), m: d.getMonth() }; });
  };
  const escolher = (dia: string) => { setSelecionado(dia); setIndice(0); };
  const irPara = (dia: string) => {
    const alvo = { a: Number(dia.slice(0, 4)), m: Number(dia.slice(5, 7)) - 1 };
    setDirecao(alvo.a * 12 + alvo.m >= mes.a * 12 + mes.m ? 1 : -1);
    setMes(alvo);
    escolher(dia);
  };

  const mesTitulo = MESES[mes.m]!;
  return (
    <div className="agenda-cal overflow-hidden border border-linha bg-white text-tinta">
      {/* ── faixa do mês ── */}
      <div className="relative isolate overflow-hidden bg-marca-funda px-5 pb-6 pt-6 text-white sm:px-8 sm:pt-8">
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[url('/marca/grafismo-monte-transparente-branco.svg')] bg-[length:1100px_auto] bg-[position:right_-260px_bottom_-150px] bg-no-repeat opacity-[0.12]" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div key={`${mes.a}-${mes.m}`} className={direcao > 0 ? "cal-entra-dir" : "cal-entra-esq"}>
            <p className="rotulo-secao !text-white/75">Agenda da igreja · {mes.a}</p>
            <h3 className="mt-2 text-[2.4rem] font-bold leading-none tracking-[-0.035em] sm:text-[3.4rem]">{mesTitulo}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => irPara(hoje)} className="agenda-btn-vidro h-10 px-4 text-[11.5px] font-bold uppercase tracking-[0.16em]">Hoje</button>
            <button type="button" onClick={() => mover(-1)} className="agenda-btn-vidro grid size-10 place-items-center" aria-label="Mês anterior"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => mover(1)} className="agenda-btn-vidro grid size-10 place-items-center" aria-label="Próximo mês"><ChevronRight size={18} /></button>
          </div>
        </div>
        <p className="mt-4 text-[13px] text-white/65">
          {doMes.length ? `${doMes.length} ${doMes.length === 1 ? "evento" : "eventos"} em ${mesTitulo.toLowerCase()}. Toque num dia para ver os detalhes.` : `Nenhum evento em ${mesTitulo.toLowerCase()} até agora.`}
        </p>
      </div>
      <div aria-hidden className="h-[3px] bg-marca" />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── grade do mês ── */}
        <div className="border-linha p-3 sm:p-6 lg:border-r">
          <div className="grid grid-cols-7 border-b-2 border-marca pb-2">
            {SEMANA.map((d, i) => <div key={d} className={cn("text-center text-[10.5px] font-bold uppercase tracking-[0.2em]", i === 0 ? "text-marca" : "text-tinta-suave")}>{d}</div>)}
          </div>
          <div key={`g${mes.a}-${mes.m}`} className={cn("grid grid-cols-7 border-l border-linha [perspective:1200px]", direcao > 0 ? "cal-grade-dir" : "cal-grade-esq")}>
            {celulas.map((c, i) => {
              const sel = c.dia === selecionado;
              const ehHoje = c.dia === hoje;
              const tem = c.eventos.length > 0;
              const destaque = c.eventos.some((e) => e.destaque);
              return (
                <button
                  key={c.dia}
                  type="button"
                  onClick={() => escolher(c.dia)}
                  aria-pressed={sel}
                  aria-label={`${diaPorExtenso(c.dia)}${tem ? `, ${c.eventos.length} evento${c.eventos.length > 1 ? "s" : ""}` : ""}`}
                  style={{ animationDelay: `${i * 10}ms` }}
                  className={cn(
                    "agenda-dia group relative flex min-h-[54px] flex-col border-b border-r border-linha p-1.5 text-left sm:min-h-[92px] sm:p-2",
                    !c.doMes && "agenda-dia-fora",
                    c.semana === 0 && c.doMes && "bg-nevoa/60",
                    tem && "agenda-dia-evento",
                    sel && "agenda-dia-sel",
                  )}
                >
                  <span className="flex items-center gap-1">
                    <span className={cn("text-[13px] font-bold tabular-nums sm:text-[15px]", sel ? "text-white" : c.doMes ? "text-tinta" : "text-tinta-suave")}>{c.n}</span>
                    {ehHoje && <span className="agenda-cruz" title="Hoje" />}
                  </span>
                  {tem && (
                    <>
                      <span className="mt-auto flex gap-1 sm:hidden">{c.eventos.slice(0, 3).map((e) => <span key={e.id} className={cn("size-1.5", sel ? "bg-white" : "bg-marca")} />)}</span>
                      <span className="mt-1.5 hidden min-w-0 flex-col gap-1 sm:flex">
                        {c.eventos.slice(0, 2).map((e) => (
                          <span key={e.id} className={cn("agenda-chip line-clamp-2", e.destaque || destaque ? "agenda-chip-forte" : "")}>{e.data === c.dia || c.semana === 0 ? e.titulo : "continua"}</span>
                        ))}
                        {c.eventos.length > 2 && <span className={cn("text-[10px] font-semibold", sel ? "text-white/75" : "text-tinta-suave")}>+{c.eventos.length - 2}</span>}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-4 text-[11.5px] text-tinta-suave">
            <span className="inline-flex items-center gap-1.5"><span className="agenda-cruz" /> Hoje</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 bg-marca" /> Evento em destaque</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 border-l-[3px] border-marca bg-marca-suave" /> Evento</span>
          </p>
        </div>

        {/* ── o dia escolhido ── */}
        <div className="flex flex-col gap-4 bg-nevoa/70 p-4 sm:p-6 [perspective:1100px]">
          <p className="rotulo-secao first-letter:uppercase">{diaPorExtenso(selecionado)}</p>
          {ev ? (
            <article key={ev.id + selecionado} {...inclinar.eventos} style={inclinar.estilo} className={cn("agenda-cartao relative flex-1 overflow-hidden bg-white transition-transform duration-200 ease-out will-change-transform", inclinar.ativo && "duration-75")}>
              <span aria-hidden className="cal-reflexo" />
              {ev.imagem ? (
                <div className="relative">
                  <img src={ev.imagem} alt="" className="aspect-[16/9] w-full object-cover" />
                  <span className="absolute bottom-3 left-3 bg-white px-3 py-2 text-marca shadow-lg"><span className="block text-[1.6rem] font-bold leading-none tabular-nums">{ev.data.slice(8, 10)}</span><span className="block text-[9.5px] font-bold uppercase tracking-[0.2em]">{MESES[Number(ev.data.slice(5, 7)) - 1]!.slice(0, 3)}</span></span>
                </div>
              ) : (
                <div className="flex items-stretch border-b border-linha">
                  <div className="flex w-[108px] shrink-0 flex-col items-center justify-center bg-marca py-5 text-white">
                    <span className="text-[3.2rem] font-bold leading-[0.85] tracking-[-0.04em] tabular-nums">{ev.data.slice(8, 10)}</span>
                    <span className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] text-white/75">{MESES[Number(ev.data.slice(5, 7)) - 1]!.slice(0, 3)}</span>
                  </div>
                  <div className="flex flex-1 items-center bg-[url('/marca/grafismo-monte-transparente-azul.svg')] bg-[length:520px_auto] bg-[position:right_-160px_bottom_-60px] bg-no-repeat px-5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-marca">{quando(ev, hoje)}</span>
                  </div>
                </div>
              )}
              <div className="relative p-6">
                {ev.destaque && <p className="rotulo-secao mb-3 !text-[11px]">Destaque</p>}
                <h4 className="text-[1.35rem] font-bold leading-snug tracking-[-0.01em] text-marca">{ev.titulo}</h4>
                <ul className="mt-4 grid gap-2 border-l-2 border-marca-suave pl-3 text-[14px] text-tinta">
                  <li className="flex gap-2.5"><Clock size={16} className="mt-[3px] shrink-0 text-marca" />{periodo(ev.data, ev.dataFim)}{ev.horario && ` · ${ev.horario}`}</li>
                  {ev.local && <li className="flex gap-2.5"><MapPin size={16} className="mt-[3px] shrink-0 text-marca" />{ev.local}</li>}
                </ul>
                {ev.descricao && <p className="texto-justificado mt-4 line-clamp-6 whitespace-pre-line text-[14.5px] leading-relaxed text-tinta">{ev.descricao}</p>}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a href={linkAgenda(ev)} target="_blank" rel="noopener noreferrer" className="btn-primario !h-10 !px-4"><CalendarPlus size={15} /> Salvar na agenda</a>
                  {ev.link && <LinkSite para={ev.link} className="text-[12px] font-bold uppercase tracking-[0.14em] text-marca hover:text-marca-funda">{ev.rotuloLink || "Saiba mais"} →</LinkSite>}
                </div>
              </div>
              {doDia.length > 1 && (
                <div className="flex items-center justify-center gap-2 border-t border-linha py-3">
                  {doDia.map((e, i) => <button key={e.id} type="button" aria-label={e.titulo} onClick={() => setIndice(i)} className={cn("h-1.5 transition-all", i === Math.min(indice, doDia.length - 1) ? "w-7 bg-marca" : "w-3 bg-marca-suave hover:bg-marca-media")} />)}
                </div>
              )}
            </article>
          ) : (
            <div className="flex flex-1 flex-col border border-linha bg-white p-6">
              <p className="text-[15px] text-tinta">Nenhum evento neste dia.</p>
              {seguintes.length > 0 && (
                <>
                  <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-tinta-suave">A seguir</p>
                  <ul className="mt-3 divide-y divide-linha border-y border-linha">
                    {seguintes.slice(0, 4).map((e) => (
                      <li key={e.id}>
                        <button type="button" onClick={() => irPara(e.data < hoje ? hoje : e.data)} className="group flex w-full items-center gap-4 py-3 text-left">
                          <span className="w-11 shrink-0 text-center text-marca"><span className="block text-[1.35rem] font-bold leading-none tabular-nums">{e.data.slice(8, 10)}</span><span className="block text-[9.5px] font-bold uppercase tracking-[0.18em]">{MESES[Number(e.data.slice(5, 7)) - 1]!.slice(0, 3)}</span></span>
                          <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-tinta">{e.titulo}</span>
                          <ChevronRight size={16} className="text-marca transition-transform group-hover:translate-x-1" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* próximos */}
      {seguintes.length > 0 && (
        <div className="border-t border-linha bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <span className="rotulo-secao mr-2 shrink-0 !text-[10.5px]">Próximos</span>
            {seguintes.map((e) => (
              <button key={e.id} type="button" onClick={() => irPara(e.data < hoje ? hoje : e.data)} className={cn("flex shrink-0 items-center gap-2.5 border px-3 py-2 text-[13px] transition", ocorreEm(e, selecionado) ? "border-marca bg-marca text-white" : "border-linha text-tinta hover:border-marca hover:text-marca")}>
                <span className="font-bold tabular-nums">{e.data.slice(8, 10)}/{e.data.slice(5, 7)}</span>
                <span className="max-w-[220px] truncate">{e.titulo}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
