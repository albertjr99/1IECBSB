/** Fotos dos membros servidas como imagem (com versão para o cache do celular). */
import { createHash } from "node:crypto";

export const versaoDaFoto = (foto: string) => createHash("sha1").update(foto).digest("hex").slice(0, 10);
