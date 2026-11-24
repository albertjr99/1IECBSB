/** Funções do painel para o app dos membros. */
import { createServerFn } from "@tanstack/react-start";
import type { Hino, SituacaoMembro } from "./membros";

// ─── Membros ────────────────────────────────────────────────────────────────

export const listarMembrosPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { lerMembros, publico } = await import("../server/membros");
  await exigirAcesso("membros");
  return (await lerMembros()).map(publico).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
});

export const salvarMembroPainel = createServerFn({ method: "POST" })
  .validator((d: { id?: string; nome: string; celular: string; email: string; nascimento: string }) => {
    if ((d.nome ?? "").trim().length < 3) throw new Error("Informe o nome.");
    if ((d.celular ?? "").replace(/\D/g, "").length < 10) throw new Error("Informe o celular com DDD.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerMembros, gravarMembros, acharPorLogin, novoId } = await import("../server/membros");
    const { registrar } = await import("../server/armazem");
    const { PREFS_PADRAO, formatarCelular } = await import("./membros");
    const s = await exigirAcesso("membros");
    const l = await lerMembros();
    const outro = acharPorLogin(l, data.celular);
    if (outro && outro.id !== data.id) throw new Error(`O celular já está no cadastro de ${outro.nome}.`);
    if (data.id) {
      const m = l.find((x) => x.id === data.id);
      if (!m) throw new Error("Membro não encontrado.");
      Object.assign(m, { nome: data.nome.trim(), celular: formatarCelular(data.celular), email: data.email.trim().toLowerCase(), nascimento: data.nascimento });
    } else {
      l.push({ id: novoId("m"), nome: data.nome.trim(), celular: formatarCelular(data.celular), email: data.email.trim().toLowerCase(), nascimento: data.nascimento, situacao: "ativo", hash: "", trocarSenha: true, criadoEm: new Date().toISOString(), aprovadoEm: new Date().toISOString(), aprovadoPor: s.nome, prefs: { ...PREFS_PADRAO }, favoritos: { versos: [], hinos: [] } });
    }
    await gravarMembros(l);
    await registrar(s.nome, data.id ? "Alterou membro do app" : "Cadastrou membro no app", data.nome);
    return { ok: true };
  });

export const situacaoMembroPainel = createServerFn({ method: "POST" })
  .validator((d: { id: string; situacao: SituacaoMembro }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerMembros, gravarMembros } = await import("../server/membros");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("membros");
    const l = await lerMembros();
    const m = l.find((x) => x.id === data.id);
    if (!m) throw new Error("Membro não encontrado.");
    m.situacao = data.situacao;
    if (data.situacao === "ativo" && !m.aprovadoEm) { m.aprovadoEm = new Date().toISOString(); m.aprovadoPor = s.nome; }
    await gravarMembros(l);
    await registrar(s.nome, data.situacao === "ativo" ? "Aprovou membro no app" : "Desativou membro no app", m.nome);
    return { ok: true };
  });

export const senhaProvisoriaMembro = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso, gerarHash } = await import("../server/auth");
    const { lerMembros, gravarMembros } = await import("../server/membros");
    const { registrar } = await import("../server/armazem");
    const { randomInt } = await import("node:crypto");
    const s = await exigirAcesso("membros");
    const l = await lerMembros();
    const m = l.find((x) => x.id === data.id);
    if (!m) throw new Error("Membro não encontrado.");
    const palavras = ["Monte", "Cruz", "Graca", "Rocha", "Farol", "Aurora", "Sinai", "Jordao", "Oliveira", "Videira"];
    const senha = `${palavras[randomInt(palavras.length)]}-${String(randomInt(1_000_000)).padStart(6, "0")}`;
    m.hash = gerarHash(senha);
    m.trocarSenha = true;
    if (m.situacao === "pendente") { m.situacao = "ativo"; m.aprovadoEm = new Date().toISOString(); m.aprovadoPor = s.nome; }
    await gravarMembros(l);
    await registrar(s.nome, "Gerou senha provisória do app", m.nome);
    return { senha, celular: m.celular, nome: m.nome };
  });

export const removerMembroPainel = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerMembros, gravarMembros } = await import("../server/membros");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("membros");
    const l = await lerMembros();
    const m = l.find((x) => x.id === data.id);
    await gravarMembros(l.filter((x) => x.id !== data.id));
    await registrar(s.nome, "Removeu membro do app", m?.nome ?? data.id);
    return { ok: true };
  });

// ─── Hinário ────────────────────────────────────────────────────────────────

export const listarHinosPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { lerHinos } = await import("../server/membros");
  await exigirAcesso("hinario");
  return lerHinos();
});

export const salvarHinoPainel = createServerFn({ method: "POST" })
  .validator((d: { hino: Hino; numeroAnterior?: number }) => {
    if (!Number.isInteger(d.hino.numero) || d.hino.numero < 1) throw new Error("Informe o número do hino.");
    if (!d.hino.titulo.trim()) throw new Error("Informe o título.");
    if (!d.hino.letra.trim()) throw new Error("Escreva a letra.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerHinos, gravarHinos } = await import("../server/membros");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("hinario");
    const l = await lerHinos();
    const anterior = data.numeroAnterior ?? data.hino.numero;
    if (data.hino.numero !== anterior && l.some((h) => h.numero === data.hino.numero)) throw new Error(`Já existe o hino nº ${data.hino.numero}.`);
    const h: Hino = { numero: data.hino.numero, titulo: data.hino.titulo.trim(), letra: data.hino.letra.replace(/\r/g, "").trim(), ...(data.hino.autor?.trim() ? { autor: data.hino.autor.trim() } : {}), ...(data.hino.secao?.trim() ? { secao: data.hino.secao.trim() } : {}) };
    await gravarHinos([...l.filter((x) => x.numero !== anterior), h]);
    await registrar(s.nome, "Salvou hino", `${h.numero} — ${h.titulo}`);
    return { ok: true };
  });

export const removerHinoPainel = createServerFn({ method: "POST" })
  .validator((d: { numero: number }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerHinos, gravarHinos } = await import("../server/membros");
    await exigirAcesso("hinario");
    await gravarHinos((await lerHinos()).filter((h) => h.numero !== data.numero));
    return { ok: true };
  });

/**
 * Importa vários hinos de um texto colado: cada hino começa com uma linha
 * "123 - Título" (ou "123. Título"); o que vem depois é a letra.
 */
export const importarHinosPainel = createServerFn({ method: "POST" })
  .validator((d: { texto: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerHinos, gravarHinos } = await import("../server/membros");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("hinario");
    const novos: Hino[] = [];
    let atual: Hino | null = null;
    for (const linha of data.texto.replace(/\r/g, "").split("\n")) {
      const m = /^\s*(\d{1,4})\s*[-–.)]\s*(.+?)\s*$/.exec(linha);
      if (m) { if (atual) novos.push(atual); atual = { numero: Number(m[1]), titulo: m[2]!, letra: "" }; continue; }
      if (atual) atual.letra += `${linha}\n`;
    }
    if (atual) novos.push(atual);
    const validos = novos.map((h) => ({ ...h, letra: h.letra.replace(/\n{3,}/g, "\n\n").trim() })).filter((h) => h.letra);
    if (!validos.length) throw new Error("Nenhum hino encontrado. Cada hino deve começar com uma linha como “1 - Título do hino”.");
    const numeros = new Set(validos.map((h) => h.numero));
    await gravarHinos([...(await lerHinos()).filter((h) => !numeros.has(h.numero)), ...validos]);
    await registrar(s.nome, "Importou hinos", `${validos.length} hino(s)`);
    return { importados: validos.length };
  });

// ─── Contribuições (tesouraria) ─────────────────────────────────────────────

export const listarContribuicoesPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { lerContribuicoes } = await import("../server/membros");
  await exigirAcesso("financas");
  return (await lerContribuicoes()).sort((a, b) => b.em.localeCompare(a.em));
});

export const confirmarContribuicaoPainel = createServerFn({ method: "POST" })
  .validator((d: { id: string; confirmar: boolean }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerContribuicoes, gravarContribuicoes } = await import("../server/membros");
    const s = await exigirAcesso("financas");
    const l = await lerContribuicoes();
    const c = l.find((x) => x.id === data.id);
    if (!c) throw new Error("Contribuição não encontrada.");
    if (data.confirmar) { c.situacao = "confirmada"; c.confirmadaPor = s.nome; c.confirmadaEm = new Date().toISOString(); }
    else { c.situacao = "informada"; delete c.confirmadaPor; delete c.confirmadaEm; }
    await gravarContribuicoes(l);
    return { ok: true };
  });

// ─── Reuniões online ────────────────────────────────────────────────────────

export const listarReunioesPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { lerReunioes } = await import("../server/membros");
  await exigirAcesso("deliberacao");
  return lerReunioes();
});

export const salvarReuniaoPainel = createServerFn({ method: "POST" })
  .validator((d: { id?: string; titulo: string; descricao: string; inicio: string; duracaoMin: number }) => {
    if (!d.titulo?.trim()) throw new Error("Dê um título à reunião.");
    if (!d.inicio || Number.isNaN(new Date(d.inicio).getTime())) throw new Error("Informe a data e o horário.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerReunioes, gravarReunioes, novoId } = await import("../server/membros");
    const { registrar } = await import("../server/armazem");
    const { randomBytes } = await import("node:crypto");
    const s = await exigirAcesso("deliberacao");
    const l = await lerReunioes();
    const existente = data.id ? l.find((x) => x.id === data.id) : undefined;
    if (existente) Object.assign(existente, { titulo: data.titulo.trim(), descricao: data.descricao.trim(), inicio: data.inicio, duracaoMin: Math.max(15, data.duracaoMin || 90) });
    else l.push({ id: novoId("r"), titulo: data.titulo.trim(), descricao: data.descricao.trim(), inicio: data.inicio, duracaoMin: Math.max(15, data.duracaoMin || 90), sala: `IECB-${randomBytes(9).toString("base64url")}`, criadaPor: s.nome, criadaEm: new Date().toISOString(), presencas: [] });
    await gravarReunioes(l);
    await registrar(s.nome, existente ? "Alterou reunião online" : "Agendou reunião online", data.titulo);
    if (!existente) {
      const { enviarPush } = await import("../server/push");
      const quando = new Date(data.inicio).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
      await enviarPush("todos", { titulo: "Reunião online", texto: `${data.titulo.trim()} — ${quando}.`, dados: { tela: "inicio" } });
    }
    return { ok: true };
  });

export const cancelarReuniaoPainel = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerReunioes, gravarReunioes } = await import("../server/membros");
    const s = await exigirAcesso("deliberacao");
    const l = await lerReunioes();
    const r = l.find((x) => x.id === data.id);
    if (r) { r.cancelada = true; await gravarReunioes(l); }
    const { registrar } = await import("../server/armazem");
    await registrar(s.nome, "Cancelou reunião online", r?.titulo ?? "");
    return { ok: true };
  });

/** Aviso no celular de todos os membros (ou de alguns). */
export const enviarNotificacaoPainel = createServerFn({ method: "POST" })
  .validator((d: { titulo: string; texto: string; membros?: string[] }) => {
    if (!d.titulo?.trim() || !d.texto?.trim()) throw new Error("Escreva o título e a mensagem.");
    if (d.titulo.length > 60 || d.texto.length > 240) throw new Error("Mensagem longa demais para notificação.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const { enviarPush } = await import("../server/push");
    const s = await exigirAcesso("membros");
    const r = await enviarPush(data.membros?.length ? data.membros : "todos", { titulo: data.titulo.trim(), texto: data.texto.trim(), dados: { tela: "inicio" } });
    await registrar(s.nome, "Enviou notificação aos membros", data.titulo);
    return r;
  });

/** Quantos membros já têm o app das lojas com notificações ligadas. */
export const resumoAparelhosPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { lerMembros } = await import("../server/membros");
  await exigirAcesso("membros");
  const l = (await lerMembros()).filter((m) => m.situacao === "ativo");
  return { ativos: l.length, comApp: l.filter((m) => m.aparelhos?.length).length };
});
