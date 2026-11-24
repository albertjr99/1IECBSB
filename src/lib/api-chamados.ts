import { createServerFn } from "@tanstack/react-start";
import type { Anexo, Categoria, Chamado } from "./chamados";

const MAX_ANEXO = 3_500_000; // ~2,5 MB de arquivo (em base64)
const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function validarAnexos(anexos: Anexo[] | undefined) {
  const l = anexos ?? [];
  if (l.length > 6) throw new Error("No máximo 6 arquivos por vez.");
  for (const a of l) {
    if (!/^data:[\w.+-]+\/[\w.+-]+;base64,/.test(a.dados)) throw new Error("Arquivo inválido.");
    if (a.dados.length > MAX_ANEXO) throw new Error(`“${a.nome}” é grande demais (máx. 2,5 MB).`);
  }
  return l.map((a) => ({ ...a, id: a.id || novoId(), nome: a.nome.slice(0, 120) }));
}

/** Lista os chamados e reconcilia com o Hub (sem travar a tela se ele demorar). */
export const listarChamados = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso, listarUsuarios } = await import("../server/auth");
  const { lerChamados, ultimaLigacao, equipeDoHub } = await import("../server/chamados");
  const s = await exigirAcesso("suporte");
  const fotos = Object.fromEntries((await listarUsuarios()).filter((u) => u.foto).map((u) => [u.usuario, u.foto!]));
  return { chamados: await lerChamados(), ligacao: await ultimaLigacao(), equipe: await equipeDoHub(), fotos, eu: s.usuario };
});

export const sincronizarChamados = createServerFn({ method: "POST" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { reconciliar } = await import("../server/chamados");
  await exigirAcesso("suporte");
  return reconciliar();
});

export const abrirChamado = createServerFn({ method: "POST" })
  .validator((d: { categoria: Categoria; titulo: string; descricao: string; anexos?: Anexo[] }) => {
    if (!d?.categoria) throw new Error("Escolha do que se trata o chamado.");
    if ((d.titulo ?? "").trim().length < 5) throw new Error("Escreva um assunto com pelo menos 5 letras.");
    if ((d.descricao ?? "").trim().length < 10) throw new Error("Descreva um pouco mais o que aconteceu.");
    return { ...d, anexos: validarAnexos(d.anexos) };
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { alterarChamados, enviarEMarcar } = await import("../server/chamados");
    const { registrar } = await import("../server/armazem");
    const { LIMITE_MENSAL, doMes } = await import("./chamados");
    const s = await exigirAcesso("suporte");
    const agora = new Date().toISOString();
    const c = await alterarChamados((l) => {
      if (doMes(l) >= LIMITE_MENSAL) throw new Error(`O limite de ${LIMITE_MENSAL} chamados por mês foi atingido. Se for urgente, fale direto com a GRATIA.`);
      const novo: Chamado = {
        id: novoId(),
        numero: l.reduce((m, x) => Math.max(m, x.numero), 0) + 1,
        titulo: data.titulo.trim(),
        descricao: data.descricao.trim(),
        categoria: data.categoria,
        situacao: "aberto",
        autor: s.nome,
        autorUsuario: s.usuario,
        criadoEm: agora,
        atualizadoEm: agora,
        anexos: data.anexos,
        eventos: [{ id: novoId(), em: agora, tipo: "abertura", autor: s.nome, autorUsuario: s.usuario, conteudo: "Chamado aberto." }],
      };
      l.unshift(novo);
      return novo;
    });
    await registrar(s.nome, "Abriu chamado de TI", `nº ${c.numero} — ${c.titulo}`);
    await enviarEMarcar(c.id);
    return { id: c.id, numero: c.numero };
  });

export const comentarChamado = createServerFn({ method: "POST" })
  .validator((d: { id: string; texto: string; anexos?: Anexo[] }) => {
    if (!d?.texto?.trim() && !d?.anexos?.length) throw new Error("Escreva a mensagem ou anexe um arquivo.");
    return { ...d, anexos: validarAnexos(d.anexos) };
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { alterarChamados, enviarEMarcar } = await import("../server/chamados");
    const { fechado } = await import("./chamados");
    const s = await exigirAcesso("suporte");
    const agora = new Date().toISOString();
    await alterarChamados((l) => {
      const c = l.find((x) => x.id === data.id);
      if (!c) throw new Error("Chamado não encontrado.");
      if (fechado(c)) throw new Error("Este chamado já foi encerrado.");
      c.eventos.push({ id: novoId(), em: agora, tipo: data.anexos.length && !data.texto.trim() ? "anexo" : "comentario", autor: s.nome, autorUsuario: s.usuario, conteudo: data.texto.trim(), ...(data.anexos.length ? { anexos: data.anexos } : {}) });
      // respondeu o que a equipe pediu: volta para atendimento
      if (c.situacao === "aguardando_cliente") c.situacao = "em_analise";
      c.atualizadoEm = agora;
    });
    await enviarEMarcar(data.id);
    return { ok: true };
  });

export const cancelarChamado = createServerFn({ method: "POST" })
  .validator((d: { id: string; motivo: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { alterarChamados, enviarEMarcar } = await import("../server/chamados");
    const { podeCancelar } = await import("./chamados");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("suporte");
    const agora = new Date().toISOString();
    const n = await alterarChamados((l) => {
      const c = l.find((x) => x.id === data.id);
      if (!c) throw new Error("Chamado não encontrado.");
      if (!podeCancelar(c)) throw new Error("O chamado já foi recebido pela equipe; peça o encerramento na conversa.");
      c.situacao = "cancelado";
      c.canceladoEm = agora;
      c.atualizadoEm = agora;
      c.eventos.push({ id: novoId(), em: agora, tipo: "situacao", autor: s.nome, autorUsuario: s.usuario, conteudo: `Chamado cancelado${data.motivo?.trim() ? `: ${data.motivo.trim()}` : "."}` });
      return c.numero;
    });
    await registrar(s.nome, "Cancelou chamado de TI", `nº ${n}`);
    await enviarEMarcar(data.id);
    return { ok: true };
  });
