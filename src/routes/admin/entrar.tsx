import { useState, type FormEvent } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { entrar, obterSessao } from "@/lib/api";
import "@/components/painel/boletim/editor.css";

export const Route = createFileRoute("/admin/entrar")({
  ssr: false,
  beforeLoad: async () => {
    const { sessao, primeiroAcesso } = await obterSessao();
    if (sessao) throw redirect({ to: "/admin" });
    return { primeiroAcesso };
  },
  head: () => ({ meta: [{ title: "Entrar — Painel" }, { name: "robots", content: "noindex" }] }),
  component: Entrar,
});

function Entrar() {
  const { primeiroAcesso } = Route.useRouteContext();
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await entrar({ data: { usuario, senha } });
      await router.navigate({ to: "/admin" });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  };

  const escuro = typeof window !== "undefined" && (localStorage.getItem("iecb_painel_tema") === "escuro" || (!localStorage.getItem("iecb_painel_tema") && window.matchMedia?.("(prefers-color-scheme: dark)").matches));
  return (
    <div className={`painel ef grid min-h-screen bg-p-superficie text-p-texto lg:grid-cols-[1fr_1.1fr] ${escuro ? "tema-escuro" : ""}`} style={{ fontFamily: "var(--font-texto)" }}>
      <div className="ef-vitrine hidden flex-col justify-between p-12 lg:flex">
        <p className="ef-sobre !text-white/80">Painel administrativo</p>
        <img src="/marca/logo-vertical-negativo-branco-cruz-vermelha.svg" alt="Primeira Igreja Evangélica Congregacional de Brasília" className="w-[300px]" />
        <div className="flex flex-wrap gap-2">
          {["Boletim", "Deliberação", "Site", "Agentes de IA"].map((x) => <span key={x} className="ef-chip-vidro">{x}</span>)}
        </div>
      </div>
      <div className="ef-mesa grid place-items-center p-6">
        <form onSubmit={enviar} className="ef-folha w-full max-w-[400px] px-7 py-9 sm:px-9">
          <img src="/simbolo.svg" alt="" className="w-20 lg:hidden" />
          <p className="ef-sobre mt-6 lg:mt-0">Acesso restrito</p>
          <h2 className="ef-titulo mt-3">Entrar no painel</h2>
          <p className="ef-sub mt-1.5 !text-[14.5px]">
            {primeiroAcesso ? "Primeiro acesso: use o nome e a senha de administrador configurados na hospedagem." : "Use o seu nome de acesso e a sua senha."}
          </p>
          <div className="mt-8 grid gap-4">
            <label className="grid gap-2">
              <span className="ef-rotulo">Nome de acesso</span>
              <input type="text" required autoComplete="username" autoCapitalize="none" placeholder="Ex.: hilario" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="ef-campo" />
            </label>
            <label className="grid gap-2">
              <span className="ef-rotulo">Senha</span>
              <input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="ef-campo" />
            </label>
            {erro && <p className="border-l-[3px] border-red-600 bg-red-500/10 px-3 py-2.5 text-[13.5px] text-red-700 dark:text-red-400" role="alert">{erro}</p>}
            <button disabled={enviando} className="ef-btn ef-btn-pri mt-2 w-full !h-12">
              {enviando ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />} Entrar
            </button>
            <a href="/" className="text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-p-suave hover:text-p-acento">← Voltar ao site</a>
          </div>
        </form>
      </div>
    </div>
  );
}
