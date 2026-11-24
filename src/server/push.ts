/**
 * Notificações no celular (app das lojas) pelo serviço de push da Expo.
 * Sem chave própria: o token do aparelho já identifica o app. Falha de envio
 * nunca derruba a ação que a disparou.
 */
import { lerMembros, gravarMembros } from "./membros";

export type Destino = "todos" | string[];

type Mensagem = { titulo: string; texto: string; dados?: Record<string, string> };

export async function enviarPush(destino: Destino, msg: Mensagem): Promise<{ aparelhos: number; membros: number }> {
  try {
    const membros = (await lerMembros()).filter((m) => m.situacao === "ativo" && (destino === "todos" || destino.includes(m.id)));
    const tokens = membros.flatMap((m) => (m.aparelhos ?? []).map((a) => a.token));
    if (!tokens.length) return { aparelhos: 0, membros: 0 };
    const invalidos = new Set<string>();
    for (let i = 0; i < tokens.length; i += 100) {
      const lote = tokens.slice(i, i + 100);
      const r = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(lote.map((to) => ({ to, title: msg.titulo, body: msg.texto, data: msg.dados ?? {}, sound: "default", channelId: "avisos" }))),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null);
      const j = (await r?.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
      j?.data?.forEach((d, k) => { if (d.details?.error === "DeviceNotRegistered") invalidos.add(lote[k]!); });
    }
    if (invalidos.size) {
      const l = await lerMembros();
      for (const m of l) if (m.aparelhos) m.aparelhos = m.aparelhos.filter((a) => !invalidos.has(a.token));
      await gravarMembros(l);
    }
    return { aparelhos: tokens.length - invalidos.size, membros: membros.length };
  } catch (e) {
    console.error("push", e);
    return { aparelhos: 0, membros: 0 };
  }
}

/** Envia só na primeira vez para cada chave (ex.: o mesmo boletim republicado não avisa de novo). */
export async function avisarUmaVez(chave: string, destino: Destino, msg: Mensagem) {
  const { ler, gravar } = await import("./armazem");
  const feitos = (await ler<string[]>("push-enviados")) ?? [];
  if (feitos.includes(chave)) return;
  await gravar("push-enviados", [chave, ...feitos].slice(0, 400));
  await enviarPush(destino, msg);
}
