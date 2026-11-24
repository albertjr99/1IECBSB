import { createServerFn } from "@tanstack/react-start";

/** Um livro da Bíblia para o membro logado (app web). */
export const appBiblia = createServerFn({ method: "GET" })
  .validator((d: { versao: string; livro: string }) => d)
  .handler(async ({ data }) => {
    const { exigirMembro } = await import("../server/membros");
    const { lerLivroBiblia } = await import("../server/biblia");
    await exigirMembro();
    const l = await lerLivroBiblia(data.versao, data.livro);
    if (!l) throw new Error("Este livro ainda não foi carregado no aplicativo.");
    return l;
  });

/** Quantos livros de cada versão já estão no banco. */
export const situacaoBibliaPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { situacaoBiblia } = await import("../server/biblia");
  await exigirAcesso("membros");
  const s = await situacaoBiblia();
  return { ara: s.ara?.length ?? 0, nvi: s.nvi?.length ?? 0 };
});

/** Importação (livro a livro) do pacote da Bíblia gerado a partir dos arquivos da igreja. */
export const importarLivroBibliaPainel = createServerFn({ method: "POST" })
  .validator((d: { versao: string; livro: string; dados: { capitulos: string[][]; titulos: Record<string, string> } }) => {
    if (!["ara", "nvi"].includes(d?.versao)) throw new Error("Versão inválida.");
    if (!/^[1-3A-Z]{3}$/.test(d?.livro ?? "")) throw new Error("Livro inválido.");
    if (!Array.isArray(d?.dados?.capitulos) || !d.dados.capitulos.every((c) => Array.isArray(c) && c.every((v) => typeof v === "string"))) throw new Error("Arquivo inválido.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { gravarLivroBiblia } = await import("../server/biblia");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("membros");
    await gravarLivroBiblia(data.versao as "ara" | "nvi", data.livro, { capitulos: data.dados.capitulos, titulos: data.dados.titulos ?? {} });
    if (data.livro === "REV") await registrar(s.nome, "Importou a Bíblia no aplicativo", data.versao.toUpperCase());
    return { ok: true };
  });

/** Procura palavras na Bíblia (membro logado). */
export const appBuscarBiblia = createServerFn({ method: "POST" })
  .validator((d: { versao: string; termo: string; testamento?: "AT" | "NT" }) => {
    if (!d?.termo || d.termo.trim().length < 2) throw new Error("Digite ao menos uma palavra.");
    return { versao: d.versao, termo: d.termo.slice(0, 80), testamento: d.testamento };
  })
  .handler(async ({ data }) => {
    const { exigirMembro } = await import("../server/membros");
    const { buscarNaBiblia } = await import("../server/biblia");
    await exigirMembro();
    return buscarNaBiblia(data.versao, data.termo, data.testamento);
  });
