/**
 * O painel fica aberto por horas; quando sai uma versão nova do site, a aba
 * aberta continua com o código antigo. Aqui o painel confere de tempos em
 * tempos (e ao voltar para a aba) e oferece atualizar.
 */
import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

const entrada = (html: string) => /\/assets\/index-[\w-]+\.js/.exec(html)?.[0] ?? null;

export function NovaVersao() {
  const [nova, setNova] = useState(false);
  useEffect(() => {
    const atual = entrada(document.documentElement.innerHTML) ?? [...document.scripts].map((s) => s.src).find((x) => /\/assets\/index-/.test(x))?.replace(location.origin, "") ?? null;
    if (!atual) return;
    let vivo = true;
    const conferir = async () => {
      try {
        const r = await fetch("/admin/entrar", { cache: "no-store", credentials: "same-origin" });
        const e = entrada(await r.text());
        if (vivo && e && e !== atual) setNova(true);
      } catch { /* sem conexão: tenta depois */ }
    };
    const t = setInterval(conferir, 4 * 60_000);
    const foco = () => { if (document.visibilityState === "visible") conferir(); };
    document.addEventListener("visibilitychange", foco);
    return () => { vivo = false; clearInterval(t); document.removeEventListener("visibilitychange", foco); };
  }, []);
  if (!nova) return null;
  return (
    <div role="status" className="fixed bottom-5 left-1/2 z-[80] flex w-[min(92vw,560px)] -translate-x-1/2 items-center gap-4 border-t-[3px] border-p-acento bg-p-superficie px-5 py-4 shadow-[0_24px_50px_-20px_rgba(0,42,71,.55)]">
      <RotateCw size={20} className="shrink-0 text-p-acento" />
      <p className="min-w-0 flex-1 text-[14px] text-p-texto"><strong>Há uma versão nova do painel.</strong> <span className="text-p-suave">Confira se aparece “Salvo” e atualize para usar as melhorias.</span></p>
      <button onClick={() => location.reload()} className="ef-btn ef-btn-pri !h-10 shrink-0">Atualizar</button>
    </div>
  );
}
