/**
 * Escalas dos ministérios — funções de servidor do app (web e lojas) e do painel.
 *
 * Membro: vê as escalas em que está, confirma ou avisa que não poderá, e marca
 * as datas em que estará fora. Líder: monta, publica e repete escalas, cuida
 * das funções e de quem serve no ministério. Painel: cria ministérios e define
 * a liderança.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Escala, ItemRoteiro, MinisterioApp, Musica, Resposta, Serie } from "./escalas";

type Nomes = Record<string, string>;

export type VagaVista = { id: string; funcaoId: string; funcao: string; membroId?: string; nome?: string; foto?: string; resposta: Resposta; motivo?: string; respondidoEm?: string };

export type EscalaVista = {
  id: string; ministerioId: string; ministerio: string; icone: string; titulo: string; inicio: string; local?: string; observacoes?: string;
  situacao: Escala["situacao"]; serieId?: string; vagas: VagaVista[]; roteiro: ItemRoteiro[]; musicas: Musica[];
  /** ids das vagas do membro que está vendo */
  minhas: string[]; confirmados: number; preenchidas: number; total: number;
  historico?: Escala["historico"];
};

/** Versão da foto de cada membro (o app busca a imagem em /api/foto/<id>?v=…). */
type Fotos = Record<string, string>;
let fotosAtuais: Fotos = {};

function vista(e: Escala, m: MinisterioApp, nomes: Nomes, euId: string, lider: boolean): EscalaVista {
  const fn = new Map(m.funcoes.map((f) => [f.id, f.nome]));
  const ordem = new Map(m.funcoes.map((f, i) => [f.id, i]));
  const vagas = [...e.vagas]
    .sort((a, b) => (ordem.get(a.funcaoId) ?? 99) - (ordem.get(b.funcaoId) ?? 99))
    .map((v) => ({ id: v.id, funcaoId: v.funcaoId, funcao: fn.get(v.funcaoId) ?? "Função removida", membroId: v.membroId, nome: v.membroId ? nomes[v.membroId] ?? "Membro removido" : undefined, foto: v.membroId ? fotosAtuais[v.membroId] : undefined, resposta: v.resposta, respondidoEm: v.respondidoEm, ...(lider || v.membroId === euId ? { motivo: v.motivo } : {}) }));
  return {
    id: e.id, ministerioId: m.id, ministerio: m.nome, icone: m.icone, titulo: e.titulo, inicio: e.inicio, local: e.local, observacoes: e.observacoes,
    situacao: e.situacao, serieId: e.serieId, vagas, roteiro: e.roteiro, musicas: e.musicas,
    minhas: e.vagas.filter((v) => v.membroId === euId).map((v) => v.id),
    confirmados: e.vagas.filter((v) => v.membroId && v.resposta === "confirmado").length,
    preenchidas: e.vagas.filter((v) => v.membroId).length, total: e.vagas.length,
    ...(lider ? { historico: e.historico.slice(-30) } : {}),
  };
}

async function nomesDosMembros(): Promise<Nomes> {
  const { lerMembros } = await import("../server/membros");
  const { versaoDaFoto } = await import("../server/fotos-membros");
  const l = await lerMembros();
  fotosAtuais = Object.fromEntries(l.filter((m) => m.foto).map((m) => [m.id, versaoDaFoto(m.foto!)]));
  return Object.fromEntries(l.map((m) => [m.id, m.nome]));
}

async function avisar(ids: string[], titulo: string, texto: string, escalaId: string) {
  if (!ids.length) return;
  const { enviarPush } = await import("../server/push");
  await enviarPush([...new Set(ids)], { titulo, texto, dados: { tela: "escala", id: escalaId } });
}

const quandoCurto = async (iso: string) => {
  const { dataComDia, hora } = await import("./datas");
  const { diaDe } = await import("./escalas");
  return `${dataComDia(diaDe(iso))} às ${hora(iso)}`;
};

// ─── Membro ─────────────────────────────────────────────────────────────────

/** Tela "Escalas": meus ministérios, próximas escalas e minhas ausências. */
export const escInicio = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirMembro } = await import("../server/membros");
  const { lerMinisterios, lerEscalas, lerIndisponibilidades, ehLider } = await import("../server/escalas");
  const eu = await exigirMembro();
  const ms = await lerMinisterios();
  const meus = ms.filter((m) => m.membros.some((x) => x.membroId === eu.id));
  const nomes = await nomesDosMembros();
  const desde = Date.now() - 4 * 3600e3;
  const escalas = await lerEscalas();
  const porId = new Map(ms.map((m) => [m.id, m]));
  const proximas = escalas
    .filter((e) => e.situacao === "publicada" && new Date(e.inicio).getTime() > desde && e.vagas.some((v) => v.membroId === eu.id))
    .map((e) => vista(e, porId.get(e.ministerioId)!, nomes, eu.id, ehLider(porId.get(e.ministerioId)!, eu.id)))
    .filter((e) => e.ministerio);
  const recentes = escalas
    .filter((e) => e.situacao === "publicada" && new Date(e.inicio).getTime() <= desde && new Date(e.inicio).getTime() > Date.now() - 60 * 864e5 && e.vagas.some((v) => v.membroId === eu.id))
    .reverse().slice(0, 8)
    .map((e) => vista(e, porId.get(e.ministerioId)!, nomes, eu.id, false));
  return {
    ministerios: meus.map((m) => {
      const eu2 = m.membros.find((x) => x.membroId === eu.id)!;
      const fn = new Map(m.funcoes.map((f) => [f.id, f.nome]));
      const futuras = escalas.filter((e) => e.ministerioId === m.id && new Date(e.inicio).getTime() > desde);
      return {
        id: m.id, nome: m.nome, icone: m.icone, lider: Boolean(eu2.lider), funcoes: eu2.funcoes.map((f) => fn.get(f)).filter(Boolean) as string[],
        pessoas: m.membros.length,
        rascunhos: eu2.lider ? futuras.filter((e) => e.situacao === "rascunho").length : 0,
        recusas: eu2.lider ? futuras.filter((e) => e.situacao === "publicada" && e.vagas.some((v) => v.resposta === "recusado")).length : 0,
      };
    }),
    proximas,
    recentes,
    pendentes: proximas.reduce((n, e) => n + e.vagas.filter((v) => v.membroId === eu.id && v.resposta === "pendente").length, 0),
    ausencias: (await lerIndisponibilidades()).filter((i) => i.membroId === eu.id).sort((a, b) => a.de.localeCompare(b.de)),
  };
});

/** Uma escala: quem participa do ministério vê a publicada; a liderança vê também o rascunho. */
export const escVer = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirMembro } = await import("../server/membros");
    const { lerMinisterios, lerEscalas, lerIndisponibilidades, ehLider, participa } = await import("../server/escalas");
    const { choques, diaDe, indisponivelEm } = await import("./escalas");
    const eu = await exigirMembro();
    const escalas = await lerEscalas();
    const e = escalas.find((x) => x.id === data.id);
    if (!e) throw new Error("Esta escala não existe mais.");
    const m = (await lerMinisterios()).find((x) => x.id === e.ministerioId);
    if (!m) throw new Error("Ministério não encontrado.");
    const lider = ehLider(m, eu.id);
    const estou = e.vagas.some((v) => v.membroId === eu.id);
    if (!lider && !(e.situacao === "publicada" && (estou || participa(m, eu.id)))) throw new Error("Você não tem acesso a esta escala.");
    const nomes = await nomesDosMembros();
    let alertas: Record<string, string[]> = {};
    if (lider) {
      const ind = await lerIndisponibilidades();
      const dia = diaDe(e.inicio);
      const porMin = new Map((await lerMinisterios()).map((x) => [x.id, x.nome]));
      for (const v of e.vagas) {
        if (!v.membroId) continue;
        const a: string[] = [];
        const i = indisponivelEm(ind, v.membroId, dia);
        if (i) a.push(`Marcou ausência${i.motivo ? ` (${i.motivo})` : ""} nesta data`);
        for (const c of choques(escalas, e, v.membroId)) a.push(`Também escalado(a) em ${porMin.get(c.ministerioId) ?? "outro ministério"} · ${c.titulo}`);
        if (e.vagas.filter((x) => x.membroId === v.membroId).length > 1) a.push("Está em mais de uma função nesta escala");
        if (a.length) alertas[v.id] = a;
      }
    }
    return {
      escala: vista(e, m, nomes, eu.id, lider),
      ministerio: { id: m.id, nome: m.nome, icone: m.icone, repertorio: m.repertorio, funcoes: m.funcoes },
      lider, alertas,
    };
  });

/** Confirmar ou avisar que não poderá (a própria vaga). */
export const escResponder = createServerFn({ method: "POST" })
  .validator((d: { id: string; vagaId: string; resposta: Resposta; motivo?: string }) => {
    if (!["confirmado", "recusado", "pendente"].includes(d?.resposta)) throw new Error("Resposta inválida.");
    if ((d.motivo ?? "").length > 300) throw new Error("Escreva um motivo mais curto.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirMembro } = await import("../server/membros");
    const { lerMinisterios, lerEscalas, gravarEscalas } = await import("../server/escalas");
    const eu = await exigirMembro();
    const l = await lerEscalas();
    const e = l.find((x) => x.id === data.id);
    const v = e?.vagas.find((x) => x.id === data.vagaId);
    if (!e || !v || v.membroId !== eu.id) throw new Error("Esta vaga não é sua (a escala pode ter mudado).");
    if (e.situacao !== "publicada") throw new Error("Esta escala ainda não foi publicada.");
    if (new Date(e.inicio).getTime() < Date.now() - 3 * 3600e3) throw new Error("Esta escala já passou.");
    const antes = v.resposta;
    v.resposta = data.resposta;
    v.motivo = data.resposta === "recusado" ? (data.motivo ?? "").trim() || undefined : undefined;
    v.respondidoEm = new Date().toISOString();
    e.historico.push({ em: v.respondidoEm, quem: eu.nome, o: data.resposta === "confirmado" ? "Confirmou" : data.resposta === "recusado" ? "Avisou que não poderá" : "Desfez a resposta" });
    await gravarEscalas(l);
    if (data.resposta === "recusado" && antes !== "recusado") {
      const m = (await lerMinisterios()).find((x) => x.id === e.ministerioId);
      const fn = m?.funcoes.find((f) => f.id === v.funcaoId)?.nome ?? "";
      const lideres = (m?.membros ?? []).filter((x) => x.lider && x.membroId !== eu.id).map((x) => x.membroId);
      await avisar(lideres, `${eu.nome.split(" ")[0]} não poderá servir`, `${m?.nome} · ${e.titulo}, ${await quandoCurto(e.inicio)} (${fn})${v.motivo ? `: ${v.motivo}` : ""}`, e.id);
    }
    return { ok: true };
  });

/** Datas em que o membro estará fora (aparece como alerta para quem escala). */
export const escAusencia = createServerFn({ method: "POST" })
  .validator((d: { de: string; ate: string; motivo?: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d?.de ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(d?.ate ?? "")) throw new Error("Informe as datas.");
    if (d.ate < d.de) throw new Error("A data final vem antes da inicial.");
    if ((d.motivo ?? "").length > 120) throw new Error("Escreva um motivo mais curto.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirMembro, novoId } = await import("../server/membros");
    const { lerIndisponibilidades, gravarIndisponibilidades } = await import("../server/escalas");
    const eu = await exigirMembro();
    const l = await lerIndisponibilidades();
    l.push({ id: novoId("ind"), membroId: eu.id, de: data.de, ate: data.ate, motivo: data.motivo?.trim() || undefined, criadoEm: new Date().toISOString() });
    await gravarIndisponibilidades(l);
    return { ok: true };
  });

export const escAusenciaRemover = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirMembro } = await import("../server/membros");
    const { lerIndisponibilidades, gravarIndisponibilidades } = await import("../server/escalas");
    const eu = await exigirMembro();
    await gravarIndisponibilidades((await lerIndisponibilidades()).filter((i) => !(i.id === data.id && i.membroId === eu.id)));
    return { ok: true };
  });

// ─── Liderança ──────────────────────────────────────────────────────────────

/** Tudo que a liderança precisa para cuidar do ministério. */
export const escMinisterio = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirMembro, lerMembros } = await import("../server/membros");
    const { lerEscalas, lerSeries, lerIndisponibilidades, exigirLider } = await import("../server/escalas");
    const eu = await exigirMembro();
    const { m } = await exigirLider(data.id, eu.id);
    const membros = await lerMembros();
    const nomes = await nomesDosMembros();
    const todas = await lerEscalas();
    const doMin = todas.filter((e) => e.ministerioId === m.id);
    const agora = Date.now();
    const fn = new Map(m.funcoes.map((f) => [f.id, f.nome]));
    const ind = await lerIndisponibilidades();
    const ids = new Set(m.membros.map((x) => x.membroId));
    // participação de cada um nos últimos 90 dias (para escalar com justiça)
    const passadas = doMin.filter((e) => e.situacao === "publicada" && new Date(e.inicio).getTime() < agora && new Date(e.inicio).getTime() > agora - 90 * 864e5);
    const musicasUsadas = new Map<string, Musica & { vezes: number }>();
    for (const e of doMin.filter((x) => x.situacao === "publicada")) for (const mu of e.musicas) {
      const k = mu.hino ? `h${mu.hino}` : mu.titulo.trim().toLowerCase();
      const ja = musicasUsadas.get(k);
      musicasUsadas.set(k, { ...(ja ?? mu), tom: mu.tom || ja?.tom, link: mu.link || ja?.link, cifra: mu.cifra || ja?.cifra, vezes: (ja?.vezes ?? 0) + 1 });
    }
    return {
      ministerio: m,
      equipe: m.membros.map((x) => {
        const minhas = passadas.filter((e) => e.vagas.some((v) => v.membroId === x.membroId));
        return {
          membroId: x.membroId, nome: nomes[x.membroId] ?? "Membro removido", foto: fotosAtuais[x.membroId], lider: Boolean(x.lider), funcoes: x.funcoes,
          funcoesNomes: x.funcoes.map((f) => fn.get(f)).filter(Boolean) as string[],
          vezes90: minhas.length, ultima: minhas[minhas.length - 1]?.inicio,
          faltas: minhas.filter((e) => e.vagas.some((v) => v.membroId === x.membroId && v.resposta === "recusado")).length,
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      escalas: doMin.filter((e) => new Date(e.inicio).getTime() > agora - 45 * 864e5).map((e) => vista(e, m, nomes, eu.id, true)),
      series: (await lerSeries()).filter((s) => s.ministerioId === m.id),
      ausencias: ind.filter((i) => ids.has(i.membroId)).map((i) => ({ ...i, nome: nomes[i.membroId] ?? "" })).sort((a, b) => a.de.localeCompare(b.de)),
      /** para incluir gente nova no ministério */
      membrosIgreja: membros.filter((x) => x.situacao === "ativo" && !ids.has(x.id)).map((x) => ({ id: x.id, nome: x.nome, foto: fotosAtuais[x.id] })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      musicasUsadas: [...musicasUsadas.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 200),
    };
  });

type EscalaEntrada = {
  id?: string; ministerioId: string; titulo: string; inicio: string; local?: string; observacoes?: string;
  vagas: { id?: string; funcaoId: string; membroId?: string }[]; roteiro: ItemRoteiro[]; musicas: Musica[];
  publicar?: boolean;
};

/** Cria ou altera uma escala (rascunho, ou já publicada). Quem entrou ou saiu recebe aviso. */
export const escSalvar = createServerFn({ method: "POST" })
  .validator((d: EscalaEntrada) => {
    if (!(d?.titulo ?? "").trim()) throw new Error("Dê um nome para a escala (ex.: Culto de domingo).");
    if (Number.isNaN(new Date(d.inicio).getTime())) throw new Error("Informe a data e o horário.");
    if (!Array.isArray(d.vagas) || d.vagas.length > 60) throw new Error("Vagas inválidas.");
    if ((d.musicas ?? []).length > 40 || (d.roteiro ?? []).length > 60) throw new Error("Lista grande demais.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirMembro } = await import("../server/membros");
    const { lerEscalas, gravarEscalas, exigirLider, novoId } = await import("../server/escalas");
    const eu = await exigirMembro();
    const { m } = await exigirLider(data.ministerioId, eu.id);
    const funcoes = new Set(m.funcoes.map((f) => f.id));
    const pessoas = new Set(m.membros.map((x) => x.membroId));
    for (const v of data.vagas) {
      if (!funcoes.has(v.funcaoId)) throw new Error("Há uma função que não existe mais neste ministério.");
      if (v.membroId && !pessoas.has(v.membroId)) throw new Error("Há uma pessoa que não faz parte do ministério.");
    }
    const l = await lerEscalas();
    const agora = new Date().toISOString();
    let e = data.id ? l.find((x) => x.id === data.id) : undefined;
    if (data.id && (!e || e.ministerioId !== m.id)) throw new Error("Esta escala não existe mais.");
    const antes = new Map((e?.vagas ?? []).map((v) => [v.id, v]));
    const vagas = data.vagas.map((v) => {
      const a = v.id ? antes.get(v.id) : undefined;
      // mesma pessoa na mesma vaga: mantém a resposta; mudou: volta a "aguardando"
      if (a && a.membroId === v.membroId && a.funcaoId === v.funcaoId) return { ...a };
      return { id: v.id && a ? v.id : novoId("v"), funcaoId: v.funcaoId, membroId: v.membroId || undefined, resposta: "pendente" as const };
    });
    const limpa = (s?: string) => (s ?? "").trim().slice(0, 600) || undefined;
    const url = (s?: string) => { const t = (s ?? "").trim(); return !t ? undefined : /^https?:\/\//i.test(t) ? t.slice(0, 400) : /^[\w-]+(\.[\w-]+)+(\/|$)/.test(t) ? `https://${t}`.slice(0, 400) : undefined; };
    const base = {
      titulo: data.titulo.trim().slice(0, 80), inicio: new Date(data.inicio).toISOString(), local: limpa(data.local)?.slice(0, 80), observacoes: limpa(data.observacoes),
      vagas,
      roteiro: (data.roteiro ?? []).filter((r) => r.item.trim()).map((r) => ({ id: r.id || novoId("r"), item: r.item.trim().slice(0, 120), minutos: r.minutos && r.minutos > 0 ? Math.min(600, Math.round(r.minutos)) : undefined, obs: limpa(r.obs)?.slice(0, 200) })),
      musicas: (data.musicas ?? []).filter((x) => x.titulo.trim()).map((x) => ({ id: x.id || novoId("mu"), hino: x.hino, titulo: x.titulo.trim().slice(0, 120), artista: limpa(x.artista)?.slice(0, 80), tom: limpa(x.tom)?.slice(0, 8), link: url(x.link), cifra: url(x.cifra), obs: limpa(x.obs)?.slice(0, 200) })),
    };
    const eraPublicada = e?.situacao === "publicada";
    const mudouHorario = e && e.inicio !== base.inicio;
    if (!e) {
      e = { id: novoId("esc"), ministerioId: m.id, situacao: "rascunho", criadoEm: agora, alteradoEm: agora, historico: [{ em: agora, quem: eu.nome, o: "Criou a escala" }], ...base };
      l.push(e);
    } else {
      Object.assign(e, base, { alteradoEm: agora });
      e.historico.push({ em: agora, quem: eu.nome, o: "Alterou a escala" });
    }
    const publicarAgora = data.publicar && e.situacao === "rascunho";
    if (publicarAgora) { e.situacao = "publicada"; e.historico.push({ em: agora, quem: eu.nome, o: "Publicou" }); }
    await gravarEscalas(l);

    if (e.situacao === "publicada") {
      const q = await quandoCurto(e.inicio);
      const fn = new Map(m.funcoes.map((f) => [f.id, f.nome]));
      const funcoesDe = (id: string) => e!.vagas.filter((v) => v.membroId === id).map((v) => fn.get(v.funcaoId)).join(", ");
      const novos = publicarAgora || !eraPublicada
        ? e.vagas.filter((v) => v.membroId && v.membroId !== eu.id)
        : e.vagas.filter((v) => v.membroId && v.membroId !== eu.id && !(antes.get(v.id)?.membroId === v.membroId));
      for (const id of new Set(novos.map((v) => v.membroId!))) await avisar([id], `Você foi escalado(a): ${m.nome}`, `${e.titulo}, ${q} · ${funcoesDe(id)}. Toque para confirmar.`, e.id);
      if (eraPublicada) {
        const sairam = [...antes.values()].filter((a) => a.membroId && !e!.vagas.some((v) => v.membroId === a.membroId)).map((a) => a.membroId!);
        await avisar(sairam.filter((x) => x !== eu.id), `Mudança na escala: ${m.nome}`, `Você não está mais em ${e.titulo}, ${q}.`, e.id);
        if (mudouHorario) {
          const ficaram = e.vagas.filter((v) => v.membroId && v.membroId !== eu.id && antes.get(v.id)?.membroId === v.membroId).map((v) => v.membroId!);
          await avisar(ficaram, `Novo horário: ${m.nome}`, `${e.titulo} agora é ${q}.`, e.id);
        }
      }
    }
    return { id: e.id, situacao: e.situacao };
  });

/** Apaga uma escala. Se já estava publicada, avisa quem estava nela. */
export const escExcluir = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirMembro } = await import("../server/membros");
    const { lerEscalas, gravarEscalas, exigirLider, lerSeries, gravarSeries } = await import("../server/escalas");
    const { diaDe } = await import("./escalas");
    const eu = await exigirMembro();
    const l = await lerEscalas();
    const e = l.find((x) => x.id === data.id);
    if (!e) return { ok: true };
    const { m } = await exigirLider(e.ministerioId, eu.id);
    await gravarEscalas(l.filter((x) => x.id !== e.id));
    if (e.serieId) {
      // não deixa a série recriar a data apagada
      const ss = await lerSeries();
      const s = ss.find((x) => x.id === e.serieId);
      if (s) { s.excluidas = [...(s.excluidas ?? []), diaDe(e.inicio)].slice(-120); await gravarSeries(ss); }
    }
    if (e.situacao === "publicada" && new Date(e.inicio).getTime() > Date.now()) {
      await avisar(e.vagas.map((v) => v.membroId).filter((x): x is string => !!x && x !== eu.id), `Escala cancelada: ${m.nome}`, `${e.titulo}, ${await quandoCurto(e.inicio)} foi cancelada.`, "");
    }
    return { ok: true };
  });

/** Cria ou altera uma repetição. "aplicar" leva as mudanças às próximas datas ainda em rascunho. */
export const escSerieSalvar = createServerFn({ method: "POST" })
  .validator((d: Omit<Serie, "id" | "ativa" | "excluidas"> & { id?: string; aplicar?: boolean }) => {
    if (!(d?.titulo ?? "").trim()) throw new Error("Dê um nome (ex.: Culto de domingo).");
    if (!/^\d{2}:\d{2}$/.test(d.hora ?? "")) throw new Error("Informe o horário.");
    if (!(d.diaSemana >= 0 && d.diaSemana <= 6)) throw new Error("Escolha o dia da semana.");
    if (!["semanal", "quinzenal", "mensal"].includes(d.frequencia)) throw new Error("Escolha a repetição.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.desde ?? "")) throw new Error("Informe a partir de quando.");
    if (!d.vagas?.length) throw new Error("Inclua ao menos uma função na escala.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirMembro } = await import("../server/membros");
    const { lerSeries, gravarSeries, lerEscalas, gravarEscalas, exigirLider, novoId } = await import("../server/escalas");
    const { instante, diaDe } = await import("./escalas");
    const eu = await exigirMembro();
    const { m } = await exigirLider(data.ministerioId, eu.id);
    const funcoes = new Set(m.funcoes.map((f) => f.id));
    const pessoas = new Set(m.membros.map((x) => x.membroId));
    const fixos = Object.fromEntries(Object.entries(data.fixos ?? {}).filter(([f, p]) => funcoes.has(f) && p && pessoas.has(p)));
    const ss = await lerSeries();
    const nova: Serie = {
      id: data.id ?? novoId("ser"), ministerioId: m.id, titulo: data.titulo.trim().slice(0, 80), hora: data.hora, diaSemana: data.diaSemana,
      frequencia: data.frequencia, semanaDoMes: data.frequencia === "mensal" ? data.semanaDoMes ?? 1 : undefined,
      desde: data.desde, ate: data.ate || undefined, local: data.local?.trim() || undefined, observacoes: data.observacoes?.trim() || undefined,
      vagas: data.vagas.filter((f) => funcoes.has(f)), roteiro: (data.roteiro ?? []).filter((r) => r.item.trim()), fixos, ativa: true,
    };
    const i = ss.findIndex((x) => x.id === nova.id);
    if (i >= 0) { if (ss[i]!.ministerioId !== m.id) throw new Error("Repetição não encontrada."); nova.excluidas = ss[i]!.excluidas; ss[i] = nova; } else ss.push(nova);
    await gravarSeries(ss);
    if (i >= 0 && data.aplicar) {
      // próximas datas ainda em rascunho: refaz com o novo modelo, mantendo quem já foi escolhido
      const l = await lerEscalas();
      const agora = Date.now();
      const manter = l.filter((e) => !(e.serieId === nova.id && e.situacao === "rascunho" && new Date(e.inicio).getTime() > agora));
      const refazer = l.filter((e) => e.serieId === nova.id && e.situacao === "rascunho" && new Date(e.inicio).getTime() > agora);
      for (const e of refazer) {
        const sobra = [...e.vagas];
        e.titulo = nova.titulo; e.local = nova.local; e.observacoes = nova.observacoes;
        e.inicio = instante(diaDe(e.inicio), nova.hora);
        e.vagas = nova.vagas.map((f) => {
          const k = sobra.findIndex((v) => v.funcaoId === f);
          const v = k >= 0 ? sobra.splice(k, 1)[0]! : undefined;
          return { id: v?.id ?? novoId("v"), funcaoId: f, membroId: v?.membroId ?? nova.fixos?.[f], resposta: "pendente" as const };
        });
        e.roteiro = nova.roteiro.map((r) => ({ ...r, id: novoId("r") }));
        e.historico.push({ em: new Date().toISOString(), quem: eu.nome, o: "Atualizada pela repetição" });
      }
      // datas que deixaram de existir (mudou o dia) saem; as novas a série cria
      const { datasDaSerie } = await import("./escalas");
      const validas = new Set(datasDaSerie(nova, diaDe(new Date().toISOString()), diaDe(new Date(agora + 400 * 864e5).toISOString())));
      await gravarEscalas([...manter, ...refazer.filter((e) => validas.has(diaDe(e.inicio)))]);
    }
    return { id: nova.id };
  });

/** Para a repetição; as datas futuras em rascunho saem junto (as publicadas ficam). */
export const escSerieExcluir = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirMembro } = await import("../server/membros");
    const { lerSeries, gravarSeries, lerEscalas, gravarEscalas, exigirLider } = await import("../server/escalas");
    const eu = await exigirMembro();
    const ss = await lerSeries();
    const s = ss.find((x) => x.id === data.id);
    if (!s) return { ok: true };
    await exigirLider(s.ministerioId, eu.id);
    await gravarSeries(ss.filter((x) => x.id !== s.id));
    const agora = Date.now();
    await gravarEscalas((await lerEscalas()).filter((e) => !(e.serieId === s.id && e.situacao === "rascunho" && new Date(e.inicio).getTime() > agora)).map((e) => (e.serieId === s.id ? { ...e, serieId: undefined } : e)));
    return { ok: true };
  });

/** A liderança cuida da equipe: funções do ministério e de cada pessoa. */
export const escEquipe = createServerFn({ method: "POST" })
  .validator((d: { ministerioId: string; funcoes?: { id?: string; nome: string }[]; pessoa?: { membroId: string; funcoes: string[]; remover?: boolean } }) => {
    if (d.funcoes && (d.funcoes.length > 40 || d.funcoes.some((f) => !f.nome.trim()))) throw new Error("Confira os nomes das funções.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirMembro, lerMembros } = await import("../server/membros");
    const { gravarMinisterios, exigirLider, novoId } = await import("../server/escalas");
    const eu = await exigirMembro();
    const { m, ms } = await exigirLider(data.ministerioId, eu.id);
    if (data.funcoes) {
      m.funcoes = data.funcoes.map((f) => ({ id: f.id || novoId("f"), nome: f.nome.trim().slice(0, 40) }));
      const ok = new Set(m.funcoes.map((f) => f.id));
      for (const p of m.membros) p.funcoes = p.funcoes.filter((f) => ok.has(f));
    }
    if (data.pessoa) {
      const p = data.pessoa;
      const i = m.membros.findIndex((x) => x.membroId === p.membroId);
      if (p.remover) {
        if (i >= 0 && m.membros[i]!.lider) throw new Error("Para tirar alguém da liderança, fale com a secretaria (painel).");
        if (i >= 0) m.membros.splice(i, 1);
      } else {
        const ativo = (await lerMembros()).find((x) => x.id === p.membroId && x.situacao === "ativo");
        if (!ativo) throw new Error("Membro não encontrado (ou ainda não aprovado).");
        const fs = p.funcoes.filter((f) => m.funcoes.some((x) => x.id === f));
        if (i >= 0) m.membros[i]!.funcoes = fs; else m.membros.push({ membroId: p.membroId, funcoes: fs });
      }
    }
    await gravarMinisterios(ms);
    return { ok: true };
  });

// ─── Painel ─────────────────────────────────────────────────────────────────

export const ministeriosPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { lerMinisterios, lerEscalas } = await import("../server/escalas");
  const { lerMembros } = await import("../server/membros");
  await exigirAcesso("escalas");
  const membros = (await lerMembros()).filter((m) => m.situacao === "ativo").map((m) => ({ id: m.id, nome: m.nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const escalas = await lerEscalas();
  const agora = Date.now();
  return {
    ministerios: (await lerMinisterios()).map((m) => ({
      ...m,
      proximas: escalas.filter((e) => e.ministerioId === m.id && e.situacao === "publicada" && new Date(e.inicio).getTime() > agora).length,
    })),
    membros,
  };
});

export const salvarMinisterioPainel = createServerFn({ method: "POST" })
  .validator((d: Pick<MinisterioApp, "nome" | "icone" | "repertorio" | "funcoes" | "membros"> & { id?: string; descricao?: string }) => {
    if ((d?.nome ?? "").trim().length < 2) throw new Error("Informe o nome do ministério.");
    if (d.funcoes.some((f) => !f.nome.trim())) throw new Error("Há uma função sem nome.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const { lerMinisterios, gravarMinisterios, novoId } = await import("../server/escalas");
    const s = await exigirAcesso("escalas");
    const ms = await lerMinisterios();
    const funcoes = data.funcoes.map((f) => ({ id: f.id || novoId("f"), nome: f.nome.trim().slice(0, 40) }));
    const ok = new Set(funcoes.map((f) => f.id));
    const vistos = new Set<string>();
    const membros = data.membros.filter((x) => x.membroId && !vistos.has(x.membroId) && vistos.add(x.membroId)).map((x) => ({ membroId: x.membroId, funcoes: x.funcoes.filter((f) => ok.has(f)), ...(x.lider ? { lider: true } : {}) }));
    const novo = { nome: data.nome.trim().slice(0, 60), descricao: data.descricao?.trim() || undefined, icone: data.icone || "estrela", repertorio: Boolean(data.repertorio), funcoes, membros };
    const i = data.id ? ms.findIndex((x) => x.id === data.id) : -1;
    const lideresAntes = new Set(i >= 0 ? ms[i]!.membros.filter((x) => x.lider).map((x) => x.membroId) : []);
    let id = data.id;
    if (i >= 0) Object.assign(ms[i]!, novo);
    else { id = novoId("min"); ms.push({ id, criadoEm: new Date().toISOString(), ...novo }); }
    await gravarMinisterios(ms);
    await registrar(s.nome, i >= 0 ? "Alterou ministério (escalas)" : "Criou ministério (escalas)", novo.nome);
    const novosLideres = membros.filter((x) => x.lider && !lideresAntes.has(x.membroId)).map((x) => x.membroId);
    if (novosLideres.length) {
      const { enviarPush } = await import("../server/push");
      await enviarPush(novosLideres, { titulo: `Liderança: ${novo.nome}`, texto: "Agora você pode montar e publicar as escalas do ministério pelo app.", dados: { tela: "escalas" } });
    }
    return { id };
  });

export const excluirMinisterioPainel = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const { lerMinisterios, gravarMinisterios, lerEscalas, gravarEscalas, lerSeries, gravarSeries } = await import("../server/escalas");
    const s = await exigirAcesso("escalas");
    const ms = await lerMinisterios();
    const m = ms.find((x) => x.id === data.id);
    if (!m) return { ok: true };
    await gravarMinisterios(ms.filter((x) => x.id !== m.id));
    await gravarEscalas((await lerEscalas()).filter((e) => e.ministerioId !== m.id));
    await gravarSeries((await lerSeries()).filter((x) => x.ministerioId !== m.id));
    await registrar(s.nome, "Excluiu ministério (escalas)", m.nome);
    return { ok: true };
  });

/** Equipes e escalas fictícias para testar (e para tirar depois). */
export const exemplosPainel = createServerFn({ method: "POST" })
  .validator((d: { acao: "criar" | "remover" | "ver" }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const { criarExemplos, removerExemplos, haExemplos } = await import("../server/exemplo");
    const s = await exigirAcesso("escalas");
    if (data.acao === "ver") return { existem: await haExemplos() };
    if (data.acao === "criar") { const r = await criarExemplos(); await registrar(s.nome, "Criou dados de exemplo (escalas)", `${r.pessoas} pessoas`); return { existem: true, ...r }; }
    const r = await removerExemplos();
    await registrar(s.nome, "Removeu dados de exemplo (escalas)", `${r.pessoas} pessoas`);
    return { existem: false, ...r };
  });
