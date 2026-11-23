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
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await entrar({ data: { email, senha } });
      await router.navigate({ to: "/admin" });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-marca-funda lg:block">
        <img src="/simbolo-branco.svg" alt="" className="absolute -bottom-[10%] left-1/2 w-[130%] max-w-none -translate-x-1/2 opacity-[0.07]" />
        <div className="relative flex h-full flex-col justify-between p-14 text-white">
          <img src="/simbolo-negativo.svg" alt="" className="w-24" />
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/60">Painel do site</p>
            <h1 className="mt-3 max-w-md text-4xl font-bold">Tudo o que aparece no site, editado por aqui.</h1>
            <p className="mt-4 max-w-md text-white/70">Textos, horários, eventos, fotos, liderança e mensagens — com prévia ao vivo antes de publicar.</p>
          </div>
        </div>
      </div>
      <div className="grid place-items-center bg-white p-6">
        <form onSubmit={enviar} className="w-full max-w-sm">
          <img src="/simbolo.svg" alt="" className="w-20 lg:hidden" />
          <h2 className="mt-6 text-2xl font-bold text-slate-900">Entrar</h2>
          <p className="mt-1 text-[14px] text-slate-500">
            {primeiroAcesso ? "Primeiro acesso: use o e-mail e a senha de administrador configurados na hospedagem." : "Acesso restrito à equipe da igreja."}
          </p>
          <div className="mt-8 grid gap-4">
            <label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
              E-mail
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-slate-300 px-3.5 py-3 text-[15px] font-normal outline-none focus:border-marca focus:ring-3 focus:ring-marca/15" />
            </label>
            <label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
              Senha
              <input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className="rounded-xl border border-slate-300 px-3.5 py-3 text-[15px] font-normal outline-none focus:border-marca focus:ring-3 focus:ring-marca/15" />
            </label>
            {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-[13.5px] text-red-700" role="alert">{erro}</p>}
            <button disabled={enviando} className="btn-primario mt-2 w-full !py-3.5">
              {enviando ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />} Entrar
            </button>
            <a href="/" className="text-center text-[13px] text-slate-500 hover:text-marca">← Voltar ao site</a>
          </div>
        </form>
      </div>
    </div>
  );
}
