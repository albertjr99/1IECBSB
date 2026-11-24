/**
 * Painel ⇄ aplicativo dos membros: Membros, Hinário, Contribuições e
 * Reuniões online. Tudo o que é decidido aqui aparece no app na hora.
 */
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, KeyRound, Loader2, Music, Pencil, Plus, Search, Smartphone, Trash2, UserCheck, UserX, Users, Video, X } from "lucide-react";
import { toast } from "sonner";
import {
  confirmarContribuicaoPainel, importarHinosPainel, listarContribuicoesPainel, listarHinosPainel, listarMembrosPainel, listarReunioesPainel,
  cancelarReuniaoPainel, removerHinoPainel, removerMembroPainel, salvarHinoPainel, salvarMembroPainel, salvarReuniaoPainel, senhaProvisoriaMembro, situacaoMembroPainel,
} from "@/lib/api-membros";
import { SITUACAO_MEMBRO_ROTULO, TIPO_CONTRIBUICAO, linkDaSala, reais, salaAberta, soDigitos, type Hino, type MembroPublico, type SituacaoMembro } from "@/lib/membros";
import { cn, linkWhatsapp } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Camada } from "./Camada";
import { Campo, Grade, Secao } from "./kit";

const enderecoApp = () => (typeof window !== "undefined" ? `${window.location.origin}/app` : "/app");
const dataBR = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

function Cabeca({ sobre, titulo, texto, acao }: { sobre: string; titulo: string; texto: string; acao?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[66ch]">
        <p className="ef-sobre">{sobre}</p>
        <h1 className="ef-titulo mt-2.5">{titulo}</h1>
        <p className="ef-sub mt-1.5">{texto}</p>
      </div>
      {acao}
    </header>
  );
}

// ═══ Membros ═══════════════════════════════════════════════════════════════

export function ModuloMembros() {
  const [lista, setLista] = useState<MembroPublico[] | null>(null);
  const [filtro, setFiltro] = useState<SituacaoMembro | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<{ id?: string; nome: string; celular: string; email: string; nascimento: string } | null>(null);
  const [senha, setSenha] = useState<{ nome: string; celular: string; senha: string } | null>(null);
  const carregar = () => listarMembrosPainel().then((l) => { setLista(l); if (l.some((m) => m.situacao === "pendente")) setFiltro((f) => (f === "todos" ? "pendente" : f)); }).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []);

  const conta = (s: SituacaoMembro) => lista?.filter((m) => m.situacao === s).length ?? 0;
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const visiveis = (lista ?? []).filter((m) => (filtro === "todos" || m.situacao === filtro) && (!busca || norm(`${m.nome} ${m.celular} ${m.email}`).includes(norm(busca))));

  const acao = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); carregar(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } };
  const gerarSenha = async (m: MembroPublico) => {
    try { setSenha(await senhaProvisoriaMembro({ data: { id: m.id } })); carregar(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const convite = `A 1ª IEC Brasília tem um aplicativo para os membros: Bíblia, hinário, boletim, ofertas e votações.\n\nAbra ${enderecoApp()} no celular, toque em “Criar cadastro” e depois, no menu do navegador, em “Adicionar à tela inicial”.`;

  return (
    <div className="mx-auto grid max-w-6xl gap-7 p-4 sm:p-8">
      <Cabeca
        sobre="Igreja"
        titulo="Membros do aplicativo"
        texto="Quem pede cadastro no app aparece aqui para a aprovação da secretaria. Também dá para cadastrar alguém direto e enviar a senha provisória pelo WhatsApp."
        acao={<button onClick={() => setForm({ nome: "", celular: "", email: "", nascimento: "" })} className="ef-btn ef-btn-pri !h-12"><Plus size={17} /> Cadastrar membro</button>}
      />

      <section className="ef-peca ef-peca-filete grid gap-4 px-6 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="ef-h2">Convide os membros</p>
          <p className="mt-1.5 text-[14px] text-p-suave">Endereço do aplicativo: <strong className="font-semibold text-p-texto">{enderecoApp()}</strong>. Funciona no iPhone e no Android, instalado na tela inicial como um app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigator.clipboard?.writeText(convite).then(() => toast.success("Convite copiado."))} className="ef-btn ef-btn-sec"><Copy size={15} /> Copiar convite</button>
          <a href="/app" target="_blank" rel="noopener" className="ef-btn ef-btn-sec"><Smartphone size={15} /> Abrir o app</a>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-p-borda pb-3">
        <div className="ef-chaves">
          {([["todos", `Todos · ${lista?.length ?? 0}`], ["pendente", `Aguardando · ${conta("pendente")}`], ["ativo", `Ativos · ${conta("ativo")}`], ["inativo", `Inativos · ${conta("inativo")}`]] as const).map(([v, r]) => (
            <button key={v} aria-pressed={filtro === v} onClick={() => setFiltro(v)} className={cn(v === "pendente" && conta("pendente") > 0 && filtro !== v && "!text-red-700")}>{r}</button>
          ))}
        </div>
        <label className="relative w-full max-w-[280px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-p-suave" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou celular" className="ef-campo !h-10 pl-9 !text-[14px]" />
        </label>
      </div>

      {!lista ? <Loader2 className="mx-auto animate-spin text-p-suave" /> : visiveis.length === 0 ? (
        <p className="border border-dashed border-p-borda-forte px-6 py-10 text-center text-[14.5px] text-p-suave">{lista.length ? "Ninguém nesta lista." : "Nenhum membro ainda. Envie o convite ou cadastre alguém."}</p>
      ) : (
        <ul className="ef-peca">
          {visiveis.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-p-borda px-4 py-3.5 last:border-0">
              <Avatar nome={m.nome} foto={m.foto} tamanho={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold text-p-texto">{m.nome}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12.5px] text-p-suave">
                  <span>{m.celular}</span>{m.email && <span>{m.email}</span>}{m.nascimento && <span>nasc. {dataBR(m.nascimento)}</span>}
                  <span className="inline-flex items-center gap-1.5"><span className={cn("size-1.5 rounded-full", m.situacao === "ativo" ? (m.trocarSenha ? "bg-amber-400" : "bg-emerald-500") : m.situacao === "pendente" ? "bg-red-500" : "bg-p-borda-forte")} />{m.situacao === "ativo" && m.trocarSenha ? "Aguardando o primeiro acesso" : SITUACAO_MEMBRO_ROTULO[m.situacao]}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {m.situacao === "pendente" && <button onClick={() => acao(() => situacaoMembroPainel({ data: { id: m.id, situacao: "ativo" } }), `${m.nome} aprovado(a).`)} className="ef-btn ef-btn-pri !h-9 !px-3.5"><UserCheck size={15} /> Aprovar</button>}
                {m.situacao !== "pendente" && <button onClick={() => gerarSenha(m)} className="ef-btn ef-btn-fantasma !h-9" title="Gerar senha provisória"><KeyRound size={15} /> <span className="hidden sm:inline">Senha</span></button>}
                <button onClick={() => setForm({ id: m.id, nome: m.nome, celular: m.celular, email: m.email, nascimento: m.nascimento })} className="ef-btn ef-btn-fantasma !h-9" title="Editar"><Pencil size={15} /></button>
                {m.situacao === "ativo" && <button onClick={() => acao(() => situacaoMembroPainel({ data: { id: m.id, situacao: "inativo" } }), "Acesso desativado.")} className="ef-btn ef-btn-fantasma !h-9" title="Desativar acesso"><UserX size={15} /></button>}
                {m.situacao === "inativo" && <button onClick={() => acao(() => situacaoMembroPainel({ data: { id: m.id, situacao: "ativo" } }), "Acesso reativado.")} className="ef-btn ef-btn-fantasma !h-9">Reativar</button>}
                <button onClick={() => { if (confirm(`Remover ${m.nome} do aplicativo? O histórico de contribuições continua guardado.`)) acao(() => removerMembroPainel({ data: { id: m.id } }), "Removido."); }} className="ef-btn ef-btn-perigo" title="Remover"><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <Camada>
          <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setForm(null)}>
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={async (e) => {
                e.preventDefault();
                try { await salvarMembroPainel({ data: form }); toast.success(form.id ? "Cadastro atualizado." : "Membro cadastrado. Gere a senha provisória para ele entrar."); setForm(null); carregar(); }
                catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
              }}
              className="ef-janela grid w-full max-w-[520px] gap-5 p-7"
            >
              <div className="flex items-start justify-between"><div><p className="ef-sobre">Membros</p><h2 className="mt-2.5 text-[21px] font-bold text-p-texto">{form.id ? "Editar cadastro" : "Cadastrar membro"}</h2></div><button type="button" onClick={() => setForm(null)} className="p-1 text-p-suave" aria-label="Fechar"><X size={18} /></button></div>
              <Campo rotulo="Nome completo" valor={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
              <Grade>
                <Campo rotulo="Celular (WhatsApp)" valor={form.celular} onChange={(v) => setForm({ ...form, celular: v })} placeholder="(61) 99999-0000" />
                <Campo rotulo="Data de nascimento" tipo="date" valor={form.nascimento} onChange={(v) => setForm({ ...form, nascimento: v })} />
              </Grade>
              <Campo rotulo="E-mail (opcional)" tipo="email" valor={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <button className="ef-btn ef-btn-pri justify-self-start">{form.id ? "Salvar" : "Cadastrar"}</button>
            </form>
          </div>
        </Camada>
      )}

      {senha && (
        <Camada>
          <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center p-4">
            <div className="ef-janela w-full max-w-md p-7">
              <div className="flex items-start justify-between"><p className="ef-sobre">Senha provisória</p><button onClick={() => setSenha(null)} className="p-1 text-p-suave" aria-label="Fechar"><X size={18} /></button></div>
              <h2 className="mt-3 text-[20px] font-bold text-p-texto">{senha.nome}</h2>
              <p className="mt-1 text-[13.5px] text-p-suave">Aparece só agora. No primeiro acesso, o app pede para a pessoa criar a própria senha.</p>
              <dl className="mt-5 grid gap-2 border border-p-borda bg-p-sutil p-4 text-[14px]">
                <div className="flex justify-between"><dt className="text-p-suave">Entra com</dt><dd className="font-semibold">{senha.celular}</dd></div>
                <div className="flex justify-between"><dt className="text-p-suave">Senha provisória</dt><dd className="font-mono text-[15px] font-bold">{senha.senha}</dd></div>
              </dl>
              {(() => {
                const msg = `Olá, ${senha.nome.split(" ")[0]}! Seu acesso ao aplicativo da 1ª IEC Brasília está pronto.\n\nAbra: ${enderecoApp()}\nCelular: ${senha.celular}\nSenha provisória: ${senha.senha}\n\nNo primeiro acesso você cria a sua própria senha.`;
                return (
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <a href={linkWhatsapp(soDigitos(senha.celular), msg)} target="_blank" rel="noopener" className="ef-btn ef-btn-pri">Enviar no WhatsApp</a>
                    <button onClick={() => navigator.clipboard?.writeText(msg).then(() => toast.success("Mensagem copiada."))} className="ef-btn ef-btn-sec"><Copy size={15} /> Copiar</button>
                  </div>
                );
              })()}
            </div>
          </div>
        </Camada>
      )}
    </div>
  );
}

// ═══ Hinário ══════════════════════════════════════════════════════════════

export function ModuloHinario() {
  const [lista, setLista] = useState<Hino[] | null>(null);
  const [busca, setBusca] = useState("");
  const [edicao, setEdicao] = useState<{ hino: Hino; anterior?: number } | null>(null);
  const [importar, setImportar] = useState<string | null>(null);
  const carregar = () => listarHinosPainel().then(setLista).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []);
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const visiveis = (lista ?? []).filter((h) => !busca || String(h.numero) === busca.trim() || norm(`${h.titulo} ${h.letra}`).includes(norm(busca)));
  const proximo = (lista ?? []).reduce((m, h) => Math.max(m, h.numero), 0) + 1;

  return (
    <div className="mx-auto grid max-w-5xl gap-7 p-4 sm:p-8">
      <Cabeca
        sobre="Igreja"
        titulo="Hinário"
        texto="Os hinos que aparecem no aplicativo dos membros, com busca por número, título ou trecho da letra."
        acao={<div className="flex gap-2"><button onClick={() => setImportar("")} className="ef-btn ef-btn-sec !h-12"><Download size={16} /> Importar vários</button><button onClick={() => setEdicao({ hino: { numero: proximo, titulo: "", letra: "" } })} className="ef-btn ef-btn-pri !h-12"><Plus size={17} /> Novo hino</button></div>}
      />
      <p className="border-l-[3px] border-amber-400 bg-amber-500/10 px-4 py-3 text-[13.5px] leading-relaxed text-p-texto-2">
        O hinário <strong>Salmos e Hinos</strong> tem edição com direitos da editora. Antes de cadastrar as letras, vale a igreja confirmar com a União (UIECB) ou a editora a autorização para o uso no aplicativo.
      </p>
      <label className="relative max-w-[360px]">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-p-suave" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Número, título ou trecho" className="ef-campo !h-11 pl-9" />
      </label>
      {!lista ? <Loader2 className="mx-auto animate-spin text-p-suave" /> : visiveis.length === 0 ? (
        <section className="ef-peca ef-peca-filete px-6 py-10 text-center">
          <Music className="mx-auto text-p-acento" size={28} strokeWidth={1.6} />
          <p className="mt-3 text-[16px] font-bold text-p-texto">{lista.length ? "Nenhum hino encontrado." : "O hinário ainda está vazio"}</p>
          {!lista.length && <p className="mx-auto mt-1 max-w-[52ch] text-[14px] text-p-suave">Cadastre hino por hino, ou use “Importar vários” e cole o texto de muitos hinos de uma vez.</p>}
        </section>
      ) : (
        <ul className="ef-peca">
          {visiveis.map((h) => (
            <li key={h.numero} className="flex items-center gap-4 border-b border-p-borda px-4 py-3 last:border-0">
              <span className="ef-num w-12 shrink-0 text-[18px] font-bold text-p-acento">{h.numero}</span>
              <button onClick={() => setEdicao({ hino: h, anterior: h.numero })} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14.5px] font-bold text-p-texto">{h.titulo}</span>
                <span className="block truncate text-[12.5px] text-p-suave">{h.letra.split("\n")[0]}</span>
              </button>
              <button onClick={() => setEdicao({ hino: h, anterior: h.numero })} className="ef-btn ef-btn-fantasma !h-9"><Pencil size={15} /></button>
              <button onClick={async () => { if (!confirm(`Remover o hino ${h.numero}?`)) return; await removerHinoPainel({ data: { numero: h.numero } }); carregar(); }} className="ef-btn ef-btn-perigo"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      {edicao && (
        <Camada>
          <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setEdicao(null)}>
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={async (e) => {
                e.preventDefault();
                try { await salvarHinoPainel({ data: { hino: edicao.hino, ...(edicao.anterior ? { numeroAnterior: edicao.anterior } : {}) } }); toast.success("Hino salvo."); setEdicao(null); carregar(); }
                catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
              }}
              className="ef-janela grid max-h-full w-full max-w-[640px] gap-5 overflow-y-auto p-7"
            >
              <div className="flex items-start justify-between"><div><p className="ef-sobre">Hinário</p><h2 className="mt-2.5 text-[21px] font-bold">{edicao.anterior ? `Hino ${edicao.anterior}` : "Novo hino"}</h2></div><button type="button" onClick={() => setEdicao(null)} className="p-1 text-p-suave" aria-label="Fechar"><X size={18} /></button></div>
              <div className="grid gap-5 sm:grid-cols-[110px_1fr]">
                <Campo rotulo="Número" tipo="number" valor={String(edicao.hino.numero)} onChange={(v) => setEdicao({ ...edicao, hino: { ...edicao.hino, numero: Number(v) } })} />
                <Campo rotulo="Título" valor={edicao.hino.titulo} onChange={(v) => setEdicao({ ...edicao, hino: { ...edicao.hino, titulo: v } })} />
              </div>
              <Campo rotulo="Letra" multilinha linhas={14} valor={edicao.hino.letra} onChange={(v) => setEdicao({ ...edicao, hino: { ...edicao.hino, letra: v } })} dica="Uma linha em branco entre as estrofes. Para o coro, comece a estrofe com “Coro:”." />
              <Grade>
                <Campo rotulo="Autor (opcional)" valor={edicao.hino.autor ?? ""} onChange={(v) => setEdicao({ ...edicao, hino: { ...edicao.hino, autor: v } })} />
                <Campo rotulo="Seção (opcional)" valor={edicao.hino.secao ?? ""} onChange={(v) => setEdicao({ ...edicao, hino: { ...edicao.hino, secao: v } })} placeholder="Ex.: Adoração, Ceia" />
              </Grade>
              <button className="ef-btn ef-btn-pri justify-self-start">Salvar hino</button>
            </form>
          </div>
        </Camada>
      )}

      {importar !== null && (
        <Camada>
          <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setImportar(null)}>
            <div onClick={(e) => e.stopPropagation()} className="ef-janela grid w-full max-w-[680px] gap-4 p-7">
              <div className="flex items-start justify-between"><div><p className="ef-sobre">Hinário</p><h2 className="mt-2.5 text-[21px] font-bold">Importar vários hinos</h2></div><button onClick={() => setImportar(null)} className="p-1 text-p-suave" aria-label="Fechar"><X size={18} /></button></div>
              <p className="text-[13.5px] text-p-suave">Cole o texto. Cada hino começa com uma linha com o número e o título, por exemplo <strong className="text-p-texto">12 - Título do hino</strong>; as linhas seguintes são a letra. Hinos com o mesmo número são substituídos.</p>
              <textarea value={importar} onChange={(e) => setImportar(e.target.value)} rows={14} className="ef-campo font-mono !text-[13px]" placeholder={"1 - Título do primeiro hino\nPrimeira estrofe…\n\nCoro: …\n\n2 - Título do segundo hino\n…"} />
              <button disabled={!importar.trim()} onClick={async () => { try { const r = await importarHinosPainel({ data: { texto: importar } }); toast.success(`${r.importados} hino(s) importado(s).`); setImportar(null); carregar(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } }} className="ef-btn ef-btn-pri justify-self-start">Importar</button>
            </div>
          </div>
        </Camada>
      )}
    </div>
  );
}

// ═══ Contribuições (Finanças) ═════════════════════════════════════════════

export function PainelContribuicoes() {
  const [lista, setLista] = useState<Awaited<ReturnType<typeof listarContribuicoesPainel>> | null>(null);
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const carregar = () => listarContribuicoesPainel().then(setLista).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []);
  const doMes = (lista ?? []).filter((c) => c.em.slice(0, 7) === mes);
  const total = (s?: string) => doMes.filter((c) => !s || c.situacao === s).reduce((t, c) => t + c.valor, 0);
  const porTipo = useMemo(() => Object.entries(TIPO_CONTRIBUICAO).map(([k, r]) => [r, doMes.filter((c) => c.tipo === k).reduce((t, c) => t + c.valor, 0)] as const).filter(([, v]) => v > 0), [doMes]);
  const csv = () => {
    const linhas = [["Data", "Membro", "Tipo", "Valor", "Situação", "Identificador"], ...doMes.map((c) => [quando(c.em), c.membroNome, TIPO_CONTRIBUICAO[c.tipo], (c.valor / 100).toFixed(2).replace(".", ","), c.situacao === "confirmada" ? "Confirmada" : "Informada", c.txid])];
    const blob = new Blob(["﻿" + linhas.map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `contribuicoes-app-${mes}.csv`; a.click();
  };
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-p-borda pb-3">
        <div>
          <h2 className="ef-h2">Contribuições pelo aplicativo</h2>
          <p className="mt-1 text-[13.5px] text-p-suave">O membro paga pelo Pix no banco dele e informa no app. Confira no extrato e marque como confirmada.</p>
        </div>
        <div className="flex gap-2">
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="ef-campo !h-10 !w-auto !text-[14px]" />
          <button onClick={csv} disabled={!doMes.length} className="ef-btn ef-btn-sec !h-10"><Download size={15} /> Planilha</button>
        </div>
      </div>
      <div className="ef-peca grid grid-cols-3">
        {([["Informado no mês", total()], ["Confirmado", total("confirmada")], ["A conferir", total("informada")]] as const).map(([r, v], i) => (
          <div key={r} className={cn("px-5 py-4", i < 2 && "border-r border-p-borda")}><p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-p-suave">{r}</p><p className="ef-num mt-1.5 text-[22px] font-bold text-p-acento">{reais(v)}</p></div>
        ))}
      </div>
      {porTipo.length > 0 && <p className="text-[13px] text-p-suave">{porTipo.map(([r, v]) => `${r}: ${reais(v)}`).join(" · ")}</p>}
      {!lista ? <Loader2 className="mx-auto animate-spin text-p-suave" /> : doMes.length === 0 ? (
        <p className="border border-dashed border-p-borda-forte px-6 py-8 text-center text-[14px] text-p-suave">Nenhuma contribuição informada neste mês.</p>
      ) : (
        <ul className="ef-peca">
          {doMes.map((c) => (
            <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-p-borda px-4 py-3 last:border-0">
              <span className="min-w-0"><span className="block truncate text-[14px] font-bold text-p-texto">{c.membroNome}</span><span className="text-[12px] text-p-suave">{TIPO_CONTRIBUICAO[c.tipo]} · {quando(c.em)} · {c.txid}</span></span>
              <span className="ef-num text-[15px] font-bold text-p-texto">{reais(c.valor)}</span>
              <button onClick={async () => { await confirmarContribuicaoPainel({ data: { id: c.id, confirmar: c.situacao !== "confirmada" } }); carregar(); }} className={cn("ef-btn !h-9 !px-3", c.situacao === "confirmada" ? "ef-btn-sec !text-emerald-700" : "ef-btn-pri")} title={c.situacao === "confirmada" ? `Confirmada por ${c.confirmadaPor}` : "Marcar como recebida"}>
                {c.situacao === "confirmada" ? <><Check size={14} /> Confirmada</> : "Confirmar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ═══ Reuniões online (Assembleia Online) ══════════════════════════════════

export function ModuloReunioes() {
  const [lista, setLista] = useState<Awaited<ReturnType<typeof listarReunioesPainel>> | null>(null);
  const [form, setForm] = useState<{ id?: string; titulo: string; descricao: string; data: string; hora: string; duracaoMin: number } | null>(null);
  const [presenca, setPresenca] = useState<string | null>(null);
  const carregar = () => listarReunioesPainel().then(setLista).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []);
  const agora = Date.now();
  const proximas = (lista ?? []).filter((r) => !r.cancelada && new Date(r.inicio).getTime() + r.duracaoMin * 60_000 > agora);
  const passadas = (lista ?? []).filter((r) => !proximas.includes(r)).reverse();
  const aberta = lista?.find((r) => r.id === presenca);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-[62ch] text-[14.5px] text-p-texto-2">Reuniões por vídeo para os membros do aplicativo. A sala abre 15 minutos antes; quem entra pelo app fica na lista de presença automaticamente.</p>
        <button onClick={() => setForm({ titulo: "", descricao: "", data: new Date().toISOString().slice(0, 10), hora: "19:30", duracaoMin: 90 })} className="ef-btn ef-btn-pri !h-11"><Plus size={16} /> Agendar reunião</button>
      </div>
      {!lista ? <Loader2 className="mx-auto animate-spin text-p-suave" /> : (
        <>
          <section>
            <h2 className="ef-h2 mb-3 border-b border-p-borda pb-2.5">Próximas</h2>
            {proximas.length === 0 ? <p className="text-[14px] text-p-suave">Nenhuma reunião agendada.</p> : (
              <ul className="grid gap-3">
                {proximas.map((r) => (
                  <li key={r.id} className="ef-peca ef-peca-filete flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className="grid w-14 shrink-0 text-center"><span className="ef-num text-[24px] font-bold leading-none text-p-acento">{r.inicio.slice(8, 10)}</span><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-p-suave">{new Date(r.inicio).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></span>
                    <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold text-p-texto">{r.titulo}</span><span className="text-[12.5px] text-p-suave">{new Date(r.inicio).toLocaleString("pt-BR", { weekday: "long", hour: "2-digit", minute: "2-digit" })} · {r.duracaoMin} min · {r.presencas.length} presentes</span></span>
                    <span className="flex flex-wrap gap-1">
                      <a href={linkDaSala(r.sala, "Presidência — 1ª IEC Brasília")} target="_blank" rel="noopener" className={cn("ef-btn !h-9", salaAberta(r) ? "ef-btn-pri" : "ef-btn-sec")}><Video size={15} /> {salaAberta(r) ? "Entrar agora" : "Abrir a sala"}</a>
                      <button onClick={() => setPresenca(r.id)} className="ef-btn ef-btn-fantasma !h-9"><Users size={15} /> Presença</button>
                      <button onClick={() => setForm({ id: r.id, titulo: r.titulo, descricao: r.descricao, data: r.inicio.slice(0, 10), hora: new Date(r.inicio).toTimeString().slice(0, 5), duracaoMin: r.duracaoMin })} className="ef-btn ef-btn-fantasma !h-9"><Pencil size={15} /></button>
                      <button onClick={async () => { if (!confirm("Cancelar esta reunião?")) return; await cancelarReuniaoPainel({ data: { id: r.id } }); carregar(); }} className="ef-btn ef-btn-perigo">Cancelar</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {passadas.length > 0 && (
            <section>
              <h2 className="ef-h2 mb-3 border-b border-p-borda pb-2.5">Anteriores</h2>
              <ul className="ef-peca">
                {passadas.slice(0, 12).map((r) => (
                  <li key={r.id} className="flex items-center gap-4 border-b border-p-borda px-4 py-3 last:border-0">
                    <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold text-p-texto">{r.titulo}{r.cancelada && <span className="ml-2 text-[11px] font-bold uppercase text-p-suave">cancelada</span>}</span><span className="text-[12px] text-p-suave">{quando(r.inicio)} · {r.presencas.length} presentes</span></span>
                    <button onClick={() => setPresenca(r.id)} className="ef-btn ef-btn-fantasma !h-9"><Users size={15} /> Presença</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {form && (
        <Camada>
          <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setForm(null)}>
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await salvarReuniaoPainel({ data: { ...(form.id ? { id: form.id } : {}), titulo: form.titulo, descricao: form.descricao, inicio: new Date(`${form.data}T${form.hora}:00`).toISOString(), duracaoMin: form.duracaoMin } });
                  toast.success(form.id ? "Reunião atualizada." : "Reunião agendada. Ela já aparece no aplicativo dos membros.");
                  setForm(null); carregar();
                } catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
              }}
              className="ef-janela grid w-full max-w-[540px] gap-5 p-7"
            >
              <div className="flex items-start justify-between"><div><p className="ef-sobre">Assembleia Online</p><h2 className="mt-2.5 text-[21px] font-bold">{form.id ? "Editar reunião" : "Agendar reunião"}</h2></div><button type="button" onClick={() => setForm(null)} className="p-1 text-p-suave" aria-label="Fechar"><X size={18} /></button></div>
              <Campo rotulo="Título" valor={form.titulo} onChange={(v) => setForm({ ...form, titulo: v })} placeholder="Ex.: Assembleia Geral Ordinária" />
              <Campo rotulo="Pauta / descrição" multilinha linhas={3} valor={form.descricao} onChange={(v) => setForm({ ...form, descricao: v })} />
              <div className="grid gap-5 sm:grid-cols-3">
                <Campo rotulo="Data" tipo="date" valor={form.data} onChange={(v) => setForm({ ...form, data: v })} />
                <Campo rotulo="Horário" tipo="time" valor={form.hora} onChange={(v) => setForm({ ...form, hora: v })} />
                <Campo rotulo="Duração (min)" tipo="number" valor={String(form.duracaoMin)} onChange={(v) => setForm({ ...form, duracaoMin: Number(v) })} />
              </div>
              <button className="ef-btn ef-btn-pri justify-self-start">Salvar</button>
            </form>
          </div>
        </Camada>
      )}

      {aberta && (
        <Camada>
          <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setPresenca(null)}>
            <div onClick={(e) => e.stopPropagation()} className="ef-janela grid max-h-[80vh] w-full max-w-md grid-rows-[auto_1fr_auto] p-7">
              <div className="flex items-start justify-between"><div><p className="ef-sobre">Lista de presença</p><h2 className="mt-2.5 text-[19px] font-bold">{aberta.titulo}</h2><p className="text-[13px] text-p-suave">{aberta.presencas.length} presentes</p></div><button onClick={() => setPresenca(null)} className="p-1 text-p-suave" aria-label="Fechar"><X size={18} /></button></div>
              <ol className="mt-4 overflow-y-auto border-y border-p-borda">
                {aberta.presencas.map((p, i) => <li key={p.membroId} className="flex justify-between border-b border-p-borda py-2 text-[14px] last:border-0"><span><span className="ef-num mr-3 text-p-suave">{String(i + 1).padStart(2, "0")}</span>{p.nome}</span><span className="text-[12px] text-p-suave">{new Date(p.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></li>)}
                {!aberta.presencas.length && <li className="py-6 text-center text-[13.5px] text-p-suave">Ninguém entrou ainda.</li>}
              </ol>
              <button onClick={() => navigator.clipboard?.writeText(aberta.presencas.map((p, i) => `${i + 1}. ${p.nome}`).join("\n")).then(() => toast.success("Lista copiada."))} className="ef-btn ef-btn-sec mt-4 justify-self-start"><Copy size={15} /> Copiar lista</button>
            </div>
          </div>
        </Camada>
      )}
    </div>
  );
}

