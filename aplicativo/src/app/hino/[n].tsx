/** Leitura de um hino, com coro destacado e letra ajustável. */
import { useLocalSearchParams } from "expo-router";
import { Heart, Share2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { Aviso, T, Tela } from "@/componentes/ui";
import { lerCache } from "@/lib/cache";
import { useMembro } from "@/lib/sessao";
import { AZUL, F, useTema } from "@/lib/tema";
import type { Hino } from "@/lib/tipos";

export default function TelaHino() {
  const { n } = useLocalSearchParams<{ n: string }>();
  const { membro, salvarPerfil } = useMembro();
  const { c, letra } = useTema();
  const [h, setH] = useState<Hino | null | undefined>(undefined);
  useEffect(() => { lerCache<Hino[]>("hinos").then((l) => setH(l?.find((x) => x.numero === Number(n)) ?? null)); }, [n]);
  const fav = membro.favoritos.hinos.includes(Number(n));
  const alternar = () => {
    const s = new Set(membro.favoritos.hinos);
    if (fav) s.delete(Number(n)); else s.add(Number(n));
    salvarPerfil({ favoritos: { ...membro.favoritos, hinos: [...s] } }).catch(() => {});
  };
  const estrofes = (h?.letra ?? "").split(/\n\s*\n/).map((e) => e.trim()).filter(Boolean);
  return (
    <Tela voltar titulo={h ? `Hino ${h.numero}` : "Hino"} direita={
      <View style={{ flexDirection: "row" }}>
        <Pressable hitSlop={8} onPress={alternar} style={{ padding: 8 }}><Heart size={22} color={fav ? "#CC2127" : c.suave} fill={fav ? "#CC2127" : "transparent"} /></Pressable>
        {h ? <Pressable hitSlop={8} onPress={() => Share.share({ message: `${h.numero}. ${h.titulo}\n\n${h.letra.replace(/^Coro:\s*/gim, "")}` })} style={{ padding: 8 }}><Share2 size={21} color={c.azul} /></Pressable> : null}
      </View>
    } fundo={c.sup}>
      {h === null ? <Aviso texto="Hino não encontrado." /> : h ? (
        <View style={{ gap: 22, paddingTop: 6 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: F.extra, fontSize: 40, color: c.escuro ? c.azul : AZUL }}>{h.numero}</Text>
            <Text style={{ fontFamily: F.negrito, fontSize: 24 * letra, lineHeight: 30 * letra, color: c.escuro ? c.texto : AZUL }}>{h.titulo}</Text>
            {h.autor ? <T s={13} cor={c.suave}>{h.autor}</T> : null}
          </View>
          {estrofes.map((e, i) => {
            const coro = /^coro:/i.test(e);
            const linhas = e.replace(/^coro:\s*/i, "");
            return (
              <View key={i} style={coro ? { borderLeftWidth: 3, borderLeftColor: AZUL, paddingLeft: 14 } : { flexDirection: "row", gap: 12 }}>
                {coro ? <T s={10.5} f={F.negrito} cor={c.azul} style={{ letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Coro</T> : <Text style={{ fontFamily: F.negrito, fontSize: 13, color: c.suave, width: 18, paddingTop: 3 }}>{estrofes.slice(0, i + 1).filter((x) => !/^coro:/i.test(x)).length}</Text>}
                <Text style={{ flex: coro ? undefined : 1, fontFamily: coro ? F.verso : F.leitura, fontSize: 18 * letra, lineHeight: 29 * letra, color: c.texto }}>{linhas}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Tela>
  );
}
