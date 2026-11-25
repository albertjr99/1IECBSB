import { BookOpen, Baby, Coffee, DoorOpen, HandHeart, Heart, Mic2, Music, Star, Video, type LucideIcon } from "lucide-react";

/** Ícone de cada ministério (chaves de ICONES_MINISTERIO). */
export const ICONE_MINISTERIO: Record<string, LucideIcon> = {
  musica: Music, video: Video, maos: HandHeart, crianca: Baby, coracao: Heart, porta: DoorOpen, microfone: Mic2, livro: BookOpen, cafe: Coffee, estrela: Star,
};

export const IconeMinisterio = ({ chave, size = 18, className }: { chave: string; size?: number; className?: string }) => {
  const I = ICONE_MINISTERIO[chave] ?? Star;
  return <I size={size} className={className} />;
};
