import { useEffect, useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bookmark, Camera, ChevronRight, Download, KeyRound, LogOut, Moon, Newspaper, Smartphone, Sun, SunMoon, Type, UserRound, Video, Vote } from "lucide-react";
import { toast } from "sonner";
import { appAtualizarPerfil, appBoletins, appDefinirSenha, appEntrarReuniao, appInicio } from "@/lib/api-app";
import { useMembro } from "@/components/app/contexto";
import { Avatar, fotoQuadrada } from "@/components/painel/Avatar";
import { salaAberta, type Preferencias } from "@/lib/membros";
import { cn } from "@/lib/utils";
import { dataPorExtenso } from "@/lib/boletim";

export const Route = createFileRoute("/app/mais")({ component: Mais });

type Inicio = Awaited<ReturnType<typeof appInicio>>;
type Livro = { id: string; nome: string };

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="px-5">
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--a-suave)]">{titulo}</h2>
      <div className="a-cartao divide-y divide-[var(--a-borda)]">{children}</div>
    </section>
  );
}
function Linha({ Icone, titulo, sub, onClick, para, direita }: { Icone: typeof Vote; titulo: string; sub?: string; onClick?: () => void; para?: string; direita?: ReactNode }) {
  const corpo = (
    <>
      <Icone size={20} className="shrink-0 text-[var(--a-azul)]" />
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{titulo}</span>{sub && <span className="block truncate text-[12.5px] text-[var(--a-suave)]">{sub}</span>}</span>
      {direita ?? <ChevronRight size={17} className="shrink-0 text-[var(--a-suave)]" />}
    </>
  );
  const cls = "flex w-full items-center gap-4 px-4 py-3.5 text-left";
  return para ? <a href={para} className={cls}>{corpo}</a> : <button onClick={onClick} className={cls}>{corpo}</button>;
}

function Mais() {
  const { membro, atualizar, sair } = useMembro();
  const [inicio, setInicio] = useState<Inicio | null>(null);
  const [boletins, setBoletins] = useState<{ id: string; data: string }[]>([]);
  const [livros, setLivros] = useState<Livro[]>([]);
  const [painel, setPainel] = useState<"dados" | "senha" | "instalar" | null>(null);
  useEffect(() => {
    appInicio().then(setInicio).catch(() => {});
    appBoletins().then(setBoletins).catch(() => {});
    fetch("/biblia/indice.json").then((r) => r.json()).then((i) => setLivros(i.livros)).catch(() => {});
  }, []);

  const prefs = (p: Partial<Preferencias>) => {
    atualizar({ ...membro, prefs: { ...membro.prefs, ...p } });
    appAtualizarPerfil({ data: { prefs: p } }).catch(() => {});
  };
  const trocarFoto = async (f?: File) => {
    if (!f) return;
    try { const foto = await fotoQuadrada(f); const r = await appAtualizarPerfil({ data: { foto } }); atualizar(r.membro); toast.success("Foto atualizada."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível usar esta foto."); }
  };
  const nomeLivro = (id: string) => livros.find((l) => l.id === id)?.nome ?? id;
  const instalado = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone);

  return (
    <div className="a-entra grid gap-6 pb-4">
      <header className="a-topo flex items-center gap-4">
        <label className="relative shrink-0 cursor-pointer">
          <Avatar nome={membro.nome} foto={membro.foto} tamanho={68} className="ring-2 ring-white/25" />
          <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-white text-[#002a47] shadow"><Camera size={14} /></span>
          <input type="file" accept="image/*" hidden onChange={(e) => trocarFoto(e.target.files?.[0])} />
        </label>
        <div className="min-w-0">
          <p className="truncate text-[20px] font-bold leading-tight">{membro.nome}</p>
          <p className="mt-1 text-[13px] text-white/70">{membro.celular}</p>
        </div>
      </header>

      {inicio && inicio.votacoes.length > 0 && (
        <Grupo titulo="Votações">
          {inicio.votacoes.map((v) => (
            <Linha key={v.id} Icone={Vote} titulo={v.titulo} sub={v.situacao === "encerrada" ? "Encerrada · ver resultado" : v.votou ? "Você já votou" : v.situacao === "agendada" ? `Abre em ${new Date(v.inicio).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Aberta — toque para votar"} para={`/votar/${v.token}`} />
          ))}
        </Grupo>
      )}

      {inicio && inicio.reunioes.length > 0 && (
        <Grupo titulo="Reuniões online">
          {inicio.reunioes.map((r) => {
            const aberta = salaAberta({ ...r, presencas: [] });
            return <Linha key={r.id} Icone={Video} titulo={r.titulo} sub={new Date(r.inicio).toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} direita={<span className={cn("text-[11px] font-bold uppercase tracking-[0.12em]", aberta ? "text-[var(--a-azul)]" : "text-[var(--a-suave)]")}>{aberta ? "Entrar" : "Em breve"}</span>} onClick={async () => { try { const { url } = await appEntrarReuniao({ data: { id: r.id } }); window.open(url, "_blank"); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } }} />;
          })}
        </Grupo>
      )}

      {boletins.length > 0 && (
        <Grupo titulo="Boletins">
          {boletins.slice(0, 6).map((b) => (
            <Link key={b.id} to="/app/boletim/$data" params={{ data: b.data }} className="flex items-center gap-4 px-4 py-3.5">
              <Newspaper size={20} className="shrink-0 text-[var(--a-azul)]" />
              <span className="flex-1 text-[15px] font-semibold">{dataPorExtenso(b.data)}</span>
              <ChevronRight size={17} className="text-[var(--a-suave)]" />
            </Link>
          ))}
        </Grupo>
      )}

      {membro.favoritos.versos.length > 0 && (
        <Grupo titulo="Versículos guardados">
          {[...membro.favoritos.versos].reverse().slice(0, 12).map((k) => {
            const [l, c, v] = k.split(".");
            return (
              <Link key={k} to="/app/biblia" search={{ ref: k }} className="flex items-center gap-4 px-4 py-3.5">
                <Bookmark size={18} className="shrink-0 text-[var(--a-azul)]" />
                <span className="flex-1 text-[15px] font-semibold">{nomeLivro(l!)} {c}:{v}</span>
                <ChevronRight size={17} className="text-[var(--a-suave)]" />
              </Link>
            );
          })}
        </Grupo>
      )}

      <section className="px-5">
        <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--a-suave)]">Aparência</h2>
        <div className="a-cartao grid gap-4 px-4 py-4">
          <div className="grid grid-cols-3 border border-[var(--a-borda)]">
            {([["claro", "Claro", Sun], ["escuro", "Escuro", Moon], ["sistema", "Automático", SunMoon]] as const).map(([v, r, I]) => (
              <button key={v} onClick={() => prefs({ tema: v })} className={cn("flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold", membro.prefs.tema === v ? "bg-[#00436f] text-white" : "text-[var(--a-suave)]")}><I size={14} /> {r}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Type size={16} className="text-[var(--a-suave)]" />
            <input type="range" min={1} max={5} value={membro.prefs.letra} onChange={(e) => prefs({ letra: Number(e.target.value) })} className="flex-1 accent-[#00436f]" aria-label="Tamanho da letra" />
            <Type size={22} className="text-[var(--a-suave)]" />
          </div>
          <p className="a-leitura !text-[calc(16px*var(--a-letra))]">“O Senhor é o meu pastor; nada me faltará.”</p>
        </div>
      </section>

      <Grupo titulo="Conta">
        <Linha Icone={UserRound} titulo="Meus dados" sub="Celular, e-mail e aniversário" onClick={() => setPainel("dados")} />
        <Linha Icone={KeyRound} titulo="Trocar senha" onClick={() => setPainel("senha")} />
        {!instalado && <Linha Icone={Smartphone} titulo="Instalar na tela inicial" sub="Abra como um aplicativo" onClick={() => setPainel("instalar")} />}
        <Linha Icone={LogOut} titulo="Sair" onClick={() => { if (confirm("Sair do aplicativo neste aparelho?")) sair(); }} direita={<span />} />
      </Grupo>

      <p className="px-6 text-center text-[11.5px] leading-relaxed text-[var(--a-suave)]">
        Primeira Igreja Evangélica Congregacional de Brasília · SHCS SQS 416<br />
        Textos bíblicos: Bíblia Livre (CC BY 4.0, Diego Santos, Mario Sérgio e Marco Teles) e Bíblia Portuguesa Mundial (domínio público).<br />
        <span className="mt-2 inline-flex items-center gap-1.5 opacity-70">Produzido por <img src="/logo-gratia-escuro.svg" alt="GRATIA" className="h-3 dark:invert" /></span>
      </p>

      {painel && (
        <>
          <div className="a-veu" onClick={() => setPainel(null)} />
          <div className="a-folha px-5 pb-6 pt-5">
            {painel === "dados" && <Dados fechar={() => setPainel(null)} />}
            {painel === "senha" && <Senha fechar={() => setPainel(null)} />}
            {painel === "instalar" && <Instalar />}
          </div>
        </>
      )}
    </div>
  );
}

function Dados({ fechar }: { fechar: () => void }) {
  const { membro, atualizar } = useMembro();
  const [f, setF] = useState({ celular: membro.celular, email: membro.email, nascimento: membro.nascimento });
  return (
    <form onSubmit={async (e) => { e.preventDefault(); try { const r = await appAtualizarPerfil({ data: f }); atualizar(r.membro); toast.success("Dados atualizados."); fechar(); } catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); } }} className="grid gap-4">
      <p className="a-sobre">Meus dados</p>
      <label className="grid gap-1.5 text-[13.5px] font-semibold">Celular<input className="a-campo" inputMode="tel" value={f.celular} onChange={(e) => setF({ ...f, celular: e.target.value })} /></label>
      <label className="grid gap-1.5 text-[13.5px] font-semibold">E-mail<input className="a-campo" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label className="grid gap-1.5 text-[13.5px] font-semibold">Data de nascimento<input className="a-campo" type="date" value={f.nascimento} onChange={(e) => setF({ ...f, nascimento: e.target.value })} /></label>
      <p className="text-[12.5px] text-[var(--a-suave)]">Para mudar o nome, fale com a secretaria.</p>
      <button className="a-btn a-btn-pri w-full">Salvar</button>
    </form>
  );
}

function Senha({ fechar }: { fechar: () => void }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  return (
    <form onSubmit={async (e) => { e.preventDefault(); try { await appDefinirSenha({ data: { atual, nova } }); toast.success("Senha alterada."); fechar(); } catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); } }} className="grid gap-4">
      <p className="a-sobre">Trocar senha</p>
      <label className="grid gap-1.5 text-[13.5px] font-semibold">Senha atual<input className="a-campo" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} /></label>
      <label className="grid gap-1.5 text-[13.5px] font-semibold">Nova senha<input className="a-campo" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Mínimo de 8 caracteres" /></label>
      <button className="a-btn a-btn-pri w-full">Alterar senha</button>
    </form>
  );
}

type EventoInstalar = Event & { prompt: () => Promise<void> };
let pedidoGuardado: EventoInstalar | null = null;
if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedidoGuardado = e as EventoInstalar; });

function Instalar() {
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <div className="grid gap-4">
      <p className="a-sobre">Instalar o aplicativo</p>
      <p className="text-[15px] leading-relaxed">O app fica na tela inicial com o ícone da igreja e abre em tela cheia, como qualquer aplicativo.</p>
      {pedidoGuardado && !ios ? (
        <button onClick={() => pedidoGuardado?.prompt()} className="a-btn a-btn-pri w-full"><Download size={17} /> Instalar agora</button>
      ) : ios ? (
        <ol className="grid gap-3 text-[14.5px]">
          <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#00436f] text-[12px] font-bold text-white">1</span>No Safari, toque no botão <strong>Compartilhar</strong> (o quadrado com a seta para cima).</li>
          <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#00436f] text-[12px] font-bold text-white">2</span>Role e toque em <strong>Adicionar à Tela de Início</strong>.</li>
          <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#00436f] text-[12px] font-bold text-white">3</span>Toque em <strong>Adicionar</strong>. Pronto!</li>
        </ol>
      ) : (
        <ol className="grid gap-3 text-[14.5px]">
          <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#00436f] text-[12px] font-bold text-white">1</span>No Chrome, toque nos <strong>três pontinhos</strong> (canto de cima).</li>
          <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#00436f] text-[12px] font-bold text-white">2</span>Toque em <strong>Instalar app</strong> (ou “Adicionar à tela inicial”).</li>
        </ol>
      )}
    </div>
  );
}
