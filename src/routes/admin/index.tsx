import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle, Check, ChevronsLeft, ChevronsRight, CircleDot, Command, ExternalLink, Eye, EyeOff, Gavel, History, Landmark, Loader2,
  KeyRound, Lock, LogOut, Menu, Monitor, Moon, Newspaper, RotateCw, Search, Smartphone, Sun, Tablet, Undo2, Upload, Users, X, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Conteudo } from "@/lib/conteudo";
import { CANAL_PREVIA } from "@/lib/contexto";
import { criarMinhaSenha, descartarRascunho, obterPainel, obterSessao, publicar, sair, salvarRascunho } from "@/lib/api";
import { areaDoItem, pode, rotuloPapel, telaInicial } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import { SECOES } from "@/components/painel/editores";
import { JanelaMinhaSenha, PainelUsuarios, PainelVersoes } from "@/components/painel/Extras";
import { ModuloBoletim } from "@/components/painel/boletim/ModuloBoletim";
import { Contorno, ModuloDeliberacao, ModuloFinancas } from "@/components/painel/Modulos";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  beforeLoad: async () => {
    const { sessao } = await obterSessao();
    if (!sessao) throw redirect({ to: "/admin/entrar" });
  },
  loader: () => obterPainel(),
  head: () => ({ meta: [{ title: "Painel — 1ª IEC Brasília" }, { name: "robots", content: "noindex" }] }),
  component: Painel,
  pendingComponent: () => <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-marca" /></div>,
});

type Estado = "salvo" | "pendente" | "salvando" | "erro";
type Dispositivo = "computador" | "tablet" | "celular";

type ItemNav = { id: string; rotulo: string; Icone: LucideIcon; breve?: boolean; descricao?: string };

const MODULOS: ItemNav[] = [
  { id: "boletim", rotulo: "Boletim", Icone: Newspaper, descricao: "Boletim dominical no modelo da igreja." },
  { id: "deliberacao", rotulo: "Deliberação", Icone: Gavel, descricao: "Votação Online e Assembleia Online." },
  { id: "financas", rotulo: "Finanças", Icone: Landmark, breve: true, descricao: "Controle financeiro da igreja." },
];
const SISTEMA: ItemNav[] = [
  { id: "alteracoes", rotulo: "Controle de alterações", Icone: History, descricao: "Publicações, restauração e registro de atividades." },
  { id: "usuarios", rotulo: "Usuários", Icone: Users, descricao: "Quem acessa o painel e as permissões." },
];

// ─── Preferências locais (tema e menu) ──────────────────────────────────────

function usePreferencia<T extends string>(chave: string, inicial: () => T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(inicial);
  const set = useCallback((n: T) => {
    setV(n);
    try { localStorage.setItem(chave, n); } catch { /* sem armazenamento */ }
  }, [chave]);
  return [v, set];
}

const lerPref = (chave: string) => { try { return localStorage.getItem(chave); } catch { return null; } };

function Painel() {
  const dados = Route.useLoaderData();
  const router = useRouter();
  const [publicado, setPublicado] = useState<Conteudo>(dados.publicado);
  const [c, setC] = useState<Conteudo>(dados.rascunho ?? dados.publicado);
  const [estado, setEstado] = useState<Estado>("salvo");
  const papel = dados.sessao.papel;
  const liberado = useCallback((id: string) => pode(papel, areaDoItem(id)), [papel]);
  const [secao, setSecao] = useState(() => telaInicial(papel));
  const [minhaSenha, setMinhaSenha] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const [busca, setBusca] = useState(false);
  const [previaVisivel, setPreviaVisivel] = usePreferencia<"sim" | "nao">("iecb_painel_previa", () => (lerPref("iecb_painel_previa") as "sim" | "nao") ?? "sim");
  const [dispositivo, setDispositivo] = useState<Dispositivo>("computador");
  const [previaCheia, setPreviaCheia] = useState(false);
  const [recolhida, setRecolhida] = usePreferencia<"sim" | "nao">("iecb_painel_menu", () => (lerPref("iecb_painel_menu") as "sim" | "nao") ?? "nao");
  const [tema, setTema] = usePreferencia<"claro" | "escuro">("iecb_painel_tema", () => {
    const salvo = lerPref("iecb_painel_tema");
    if (salvo === "claro" || salvo === "escuro") return salvo;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
  });
  const [publicando, setPublicando] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [resumo, setResumo] = useState("");
  const [chavePrevia, setChavePrevia] = useState(0);
  const iframe = useRef<HTMLIFrameElement>(null);
  const primeira = useRef(true);
  const cRef = useRef(c);
  cRef.current = c;

  const mudar = useCallback((fn: (d: Conteudo) => void) => {
    setC((ant) => { const d = structuredClone(ant); fn(d); return d; });
  }, []);

  // seções com alterações ainda não publicadas
  const alteradas = useMemo(() => {
    const s = new Set<string>();
    for (const d of SECOES) if (d.chaves.some((k) => JSON.stringify(c[k]) !== JSON.stringify(publicado[k]))) s.add(d.id);
    return s;
  }, [c, publicado]);
  const pendentes = alteradas.size > 0;

  const salvarAgora = useCallback(async () => {
    setEstado("salvando");
    try { await salvarRascunho({ data: { conteudo: cRef.current } }); setEstado("salvo"); }
    catch (e) { setEstado("erro"); if (e instanceof Error && /Sessão/.test(e.message)) toast.error(e.message); }
  }, []);

  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    if (!pode(papel, "site")) return;
    setEstado("pendente");
    const t = setTimeout(salvarAgora, 1200);
    return () => clearTimeout(t);
  }, [c, salvarAgora]);

  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (estado === "pendente" || estado === "salvando") e.preventDefault(); };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [estado]);

  // atalhos: Ctrl+K busca, Ctrl+S salva agora
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setBusca(true); }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); salvarAgora().then(() => toast.success("Rascunho salvo.")); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [salvarAgora]);

  // prévia ao vivo
  const enviarPrevia = useCallback(() => {
    document.querySelectorAll<HTMLIFrameElement>("iframe[data-previa]").forEach((f) => f.contentWindow?.postMessage({ tipo: CANAL_PREVIA, conteudo: cRef.current }, window.location.origin));
  }, []);
  useEffect(() => { enviarPrevia(); }, [c, enviarPrevia]);
  useEffect(() => {
    const f = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.tipo === `${CANAL_PREVIA}-pronta`) enviarPrevia(); };
    window.addEventListener("message", f);
    return () => window.removeEventListener("message", f);
  }, [enviarPrevia]);

  const def = SECOES.find((s) => s.id === secao);
  const itemAtual: ItemNav | undefined = def ?? MODULOS.find((m) => m.id === secao) ?? SISTEMA.find((m) => m.id === secao);
  const caminhoPrevia = def?.previa ?? "/";
  const [base, ancora] = caminhoPrevia.split("#");
  const srcPrevia = `${base}?previa=1${ancora ? `#${ancora}` : ""}`;
  const ehModulo = MODULOS.some((m) => m.id === secao);
  const mostrarPrevia = !!def && previaVisivel === "sim";

  const fazerPublicacao = async () => {
    setPublicando(true);
    try {
      await publicar({ data: { conteudo: c, resumo } });
      setPublicado(structuredClone(c));
      setEstado("salvo");
      setDialogo(false);
      setResumo("");
      toast.success("Site publicado. As alterações já estão no ar.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível publicar."); }
    finally { setPublicando(false); }
  };

  const descartar = async () => {
    if (!confirm("Descartar todas as alterações que ainda não foram publicadas?")) return;
    await descartarRascunho();
    primeira.current = true;
    setC(structuredClone(publicado));
    setEstado("salvo");
    toast("Alterações descartadas.");
  };

  const ir = (id: string) => { if (!liberado(id)) return; setSecao(id); setGaveta(false); setBusca(false); };
  const menuRecolhido = recolhida === "sim";

  return (
    <div className={cn("painel flex h-screen overflow-hidden bg-p-fundo text-p-texto print:block print:h-auto", tema === "escuro" && "tema-escuro")} style={{ fontFamily: "var(--font-texto)" }}>
      {/* Menu lateral (computador) */}
      <Lateral
        className="hidden lg:flex"
        recolhida={menuRecolhido}
        aoRecolher={() => setRecolhida(menuRecolhido ? "nao" : "sim")}
        secao={secao}
        ir={ir}
        alteradas={alteradas}
        sessao={dados.sessao}
        tema={tema}
        aoTema={() => setTema(tema === "escuro" ? "claro" : "escuro")}
        aoSair={async () => { await sair(); router.navigate({ to: "/admin/entrar" }); }}
        aoBuscar={() => setBusca(true)}
        liberado={liberado}
        aoMinhaSenha={() => setMinhaSenha(true)}
      />
      {/* Menu lateral (celular) */}
      {gaveta && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setGaveta(false)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-[264px]">
            <Lateral
              className="flex h-full"
              recolhida={false}
              secao={secao}
              ir={ir}
              alteradas={alteradas}
              sessao={dados.sessao}
              tema={tema}
              aoTema={() => setTema(tema === "escuro" ? "claro" : "escuro")}
              aoSair={async () => { await sair(); router.navigate({ to: "/admin/entrar" }); }}
              aoBuscar={() => setBusca(true)}
              liberado={liberado}
              aoMinhaSenha={() => setMinhaSenha(true)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-p-borda bg-p-superficie px-3 sm:px-5 print:hidden">
          <button className="rounded-md p-2 text-p-texto-2 hover:bg-p-hover lg:hidden" onClick={() => setGaveta(true)} aria-label="Abrir menu"><Menu size={19} /></button>
          {itemAtual && <itemAtual.Icone size={17} className="hidden shrink-0 text-p-suave sm:block" />}
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight">{itemAtual?.rotulo}</h1>
            {itemAtual?.descricao && <p className="hidden truncate text-[12px] text-p-suave md:block">{itemAtual.descricao}</p>}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {!ehModulo && pode(papel, "site") && (
              <>
                <StatusSite estado={estado} alteradas={alteradas.size} />
                {def && (
                  <button
                    onClick={() => (window.innerWidth >= 1280 ? setPreviaVisivel(mostrarPrevia ? "nao" : "sim") : setPreviaCheia(true))}
                    className="hidden h-8 items-center gap-1.5 rounded-md border border-p-borda px-2.5 text-[13px] font-medium text-p-texto-2 hover:bg-p-hover sm:inline-flex"
                    title="Mostrar ou esconder a prévia"
                  >
                    {mostrarPrevia ? <EyeOff size={14} /> : <Eye size={14} />} Prévia
                  </button>
                )}
                {pendentes && (
                  <button onClick={descartar} className="hidden h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-p-texto-2 hover:bg-p-hover md:inline-flex" title="Descartar alterações não publicadas">
                    <Undo2 size={14} /> Descartar
                  </button>
                )}
                <button disabled={!pendentes} onClick={() => setDialogo(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-destaque px-3 text-[13px] font-semibold text-white hover:bg-destaque-escuro disabled:bg-p-hover disabled:text-p-suave">
                  <Upload size={14} /> Publicar
                </button>
              </>
            )}
          </div>
        </header>

        {dados.armazenamento === "memoria" && (
          <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[12.5px] text-amber-900 dark:text-amber-200 print:hidden">
            <AlertTriangle size={14} className="shrink-0" />
            <span>
              <strong>Banco de dados não encontrado neste deploy.</strong>{" "}
              Se o Neon já está conectado em Storage, falta um <strong>Redeploy</strong> (as variáveis só valem para deploys feitos depois) e conferir se o ambiente <strong>Production</strong> está marcado na conexão.
              {dados.variaveisBanco?.length ? <> Variáveis vistas: {dados.variaveisBanco.join(", ")}.</> : null}
            </span>
          </div>
        )}

        {/* Conteúdo (só depois que a pessoa cria a própria senha) */}
        {!dados.sessao.trocarSenha && <div className="flex min-h-0 flex-1">
          {ehModulo ? (
            <main className="relative min-w-0 flex-1 overflow-y-auto">
              {secao === "boletim" && liberado("boletim") && <ModuloBoletim />}
              {secao === "deliberacao" && liberado("deliberacao") && <Contorno><ModuloDeliberacao /></Contorno>}
              {secao === "financas" && liberado("financas") && <Contorno><ModuloFinancas /></Contorno>}
            </main>
          ) : (
            <>
              <main className={cn("min-w-0 overflow-y-auto", mostrarPrevia ? "flex-1 xl:w-[540px] xl:flex-none 2xl:w-[600px]" : "flex-1")}>
                <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:p-5", !mostrarPrevia && "mx-auto max-w-3xl sm:p-6")}>
                  {def && liberado(def.id) && <def.Editor c={c} mudar={mudar} />}
                  {secao === "alteracoes" && liberado("alteracoes") && <PainelVersoes podeRestaurar={pode(papel, "site")} aoRestaurar={(v) => { setC(v); setSecao("inicio"); }} />}
                  {secao === "usuarios" && liberado("usuarios") && <PainelUsuarios meuUsuario={dados.sessao.usuario} />}
                  {def && !dados.uploadsPermanentes && (
                    <p className="px-1 text-[12px] text-p-suave">Dica: conecte o Vercel Blob (Storage → Blob) para guardar as fotos fora do banco e deixar o site mais leve.</p>
                  )}
                </div>
              </main>
              {mostrarPrevia && (
                <section className="hidden min-w-0 flex-1 flex-col border-l border-p-borda bg-p-sutil xl:flex">
                  <BarraPrevia caminho={base ?? "/"} dispositivo={dispositivo} setDispositivo={setDispositivo} aoRecarregar={() => setChavePrevia((k) => k + 1)} aoAmpliar={() => setPreviaCheia(true)} />
                  <Previa key={`${srcPrevia}-${chavePrevia}-${dispositivo}`} ref={iframe} src={srcPrevia} dispositivo={dispositivo} />
                </section>
              )}
            </>
          )}
        </div>}
      </div>

      {/* Prévia em tela cheia */}
      {previaCheia && def && (
        <div className="fixed inset-0 z-50 flex flex-col bg-p-sutil">
          <BarraPrevia caminho={base ?? "/"} dispositivo={dispositivo} setDispositivo={setDispositivo} aoRecarregar={() => setChavePrevia((k) => k + 1)} aoFechar={() => setPreviaCheia(false)} />
          <Previa key={`cheia-${srcPrevia}-${chavePrevia}-${dispositivo}`} src={srcPrevia} dispositivo={dispositivo} />
        </div>
      )}

      {busca && <PaletaBusca aoFechar={() => setBusca(false)} ir={ir} alteradas={alteradas} liberado={liberado} />}
      {minhaSenha && <JanelaMinhaSenha aoFechar={() => setMinhaSenha(false)} />}
      {dados.sessao.trocarSenha && <CriarSenha nome={dados.sessao.nome} aoConcluir={() => router.invalidate()} />}

      {dialogo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => !publicando && setDialogo(false)}>
          <div className="w-full max-w-md rounded-xl border border-p-borda bg-p-superficie p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Publicar alterações</h2>
            <p className="mt-1 text-[13.5px] text-p-suave">O site passa a mostrar o que está na prévia. A versão anterior fica guardada no controle de alterações.</p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {SECOES.filter((s) => alteradas.has(s.id)).map((s) => (
                <li key={s.id} className="inline-flex items-center gap-1.5 rounded-md bg-p-hover px-2 py-1 text-[12.5px] text-p-texto-2"><s.Icone size={13} /> {s.rotulo}</li>
              ))}
            </ul>
            <label className="mt-5 grid gap-1.5 text-[12.5px] font-medium text-p-texto-2">
              Descrição da alteração (opcional)
              <input autoFocus value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Ex.: Horários de dezembro" className="h-9 rounded-md border border-p-borda-forte bg-p-superficie px-3 text-[14px] font-normal text-p-texto outline-none focus:border-p-acento focus:ring-3 focus:ring-p-acento/20" onKeyDown={(e) => e.key === "Enter" && fazerPublicacao()} />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button disabled={publicando} onClick={() => setDialogo(false)} className="h-9 rounded-md px-4 text-[13.5px] font-medium text-p-texto-2 hover:bg-p-hover">Cancelar</button>
              <button disabled={publicando} onClick={fazerPublicacao} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-destaque px-4 text-[13.5px] font-semibold text-white hover:bg-destaque-escuro">
                {publicando ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Publicar agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Status do conteúdo do site ─────────────────────────────────────────────

function StatusSite({ estado, alteradas }: { estado: Estado; alteradas: number }) {
  let conteudo: ReactNode;
  if (estado === "salvando") conteudo = <><Loader2 size={13} className="animate-spin" /> Salvando…</>;
  else if (estado === "pendente") conteudo = <><CircleDot size={13} className="text-amber-500" /> Editando…</>;
  else if (estado === "erro") conteudo = <><AlertTriangle size={13} className="text-red-500" /> Não salvo</>;
  else if (alteradas > 0) conteudo = <><CircleDot size={13} className="text-amber-500" /> {alteradas} {alteradas === 1 ? "seção alterada" : "seções alteradas"}</>;
  else conteudo = <><Check size={13} className="text-emerald-500" /> Tudo publicado</>;
  return <span className="mr-1 hidden items-center gap-1.5 text-[12.5px] text-p-suave sm:inline-flex">{conteudo}</span>;
}

// ─── Menu lateral ───────────────────────────────────────────────────────────

function Lateral({
  className, recolhida, aoRecolher, secao, ir, alteradas, sessao, tema, aoTema, aoSair, aoBuscar, liberado, aoMinhaSenha,
}: {
  className?: string; recolhida: boolean; aoRecolher?: () => void; secao: string; ir: (id: string) => void; alteradas: Set<string>;
  sessao: { nome: string; papel: string }; tema: "claro" | "escuro"; aoTema: () => void; aoSair: () => void; aoBuscar: () => void;
  liberado: (id: string) => boolean; aoMinhaSenha: () => void;
}) {
  const grupos: { titulo: string; itens: ItemNav[] }[] = [
    { titulo: "Igreja", itens: MODULOS },
    { titulo: "Conteúdo do site", itens: SECOES },
    { titulo: "Sistema", itens: SISTEMA },
  ];
  const iniciais = sessao.nome.split(" ").filter((p) => !/^(pr|pb|dc|dca|sem)\.?$/i.test(p)).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <aside className={cn("relative shrink-0 flex-col bg-p-lateral text-white/80 transition-[width] duration-200 print:hidden", recolhida ? "w-[68px]" : "w-[252px]", className)}>
      {/* marca */}
      <div className={cn("flex h-14 shrink-0 items-center gap-2.5 border-b border-white/[0.07]", recolhida ? "justify-center px-2" : "px-4")}>
        <img src="/simbolo-negativo.svg" alt="" className="w-9 shrink-0" />
        {!recolhida && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13.5px] font-semibold text-white">Painel</p>
            <p className="truncate text-[11.5px] text-white/50">1ª IEC Brasília</p>
          </div>
        )}
      </div>

      {/* busca */}
      <div className={cn("shrink-0 pt-3 [@media(max-height:800px)]:pt-2", recolhida ? "px-2.5" : "px-3")}>
        <button onClick={aoBuscar} title="Buscar (Ctrl+K)" className={cn("flex h-8 w-full [@media(max-height:800px)]:h-7 items-center gap-2 rounded-md bg-white/[0.06] text-[13px] text-white/55 hover:bg-white/10", recolhida ? "justify-center" : "px-2.5")}>
          <Search size={14} />
          {!recolhida && <><span className="flex-1 text-left">Buscar…</span><kbd className="flex items-center gap-0.5 text-[11px] text-white/40"><Command size={11} />K</kbd></>}
        </button>
      </div>

      {/* navegação */}
      <nav className={cn("flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3 [@media(max-height:800px)]:gap-2 [@media(max-height:800px)]:py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", recolhida ? "px-2.5" : "px-3")}>
        {grupos.map((g) => (
          <div key={g.titulo}>
            {recolhida ? <div className="mx-2 mb-1.5 border-t border-white/[0.07]" /> : <p className="mb-1 px-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/35 [@media(max-height:800px)]:mb-0.5">{g.titulo}</p>}
            <ul className="grid gap-px">
              {g.itens.map((it) => {
                const ativo = secao === it.id;
                const livre = liberado(it.id);
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => ir(it.id)}
                      disabled={!livre}
                      aria-disabled={!livre}
                      title={!livre ? `${it.rotulo} — fora do seu perfil de acesso` : recolhida ? `${it.rotulo}${it.breve ? " (em breve)" : ""}` : undefined}
                      className={cn(
                        "relative flex h-[30px] w-full items-center gap-2.5 rounded-md text-[13px] transition-colors [@media(max-height:800px)]:h-[26px]",
                        recolhida ? "justify-center" : "px-2",
                        !livre ? "cursor-not-allowed text-white/25" : ativo ? "bg-white/[0.12] font-medium text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      {ativo && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-destaque" style={recolhida ? { left: "-10px" } : undefined} />}
                      <it.Icone size={15} className="shrink-0" strokeWidth={1.8} />
                      {!recolhida && <span className="flex-1 truncate text-left">{it.rotulo}</span>}
                      {!recolhida && it.breve && livre && <span className="rounded border border-white/20 px-1 text-[9.5px] font-semibold uppercase tracking-wide text-white/50">breve</span>}
                      {!recolhida && !livre && <Lock size={11} className="shrink-0 text-white/25" aria-hidden />}
                      {livre && alteradas.has(it.id) && <span className={cn("size-1.5 shrink-0 rounded-full bg-amber-400", recolhida && "absolute right-2 top-1.5")} title="Alterações não publicadas" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* pessoa e ações */}
      <div className={cn("shrink-0 border-t border-white/[0.07]", recolhida ? "px-2.5 py-2.5" : "px-3 py-2.5")}>
        {!recolhida && (
          <div className="mb-2 flex items-center gap-2.5 px-1 [@media(max-height:760px)]:hidden">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-[12px] font-semibold text-white">{iniciais || "?"}</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-medium text-white">{sessao.nome}</span>
              <span className="block text-[11.5px] text-white/45">{rotuloPapel(sessao.papel)}</span>
            </span>
          </div>
        )}
        <div className={cn("flex gap-1", recolhida && "flex-col")}>
          <a href="/" target="_blank" rel="noopener" title="Ver o site" className="grid h-8 flex-1 place-items-center rounded-md text-white/60 hover:bg-white/[0.08] hover:text-white"><ExternalLink size={15} /></a>
          <button onClick={aoMinhaSenha} title="Minha senha" className="grid h-8 flex-1 place-items-center rounded-md text-white/60 hover:bg-white/[0.08] hover:text-white"><KeyRound size={15} /></button>
          <button onClick={aoTema} title={tema === "escuro" ? "Modo claro" : "Modo escuro"} className="grid h-8 flex-1 place-items-center rounded-md text-white/60 hover:bg-white/[0.08] hover:text-white">{tema === "escuro" ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button onClick={aoSair} title="Sair" className="grid h-8 flex-1 place-items-center rounded-md text-white/60 hover:bg-white/[0.08] hover:text-white"><LogOut size={15} /></button>
        </div>
      </div>

      {aoRecolher && (
        <button
          onClick={aoRecolher}
          aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
          title={recolhida ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-1/2 z-10 grid size-6 -translate-y-1/2 place-items-center rounded-full border border-p-borda bg-p-superficie text-p-suave shadow-sm hover:text-p-texto"
        >
          {recolhida ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </button>
      )}
    </aside>
  );
}

// ─── Primeiro acesso: criar a própria senha ─────────────────────────────────

function CriarSenha({ nome, aoConcluir }: { nome: string; aoConcluir: () => void }) {
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const forca = nova.length >= 12 ? 3 : nova.length >= 10 ? 2 : nova.length >= 8 ? 1 : 0;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#001d33]/70 p-4 backdrop-blur-md">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErro("");
          if (nova.length < 8) { setErro("A senha precisa ter ao menos 8 caracteres."); return; }
          if (nova !== confirma) { setErro("As duas senhas não são iguais."); return; }
          setEnviando(true);
          try { await criarMinhaSenha({ data: { nova } }); toast.success("Pronto! Sua senha foi criada."); aoConcluir(); }
          catch (err) { setErro(err instanceof Error ? err.message : "Não foi possível."); } finally { setEnviando(false); }
        }}
        className="w-full max-w-[420px] border-t-[3px] border-[#00436f] bg-p-superficie p-7 shadow-2xl"
      >
        <img src="/marca/logo-horizontal-colorida.svg" alt="1ª IEC Brasília" className="h-9 w-auto dark:hidden" />
        <h2 className="mt-6 text-[22px] font-bold leading-tight tracking-[-0.015em] text-p-texto">Bem-vindo, {nome.replace(/^(Pr|Pb|Dc|Dca|Sem)\.\s*/i, "").split(" ")[0]}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-p-texto-2">Você entrou com uma senha provisória. Crie agora a sua própria senha — só você vai saber.</p>
        <label className="mt-6 grid gap-1.5 text-[13px] font-semibold text-p-texto">
          Nova senha
          <input type="password" autoFocus autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} className="h-11 border border-p-borda-forte bg-p-superficie px-3 text-[15px] font-normal text-p-texto outline-none focus:border-p-acento focus:ring-3 focus:ring-p-acento/15" />
        </label>
        <div className="mt-2 flex gap-1" aria-hidden>{[1, 2, 3].map((n) => <span key={n} className={cn("h-1 flex-1", forca >= n ? (forca === 1 ? "bg-amber-400" : "bg-emerald-500") : "bg-p-borda")} />)}</div>
        <p className="mt-1 text-[12px] text-p-suave">Mínimo de 8 caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar.</p>
        <label className="mt-4 grid gap-1.5 text-[13px] font-semibold text-p-texto">
          Repita a nova senha
          <input type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} className="h-11 border border-p-borda-forte bg-p-superficie px-3 text-[15px] font-normal text-p-texto outline-none focus:border-p-acento focus:ring-3 focus:ring-p-acento/15" />
        </label>
        {erro && <p className="mt-3 text-[13px] font-semibold text-red-600 dark:text-red-400">{erro}</p>}
        <button disabled={enviando} className="btn-primario mt-6 !h-11 w-full !text-[13.5px]">{enviando && <Loader2 size={16} className="animate-spin" />} Criar minha senha e entrar</button>
      </form>
    </div>
  );
}

// ─── Busca rápida (Ctrl+K) ──────────────────────────────────────────────────

function PaletaBusca({ aoFechar, ir, alteradas, liberado }: { aoFechar: () => void; ir: (id: string) => void; alteradas: Set<string>; liberado: (id: string) => boolean }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const todos: (ItemNav & { grupo: string })[] = [
    ...MODULOS.map((m) => ({ ...m, grupo: "Igreja" })),
    ...SECOES.map((s) => ({ ...s, grupo: "Conteúdo do site" })),
    ...SISTEMA.map((s) => ({ ...s, grupo: "Sistema" })),
  ];
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = todos.filter((t) => liberado(t.id) && (!q || norm(`${t.rotulo} ${t.descricao ?? ""}`).includes(norm(q))));
  useEffect(() => setSel(0), [q]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40 px-4 pt-[12vh]" onClick={aoFechar}>
      <div className="h-fit w-full max-w-lg overflow-hidden rounded-xl border border-p-borda bg-p-superficie shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-p-borda px-4">
          <Search size={16} className="text-p-suave" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") aoFechar();
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, lista.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter" && lista[sel]) ir(lista[sel]!.id);
            }}
            placeholder="Ir para… (ex.: eventos, boletim, cores)"
            className="h-12 flex-1 bg-transparent text-[14.5px] text-p-texto outline-none placeholder:text-p-suave"
          />
          <kbd className="rounded border border-p-borda px-1.5 text-[11px] text-p-suave">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1.5">
          {lista.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-p-suave">Nada encontrado.</li>}
          {lista.map((t, i) => (
            <li key={t.id}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => ir(t.id)}
                className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left", i === sel ? "bg-p-realce" : "")}
              >
                <t.Icone size={16} className="shrink-0 text-p-suave" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-p-texto">{t.rotulo}</span>
                  {t.descricao && <span className="block truncate text-[12px] text-p-suave">{t.descricao}</span>}
                </span>
                {alteradas.has(t.id) && <span className="size-1.5 rounded-full bg-amber-400" />}
                <span className="text-[11px] text-p-suave">{t.grupo}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Prévia ─────────────────────────────────────────────────────────────────

function BarraPrevia({ caminho, dispositivo, setDispositivo, aoRecarregar, aoAmpliar, aoFechar }: {
  caminho: string; dispositivo: Dispositivo; setDispositivo: (d: Dispositivo) => void; aoRecarregar: () => void; aoAmpliar?: () => void; aoFechar?: () => void;
}) {
  const opcoes: { id: Dispositivo; Icone: LucideIcon; rotulo: string }[] = [
    { id: "computador", Icone: Monitor, rotulo: "Computador" },
    { id: "tablet", Icone: Tablet, rotulo: "Tablet" },
    { id: "celular", Icone: Smartphone, rotulo: "Celular" },
  ];
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-p-borda bg-p-superficie px-3">
      <span className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px] text-p-suave">
        <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="font-medium text-p-texto-2">Prévia ao vivo</span>
        <span className="truncate rounded bg-p-hover px-1.5 py-0.5 font-mono text-[11.5px]">{caminho}</span>
      </span>
      <div className="flex rounded-md bg-p-hover p-0.5">
        {opcoes.map((o) => (
          <button key={o.id} onClick={() => setDispositivo(o.id)} title={o.rotulo} aria-label={o.rotulo} className={cn("grid h-7 w-8 place-items-center rounded text-p-suave", dispositivo === o.id && "bg-p-superficie text-p-texto shadow-sm")}>
            <o.Icone size={14} />
          </button>
        ))}
      </div>
      <button onClick={aoRecarregar} title="Recarregar" className="grid size-8 place-items-center rounded-md text-p-suave hover:bg-p-hover hover:text-p-texto"><RotateCw size={14} /></button>
      <a href={caminho} target="_blank" rel="noopener" title="Abrir a página publicada em nova aba" className="grid size-8 place-items-center rounded-md text-p-suave hover:bg-p-hover hover:text-p-texto"><ExternalLink size={14} /></a>
      {aoAmpliar && <button onClick={aoAmpliar} title="Tela cheia" className="grid size-8 place-items-center rounded-md text-p-suave hover:bg-p-hover hover:text-p-texto"><Monitor size={14} /></button>}
      {aoFechar && <button onClick={aoFechar} title="Fechar" className="grid size-8 place-items-center rounded-md text-p-suave hover:bg-p-hover hover:text-p-texto"><X size={16} /></button>}
    </div>
  );
}

const LARGURA_DISPOSITIVO: Record<Dispositivo, number> = { computador: 1366, tablet: 820, celular: 390 };

/** A página real do site, encolhida para caber na área da prévia. */
const Previa = ({ src, dispositivo, ref }: { src: string; dispositivo: Dispositivo; ref?: React.Ref<HTMLIFrameElement> }) => {
  const caixa = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [altura, setAltura] = useState(800);
  const largura = LARGURA_DISPOSITIVO[dispositivo];

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ajustar = () => {
      const disponivel = el.clientWidth - 32;
      const e = Math.min(1, disponivel / largura);
      setEscala(e);
      setAltura((el.clientHeight - 32) / e);
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [largura]);

  return (
    <div ref={caixa} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className={cn("absolute left-1/2 top-4 origin-top overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_-8px_rgba(0,0,0,0.25)]", dispositivo === "computador" ? "rounded-md" : "rounded-[18px]")}
        style={{ width: largura, height: altura, transform: `translateX(-50%) scale(${escala})` }}
      >
        <iframe ref={ref} data-previa src={src} title="Prévia do site" className="size-full border-0" />
      </div>
    </div>
  );
};
