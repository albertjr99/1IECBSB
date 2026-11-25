import { Baby, BookOpen, Coffee, DoorOpen, HandHeart, Heart, Mic2, Music, Star, Video } from "lucide-react-native";

const MAPA = { musica: Music, video: Video, maos: HandHeart, crianca: Baby, coracao: Heart, porta: DoorOpen, microfone: Mic2, livro: BookOpen, cafe: Coffee, estrela: Star } as const;

export function IconeMinisterio({ chave, size = 18, color }: { chave: string; size?: number; color: string }) {
  const I = MAPA[chave as keyof typeof MAPA] ?? Star;
  return <I size={size} color={color} />;
}
