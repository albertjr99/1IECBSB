import { useState, type FormEvent } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { entrar, obterSessao } from "@/lib/api";

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
    <div className={`painel grid min-h-screen bg-p-superficie text-p-texto lg:grid-cols-[1fr_1.1fr] ${escuro ? "tema-escuro" : ""}`} style={{ fontFamily: "var(--font-texto)" }}>
      <div className="hidden flex-col justify-between bg-p-lateral p-12 text-white lg:flex">
        <img src="/simbolo-negativo.svg" alt="" className="w-20" />
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-white/50">Painel administrativo</p>
          <p className="mt-3 max-w-sm text-[1.7rem] font-semibold leading-tight">Primeira Igreja Evangélica Congregacional de Brasília</p>
        </div>
        <p className="text-[12.5px] text-white/40">Acesso restrito à equipe da igreja.</p>
      </div>
      <div className="grid place-items-center bg-p-superficie p-6">
        <form onSubmit={enviar} className="w-full max-w-sm">
          <img src="/simbolo.svg" alt="" className="w-20 lg:hidden" />
          <h2 className="mt-6 text-2xl font-semibold text-p-texto lg:mt-0">Entrar</h2>
          <p className="mt-1 text-[14px] text-p-suave">
            {primeiroAcesso ? "Primeiro acesso: use o nome e a senha de administrador configurados na hospedagem." : "Entre com o seu primeiro nome e a sua senha."}
          </p>
          <div className="mt-8 grid gap-4">
            <label className="grid gap-1.5 text-[12.5px] font-medium text-p-texto-2">
              Primeiro nome
              <input type="text" required autoComplete="username" autoCapitalize="words" placeholder="Ex.: Hilário" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-10 rounded-md border border-p-borda-forte bg-p-superficie px-3 text-[14.5px] font-normal text-p-texto outline-none focus:border-p-acento focus:ring-3 focus:ring-p-acento/20" />
            </label>
            <label className="grid gap-1.5 text-[12.5px] font-medium text-p-texto-2">
              Senha
              <input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="h-10 rounded-md border border-p-borda-forte bg-p-superficie px-3 text-[14.5px] font-normal text-p-texto outline-none focus:border-p-acento focus:ring-3 focus:ring-p-acento/20" />
            </label>
            {erro && <p className="rounded-md bg-red-500/10 px-3 py-2.5 text-[13.5px] text-red-700 dark:text-red-400" role="alert">{erro}</p>}
            <button disabled={enviando} className="btn-primario mt-2 w-full !h-10">
              {enviando ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />} Entrar
            </button>
            <a href="/" className="text-center text-[13px] text-p-suave hover:text-p-acento">← Voltar ao site</a>
          </div>
        </form>
      </div>
    </div>
  );
}
