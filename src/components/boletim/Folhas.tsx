/**
 * Desenho das páginas do boletim — o mesmo para a prévia do painel, a página
 * no site e o PDF.
 */
import { Fragment, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./boletim.css";
import { EdicaoCtx, Editavel } from "./Editavel";
import { escapar, marcadoHtml, paragrafos, type ModoTexto } from "./marcacao";

export { marcadoHtml };
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

/* eslint-disable @typescript-eslint/no-explicit-any */
type Setter = (x: any, v: string) => void;

/**
 * Desenha um bloco. No editor do painel (EdicaoCtx presente), cada texto vira
 * um campo editável no lugar; campos opcionais vazios aparecem só no bloco
 * selecionado, para não mudar a página.
 */
function BlocoView({ b, ativo = false }: { b: Bloco; ativo?: boolean }) {
  const ed = useContext(EdicaoCtx);
  const escala = (b.ajuste || 100) / 100;
  const estilo = escala !== 1 ? { fontSize: `${16 * escala}pt` } : undefined;

  /** Texto do bloco: editável no painel, marcado no site/PDF. */
  const T = (valor: string, set: Setter, modo: ModoTexto = "linha", dica?: string, como: "span" | "div" = modo === "paragrafos" ? "div" : "span") => {
    if (!ed) return modo === "linha" ? <Marcado texto={valor} /> : <Linhas texto={valor} />;
    return <Editavel valor={valor} modo={modo} dica={dica} como={como} aoMudar={(v) => ed.mudar(b.id, (x) => set(x, v))} />;
  };
  /** Campo opcional: some quando vazio, exceto no bloco selecionado do editor. */
  const mostra = (valor: string) => Boolean(valor) || (Boolean(ed) && ativo);
  const paras = (texto: string, set: Setter, dica = "Escreva o texto…") =>
    ed ? T(texto, set, "paragrafos", dica) : paragrafos(texto).map((p, i) => <p key={i}><Linhas texto={p} /></p>);

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
            {mostra(b.rotulo) && <div className={`bol-rotulo ${b.rotuloLado === "direita" ? "bol-dir" : ""}`}>{T(b.rotulo, (x, v) => { x.rotulo = v; }, "linha", "Rótulo (ex.: Pastoral)")}</div>}
            {mostra(b.titulo) && <h2>{T(b.titulo, (x, v) => { x.titulo = v; }, "linha", "Título")}</h2>}
            {paras(b.texto, (x, v) => { x.texto = v; })}
            {mostra(b.autor) && <p className="bol-assinatura">{T(b.autor, (x, v) => { x.autor = v; }, "linha", "Assinatura")}</p>}
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
          {b.itens.map((a, i) => (
            <Fragment key={a.id}>
              {mostra(a.titulo) && <h3>{T(a.titulo, (x, v) => { x.itens[i].titulo = v; }, "linha", "Título do aviso")}</h3>}
              {paras(a.texto, (x, v) => { x.itens[i].texto = v; }, "Texto do aviso…")}
            </Fragment>
          ))}
        </div>
      );
    }
    case "escala": {
      const porteiros = b.porteiros;
      const metade = Math.ceil(porteiros.length / 2);
      const fonte = escala !== 1 ? { fontSize: `${10 * escala}pt` } : undefined;
      const porteiro = (k: number) => {
        const x = porteiros[k];
        if (!x) return null;
        return <><strong>{T(x.horario, (y, v) => { y.porteiros[k].horario = v; }, "linha", "Horário")}</strong>{(x.horario || ed) && ": "}{T(x.nome, (y, v) => { y.porteiros[k].nome = v; }, "linha", "Nome")}</>;
      };
      // Três tabelas encostadas, como no Word: cada parte tem suas colunas.
      return (
        <div className="bol-escala" style={fonte}>
          <table className="bol-tab" style={fonte}>
            <colgroup><col style={{ width: "36%" }} /><col style={{ width: "32%" }} /><col style={{ width: "32%" }} /></colgroup>
            <tbody>
              <tr><td colSpan={3} className="bol-tit-escuro">{T(b.titulo, (x, v) => { x.titulo = v; })}</td></tr>
              <tr>{b.cabecalho.map((c, i) => <td key={i} className="bol-sub-medio">{T(c, (x, v) => { x.cabecalho[i] = v; })}</td>)}</tr>
              {b.linhas.map((l, li) => (
                <tr key={l.id}>
                  <td className="bol-rot">{T(l.celulas[0], (x, v) => { x.linhas[li].celulas[0] = v; }, "linha", "Função")}</td>
                  <td className="bol-c">{T(l.celulas[1], (x, v) => { x.linhas[li].celulas[1] = v; })}</td>
                  <td className="bol-c">{T(l.celulas[2], (x, v) => { x.linhas[li].celulas[2] = v; })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {porteiros.length > 0 && (
            <table className="bol-tab" style={{ ...fonte, marginTop: "-0.5pt" }}>
              <tbody>
                <tr><td colSpan={2} className="bol-sub-escuro">{T(b.porteirosTitulo, (x, v) => { x.porteirosTitulo = v; })}</td></tr>
                {Array.from({ length: metade }).map((_, i) => (
                  <tr key={i}>
                    <td style={{ width: "50%" }}>{porteiro(i)}</td>
                    <td>{porteiro(i + metade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {b.semanaColunas.length > 0 && (
            <table className="bol-tab" style={{ ...fonte, marginTop: "-0.5pt" }}>
              <colgroup><col style={{ width: "36%" }} />{b.semanaColunas.map((c) => <col key={c.id} />)}</colgroup>
              <tbody>
                <tr><td colSpan={1 + b.semanaColunas.length} className="bol-sub-escuro">{T(b.semanaTitulo, (x, v) => { x.semanaTitulo = v; })}</td></tr>
                <tr><td className="bol-sub-medio" rowSpan={2} />{b.semanaColunas.map((c, ci) => <td key={c.id} className="bol-sub-medio">{T(c.dia, (x, v) => { x.semanaColunas[ci].dia = v; }, "linha", "Dia")}</td>)}</tr>
                <tr>{b.semanaColunas.map((c, ci) => <td key={c.id} className="bol-sub-medio">{T(c.atividade, (x, v) => { x.semanaColunas[ci].atividade = v; }, "linha", "Atividade")}</td>)}</tr>
                {b.semanaLinhas.map((l, li) => (
                  <tr key={l.id}>
                    <td className="bol-rot">{T(l.funcao, (x, v) => { x.semanaLinhas[li].funcao = v; }, "linha", "Função")}</td>
                    {b.semanaColunas.map((c, i) => <td key={c.id} className="bol-c">{T(l.valores[i] ?? "", (x, v) => { x.semanaLinhas[li].valores[i] = v; })}</td>)}
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
              <tr><td colSpan={2} className="bol-tit-escuro">{T(b.titulo, (x, v) => { x.titulo = v; })}</td></tr>
              {b.linhas.map((l, li) => (
                <tr key={l.id}><td className="bol-dia">{T(l.dia, (x, v) => { x.linhas[li].dia = v; }, "linha", "Dia")}</td><td>{T(l.nomes, (x, v) => { x.linhas[li].nomes = v; }, "linhas", "Nomes")}</td></tr>
              ))}
            </tbody>
          </table>
          {mostra(b.versiculo) && (
            <p className="bol-versiculo">
              {T(b.versiculo, (x, v) => { x.versiculo = v; }, "linhas", "Versículo")}
              {mostra(b.referencia) && <small>{T(b.referencia, (x, v) => { x.referencia = v; }, "linha", "Referência")}</small>}
            </p>
          )}
        </div>
      );
    case "oficios":
      return (
        <table className="bol-tab bol-oficios">
          <tbody>
            <tr><td colSpan={b.colunas.length} className="bol-tit-cinza">{T(b.titulo, (x, v) => { x.titulo = v; })}</td></tr>
            <tr>{b.colunas.map((c, ci) => <td key={c.id} style={{ width: `${100 / b.colunas.length}%` }}>{T(c.texto, (x, v) => { x.colunas[ci].texto = v; }, "linhas")}</td>)}</tr>
          </tbody>
        </table>
      );
    case "trabalhos": {
      const pares: number[][] = [];
      for (let i = 0; i < b.itens.length; i += 2) pares.push(i + 1 < b.itens.length ? [i, i + 1] : [i]);
      return (
        <table className="bol-tab bol-trabalhos">
          <tbody>
            <tr><td colSpan={2} className="bol-tit-cinza">{T(b.titulo, (x, v) => { x.titulo = v; })}</td></tr>
            {pares.map((par, i) => (
              <Fragment key={i}>
                <tr>{par.map((k) => <td key={b.itens[k]!.id} className="bol-sub-claro" colSpan={par.length === 1 ? 2 : 1}>{T(b.itens[k]!.titulo, (x, v) => { x.itens[k].titulo = v; }, "linha", "Título")}</td>)}</tr>
                <tr>{par.map((k) => <td key={b.itens[k]!.id} colSpan={par.length === 1 ? 2 : 1}>{T(b.itens[k]!.texto, (x, v) => { x.itens[k].texto = v; }, "linhas", "Endereço, contato…")}</td>)}</tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      );
    }
    case "parcerias": {
      const pares: number[][] = [];
      for (let i = 0; i < b.itens.length; i += 2) pares.push([i, i + 1]);
      return (
        <table className="bol-tab bol-parcerias">
          <tbody>
            <tr><td colSpan={2} className="bol-tit-cinza">{T(b.titulo, (x, v) => { x.titulo = v; })}</td></tr>
            {pares.map((par, i) => (
              <tr key={i}>
                {par.map((k) => {
                  const x = b.itens[k];
                  if (!x) return <td key={k} />;
                  if (ed) return <td key={k}><strong>{T(x.nome, (y, v) => { y.itens[k].nome = v; }, "linha", "Nome")}</strong>{" – "}{T(x.texto, (y, v) => { y.itens[k].texto = v; }, "linha", "Descrição")}</td>;
                  return <td key={k}>{x.nome || x.texto ? <><strong>{x.nome}</strong>{x.nome && x.texto && " – "}<Marcado texto={x.texto} /></> : null}</td>;
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
            <tr><td colSpan={3} className="bol-tit-agenda">{T(b.titulo, (x, v) => { x.titulo = v; })}</td></tr>
            {b.grupos.map((g, gi) => {
              // agrupa linhas seguidas com a mesma data (como as células mescladas do Word)
              const grupos: { data: string; ks: number[] }[] = [];
              g.itens.forEach((it, k) => {
                const ult = grupos[grupos.length - 1];
                if (ult && it.data && ult.data === it.data) ult.ks.push(k);
                else grupos.push({ data: it.data, ks: [k] });
              });
              return (
                <Fragment key={g.id}>
                  <tr><td colSpan={3} className="bol-mes">{T(g.titulo, (x, v) => { x.grupos[gi].titulo = v; }, "linha", "Mês")}</td></tr>
                  {grupos.map((gr) => (
                    <tr key={g.itens[gr.ks[0]!]!.id}>
                      <td className="bol-data">{T(gr.data, (x, v) => { for (const k of gr.ks) x.grupos[gi].itens[k].data = v; }, "linha", "Data")}</td>
                      <td className="bol-hora">{gr.ks.map((k, j) => <Fragment key={k}>{j > 0 && <br />}{T(g.itens[k]!.hora, (x, v) => { x.grupos[gi].itens[k].hora = v; }, "linha", "–")}</Fragment>)}</td>
                      <td>{gr.ks.map((k, j) => <Fragment key={k}>{j > 0 && <br />}{T(g.itens[k]!.texto, (x, v) => { x.grupos[gi].itens[k].texto = v; }, "linha", "Evento")}</Fragment>)}</td>
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
          <div className="bol-exp-nome">{T(b.nome, (x, v) => { x.nome = v; }, "linhas", "", "div")}</div>
          <div>{T(b.texto, (x, v) => { x.texto = v; }, "linhas", "", "div")}</div>
          {mostra(b.pastores) && <><div className="bol-exp-tit">{T(b.pastoresTitulo, (x, v) => { x.pastoresTitulo = v; })}</div><div>{T(b.pastores, (x, v) => { x.pastores = v; }, "linhas", "Pastores", "div")}</div></>}
          {mostra(b.diretoria) && <><div className="bol-exp-tit">{T(b.diretoriaTitulo, (x, v) => { x.diretoriaTitulo = v; })}</div><div>{T(b.diretoria, (x, v) => { x.diretoria = v; }, "linhas", "Diretoria", "div")}</div></>}
        </div>
      );
    case "texto":
      return (
        <div className={`bol-texto-livre ${b.caixa ? "bol-caixa" : ""}`} style={estilo}>
          {mostra(b.titulo) && <h3>{T(b.titulo, (x, v) => { x.titulo = v; }, "linha", "Título")}</h3>}
          {paras(b.texto, (x, v) => { x.texto = v; })}
        </div>
      );
    case "tabela":
      return (
        <table className="bol-tab">
          <tbody>
            {mostra(b.titulo) && <tr><td colSpan={Math.max(b.cabecalho.length, 1)} className="bol-tit-cinza">{T(b.titulo, (x, v) => { x.titulo = v; }, "linha", "Título da tabela")}</td></tr>}
            {(b.cabecalho.some(Boolean) || ed) && <tr>{b.cabecalho.map((c, i) => <td key={i} className="bol-sub-claro">{T(c, (x, v) => { x.cabecalho[i] = v; }, "linha", "Coluna")}</td>)}</tr>}
            {b.linhas.map((l, li) => (
              <tr key={l.id}>{b.cabecalho.map((_, i) => <td key={i} className={i === 0 ? "bol-rot" : "bol-c"}>{T(l.celulas[i] ?? "", (x, v) => { x.linhas[li].celulas[i] = v; }, "linhas")}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
  }
}

/** Um bloco solto, em miniatura (catálogo de seções do editor). */
export function BlocoAvulso({ b }: { b: Bloco }) {
  return (
    <div className="bol-folhas">
      <section className="bol-pagina bol-avulso" style={{ height: "auto" }}>
        <div className="bol-blocos"><div className={`bol-l-${b.largura === "inteira" ? "inteira" : "inteira"}`}><BlocoView b={b} /></div></div>
      </section>
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

function ehPaginaDeTabelas(p: Pagina) {
  return p.blocos.some((b) => ["escala", "aniversariantes", "oficios", "agenda", "parcerias", "trabalhos"].includes(b.tipo));
}

type Interacao = {
  marcarTransbordo?: boolean;
  aoSelecionar?: (blocoId: string) => void;
  /** duplo clique num bloco (abre a janela de edição) */
  aoAbrir?: (blocoId: string) => void;
  /** quanto da altura útil a página ocupa (100 = cheia) */
  aoOcupacao?: (paginaId: string, porcento: number) => void;
  selecionado?: string | null;
};

function PaginaView({ boletim, pagina, n, marcarTransbordo = false, aoSelecionar, aoAbrir, aoOcupacao, selecionado }: Interacao & {
  boletim: Boletim; pagina: Pagina; n: number;
}) {
  const ed = useContext(EdicaoCtx);
  const corpo = useRef<HTMLDivElement>(null);
  const [transborda, setTransborda] = useState(false);
  const ocupacaoRef = useRef(aoOcupacao);
  ocupacaoRef.current = aoOcupacao;

  useEffect(() => {
    if (!marcarTransbordo && !aoOcupacao) return;
    const el = corpo.current;
    if (!el) return;
    const medir = () => {
      const blocos = el.querySelector<HTMLElement>(".bol-blocos");
      // altura real do conteúdo (offsetHeight ignora molduras de seleção do editor)
      const usado = blocos ? blocos.offsetTop + blocos.offsetHeight : el.scrollHeight;
      const pct = el.clientHeight ? (usado / el.clientHeight) * 100 : 0;
      setTransborda(Math.round(pct) > 100);
      ocupacaoRef.current?.(pagina.id, Math.round(pct));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    Array.from(el.querySelectorAll(".bol-blocos > *")).forEach((c) => ro.observe(c));
    document.fonts?.ready.then(medir);
    const t = setTimeout(medir, 120);
    return () => { ro.disconnect(); clearTimeout(t); };
  });

  const dataTxt = `${boletim.titulo} – ${dataPorExtenso(boletim.data)}`;
  return (
    <section className={`bol-pagina ${ehPaginaDeTabelas(pagina) ? "bol-pg-tabelas" : ""}`} data-pagina={n} data-pagina-id={pagina.id}>
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
              className={`bol-l-${b.largura} ${aoSelecionar ? "bol-selecionavel" : ""} ${selecionado === b.id ? "bol-selecionado" : ""}`}
              data-bloco={b.id}
              data-tipo={b.tipo}
              onClick={aoSelecionar ? (e) => { e.stopPropagation(); aoSelecionar(b.id); } : undefined}
              onDoubleClick={aoAbrir ? (e) => { if ((e.target as HTMLElement).closest(".bol-ed")) return; e.stopPropagation(); aoAbrir(b.id); } : undefined}
            >
              <BlocoView b={b} ativo={selecionado === b.id} />
            </div>
          ))}
        </div>
        {ed && pagina.blocos.length === 0 && (
          <button type="button" className="bol-vazia" onClick={(e) => { e.stopPropagation(); ed.adicionar?.(pagina.id); }}>
            <span>Página em branco</span>
            <small>Clique para adicionar uma seção</small>
          </button>
        )}
      </div>
      {marcarTransbordo && transborda && <div className="bol-transbordo">O conteúdo passou do fim desta página — use “Encaixar na página”, reduza o texto ou mova uma seção.</div>}
    </section>
  );
}

export function Folhas({ boletim, somentePagina, children, ...interacao }: Interacao & {
  boletim: Boletim; somentePagina?: string; children?: ReactNode;
}) {
  return (
    <div className="bol-folhas">
      {boletim.paginas.map((p, i) => (somentePagina && p.id !== somentePagina ? null : (
        <PaginaView key={p.id} boletim={boletim} pagina={p} n={i + 1} {...interacao} />
      )))}
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
  }, [props.boletim.paginas.length, props.somentePagina]);

  return (
    <div ref={caixa} style={{ width: "100%", height: altura, overflow: "hidden" }}>
      <div className="bol-tela" style={{ width: "210mm", transform: `scale(${escala})`, transformOrigin: "top left", ["--bol-espaco" as string]: `${espaco / escala}px` }}>
        <Folhas {...props} />
      </div>
    </div>
  );
}
