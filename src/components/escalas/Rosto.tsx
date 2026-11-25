import { cn } from "@/lib/utils";
import { iniciais } from "@/components/painel/Avatar";

/** Foto que a pessoa escolheu no app (ou as iniciais). */
export function Rosto({ id, nome, foto, tam = 36, className }: { id?: string; nome: string; foto?: string; tam?: number; className?: string }) {
  if (id && foto) return <img src={`/api/foto/${id}?v=${foto}`} alt="" width={tam} height={tam} loading="lazy" className={cn("shrink-0 rounded-full object-cover bg-[var(--a-realce)]", className)} style={{ width: tam, height: tam }} />;
  return <span className={cn("grid shrink-0 place-items-center rounded-full bg-[#00436f] font-bold text-white", className)} style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.36) }} aria-hidden>{iniciais(nome)}</span>;
}
