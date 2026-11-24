/**
 * Chamados de TI e o ciclo com o GRATIA HUB — mesma lógica da ACIP.
 *
 *  · IDA — chamado aberto ou alterado sobe ao Hub na hora; o que falhar
 *    fica pendente e é reenviado na próxima reconciliação.
 *  · VOLTA, NA HORA — a cada decisão da equipe o Hub chama /api/hub/retorno,
 *    assinado (HMAC); o estado vai direto para o banco.
 *  · VOLTA, GARANTIDA — /api/hub/sincronizar (agendado) e a abertura da tela
 *    puxam o estado completo e reaplicam: aviso perdido ou Hub fora do ar se
 *    acertam na próxima rodada.
 *
 * Quem manda no quê: situação, prioridade e respostas da equipe vêm do Hub e
 * prevalecem. Título, descrição, anexos e comentários de quem abriu são do
 * painel, e o Hub nunca os toca.
 *
 * Configuração só no ambiente: GRATIA_HUB_URL (…/api/v1), GRATIA_HUB_TOKEN,
 * GRATIA_HUB_ORIGEM (padrão "iecb"), GRATIA_HUB_SEGREDO_RETORNO e CRON_SECRET.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { gravar, ler } from "./armazem";
import { listarUsuarios } from "./auth";
import {
  CATEGORIA_ROTULO, PRIORIDADE_ROTULO, SITUACAO_HUB, SITUACAO_ROTULO, pendenteDeEnvio,
  type Anexo, type Chamado, type Evento, type Prioridade, type Situacao,
} from "@/lib/chamados";

const CHAVE = "chamados";
const CHAVE_EQUIPE = "hub:equipe";
const CHAVE_PESSOAS = "hub:pessoas-enviadas";
const CHAVE_LIGACAO = "hub:ultima-ligacao";

export async function lerChamados(): Promise<Chamado[]> {
  return (await ler<Chamado[]>(CHAVE)) ?? [];
}
export async function gravarChamados(l: Chamado[]) {
  await gravar(CHAVE, l);
}
/** Lê, altera e grava a lista (uma gravação só). */
export async function alterarChamados<T>(fn: (l: Chamado[]) => T): Promise<T> {
  const l = await lerChamados();
  const r = fn(l);
  await gravarChamados(l);
  return r;
}

// ─── Configuração do Hub ────────────────────────────────────────────────────

type Config = { url: string; token: string; origem: string };
export function configHub(): Config | null {
  const url = process.env.GRATIA_HUB_URL;
  const token = process.env.GRATIA_HUB_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token, origem: process.env.GRATIA_HUB_ORIGEM || "iecb" };
}
const cabecalhos = (c: Config): HeadersInit => ({ Authorization: `Bearer ${c.token}`, "Content-Type": "application/json", "X-Origem": c.origem });
const limite = (ms = 8000) => AbortSignal.timeout(ms);

// ─── Pacote para o Hub (o contrato é o mesmo da ACIP) ──────────────────────

const TIPO_EVENTO: Record<Evento["tipo"], string> = {
  abertura: "abertura", comentario: "comentário", situacao: "mudança de situação", prioridade: "classificação", anexo: "anexo",
};

/** O arquivo só sobe enquanto o Hub não o tem; depois vai só o identificador. */
function anexo(a: Anexo, comConteudo: boolean) {
  return { id: a.id, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho, ...(comConteudo && a.dados ? { dados: a.dados } : {}) };
}

export function empacotar(c: Chamado, forcar: Set<string> = new Set()) {
  return {
    id: c.id,
    numero: c.numero,
    titulo: c.titulo,
    descricao: c.descricao,
    categoria: CATEGORIA_ROTULO[c.categoria],
    situacao: SITUACAO_HUB[c.situacao],
    prioridade: c.prioridade ? PRIORIDADE_ROTULO[c.prioridade] : null,
    solicitante: c.autor,
    abertoEm: c.criadoEm,
    atualizadoEm: c.atualizadoEm,
    resolvidoEm: c.resolvidoEm ?? null,
    canceladoEm: c.canceladoEm ?? null,
    anexos: c.anexos.map((a) => anexo(a, !c.sincronizadoEm || forcar.has(a.id) || forcar.has(a.nome))),
    // o que veio do Hub (id "hub-…") não volta para ele
    historico: c.eventos.filter((e) => !e.id.startsWith("hub-")).map((e) => ({
      em: e.em,
      tipo: TIPO_EVENTO[e.tipo],
      autor: e.autor,
      conteudo: e.conteudo,
      ...(e.anexos?.length ? { anexos: e.anexos.map((a) => anexo(a, !c.sincronizadoEm || e.em > c.sincronizadoEm || forcar.has(a.id) || forcar.has(a.nome))) } : {}),
    })),
    externalId: c.externalId ?? null,
  };
}

/** Envia um chamado. Nunca lança: o painel funciona mesmo com o Hub fora do ar. */
export async function enviarAoHub(c: Chamado): Promise<{ enviado: boolean; externalId?: string; excluido?: boolean; motivo?: string }> {
  const cfg = configHub();
  if (!cfg) return { enviado: false, motivo: "Hub de atendimento não configurado." };
  try {
    const r = await fetch(`${cfg.url}/chamados`, { method: "POST", headers: cabecalhos(cfg), body: JSON.stringify({ origem: cfg.origem, chamado: empacotar(c) }), signal: limite() });
    if (!r.ok) return { enviado: false, motivo: `O Hub respondeu ${r.status}.` };
    const corpo = (await r.json().catch(() => ({}))) as { id?: string; externalId?: string; excluido?: boolean };
    const externalId = corpo.externalId ?? corpo.id;
    return { enviado: true, ...(externalId ? { externalId } : {}), ...(corpo.excluido ? { excluido: true } : {}) };
  } catch (e) {
    return { enviado: false, motivo: e instanceof Error ? e.message : "Falha de rede." };
  }
}

/** Envia e marca como sincronizado (quando der certo). */
export async function enviarEMarcar(id: string) {
  const c = (await lerChamados()).find((x) => x.id === id);
  if (!c) return;
  const r = await enviarAoHub(c);
  if (!r.enviado) return;
  await alterarChamados((l) => {
    const i = l.findIndex((x) => x.id === id);
    if (i < 0) return;
    if (r.excluido) { l.splice(i, 1); return; }
    l[i] = { ...l[i]!, sincronizadoEm: new Date().toISOString(), ...(r.externalId ? { externalId: r.externalId } : {}) };
  });
}

// ─── Volta: estado vindo do Hub ─────────────────────────────────────────────

const SITUACAO: Record<string, Situacao> = {
  "Recebido": "recebido", "Em análise": "em_analise", "Em atendimento": "em_desenvolvimento",
  "Aguardando solicitante": "aguardando_cliente", "Concluído": "resolvido", "Encerrado": "encerrado", "Cancelado": "cancelado",
  // nomes antigos do Hub
  "Aberto": "recebido", "Pendente": "em_analise", "Em Progresso": "em_desenvolvimento", "Em Espera": "aguardando_cliente", "Resolvido": "resolvido",
};
const PRIORIDADE: Record<string, Prioridade> = { "Crítica": "critica", "Alta": "alta", "Média": "media", "Baixa": "baixa" };

export type EstadoDoHub = {
  idOrigem: string;
  anexosFaltando?: string[];
  externalId?: string | null;
  situacao: string;
  prioridade?: string | null;
  resolvidoEm?: string | null;
  canceladoEm?: string | null;
  eventosDoHub?: { id: string; em: string | null; tipo: string; autor: string; conteudo: string; anexos?: { id: string; nome: string; tipo: string; tamanho: number; endereco: string }[] }[];
};

function aplicar(c: Chamado, e: EstadoDoHub, baixados: Map<string, Anexo>): Chamado | null {
  const situacao = SITUACAO[e.situacao];
  const prioridade = e.prioridade ? PRIORIDADE[e.prioridade] : undefined;
  const conhecidos = new Set(c.eventos.map((x) => x.id));
  const novos: Evento[] = (e.eventosDoHub ?? []).filter((ev) => !conhecidos.has(ev.id)).map((ev) => {
    const anexos = (ev.anexos ?? []).flatMap((a) => baixados.get(a.id) ?? []);
    return {
      id: ev.id.startsWith("hub-") ? ev.id : `hub-${ev.id}`,
      em: ev.em ?? new Date().toISOString(),
      tipo: (ev.tipo === "resposta" ? "comentario" : ev.tipo === "classificacao" ? "prioridade" : "situacao") as Evento["tipo"],
      autor: ev.tipo === "resposta" ? `${ev.autor} · Equipe GRATIA` : "Atendimento",
      conteudo: ev.conteudo,
      ...(anexos.length ? { anexos } : {}),
    };
  }).filter((ev) => !conhecidos.has(ev.id));
  const mudouSituacao = !!situacao && situacao !== c.situacao;
  const mudouPrioridade = !!prioridade && prioridade !== c.prioridade;
  const ganhouId = !!e.externalId && e.externalId !== c.externalId;
  if (!mudouSituacao && !mudouPrioridade && !ganhouId && !novos.length) return null;
  const agora = new Date().toISOString();
  if (mudouSituacao && !novos.some((n) => n.tipo === "situacao")) {
    novos.push({ id: `hub-st-${e.situacao}-${c.id}-${agora}`, em: agora, tipo: "situacao", autor: "Atendimento", conteudo: `Situação: ${SITUACAO_ROTULO[situacao!]}.` });
  }
  if (mudouPrioridade && !novos.some((n) => n.tipo === "prioridade")) {
    novos.push({ id: `hub-pr-${e.prioridade}-${c.id}-${agora}`, em: agora, tipo: "prioridade", autor: "Atendimento", conteudo: `Prioridade: ${PRIORIDADE_ROTULO[prioridade!]}.` });
  }
  return {
    ...c,
    ...(situacao ? { situacao } : {}),
    ...(prioridade ? { prioridade } : {}),
    ...(e.externalId ? { externalId: e.externalId } : {}),
    ...(e.resolvidoEm ? { resolvidoEm: e.resolvidoEm } : {}),
    ...(e.canceladoEm ? { canceladoEm: e.canceladoEm } : {}),
    atualizadoEm: agora,
    // mudança vinda do Hub não é pendência de envio
    sincronizadoEm: agora,
    eventos: [...c.eventos, ...novos].sort((a, b) => a.em.localeCompare(b.em)),
  };
}

/** Baixa do Hub os anexos novos das respostas da equipe (antes de gravar). */
async function baixarAnexos(estados: EstadoDoHub[]): Promise<Map<string, Anexo>> {
  const cfg = configHub();
  const baixados = new Map<string, Anexo>();
  if (!cfg) return baixados;
  const conhecidos = new Set((await lerChamados()).flatMap((c) => c.eventos.map((x) => x.id.replace(/^hub-/, ""))));
  const raiz = new URL(cfg.url).origin;
  for (const e of estados) for (const ev of e.eventosDoHub ?? []) {
    if (conhecidos.has(ev.id.replace(/^hub-/, ""))) continue;
    for (const a of ev.anexos ?? []) {
      try {
        const r = await fetch(raiz + a.endereco, { headers: cabecalhos(cfg), signal: limite() });
        if (!r.ok) continue;
        const bytes = Buffer.from(await r.arrayBuffer());
        if (bytes.length > 4_000_000) continue;
        baixados.set(a.id, { id: a.id, nome: a.nome, tipo: a.tipo, tamanho: bytes.length, dados: `data:${a.tipo};base64,${bytes.toString("base64")}` });
      } catch { /* a mensagem chega mesmo assim */ }
    }
  }
  return baixados;
}

export async function aplicarNoBanco(estados: EstadoDoHub[], excluidos: string[] = []): Promise<number> {
  if (!estados.length && !excluidos.length) return 0;
  const baixados = await baixarAnexos(estados);
  const porId = new Map(estados.map((e) => [e.idOrigem, e]));
  const apagar = new Set(excluidos);
  return alterarChamados((l) => {
    let aplicados = 0;
    for (let i = l.length - 1; i >= 0; i--) {
      const c = l[i]!;
      if (apagar.has(c.id)) { l.splice(i, 1); aplicados++; continue; }
      const e = porId.get(c.id);
      const novo = e ? aplicar(c, e, baixados) : null;
      if (novo) { l[i] = novo; aplicados++; }
    }
    return aplicados;
  });
}

/** Confere a assinatura do aviso do Hub. Recusa aviso com mais de 5 minutos. */
export function assinaturaValida(corpo: string, momento: string | null, assinatura: string | null) {
  const segredo = process.env.GRATIA_HUB_SEGREDO_RETORNO;
  if (!segredo || !momento || !assinatura?.startsWith("sha256=")) return false;
  if (Math.abs(Date.now() / 1000 - Number(momento)) > 300) return false;
  const esperado = createHmac("sha256", segredo).update(`${momento}.${corpo}`).digest("hex");
  const a = Buffer.from(assinatura.slice(7));
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ─── Equipe e pessoas (fotos dos dois lados) ────────────────────────────────

export type PessoaDaEquipe = { nome: string; primeiroNome: string; foto: string | null };

async function atualizarEquipe(cfg: Config) {
  try {
    const r = await fetch(`${cfg.url}/equipe`, { headers: cabecalhos(cfg), signal: limite() });
    if (!r.ok) return;
    const { equipe } = (await r.json()) as { equipe?: PessoaDaEquipe[] };
    if (!Array.isArray(equipe)) return;
    await gravar(CHAVE_EQUIPE, equipe.map((p) => ({
      nome: String(p.nome ?? "").slice(0, 120),
      primeiroNome: String(p.primeiroNome ?? "").slice(0, 60),
      foto: typeof p.foto === "string" && p.foto.startsWith("data:image/") && p.foto.length < 900_000 ? p.foto : null,
    })));
  } catch { /* sem fotos desta vez */ }
}
export async function equipeDoHub(): Promise<PessoaDaEquipe[]> {
  return (await ler<PessoaDaEquipe[]>(CHAVE_EQUIPE)) ?? [];
}

/** Leva ao Hub nome e foto de quem usa o painel (só quando muda). */
async function enviarPessoas(cfg: Config) {
  try {
    const lista = (await listarUsuarios()).map((u) => ({ nome: u.nome, foto: u.foto ?? null }));
    const assinatura = createHash("sha256").update(JSON.stringify(lista)).digest("hex");
    if ((await ler<string>(CHAVE_PESSOAS)) === assinatura) return;
    const r = await fetch(`${cfg.url}/pessoas`, { method: "POST", headers: cabecalhos(cfg), body: JSON.stringify({ pessoas: lista }), signal: limite(20000) });
    if (r.ok) await gravar(CHAVE_PESSOAS, assinatura);
  } catch { /* vai na próxima */ }
}

// ─── Reconciliação ──────────────────────────────────────────────────────────

export type Relatorio = { enviados: number; aplicados: number; erro?: string; em: string };

export async function reconciliar(): Promise<Relatorio> {
  const em = new Date().toISOString();
  const cfg = configHub();
  if (!cfg) {
    const r = { enviados: 0, aplicados: 0, erro: "O GRATIA HUB ainda não foi configurado neste site (GRATIA_HUB_URL e GRATIA_HUB_TOKEN).", em };
    await gravar(CHAVE_LIGACAO, r);
    return r;
  }
  // 1. ida: o que o painel tem e o Hub ainda não
  let enviados = 0;
  for (const c of (await lerChamados()).filter(pendenteDeEnvio)) {
    await enviarEMarcar(c.id);
    enviados++;
  }
  // 2. volta: o estado completo, sempre
  try {
    const r = await fetch(`${cfg.url}/chamados/atualizacoes`, { headers: cabecalhos(cfg), signal: limite() });
    if (!r.ok) {
      const motivo = r.status === 401 || r.status === 403 ? "o Hub recusou o token (confira GRATIA_HUB_TOKEN)"
        : r.status === 404 ? "endereço não encontrado (GRATIA_HUB_URL deve terminar em /api/v1)"
        : r.status >= 500 ? "o Hub está com erro interno" : "resposta inesperada";
      const rel = { enviados, aplicados: 0, erro: `O Hub respondeu ${r.status}: ${motivo}.`, em };
      await gravar(CHAVE_LIGACAO, rel);
      return rel;
    }
    const { chamados = [], excluidos = [] } = (await r.json()) as { chamados?: EstadoDoHub[]; excluidos?: string[] };
    // arquivos que o Hub só conhece pelo nome: sobem agora
    const atuais = await lerChamados();
    for (const e of chamados.filter((x) => x.anexosFaltando?.length)) {
      const c = atuais.find((x) => x.id === e.idOrigem);
      if (!c) continue;
      try {
        await fetch(`${cfg.url}/chamados`, { method: "POST", headers: cabecalhos(cfg), body: JSON.stringify({ origem: cfg.origem, chamado: empacotar(c, new Set(e.anexosFaltando)) }), signal: limite(20000) });
      } catch { /* próxima rodada */ }
    }
    const aplicados = await aplicarNoBanco(chamados, excluidos);
    await atualizarEquipe(cfg);
    await enviarPessoas(cfg);
    const rel = { enviados, aplicados, em };
    await gravar(CHAVE_LIGACAO, rel);
    return rel;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    const rel = { enviados, aplicados: 0, erro: /abort|timeout|fetch failed|ENOTFOUND|ECONNREFUSED/i.test(m) ? "o GRATIA HUB não respondeu agora; as respostas chegam quando ele voltar" : m, em };
    await gravar(CHAVE_LIGACAO, rel);
    return rel;
  }
}

export async function ultimaLigacao(): Promise<Relatorio | null> {
  return ler<Relatorio>(CHAVE_LIGACAO);
}
