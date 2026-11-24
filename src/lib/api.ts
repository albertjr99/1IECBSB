/**
 * Funções de servidor (chamadas pelo site e pelo painel).
 * O corpo de cada handler roda só no servidor; no navegador vira uma chamada HTTP.
 */
import { createServerFn } from "@tanstack/react-start";
import { completarConteudo, CONTEUDO_PADRAO, type Conteudo } from "./conteudo";
import { PAPEIS, rotuloPapel, type Papel } from "./permissoes";

// ─── Conteúdo publicado ─────────────────────────────────────────────────────

let cachePublico: { em: number; c: Conteudo } | null = null;

export const obterConteudoPublico = createServerFn({ method: "GET" }).handler(async () => {
  if (cachePublico && Date.now() - cachePublico.em < 10_000) return cachePublico.c;
  const { ler } = await import("../server/armazem");
  try {
    const c = completarConteudo(await ler("conteudo:publicado"));
    cachePublico = { em: Date.now(), c };
    return c;
  } catch (e) {
    console.error("[conteúdo] falha ao ler; usando padrão", e);
    return structuredClone(CONTEUDO_PADRAO);
  }
});

// ─── Sessão ─────────────────────────────────────────────────────────────────

export const obterSessao = createServerFn({ method: "GET" }).handler(async () => {
  const { sessaoFresca, precisaPrimeiroAcesso } = await import("../server/auth");
  const s = await sessaoFresca();
  return { sessao: s, primeiroAcesso: s ? false : await precisaPrimeiroAcesso() };
});

export const entrar = createServerFn({ method: "POST" })
  .validator((d: { usuario: string; senha: string }) => {
    if (!d?.usuario || !d?.senha) throw new Error("Informe seu nome e a senha.");
    return d;
  })
  .handler(async ({ data }) => {
    const { autenticar, abrirSessao, listarUsuarios: lu, normalizarUsuario } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const u = await autenticar(data.usuario, data.senha);
    if (!u) {
      const n = normalizarUsuario(data.usuario);
      const conta = (await lu()).find((x) => x.usuario === n || x.apelidos?.includes(n));
      if (conta && !conta.hash) throw new Error("Seu acesso ainda não tem senha. Peça ao administrador a senha provisória.");
      throw new Error("Nome ou senha incorretos.");
    }
    abrirSessao(u);
    await registrar(u.nome, "Entrou no painel");
    return { nome: u.nome };
  });

export const sair = createServerFn({ method: "POST" }).handler(async () => {
  const { encerrarSessao } = await import("../server/auth");
  encerrarSessao();
  return { ok: true };
});

// ─── Painel: rascunho, publicação, versões ─────────────────────────────────

export const obterPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { sessaoFresca } = await import("../server/auth");
  const { ler, modoArmazenamento, tokenBlob, variaveisDeBanco } = await import("../server/armazem");
  const sessao = await sessaoFresca();
  if (!sessao) throw new Error("Sessão expirada. Entre novamente.");
  const publicado = completarConteudo(await ler("conteudo:publicado"));
  const rascunhoSalvo = await ler<{ conteudo: unknown; em: string; autor: string }>("conteudo:rascunho");
  return {
    sessao,
    publicado,
    rascunho: rascunhoSalvo ? completarConteudo(rascunhoSalvo.conteudo) : null,
    rascunhoEm: rascunhoSalvo?.em ?? null,
    rascunhoAutor: rascunhoSalvo?.autor ?? null,
    armazenamento: modoArmazenamento(),
    variaveisBanco: modoArmazenamento() === "memoria" ? variaveisDeBanco() : [],
    uploadsPermanentes: !!tokenBlob(),
    mapsChave: !!process.env.VITE_GOOGLE_MAPS_KEY,
  };
});

export const salvarRascunho = createServerFn({ method: "POST" })
  .validator((d: { conteudo: Conteudo }) => {
    if (!d?.conteudo || typeof d.conteudo !== "object") throw new Error("Conteúdo inválido.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { gravar } = await import("../server/armazem");
    const s = await exigirAcesso("site");
    const em = new Date().toISOString();
    await gravar("conteudo:rascunho", { conteudo: completarConteudo(data.conteudo), em, autor: s.nome });
    return { em };
  });

export const descartarRascunho = createServerFn({ method: "POST" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { apagar, registrar } = await import("../server/armazem");
  const s = await exigirAcesso("site");
  await apagar("conteudo:rascunho");
  await registrar(s.nome, "Descartou alterações não publicadas");
  return { ok: true };
});

export const publicar = createServerFn({ method: "POST" })
  .validator((d: { conteudo: Conteudo; resumo: string }) => {
    if (!d?.conteudo) throw new Error("Conteúdo inválido.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { gravar, apagar, criarVersao, registrar } = await import("../server/armazem");
    const s = await exigirAcesso("site");
    const c = completarConteudo(data.conteudo);
    const resumo = data.resumo?.trim() || "Atualização do site";
    await gravar("conteudo:publicado", c);
    await criarVersao(s.nome, resumo, c);
    await apagar("conteudo:rascunho");
    await registrar(s.nome, "Publicou o site", resumo);
    cachePublico = null;
    return { ok: true };
  });

export const listarVersoes = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { listarVersoes: lv, listarAuditoria } = await import("../server/armazem");
  await exigirAcesso("alteracoes");
  return { versoes: await lv(), auditoria: await listarAuditoria() };
});

export const carregarVersao = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { lerVersao, registrar } = await import("../server/armazem");
    const s = await exigirAcesso("alteracoes");
    const c = await lerVersao(Number(data.id));
    if (!c) throw new Error("Versão não encontrada.");
    await registrar(s.nome, "Abriu versão anterior para restaurar", `Versão nº ${data.id}`);
    return completarConteudo(c);
  });

// ─── Imagens ────────────────────────────────────────────────────────────────

export const enviarImagem = createServerFn({ method: "POST" })
  .validator((d: { nome: string; tipo: string; base64: string }) => {
    if (!d?.base64 || !/^image\//.test(d.tipo)) throw new Error("Envie uma imagem.");
    if (d.base64.length > 6_000_000) throw new Error("Imagem grande demais (máx. ~4 MB).");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    await exigirAcesso("site");
    const { tokenBlob } = await import("../server/armazem");
    const token = tokenBlob();
    if (token) {
      const { put } = await import("@vercel/blob");
      const ext = data.tipo.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const base = data.nome.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "imagem";
      const r = await put(`site/${base}.${ext}`, Buffer.from(data.base64, "base64"), {
        access: "public", contentType: data.tipo, addRandomSuffix: true, token,
      });
      return { url: r.url };
    }
    // Sem Vercel Blob, a imagem fica embutida no próprio conteúdo.
    return { url: `data:${data.tipo};base64,${data.base64}` };
  });

// ─── Usuários ───────────────────────────────────────────────────────────────

export const listarUsuarios = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso, listarUsuarios: lu } = await import("../server/auth");
  await exigirAcesso("usuarios");
  return (await lu()).map(({ hash: _h, ...u }) => u);
});

export const salvarUsuario = createServerFn({ method: "POST" })
  .validator((d: { usuario: string; nome: string; papel: Papel }) => {
    if (!d?.usuario?.trim() || !d.nome?.trim()) throw new Error("Informe o nome e o nome de acesso.");
    if (!PAPEIS.some((p) => p.valor === d.papel)) throw new Error("Escolha um perfil.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso, listarUsuarios: lu, salvarUsuarios, normalizarUsuario } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("usuarios");
    const lista = await lu();
    const usuario = normalizarUsuario(data.usuario);
    if (!usuario) throw new Error("Nome de acesso inválido.");
    const atual = lista.find((u) => u.usuario === usuario);
    if (atual) {
      atual.nome = data.nome.trim();
      if (atual.usuario === s.usuario && data.papel !== "admin") throw new Error("Você não pode tirar o seu próprio acesso de administrador.");
      atual.papel = data.papel;
    } else {
      if (lista.some((u) => u.apelidos?.includes(usuario))) throw new Error("Este nome de acesso já é usado por outra pessoa.");
      lista.push({ usuario, nome: data.nome.trim(), papel: data.papel, hash: "", criadoEm: new Date().toISOString(), trocarSenha: true });
    }
    await salvarUsuarios(lista);
    await registrar(s.nome, atual ? "Alterou usuário" : "Criou usuário", `${usuario} (${rotuloPapel(data.papel)})`);
    return { ok: true };
  });

/** Senha provisória: aparece uma vez para o administrador repassar; a pessoa cria a dela no primeiro acesso. */
export const gerarSenhaProvisoria = createServerFn({ method: "POST" })
  .validator((d: { usuario: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso, listarUsuarios: lu, salvarUsuarios, gerarHash } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const { randomInt } = await import("node:crypto");
    const s = await exigirAcesso("usuarios");
    const lista = await lu();
    const u = lista.find((x) => x.usuario === data.usuario);
    if (!u) throw new Error("Usuário não encontrado.");
    const palavras = ["Monte", "Cruz", "Graca", "Rocha", "Farol", "Aurora", "Sinai", "Jordao", "Oliveira", "Videira"];
    const senha = `${palavras[randomInt(palavras.length)]}-${String(randomInt(1_000_000)).padStart(6, "0")}`;
    u.hash = gerarHash(senha);
    u.trocarSenha = true;
    await salvarUsuarios(lista);
    await registrar(s.nome, "Gerou senha provisória", u.usuario);
    return { senha };
  });

export const removerUsuario = createServerFn({ method: "POST" })
  .validator((d: { usuario: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso, listarUsuarios: lu, salvarUsuarios } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("usuarios");
    if (data.usuario === s.usuario) throw new Error("Você não pode remover a si mesmo.");
    await salvarUsuarios((await lu()).filter((u) => u.usuario !== data.usuario));
    await registrar(s.nome, "Removeu usuário", data.usuario);
    return { ok: true };
  });

export const trocarMinhaSenha = createServerFn({ method: "POST" })
  .validator((d: { atual: string; nova: string }) => {
    if (!d?.nova || d.nova.length < 8) throw new Error("A nova senha precisa ter ao menos 8 caracteres.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirSessao, listarUsuarios: lu, salvarUsuarios, conferirSenha, gerarHash } = await import("../server/auth");
    const s = exigirSessao();
    const lista = await lu();
    const u = lista.find((x) => x.usuario === s.usuario);
    if (!u || !conferirSenha(data.atual, u.hash)) throw new Error("Senha atual incorreta.");
    u.hash = gerarHash(data.nova);
    delete u.trocarSenha;
    await salvarUsuarios(lista);
    return { ok: true };
  });

/** Foto de perfil de quem está usando (vazia = tirar a foto). */
export const definirMinhaFoto = createServerFn({ method: "POST" })
  .validator((d: { foto: string }) => {
    if (d.foto && (!/^data:image\/(jpeg|png|webp);base64,/.test(d.foto) || d.foto.length > 400_000)) throw new Error("Foto inválida ou grande demais.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirSessao, listarUsuarios: lu, salvarUsuarios } = await import("../server/auth");
    const s = exigirSessao();
    const lista = await lu();
    const u = lista.find((x) => x.usuario === s.usuario);
    if (!u) throw new Error("Usuário não encontrado.");
    if (data.foto) u.foto = data.foto;
    else delete u.foto;
    await salvarUsuarios(lista);
    return { ok: true };
  });

/** Administrador troca (ou tira) a foto de alguém. */
export const definirFotoDeUsuario = createServerFn({ method: "POST" })
  .validator((d: { usuario: string; foto: string }) => {
    if (d.foto && (!/^data:image\/(jpeg|png|webp);base64,/.test(d.foto) || d.foto.length > 400_000)) throw new Error("Foto inválida ou grande demais.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirAcesso, listarUsuarios: lu, salvarUsuarios } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("usuarios");
    const lista = await lu();
    const u = lista.find((x) => x.usuario === data.usuario);
    if (!u) throw new Error("Usuário não encontrado.");
    if (data.foto) u.foto = data.foto;
    else delete u.foto;
    await salvarUsuarios(lista);
    await registrar(s.nome, data.foto ? "Trocou a foto de usuário" : "Tirou a foto de usuário", u.usuario);
    return { ok: true };
  });

/** Primeiro acesso com senha provisória: a pessoa cria a própria senha (já entrou com a provisória). */
export const criarMinhaSenha = createServerFn({ method: "POST" })
  .validator((d: { nova: string }) => {
    if (!d?.nova || d.nova.length < 8) throw new Error("A senha precisa ter ao menos 8 caracteres.");
    return d;
  })
  .handler(async ({ data }) => {
    const { exigirSessao, listarUsuarios: lu, salvarUsuarios, gerarHash, conferirSenha, abrirSessao } = await import("../server/auth");
    const { registrar } = await import("../server/armazem");
    const s = exigirSessao();
    const lista = await lu();
    const u = lista.find((x) => x.usuario === s.usuario);
    if (!u?.trocarSenha) throw new Error("Use “Minha senha” para trocar a senha.");
    if (conferirSenha(data.nova, u.hash)) throw new Error("Escolha uma senha diferente da provisória.");
    u.hash = gerarHash(data.nova);
    delete u.trocarSenha;
    await salvarUsuarios(lista);
    abrirSessao(u);
    await registrar(u.nome, "Criou a própria senha");
    return { ok: true };
  });

// ─── YouTube ────────────────────────────────────────────────────────────────

export type ListaVideos = {
  videos: import("../server/youtube").Video[];
  total: number;
  pagina: number;
  porPagina: number;
  erro?: string;
};

export const listarVideos = createServerFn({ method: "GET" })
  .validator((d: { canal: string; playlist?: string; busca?: string; de?: string; ate?: string; pagina?: number; porPagina?: number; esconderCurtos?: boolean }) => d)
  .handler(async ({ data }): Promise<ListaVideos> => {
    const yt = await import("../server/youtube");
    const porPagina = Math.min(Math.max(data.porPagina ?? 12, 1), 48);
    const pagina = Math.max(data.pagina ?? 1, 1);
    try {
      let lista = data.playlist ? await yt.videosDaPlaylist(data.playlist) : await yt.todosOsVideos(data.canal);
      if (data.esconderCurtos) lista = lista.filter((v) => v.duracao === 0 || v.duracao > 180);
      const termo = data.busca?.trim().toLowerCase();
      if (termo) {
        const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        const alvo = sem(termo);
        lista = lista.filter((v) => sem(v.titulo).includes(alvo));
      }
      // Período (datas AAAA-MM-DD, no fuso de Brasília)
      const dia = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10);
      if (data.de && /^\d{4}-\d{2}-\d{2}$/.test(data.de)) lista = lista.filter((v) => dia(v.publicado) >= data.de!);
      if (data.ate && /^\d{4}-\d{2}-\d{2}$/.test(data.ate)) lista = lista.filter((v) => dia(v.publicado) <= data.ate!);
      return { videos: lista.slice((pagina - 1) * porPagina, pagina * porPagina), total: lista.length, pagina, porPagina };
    } catch (e) {
      console.error("[youtube]", e);
      return { videos: [], total: 0, pagina, porPagina, erro: "Não foi possível carregar os vídeos agora." };
    }
  });

export const obterAoVivo = createServerFn({ method: "GET" })
  .validator((d: { canal: string }) => d)
  .handler(async ({ data }) => {
    const yt = await import("../server/youtube");
    try {
      return await yt.situacaoAoVivo(data.canal);
    } catch (e) {
      console.error("[youtube ao vivo]", e);
      return { aoVivo: null, agendado: null, verificadoEm: new Date().toISOString() };
    }
  });
