import { useEffect, useState, type FormEvent } from "react";
import { History, Loader2, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Conteudo } from "@/lib/conteudo";
import { carregarVersao, listarUsuarios, listarVersoes, removerUsuario, salvarUsuario, trocarMinhaSenha } from "@/lib/api";
import { Campo, Grade, Secao, Selecao } from "./kit";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function PainelVersoes({ aoRestaurar }: { aoRestaurar: (c: Conteudo) => void }) {
  const [dados, setDados] = useState<Awaited<ReturnType<typeof listarVersoes>> | null>(null);
  const [abrindo, setAbrindo] = useState<number | null>(null);
  useEffect(() => { listarVersoes().then(setDados).catch((e) => toast.error(e.message)); }, []);

  if (!dados) return <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-slate-400" /></div>;
  return (
    <>
      <Secao titulo="Versões publicadas" descricao="Cada publicação guarda uma cópia do site inteiro. Restaurar coloca a versão no rascunho — confira na prévia e publique.">
        {dados.versoes.length === 0 && <p className="text-[13px] text-slate-500">Nenhuma publicação ainda.</p>}
        <ul className="divide-y divide-slate-100">
          {dados.versoes.map((v, i) => (
            <li key={v.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-slate-800">
                  {v.resumo} {i === 0 && <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">no ar</span>}
                </p>
                <p className="text-[12px] text-slate-500">nº {v.id} · {v.autor} · {quando(v.criadoEm)}</p>
              </div>
              <button
                type="button"
                disabled={abrindo !== null}
                onClick={async () => {
                  setAbrindo(v.id);
                  try {
                    aoRestaurar(await carregarVersao({ data: { id: v.id } }));
                    toast.success("Versão carregada no rascunho. Publique para colocá-la no ar.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erro ao restaurar.");
                  } finally { setAbrindo(null); }
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:border-marca hover:text-marca disabled:opacity-50"
              >
                {abrindo === v.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Restaurar
              </button>
            </li>
          ))}
        </ul>
      </Secao>
      <Secao titulo="Histórico de atividades" descricao="Quem fez o quê no painel.">
        <ul className="grid gap-2">
          {dados.auditoria.slice(0, 60).map((a) => (
            <li key={a.id} className="flex gap-3 text-[13px]">
              <History size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <span><strong className="text-slate-800">{a.autor}</strong> <span className="text-slate-600">{a.acao.toLowerCase()}</span>{a.detalhe && <span className="text-slate-500"> — {a.detalhe}</span>}<span className="block text-[12px] text-slate-400">{quando(a.criadoEm)}</span></span>
            </li>
          ))}
        </ul>
      </Secao>
    </>
  );
}

type U = Awaited<ReturnType<typeof listarUsuarios>>[number];

export function PainelUsuarios({ souAdmin, meuUsuario }: { souAdmin: boolean; meuUsuario: string }) {
  const [lista, setLista] = useState<U[] | null>(null);
  const [form, setForm] = useState({ nome: "", usuario: "", papel: "editor" as "admin" | "editor", senha: "" });
  const [salvando, setSalvando] = useState(false);
  const carregar = () => listarUsuarios().then(setLista).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvarUsuario({ data: { ...form, senha: form.senha || undefined } as never });
      toast.success("Usuário salvo.");
      setForm({ nome: "", usuario: "", papel: "editor", senha: "" });
      carregar();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); } finally { setSalvando(false); }
  };

  return (
    <>
      <Secao titulo="Pessoas com acesso ao painel" descricao="Administradores gerenciam usuários; editores alteram e publicam o conteúdo.">
        {!lista ? <Loader2 className="animate-spin text-slate-400" /> : (
          <ul className="divide-y divide-slate-100">
            {lista.map((u) => (
              <li key={u.usuario} className="flex items-center justify-between gap-3 py-3">
                <button type="button" disabled={!souAdmin} onClick={() => setForm({ nome: u.nome, usuario: u.usuario, papel: u.papel, senha: "" })} className="min-w-0 text-left">
                  <p className="truncate text-[14px] font-semibold text-slate-800">{u.nome} {u.usuario === meuUsuario && <span className="text-[12px] font-normal text-slate-400">(você)</span>}</p>
                  <p className="truncate text-[12px] text-slate-500">acesso: {u.usuario} · {u.papel === "admin" ? "Administrador" : "Editor"}</p>
                </button>
                {souAdmin && u.usuario !== meuUsuario && (
                  <button type="button" title="Remover" onClick={async () => {
                    if (!confirm(`Remover o acesso de ${u.nome}?`)) return;
                    try { await removerUsuario({ data: { usuario: u.usuario } }); carregar(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                  }} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Secao>
      {souAdmin && (
        <Secao titulo="Adicionar ou alterar usuário" descricao="Para alterar alguém, clique no nome dele acima. Senha em branco mantém a atual.">
          <form onSubmit={enviar} className="grid gap-4">
            <Grade>
              <Campo rotulo="Nome completo" valor={form.nome} onChange={(v) => setForm({ ...form, nome: v, usuario: form.usuario || "" })} placeholder="Ex.: Pr. Hilário José" />
              <Campo rotulo="Nome de acesso" valor={form.usuario} onChange={(v) => setForm({ ...form, usuario: v })} placeholder="Ex.: Hilario" dica="O primeiro nome, usado para entrar. Se houver dois iguais, acrescente algo (ex.: MariaIsabel)." />
              <Selecao rotulo="Permissão" valor={form.papel} onChange={(v) => setForm({ ...form, papel: v })} opcoes={[{ valor: "editor", rotulo: "Editor" }, { valor: "admin", rotulo: "Administrador" }]} />
              <Campo rotulo="Senha" tipo="password" valor={form.senha} onChange={(v) => setForm({ ...form, senha: v })} dica="Mínimo de 8 caracteres." />
            </Grade>
            <button disabled={salvando} className="btn-primario justify-self-start !py-2.5"><UserPlus size={16} /> Salvar usuário</button>
          </form>
        </Secao>
      )}
      <MinhaSenha />
    </>
  );
}

function MinhaSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  return (
    <Secao titulo="Minha senha">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try { await trocarMinhaSenha({ data: { atual, nova } }); toast.success("Senha alterada."); setAtual(""); setNova(""); }
          catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
        }}
        className="grid gap-4"
      >
        <Grade>
          <Campo rotulo="Senha atual" tipo="password" valor={atual} onChange={setAtual} />
          <Campo rotulo="Nova senha" tipo="password" valor={nova} onChange={setNova} />
        </Grade>
        <button className="btn-contorno justify-self-start !py-2.5">Alterar senha</button>
      </form>
    </Secao>
  );
}
