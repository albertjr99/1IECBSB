/**
 * Dentro da prévia do painel (iframe com ?previa=1): mostra onde a pessoa
 * está mexendo. O painel manda o texto (ou a foto) do campo em edição; aqui
 * achamos esse trecho na página, rolamos até ele e desenhamos uma moldura
 * "Editando". A posição volta para o painel, que aproxima a prévia.
 */
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

let moldura: HTMLDivElement | null = null;
let alvo: HTMLElement | null = null;
let quadro = 0;

function garantirMoldura() {
  if (moldura) return moldura;
  const m = document.createElement("div");
  m.setAttribute("data-foco-previa", "");
  m.innerHTML = '<span style="position:absolute;left:-2px;top:-22px;height:20px;display:inline-flex;align-items:center;gap:6px;padding:0 8px;background:#00436f;color:#fff;font:700 10px/1 Montserrat,sans-serif;letter-spacing:.16em;text-transform:uppercase;white-space:nowrap"><span style="width:6px;height:6px;border-radius:9999px;background:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.25)"></span>Editando</span>';
  Object.assign(m.style, {
    position: "absolute", zIndex: "2147483000", pointerEvents: "none",
    outline: "2px solid #00436f", outlineOffset: "4px",
    boxShadow: "0 0 0 9px rgba(0,67,111,.12), 0 20px 50px -20px rgba(0,42,71,.45)",
    background: "rgba(217,230,239,.16)",
    transition: "top .35s cubic-bezier(.2,.8,.2,1), left .35s cubic-bezier(.2,.8,.2,1), width .35s, height .35s, opacity .25s",
    opacity: "0",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(m);
  moldura = m;
  return m;
}

function posicionar() {
  if (!moldura || !alvo || !alvo.isConnected) return;
  const r = alvo.getBoundingClientRect();
  Object.assign(moldura.style, { top: `${r.top + window.scrollY}px`, left: `${r.left + window.scrollX}px`, width: `${r.width}px`, height: `${r.height}px`, opacity: "1" });
}

function acompanhar() {
  cancelAnimationFrame(quadro);
  const fim = performance.now() + 1200;
  const passo = () => { posicionar(); if (performance.now() < fim) quadro = requestAnimationFrame(passo); };
  passo();
}

function blocoDe(el: HTMLElement) {
  let e: HTMLElement | null = el;
  while (e && e !== document.body) {
    const d = getComputedStyle(e).display;
    if (!d.startsWith("inline") && e.getBoundingClientRect().height >= 14) return e;
    e = e.parentElement;
  }
  return el;
}

function acharTexto(texto: string): HTMLElement | null {
  const agulha = norm(texto).slice(0, 48);
  if (agulha.length < 3) return null;
  for (const raiz of [document.querySelector("main"), document.body]) {
    if (!raiz) continue;
    let melhor: HTMLElement | null = null;
    let tamanho = Infinity;
    for (const el of Array.from(raiz.querySelectorAll<HTMLElement>("*"))) {
      if (el.closest("[data-foco-previa], script, style, noscript")) continue;
      const t = el.textContent ?? "";
      if (t.length >= tamanho || t.length < agulha.length) continue;
      if (!norm(t).includes(agulha)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      melhor = el;
      tamanho = t.length;
    }
    if (melhor) return blocoDe(melhor);
  }
  return null;
}

function acharImagem(url: string): HTMLElement | null {
  if (!url) return null;
  const chave = url.startsWith("data:") ? url.slice(0, 120) : url;
  for (const img of Array.from(document.querySelectorAll("img"))) {
    if (img.src.startsWith(chave) || img.getAttribute("src") === url) return blocoDe(img);
  }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("main *"))) {
    if (el.style.backgroundImage.includes(chave.slice(0, 80))) return el;
  }
  return null;
}

export function focarNaPrevia(dados: { texto?: string; imagem?: string }, canal: string) {
  const el = (dados.imagem && acharImagem(dados.imagem)) || (dados.texto && acharTexto(dados.texto)) || null;
  if (!el) return;
  const mudou = el !== alvo;
  alvo = el;
  garantirMoldura();
  const r = el.getBoundingClientRect();
  const fora = r.top < 60 || r.bottom > window.innerHeight - 40;
  if (mudou || fora) el.scrollIntoView({ block: r.height > window.innerHeight * 0.7 ? "start" : "center", behavior: mudou ? "smooth" : "auto" });
  acompanhar();
  setTimeout(() => {
    if (alvo !== el) return;
    const q = el.getBoundingClientRect();
    window.parent.postMessage({ tipo: `${canal}-posicao`, x: q.left, y: q.top, w: q.width, h: q.height, vw: window.innerWidth, vh: window.innerHeight }, window.location.origin);
  }, mudou ? 520 : 60);
}

export function soltarFoco() {
  alvo = null;
  if (moldura) moldura.style.opacity = "0";
}

export function instalarFocoPrevia(canal: string) {
  const ouvir = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return;
    if (e.data?.tipo === `${canal}-foco`) requestAnimationFrame(() => setTimeout(() => focarNaPrevia(e.data, canal), 40));
    if (e.data?.tipo === `${canal}-solta`) soltarFoco();
  };
  const reposicionar = () => posicionar();
  window.addEventListener("message", ouvir);
  window.addEventListener("scroll", reposicionar, { passive: true });
  window.addEventListener("resize", reposicionar);
  return () => {
    window.removeEventListener("message", ouvir);
    window.removeEventListener("scroll", reposicionar);
    window.removeEventListener("resize", reposicionar);
  };
}
