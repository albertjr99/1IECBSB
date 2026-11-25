import { createFileRoute } from "@tanstack/react-router";

/**
 * Porta de entrada do aplicativo das lojas (iPhone e Android).
 * Um POST com { acao, dados }; a sessão vai no cabeçalho "Authorization: Bearer".
 * Reaproveita as mesmas funções do app web, então o painel controla tudo.
 */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
};

const json = (d: unknown, status = 200) => Response.json(d, { status, headers: CORS });

type Acao = (dados: any) => Promise<unknown>;

const ACOES: Record<string, Acao> = {
  async sessao() {
    const { appSessao } = await import("@/lib/api-app");
    return appSessao();
  },
  async entrar(d) {
    const { appEntrar } = await import("@/lib/api-app");
    const { tokenDoMembro } = await import("@/server/membros");
    const r = await appEntrar({ data: d });
    return { ...r, token: tokenDoMembro(r.membro) };
  },
  async cadastrar(d) {
    const { appCadastrar } = await import("@/lib/api-app");
    const { tokenDoMembro } = await import("@/server/membros");
    const r = await appCadastrar({ data: d });
    return { ...r, token: tokenDoMembro(r.membro) };
  },
  async senha(d) { const { appDefinirSenha } = await import("@/lib/api-app"); return appDefinirSenha({ data: d }); },
  async perfil(d) { const { appAtualizarPerfil } = await import("@/lib/api-app"); return appAtualizarPerfil({ data: d }); },
  async inicio() { const { appInicio } = await import("@/lib/api-app"); return appInicio(); },
  async hinos() { const { appHinos } = await import("@/lib/api-app"); return appHinos(); },
  async contribuir() { const { appContribuir } = await import("@/lib/api-app"); return appContribuir(); },
  async informarContribuicao(d) { const { appInformarContribuicao } = await import("@/lib/api-app"); return appInformarContribuicao({ data: d }); },
  async entrarReuniao(d) { const { appEntrarReuniao } = await import("@/lib/api-app"); return appEntrarReuniao({ data: d }); },
  async participar() { const { appParticipar } = await import("@/lib/api-app"); return appParticipar(); },
  async boletins() { const { appBoletins } = await import("@/lib/api-app"); return appBoletins(); },
  async boletim(d: { data: string }) {
    const { exigirMembro } = await import("@/server/membros");
    const { obterPorData } = await import("@/server/boletins");
    await exigirMembro();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d?.data ?? "")) throw new Error("Data inválida.");
    return obterPorData(d.data);
  },
  /** Um livro da Bíblia (ARA ou NVI). */
  async biblia(d: { versao: string; livro: string }) {
    const { exigirMembro } = await import("@/server/membros");
    const { lerLivroBiblia } = await import("@/server/biblia");
    await exigirMembro();
    const l = await lerLivroBiblia(d?.versao ?? "", d?.livro ?? "");
    if (!l) throw new Error("Este livro ainda não foi carregado no aplicativo.");
    return l;
  },
  /** Procura palavras na Bíblia. */
  async buscarBiblia(d: { versao: string; termo: string; testamento?: "AT" | "NT" }) {
    const { exigirMembro } = await import("@/server/membros");
    const { buscarNaBiblia } = await import("@/server/biblia");
    await exigirMembro();
    if (!d?.termo || d.termo.trim().length < 2) throw new Error("Digite ao menos uma palavra.");
    return buscarNaBiblia(d.versao ?? "ara", d.termo.slice(0, 80), d.testamento);
  },
  /** Informações da igreja: contatos, endereço, redes, programação e eventos. */
  async igreja() {
    const { exigirMembro } = await import("@/server/membros");
    const { obterConteudoPublico } = await import("@/lib/api");
    await exigirMembro();
    const c = await obterConteudoPublico();
    const hoje = new Date().toISOString().slice(0, 10);
    return {
      geral: c.geral,
      programacao: { titulo: c.programacao.titulo, aviso: c.programacao.aviso, dias: c.programacao.dias },
      eventos: c.eventos.itens.filter((e) => (e.dataFim || e.data) >= hoje).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 8),
      contribua: { texto: c.contribua.texto, versiculo: c.contribua.versiculo, referencia: c.contribua.referencia, contas: c.contribua.contas },
    };
  },
  async cedula(d: { token: string }) {
    const eu = await membroDoVoto(d?.token);
    const { cedulaPorToken } = await import("@/lib/api-votacao");
    void eu;
    return cedulaPorToken(d.token);
  },
  async votar(d: { token: string; opcao: string }) {
    await membroDoVoto(d?.token);
    const { votarPorToken } = await import("@/lib/api-votacao");
    return votarPorToken(d.token, d.opcao);
  },
  /** Guarda o aparelho para receber notificações. */
  async aparelho(d: { token: string; plataforma: string }) {
    const { exigirMembro, lerMembros, gravarMembros } = await import("@/server/membros");
    const eu = await exigirMembro();
    if (!/^Expo(nent)?PushToken\[[\w-]+\]$/.test(d?.token ?? "")) throw new Error("Aparelho inválido.");
    const l = await lerMembros();
    for (const m of l) if (m.aparelhos) m.aparelhos = m.aparelhos.filter((a) => a.token !== d.token); // aparelho trocou de dono
    const m = l.find((x) => x.id === eu.id)!;
    m.aparelhos = [{ token: d.token, plataforma: String(d.plataforma ?? "").slice(0, 12), em: new Date().toISOString() }, ...(m.aparelhos ?? [])].slice(0, 5);
    await gravarMembros(l);
    return { ok: true };
  },
  async sair(d: { aparelho?: string }) {
    const { membroAtual, lerMembros, gravarMembros } = await import("@/server/membros");
    const eu = await membroAtual();
    if (eu && d?.aparelho) {
      const l = await lerMembros();
      const m = l.find((x) => x.id === eu.id);
      if (m?.aparelhos) { m.aparelhos = m.aparelhos.filter((a) => a.token !== d.aparelho); await gravarMembros(l); }
    }
    return { ok: true };
  },
  /** Exigência das lojas: o membro pode apagar a própria conta pelo app. */
  async excluirConta(d: { senha: string }) {
    const { membroAtual, lerMembros, gravarMembros, autenticarMembro } = await import("@/server/membros");
    const { registrar } = await import("@/server/armazem");
    const eu = await membroAtual();
    if (!eu) throw new Error("Entre novamente no aplicativo.");
    if (!autenticarMembro(eu, d?.senha ?? "")) throw new Error("Senha incorreta.");
    await gravarMembros((await lerMembros()).filter((m) => m.id !== eu.id));
    await registrar(eu.nome, "Excluiu a própria conta do aplicativo", eu.celular);
    return { ok: true };
  },
};

/** O link de voto precisa ser do próprio membro logado. */
async function membroDoVoto(token: string) {
  const { exigirMembro } = await import("@/server/membros");
  const { acharPorToken } = await import("@/server/votacao");
  const eu = await exigirMembro();
  const r = await acharPorToken(token ?? "");
  if (!r || r.e.membroId !== eu.id) throw new Error("Esta votação não está disponível para você.");
  return eu;
}

async function tratar(request: Request) {
  let corpo: { acao?: string; dados?: unknown };
  try { corpo = await request.json(); } catch { return json({ erro: "Pedido inválido." }, 400); }
  const fn = corpo.acao ? ACOES[corpo.acao] : undefined;
  if (!fn) return json({ erro: "Ação desconhecida." }, 404);
  try {
    return json({ ok: true, dados: (await fn(corpo.dados ?? {})) ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    const sessao = /Entre novamente/.test(msg);
    return json({ erro: msg, sessao }, sessao ? 401 : 400);
  }
}

export const Route = createFileRoute("/api/m")({
  server: {
    handlers: {
      POST: ({ request }) => tratar(request),
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
    },
  },
});
