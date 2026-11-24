/** Hino: estrofes numeradas, coro destacado e modo culto (tela cheia, estrofe por estrofe). */
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, ChevronRight, Heart, Maximize2, Minus, Plus, Share2, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Modal, PanResponder, Pressable, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { Aviso, T, Tela } from "@/componentes/ui";
import { acharHino, HINARIO, sequenciaCulto, type HinoCompleto } from "@/lib/hinario";
import { CRUZ } from "@/lib/marca";
import { anotarHino } from "@/lib/historico";
import { useMembro } from "@/lib/sessao";
import { AZUL, F, NOITE, useTema } from "@/lib/tema";

export default function TelaHino() {
  const { n } = useLocalSearchParams<{ n: string }>();
  const { membro, salvarPerfil } = useMembro();
  const { c, letra } = useTema();
  const [culto, setCulto] = useState(false);
  const h = acharHino(Number(n));
  const i = HINARIO.findIndex((x) => x.numero === Number(n));
  const fav = membro.favoritos.hinos.includes(Number(n));
  const alternar = () => {
    const s = new Set(membro.favoritos.hinos);
    if (fav) s.delete(Number(n)); else s.add(Number(n));
    Haptics.selectionAsync().catch(() => {});
    salvarPerfil({ favoritos: { ...membro.favoritos, hinos: [...s] } }).catch(() => {});
  };
  useEffect(() => { if (h) anotarHino(h.numero).catch(() => {}); }, [h?.numero]); // eslint-disable-line react-hooks/exhaustive-deps
  const tam = 18 * letra;
  const mudarLetra = (d: number) => salvarPerfil({ prefs: { ...membro.prefs, letra: Math.min(5, Math.max(1, membro.prefs.letra + d)) } }).catch(() => {});
  const vizinho = (d: 1 | -1) => { const x = HINARIO[i + d]; if (x) { Haptics.selectionAsync().catch(() => {}); router.replace(`/hino/${x.numero}`); } };
  const gesto = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_e, g) => { if (Math.abs(g.dx) > 90) vizinho(g.dx < 0 ? 1 : -1); },
  }), [i]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Tela voltar titulo="Hinário" fundo={c.sup} direita={
      <View style={{ flexDirection: "row" }}>
        <Pressable hitSlop={8} onPress={alternar} style={{ padding: 8 }}><Heart size={22} color={fav ? "#CC2127" : c.suave} fill={fav ? "#CC2127" : "transparent"} /></Pressable>
        {h ? <Pressable hitSlop={8} onPress={() => Share.share({ message: `${h.numero}. ${h.titulo}\n\n${h.partes.map((p) => (p.tipo === "coro" ? `Coro:\n${p.linhas.join("\n")}` : `${p.n}. ${p.linhas.join("\n")}`)).join("\n\n")}` })} style={{ padding: 8 }}><Share2 size={21} color={c.azul} /></Pressable> : null}
      </View>
    }>
      {!h ? <Aviso texto="Hino não encontrado." /> : (
        <View style={{ gap: 24, paddingTop: 4 }} {...gesto.panHandlers}>
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><SvgXml xml={CRUZ} width={7} height={13} /><Text style={{ fontFamily: F.negrito, fontSize: 10.5, letterSpacing: 2.3, textTransform: "uppercase", color: c.azul }}>Salmos e Hinos</Text></View>
            <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
              <View style={{ minWidth: 64, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: AZUL, alignItems: "center" }}><Text style={{ fontFamily: F.extra, fontSize: 30, color: "#fff" }}>{h.numero}</Text></View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: F.negrito, fontSize: 24, lineHeight: 29, color: c.escuro ? c.texto : AZUL }}>{h.titulo}</Text>
                {h.autor ? <T s={13} cor={c.suave}>{h.autor}</T> : null}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => mudarLetra(-1)} accessibilityLabel="Letra menor" style={{ width: 48, height: 48, borderWidth: 1, borderColor: c.borda, alignItems: "center", justifyContent: "center" }}><Minus size={18} color={c.azul} /></Pressable>
              <Pressable onPress={() => mudarLetra(1)} accessibilityLabel="Letra maior" style={{ width: 48, height: 48, borderWidth: 1, borderColor: c.borda, alignItems: "center", justifyContent: "center" }}><Plus size={18} color={c.azul} /></Pressable>
              <Pressable onPress={() => setCulto(true)} style={{ flex: 1, height: 48, backgroundColor: AZUL, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Maximize2 size={17} color="#fff" />
                <Text style={{ fontFamily: F.negrito, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", color: "#fff" }}>Modo culto</Text>
              </Pressable>
            </View>
          </View>
          {h.partes.map((p, k) => p.tipo === "coro" ? (
            <View key={k} style={{ marginLeft: 8, padding: 16, backgroundColor: c.realce, borderLeftWidth: 3, borderLeftColor: AZUL, gap: 2 }}>
              <Text style={{ fontFamily: F.negrito, fontSize: 10, letterSpacing: 2.2, textTransform: "uppercase", color: c.suave, marginBottom: 8 }}>Coro</Text>
              {p.linhas.map((l, j) => <Text key={j} style={{ fontFamily: F.verso, fontSize: tam, lineHeight: tam * 1.6, color: c.escuro ? c.texto : AZUL }}>{l}</Text>)}
            </View>
          ) : (
            <View key={k} style={{ flexDirection: "row", gap: 10 }}>
              <Text style={{ width: 22, fontFamily: F.extra, fontSize: 15, color: c.azul, paddingTop: 4 }}>{p.n}</Text>
              <View style={{ flex: 1 }}>{p.linhas.map((l, j) => <Text key={j} style={{ fontFamily: F.leitura, fontSize: tam, lineHeight: tam * 1.6, color: c.texto }}>{l}</Text>)}</View>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.borda, paddingTop: 16, marginTop: 6 }}>
            {HINARIO[i - 1] ? <Pressable onPress={() => vizinho(-1)} style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 6 }}><ChevronLeft size={18} color={c.azul} /><T f={F.negrito} s={12.5} cor={c.azul}>Hino {HINARIO[i - 1]!.numero}</T></Pressable> : <View />}
            {HINARIO[i + 1] ? <Pressable onPress={() => vizinho(1)} style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 6 }}><T f={F.negrito} s={12.5} cor={c.azul}>Hino {HINARIO[i + 1]!.numero}</T><ChevronRight size={18} color={c.azul} /></Pressable> : <View />}
          </View>
          {culto ? <ModoCulto hino={h} fechar={() => setCulto(false)} /> : null}
        </View>
      )}
    </Tela>
  );
}

function ModoCulto({ hino, fechar }: { hino: HinoCompleto; fechar: () => void }) {
  useKeepAwake(); // a tela não apaga durante o hino
  const ins = useSafeAreaInsets();
  const seq = sequenciaCulto(hino);
  const [i, setI] = useState(0);
  const ir = (d: number) => { setI((x) => Math.min(seq.length - 1, Math.max(0, x + d))); Haptics.selectionAsync().catch(() => {}); };
  const gesto = PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 20,
    onPanResponderRelease: (_e, g) => { if (Math.abs(g.dx) > 60) ir(g.dx < 0 ? 1 : -1); },
  });
  const p = seq[i]!;
  const tam = Math.max(22, 34 - Math.max(0, Math.max(...p.linhas.map((l) => l.length)) - 28) * 0.35);
  return (
    <Modal visible animationType="fade" onRequestClose={fechar} statusBarTranslucent supportedOrientations={["portrait", "landscape"]}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: NOITE, paddingTop: ins.top, paddingBottom: ins.bottom }} {...gesto.panHandlers}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#ffffff1f" }}>
          <Text style={{ fontFamily: F.extra, fontSize: 13, color: AZUL, backgroundColor: "#fff", paddingHorizontal: 7, paddingVertical: 2 }}>{hino.numero}</Text>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.semi, fontSize: 14, color: "#ffffffcc" }}>{hino.titulo}</Text>
          <Pressable hitSlop={12} onPress={fechar}><X size={24} color="#fff" /></Pressable>
        </View>
        <Pressable onPress={() => ir(1)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 26 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 26 }}>
            <SvgXml xml={CRUZ} width={7} height={13} />
            <Text style={{ fontFamily: F.negrito, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#D9E6EF" }}>{p.tipo === "coro" ? "Coro" : `Estrofe ${p.n}`}</Text>
          </View>
          {p.linhas.map((l, k) => <Text key={`${i}-${k}`} style={{ fontFamily: p.tipo === "coro" ? F.versoMedio : F.leitura, fontSize: tam, lineHeight: tam * 1.42, color: "#fff", textAlign: "center" }}>{l}</Text>)}
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 }}>
          <Pressable onPress={() => ir(-1)} disabled={i === 0} style={{ width: 54, height: 54, borderWidth: 1, borderColor: "#ffffff40", alignItems: "center", justifyContent: "center", opacity: i === 0 ? 0.3 : 1 }}><ChevronLeft size={26} color="#fff" /></Pressable>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 5, maxWidth: "62%" }}>
            {seq.map((s, k) => <View key={k} style={{ width: s.tipo === "coro" ? 9 : 16, height: 3, backgroundColor: k === i ? "#fff" : "#ffffff40" }} />)}
          </View>
          <Pressable onPress={() => ir(1)} disabled={i === seq.length - 1} style={{ width: 54, height: 54, borderWidth: 1, borderColor: "#ffffff40", alignItems: "center", justifyContent: "center", opacity: i === seq.length - 1 ? 0.3 : 1 }}><ChevronRight size={26} color="#fff" /></Pressable>
        </View>
      </View>
    </Modal>
  );
}
