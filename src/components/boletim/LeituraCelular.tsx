/**
 * O boletim para ler no celular: o mesmo conteúdo das folhas A4, em texto
 * corrido com letra confortável (as folhas reduzidas ficam pequenas demais
 * numa tela de telefone).
 */
import { useRef, useState, type ReactNode } from "react";
import { dataPorExtenso, type Bloco, type Boletim } from "@/lib/boletim";
import { Marcado } from "./Folhas";
import "./leitura-celular.css";

const paragrafos = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const limpo = (t: string) => t.replace(/\*+/g, "").trim();

function Parte({ rotulo, titulo, children }: { rotulo?: string; titulo?: string; children: ReactNode }) {
  return (
    <section className="bl-parte">
      {rotulo && <p className="bl-rotulo">{rotulo}</p>}
      {titulo && <h2 className="bl-titulo">{titulo}</h2>}
      {children}
    </section>
  );
}

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: string[][] }) {
  return (
    <div className="bl-tabela">
      {linhas.map((l, i) => (
        <div key={i} className="bl-linha">
          <p className="bl-linha-tit"><Marcado texto={l[0] ?? ""} /></p>
          <dl>
            {l.slice(1).map((c, j) => (c.trim() && c.trim() !== "-" ? <div key={j}><dt>{limpo(cabecalho[j + 1] ?? "")}</dt><dd><Marcado texto={c} /></dd></div> : null))}
          </dl>
        </div>
      ))}
    </div>
  );
}

type ParteLeitura = { id: string; rotulo: string; el: ReactNode };

/** Cada bloco do boletim vira uma ou mais partes navegáveis. */
function partesDoBloco(b: Bloco): ParteLeitura[] {
  const corpo = (t: string) => <div className="bl-texto">{paragrafos(t).map((p, i) => <p key={i}><Marcado texto={p} /></p>)}</div>;
  switch (b.tipo) {
    case "artigo": {
      const rotulo = limpo(b.rotulo || "") || "Pastoral";
      const curto = /^segunda/i.test(rotulo) ? "Segunda pastoral" : rotulo.split(/\s+/).slice(0, 3).join(" ");
      return [{ id: b.id, rotulo: curto, el: (
        <Parte rotulo={b.rotulo} titulo={limpo(b.titulo)}>{corpo(b.texto)}{b.autor && <p className="bl-autor">{b.autor}</p>}</Parte>
      ) }];
    }
    case "avisos": {
      const normais = b.itens.filter((a) => a.estilo !== "caixa");
      const caixas = b.itens.filter((a) => a.estilo === "caixa");
      return [
        ...(normais.length ? [{ id: b.id, rotulo: "Avisos", el: (
          <Parte rotulo="Avisos">
            <div className="bl-avisos">
              {normais.map((a) => (
                <article key={a.id} className={a.estilo === "destaque" ? "bl-aviso bl-aviso-destaque" : "bl-aviso"}>
                  <h3>{limpo(a.titulo)}</h3>
                  {paragrafos(a.texto).map((p, i) => <p key={i}><Marcado texto={p} /></p>)}
                </article>
              ))}
            </div>
          </Parte>
        ) }] : []),
        ...caixas.map((a) => ({ id: a.id, rotulo: limpo(a.titulo).split(/\s+/).slice(0, 3).join(" "), el: <Parte rotulo={limpo(a.titulo)}>{corpo(a.texto)}</Parte> })),
      ];
    }
    case "escala":
      return [
        { id: b.id, rotulo: "Escala", el: <Parte rotulo={limpo(b.titulo) || "Escala"}><Tabela cabecalho={b.cabecalho} linhas={b.linhas.map((l) => l.celulas)} /></Parte> },
        ...(b.porteiros.length ? [{ id: `${b.id}-p`, rotulo: "Porteiros", el: (
          <Parte rotulo={b.porteirosTitulo || "Porteiros de oração"}>
            <ul className="bl-lista">{b.porteiros.map((p) => <li key={p.id}><span>{p.horario.replace(/^Das\s+/i, "")}</span><strong>{p.nome}</strong></li>)}</ul>
          </Parte>
        ) }] : []),
      ];
    case "tabela":
      return [{ id: b.id, rotulo: limpo(b.titulo).split(/\s+/).slice(0, 2).join(" ") || "Tabela", el: <Parte rotulo={limpo(b.titulo)}><Tabela cabecalho={b.cabecalho} linhas={b.linhas.map((l) => l.celulas)} /></Parte> }];
    case "agenda":
      return [{ id: b.id, rotulo: "Agenda", el: (
        <Parte rotulo={limpo(b.titulo) || "Agenda"}>
          {b.grupos.map((g) => (
            <div key={g.id} className="bl-grupo">
              <p className="bl-mes">{g.titulo}</p>
              <ul className="bl-lista">{g.itens.map((it) => <li key={it.id}><span>{it.data.replace(/[()]/g, "").replace("sab", "sáb")}{it.hora && it.hora !== "-" ? ` · ${it.hora}` : ""}</span><strong><Marcado texto={it.texto} /></strong></li>)}</ul>
            </div>
          ))}
        </Parte>
      ) }];
    case "aniversariantes":
      return [{ id: b.id, rotulo: "Aniversariantes", el: (
        <Parte rotulo={limpo(b.titulo) || "Aniversariantes"}>
          <ul className="bl-lista">{b.linhas.flatMap((l) => l.nomes.split("\n").map((n, i) => <li key={`${l.id}-${i}`}><span>{l.dia}</span><strong>{n}</strong></li>))}</ul>
          {b.versiculo && <p className="bl-versiculo">“{b.versiculo}” <span>{b.referencia}</span></p>}
        </Parte>
      ) }];
    case "oficios":
      return [{ id: b.id, rotulo: "Ofícios", el: (
        <Parte rotulo={limpo(b.titulo) || "Ofícios regulares"}>
          <div className="bl-oficios">{b.colunas.map((c) => <p key={c.id}>{c.texto.split("\n").map((l, i) => <span key={i}><Marcado texto={l} /></span>)}</p>)}</div>
        </Parte>
      ) }];
    case "texto":
      return [{ id: b.id, rotulo: limpo(b.titulo).split(/\s+/).slice(0, 2).join(" ") || "Texto", el: <Parte titulo={limpo(b.titulo)}>{corpo(b.texto)}</Parte> }];
    default:
      return []; // campos missionários, parcerias e expediente ficam nas folhas
  }
}

/** Boletim em partes: abas no topo, uma parte por vez, "anterior / próxima" no pé. */
export function LeituraCelular({ boletim, className }: { boletim: Boletim; className?: string }) {
  const partes = boletim.paginas.flatMap((p) => p.blocos).flatMap(partesDoBloco);
  const [atual, setAtual] = useState(0);
  const abas = useRef<HTMLDivElement>(null);
  const topo = useRef<HTMLDivElement>(null);
  const toque = useRef<number | null>(null);
  const total = partes.length + 1;
  const ir = (i: number) => {
    const n = Math.max(0, Math.min(total - 1, i));
    setAtual(n);
    abas.current?.querySelector<HTMLElement>(`[data-i="${n}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    // volta ao começo da parte (funciona na página e dentro do leitor em tela cheia)
    const r = topo.current?.getBoundingClientRect();
    if (r && r.top < 0) topo.current!.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const rotulos = ["Início", ...partes.map((p) => p.rotulo)];
  return (
    <div ref={topo} className={`bl ${className ?? ""}`} onTouchStart={(e) => { toque.current = e.touches[0]!.clientX; }} onTouchEnd={(e) => {
      if (toque.current === null) return;
      const dx = e.changedTouches[0]!.clientX - toque.current; toque.current = null;
      if (Math.abs(dx) > 90) ir(atual + (dx < 0 ? 1 : -1));
    }}>
      <div ref={abas} className="bl-abas" role="tablist" aria-label="Partes do boletim">
        {rotulos.map((r, i) => <button key={i} data-i={i} role="tab" aria-selected={i === atual} onClick={() => ir(i)} className={i === atual ? "ativa" : ""}>{r}</button>)}
      </div>
      <div className="bl-progresso"><span style={{ width: `${((atual + 1) / total) * 100}%` }} /></div>

      <div key={atual} className="bl-pagina">
        {atual === 0 ? (
          <>
            <header className="bl-capa">
              <img src="/marca/logo-horizontal-colorida.svg" alt="1ª IEC Brasília" className="bl-logo" />
              <p className="bl-rotulo">{boletim.titulo}</p>
              <p className="bl-data">{dataPorExtenso(boletim.data)}</p>
            </header>
            {boletim.versiculo && (
              <figure className="bl-verso">
                <figcaption>Martelando a Palavra</figcaption>
                <blockquote>“{boletim.versiculo}”</blockquote>
                {boletim.versiculoRef && <cite>{boletim.versiculoRef}</cite>}
              </figure>
            )}
            <nav className="bl-sumario" aria-label="Neste boletim">
              <p className="bl-rotulo">Neste boletim</p>
              <ol>{partes.map((p, i) => <li key={p.id}><button onClick={() => ir(i + 1)}><span>{String(i + 1).padStart(2, "0")}</span>{p.rotulo}</button></li>)}</ol>
            </nav>
          </>
        ) : partes[atual - 1]!.el}
      </div>

      <nav className="bl-passos">
        {atual > 0 ? <button onClick={() => ir(atual - 1)}><small>Anterior</small>{rotulos[atual - 1]}</button> : <span />}
        {atual < total - 1 ? <button className="bl-proxima" onClick={() => ir(atual + 1)}><small>Próxima</small>{rotulos[atual + 1]}</button> : <span />}
      </nav>
    </div>
  );
}
