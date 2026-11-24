/**
 * Escala proporcional do site em telas largas.
 *
 * O site é desenhado para 1440 px de largura (um notebook comum). Em telas
 * maiores, em vez de "sobrar" espaço e tudo parecer miúdo, a página inteira
 * aumenta na mesma proporção — quem abre num monitor grande vê a mesma
 * composição de quem abre num notebook. Abaixo de 1440 px vale o layout
 * responsivo normal (notebooks menores, tablets e celulares).
 */
export const LARGURA_BASE = 1440;
export const ESCALA_MAXIMA = 2;

/** Roda antes da primeira pintura (no HTML do servidor) para a página não "pular". */
export const SCRIPT_ESCALA = `(function(){var d=document.documentElement;function a(){var z=Math.min(${ESCALA_MAXIMA},Math.max(1,window.innerWidth/${LARGURA_BASE}));d.style.zoom=z>1.01?String(Math.round(z*1000)/1000):"";}a();window.__escalaSite=a;})();`;

export function aplicarEscala() {
  const z = Math.min(ESCALA_MAXIMA, Math.max(1, window.innerWidth / LARGURA_BASE));
  document.documentElement.style.zoom = z > 1.01 ? String(Math.round(z * 1000) / 1000) : "";
}

export function removerEscala() {
  document.documentElement.style.zoom = "";
}
