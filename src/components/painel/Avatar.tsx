import { cn } from "@/lib/utils";

/** Iniciais sem os títulos (Pr., Pb., Dca., Sem.). */
export function iniciais(nome: string) {
  return nome.split(/\s+/).filter((p) => p && !/^(pr|pb|dc|dca|sem|cas)\.?$/i.test(p)).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}

/** Foto da pessoa, ou as iniciais num círculo azul. */
export function Avatar({ nome, foto, tamanho = 32, className }: { nome: string; foto?: string | null; tamanho?: number; className?: string }) {
  return foto ? (
    <img src={foto} alt="" width={tamanho} height={tamanho} className={cn("shrink-0 rounded-full object-cover ring-1 ring-black/5", className)} style={{ width: tamanho, height: tamanho }} />
  ) : (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-[#00436f] font-bold text-white", className)} style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.36) }} aria-hidden>
      {iniciais(nome)}
    </span>
  );
}

/** Reduz uma foto no navegador (quadrada, JPEG) antes de enviar. */
export async function fotoQuadrada(arquivo: File, lado = 320): Promise<string> {
  const bmp = await createImageBitmap(arquivo);
  const menor = Math.min(bmp.width, bmp.height);
  const cv = document.createElement("canvas");
  cv.width = lado;
  cv.height = lado;
  cv.getContext("2d")!.drawImage(bmp, (bmp.width - menor) / 2, (bmp.height - menor) / 2, menor, menor, 0, 0, lado, lado);
  return cv.toDataURL("image/jpeg", 0.85);
}
