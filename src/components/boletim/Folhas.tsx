/**
 * Desenho das páginas do boletim — o mesmo para a prévia do painel, a página
 * no site e o PDF.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./boletim.css";
import type { Bloco, Boletim, Pagina } from "@/lib/boletim";
import { dataPorExtenso } from "@/lib/boletim";
import { ARCO_D } from "./arco";

// ─── Marcação: **negrito**, *itálico*, ***ambos*** ─────────────────────────

export function Marcado({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return (
    <>
      {partes.map((p, i) => {
        if (p.startsWith("***") && p.endsWith("***") && p.length > 6) return <strong key={i}><em>{p.slice(3, -3)}</em></strong>;
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

/** Texto com quebras de linha preservadas. */
function Linhas({ texto }: { texto: string }) {
  const l = texto.split("\n");
  return <>{l.map((x, i) => <Fragment key={i}>{i > 0 && <br />}<Marcado texto={x} /></Fragment>)}</>;
}

const paragrafos = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

// ─── Fluxo em duas colunas de larguras diferentes ──────────────────────────

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Mesma marcação do <Marcado>, em HTML (para medir e para o fluxo). */
export function marcadoHtml(texto: string) {
  return escapar(texto)
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

/** Uma peça do texto: títulos não se dividem; parágrafos se dividem por palavra. */
type Peca = { tag: "p" | "h2" | "h3" | "div"; classe?: string; texto: string; divisivel: boolean; titulo?: boolean };

const PIXELS_POR_PT = 96 / 72;

type Palavra = { t: string; n: boolean; i: boolean; br?: boolean };

/** Quebra o texto marcado em palavras, cada uma com seu estilo. */
function palavrasDe(texto: string): Palavra[] {
  const out: Palavra[] = [];
  const partes = texto.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  for (const parte of partes) {
    if (!parte) continue;
    let n = false, i = false, t = parte;
    if (/^\*\*\*[^*]+\*\*\*$/.test(parte)) { n = i = true; t = parte.slice(3, -3); }
    else if (/^\*\*[^*]+\*\*$/.test(parte)) { n = true; t = parte.slice(2, -2); }
    else if (/^\*[^*\n]+\*$/.test(parte)) { i = true; t = parte.slice(1, -1); }
    const linhas = t.split("\n");
    linhas.forEach((linha, k) => {
      if (k > 0) out.push({ t: "", n, i, br: true });
      for (const w of linha.split(/\s+/).filter(Boolean)) out.push({ t: w, n, i });
    });
  }
  return out;
}

function htmlPalavras(ps: Palavra[]) {
  let html = "";
  ps.forEach((p, k) => {
    if (p.br) { html += "<br>"; return; }
    let w = escapar(p.t);
    if (p.i) w = `<em>${w}</em>`;
    if (p.n) w = `<strong>${w}</strong>`;
    const prox = ps[k + 1];
    html += w + (prox && !prox.br ? " " : "");
  });
  return html;
}

function htmlPeca(p: Peca, palavras?: [number, number]) {
  let classe = p.classe ?? "";
  if (!palavras) return `<${p.tag}${classe.trim() ? ` class="${classe.trim()}"` : ""}>${marcadoHtml(p.texto)}</${p.tag}>`;
  const todas = palavrasDe(p.texto);
  if (palavras[0] > 0) classe += " bol-cont";
  if (palavras[1] < todas.length) classe += " bol-corte";
  return `<${p.tag}${classe.trim() ? ` class="${classe.trim()}"` : ""}>${htmlPalavras(todas.slice(palavras[0], palavras[1]))}</${p.tag}>`;
}

type Corte = { peca: number; palavra: number };

/**
 * Coloca as peças na coluna da esquerda até encher a altura disponível e
 * continua na da direita — o comportamento das colunas do Word, inclusive
 * com larguras diferentes.
 */
function FluxoColunas({ pecas, proporcao, gapPt, classe, estilo }: { pecas: Peca[]; proporcao: number; gapPt: number; classe: string; estilo?: React.CSSProperties }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [corte, setCorte] = useState<Corte | null>(null);
  const chave = JSON.stringify(pecas) + proporcao + JSON.stringify(estilo ?? {});

  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    let cancelado = false;
    const calcular = () => {
      if (cancelado || !el.isConnected) return;
      const corpo = el.closest(".bol-corpo") as HTMLElement | null;
      if (!corpo) return;
      // altura disponível: do topo do bloco até o fim da página (sem escala)
      let topo = 0;
      for (let n: HTMLElement | null = el; n && n !== corpo; n = n.offsetParent as HTMLElement | null) topo += n.offsetTop;
      const altura = corpo.clientHeight - topo - 2;
      const larguraTotal = el.clientWidth;
      const larguraEsq = (larguraTotal - gapPt * PIXELS_POR_PT) * proporcao;

      const medidor = document.createElement("div");
      medidor.className = `${classe} bol-col`;
      Object.assign(medidor.style, { position: "absolute", visibility: "hidden", left: "0", top: "0", width: `${larguraEsq}px` });
      if (estilo?.fontSize) medidor.style.fontSize = String(estilo.fontSize);
      el.appendChild(medidor);
      const cabe = () => medidor.scrollHeight <= altura;
      let resultado: Corte | null = null;
      let html = "";
      for (let i = 0; i < pecas.length && !resultado; i++) {
        const p = pecas[i]!;
        medidor.innerHTML = html + htmlPeca(p);
        if (cabe()) { html += htmlPeca(p); continue; }
        if (!p.divisivel) { resultado = { peca: i, palavra: 0 }; break; }
        const total = palavrasDe(p.texto).length;
        let lo = 0, hi = total;
        while (lo < hi) {
          const meio = Math.ceil((lo + hi) / 2);
          medidor.innerHTML = html + htmlPeca(p, [0, meio]);
          if (cabe()) lo = meio; else hi = meio - 1;
        }
        resultado = { peca: i, palavra: lo };
      }
      medidor.remove();
      // título não fica sozinho no pé da coluna
      if (resultado && resultado.palavra === 0) {
        let k = resultado.peca;
        while (k > 0 && pecas[k - 1]!.titulo) k--;
        resultado = { peca: k, palavra: 0 };
      }
      setCorte((ant) => (JSON.stringify(ant) === JSON.stringify(resultado) ? ant : resultado));
    };
    calcular();
    // Só a medida feita com as fontes do boletim vale: espera carregá-las e
    // refaz sempre que alguma fonte terminar de carregar.
    const fontes = document.fonts;
    if (fontes) {
      Promise.all(["400 16px BolCalibri", "700 16px BolCalibri", "italic 400 16px BolCalibri", "italic 700 16px BolCalibri"].map((f) => fontes.load(f)))
        .then(() => fontes.ready)
        .then(calcular)
        .catch(() => {});
      fontes.addEventListener("loadingdone", calcular);
    }
    return () => { cancelado = true; fontes?.removeEventListener("loadingdone", calcular); };
  }, [chave]);

  const esquerda: string[] = [];
  const direita: string[] = [];
  pecas.forEach((p, i) => {
    const total = p.divisivel ? palavrasDe(p.texto).length : 0;
    if (!corte || i < corte.peca) esquerda.push(htmlPeca(p));
    else if (i === corte.peca && corte.palavra > 0) {
      esquerda.push(htmlPeca(p, [0, corte.palavra]));
      if (corte.palavra < total) direita.push(htmlPeca(p, [corte.palavra, total]));
    } else direita.push(htmlPeca(p));
  });

  return (
    <div ref={caixa} className={`${classe} bol-fluxo`} style={{ ...estilo, position: "relative" }}>
      <div className="bol-col" style={{ flex: "none", width: `calc((100% - ${gapPt}pt) * ${proporcao})` }} dangerouslySetInnerHTML={{ __html: esquerda.join("") }} />
      <div className="bol-col" style={{ flex: "none", width: `calc((100% - ${gapPt}pt) * ${1 - proporcao})`, marginLeft: `${gapPt}pt` }} dangerouslySetInnerHTML={{ __html: direita.join("") }} />
    </div>
  );
}

// ─── Cabeçalho da capa (vetorial, no lugar da imagem do Word) ──────────────

function Banner() {
  return (
    <svg className="bol-banner" viewBox="0 0 539 113" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="bolFundo" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#2e2e2e" />
          <stop offset="0.07" stopColor="#d9d9d9" />
          <stop offset="0.18" stopColor="#ffffff" />
          <stop offset="0.34" stopColor="#b9b9b9" />
          <stop offset="0.5" stopColor="#8f8f8f" />
          <stop offset="0.66" stopColor="#b5b5b5" />
          <stop offset="0.83" stopColor="#ffffff" />
          <stop offset="0.93" stopColor="#dadada" />
          <stop offset="1" stopColor="#353535" />
        </linearGradient>
        <radialGradient id="bolBrilho" cx="0.5" cy="0.15" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bolArco" x1="0" x2="1">
          <stop offset="0" stopColor="#1b3463" />
          <stop offset="0.5" stopColor="#0f2448" />
          <stop offset="1" stopColor="#1b3463" />
        </linearGradient>
        <filter id="bolDesfoque" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" /></filter>
        <filter id="bolCruz" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <filter id="bolHalo" x="-5%" y="-30%" width="110%" height="160%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.4" result="g" />
          <feGaussianBlur in="g" stdDeviation="1.6" result="b" />
          <feFlood floodColor="#ffffff" />
          <feComposite in2="b" operator="in" result="h" />
          <feMerge><feMergeNode in="h" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id="bolCorte"><rect x="0" y="0" width="539" height="113" /></clipPath>
      </defs>
      <g clipPath="url(#bolCorte)">
        <rect width="539" height="113" fill="url(#bolFundo)" />
        <rect width="539" height="113" fill="url(#bolBrilho)" />
        {/* volutas claras e cantos escuros, como no original */}
        <path d="M0 0 H70 C40 18 30 46 0 70 Z" fill="#262626" opacity="0.85" filter="url(#bolDesfoque)" />
        <path d="M539 22 C512 40 505 70 539 100 Z" fill="#2a2a2a" opacity="0.9" filter="url(#bolDesfoque)" />
        <path d="M60 4 C100 30 70 70 30 95 C80 70 120 36 60 4 Z" fill="#fff" opacity="0.7" filter="url(#bolDesfoque)" />
        <path d="M470 8 C440 40 480 70 520 92 C470 62 462 34 470 8 Z" fill="#fff" opacity="0.75" filter="url(#bolDesfoque)" />
        {/* cruz vermelha com brilho */}
        <g transform="translate(404 6)">
          <g filter="url(#bolCruz)" opacity="0.75">
            <rect x="23" y="0" width="13" height="66" fill="#ff2b1c" />
            <rect x="0" y="13" width="62" height="11" fill="#ff2b1c" />
          </g>
          <rect x="25.5" y="2" width="8" height="62" fill="#e8261b" />
          <rect x="3" y="15" width="56" height="7" fill="#e8261b" />
        </g>
        {/* arco da marca */}
        <g transform="translate(20 7) scale(0.7108 0.3245) translate(-165.83 -286)">
          <path d={ARCO_D} fill="url(#bolArco)" />
        </g>
        <g filter="url(#bolHalo)" fill="#262626" textAnchor="middle">
          <text x="272" y="64" fontFamily="BolCambria, Cambria, Caladea, serif" fontWeight="700" fontSize="22.1">Primeira Igreja Evangélica</text>
          <text x="272" y="90" fontFamily="BolCambria, Cambria, Caladea, serif" fontWeight="700" fontSize="22.1">Congregacional de Brasília</text>
          <text x="272" y="104" fontFamily="BolCalibri, Calibri, Carlito, sans-serif" fontWeight="700" fontSize="9.1" fill="#000">Filiada à União das Igrejas Evangélicas Congregacionais do Brasil – UIECB</text>
        </g>
      </g>
    </svg>
  );
}

// ─── Blocos ─────────────────────────────────────────────────────────────────

function BlocoView({ b }: { b: Bloco }) {
  const escala = (b.ajuste || 100) / 100;
  const estilo = escala !== 1 ? { fontSize: `${16 * escala}pt` } : undefined;
  switch (b.tipo) {
    case "artigo": {
      if (b.colunas === 2) {
        const pecas: Peca[] = [
          ...(b.rotulo ? [{ tag: "div" as const, classe: `bol-rotulo ${b.rotuloLado === "direita" ? "bol-dir" : ""}`, texto: b.rotulo, divisivel: false, titulo: true }] : []),
          ...(b.titulo ? [{ tag: "h2" as const, texto: b.titulo, divisivel: false, titulo: true }] : []),
          ...paragrafos(b.texto).map((t) => ({ tag: "p" as const, texto: t, divisivel: true })),
          ...(b.autor ? [{ tag: "p" as const, classe: "bol-assinatura", texto: b.autor, divisivel: false }] : []),
        ];
        return <FluxoColunas pecas={pecas} proporcao={b.proporcao ?? 0.5} gapPt={11} classe="bol-artigo bol-2col" {...(estilo ? { estilo } : {})} />;
      }
      return (
        <div className="bol-artigo" style={estilo}>
          <div className="bol-texto">
            {b.rotulo && <div className={`bol-rotulo ${b.rotuloLado === "direita" ? "bol-dir" : ""}`}>{b.rotulo}</div>}
            {b.titulo && <h2>{b.titulo}</h2>}
            {paragrafos(b.texto).map((p, i) => <p key={i}><Linhas texto={p} /></p>)}
            {b.autor && <p className="bol-assinatura">{b.autor}</p>}
          </div>
        </div>
      );
    }
    case "avisos": {
      if ((b.colunas ?? 1) === 2) {
        const pecas: Peca[] = b.itens.flatMap((a) => [
          ...(a.titulo ? [{ tag: "h3" as const, texto: a.titulo, divisivel: false, titulo: true }] : []),
          ...paragrafos(a.texto).map((t) => ({ tag: "p" as const, texto: t, divisivel: true })),
        ]);
        return <FluxoColunas pecas={pecas} proporcao={b.proporcao ?? 0.5} gapPt={12} classe="bol-avisos" {...(estilo ? { estilo } : {})} />;
      }
      return (
        <div className="bol-avisos" style={estilo}>
          {b.itens.map((a) => (
            <Fragment key={a.id}>
              {a.titulo && <h3>{a.titulo}</h3>}
              {paragrafos(a.texto).map((p, i) => <p key={i}><Linhas texto={p} /></p>)}
            </Fragment>
          ))}
        </div>
      );
    }
    case "escala": {
      const porteiros = b.porteiros;
      const metade = Math.ceil(porteiros.length / 2);
      const fonte = escala !== 1 ? { fontSize: `${10 * escala}pt` } : undefined;
      // Três tabelas encostadas, como no Word: cada parte tem suas colunas.
      return (
        <div className="bol-escala" style={fonte}>
          <table className="bol-tab" style={fonte}>
            <colgroup><col style={{ width: "36%" }} /><col style={{ width: "32%" }} /><col style={{ width: "32%" }} /></colgroup>
            <tbody>
              <tr><td colSpan={3} className="bol-tit-escuro">{b.titulo}</td></tr>
              <tr>{b.cabecalho.map((c, i) => <td key={i} className="bol-sub-medio">{c}</td>)}</tr>
              {b.linhas.map((l) => (
                <tr key={l.id}>
                  <td className="bol-rot">{l.celulas[0]}</td>
                  <td className="bol-c">{l.celulas[1]}</td>
                  <td className="bol-c">{l.celulas[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {porteiros.length > 0 && (
            <table className="bol-tab" style={{ ...fonte, marginTop: "-0.5pt" }}>
              <tbody>
                <tr><td colSpan={2} className="bol-sub-escuro">{b.porteirosTitulo}</td></tr>
                {Array.from({ length: metade }).map((_, i) => {
                  const x = porteiros[i];
                  const y = porteiros[i + metade];
                  return (
                    <tr key={i}>
                      <td style={{ width: "50%" }}>{x && <><strong>{x.horario}</strong>{x.horario && ": "}{x.nome}</>}</td>
                      <td>{y && <><strong>{y.horario}</strong>{y.horario && ": "}{y.nome}</>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {b.semanaColunas.length > 0 && (
            <table className="bol-tab" style={{ ...fonte, marginTop: "-0.5pt" }}>
              <colgroup><col style={{ width: "36%" }} />{b.semanaColunas.map((c) => <col key={c.id} />)}</colgroup>
              <tbody>
                <tr><td colSpan={1 + b.semanaColunas.length} className="bol-sub-escuro">{b.semanaTitulo}</td></tr>
                <tr><td className="bol-sub-medio" rowSpan={2} />{b.semanaColunas.map((c) => <td key={c.id} className="bol-sub-medio">{c.dia}</td>)}</tr>
                <tr>{b.semanaColunas.map((c) => <td key={c.id} className="bol-sub-medio">{c.atividade}</td>)}</tr>
                {b.semanaLinhas.map((l) => (
                  <tr key={l.id}>
                    <td className="bol-rot">{l.funcao}</td>
                    {b.semanaColunas.map((c, i) => <td key={c.id} className="bol-c">{l.valores[i] ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    }
    case "aniversariantes":
      return (
        <div style={escala !== 1 ? { fontSize: `${9 * escala}pt` } : undefined}>
          <table className="bol-tab bol-aniv">
            <tbody>
              <tr><td colSpan={2} className="bol-tit-escuro">{b.titulo}</td></tr>
              {b.linhas.map((l) => (
                <tr key={l.id}><td className="bol-dia">{l.dia}</td><td><Linhas texto={l.nomes} /></td></tr>
              ))}
            </tbody>
          </table>
          {b.versiculo && <p className="bol-versiculo">{b.versiculo}{b.referencia && <small>{b.referencia}</small>}</p>}
        </div>
      );
    case "oficios":
      return (
        <table className="bol-tab bol-oficios">
          <tbody>
            <tr><td colSpan={b.colunas.length} className="bol-tit-cinza">{b.titulo}</td></tr>
            <tr>{b.colunas.map((c) => <td key={c.id} style={{ width: `${100 / b.colunas.length}%` }}><Linhas texto={c.texto} /></td>)}</tr>
          </tbody>
        </table>
      );
    case "trabalhos": {
      const pares: (typeof b.itens)[] = [];
      for (let i = 0; i < b.itens.length; i += 2) pares.push(b.itens.slice(i, i + 2));
      return (
        <table className="bol-tab bol-trabalhos">
          <tbody>
            <tr><td colSpan={2} className="bol-tit-cinza">{b.titulo}</td></tr>
            {pares.map((par, i) => (
              <Fragment key={i}>
                <tr>{par.map((x) => <td key={x.id} className="bol-sub-claro" colSpan={par.length === 1 ? 2 : 1}>{x.titulo}</td>)}</tr>
                <tr>{par.map((x) => <td key={x.id} colSpan={par.length === 1 ? 2 : 1}><Linhas texto={x.texto} /></td>)}</tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      );
    }
    case "parcerias": {
      const pares: (typeof b.itens)[] = [];
      for (let i = 0; i < b.itens.length; i += 2) pares.push(b.itens.slice(i, i + 2));
      return (
        <table className="bol-tab bol-parcerias">
          <tbody>
            <tr><td colSpan={2} className="bol-tit-cinza">{b.titulo}</td></tr>
            {pares.map((par, i) => (
              <tr key={i}>
                {[0, 1].map((k) => {
                  const x = par[k];
                  return <td key={k}>{x && (x.nome || x.texto) ? <><strong>{x.nome}</strong>{x.nome && x.texto && " – "}<Marcado texto={x.texto} /></> : null}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "agenda":
      return (
        <table className="bol-tab bol-agenda">
          <tbody>
            <tr><td colSpan={3} className="bol-tit-agenda">{b.titulo}</td></tr>
            {b.grupos.map((g) => {
              // agrupa linhas seguidas com a mesma data (como as células mescladas do Word)
              const grupos: { data: string; itens: typeof g.itens }[] = [];
              for (const it of g.itens) {
                const ult = grupos[grupos.length - 1];
                if (ult && it.data && ult.data === it.data) ult.itens.push(it);
                else grupos.push({ data: it.data, itens: [it] });
              }
              return (
                <Fragment key={g.id}>
                  <tr><td colSpan={3} className="bol-mes">{g.titulo}</td></tr>
                  {grupos.map((gr, i) => (
                    <tr key={i}>
                      <td className="bol-data">{gr.data}</td>
                      <td className="bol-hora">{gr.itens.map((x, j) => <Fragment key={x.id}>{j > 0 && <br />}{x.hora}</Fragment>)}</td>
                      <td>{gr.itens.map((x, j) => <Fragment key={x.id}>{j > 0 && <br />}<Marcado texto={x.texto} /></Fragment>)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      );
    case "expediente":
      return (
        <div className="bol-expediente">
          <img src="/simbolo.svg" alt="" />
          <div className="bol-exp-nome"><Linhas texto={b.nome} /></div>
          <div><Linhas texto={b.texto} /></div>
          {b.pastores && <><div className="bol-exp-tit">{b.pastoresTitulo}</div><div><Linhas texto={b.pastores} /></div></>}
          {b.diretoria && <><div className="bol-exp-tit">{b.diretoriaTitulo}</div><div><Linhas texto={b.diretoria} /></div></>}
        </div>
      );
    case "texto":
      return (
        <div className={`bol-texto-livre ${b.caixa ? "bol-caixa" : ""}`} style={estilo}>
          {b.titulo && <h3>{b.titulo}</h3>}
          {paragrafos(b.texto).map((p, i) => <p key={i}><Linhas texto={p} /></p>)}
        </div>
      );
    case "tabela":
      return (
        <table className="bol-tab">
          <tbody>
            {b.titulo && <tr><td colSpan={Math.max(b.cabecalho.length, 1)} className="bol-tit-cinza">{b.titulo}</td></tr>}
            {b.cabecalho.some(Boolean) && <tr>{b.cabecalho.map((c, i) => <td key={i} className="bol-sub-claro">{c}</td>)}</tr>}
            {b.linhas.map((l) => (
              <tr key={l.id}>{b.cabecalho.map((_, i) => <td key={i} className={i === 0 ? "bol-rot" : "bol-c"}><Linhas texto={l.celulas[i] ?? ""} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      );
  }
}

// ─── Página ─────────────────────────────────────────────────────────────────

function ehPaginaDeTabelas(p: Pagina) {
  return p.blocos.some((b) => ["escala", "aniversariantes", "oficios", "agenda", "parcerias", "trabalhos"].includes(b.tipo));
}

function PaginaView({ boletim, pagina, n, marcarTransbordo, aoSelecionar, selecionado }: {
  boletim: Boletim; pagina: Pagina; n: number; marcarTransbordo: boolean;
  aoSelecionar?: (blocoId: string) => void; selecionado?: string | null;
}) {
  const corpo = useRef<HTMLDivElement>(null);
  const [transborda, setTransborda] = useState(false);

  useEffect(() => {
    if (!marcarTransbordo) return;
    const el = corpo.current;
    if (!el) return;
    const medir = () => setTransborda(el.scrollHeight > el.clientHeight + 2);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    Array.from(el.querySelectorAll(".bol-blocos > *")).forEach((c) => ro.observe(c));
    document.fonts?.ready.then(medir);
    return () => ro.disconnect();
  });

  const dataTxt = `${boletim.titulo} – ${dataPorExtenso(boletim.data)}`;
  return (
    <section className={`bol-pagina ${ehPaginaDeTabelas(pagina) ? "bol-pg-tabelas" : ""}`} data-pagina={n}>
      <div className="bol-corpo" ref={corpo} style={{ overflow: "hidden" }}>
        {n === 1 ? (
          <>
            <Banner />
            <div className="bol-data-capa">{dataTxt}</div>
          </>
        ) : (
          n !== 4 || !ehPaginaDeTabelas(pagina) ? <div className={`bol-cabecalho ${n % 2 === 1 ? "bol-dir" : ""}`}>{dataTxt}</div> : null
        )}
        <div className="bol-blocos">
          {pagina.blocos.map((b) => (
            <div
              key={b.id}
              className={`bol-l-${b.largura}`}
              data-bloco={b.id}
              data-tipo={b.tipo}
              onClick={aoSelecionar ? (e) => { e.stopPropagation(); aoSelecionar(b.id); } : undefined}
              style={aoSelecionar ? { cursor: "pointer", outline: selecionado === b.id ? "2px solid #2563eb" : undefined, outlineOffset: 2 } : undefined}
            >
              <BlocoView b={b} />
            </div>
          ))}
        </div>
      </div>
      {marcarTransbordo && transborda && <div className="bol-transbordo">O conteúdo passou do fim desta página — reduza o texto, ajuste o tamanho ou mova um bloco para outra página.</div>}
    </section>
  );
}

export function Folhas({ boletim, marcarTransbordo = false, aoSelecionar, selecionado, children }: {
  boletim: Boletim; marcarTransbordo?: boolean; aoSelecionar?: (blocoId: string) => void; selecionado?: string | null; children?: ReactNode;
}) {
  return (
    <div className="bol-folhas">
      {boletim.paginas.map((p, i) => (
        <PaginaView key={p.id} boletim={boletim} pagina={p} n={i + 1} marcarTransbordo={marcarTransbordo} aoSelecionar={aoSelecionar} selecionado={selecionado} />
      ))}
      {children}
    </div>
  );
}

/**
 * Mostra as folhas A4 encolhidas para caber na largura disponível
 * (painel e celular), mantendo o desenho exato.
 */
export function FolhasEscaladas(props: Parameters<typeof Folhas>[0] & { espaco?: number }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [altura, setAltura] = useState<number | undefined>();
  const espaco = props.espaco ?? 24;

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const larguraA4 = 793.7; // 210mm em px
    const ajustar = () => {
      const e = Math.min(1.4, el.clientWidth / larguraA4);
      setEscala(e);
      const interno = el.firstElementChild as HTMLElement | null;
      if (interno) setAltura(interno.scrollHeight * e);
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [props.boletim.paginas.length]);

  return (
    <div ref={caixa} style={{ width: "100%", height: altura, overflow: "hidden" }}>
      <div className="bol-tela" style={{ width: "210mm", transform: `scale(${escala})`, transformOrigin: "top left", ["--bol-espaco" as string]: `${espaco / escala}px` }}>
        <Folhas {...props} />
      </div>
    </div>
  );
}
