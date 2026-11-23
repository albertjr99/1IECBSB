/**
 * YouTube Data API v3 — sempre chamada pelo servidor, nunca pelo navegador.
 *
 * Assim a chave não aparece para quem visita o site, e o cache (na memória do
 * servidor e no banco) segura a cota diária do Google: a lista completa de
 * vídeos é buscada no máximo uma vez por hora; a checagem de "ao vivo", a cada
 * 90 segundos, custa 2 unidades.
 */
import { gravar, ler } from "./armazem";

const API = "https://www.googleapis.com/youtube/v3";

function chave(): string {
  // A chave padrão é a mesma já usada pela TV ACIP (autorizada pelo dono).
  // Recomenda-se configurar YOUTUBE_API_KEY na Vercel e restringir a chave.
  return process.env.YOUTUBE_API_KEY || "AIzaSyAUTAiPPb2VyLzMVv1BX-400HQEiCz8QOc";
}

export type Video = {
  id: string;
  titulo: string;
  publicado: string;
  thumb: string;
  /** segundos; 0 quando desconhecido (ex.: transmissão) */
  duracao: number;
};

export type SituacaoAoVivo = {
  aoVivo: Video | null;
  agendado: (Video & { inicio: string }) | null;
  verificadoEm: string;
};

type Cache<T> = { em: number; dados: T };
const memoria = new Map<string, Cache<unknown>>();

async function comCache<T>(id: string, ttlMs: number, buscar: () => Promise<T>, usarBanco = true): Promise<T> {
  const agora = Date.now();
  const mem = memoria.get(id) as Cache<T> | undefined;
  if (mem && agora - mem.em < ttlMs) return mem.dados;

  if (usarBanco) {
    try {
      const salvo = await ler<Cache<T>>(`yt:${id}`);
      if (salvo && agora - salvo.em < ttlMs) {
        memoria.set(id, salvo);
        return salvo.dados;
      }
    } catch { /* banco indisponível: segue para a API */ }
  }

  try {
    const dados = await buscar();
    const reg = { em: agora, dados };
    memoria.set(id, reg);
    if (usarBanco) gravar(`yt:${id}`, reg).catch(() => {});
    return dados;
  } catch (e) {
    // Falhou (cota, rede): devolve o último resultado conhecido, mesmo velho.
    if (mem) return mem.dados;
    throw e;
  }
}

async function api<T>(caminho: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${caminho}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", chave());
  const r = await fetch(url);
  const json = (await r.json()) as T & { error?: { message: string } };
  if (!r.ok || json.error) throw new Error(`YouTube: ${json.error?.message ?? r.status}`);
  return json;
}

function duracaoEmSegundos(iso?: string): number {
  if (!iso) return 0;
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  return (+(m[1] ?? 0)) * 86400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60 + (+(m[4] ?? 0));
}

type Thumbs = Record<string, { url: string } | undefined>;
const melhorThumb = (t: Thumbs) => t["maxres"]?.url ?? t["standard"]?.url ?? t["high"]?.url ?? t["medium"]?.url ?? t["default"]?.url ?? "";

export async function canal(handle: string) {
  const h = handle.replace(/^@/, "").trim();
  return comCache(`canal:${h}`, 24 * 3600_000, async () => {
    const d = await api<{ items?: { id: string; contentDetails: { relatedPlaylists: { uploads: string } } }[] }>(
      "channels", { part: "contentDetails", forHandle: h },
    );
    const item = d.items?.[0];
    if (!item) throw new Error(`Canal @${h} não encontrado`);
    return { id: item.id, uploads: item.contentDetails.relatedPlaylists.uploads };
  });
}

async function detalhes(ids: string[]) {
  const mapa = new Map<string, { duracao: number; ao: string; inicio?: string; thumb: string }>();
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const d = await api<{
      items?: {
        id: string;
        snippet: { liveBroadcastContent: string; thumbnails: Thumbs };
        contentDetails: { duration: string };
        liveStreamingDetails?: { scheduledStartTime?: string; actualStartTime?: string };
      }[];
    }>("videos", { part: "snippet,contentDetails,liveStreamingDetails", id: lote.join(","), maxResults: "50" });
    for (const v of d.items ?? []) {
      mapa.set(v.id, {
        duracao: duracaoEmSegundos(v.contentDetails.duration),
        ao: v.snippet.liveBroadcastContent,
        thumb: melhorThumb(v.snippet.thumbnails),
        ...(v.liveStreamingDetails?.scheduledStartTime ? { inicio: v.liveStreamingDetails.scheduledStartTime } : {}),
      });
    }
  }
  return mapa;
}

async function itensDaPlaylist(playlistId: string, limite = 5000): Promise<Video[]> {
  const videos: Video[] = [];
  let pagina: string | undefined;
  do {
    const d = await api<{
      items?: { snippet: { title: string; publishedAt: string; resourceId: { videoId: string }; thumbnails: Thumbs }; contentDetails?: { videoPublishedAt?: string } }[];
      nextPageToken?: string;
    }>("playlistItems", {
      part: "snippet,contentDetails", playlistId, maxResults: "50", ...(pagina ? { pageToken: pagina } : {}),
    });
    for (const it of d.items ?? []) {
      const s = it.snippet;
      if (!s.resourceId?.videoId || s.title === "Private video" || s.title === "Deleted video") continue;
      videos.push({
        id: s.resourceId.videoId,
        titulo: s.title,
        publicado: it.contentDetails?.videoPublishedAt ?? s.publishedAt,
        thumb: melhorThumb(s.thumbnails),
        duracao: 0,
      });
    }
    pagina = d.nextPageToken;
  } while (pagina && videos.length < limite);

  const det = await detalhes(videos.map((v) => v.id));
  return videos
    .filter((v) => det.get(v.id)?.ao !== "upcoming")
    .map((v) => ({ ...v, duracao: det.get(v.id)?.duracao ?? 0 }))
    .sort((a, b) => b.publicado.localeCompare(a.publicado));
}

export async function todosOsVideos(handle: string): Promise<Video[]> {
  const c = await canal(handle);
  return comCache(`uploads:${c.uploads}`, 3600_000, () => itensDaPlaylist(c.uploads));
}

export async function videosDaPlaylist(playlistId: string): Promise<Video[]> {
  return comCache(`playlist:${playlistId}`, 3600_000, () => itensDaPlaylist(playlistId));
}

export async function situacaoAoVivo(handle: string): Promise<SituacaoAoVivo> {
  const c = await canal(handle);
  return comCache(`aovivo:${c.uploads}`, 90_000, async () => {
    const d = await api<{ items?: { snippet: { title: string; publishedAt: string; resourceId: { videoId: string }; thumbnails: Thumbs } }[] }>(
      "playlistItems", { part: "snippet", playlistId: c.uploads, maxResults: "8" },
    );
    const itens = d.items ?? [];
    const det = await detalhes(itens.map((i) => i.snippet.resourceId.videoId));
    let aoVivo: Video | null = null;
    let agendado: (Video & { inicio: string }) | null = null;
    for (const it of itens) {
      const id = it.snippet.resourceId.videoId;
      const x = det.get(id);
      const v: Video = { id, titulo: it.snippet.title, publicado: it.snippet.publishedAt, thumb: x?.thumb || melhorThumb(it.snippet.thumbnails), duracao: 0 };
      if (x?.ao === "live" && !aoVivo) aoVivo = v;
      if (x?.ao === "upcoming" && x.inicio && new Date(x.inicio).getTime() > Date.now() - 3600_000) {
        if (!agendado || x.inicio < agendado.inicio) agendado = { ...v, inicio: x.inicio };
      }
    }
    return { aoVivo, agendado, verificadoEm: new Date().toISOString() };
  }, false);
}
