/** As cinco abas do app, com a barra inferior na identidade da igreja. */
import { Tabs } from "expo-router/js-tabs";
import { BookOpen, Home, Menu, Music, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { carregarParticipacao, pendencias } from "@/lib/participar";
import { carregarEscalas } from "@/lib/escalas";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AZUL, F, useTema } from "@/lib/tema";

const ABAS = [
  { nome: "index", rotulo: "Início", Icone: Home },
  { nome: "biblia", rotulo: "Bíblia", Icone: BookOpen },
  { nome: "hinario", rotulo: "Hinário", Icone: Music },
  { nome: "participar", rotulo: "Participar", Icone: Users },
  { nome: "mais", rotulo: "Mais", Icone: Menu },
] as const;

export default function Abas() {
  const { c } = useTema();
  const ins = useSafeAreaInsets();
  // número no ícone "Participar": votações esperando o voto + reuniões acontecendo
  const [aviso, setAviso] = useState(0);
  useEffect(() => {
    // + escalas esperando a confirmação
    const ver = () => Promise.all([carregarParticipacao().then(pendencias).catch(() => 0), carregarEscalas().then((e) => e.pendentes).catch(() => 0)]).then(([a, b]) => setAviso(a + b));
    ver();
    const t = setInterval(ver, 60_000);
    const s = AppState.addEventListener("change", (e) => { if (e === "active") ver(); });
    return () => { clearInterval(t); s.remove(); };
  }, []);
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.fundo } }}
      tabBar={({ state, navigateToTab }) => (
        <View style={{ flexDirection: "row", backgroundColor: c.sup, borderTopWidth: 1, borderTopColor: c.borda, paddingBottom: Math.max(ins.bottom, 8), paddingTop: 6 }}>
          {state.routes.map((r, i) => {
            const a = ABAS.find((x) => x.nome === r.name);
            if (!a) return null;
            const ativo = state.index === i;
            const cor = ativo ? (c.escuro ? c.azul : AZUL) : c.suave;
            return (
              <Pressable
                key={r.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: ativo }}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  if (!ativo) navigateToTab(r.key);
                }}
                style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 }}
              >
                <View style={{ height: 3, width: 22, backgroundColor: ativo ? "#CC2127" : "transparent", marginBottom: 3 }} />
                <View>
                  <a.Icone size={22} color={cor} strokeWidth={ativo ? 2.3 : 1.8} />
                  {a.nome === "participar" && aviso > 0 ? (
                    <View style={{ position: "absolute", top: -5, right: -10, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#CC2127", borderWidth: 2, borderColor: c.sup, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: F.negrito, fontSize: 9.5, color: "#fff" }}>{aviso}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ fontFamily: ativo ? F.negrito : F.medio, fontSize: 10.5, color: cor }}>{a.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    >
      {ABAS.map((a) => <Tabs.Screen key={a.nome} name={a.nome} />)}
      <Tabs.Screen name="ofertar" />
    </Tabs>
  );
}
