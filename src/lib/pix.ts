/**
 * Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central), com
 * valor e identificador. O membro paga no app do banco dele; nada de dados
 * bancários passa por aqui.
 */
const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

function crc16(t: string) {
  let crc = 0xffff;
  for (let i = 0; i < t.length; i++) {
    crc ^= t.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().trim();

/** Chave como o Pix espera: CPF/CNPJ só números, celular com +55, e-mail e aleatória como estão. */
export function normalizarChave(chave: string, tipo: string) {
  const c = chave.trim();
  if (/cnpj|cpf/i.test(tipo) || /^[\d./-]{11,18}$/.test(c)) return c.replace(/\D/g, "");
  if (/telefone|celular/i.test(tipo)) { const d = c.replace(/\D/g, ""); return d.startsWith("55") ? `+${d}` : `+55${d}`; }
  return c;
}

export function brCode({ chave, nome, cidade = "BRASILIA", valorCentavos, txid, descricao }: { chave: string; nome: string; cidade?: string; valorCentavos?: number; txid?: string; descricao?: string }) {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave) + (descricao ? campo("02", semAcento(descricao).slice(0, 40)) : "");
  const id = (txid ?? "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (valorCentavos ? campo("54", (valorCentavos / 100).toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", semAcento(nome).slice(0, 25) || "IGREJA") +
    campo("60", semAcento(cidade).slice(0, 15) || "BRASILIA") +
    campo("62", campo("05", id)) +
    "6304";
  return corpo + crc16(corpo);
}
