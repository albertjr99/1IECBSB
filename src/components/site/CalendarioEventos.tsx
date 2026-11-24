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

  return (
    <div className="cal-palco relative isolate overflow-hidden bg-marca-funda text-white">
      {/* luzes de fundo e o grafismo do monte */}
      <span aria-hidden className="cal-orbe cal-orbe-1" />
      <span aria-hidden className="cal-orbe cal-orbe-2" />
      <span aria-hidden className="cal-orbe cal-orbe-3" />
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[url('/marca/grafismo-monte-transparente-branco.svg')] bg-[length:1400px_auto] bg-[position:right_-300px_bottom_-80px] bg-no-repeat opacity-[0.07]" />

      <div className="grid gap-6 p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        {/* ── o mês ── */}
        <div className="cal-vidro p-4 sm:p-6">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div key={`${mes.a}-${mes.m}`} className={direcao > 0 ? "cal-entra-dir" : "cal-entra-esq"}>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/55">{mes.a}</p>
              <h3 className="text-[2rem] font-bold leading-none tracking-[-0.03em] sm:text-[2.6rem]">{MESES[mes.m]}</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => irPara(hoje)} className="cal-botao h-10 px-4 text-[11.5px] font-bold uppercase tracking-[0.16em]">Hoje</button>
              <button type="button" onClick={() => mover(-1)} className="cal-botao grid size-10 place-items-center" aria-label="Mês anterior"><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => mover(1)} className="cal-botao grid size-10 place-items-center" aria-label="Próximo mês"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 pb-2">
            {SEMANA.map((s) => <div key={s} className="text-center text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/45">{s}</div>)}
          </div>

          <div key={`g${mes.a}-${mes.m}`} className={cn("grid grid-cols-7 gap-1.5 [perspective:900px]", direcao > 0 ? "cal-grade-dir" : "cal-grade-esq")}>
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
                  style={{ animationDelay: `${i * 12}ms` }}
                  className={cn(
                    "cal-dia group relative flex min-h-[50px] flex-col p-1.5 text-left sm:min-h-[88px] sm:p-2",
                    !c.doMes && "opacity-30",
                    tem && "cal-dia-evento",
                    destaque && "cal-dia-destaque",
                    sel && "cal-dia-sel",
                  )}
                >
                  <span className={cn("grid size-7 place-items-center text-[13px] font-semibold tabular-nums", ehHoje && "rounded-full bg-white text-marca-funda shadow-[0_0_0_4px_rgba(255,255,255,0.15)]")}>{c.n}</span>
                  {tem && (
                    <>
                      <span className="mt-auto flex gap-1 sm:hidden">{c.eventos.slice(0, 3).map((e) => <span key={e.id} className="size-1.5 rounded-full bg-white" />)}</span>
                      <span className="mt-1 hidden min-w-0 flex-col gap-0.5 sm:flex">
                        {c.eventos.slice(0, 2).map((e) => (
                          <span key={e.id} className="line-clamp-2 text-[10.5px] font-semibold leading-tight text-white/95">{e.data === c.dia || c.semana === 0 ? e.titulo : "↳ continua"}</span>
                        ))}
                        {c.eventos.length > 2 && <span className="text-[10px] text-white/60">+{c.eventos.length - 2}</span>}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-4 min-h-5 text-center text-[13px] text-white/55">
            {doMes.length ? `${doMes.length} ${doMes.length === 1 ? "evento" : "eventos"} em ${MESES[mes.m].toLowerCase()}` : `Nenhum evento em ${MESES[mes.m].toLowerCase()}`}
          </p>
        </div>

        {/* ── o evento ── */}
        <div className="flex flex-col gap-4 [perspective:1100px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/55 first-letter:uppercase">{diaPorExtenso(selecionado)}</p>
          {ev ? (
            <article key={ev.id + selecionado} {...inclinar.eventos} style={inclinar.estilo} className={cn("cal-cartao relative flex-1 overflow-hidden bg-white text-tinta transition-transform duration-200 ease-out will-change-transform", inclinar.ativo && "duration-75")}>
              <span aria-hidden className="cal-reflexo" />
              {ev.imagem ? (
                <img src={ev.imagem} alt="" className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="relative flex items-end justify-between overflow-hidden bg-marca px-6 pb-5 pt-8 text-white">
                  <span aria-hidden className="absolute inset-0 bg-[url('/marca/grafismo-monte-transparente-branco.svg')] bg-[length:900px_auto] bg-[position:right_-180px_bottom_-40px] bg-no-repeat opacity-[0.12]" />
                  <div className="relative">
                    <span className="block text-[4.2rem] font-bold leading-[0.85] tracking-[-0.04em] tabular-nums">{ev.data.slice(8, 10)}</span>
                    <span className="mt-1 block text-[12px] font-bold uppercase tracking-[0.24em] text-white/75">{MESES[Number(ev.data.slice(5, 7)) - 1]}</span>
                  </div>
                  <span className="relative bg-white/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] backdrop-blur">{quando(ev, hoje)}</span>
                </div>
              )}
              <div className="relative p-6">
                {ev.destaque && <p className="rotulo-secao mb-3 !text-[11px]">Destaque</p>}
                <h4 className="text-[1.3rem] font-bold leading-snug text-marca">{ev.titulo}</h4>
                <ul className="mt-4 grid gap-2 text-[14px] text-tinta">
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
            <div className="cal-vidro flex flex-1 flex-col p-6">
              <p className="text-[15px] text-white/80">Nenhum evento neste dia.</p>
              {seguintes.length > 0 && (
                <>
                  <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-white/55">A seguir</p>
                  <ul className="mt-3 grid gap-2">
                    {seguintes.slice(0, 4).map((e) => (
                      <li key={e.id}>
                        <button type="button" onClick={() => irPara(e.data < hoje ? hoje : e.data)} className="cal-botao group flex w-full items-center gap-4 p-3 text-left">
                          <span className="w-11 shrink-0 text-center"><span className="block text-[1.35rem] font-bold leading-none tabular-nums">{e.data.slice(8, 10)}</span><span className="block text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/60">{MESES[Number(e.data.slice(5, 7)) - 1]!.slice(0, 3)}</span></span>
                          <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug">{e.titulo}</span>
                          <ChevronRight size={16} className="text-white/50 transition-transform group-hover:translate-x-1" />
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

      {/* faixa dos próximos */}
      {seguintes.length > 0 && (
        <div className="border-t border-white/10 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
            <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.24em] text-white/50">Próximos</span>
            {seguintes.map((e) => (
              <button key={e.id} type="button" onClick={() => irPara(e.data < hoje ? hoje : e.data)} className={cn("cal-botao flex shrink-0 items-center gap-2.5 px-3 py-2 text-[13px]", ocorreEm(e, selecionado) && "!bg-white !text-marca-funda")}>
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
