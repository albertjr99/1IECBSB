/** Funções de servidor do app dos membros. */
import { createServerFn } from "@tanstack/react-start";
import type { Preferencias, TipoContribuicao } from "./membros";

const SENHA_MIN = 8;

export const appSessao = createServerFn({ method: "GET" }).handler(async () => {
  const { membroAtual, publico } = await import("../server/membros");
  const m = await membroAtual();
  return { membro: m ? publico(m) : null };
});

export const appCadastrar = createServerFn({ method: "POST" })
  .validator((d: { nome: string; celular: string; email?: string; nascimento?: string; senha: string }) => {
    if ((d.nome ?? "").trim().split(/\s+/).length < 2) throw new Error("Escreva o nome completo.");
    if ((d.celular ?? "").replace(/\D/g, "").length < 10) throw new Error("Informe o celular com DDD.");
    if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) throw new Error("E-mail inválido.");
    if ((d.senha ?? "").length < SENHA_MIN) throw new Error(`A senha precisa ter ao menos ${SENHA_MIN} caracteres.`);
    return d;
  })
  .handler(async ({ data }) => {
    const { lerMembros, gravarMembros, acharPorLogin, abrirSessaoMembro, novoId, publico } = await import("../server/membros");
    const { gerarHash } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const { PREFS_PADRAO, formatarCelular } = await import("./membros");
    const l = await lerMembros();
    if (acharPorLogin(l, data.celular) || (data.email && acharPorLogin(l, data.email))) throw new Error("Já existe um cadastro com este celular ou e-mail. Use “Entrar”.");
    const m = {
      id: novoId("m"), nome: data.nome.trim().replace(/\s+/g, " "), celular: formatarCelular(data.celular), email: (data.email ?? "").trim().toLowerCase(),
      nascimento: data.nascimento ?? "", situacao: "pendente" as const, hash: gerarHash(data.senha), criadoEm: new Date().toISOString(),
      prefs: { ...PREFS_PADRAO }, favoritos: { versos: [], hinos: [] },
    };
    l.push(m);
    await gravarMembros(l);
    await registrar(m.nome, "Pediu cadastro no aplicativo", m.celular);
    abrirSessaoMembro(m);
    return { membro: publico(m) };
  });

export const appEntrar = createServerFn({ method: "POST" })
  .validator((d: { login: string; senha: string }) => {
    if (!d?.login || !d?.senha) throw new Error("Informe o celular (ou e-mail) e a senha.");
    return d;
  })
  .handler(async ({ data }) => {
    const { lerMembros, acharPorLogin, autenticarMembro, abrirSessaoMembro, publico } = await import("../server/membros");
    const m = acharPorLogin(await lerMembros(), data.login);
    if (m && !m.hash) throw new Error("Seu acesso ainda não tem senha. Peça à secretaria a senha provisória.");
    if (!autenticarMembro(m, data.senha)) throw new Error("Celular ou senha incorretos.");
    abrirSessaoMembro(m!);
    return { membro: publico(m!) };
  });

export const appSair = createServerFn({ method: "POST" }).handler(async () => {
  const { encerrarSessaoMembro } = await import("../server/membros");
  encerrarSessaoMembro();
  return { ok: true };
});

/** Primeiro acesso com senha provisória, ou troca normal (com a atual). */
export const appDefinirSenha = createServerFn({ method: "POST" })
  .validator((d: { nova: string; atual?: string }) => {
    if ((d?.nova ?? "").length < SENHA_MIN) throw new Error(`A senha precisa ter ao menos ${SENHA_MIN} caracteres.`);
    return d;
  })
  .handler(async ({ data }) => {
    const { membroAtual, alterarMembro } = await import("../server/membros");
    const { gerarHash, conferirSenha } = await import("../server/auth");
    const m = await membroAtual();
    if (!m) throw new Error("Entre novamente no aplicativo.");
    if (!m.trocarSenha && !(data.atual && conferirSenha(data.atual, m.hash))) throw new Error("Senha atual incorreta.");
    await alterarMembro(m.id, (x) => { x.hash = gerarHash(data.nova); delete x.trocarSenha; });
    return { ok: true };
  });

export const appAtualizarPerfil = createServerFn({ method: "POST" })
  .validator((d: { foto?: string | null; celular?: string; email?: string; nascimento?: string; prefs?: Partial<Preferencias>; favoritos?: { versos?: string[]; hinos?: number[] }; ultimaLeitura?: { versao: string; livro: string; capitulo: number } }) => {
    if (d.foto && (!/^data:image\/(jpeg|png|webp);base64,/.test(d.foto) || d.foto.length > 400_000)) throw new Error("Foto inválida ou grande demais.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirMembro, alterarMembro, publico } = await import("../server/membros");
    const { formatarCelular } = await import("./membros");
    const eu = await exigirMembro();
    const m = await alterarMembro(eu.id, (x) => {
      if (data.foto !== undefined) { if (data.foto) x.foto = data.foto; else delete x.foto; }
      if (data.celular) x.celular = formatarCelular(data.celular);
      if (data.email !== undefined) x.email = data.email.trim().toLowerCase();
      if (data.nascimento !== undefined) x.nascimento = data.nascimento;
      if (data.prefs) x.prefs = { ...x.prefs, ...data.prefs };
      if (data.favoritos?.versos) x.favoritos.versos = data.favoritos.versos.slice(0, 500);
      if (data.favoritos?.hinos) x.favoritos.hinos = data.favoritos.hinos.slice(0, 300);
      if (data.ultimaLeitura) x.ultimaLeitura = data.ultimaLeitura;
    });
    return { membro: publico(m) };
  });

/** Tudo que a tela inicial do membro precisa, de uma vez. */
export const appInicio = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirMembro, lerReunioes } = await import("../server/membros");
  const { listarVotacoes, votosDa } = await import("../server/votacao");
  const { indice, obter } = await import("../server/boletins");
  const { situacaoDa } = await import("./votacao");
  const { partes } = await import("./boletim-facil");
  const eu = await exigirMembro();
  const pub = (await indice()).filter((b) => b.publicado);
  const ultimo = pub[0] ? await obter(pub[0].id) : null;
  const pt = ultimo ? partes(ultimo) : null;
  const avisos = pt?.avisos?.itens.filter((a) => a.estilo !== "caixa").slice(0, 4).map((a) => ({ titulo: a.titulo, texto: a.texto, destaque: a.estilo === "destaque" })) ?? [];
  const votacoes = [];
  for (const v of await listarVotacoes()) {
    const e = v.eleitores.find((x) => x.membroId === eu.id);
    if (!e || v.rascunho) continue;
    const s = situacaoDa(v);
    if (s === "encerrada" && Date.now() - new Date(v.encerradaEm ?? v.fim).getTime() > 7 * 864e5) continue;
    const votou = (await votosDa(v.id)).presenca.some((p) => p.eleitorId === e.id);
    votacoes.push({ id: v.id, titulo: v.titulo, situacao: s, fim: v.fim, inicio: v.inicio, token: e.token, votou });
  }
  const agora = Date.now();
  const reunioes = (await lerReunioes()).filter((r) => !r.cancelada && new Date(r.inicio).getTime() + r.duracaoMin * 60_000 > agora).slice(0, 3).map(({ presencas: _p, ...r }) => r);
  return {
    boletim: ultimo ? { data: ultimo.data, versiculo: ultimo.versiculo ?? "", referencia: ultimo.versiculoRef ?? "", pastoral: pt?.pastoral?.titulo ?? "", autor: pt?.pastoral?.autor ?? "" } : null,
    avisos,
    votacoes,
    reunioes,
  };
});

export const appHinos = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirMembro } = await import("../server/membros");
  const { HINARIO, letraDe } = await import("./hinario");
  await exigirMembro();
  // "letra" mantém compatível o app 1.0; "partes" traz estrofes e coro separados
  return HINARIO.map((h) => ({ ...h, letra: letraDe(h) }));
});

/** Dados do Pix da igreja e as contribuições do próprio membro. */
export const appContribuir = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirMembro, lerContribuicoes } = await import("../server/membros");
  const { obterConteudoPublico } = await import("./api");
  const eu = await exigirMembro();
  const c = await obterConteudoPublico();
  const minhas = (await lerContribuicoes()).filter((x) => x.membroId === eu.id).sort((a, b) => b.em.localeCompare(a.em));
  return { pix: { chave: c.contribua.pixChave, tipo: c.contribua.pixTipo, favorecido: c.contribua.pixFavorecido }, minhas };
});

export const appInformarContribuicao = createServerFn({ method: "POST" })
  .validator((d: { tipo: TipoContribuicao; valor: number; txid: string }) => {
    if (!d?.tipo) throw new Error("Escolha o tipo.");
    if (!Number.isInteger(d.valor) || d.valor < 100 || d.valor > 100_000_000) throw new Error("Informe um valor válido.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirMembro, lerContribuicoes, gravarContribuicoes, novoId } = await import("../server/membros");
    const eu = await exigirMembro();
    const l = await lerContribuicoes();
    if (l.some((x) => x.txid === data.txid)) return { ok: true };
    l.push({ id: novoId("c"), membroId: eu.id, membroNome: eu.nome, tipo: data.tipo, valor: data.valor, em: new Date().toISOString(), situacao: "informada", txid: data.txid });
    await gravarContribuicoes(l);
    return { ok: true };
  });

/** Entrar numa reunião: registra a presença e devolve o endereço da sala. */
export const appEntrarReuniao = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirMembro, lerReunioes, gravarReunioes } = await import("../server/membros");
    const { linkDaSala, salaAberta } = await import("./membros");
    const eu = await exigirMembro();
    const l = await lerReunioes();
    const r = l.find((x) => x.id === data.id);
    if (!r) throw new Error("Reunião não encontrada.");
    if (!salaAberta(r)) throw new Error("A sala abre 15 minutos antes do início.");
    if (!r.presencas.some((p) => p.membroId === eu.id)) {
      r.presencas.push({ membroId: eu.id, nome: eu.nome, em: new Date().toISOString() });
      await gravarReunioes(l);
    }
    return { url: linkDaSala(r.sala, eu.nome) };
  });

export const appBoletins = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirMembro } = await import("../server/membros");
  const { indice } = await import("../server/boletins");
  await exigirMembro();
  return (await indice()).filter((b) => b.publicado).slice(0, 12).map((b) => ({ id: b.id, data: b.data }));
});
