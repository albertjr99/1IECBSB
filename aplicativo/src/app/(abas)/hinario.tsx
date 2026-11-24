/** Hinário: Coletânea dos Salmos e Hinos — busca por número, título ou trecho; favoritos. */
import { router } from "expo-router";
import { Heart, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Aviso, Sobre, T, Titulo } from "@/componentes/ui";
import { buscarHinos } from "@/lib/hinario";
import { useMembro } from "@/lib/sessao";
import { AZUL, F, useTema } from "@/lib/tema";

export default function Hinario() {
  const { membro } = useMembro();
  const { c } = useTema();
  const ins = useSafeAreaInsets();
  const [busca, setBusca] = useState("");
  const [so, setSo] = useState<"todos" | "favoritos">("todos");
  const favs = new Set(membro.favoritos.hinos);
  const lista = useMemo(() => buscarHinos(busca).filter((h) => so === "todos" || favs.has(h.numero)), [busca, so, membro.favoritos.hinos]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      <View style={{ paddingTop: ins.top + 14, paddingHorizontal: 18, paddingBottom: 12, gap: 12, backgroundColor: c.sup, borderBottomWidth: 1, borderBottomColor: c.borda }}>
        <View style={{ gap: 6 }}><Sobre>Salmos e Hinos</Sobre><Titulo>Hinário</Titulo></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 48, borderWidth: 1, borderColor: c.borda, paddingHorizontal: 12, backgroundColor: c.fundo }}>
          <Search size={18} color={c.suave} />
          <TextInput value={busca} onChangeText={setBusca} placeholder="Número, título ou trecho" placeholderTextColor={c.suave} style={{ flex: 1, fontFamily: F.medio, fontSize: 15.5, color: c.texto }} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["todos", "favoritos"] as const).map((x) => (
            <Pressable key={x} onPress={() => setSo(x)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: so === x ? AZUL : c.borda, backgroundColor: so === x ? AZUL : "transparent" }}>
              <Text style={{ fontFamily: F.negrito, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: so === x ? "#fff" : c.suave }}>{x === "todos" ? "Todos" : "Favoritos"}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={lista}
        keyExtractor={(h) => String(h.numero)}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={<Aviso texto={so === "favoritos" ? "Toque no coração de um hino para guardá-lo aqui." : "Nenhum hino encontrado."} />}
        renderItem={({ item: h }) => (
          <Pressable onPress={() => router.push(`/hino/${h.numero}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borda, backgroundColor: pressed ? c.realce : c.sup })}>
            <Text style={{ width: 48, fontFamily: F.extra, fontSize: 20, color: c.azul, fontVariant: ["tabular-nums"] }}>{h.numero}</Text>
            <View style={{ flex: 1 }}>
              <T f={F.negrito} s={15.5} linhas={1}>{h.titulo}</T>
              <T s={13} f={F.verso} cor={c.suave} linhas={1}>{h.partes[0]?.linhas[0]}</T>
            </View>
            {favs.has(h.numero) ? <Heart size={16} color="#CC2127" fill="#CC2127" /> : null}
          </Pressable>
        )}
      />
    </View>
  );
}
