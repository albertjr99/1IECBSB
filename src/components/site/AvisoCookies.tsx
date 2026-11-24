/** Aviso de cookies (LGPD) e bloqueio de conteúdo de terceiros até o visitante permitir. */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, ExternalLink, MapPin, Play, X } from "lucide-react";
import { salvarConsentimento, useConsentimento } from "@/lib/consentimento";
import { cn } from "@/lib/utils";

export function AvisoCookies() {
  const c = useConsentimento();
  const [detalhes, setDetalhes] = useState(false);
  const [midia, setMidia] = useState(true);
  const visivel = c.pronto && (!c.decidido || c.preferenciasAbertas);

  useEffect(() => {
    if (c.preferenciasAbertas) { setDetalhes(true); setMidia(c.midia); }
  }, [c.preferenciasAbertas, c.midia]);

  if (!visivel) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookies e privacidade" className="aviso-cookies fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[460px]">
      <div className="border-t-[3px] border-marca bg-white/90 p-6 shadow-[0_24px_60px_-20px_rgba(0,42,71,0.45)] ring-1 ring-marca/10 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca text-white"><Cookie size={18} /></span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-marca">Sua privacidade importa</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-tinta">
              Usamos cookies essenciais para o site funcionar. Com a sua permissão, também carregamos vídeos do YouTube e mapas do Google, que podem gravar cookies próprios.{" "}
              <Link to="/privacidade" className="font-semibold text-marca underline underline-offset-2">Política de privacidade</Link>
            </p>
          </div>
          {c.decidido && <button type="button" aria-label="Fechar" onClick={() => salvarConsentimento(c.midia)} className="-mr-2 -mt-2 grid size-8 shrink-0 place-items-center rounded-full text-tinta-suave hover:bg-nevoa"><X size={16} /></button>}
        </div>

        {detalhes && (
          <div className="mt-5 grid gap-2 border-t border-linha pt-4">
            <Opcao titulo="Essenciais" texto="Guardam suas escolhas e mantêm o acesso à área administrativa. Não podem ser desligados." ligado fixo />
            <Opcao titulo="Vídeos e mapas" texto="YouTube (mensagens e transmissões) e Google Maps (como chegar)." ligado={midia} aoMudar={setMidia} />
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {detalhes ? (
            <button type="button" onClick={() => salvarConsentimento(midia)} className="btn-primario !h-10 flex-1 !px-4">Salvar escolhas</button>
          ) : (
            <>
              <button type="button" onClick={() => salvarConsentimento(true)} className="btn-primario !h-10 flex-1 !px-4">Aceitar todos</button>
              <button type="button" onClick={() => salvarConsentimento(false)} className="btn-contorno !h-10 flex-1 !px-4">Só essenciais</button>
              <button type="button" onClick={() => setDetalhes(true)} className="w-full pt-1 text-[12px] font-bold uppercase tracking-[0.14em] text-tinta-suave hover:text-marca">Personalizar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Opcao({ titulo, texto, ligado, fixo, aoMudar }: { titulo: string; texto: string; ligado: boolean; fixo?: boolean; aoMudar?: (v: boolean) => void }) {
  return (
    <label className={cn("flex items-start gap-4 p-2", !fixo && "cursor-pointer hover:bg-nevoa")}>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-tinta">{titulo}</span>
        <span className="block text-[12.5px] leading-snug text-tinta-suave">{texto}</span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={ligado} disabled={fixo} onChange={(e) => aoMudar?.(e.target.checked)} />
      <span aria-hidden className={cn("relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors", ligado ? "bg-marca" : "bg-linha", fixo && "opacity-60")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", ligado ? "left-[18px]" : "left-0.5")} />
      </span>
    </label>
  );
}

/** Mostra o conteúdo de terceiros só depois da permissão; antes, um convite para liberar. */
export function ConteudoExterno({ tipo, link, children, className }: { tipo: "video" | "mapa"; link?: string; children: ReactNode; className?: string }) {
  const c = useConsentimento();
  if (c.midia) return <>{children}</>;
  const video = tipo === "video";
  return (
    <div className={cn("absolute inset-0 grid place-items-center p-6 text-center", video ? "bg-marca-funda text-white" : "bg-nevoa text-tinta", className)}>
      <div className="max-w-sm">
        <span className={cn("mx-auto grid size-12 place-items-center rounded-full", video ? "bg-white/10" : "bg-marca text-white")}>{video ? <Play size={20} /> : <MapPin size={20} />}</span>
        <p className="mt-4 text-[14px] leading-relaxed opacity-85">
          {video ? "Para assistir aqui, permita o carregamento de vídeos do YouTube." : "Para ver o mapa aqui, permita o carregamento do Google Maps."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => salvarConsentimento(true)} className={video ? "btn-branco !h-10" : "btn-primario !h-10"}>Permitir e carregar</button>
          {link && <a href={link} target="_blank" rel="noopener noreferrer" className={cn("inline-flex h-10 items-center gap-1.5 px-3 text-[13px] font-semibold", video ? "text-white/80 hover:text-white" : "text-marca")}>{video ? "Abrir no YouTube" : "Abrir no Google Maps"} <ExternalLink size={14} /></a>}
        </div>
      </div>
    </div>
  );
}
