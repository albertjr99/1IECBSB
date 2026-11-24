/** Versículos guardados pelo membro (sincronizados com a conta). */
import { router } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Aviso, Cartao, Tela } from "@/componentes/ui";
import { obterIndice, obterLivro, type Indice } from "@/lib/biblia";
import { useMembro } from "@/lib/sessao";
import { F, useTema } from "@/lib/tema";

export default function Favoritos() {
  const { membro, salvarPerfil } = useMembro();
  const { c, letra } = useTema();
  const [indice, setIndice] = useState<Indice | null>(null);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const versao = membro.prefs.versao || "blivre";
  useEffect(() => { obterIndice().then(setIndice).catch(() => {}); }, []);
  useEffect(() => {
    membro.favoritos.versos.forEach(async (k) => {
      const [b, ch, v] = k.split(".");
      try { const l = await obterLivro(versao, b!); setTextos((t) => ({ ...t, [k]: l[Number(ch) - 1]?.[Number(v) - 1] ?? "" })); } catch { /* sem internet */ }
    });
  }, [membro.favoritos.versos, versao]);
  const nome = (id: string) => indice?.livros.find((l) => l.id === id)?.nome ?? id;
  const ord = [...membro.favoritos.versos].reverse();
  return (
    <Tela voltar titulo="Versículos guardados">
      {!ord.length ? <Aviso texto="Na Bíblia, toque em um versículo e depois no marcador para guardá-lo aqui." /> : ord.map((k) => {
        const [b, ch, v] = k.split(".");
        return (
          <Cartao key={k} onPress={() => router.push(`/biblia?ref=${k}`)} style={{ padding: 16, gap: 8, borderLeftWidth: 3, borderLeftColor: "#CC2127" }}>
            <Text style={{ fontFamily: F.verso, fontSize: 17 * letra, lineHeight: 26 * letra, color: c.texto }}>“{textos[k] ?? "…"}”</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ flex: 1, fontFamily: F.negrito, fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: c.azul }}>{nome(b!)} {ch}:{v}</Text>
              <Pressable hitSlop={10} onPress={() => salvarPerfil({ favoritos: { ...membro.favoritos, versos: membro.favoritos.versos.filter((x) => x !== k) } }).catch(() => {})}><Trash2 size={17} color={c.suave} /></Pressable>
            </View>
          </Cartao>
        );
      })}
    </Tela>
  );
}
