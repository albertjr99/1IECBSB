/** Peças visuais do app — identidade da 1ª IEC Brasília. */
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { CRUZ, HORIZONTAL, HORIZONTAL_NEGATIVO, SIMBOLO, SIMBOLO_NEGATIVO } from "@/lib/marca";
import { AZUL, F, RAIO, VERMELHO, useTema } from "@/lib/tema";
import { iniciais } from "@/lib/util";

export function T({ children, style, s = 15, f = F.regular, cor, linhas, centro, selecionavel }: { children: ReactNode; style?: StyleProp<TextStyle>; s?: number; f?: string; cor?: string; linhas?: number; centro?: boolean; selecionavel?: boolean }) {
  const { c } = useTema();
  return <Text selectable={selecionavel} numberOfLines={linhas} style={[{ fontFamily: f, fontSize: s, color: cor ?? c.texto, lineHeight: Math.round(s * 1.45), textAlign: centro ? "center" : undefined }, style]}>{children}</Text>;
}

/** Sobretítulo com a cruz vermelha da marca. */
export function Sobre({ children, cor, style }: { children: ReactNode; cor?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTema();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>
      <SvgXml xml={CRUZ} width={7} height={13} />
      <Text style={{ fontFamily: F.negrito, fontSize: 10.5, letterSpacing: 2.3, textTransform: "uppercase", color: cor ?? c.azul }}>{children}</Text>
    </View>
  );
}

export function Titulo({ children, s = 24, style }: { children: ReactNode; s?: number; style?: StyleProp<TextStyle> }) {
  const { c } = useTema();
  return <Text style={[{ fontFamily: F.negrito, fontSize: s, lineHeight: Math.round(s * 1.18), letterSpacing: -0.4, color: c.escuro ? c.texto : AZUL }, style]}>{children}</Text>;
}

export function Cartao({ children, style, filete, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; filete?: boolean; onPress?: () => void }) {
  const { c } = useTema();
  const base: StyleProp<ViewStyle> = [
    { backgroundColor: c.sup, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.borda, borderRadius: RAIO, shadowColor: "#002A47", shadowOpacity: c.escuro ? 0 : 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: c.escuro ? 0 : 2 },
    filete && { borderTopWidth: 3, borderTopColor: c.escuro ? c.azul : AZUL },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.82 }]}>{children}</Pressable>;
}

export function Botao({ children, onPress, tipo = "pri", carregando, desativado, icone, style }: { children: ReactNode; onPress?: () => void; tipo?: "pri" | "sec" | "fantasma" | "perigo" | "branco"; carregando?: boolean; desativado?: boolean; icone?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTema();
  const fundo = { pri: AZUL, sec: "transparent", fantasma: "transparent", perigo: "transparent", branco: "#FFFFFF" }[tipo];
  const cor = { pri: "#FFFFFF", sec: c.escuro ? c.texto : AZUL, fantasma: c.suave, perigo: VERMELHO, branco: AZUL }[tipo];
  const borda = { pri: AZUL, sec: c.escuro ? c.azul : AZUL, fantasma: "transparent", perigo: VERMELHO, branco: "#FFFFFF" }[tipo];
  return (
    <Pressable
      disabled={desativado || carregando}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
      style={({ pressed }) => [{ height: 52, paddingHorizontal: 20, borderRadius: RAIO, backgroundColor: fundo, borderWidth: 1.5, borderColor: borda, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: desativado ? 0.45 : pressed ? 0.85 : 1 }, style]}
    >
      {carregando ? <ActivityIndicator color={cor} /> : icone}
      <Text style={{ fontFamily: F.negrito, fontSize: 12.5, letterSpacing: 1.6, textTransform: "uppercase", color: cor }}>{children}</Text>
    </Pressable>
  );
}

export function Campo({ rotulo, dica, style, ...p }: TextInputProps & { rotulo: string; dica?: string }) {
  const { c } = useTema();
  return (
    <View style={[{ gap: 6 }, style as StyleProp<ViewStyle>]}>
      <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.suave }}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={c.suave + "99"}
        {...p}
        style={{ height: p.multiline ? 110 : 52, paddingHorizontal: 14, paddingTop: p.multiline ? 12 : 0, fontFamily: F.medio, fontSize: 16, color: c.texto, backgroundColor: c.sup, borderWidth: 1, borderColor: c.borda, borderRadius: RAIO, textAlignVertical: p.multiline ? "top" : "center" }}
      />
      {dica ? <Text style={{ fontFamily: F.regular, fontSize: 12, color: c.suave }}>{dica}</Text> : null}
    </View>
  );
}

export function Logo({ tipo = "horizontal", negativo, largura = 220 }: { tipo?: "horizontal" | "simbolo"; negativo?: boolean; largura?: number }) {
  const xml = tipo === "simbolo" ? (negativo ? SIMBOLO_NEGATIVO : SIMBOLO) : negativo ? HORIZONTAL_NEGATIVO : HORIZONTAL;
  const prop = tipo === "simbolo" ? 169 / 295 : 0.27;
  return <SvgXml xml={xml} width={largura} height={largura * prop} />;
}

export function Avatar({ nome, foto, tam = 44 }: { nome: string; foto?: string; tam?: number }) {
  if (foto) return <Image source={{ uri: foto }} style={{ width: tam, height: tam, borderRadius: RAIO }} />;
  return (
    <View style={{ width: tam, height: tam, borderRadius: RAIO, backgroundColor: AZUL, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: F.negrito, color: "#fff", fontSize: tam * 0.36 }}>{iniciais(nome)}</Text>
    </View>
  );
}

export function Carregando({ texto }: { texto?: string }) {
  const { c } = useTema();
  return (
    <View style={{ paddingVertical: 60, alignItems: "center", gap: 12 }}>
      <ActivityIndicator color={c.azul} />
      {texto ? <T cor={c.suave} s={13}>{texto}</T> : null}
    </View>
  );
}

export function Aviso({ texto, acao, rotulo = "Tentar de novo" }: { texto: string; acao?: () => void; rotulo?: string }) {
  const { c } = useTema();
  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 24, alignItems: "center", gap: 16 }}>
      <T cor={c.suave} centro>{texto}</T>
      {acao ? <Botao tipo="sec" onPress={acao}>{rotulo}</Botao> : null}
    </View>
  );
}

/** Tela rolável com margem segura, puxar para atualizar e cabeçalho opcional. */
export function Tela({ children, titulo, voltar, direita, atualizar, atualizando, semRolagem, fundo, conteudoStyle }: { children: ReactNode; titulo?: string; voltar?: boolean; direita?: ReactNode; atualizar?: () => void; atualizando?: boolean; semRolagem?: boolean; fundo?: string; conteudoStyle?: StyleProp<ViewStyle> }) {
  const { c } = useTema();
  const ins = useSafeAreaInsets();
  const cab = titulo !== undefined || voltar;
  return (
    <View style={{ flex: 1, backgroundColor: fundo ?? c.fundo }}>
      {cab ? (
        <View style={{ paddingTop: ins.top + 6, paddingBottom: 10, paddingHorizontal: 10, backgroundColor: c.sup, borderBottomWidth: 1, borderBottomColor: c.borda, flexDirection: "row", alignItems: "center", gap: 4 }}>
          {voltar ? (
            <Pressable hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={24} color={c.azul} />
            </Pressable>
          ) : <View style={{ width: 10 }} />}
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.negrito, fontSize: 17, color: c.escuro ? c.texto : AZUL }}>{titulo}</Text>
          {direita}
        </View>
      ) : null}
      {semRolagem ? (
        <View style={[{ flex: 1, paddingTop: cab ? 0 : ins.top }, conteudoStyle]}>{children}</View>
      ) : (
        <ScrollView
          contentContainerStyle={[{ paddingTop: cab ? 18 : ins.top + 14, paddingBottom: 120, paddingHorizontal: 18, gap: 16 }, conteudoStyle]}
          refreshControl={atualizar ? <RefreshControl refreshing={!!atualizando} onRefresh={atualizar} tintColor={c.azul} colors={[AZUL]} /> : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

/** Texto com **negrito** e *itálico* (mesma marcação do boletim). */
export function Marcado({ texto, style, s = 15 }: { texto: string; style?: StyleProp<TextStyle>; s?: number }) {
  const { c } = useTema();
  const partes = texto.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return (
    <Text style={[{ fontFamily: F.regular, fontSize: s, lineHeight: Math.round(s * 1.6), color: c.texto }, style]}>
      {partes.map((p, i) => {
        if (p.startsWith("***") && p.endsWith("***") && p.length > 6) return <Text key={i} style={{ fontFamily: "Montserrat_700Bold_Italic" }}>{p.slice(3, -3)}</Text>;
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <Text key={i} style={{ fontFamily: F.negrito }}>{p.slice(2, -2)}</Text>;
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <Text key={i} style={{ fontFamily: "Montserrat_400Regular_Italic" }}>{p.slice(1, -1)}</Text>;
        return p;
      })}
    </Text>
  );
}

export function Separador() {
  const { c } = useTema();
  return <View style={{ height: 1, backgroundColor: c.borda }} />;
}

/** Linha de menu (ícone, texto, seta). */
export function Linha({ icone, titulo, sub, onPress, direita, perigo }: { icone?: ReactNode; titulo: string; sub?: string; onPress?: () => void; direita?: ReactNode; perigo?: boolean }) {
  const { c } = useTema();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: pressed ? c.realce : "transparent" })}>
      {icone}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.semi, fontSize: 15, color: perigo ? VERMELHO : c.texto }}>{titulo}</Text>
        {sub ? <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: c.suave, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {direita}
    </Pressable>
  );
}
