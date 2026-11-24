/**
 * Leitor de hino (site e app web): estrofes numeradas, coro destacado,
 * letra ajustável e "modo culto" — tela cheia, uma estrofe por vez,
 * com o coro voltando depois de cada estrofe, para acompanhar o canto.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Share2, X } from "lucide-react";
import { sequenciaCulto, type HinoCompleto, type ParteHino } from "@/lib/hinario";
import { cn } from "@/lib/utils";
import "./hinario.css";

function Parte({ p, tam }: { p: ParteHino; tam: number }) {
  if (p.tipo === "coro")
    return (
      <div className="hn-coro">
        <p className="hn-coro-rotulo">Coro</p>
        {p.linhas.map((l, i) => <p key={i} style={{ fontSize: `${tam}px` }}>{l}</p>)}
      </div>
    );
  return (
    <div className="hn-estrofe">
      <span className="hn-num">{p.n}</span>
      <div>{p.linhas.map((l, i) => <p key={i} style={{ fontSize: `${tam}px` }}>{l}</p>)}</div>
    </div>
  );
}

export function LeitorHino({ hino, anterior, proximo, irPara, escuro }: { hino: HinoCompleto; anterior?: number; proximo?: number; irPara: (n: number) => void; escuro?: boolean }) {
  const [tam, setTam] = useState(() => {
    try { return Number(localStorage.getItem("hn-letra")) || 19; } catch { return 19; }
  });
  const [culto, setCulto] = useState(false);
  const toque = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { try { localStorage.setItem("hn-letra", String(tam)); } catch { /* sem armazenamento */ } }, [tam]);

  const compartilhar = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const texto = `${hino.numero}. ${hino.titulo}`;
    try { if (navigator.share) await navigator.share({ title: texto, url }); else { await navigator.clipboard.writeText(`${texto}\n${url}`); } } catch { /* cancelado */ }
  };

  return (
    <article
      className={cn("hn", escuro && "hn-escuro")}
      onTouchStart={(e) => { toque.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }; }}
      onTouchEnd={(e) => {
        const t = toque.current; toque.current = null;
        if (!t || culto) return;
        const dx = e.changedTouches[0]!.clientX - t.x, dy = e.changedTouches[0]!.clientY - t.y;
        if (Math.abs(dx) > 90 && Math.abs(dy) < 50) { const n = dx < 0 ? proximo : anterior; if (n) irPara(n); }
      }}
    >
      <header className="hn-cabeca">
        <p className="hn-sh">Salmos e Hinos</p>
        <div className="hn-titulo">
          <span className="hn-numero">{hino.numero}</span>
          <div>
            <h1>{hino.titulo}</h1>
            {hino.autor && <p className="hn-autor">{hino.autor}</p>}
          </div>
        </div>
        <div className="hn-ferramentas">
          <button type="button" onClick={() => setTam((t) => Math.max(15, t - 2))} aria-label="Diminuir letra"><Minus size={16} /></button>
          <span className="hn-tam">A</span>
          <button type="button" onClick={() => setTam((t) => Math.min(30, t + 2))} aria-label="Aumentar letra"><Plus size={16} /></button>
          <span className="hn-sep" />
          <button type="button" onClick={compartilhar} aria-label="Compartilhar"><Share2 size={16} /></button>
          <button type="button" onClick={() => setCulto(true)} className="hn-culto-botao"><Maximize2 size={15} /> Modo culto</button>
        </div>
      </header>

      <div className="hn-corpo">{hino.partes.map((p, i) => <Parte key={i} p={p} tam={tam} />)}</div>

      <nav className="hn-navega">
        {anterior ? <button type="button" onClick={() => irPara(anterior)}><ChevronLeft size={17} /> Hino {anterior}</button> : <span />}
        {proximo ? <button type="button" onClick={() => irPara(proximo)}>Hino {proximo} <ChevronRight size={17} /></button> : <span />}
      </nav>

      {culto && <ModoCulto hino={hino} fechar={() => setCulto(false)} />}
    </article>
  );
}

function ModoCulto({ hino, fechar }: { hino: HinoCompleto; fechar: () => void }) {
  const seq = sequenciaCulto(hino);
  const [i, setI] = useState(0);
  const ir = useCallback((d: number) => setI((x) => Math.min(seq.length - 1, Math.max(0, x + d))), [seq.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(e.key)) { e.preventDefault(); ir(1); }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); ir(-1); }
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", k);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { window.removeEventListener("keydown", k); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
  }, [ir, fechar]);
  const p = seq[i]!;
  return (
    <div className="hn-telao" role="dialog" aria-label={`Modo culto: hino ${hino.numero}`}>
      <div className="hn-telao-topo">
        <span><strong>{hino.numero}</strong> {hino.titulo}</span>
        <button type="button" onClick={fechar} aria-label="Fechar"><X size={22} /></button>
      </div>
      <button type="button" className="hn-telao-palco" onClick={() => ir(1)}>
        <p className="hn-telao-rotulo">{p.tipo === "coro" ? "Coro" : `Estrofe ${p.n}`}</p>
        <div key={i} className={cn("hn-telao-texto", p.tipo === "coro" && "hn-telao-coro")}>
          {p.linhas.map((l, k) => <p key={k}>{l}</p>)}
        </div>
      </button>
      <div className="hn-telao-base">
        <button type="button" onClick={() => ir(-1)} disabled={i === 0} aria-label="Anterior"><ChevronLeft size={26} /></button>
        <div className="hn-telao-pontos">{seq.map((s, k) => <span key={k} className={cn(k === i && "ativo", s.tipo === "coro" && "coro")} />)}</div>
        <button type="button" onClick={() => ir(1)} disabled={i === seq.length - 1} aria-label="Próxima"><ChevronRight size={26} /></button>
      </div>
    </div>
  );
}
