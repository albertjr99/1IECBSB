import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, History, KeyRound, Loader2, RotateCcw, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import type { Conteudo } from "@/lib/conteudo";
import { carregarVersao, gerarSenhaProvisoria, listarUsuarios, listarVersoes, removerUsuario, salvarUsuario, trocarMinhaSenha } from "@/lib/api";
import { PAPEIS, rotuloPapel, type Papel } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import { Campo, Grade, Secao } from "./kit";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function PainelVersoes({ aoRestaurar, podeRestaurar = true }: { aoRestaurar: (c: Conteudo) => void; podeRestaurar?: boolean }) {
  const [dados, setDados] = useState<Awaited<ReturnType<typeof listarVersoes>> | null>(null);
  const [abrindo, setAbrindo] = useState<number | null>(null);
  useEffect(() => { listarVersoes().then(setDados).catch((e) => toast.error(e.message)); }, []);

  if (!dados) return <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-p-suave" /></div>;
  return (
    <>
      <Secao titulo="Publicações" descricao={podeRestaurar ? "Cada publicação guarda uma cópia completa do site. Restaurar leva aquela versão para o rascunho: confira na prévia e publique." : "Cada publicação do site, com quem publicou e quando."}>
        {dados.versoes.length === 0 && <p className="text-[13px] text-p-suave">Nenhuma publicação ainda.</p>}
        <ul className="divide-y divide-p-borda">
          {dados.versoes.map((v, i) => (
            <li key={v.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-p-texto">
                  {v.resumo} {i === 0 && <span className="ml-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">no ar</span>}
                </p>
                <p className="text-[12px] text-p-suave">nº {v.id} · {v.autor} · {quando(v.criadoEm)}</p>
              </div>
              {podeRestaurar && <button
                type="button"
                disabled={abrindo !== null}
                onClick={async () => {
                  setAbrindo(v.id);
                  try {
                    aoRestaurar(await carregarVersao({ data: { id: v.id } }));
                    toast.success("Versão levada para o rascunho. Publique para colocá-la no ar.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erro ao restaurar.");
                  } finally { setAbrindo(null); }
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-p-borda-forte px-3 py-1.5 text-[13px] font-semibold text-p-texto-2 hover:border-p-acento hover:text-p-acento disabled:opacity-50"
              >
                {abrindo === v.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Restaurar
              </button>}
            </li>
          ))}
        </ul>
      </Secao>
      <Secao titulo="Registro de atividades" descricao="Quem fez o quê no painel, do mais recente ao mais antigo.">
        <ul className="grid gap-2">
          {dados.auditoria.slice(0, 60).map((a) => (
            <li key={a.id} className="flex gap-3 text-[13px]">
              <History size={14} className="mt-0.5 shrink-0 text-p-suave" />
              <span><strong className="text-p-texto">{a.autor}</strong> <span className="text-p-texto-2">{a.acao.toLowerCase()}</span>{a.detalhe && <span className="text-p-suave"> — {a.detalhe}</span>}<span className="block text-[12px] text-p-suave">{quando(a.criadoEm)}</span></span>
            </li>
          ))}
        </ul>
      </Secao>
    </>
  );
}

type U = Awaited<ReturnType<typeof listarUsuarios>>[number];

const CORES_PAPEL: Record<string, string> = {
  admin: "bg-p-acento text-white",
  pastor: "bg-[#5b7f99]/15 text-[#2b5675] dark:text-[#a9c6dc]",
  comunicacao: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  editor: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
};

function SeloPapel({ papel }: { papel: string }) {
  return <span className={cn("inline-flex h-5 items-center rounded px-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em]", CORES_PAPEL[papel] ?? "bg-p-hover text-p-texto-2")}>{rotuloPapel(papel)}</span>;
}

function situacao(u: U) {
  if (!u.trocarSenha) return { texto: "Ativo", cor: "bg-emerald-500" };
  return { texto: "Aguardando o primeiro acesso", cor: "bg-amber-400" };
}

export function PainelUsuarios({ meuUsuario }: { meuUsuario: string }) {
  const [lista, setLista] = useState<U[] | null>(null);
  const [form, setForm] = useState<{ nome: string; usuario: string; papel: Papel; editando: boolean }>({ nome: "", usuario: "", papel: "comunicacao", editando: false });
  const [salvando, setSalvando] = useState(false);
  const [senha, setSenha] = useState<{ nome: string; usuario: string; senha: string } | null>(null);
  const [gerando, setGerando] = useState("");
  const carregar = () => listarUsuarios().then(setLista).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvarUsuario({ data: { nome: form.nome, usuario: form.usuario, papel: form.papel } });
      toast.success(form.editando ? "Usuário atualizado." : "Usuário criado. Agora gere a senha provisória dele.");
      setForm({ nome: "", usuario: "", papel: "comunicacao", editando: false });
      carregar();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); } finally { setSalvando(false); }
  };

  const gerar = async (u: U) => {
    if (!u.trocarSenha && !confirm(`${u.nome} já tem senha própria. Gerar uma senha provisória substitui a atual. Continuar?`)) return;
    setGerando(u.usuario);
    try {
      const r = await gerarSenhaProvisoria({ data: { usuario: u.usuario } });
      setSenha({ nome: u.nome, usuario: u.usuario, senha: r.senha });
      carregar();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setGerando(""); }
  };

  return (
    <>
      <Secao titulo="Pessoas com acesso ao painel" descricao="Cada pessoa vê o painel inteiro, mas só usa as áreas do seu perfil; o resto fica apagado.">
        {!lista ? <Loader2 className="animate-spin text-p-suave" /> : (
          <ul className="divide-y divide-p-borda">
            {lista.map((u) => {
              const sit = situacao(u);
              return (
                <li key={u.usuario} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-p-texto">
                      {u.nome} {u.usuario === meuUsuario && <span className="text-[12px] font-normal text-p-suave">(você)</span>} <SeloPapel papel={u.papel} />
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-p-suave">
                      <span>entra como <strong className="font-semibold text-p-texto-2">{u.usuario}</strong>{u.apelidos?.length ? ` (ou ${u.apelidos.join(", ")})` : ""}</span>
                      <span className="inline-flex items-center gap-1.5"><span className={cn("size-1.5 rounded-full", sit.cor)} /> {sit.texto}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={gerando === u.usuario} onClick={() => gerar(u)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition disabled:opacity-50", u.trocarSenha ? "bg-p-acento text-white hover:opacity-90" : "border border-p-borda text-p-texto-2 hover:bg-p-hover")}>
                      {gerando === u.usuario ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Senha provisória
                    </button>
                    <button type="button" onClick={() => setForm({ nome: u.nome, usuario: u.usuario, papel: (u.papel === "editor" ? "comunicacao" : u.papel) as Papel, editando: true })} className="h-8 rounded-md px-2.5 text-[12.5px] font-semibold text-p-texto-2 hover:bg-p-hover">Editar</button>
                    {u.usuario !== meuUsuario && (
                      <button type="button" title="Remover acesso" aria-label="Remover acesso" onClick={async () => {
                        if (!confirm(`Remover o acesso de ${u.nome}?`)) return;
                        try { await removerUsuario({ data: { usuario: u.usuario } }); carregar(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                      }} className="grid size-8 place-items-center rounded-md text-p-suave hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"><Trash2 size={15} /></button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Secao>

      <Secao titulo={form.editando ? `Editar ${form.nome}` : "Adicionar pessoa"} descricao={form.editando ? "Altere o nome ou o perfil. A senha não muda aqui." : "Depois de criar, gere a senha provisória e envie para a pessoa: no primeiro acesso ela cria a própria senha."}>
        <form onSubmit={enviar} className="grid gap-5">
          <Grade>
            <Campo rotulo="Nome" valor={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Ex.: Pr. Hilário José" />
            {form.editando ? (
              <Campo rotulo="Nome de acesso" valor={form.usuario} onChange={() => {}} dica="O nome de acesso não muda." />
            ) : (
              <Campo rotulo="Nome de acesso" valor={form.usuario} onChange={(v) => setForm({ ...form, usuario: v })} placeholder="Ex.: hilario" dica="Usado para entrar (sem acentos e sem espaços)." />
            )}
          </Grade>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium text-p-texto-2">Perfil</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PAPEIS.map((p) => (
                <label key={p.valor} className={cn("relative cursor-pointer rounded-lg border p-3 transition", form.papel === p.valor ? "border-p-acento bg-p-realce ring-1 ring-p-acento" : "border-p-borda hover:border-p-borda-forte")}>
                  <input type="radio" name="papel" value={p.valor} checked={form.papel === p.valor} onChange={() => setForm({ ...form, papel: p.valor })} className="sr-only" />
                  <span className="flex items-center justify-between text-[13.5px] font-semibold text-p-texto">{p.rotulo} {form.papel === p.valor && <Check size={15} className="text-p-acento" />}</span>
                  <span className="mt-1 block text-[12px] leading-snug text-p-suave">{p.descricao}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button disabled={salvando} className="btn-primario !h-9 !px-3.5 !text-[13.5px] !py-2.5">{salvando ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} {form.editando ? "Salvar alterações" : "Criar acesso"}</button>
            {form.editando && <button type="button" onClick={() => setForm({ nome: "", usuario: "", papel: "comunicacao", editando: false })} className="h-9 rounded-md px-3.5 text-[13.5px] font-medium text-p-texto-2 hover:bg-p-hover">Cancelar</button>}
          </div>
        </form>
      </Secao>

      {senha && <JanelaSenha {...senha} aoFechar={() => setSenha(null)} />}
    </>
  );
}

/** Mostra a senha provisória uma única vez, com um texto pronto para enviar. */
function JanelaSenha({ nome, usuario, senha, aoFechar }: { nome: string; usuario: string; senha: string; aoFechar: () => void }) {
  const endereco = typeof window !== "undefined" ? `${window.location.origin}/admin` : "/admin";
  const mensagem = `Olá! Seu acesso ao painel da 1ª IEC Brasília está pronto.\n\nEndereço: ${endereco}\nNome de acesso: ${usuario}\nSenha provisória: ${senha}\n\nNo primeiro acesso, o sistema vai pedir para você criar a sua própria senha.`;
  const copiar = async (t: string, aviso: string) => { await navigator.clipboard?.writeText(t); toast.success(aviso); };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-p-borda bg-p-superficie p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-p-texto">Senha provisória de {nome}</h2>
            <p className="mt-1 text-[13px] text-p-suave">Ela aparece só agora. Envie para a pessoa por um canal seguro (pessoalmente ou no WhatsApp dela).</p>
          </div>
          <button onClick={aoFechar} className="rounded-md p-1 text-p-suave hover:bg-p-hover" aria-label="Fechar"><X size={18} /></button>
        </div>
        <dl className="mt-5 grid gap-2 rounded-lg border border-p-borda bg-p-sutil p-4 text-[13.5px]">
          <div className="flex justify-between gap-3"><dt className="text-p-suave">Nome de acesso</dt><dd className="font-semibold text-p-texto">{usuario}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-p-suave">Senha provisória</dt><dd className="font-mono text-[15px] font-bold tracking-wide text-p-texto">{senha}</dd></div>
        </dl>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button onClick={() => copiar(mensagem, "Mensagem copiada.")} className="btn-primario !h-9 !px-3.5 !text-[13px] !py-2"><Copy size={15} /> Copiar mensagem</button>
          <button onClick={() => copiar(senha, "Senha copiada.")} className="btn-contorno !h-9 !px-3.5 !text-[13px] !py-2">Copiar só a senha</button>
        </div>
      </div>
    </div>
  );
}

/** Troca de senha de quem já tem senha própria (no menu da pessoa). */
export function JanelaMinhaSenha({ aoFechar }: { aoFechar: () => void }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={aoFechar}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (nova !== confirma) { toast.error("A confirmação não confere com a nova senha."); return; }
          setEnviando(true);
          try { await trocarMinhaSenha({ data: { atual, nova } }); toast.success("Senha alterada."); aoFechar(); }
          catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); } finally { setEnviando(false); }
        }}
        className="grid w-full max-w-sm gap-4 rounded-xl border border-p-borda bg-p-superficie p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-p-texto">Minha senha</h2>
          <button type="button" onClick={aoFechar} className="rounded-md p-1 text-p-suave hover:bg-p-hover" aria-label="Fechar"><X size={18} /></button>
        </div>
        <Campo rotulo="Senha atual" tipo="password" valor={atual} onChange={setAtual} />
        <Campo rotulo="Nova senha" tipo="password" valor={nova} onChange={setNova} dica="Mínimo de 8 caracteres." />
        <Campo rotulo="Repita a nova senha" tipo="password" valor={confirma} onChange={setConfirma} />
        <button disabled={enviando} className="btn-primario !h-10 !text-[13.5px]">{enviando && <Loader2 size={15} className="animate-spin" />} Alterar senha</button>
      </form>
    </div>
  );
}
