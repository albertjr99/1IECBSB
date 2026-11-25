import { createServerFn } from "@tanstack/react-start";
import type { Boletim } from "./boletim";

export const listarBoletinsPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { indice } = await import("../server/boletins");
  await exigirAcesso("boletim");
  return indice();
});

export const obterBoletimPainel = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { obter, tokenImpressao } = await import("../server/boletins");
    await exigirAcesso("boletim");
    const b = await obter(data.id);
    if (!b) throw new Error("Boletim não encontrado.");
    return { boletim: b, token: tokenImpressao(b.id, 12 * 3600_000) };
  });

export const salvarBoletim = createServerFn({ method: "POST" })
  .validator((d: { boletim: Boletim; acao?: string; baseEm?: string }) => {
    if (!d?.boletim?.id || !/^\d{4}-\d{2}-\d{2}$/.test(d.boletim.data)) throw new Error("Informe a data do boletim.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { salvar, ConflitoBoletim } = await import("../server/boletins");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("boletim");
    const b: Boletim = { ...data.boletim, atualizadoEm: new Date().toISOString(), atualizadoPor: s.nome };
    try {
      await salvar(b, { ...(data.baseEm ? { baseEm: data.baseEm } : {}), ...(data.acao ? { versao: data.acao } : {}) });
    } catch (e) {
      if (e instanceof ConflitoBoletim) return { conflito: e.message, atualizadoEm: "" };
      throw e;
    }
    if (data.acao) await registrar(s.nome, data.acao, `Boletim de ${b.data.split("-").reverse().join("/")}`);
    return { atualizadoEm: b.atualizadoEm, conflito: "" };
  });

/** Cria o boletim do domingo seguinte a partir do mais recente (ou do modelo, se ainda não houver nenhum). */
export const criarBoletimDaSemana = createServerFn({ method: "POST" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { indice, obter, salvar } = await import("../server/boletins");
  const { registrar } = await import("../server/armazem");
  const { boletimModelo } = await import("./boletim");
  const { domingoDaVez, prepararProximo } = await import("./boletim-facil");
  const s = await exigirAcesso("boletim");
  const l = await indice();
  const base = l[0] ? await obter(l[0].id) : null;
  let novo: Boletim;
  let lembretes: string[] = [];
  if (base) {
    ({ boletim: novo, lembretes } = prepararProximo(base, l.map((x) => x.data), domingoDaVez()));
  } else {
    novo = boletimModelo();
    novo.data = domingoDaVez();
  }
  novo.atualizadoEm = new Date().toISOString();
  novo.atualizadoPor = s.nome;
  await salvar(novo);
  await registrar(s.nome, "Criou boletim", novo.data.split("-").reverse().join("/"));
  return { id: novo.id, lembretes };
});

export const listarVersoesBoletim = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { versoes } = await import("../server/boletins");
    await exigirAcesso("boletim");
    return versoes(data.id);
  });

export const restaurarVersaoBoletim = createServerFn({ method: "POST" })
  .validator((d: { id: string; em: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { obter, salvar, versao } = await import("../server/boletins");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("boletim");
    const antiga = await versao(data.id, data.em);
    const atual = await obter(data.id);
    if (!antiga || !atual) throw new Error("Versão não encontrada.");
    // volta o conteúdo, mas mantém a situação no site (publicado ou não)
    const b: Boletim = { ...antiga, publicado: atual.publicado, ...(atual.publicadoEm ? { publicadoEm: atual.publicadoEm } : {}), atualizadoEm: new Date().toISOString(), atualizadoPor: s.nome };
    await salvar(b, { versao: "Antes de restaurar" });
    await registrar(s.nome, "Restaurou versão do boletim", b.data.split("-").reverse().join("/"));
    return b;
  });

export const publicarBoletim = createServerFn({ method: "POST" })
  .validator((d: { id: string; publicar: boolean }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { obter, salvar } = await import("../server/boletins");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("boletim");
    const b = await obter(data.id);
    if (!b) throw new Error("Boletim não encontrado.");
    b.publicado = data.publicar;
    if (data.publicar) b.publicadoEm = new Date().toISOString();
    b.atualizadoEm = new Date().toISOString();
    b.atualizadoPor = s.nome;
    await salvar(b, { versao: data.publicar ? "Publicado" : "Retirado do site" });
    await registrar(s.nome, data.publicar ? "Publicou boletim" : "Retirou boletim do site", b.data.split("-").reverse().join("/"));
    if (data.publicar) {
      const { avisarUmaVez } = await import("../server/push");
      const { dataBR } = await import("./datas");
      await avisarUmaVez(`boletim:${b.id}`, "todos", { titulo: "Boletim da semana", texto: `O boletim de ${dataBR(b.data)} já está no aplicativo.`, dados: { tela: "boletim", data: b.data } });
    }
    return { ok: true, publicadoEm: b.publicadoEm, atualizadoEm: b.atualizadoEm };
  });

export const excluirBoletim = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { excluir, obter } = await import("../server/boletins");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("boletim");
    const b = await obter(data.id);
    await excluir(data.id);
    await registrar(s.nome, "Excluiu boletim", b?.data.split("-").reverse().join("/") ?? data.id);
    return { ok: true };
  });

// ─── Site ───────────────────────────────────────────────────────────────────

export const listarBoletinsPublicos = createServerFn({ method: "GET" }).handler(async () => {
  const { indice } = await import("../server/boletins");
  return (await indice()).filter((b) => b.publicado);
});

/** Os publicados mais recentes, completos (para as capas e o leitor do site). */
export const listarBoletinsPublicosCompletos = createServerFn({ method: "GET" }).handler(async () => {
  const { indice, obter } = await import("../server/boletins");
  const l = (await indice()).filter((b) => b.publicado).slice(0, 16);
  return (await Promise.all(l.map((r) => obter(r.id)))).filter((b): b is NonNullable<typeof b> => Boolean(b));
});

export const obterBoletimPublico = createServerFn({ method: "GET" })
  .validator((d: { data: string }) => d)
  .handler(async ({ data }) => {
    const { obterPorData } = await import("../server/boletins");
    return obterPorData(data.data);
  });

/** Para a página de impressão: publicado, ou rascunho com link assinado. */
export const obterBoletimImpressao = createServerFn({ method: "GET" })
  .validator((d: { id: string; t?: string }) => d)
  .handler(async ({ data }) => {
    const { obter, obterPorData, tokenValido } = await import("../server/boletins");
    const { sessaoAtual } = await import("../server/auth");
    const b = /^\d{4}-\d{2}-\d{2}$/.test(data.id) ? await obterPorData(data.id) : await obter(data.id);
    if (!b) return null;
    if (b.publicado || tokenValido(b.id, data.t) || sessaoAtual()) return b;
    return null;
  });
