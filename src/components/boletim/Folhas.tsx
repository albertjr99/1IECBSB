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
import { dataImpressa } from "@/lib/boletim";

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
      Promise.all(["400 16px BolMontserrat", "700 16px BolMontserrat", "italic 400 16px BolLora", "italic 500 16px BolLora"].map((f) => fontes.load(f)))
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

// ─── Topo da primeira página: logo colorida, filiação e data ───────────────

function Capa({ boletim }: { boletim: Boletim }) {
  return (
    <header className="bol-capa">
      <div className="bol-capa-marca">
        <img src="/marca/logo-horizontal-colorida.svg" alt="Primeira Igreja Evangélica Congregacional de Brasília" />
        <small>Filiada à União das Igrejas Evangélicas Congregacionais do Brasil – UIECB</small>
      </div>
      <div className="bol-capa-data">
        <span>{boletim.titulo}</span>
        <strong>{dataImpressa(boletim.data)}</strong>
      </div>
    </header>
  );
}

/** "Martelando a Palavra": painel azul no alto da página dos avisos. */
function Versiculo({ boletim }: { boletim: Boletim }) {
  const ed = useContext(EdicaoCtx);
  const verso = boletim.versiculo ?? "";
  const ref = boletim.versiculoRef ?? "";
  if (!verso && !ed?.mudarBoletim) return null;
  const limpo = verso.replace(/^[“"]|[”"]$/g, "");
  return (
    <aside className="bol-verso">
      <span className="bol-verso-rotulo">Martelando a Palavra</span>
      <blockquote>
        {ed?.mudarBoletim
          ? <>“<Editavel valor={limpo} modo="linha" dica="Versículo da semana" aoMudar={(v) => ed.mudarBoletim!((d) => { d.versiculo = v; })} />”</>
          : <>“<Marcado texto={limpo} />”</>}
      </blockquote>
      {(ref || ed?.mudarBoletim) && (
        <cite>{ed?.mudarBoletim ? <Editavel valor={ref} modo="linha" dica="Referência" aoMudar={(v) => ed.mudarBoletim!((d) => { d.versiculoRef = v; })} /> : ref}</cite>
      )}
    </aside>
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
  const base = b.tipo === "artigo" ? 10.6 : b.tipo === "avisos" ? ((b.colunas ?? 1) === 2 ? 8.8 : 9.2) : 9.4;
  const estilo = escala !== 1 ? { fontSize: `${base * escala}pt` } : undefined;

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
        // rótulo e título por cima das duas colunas; o texto corre de uma coluna para a outra
        const pecas: Peca[] = [
          ...paragrafos(b.texto).map((t) => ({ tag: "p" as const, texto: t, divisivel: true })),
          ...(b.autor ? [{ tag: "p" as const, classe: "bol-assinatura", texto: b.autor, divisivel: false }] : []),
        ];
        return (
          <div className="bol-artigo bol-artigo-2col" style={estilo}>
            {mostra(b.rotulo) && <div className="bol-rotulo">{T(b.rotulo, (x, v) => { x.rotulo = v; }, "linha", "Rótulo (ex.: Pastoral)")}</div>}
            {mostra(b.titulo) && <h2>{T(b.titulo, (x, v) => { x.titulo = v; }, "linha", "Título")}</h2>}
            <FluxoColunas pecas={pecas} proporcao={b.proporcao ?? 0.5} gapPt={18} classe="bol-artigo bol-2col" {...(estilo ? { estilo } : {})} />
          </div>
        );
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
      // Duas colunas: cartões em grade (destaques com fundo névoa; caixa ocupa a largura toda)
      if ((b.colunas ?? 1) === 2) {
        return (
          <div className="bol-avisos-grade" style={estilo}>
            {b.itens.map((a, i) => (
              <div key={a.id} className={`bol-aviso bol-aviso-${a.estilo ?? "normal"}`}>
                {mostra(a.titulo) && <h3>{T(a.titulo, (x, v) => { x.itens[i].titulo = v; }, "linha", "Título do aviso")}</h3>}
                {paras(a.texto, (x, v) => { x.itens[i].texto = v; }, "Texto do aviso…")}
              </div>
            ))}
          </div>
        );
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
      const fonte = escala !== 1 ? { fontSize: `${6.3 * escala}pt` } : undefined;
      return (
        <div className="bol-escala" style={fonte}>
          <table className="bol-tab">
            <colgroup><col style={{ width: "36%" }} /><col style={{ width: "32%" }} /><col style={{ width: "32%" }} /></colgroup>
            <tbody>
              <tr><td colSpan={3} className="bol-tit-escuro">{T(b.titulo, (x, v) => { x.titulo = v; })}</td></tr>
              <tr className="bol-cab">{b.cabecalho.map((c, i) => <td key={i}>{T(c, (x, v) => { x.cabecalho[i] = v; })}</td>)}</tr>
              {b.linhas.map((l, li) => (
                <tr key={l.id}>
                  <td className="bol-rot">{T(l.celulas[0], (x, v) => { x.linhas[li].celulas[0] = v; }, "linha", "Função")}</td>
                  <td>{T(l.celulas[1], (x, v) => { x.linhas[li].celulas[1] = v; })}</td>
                  <td>{T(l.celulas[2], (x, v) => { x.linhas[li].celulas[2] = v; })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {b.porteiros.length > 0 && (
            <div className="bol-porteiros">
              <div className="bol-tit-escuro">{T(b.porteirosTitulo, (x, v) => { x.porteirosTitulo = v; })}</div>
              <div className="bol-porteiros-grade">
                {b.porteiros.map((p, k) => (
                  <div key={p.id}>
                    <small>{T(p.horario.replace(/^Das\s+/i, ""), (y, v) => { y.porteiros[k].horario = v; }, "linha", "Horário")}</small>
                    <span>{T(p.nome, (y, v) => { y.porteiros[k].nome = v; }, "linha", "Nome")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {b.semanaColunas.length > 0 && (
            <table className="bol-tab bol-semana">
              <colgroup><col style={{ width: "36%" }} />{b.semanaColunas.map((c) => <col key={c.id} />)}</colgroup>
              <tbody>
                <tr><td colSpan={1 + b.semanaColunas.length} className="bol-tit-escuro">{T(b.semanaTitulo, (x, v) => { x.semanaTitulo = v; })}</td></tr>
                <tr className="bol-cab"><td />{b.semanaColunas.map((c, ci) => (
                  <td key={c.id}>{T(c.dia, (x, v) => { x.semanaColunas[ci].dia = v; }, "linha", "Dia")}{(c.atividade || ed) && " · "}{T(c.atividade, (x, v) => { x.semanaColunas[ci].atividade = v; }, "linha", "Atividade")}</td>
                ))}</tr>
                {b.semanaLinhas.map((l, li) => (
                  <tr key={l.id}>
                    <td className="bol-rot">{T(l.funcao, (x, v) => { x.semanaLinhas[li].funcao = v; }, "linha", "Função")}</td>
                    {b.semanaColunas.map((c, i) => <td key={c.id}>{T(l.valores[i] ?? "", (x, v) => { x.semanaLinhas[li].valores[i] = v; })}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    }
    case "aniversariantes": {
      // uma pessoa por linha; o dia se repete, como na lista impressa
      const linhas = b.linhas.flatMap((l, li) => {
        const nomes = ed ? [l.nomes] : l.nomes.split("\n").filter((n) => n.trim());
        return (nomes.length ? nomes : [""]).map((n, k) => ({ l, li, n, k }));
      });
      return (
        <div className="bol-aniv-bloco" style={escala !== 1 ? { fontSize: `${6.2 * escala}pt` } : undefined}>
          <table className="bol-tab bol-aniv">
            <tbody>
              <tr><td colSpan={2} className="bol-tit-escuro">{T(b.titulo, (x, v) => { x.titulo = v; })}</td></tr>
              {linhas.map(({ l, li, n, k }) => (
                <tr key={`${l.id}-${k}`}>
                  <td className="bol-dia">{T(l.dia, (x, v) => { x.linhas[li].dia = v; }, "linha", "Dia")}</td>
                  <td>{ed ? T(l.nomes, (x, v) => { x.linhas[li].nomes = v; }, "linhas", "Nomes") : <Marcado texto={n} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {mostra(b.versiculo) && (
            <p className="bol-versiculo">
              <em>“{T(b.versiculo.replace(/^[“"]|[”".]+$/g, ""), (x, v) => { x.versiculo = v; }, "linhas", "Versículo")}.”</em>{" "}
              {mostra(b.referencia) && <small>{T(b.referencia.replace(/^\(|\)\.?$/g, ""), (x, v) => { x.referencia = v; }, "linha", "Referência")}</small>}
            </p>
          )}
        </div>
      );
    }
    case "oficios":
      return (
        <div className="bol-quadro bol-oficios">
          <div className="bol-tit-escuro">{T(b.titulo, (x, v) => { x.titulo = v; })}</div>
          <div className="bol-oficios-grade">
            {b.colunas.map((c, ci) => <div key={c.id}>{T(c.texto, (x, v) => { x.colunas[ci].texto = v; }, "linhas")}</div>)}
          </div>
        </div>
      );
    case "trabalhos":
      return (
        <div className="bol-quadro bol-trabalhos">
          <div className="bol-tit-escuro">{T(b.titulo, (x, v) => { x.titulo = v; })}</div>
          <div className="bol-trabalhos-grade" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, b.itens.length))}, minmax(0, 1fr))` }}>
            {b.itens.map((t, k) => (
              <div key={t.id}>
                <strong>{T(t.titulo, (x, v) => { x.itens[k].titulo = v; }, "linha", "Título")}</strong>
                <span>{T(t.texto, (x, v) => { x.itens[k].texto = v; }, "linhas", "Endereço, contato…")}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "parcerias":
      return (
        <div className="bol-quadro bol-parcerias">
          <div className="bol-tit-escuro">{T(b.titulo, (x, v) => { x.titulo = v; })}</div>
          <div className="bol-parcerias-grade">
            {b.itens.map((p, k) => (!p.nome && !p.texto && !ed ? null : (
              <div key={p.id}>
                <strong>{T(p.nome, (y, v) => { y.itens[k].nome = v; }, "linha", "Nome")}</strong>
                {(p.texto || ed) && <> · </>}{T(p.texto, (y, v) => { y.itens[k].texto = v; }, "linha", "Descrição")}
              </div>
            )))}
          </div>
        </div>
      );
    case "agenda":
      return (
        <table className="bol-tab bol-agenda">
          <colgroup><col style={{ width: "15%" }} /><col style={{ width: "8%" }} /><col /></colgroup>
          <tbody>
            <tr><td colSpan={3} className="bol-tit-escuro">{T(b.titulo, (x, v) => { x.titulo = v; })}</td></tr>
            {b.grupos.map((g, gi) => (
              <Fragment key={g.id}>
                <tr><td colSpan={3} className="bol-mes">{T(g.titulo, (x, v) => { x.grupos[gi].titulo = v; }, "linha", "Mês")}</td></tr>
                {g.itens.map((it, k) => (
                  <tr key={it.id}>
                    <td className="bol-data">{ed ? T(it.data, (x, v) => { x.grupos[gi].itens[k].data = v; }, "linha", "Data") : it.data.replace(/\s*\((\w+)\)/, " $1").replace(/\bsab\b/, "sáb")}</td>
                    <td className="bol-hora">{ed ? T(it.hora, (x, v) => { x.grupos[gi].itens[k].hora = v; }, "linha", "–") : it.hora === "-" ? "" : it.hora}</td>
                    <td>{T(it.texto, (x, v) => { x.grupos[gi].itens[k].texto = v; }, "linha", "Evento")}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      );
    case "expediente":
      return (
        <div className="bol-expediente">
          <div className="bol-exp-marca">
            <img src="/marca/logo-horizontal-negativo-branco-cruz-vermelha.svg" alt="" />
            <small>Filiada à União das Igrejas Evangélicas Congregacionais do Brasil – UIECB</small>
          </div>
          <div><div className="bol-exp-tit">Contato</div>{T(b.texto, (x, v) => { x.texto = v; }, "linhas", "", "div")}</div>
          <div><div className="bol-exp-tit">{T(b.pastoresTitulo, (x, v) => { x.pastoresTitulo = v; })}</div>{T(b.pastores, (x, v) => { x.pastores = v; }, "linhas", "Pastores", "div")}</div>
          <div><div className="bol-exp-tit">{T(b.diretoriaTitulo, (x, v) => { x.diretoriaTitulo = v; })}</div>{T(b.diretoria, (x, v) => { x.diretoria = v; }, "linhas", "Diretoria", "div")}</div>
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
        <table className="bol-tab bol-tabela">
          <tbody>
            {mostra(b.titulo) && <tr><td colSpan={Math.max(b.cabecalho.length, 1)} className="bol-tit-escuro">{T(b.titulo, (x, v) => { x.titulo = v; }, "linha", "Título da tabela")}</td></tr>}
            {(b.cabecalho.some(Boolean) || ed) && <tr className="bol-cab">{b.cabecalho.map((c, i) => <td key={i}>{T(c, (x, v) => { x.cabecalho[i] = v; }, "linha", "Coluna")}</td>)}</tr>}
            {b.linhas.map((l, li) => (
              <tr key={l.id}>{b.cabecalho.map((_, i) => <td key={i} className={i === 0 ? "bol-rot" : ""}>{T(l.celulas[i] ?? "", (x, v) => { x.linhas[li].celulas[i] = v; }, "linhas")}</td>)}</tr>
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
    Array.from(el.querySelectorAll(".bol-blocos > *, .bol-pilha > *")).forEach((c) => ro.observe(c));
    document.fonts?.ready.then(medir);
    const t = setTimeout(medir, 120);
    return () => { ro.disconnect(); clearTimeout(t); };
  });

  const envolver = (b: Bloco) => (
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
  );

  // expediente de largura inteira vira a faixa azul do pé da página
  const faixa = pagina.blocos.find((b) => b.tipo === "expediente" && b.largura === "inteira");
  const blocos = pagina.blocos.filter((b) => b !== faixa);
  // blocos "largos" e "estreitos" seguidos formam duas pilhas lado a lado
  const grupos: (Bloco | { esq: Bloco[]; dir: Bloco[] })[] = [];
  for (const b of blocos) {
    if (b.largura === "larga" || b.largura === "estreita") {
      const ult = grupos[grupos.length - 1];
      const pilha = ult && "esq" in ult ? ult : (grupos.push({ esq: [], dir: [] }), grupos[grupos.length - 1] as { esq: Bloco[]; dir: Bloco[] });
      (b.largura === "larga" ? pilha.esq : pilha.dir).push(b);
    } else grupos.push(b);
  }
  const temAvisos = blocos.some((b) => b.tipo === "avisos");
  const primeiraComAvisos = boletim.paginas.find((p) => p.blocos.some((b) => b.tipo === "avisos"))?.id === pagina.id;

  return (
    <section className={`bol-pagina ${ehPaginaDeTabelas(pagina) ? "bol-pg-tabelas" : ""} ${faixa ? "bol-com-faixa" : ""}`} data-pagina={n} data-pagina-id={pagina.id}>
      {n === 1 && <Capa boletim={boletim} />}
      <div className="bol-corpo" ref={corpo} style={{ overflow: "hidden" }}>
        {n > 1 && (
          <div className="bol-cabecalho">
            <span className="bol-cab-marca"><img src="/marca/logo-simbolo-colorida.svg" alt="" /><strong>{boletim.titulo}</strong><span>· {dataImpressa(boletim.data)}</span></span>
            <span className="bol-num">{n}</span>
          </div>
        )}
        <div className="bol-blocos">
          {temAvisos && primeiraComAvisos && <div className="bol-l-inteira"><Versiculo boletim={boletim} /></div>}
          {grupos.map((g) => ("esq" in g ? (
            <div key={`pilha-${g.esq[0]?.id ?? g.dir[0]?.id}`} className="bol-pilhas">
              <div className="bol-pilha bol-pilha-esq">{g.esq.map(envolver)}</div>
              <div className="bol-pilha bol-pilha-dir">{g.dir.map(envolver)}</div>
            </div>
          ) : envolver(g)))}
        </div>
        {ed && pagina.blocos.length === 0 && (
          <button type="button" className="bol-vazia" onClick={(e) => { e.stopPropagation(); ed.adicionar?.(pagina.id); }}>
            <span>Página em branco</span>
            <small>Clique para adicionar uma seção</small>
          </button>
        )}
      </div>
      {faixa ? <div className="bol-faixa">{envolver(faixa)}</div> : (
        <div className="bol-rodape"><span>Primeira Igreja Evangélica Congregacional de Brasília</span><span>@1iecbsb · youtube.com/@iecbsb</span></div>
      )}
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
