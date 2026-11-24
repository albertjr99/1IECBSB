import { useLayoutEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Texto que sempre cabe numa linha: se não couber, a letra diminui só o
 * necessário (até `minimo` do tamanho original). Usado em nomes, que ficam
 * feios quebrados ao meio.
 */
export function UmaLinha({ children, como: Tag = "span", className, minimo = 0.72 }: { children: ReactNode; como?: ElementType; className?: string; minimo?: number }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ajustar = () => {
      el.style.fontSize = "";
      const base = parseFloat(getComputedStyle(el).fontSize);
      const disponivel = el.clientWidth;
      const preciso = el.scrollWidth;
      if (disponivel > 0 && preciso > disponivel) el.style.fontSize = `${Math.max(base * minimo, (base * disponivel) / preciso - 0.2)}px`;
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el.parentElement ?? el);
    document.fonts?.ready.then(ajustar);
    return () => ro.disconnect();
  }, [children, minimo]);
  return <Tag ref={ref} className={cn("block overflow-hidden text-ellipsis whitespace-nowrap", className)}>{children}</Tag>;
}
