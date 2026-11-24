/**
 * Boletins já impressos (PDF oficial enviado pela igreja), em public/boletins.
 * Cada página foi convertida em imagem para a leitura no site.
 * Para acrescentar: copie o PDF e as imagens para public/boletins/AAAA-MM-DD/ e adicione aqui.
 */
export type BoletimArquivo = { data: string; titulo: string; pdf: string; capa: string; paginas: string[] };

const arquivo = (data: string, n = 4): BoletimArquivo => ({
  data,
  titulo: "Boletim Dominical",
  pdf: `/boletins/boletim-${data}.pdf`,
  capa: `/boletins/${data}/capa.webp`,
  paginas: Array.from({ length: n }, (_, i) => `/boletins/${data}/pagina-${i + 1}.webp`),
});

export const BOLETINS_ARQUIVO: BoletimArquivo[] = [
  arquivo("2026-11-22"),
  arquivo("2026-11-15"),
  arquivo("2026-11-08"),
];
