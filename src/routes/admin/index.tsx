import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
  CalendarCheck,
  AlertTriangle, Check, ChevronsLeft, ChevronsRight, CircleDot, Command, ExternalLink, Eye, EyeOff, Gavel, History, Landmark, Loader2,
  BookHeart, KeyRound, LifeBuoy, Lock, LogOut, PenTool, Menu, Monitor, Moon, Newspaper, RotateCw, Search, Smartphone, Sun, Tablet, Undo2, Upload, Users, X, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Conteudo } from "@/lib/conteudo";
import { CANAL_PREVIA } from "@/lib/contexto";
import { criarMinhaSenha, descartarRascunho, obterPainel, obterSessao, publicar, sair, salvarRascunho } from "@/lib/api";
import { areaDoItem, pode, rotuloPapel, telaInicial } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import { SECOES } from "@/components/painel/editores";
import { JanelaPerfil, PainelUsuarios, PainelVersoes } from "@/components/painel/Extras";
import { ModuloSuporte } from "@/components/painel/ModuloSuporte";
import { ModuloMembros } from "@/components/painel/ModulosApp";
import { ModuloEscalas } from "@/components/painel/ModuloEscalas";
import { NovaVersao } from "@/components/painel/NovaVersao";
import { Avatar } from "@/components/painel/Avatar";
import { ModuloBoletim } from "@/components/painel/boletim/ModuloBoletim";
import { Contorno, ModuloAgentes, ModuloDeliberacao, ModuloFinancas } from "@/components/painel/Modulos";
import "@/components/painel/boletim/editor.css";

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
  { id: "membros", rotulo: "Membros do app", Icone: Smartphone, descricao: "Cadastro, aprovação e acesso ao aplicativo dos membros." },
  { id: "escalas", rotulo: "Ministérios e escalas", Icone: CalendarCheck, descricao: "Ministérios, funções, liderança e escalas de serviço." },
  { id: "deliberacao", rotulo: "Deliberação", Icone: Gavel, descricao: "Votação Online e Assembleia Online." },
  { id: "financas", rotulo: "Finanças", Icone: Landmark, breve: true, descricao: "Controle financeiro da igreja (em breve)." },
];
const CRIACAO: ItemNav[] = [
  { id: "agentes", rotulo: "Agentes de IA", Icone: PenTool, breve: true, descricao: "Gratia Ars: artes no padrão visual da igreja." },
];
const SISTEMA: ItemNav[] = [
  { id: "suporte", rotulo: "Suporte de TI", Icone: LifeBuoy, descricao: "Chamados para a equipe da GRATIA." },
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
  // a prévia acompanha o campo em edição: rola, destaca e aproxima
  const [foco, setFoco] = useState<Foco | null>(null);
  const formulario = useRef<HTMLElement>(null);
  useEffect(() => {
    const raiz = formulario.current;
    if (!raiz) return;
    let t = 0;
    let soltar = 0;
    const mandar = (dados: Record<string, string>) => document.querySelectorAll<HTMLIFrameElement>("iframe[data-previa]").forEach((f) => f.contentWindow?.postMessage({ tipo: `${CANAL_PREVIA}-foco`, ...dados }, window.location.origin));
    const ler = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      if (!e) return null;
      if (e instanceof HTMLInputElement && ["text", "email", "url", "search", ""].includes(e.type)) return e.value;
      if (e instanceof HTMLTextAreaElement) return e.value;
      if (e.isContentEditable) return e.textContent ?? "";
      return null;
    };
    const aoMexer = (ev: Event) => {
      const v = ler(ev.target);
      const img = (ev.target as HTMLElement | null)?.closest?.("[data-imagem-campo]")?.getAttribute("data-imagem-campo");
      if (v === null && !img) return;
      clearTimeout(soltar);
      clearTimeout(t);
      const linha = (v ?? "").split("\n").map((x) => x.trim()).find((x) => x.length >= 3) ?? "";
      t = window.setTimeout(() => mandar(img ? { imagem: img } : { texto: linha }), ev.type === "input" ? 260 : 60);
    };
    const aoSair = () => {
      clearTimeout(soltar);
      soltar = window.setTimeout(() => {
        if (raiz.contains(document.activeElement) && ler(document.activeElement) !== null) return;
        setFoco(null);
        document.querySelectorAll<HTMLIFrameElement>("iframe[data-previa]").forEach((f) => f.contentWindow?.postMessage({ tipo: `${CANAL_PREVIA}-solta` }, window.location.origin));
      }, 1500);
    };
    raiz.addEventListener("focusin", aoMexer);
    raiz.addEventListener("input", aoMexer);
    raiz.addEventListener("pointerenter", aoMexer, true);
    raiz.addEventListener("focusout", aoSair);
    return () => { raiz.removeEventListener("focusin", aoMexer); raiz.removeEventListener("input", aoMexer); raiz.removeEventListener("pointerenter", aoMexer, true); raiz.removeEventListener("focusout", aoSair); };
  }, [secao]);
  useEffect(() => {
    const f = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.tipo === `${CANAL_PREVIA}-posicao`) setFoco({ x: e.data.x, y: e.data.y, w: e.data.w, h: e.data.h }); };
    window.addEventListener("message", f);
    return () => window.removeEventListener("message", f);
  }, []);
  useEffect(() => setFoco(null), [secao]);

  useEffect(() => {
    const f = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.tipo === `${CANAL_PREVIA}-pronta`) enviarPrevia(); };
    window.addEventListener("message", f);
    return () => window.removeEventListener("message", f);
  }, [enviarPrevia]);

  const def = SECOES.find((s) => s.id === secao);
  const itemAtual: ItemNav | undefined = def ?? [...MODULOS, ...CRIACAO, ...SISTEMA].find((m) => m.id === secao);
  const grupoAtual = def ? "Conteúdo do site" : MODULOS.some((m) => m.id === secao) ? "Igreja" : CRIACAO.some((m) => m.id === secao) ? "Criação" : "Sistema";
  const caminhoPrevia = def?.previa ?? "/";
  const [base, ancora] = caminhoPrevia.split("#");
  const srcPrevia = `${base}?previa=1${ancora ? `#${ancora}` : ""}`;
  const ehModulo = [...MODULOS, ...CRIACAO].some((m) => m.id === secao) || secao === "suporte";
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
  // telas que usam a largura toda (boletim, edição com prévia) recolhem o menu sozinhas
  const telaLarga = secao === "boletim" || (!!def && mostrarPrevia);
  const [abertoNaMarra, setAbertoNaMarra] = useState(false);
  useEffect(() => setAbertoNaMarra(false), [secao]);
  const menuRecolhido = recolhida === "sim" || (telaLarga && !abertoNaMarra);

  return (
    <div className={cn("painel ef flex h-screen overflow-hidden bg-p-fundo text-p-texto print:block print:h-auto", tema === "escuro" && "tema-escuro")} style={{ fontFamily: "var(--font-texto)" }}>
      <NovaVersao />
      {/* Menu lateral (computador) */}
      <Lateral
        className="hidden lg:flex"
        recolhida={menuRecolhido}
        aoRecolher={() => {
          if (telaLarga) { setAbertoNaMarra(menuRecolhido); return; }
          setRecolhida(menuRecolhido ? "nao" : "sim");
        }}
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
        <header className="ef-vidro relative z-20 flex h-[60px] shrink-0 items-center gap-3 px-3 sm:px-6 print:hidden">
          <button className="p-2 text-p-texto-2 hover:bg-p-hover lg:hidden" onClick={() => setGaveta(true)} aria-label="Abrir menu"><Menu size={19} /></button>
          <nav aria-label="Você está em" className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="ef-sobre !text-[10px] hidden sm:inline-flex">{grupoAtual}</span>
            <span className="hidden text-p-borda-forte sm:inline">/</span>
            <h1 className="truncate font-bold text-p-texto">{itemAtual?.rotulo}</h1>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setMinhaSenha(true)} title="Meu perfil" className="order-last ml-2 hidden items-center gap-2.5 border-l border-p-borda pl-4 text-left md:flex">
              <span className="leading-tight">
                <span className="block max-w-[160px] truncate text-[13px] font-bold text-p-texto">{dados.sessao.nome}</span>
                <span className="block text-[11px] text-p-suave">{rotuloPapel(papel)}</span>
              </span>
              <Avatar nome={dados.sessao.nome} foto={dados.sessao.foto} tamanho={34} />
            </button>
            {!ehModulo && pode(papel, "site") && (
              <>
                <StatusSite estado={estado} alteradas={alteradas.size} />
                {def && (
                  <button
                    onClick={() => (window.innerWidth >= 1280 ? setPreviaVisivel(mostrarPrevia ? "nao" : "sim") : setPreviaCheia(true))}
                    className="ef-btn ef-btn-sec !hidden !h-9 !px-3 sm:!inline-flex"
                    title="Mostrar ou esconder a prévia"
                  >
                    {mostrarPrevia ? <EyeOff size={14} /> : <Eye size={14} />} Prévia
                  </button>
                )}
                {pendentes && (
                  <button onClick={descartar} className="ef-btn ef-btn-fantasma !hidden !h-9 md:!inline-flex" title="Descartar alterações não publicadas">
                    <Undo2 size={14} /> Descartar
                  </button>
                )}
                <button disabled={!pendentes} onClick={() => setDialogo(true)} className="ef-btn ef-btn-pri !h-9 !px-4" title={pendentes ? "Colocar as alterações no ar" : "Nada para publicar"}>
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
            <main className="ef-mesa relative min-w-0 flex-1 overflow-y-auto">
              {secao === "agentes" && liberado("agentes") && <ModuloAgentes />}
              {secao === "membros" && liberado("membros") && <ModuloMembros />}
              {secao === "escalas" && liberado("escalas") && <ModuloEscalas />}
              {secao === "suporte" && liberado("suporte") && <ModuloSuporte />}
              {secao === "boletim" && liberado("boletim") && <ModuloBoletim />}
              {secao === "deliberacao" && liberado("deliberacao") && <Contorno><ModuloDeliberacao /></Contorno>}
              {secao === "financas" && liberado("financas") && <Contorno><ModuloFinancas /></Contorno>}
            </main>
          ) : (
            <>
              <main ref={formulario} className={cn("ef-mesa @container min-w-0 overflow-y-auto", mostrarPrevia ? "flex-1 xl:w-[560px] xl:flex-none 2xl:w-[620px]" : "flex-1")}>
                <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-5 p-4 sm:p-6", !mostrarPrevia && "mx-auto max-w-3xl sm:p-8")}>
                  <header className="px-1 pb-1 pt-1">
                    <p className="ef-sobre">{grupoAtual}</p>
                    <h2 className="ef-titulo mt-2.5">{itemAtual?.rotulo}</h2>
                    {itemAtual?.descricao && <p className="ef-sub mt-1">{itemAtual.descricao}{def ? " As mudanças aparecem na prévia na hora e só vão para o site quando você clicar em Publicar." : ""}</p>}
                  </header>
                  {def && liberado(def.id) && <def.Editor c={c} mudar={mudar} />}
                  {secao === "alteracoes" && liberado("alteracoes") && <PainelVersoes podeRestaurar={pode(papel, "site")} aoRestaurar={(v) => { setC(v); setSecao("inicio"); }} />}
                  {secao === "usuarios" && liberado("usuarios") && <PainelUsuarios meuUsuario={dados.sessao.usuario} />}
                  {def && !dados.uploadsPermanentes && (
                    <p className="px-1 text-[12px] text-p-suave">Dica: conecte o Vercel Blob (Storage → Blob) para guardar as fotos fora do banco e deixar o site mais leve.</p>
                  )}
                </div>
              </main>
              {mostrarPrevia && (
                <section className="ef-palco hidden min-w-0 flex-1 flex-col xl:flex">
                  <BarraPrevia caminho={base ?? "/"} dispositivo={dispositivo} setDispositivo={setDispositivo} aoRecarregar={() => setChavePrevia((k) => k + 1)} aoAmpliar={() => setPreviaCheia(true)} />
                  <Previa key={`${srcPrevia}-${chavePrevia}-${dispositivo}`} ref={iframe} src={srcPrevia} dispositivo={dispositivo} foco={foco} />
                </section>
              )}
            </>
          )}
        </div>}
      </div>

      {/* Prévia em tela cheia */}
      {previaCheia && def && (
        <div className="ef-palco fixed inset-0 z-50 flex flex-col">
          <BarraPrevia caminho={base ?? "/"} dispositivo={dispositivo} setDispositivo={setDispositivo} aoRecarregar={() => setChavePrevia((k) => k + 1)} aoFechar={() => setPreviaCheia(false)} />
          <Previa key={`cheia-${srcPrevia}-${chavePrevia}-${dispositivo}`} src={srcPrevia} dispositivo={dispositivo} foco={foco} />
        </div>
      )}

      {busca && <PaletaBusca aoFechar={() => setBusca(false)} ir={ir} alteradas={alteradas} liberado={liberado} />}
      {minhaSenha && <JanelaPerfil nome={dados.sessao.nome} papel={dados.sessao.papel} usuario={dados.sessao.usuario} foto={dados.sessao.foto ?? null} aoFechar={() => setMinhaSenha(false)} aoMudarFoto={() => router.invalidate()} />}
      {dados.sessao.trocarSenha && <CriarSenha nome={dados.sessao.nome} aoConcluir={() => router.invalidate()} />}

      {dialogo && (
        <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center p-4" onClick={() => !publicando && setDialogo(false)}>
          <div className="ef-janela w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <p className="ef-sobre">Site</p>
            <h2 className="mt-3 text-[21px] font-bold tracking-[-0.015em]">Publicar alterações</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-p-texto-2">O site passa a mostrar o que está na prévia. A versão anterior fica guardada no controle de alterações.</p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {SECOES.filter((s) => alteradas.has(s.id)).map((s) => (
                <li key={s.id} className="inline-flex items-center gap-1.5 border border-p-borda bg-p-sutil px-2 py-1 text-[12.5px] font-semibold text-p-texto-2"><s.Icone size={13} /> {s.rotulo}</li>
              ))}
            </ul>
            <label className="mt-5 grid gap-1.5 text-[12.5px] font-medium text-p-texto-2">
              Descrição da alteração (opcional)
              <input autoFocus value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Ex.: Horários de dezembro" className="ef-campo !text-[14.5px] font-normal" onKeyDown={(e) => e.key === "Enter" && fazerPublicacao()} />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button disabled={publicando} onClick={() => setDialogo(false)} className="ef-btn ef-btn-fantasma">Cancelar</button>
              <button disabled={publicando} onClick={fazerPublicacao} className="ef-btn ef-btn-pri">
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
  sessao: { nome: string; papel: string; foto?: string }; tema: "claro" | "escuro"; aoTema: () => void; aoSair: () => void; aoBuscar: () => void;
  liberado: (id: string) => boolean; aoMinhaSenha: () => void;
}) {
  const grupos: { titulo: string; itens: ItemNav[] }[] = [
    { titulo: "Igreja", itens: MODULOS },
    { titulo: "Criação", itens: CRIACAO },
    { titulo: "Conteúdo do site", itens: SECOES },
    { titulo: "Sistema", itens: SISTEMA },
  ];

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
        <button onClick={aoMinhaSenha} title="Meu perfil: foto e senha" className={cn("mb-2 flex w-full items-center gap-2.5 rounded-md text-left transition hover:bg-white/[0.06]", recolhida ? "justify-center py-1" : "px-1 py-1")}>
          <Avatar nome={sessao.nome} foto={sessao.foto} tamanho={recolhida ? 34 : 36} className="ring-2 ring-white/15" />
          {!recolhida && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13.5px] font-semibold text-white">{sessao.nome}</span>
              <span className="block text-[11.5px] text-white/50">{rotuloPapel(sessao.papel)}</span>
            </span>
          )}
        </button>
        <div className={cn("flex gap-1", recolhida && "flex-col")}>
          <a href="/" target="_blank" rel="noopener" title="Ver o site" className="grid h-8 flex-1 place-items-center rounded-md text-white/60 hover:bg-white/[0.08] hover:text-white"><ExternalLink size={15} /></a>
          <button onClick={aoMinhaSenha} title="Meu perfil: foto e senha" className="grid h-8 flex-1 place-items-center rounded-md text-white/60 hover:bg-white/[0.08] hover:text-white"><KeyRound size={15} /></button>
          <button onClick={aoTema} title={tema === "escuro" ? "Modo claro" : "Modo escuro"} className="grid h-8 flex-1 place-items-center rounded-md text-white/60 hover:bg-white/[0.08] hover:text-white">{tema === "escuro" ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button onClick={aoSair} title="Sair" className="grid h-8 flex-1 place-items-center rounded-md text-white/60 hover:bg-white/[0.08] hover:text-white"><LogOut size={15} /></button>
        </div>
        <a
          href="mailto:contato.gratiast@gmail.com?subject=Painel%20da%201%C2%AA%20IEC%20Bras%C3%ADlia"
          title="GRATIA Software e Tecnologia"
          className={cn("group mt-2.5 flex items-center border-t border-white/[0.07] pt-2.5 opacity-45 transition-opacity hover:opacity-90", recolhida ? "justify-center" : "justify-between px-1")}
        >
          {!recolhida && <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/70">Produzido por</span>}
          <img src="/logo-gratia-branco.svg" alt="GRATIA" className={cn("w-auto", recolhida ? "h-3" : "h-3.5")} />
        </a>
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
    ...CRIACAO.map((m) => ({ ...m, grupo: "Criação" })),
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
    <div className="ef-palco-barra flex h-12 shrink-0 items-center gap-2 px-4 text-white">
      <span className="flex min-w-0 flex-1 items-center gap-2.5 text-[12.5px]">
        <span className="ef-ponto shrink-0" />
        <span className="ef-palco-selo">Prévia ao vivo</span>
        <span className="truncate border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11.5px] text-white/70">{caminho}</span>
      </span>
      <div className="flex border border-white/15 bg-white/[0.06] p-0.5">
        {opcoes.map((o) => (
          <button key={o.id} onClick={() => setDispositivo(o.id)} title={o.rotulo} aria-label={o.rotulo} className={cn("grid h-7 w-8 place-items-center text-white/60 transition hover:text-white", dispositivo === o.id && "bg-white text-[#002a47] hover:text-[#002a47]")}>
            <o.Icone size={14} />
          </button>
        ))}
      </div>
      <button onClick={aoRecarregar} title="Recarregar" className="grid size-8 place-items-center text-white/60 transition hover:bg-white/10 hover:text-white"><RotateCw size={14} /></button>
      <a href={caminho} target="_blank" rel="noopener" title="Abrir a página publicada em nova aba" className="grid size-8 place-items-center text-white/60 transition hover:bg-white/10 hover:text-white"><ExternalLink size={14} /></a>
      {aoAmpliar && <button onClick={aoAmpliar} title="Tela cheia" className="grid size-8 place-items-center text-white/60 transition hover:bg-white/10 hover:text-white"><Monitor size={14} /></button>}
      {aoFechar && <button onClick={aoFechar} title="Fechar" className="grid size-8 place-items-center text-white/60 transition hover:bg-white/10 hover:text-white"><X size={16} /></button>}
    </div>
  );
}

const LARGURA_DISPOSITIVO: Record<Dispositivo, number> = { computador: 1366, tablet: 820, celular: 390 };

/** A página real do site, encolhida para caber na área da prévia. */
type Foco = { x: number; y: number; w: number; h: number };

const Previa = ({ src, dispositivo, ref, foco }: { src: string; dispositivo: Dispositivo; ref?: React.Ref<HTMLIFrameElement>; foco?: Foco | null }) => {
  const caixa = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [altura, setAltura] = useState(800);
  const [area, setArea] = useState({ w: 800, h: 600 });
  const largura = LARGURA_DISPOSITIVO[dispositivo];

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ajustar = () => {
      const disponivel = el.clientWidth - 32;
      const e = Math.min(1, disponivel / largura);
      setEscala(e);
      setAltura((el.clientHeight - 32) / e);
      setArea({ w: el.clientWidth, h: el.clientHeight });
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [largura]);

  return (
    <div ref={caixa} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className={cn("absolute overflow-hidden bg-white shadow-[0_1px_1px_rgba(0,0,0,0.25),0_18px_30px_-18px_rgba(0,0,0,0.6),0_60px_90px_-50px_rgba(0,0,0,0.85)]", dispositivo === "computador" ? "" : "!rounded-[22px] ring-[6px] ring-[#0b1620]")}
        style={(() => {
          // aproxima o trecho em edição (até 2x) e o traz para o centro da prévia
          const base = escala;
          let S = base;
          let tx = (area.w - largura * base) / 2;
          let ty = 16;
          if (foco && foco.w > 0) {
            const z = Math.min(2, ((area.w / base) * 0.8) / foco.w, ((area.h / base) * 0.72) / Math.max(foco.h, 1));
            if (z >= 1.12) {
              S = base * z;
              tx = Math.min(0, Math.max(area.w - largura * S, area.w / 2 - (foco.x + foco.w / 2) * S));
              ty = Math.min(16, Math.max(area.h - altura * S, area.h / 2 - (foco.y + foco.h / 2) * S));
            }
          }
          return { width: largura, height: altura, left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${S})`, transition: "transform .55s cubic-bezier(.2,.8,.2,1)" };
        })()}
      >
        <iframe ref={ref} data-previa src={src} title="Prévia do site" className="size-full border-0" />
      </div>
    </div>
  );
};
