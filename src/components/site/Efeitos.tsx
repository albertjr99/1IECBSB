/**
 * Efeitos do site público, num só lugar e por delegação de eventos:
 * - [data-tilt]: inclinação 3D que segue o mouse, com reflexo de luz;
 * - áreas escuras (.grafismo-monte-escuro, [data-luz]): brilho que acompanha o cursor;
 * - botões: leve efeito magnético;
 * - entrada suave dos blocos ao rolar (só o que está abaixo da dobra, para não piscar);
 * - barra de progresso da leitura e cabeçalho em vidro ao rolar.
 * Tudo se desliga com "reduzir movimento" do sistema e em telas de toque.
 */
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const BOTOES = ".btn-primario, .btn-destaque, .btn-contorno, .btn-branco, .btn-claro";

export function Efeitos() {
  const caminho = useRouterState({ select: (s) => s.location.pathname });

  // ponteiro: inclinação, luz e ímã
  useEffect(() => {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fino = window.matchMedia("(pointer: fine)").matches;
    document.documentElement.classList.add("efeitos");
    if (reduzir || !fino) return;
    let atual: HTMLElement | null = null;
    let botao: HTMLElement | null = null;
    let quadro = 0;
    let ultimo: PointerEvent | null = null;

    const soltar = (el: HTMLElement | null) => {
      if (!el) return;
      el.classList.remove("inclinando");
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    };
    const processar = () => {
      quadro = 0;
      const e = ultimo;
      if (!e) return;
      const alvo = e.target as HTMLElement;
      const t = alvo.closest?.<HTMLElement>("[data-tilt]") ?? null;
      if (t !== atual) { soltar(atual); atual = t; }
      if (t) {
        const r = t.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        const max = Number(t.dataset.tilt) || 6;
        t.classList.add("inclinando");
        t.style.setProperty("--rx", `${((0.5 - py) * max).toFixed(2)}deg`);
        t.style.setProperty("--ry", `${((px - 0.5) * max).toFixed(2)}deg`);
        t.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        t.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      }
      const luz = alvo.closest?.<HTMLElement>(".grafismo-monte-escuro, [data-luz]");
      if (luz) {
        const r = luz.getBoundingClientRect();
        luz.style.setProperty("--sx", `${e.clientX - r.left}px`);
        luz.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }
      const b = alvo.closest?.<HTMLElement>(BOTOES) ?? null;
      if (b !== botao) { botao?.style.removeProperty("--bx"); botao?.style.removeProperty("--by"); botao = b; }
      if (b) {
        const r = b.getBoundingClientRect();
        b.style.setProperty("--bx", `${((e.clientX - r.left - r.width / 2) / r.width) * 6}px`);
        b.style.setProperty("--by", `${((e.clientY - r.top - r.height / 2) / r.height) * 5}px`);
      }
    };
    const mover = (e: PointerEvent) => { ultimo = e; if (!quadro) quadro = requestAnimationFrame(processar); };
    const sair = () => { soltar(atual); atual = null; };
    document.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerleave", sair);
    return () => { document.removeEventListener("pointermove", mover); document.removeEventListener("pointerleave", sair); cancelAnimationFrame(quadro); };
  }, []);

  // rolagem: progresso e cabeçalho
  useEffect(() => {
    const raiz = document.documentElement;
    let quadro = 0;
    const atualizar = () => {
      quadro = 0;
      const max = raiz.scrollHeight - window.innerHeight;
      raiz.style.setProperty("--progresso", String(max > 0 ? window.scrollY / max : 0));
      raiz.toggleAttribute("data-rolou", window.scrollY > 24);
    };
    const rolar = () => { if (!quadro) quadro = requestAnimationFrame(atualizar); };
    atualizar();
    window.addEventListener("scroll", rolar, { passive: true });
    window.addEventListener("resize", rolar);
    return () => { window.removeEventListener("scroll", rolar); window.removeEventListener("resize", rolar); };
  }, []);

  // entrada dos blocos a cada página
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let io: IntersectionObserver | null = null;
    const t = setTimeout(() => {
      const alvos: HTMLElement[] = [];
      const dobra = window.innerHeight * 0.92;
      document.querySelectorAll<HTMLElement>("main .container-site > *").forEach((el) => {
        if (el.closest(".cal-palco, [data-sem-revelar]")) return;
        const grade = el.children.length > 1 && /(^|\s)(grid|flex)(\s|$)/.test(el.className) && el.children.length <= 16 && !el.matches("p, h1, h2, h3");
        const itens = grade ? Array.from(el.children) as HTMLElement[] : [el];
        itens.forEach((x, i) => {
          if (x.getBoundingClientRect().top < dobra) return;
          x.style.setProperty("--atraso", `${Math.min(i, 6) * 80}ms`);
          x.classList.add("revelar");
          alvos.push(x);
        });
      });
      io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        el.classList.add("visivel");
        io?.unobserve(el);
        // depois da entrada, tira as classes para não atrapalhar outros efeitos
        setTimeout(() => { el.classList.remove("revelar", "visivel"); el.style.removeProperty("--atraso"); }, 1400);
      }), { rootMargin: "0px 0px -8% 0px" });
      alvos.forEach((a) => io!.observe(a));
    }, 60);
    return () => { clearTimeout(t); io?.disconnect(); };
  }, [caminho]);

  return <div aria-hidden className="barra-progresso" />;
}
