import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle, Check, CircleDot, ExternalLink, Gavel, History, Landmark, Loader2, LogOut, Menu, Monitor, Newspaper, PanelRightClose, PanelRightOpen, Smartphone, Undo2, Upload, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import type { Conteudo } from "@/lib/conteudo";
import { CANAL_PREVIA } from "@/lib/contexto";
import { descartarRascunho, obterPainel, obterSessao, publicar, sair, salvarRascunho } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SECOES } from "@/components/painel/editores";
import { PainelUsuarios, PainelVersoes } from "@/components/painel/Extras";
import { ModuloBoletim } from "@/components/painel/boletim/ModuloBoletim";
import { Contorno, ModuloDeliberacao, ModuloFinancas } from "@/components/painel/Modulos";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  beforeLoad: async () => {
    const { sessao } = await obterSessao();
    if (!sessao) throw redirect({ to: "/admin/entrar" });
  },
  loader: () => obterPainel(),
  head: () => ({ meta: [{ title: "Painel do site" }, { name: "robots", content: "noindex" }] }),
  component: Painel,
  pendingComponent: () => <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-marca" /></div>,
});

type Estado = "salvo" | "pendente" | "salvando" | "erro";

function Painel() {
  const dados = Route.useLoaderData();
  const router = useRouter();
  const [publicado, setPublicado] = useState<Conteudo>(dados.publicado);
  const [c, setC] = useState<Conteudo>(dados.rascunho ?? dados.publicado);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [secao, setSecao] = useState("inicio");
  const [menuAberto, setMenuAberto] = useState(false);
  const [previaAberta, setPreviaAberta] = useState(true);
  const [celular, setCelular] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [resumo, setResumo] = useState("");
  const iframe = useRef<HTMLIFrameElement>(null);
  const primeira = useRef(true);
  const cRef = useRef(c);
  cRef.current = c;

  const mudar = useCallback((fn: (d: Conteudo) => void) => {
    setC((ant) => {
      const d = structuredClone(ant);
      fn(d);
      return d;
    });
  }, []);

  const pendentes = useMemo(() => JSON.stringify(c) !== JSON.stringify(publicado), [c, publicado]);

  // Salva o rascunho no servidor pouco depois de cada alteração.
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    setEstado("pendente");
    const t = setTimeout(async () => {
      setEstado("salvando");
      try {
        await salvarRascunho({ data: { conteudo: cRef.current } });
        setEstado("salvo");
      } catch (e) {
        setEstado("erro");
        if (e instanceof Error && /Sessão/.test(e.message)) toast.error(e.message);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [c]);

  // Avisa antes de sair com alterações não salvas.
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (estado === "pendente" || estado === "salvando") e.preventDefault(); };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [estado]);

  // Prévia ao vivo
  const enviarPrevia = useCallback(() => {
    iframe.current?.contentWindow?.postMessage({ tipo: CANAL_PREVIA, conteudo: cRef.current }, window.location.origin);
  }, []);
  useEffect(() => { enviarPrevia(); }, [c, enviarPrevia]);
  useEffect(() => {
    const f = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.tipo === `${CANAL_PREVIA}-pronta`) enviarPrevia(); };
    window.addEventListener("message", f);
    return () => window.removeEventListener("message", f);
  }, [enviarPrevia]);

  const def = SECOES.find((s) => s.id === secao);
  const caminhoPrevia = def?.previa ?? "/";
  const [base, ancora] = caminhoPrevia.split("#");
  const srcPrevia = `${base}?previa=1${ancora ? `#${ancora}` : ""}`;

  const fazerPublicacao = async () => {
    setPublicando(true);
    try {
      await publicar({ data: { conteudo: c, resumo } });
      setPublicado(structuredClone(c));
      setEstado("salvo");
      setDialogo(false);
      setResumo("");
      toast.success("Site publicado! As alterações já estão no ar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally { setPublicando(false); }
  };

  const descartar = async () => {
    if (!confirm("Descartar todas as alterações que ainda não foram publicadas?")) return;
    await descartarRascunho();
    primeira.current = true;
    setC(structuredClone(publicado));
    setEstado("salvo");
    toast("Alterações descartadas.");
  };

  const grupos = [
    { nome: "Site", itens: SECOES.filter((s) => s.grupo === "Site") },
    { nome: "Páginas", itens: SECOES.filter((s) => s.grupo === "Páginas") },
  ];
  const modulos = [
    { id: "boletim", rotulo: "Boletim", Icone: Newspaper, breve: false },
    { id: "deliberacao", rotulo: "Deliberação", Icone: Gavel, breve: false },
    { id: "financas", rotulo: "Finanças", Icone: Landmark, breve: true },
  ];
  const extras = [
    { id: "versoes", rotulo: "Versões e histórico", Icone: History },
    { id: "usuarios", rotulo: "Usuários e senha", Icone: Users },
  ];
  const tituloAtual = def?.rotulo ?? extras.find((x) => x.id === secao)?.rotulo ?? "";
  const moduloAtivo = modulos.some((m) => m.id === secao);
  const editorAtivo = !!def;

  const Navegacao = (
    <nav className="grid gap-6 p-4">
      <div>
        <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Igreja</p>
        <div className="mt-2 grid gap-0.5">
          {modulos.map(({ id, rotulo, Icone, breve }) => (
            <button key={id} type="button" onClick={() => { setSecao(id); setMenuAberto(false); }}
              className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-medium", secao === id ? "bg-marca text-white" : "text-slate-700 hover:bg-slate-100")}>
              <Icone size={15} /> {rotulo}
              {breve && <span className={cn("ml-auto rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase", secao === id ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800")}>Em breve</span>}
            </button>
          ))}
        </div>
      </div>
      {grupos.map((g) => (
        <div key={g.nome}>
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{g.nome}</p>
          <div className="mt-2 grid gap-0.5">
            {g.itens.map((s) => (
              <button key={s.id} type="button" onClick={() => { setSecao(s.id); setMenuAberto(false); }}
                className={cn("rounded-lg px-3 py-2 text-left text-[14px] font-medium", secao === s.id ? "bg-marca text-white" : "text-slate-700 hover:bg-slate-100")}>
                {s.rotulo}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="grid gap-0.5 border-t border-slate-200 pt-4">
        {extras.map(({ id, rotulo, Icone }) => (
          <button key={id} type="button" onClick={() => { setSecao(id); setMenuAberto(false); }}
            className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-medium", secao === id ? "bg-marca text-white" : "text-slate-700 hover:bg-slate-100")}>
            <Icone size={15} /> {rotulo}
          </button>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900 print:block print:h-auto print:bg-white" style={{ fontFamily: "var(--font-texto)" }}>
      {/* Barra superior */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-5 print:hidden">
        <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMenuAberto(true)} aria-label="Abrir menu"><Menu size={20} /></button>
        <img src="/simbolo.svg" alt="" className="hidden w-10 sm:block" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold">Painel do site</p>
          <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
            {estado === "salvando" && <><Loader2 size={12} className="animate-spin" /> Salvando rascunho…</>}
            {estado === "pendente" && <><CircleDot size={12} className="text-amber-500" /> Editando…</>}
            {estado === "erro" && <><AlertTriangle size={12} className="text-red-600" /> Rascunho não salvo — verifique a conexão</>}
            {estado === "salvo" && (pendentes ? <><CircleDot size={12} className="text-amber-500" /> Rascunho salvo · não publicado</> : <><Check size={12} className="text-emerald-600" /> Tudo publicado</>)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a href="/" target="_blank" rel="noopener" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 sm:inline-flex"><ExternalLink size={15} /> Ver site</a>
          {pendentes && <button onClick={descartar} className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 md:inline-flex"><Undo2 size={15} /> Descartar</button>}
          <button disabled={!pendentes} onClick={() => setDialogo(true)} title="Publicar as alterações do conteúdo do site" className="btn-destaque !px-4 !py-2.5 disabled:!bg-slate-300 disabled:!shadow-none"><Upload size={16} /> Publicar site</button>
          <button
            title={`Sair (${dados.sessao.nome})`}
            onClick={async () => { await sair(); router.navigate({ to: "/admin/entrar" }); }}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Sair"
          ><LogOut size={18} /></button>
        </div>
      </header>

      {dados.armazenamento === "memoria" && (
        <div className="bg-amber-100 px-5 py-2 text-[13px] text-amber-900">
          <strong>Banco de dados não conectado.</strong> As alterações ficam só na memória do servidor e podem se perder. Conecte o Neon na Vercel (Storage → Neon).
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Menu lateral */}
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:block print:!hidden">{Navegacao}</aside>
        {menuAberto && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden" onClick={() => setMenuAberto(false)}>
            <aside className="h-full w-72 overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end p-2"><button onClick={() => setMenuAberto(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Fechar"><X size={18} /></button></div>
              {Navegacao}
            </aside>
          </div>
        )}

        {/* Módulos da igreja */}
        {moduloAtivo && (
          <main className="relative min-w-0 flex-1 overflow-y-auto">
            {secao === "boletim" && <ModuloBoletim />}
            {secao === "deliberacao" && <Contorno><ModuloDeliberacao /></Contorno>}
            {secao === "financas" && <Contorno><ModuloFinancas /></Contorno>}
          </main>
        )}

        {/* Editor */}
        <main className={cn("min-w-0 flex-1 overflow-y-auto", moduloAtivo && "hidden")}>
          <div className="mx-auto grid max-w-3xl gap-5 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">{tituloAtual}</h1>
              {editorAtivo && (
                <button onClick={() => setPreviaAberta((v) => !v)} className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-white xl:inline-flex">
                  {previaAberta ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />} {previaAberta ? "Esconder prévia" : "Mostrar prévia"}
                </button>
              )}
            </div>
            {def && <def.Editor c={c} mudar={mudar} />}
            {secao === "versoes" && <PainelVersoes aoRestaurar={(v) => { setC(v); setSecao("inicio"); }} />}
            {secao === "usuarios" && <PainelUsuarios souAdmin={dados.sessao.papel === "admin"} meuUsuario={dados.sessao.usuario} />}
            {!dados.uploadsPermanentes && editorAtivo && (
              <p className="text-[12px] text-slate-500">Dica: conecte o Vercel Blob (Storage → Blob) para guardar as fotos fora do banco e deixar o site mais leve.</p>
            )}
          </div>
        </main>

        {/* Prévia ao vivo */}
        {editorAtivo && previaAberta && !moduloAtivo && (
          <section className="hidden w-[46%] shrink-0 flex-col border-l border-slate-200 bg-slate-200/60 xl:flex">
            <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
                <span className="size-2 rounded-full bg-emerald-500" /> Prévia ao vivo <span className="font-normal text-slate-400">{base}</span>
              </span>
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                <button onClick={() => setCelular(false)} className={cn("rounded-md p-1.5", !celular && "bg-white shadow-sm")} aria-label="Computador"><Monitor size={15} /></button>
                <button onClick={() => setCelular(true)} className={cn("rounded-md p-1.5", celular && "bg-white shadow-sm")} aria-label="Celular"><Smartphone size={15} /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-4">
              <div className={cn("mx-auto h-full overflow-hidden rounded-xl bg-white shadow-lg", celular ? "w-[390px]" : "w-full")}>
                {celular ? (
                  <iframe ref={iframe} key={srcPrevia} src={srcPrevia} title="Prévia do site" className="size-full border-0" />
                ) : (
                  <div className="relative size-full">
                    <iframe
                      ref={iframe}
                      key={srcPrevia}
                      src={srcPrevia}
                      title="Prévia do site"
                      className="absolute left-0 top-0 origin-top-left border-0"
                      style={{ width: "1366px", height: "166.67%", transform: "scale(var(--escala))" }}
                    />
                    <EscalaPrevia />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {dialogo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={() => !publicando && setDialogo(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Publicar alterações</h2>
            <p className="mt-1 text-[14px] text-slate-500">O site passa a mostrar o que está na prévia. Uma cópia da versão fica guardada no histórico.</p>
            <label className="mt-5 grid gap-1.5 text-[13px] font-semibold text-slate-700">
              O que mudou? (opcional)
              <input autoFocus value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Ex.: Horários de dezembro" className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-[14.5px] font-normal outline-none focus:border-marca" onKeyDown={(e) => e.key === "Enter" && fazerPublicacao()} />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button disabled={publicando} onClick={() => setDialogo(false)} className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button disabled={publicando} onClick={fazerPublicacao} className="btn-destaque !py-2.5">{publicando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Publicar agora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mantém a prévia de computador (1366 px) encolhida para caber no painel. */
function EscalaPrevia() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const caixa = ref.current?.parentElement;
    if (!caixa) return;
    const ajustar = () => {
      const escala = caixa.clientWidth / 1366;
      caixa.style.setProperty("--escala", String(escala));
      const fr = caixa.querySelector("iframe");
      if (fr) fr.style.height = `${caixa.clientHeight / escala}px`;
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(caixa);
    return () => ro.disconnect();
  }, []);
  return <span ref={ref} hidden />;
}
