/**
 * Aplicativo dos membros (/app): instalável na tela inicial (iPhone e
 * Android), com login próprio do membro. Tudo vem do mesmo painel da igreja.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { BookOpen, Ellipsis, House, Loader2, Music, Users } from "lucide-react";
import { appCadastrar, appDefinirSenha, appEntrar, appSair, appSessao } from "@/lib/api-app";
import { primeiroNome, type MembroPublico } from "@/lib/membros";
import { AppCtx } from "@/components/app/contexto";
import { cn } from "@/lib/utils";
import "@/components/app/app.css";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "1ª IEC Brasília" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#002a47" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "IECB" },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "manifest", href: "/app/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/app/apple-touch-icon.png" },
    ],
  }),
  component: App,
});

function App() {
  const [membro, setMembro] = useState<MembroPublico | null | undefined>(undefined);
  const [tela, setTela] = useState<"entrar" | "cadastro">("entrar");

  useEffect(() => {
    appSessao().then((r) => setMembro(r.membro)).catch(() => setMembro(null));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/app-sw.js", { scope: "/app" }).catch(() => {});
  }, []);

  // tema e tamanho da letra seguem o perfil do membro
  const prefs = membro?.prefs;
  const [escuroSistema, setEscuroSistema] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setEscuroSistema(mq.matches);
    const f = (e: MediaQueryListEvent) => setEscuroSistema(e.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  const tema = prefs?.tema === "escuro" || (prefs?.tema !== "claro" && escuroSistema) ? "escuro" : "claro";
  const letra = [0.85, 0.93, 1, 1.12, 1.26][(prefs?.letra ?? 3) - 1] ?? 1;

  const sair = async () => { await appSair(); setMembro(null); setTela("entrar"); };

  return (
    <div className="app" data-tema={tema} style={{ ["--a-letra" as string]: letra }}>
      {membro === undefined ? (
        <div className="grid min-h-dvh place-items-center bg-[#002a47]"><img src="/marca/logo-simbolo-negativo-branco-cruz-vermelha.svg" alt="" className="w-20 animate-pulse" /></div>
      ) : !membro ? (
        tela === "entrar" ? <Entrar aoEntrar={setMembro} aoCadastro={() => setTela("cadastro")} /> : <Cadastro aoCadastrar={setMembro} aoVoltar={() => setTela("entrar")} />
      ) : membro.situacao === "pendente" ? (
        <Aviso titulo={`Quase lá, ${primeiroNome(membro.nome)}!`} texto="Seu cadastro foi enviado. Assim que a secretaria aprovar, o aplicativo abre por completo — é só voltar aqui." acao={<button onClick={() => appSessao().then((r) => setMembro(r.membro))} className="a-btn a-btn-branco w-full">Verificar de novo</button>} sair={sair} />
      ) : membro.situacao === "inativo" ? (
        <Aviso titulo="Acesso desativado" texto="Seu acesso ao aplicativo está desativado. Fale com a secretaria da igreja." sair={sair} />
      ) : membro.trocarSenha ? (
        <CriarSenha nome={membro.nome} aoCriar={() => setMembro({ ...membro, trocarSenha: false })} sair={sair} />
      ) : (
        <AppCtx.Provider value={{ membro, atualizar: setMembro, sair }}>
          <main className="a-conteudo"><Outlet /></main>
          <Abas />
        </AppCtx.Provider>
      )}
    </div>
  );
}

function Abas() {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  // o editor de escala tem a própria barra de ações embaixo
  if (caminho.startsWith("/app/escala/editar")) return null;
  const abas = [
    { para: "/app", rotulo: "Início", Icone: House, ativo: caminho === "/app" || caminho === "/app/" },
    { para: "/app/biblia", rotulo: "Bíblia", Icone: BookOpen, ativo: caminho.startsWith("/app/biblia") },
    { para: "/app/hinario", rotulo: "Hinário", Icone: Music, ativo: caminho.startsWith("/app/hinario") },
    { para: "/app/participar", rotulo: "Participar", Icone: Users, ativo: caminho.startsWith("/app/participar") || caminho.startsWith("/app/escala") || caminho.startsWith("/app/ministerio") },
    { para: "/app/mais", rotulo: "Mais", Icone: Ellipsis, ativo: caminho.startsWith("/app/mais") || caminho.startsWith("/app/boletim") || caminho.startsWith("/app/ofertar") },
  ] as const;
  return (
    <nav className="a-abas" aria-label="Seções do aplicativo">
      {abas.map(({ para, rotulo, Icone, ativo }) => (
        <Link key={para} to={para} search={{} as never} className="a-aba" activeOptions={{ exact: true }} activeProps={{ "aria-current": ativo ? "page" : undefined }} inactiveProps={{ "aria-current": ativo ? "page" : undefined }}>
          <Icone size={22} strokeWidth={ativo ? 2.3 : 1.8} />
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}

// ─── Entrada ────────────────────────────────────────────────────────────────

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#002a47] text-white">
      <div className="a-topo !bg-transparent !pb-10 !pt-[calc(env(safe-area-inset-top)+48px)] text-center">
        <img src="/marca/logo-vertical-negativo-branco-cruz-vermelha.svg" alt="Primeira Igreja Evangélica Congregacional de Brasília" className="mx-auto w-[190px]" />
      </div>
      <div className="flex-1 rounded-t-[2px] bg-[var(--a-fundo)] px-6 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-8 text-[var(--a-texto)]">{children}</div>
    </div>
  );
}

function Erro({ texto }: { texto: string }) {
  return texto ? <p className="border-l-[3px] border-[var(--a-vermelho)] bg-red-500/10 px-3 py-2.5 text-[14px] text-red-700 dark:text-red-300" role="alert">{texto}</p> : null;
}

function Entrar({ aoEntrar, aoCadastro }: { aoEntrar: (m: MembroPublico) => void; aoCadastro: () => void }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(""); setEnviando(true);
    try { aoEntrar((await appEntrar({ data: { login, senha } })).membro); } catch (err) { setErro(err instanceof Error ? err.message : "Não foi possível entrar."); } finally { setEnviando(false); }
  };
  return (
    <Moldura>
      <form onSubmit={enviar} className="a-entra mx-auto grid max-w-sm gap-4">
        <div><p className="a-sobre">Aplicativo dos membros</p><h1 className="a-titulo mt-2">Entrar</h1></div>
        <label className="grid gap-1.5 text-[13.5px] font-semibold">Celular ou e-mail<input className="a-campo" inputMode="email" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="(61) 99999-0000" /></label>
        <label className="grid gap-1.5 text-[13.5px] font-semibold">Senha<input className="a-campo" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} /></label>
        <Erro texto={erro} />
        <button disabled={enviando} className="a-btn a-btn-pri mt-1 w-full">{enviando && <Loader2 size={17} className="animate-spin" />} Entrar</button>
        <div className="mt-4 border-t border-[var(--a-borda)] pt-5 text-center">
          <p className="text-[14px] text-[var(--a-suave)]">Primeira vez por aqui?</p>
          <button type="button" onClick={aoCadastro} className="a-btn a-btn-sec mt-3 w-full">Criar cadastro</button>
        </div>
        <p className="mt-2 text-center text-[12.5px] text-[var(--a-suave)]">Esqueceu a senha? Peça à secretaria uma senha provisória.</p>
      </form>
    </Moldura>
  );
}

function Cadastro({ aoCadastrar, aoVoltar }: { aoCadastrar: (m: MembroPublico) => void; aoVoltar: () => void }) {
  const [f, setF] = useState({ nome: "", celular: "", email: "", nascimento: "", senha: "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(""); setEnviando(true);
    try { aoCadastrar((await appCadastrar({ data: f })).membro); } catch (err) { setErro(err instanceof Error ? err.message : "Não foi possível cadastrar."); } finally { setEnviando(false); }
  };
  const campo = (rotulo: string, k: keyof typeof f, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="grid gap-1.5 text-[13.5px] font-semibold">{rotulo}<input className="a-campo" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} /></label>
  );
  return (
    <Moldura>
      <form onSubmit={enviar} className="a-entra mx-auto grid max-w-sm gap-4">
        <div><p className="a-sobre">Aplicativo dos membros</p><h1 className="a-titulo mt-2">Criar cadastro</h1><p className="mt-1.5 text-[14px] text-[var(--a-suave)]">A secretaria confere e aprova o seu acesso.</p></div>
        {campo("Nome completo", "nome", { autoComplete: "name", autoCapitalize: "words" })}
        {campo("Celular (WhatsApp)", "celular", { inputMode: "tel", autoComplete: "tel", placeholder: "(61) 99999-0000" })}
        {campo("E-mail (opcional)", "email", { inputMode: "email", autoComplete: "email" })}
        {campo("Data de nascimento", "nascimento", { type: "date" })}
        {campo("Crie uma senha", "senha", { type: "password", autoComplete: "new-password", placeholder: "Mínimo de 8 caracteres" })}
        <Erro texto={erro} />
        <button disabled={enviando} className="a-btn a-btn-pri mt-1 w-full">{enviando && <Loader2 size={17} className="animate-spin" />} Enviar cadastro</button>
        <button type="button" onClick={aoVoltar} className="text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--a-azul)]">Já tenho cadastro</button>
      </form>
    </Moldura>
  );
}

function CriarSenha({ nome, aoCriar, sair }: { nome: string; aoCriar: () => void; sair: () => void }) {
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (nova !== confirma) { setErro("As duas senhas não são iguais."); return; }
    try { await appDefinirSenha({ data: { nova } }); aoCriar(); } catch (err) { setErro(err instanceof Error ? err.message : "Erro"); }
  };
  return (
    <Moldura>
      <form onSubmit={enviar} className="a-entra mx-auto grid max-w-sm gap-4">
        <div><p className="a-sobre">Bem-vindo</p><h1 className="a-titulo mt-2">Olá, {primeiroNome(nome)}!</h1><p className="mt-1.5 text-[14px] text-[var(--a-suave)]">Você entrou com uma senha provisória. Crie agora a sua própria senha.</p></div>
        <label className="grid gap-1.5 text-[13.5px] font-semibold">Nova senha<input className="a-campo" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Mínimo de 8 caracteres" /></label>
        <label className="grid gap-1.5 text-[13.5px] font-semibold">Repita a senha<input className="a-campo" type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} /></label>
        <Erro texto={erro} />
        <button className="a-btn a-btn-pri w-full">Criar senha e entrar</button>
        <button type="button" onClick={sair} className="text-[13px] font-semibold text-[var(--a-suave)]">Sair</button>
      </form>
    </Moldura>
  );
}

function Aviso({ titulo, texto, acao, sair }: { titulo: string; texto: string; acao?: React.ReactNode; sair: () => void }) {
  return (
    <div className={cn("a-topo flex min-h-dvh flex-col justify-center px-8 text-center")}>
      <img src="/marca/logo-simbolo-negativo-branco-cruz-vermelha.svg" alt="" className="mx-auto w-16" />
      <h1 className="mt-8 text-[26px] font-bold tracking-[-0.02em]">{titulo}</h1>
      <p className="mx-auto mt-3 max-w-[34ch] text-[15px] leading-relaxed text-white/75">{texto}</p>
      <div className="mx-auto mt-8 grid w-full max-w-xs gap-3">{acao}<button onClick={sair} className="text-[13px] font-semibold text-white/60">Sair</button></div>
    </div>
  );
}
