import { createServerFn } from "@tanstack/react-start";
import type { Boletim } from "./boletim";

export const listarBoletinsPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirSessao } = await import("../server/auth");
  const { indice } = await import("../server/boletins");
  exigirSessao();
  return indice();
});

export const obterBoletimPainel = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirSessao } = await import("../server/auth");
    const { obter, tokenImpressao } = await import("../server/boletins");
    exigirSessao();
    const b = await obter(data.id);
    if (!b) throw new Error("Boletim não encontrado.");
    return { boletim: b, token: tokenImpressao(b.id, 12 * 3600_000) };
  });

export const salvarBoletim = createServerFn({ method: "POST" })
  .validator((d: { boletim: Boletim; acao?: string }) => {
    if (!d?.boletim?.id || !/^\d{4}-\d{2}-\d{2}$/.test(d.boletim.data)) throw new Error("Informe a data do boletim.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirSessao } = await import("../server/auth");
    const { salvar } = await import("../server/boletins");
    const { registrar } = await import("../server/armazem");
    const s = exigirSessao();
    const b: Boletim = { ...data.boletim, atualizadoEm: new Date().toISOString(), atualizadoPor: s.nome };
    await salvar(b);
    if (data.acao) await registrar(s.nome, data.acao, `Boletim de ${b.data.split("-").reverse().join("/")}`);
    return { atualizadoEm: b.atualizadoEm };
  });

export const publicarBoletim = createServerFn({ method: "POST" })
  .validator((d: { id: string; publicar: boolean }) => d)
  .handler(async ({ data }) => {
    const { exigirSessao } = await import("../server/auth");
    const { obter, salvar } = await import("../server/boletins");
    const { registrar } = await import("../server/armazem");
    const s = exigirSessao();
    const b = await obter(data.id);
    if (!b) throw new Error("Boletim não encontrado.");
    b.publicado = data.publicar;
    if (data.publicar) b.publicadoEm = new Date().toISOString();
    b.atualizadoEm = new Date().toISOString();
    b.atualizadoPor = s.nome;
    await salvar(b);
    await registrar(s.nome, data.publicar ? "Publicou boletim" : "Retirou boletim do site", b.data.split("-").reverse().join("/"));
    return { ok: true, publicadoEm: b.publicadoEm };
  });

export const excluirBoletim = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirSessao } = await import("../server/auth");
    const { excluir, obter } = await import("../server/boletins");
    const { registrar } = await import("../server/armazem");
    const s = exigirSessao();
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
