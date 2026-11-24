/**
 * Perfis de acesso ao painel e o que cada um pode usar.
 *
 * Vale nos dois lados: o menu mostra apagado (cinza, sem clique) o que o
 * perfil não acessa, e o servidor recusa qualquer chamada fora do perfil —
 * esconder o botão não basta.
 */
export type Papel = "admin" | "pastor" | "comunicacao" | "editor";

/** Áreas do painel. "site" = todas as seções de edição do site. */
export type Area = "site" | "boletim" | "deliberacao" | "financas" | "alteracoes" | "usuarios";

export const PERMISSOES: Record<Papel, readonly Area[]> = {
  admin: ["site", "boletim", "deliberacao", "financas", "alteracoes", "usuarios"],
  pastor: ["boletim", "deliberacao", "alteracoes"],
  comunicacao: ["site"],
  // perfil antigo ("Editor"): equivale à comunicação
  editor: ["site"],
};

export const PAPEIS: { valor: Exclude<Papel, "editor">; rotulo: string; descricao: string }[] = [
  { valor: "admin", rotulo: "Administrador", descricao: "Acesso a tudo, inclusive usuários." },
  { valor: "pastor", rotulo: "Pastor", descricao: "Boletim, deliberações e controle de alterações." },
  { valor: "comunicacao", rotulo: "Comunicação", descricao: "Toda a edição do site. Sem boletim, deliberações e controle de alterações." },
];

export function rotuloPapel(p: string) {
  return PAPEIS.find((x) => x.valor === p)?.rotulo ?? (p === "editor" ? "Comunicação" : p);
}

export function pode(papel: string | undefined, area: Area) {
  return Boolean(papel && (PERMISSOES[papel as Papel] ?? []).includes(area));
}

/** Área de cada item do menu do painel. */
export function areaDoItem(id: string): Area {
  if (id === "boletim" || id === "deliberacao" || id === "financas" || id === "alteracoes" || id === "usuarios") return id;
  return "site";
}

/** Primeira tela ao entrar: a primeira área que o perfil pode usar. */
export function telaInicial(papel: string | undefined) {
  if (pode(papel, "site")) return "inicio";
  if (pode(papel, "boletim")) return "boletim";
  if (pode(papel, "deliberacao")) return "deliberacao";
  return "alteracoes";
}
