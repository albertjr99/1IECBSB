/**
 * O boletim para ler no celular: o mesmo conteúdo das folhas A4, em texto
 * corrido com letra confortável (as folhas reduzidas ficam pequenas demais
 * numa tela de telefone).
 */
import type { ReactNode } from "react";
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

function BlocoLeitura({ b }: { b: Bloco }) {
  switch (b.tipo) {
    case "artigo":
      return (
        <Parte rotulo={b.rotulo} titulo={limpo(b.titulo)}>
          <div className="bl-texto">{paragrafos(b.texto).map((p, i) => <p key={i}><Marcado texto={p} /></p>)}</div>
          {b.autor && <p className="bl-autor">{b.autor}</p>}
        </Parte>
      );
    case "avisos": {
      const normais = b.itens.filter((a) => a.estilo !== "caixa");
      const caixas = b.itens.filter((a) => a.estilo === "caixa");
      return (
        <>
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
          {caixas.map((a) => (
            <Parte key={a.id} rotulo={limpo(a.titulo)}>
              <div className="bl-texto">{paragrafos(a.texto).map((p, i) => <p key={i}><Marcado texto={p} /></p>)}</div>
            </Parte>
          ))}
        </>
      );
    }
    case "escala":
      return (
        <>
          <Parte rotulo={limpo(b.titulo) || "Escala"}>
            <Tabela cabecalho={b.cabecalho} linhas={b.linhas.map((l) => l.celulas)} />
          </Parte>
          {b.porteiros.length > 0 && (
            <Parte rotulo={b.porteirosTitulo || "Porteiros de oração"}>
              <ul className="bl-lista">{b.porteiros.map((p) => <li key={p.id}><span>{p.horario.replace(/^Das\s+/i, "")}</span><strong>{p.nome}</strong></li>)}</ul>
            </Parte>
          )}
        </>
      );
    case "tabela":
      return <Parte rotulo={limpo(b.titulo)}><Tabela cabecalho={b.cabecalho} linhas={b.linhas.map((l) => l.celulas)} /></Parte>;
    case "agenda":
      return (
        <Parte rotulo={limpo(b.titulo) || "Agenda"}>
          {b.grupos.map((g) => (
            <div key={g.id} className="bl-grupo">
              <p className="bl-mes">{g.titulo}</p>
              <ul className="bl-lista">{g.itens.map((it) => <li key={it.id}><span>{it.data.replace(/[()]/g, "").replace("sab", "sáb")}{it.hora && it.hora !== "-" ? ` · ${it.hora}` : ""}</span><strong><Marcado texto={it.texto} /></strong></li>)}</ul>
            </div>
          ))}
        </Parte>
      );
    case "aniversariantes":
      return (
        <Parte rotulo={limpo(b.titulo) || "Aniversariantes"}>
          <ul className="bl-lista">{b.linhas.flatMap((l) => l.nomes.split("\n").map((n, i) => <li key={`${l.id}-${i}`}><span>{l.dia}</span><strong>{n}</strong></li>))}</ul>
          {b.versiculo && <p className="bl-versiculo">“{b.versiculo}” <span>{b.referencia}</span></p>}
        </Parte>
      );
    case "oficios":
      return (
        <Parte rotulo={limpo(b.titulo) || "Ofícios regulares"}>
          <div className="bl-oficios">{b.colunas.map((c) => <p key={c.id}>{c.texto.split("\n").map((l, i) => <span key={i}><Marcado texto={l} /></span>)}</p>)}</div>
        </Parte>
      );
    case "texto":
      return <Parte titulo={limpo(b.titulo)}><div className="bl-texto">{paragrafos(b.texto).map((p, i) => <p key={i}><Marcado texto={p} /></p>)}</div></Parte>;
    default:
      return null; // campos missionários, parcerias e expediente ficam nas folhas
  }
}

export function LeituraCelular({ boletim, className }: { boletim: Boletim; className?: string }) {
  const blocos = boletim.paginas.flatMap((p) => p.blocos);
  return (
    <div className={`bl ${className ?? ""}`}>
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
      {blocos.map((b) => <BlocoLeitura key={b.id} b={b} />)}
    </div>
  );
}
