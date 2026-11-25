/** Folha que sobe de baixo, para formulários e escolhas rápidas. */
import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { F, useTema } from "@/lib/tema";
import { T } from "./ui";

export function Folha({ aberta, titulo, aoFechar, children }: { aberta: boolean; titulo: string; aoFechar: () => void; children: ReactNode }) {
  const { c } = useTema();
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={aberta} animationType="slide" transparent onRequestClose={aoFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable onPress={aoFechar} style={[StyleSheet.absoluteFill, { backgroundColor: "#00142280" }]} />
        <View style={{ maxHeight: "88%", backgroundColor: c.sup, borderTopWidth: 3, borderTopColor: "#00436F", paddingBottom: ins.bottom + 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borda }}>
            <T f={F.negrito} s={16} linhas={1} style={{ flex: 1 }}>{titulo}</T>
            <Pressable hitSlop={10} onPress={aoFechar} accessibilityLabel="Fechar"><X size={22} color={c.suave} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 14 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Rótulo pequeno em caixa alta. */
export function Rotulo({ children }: { children: ReactNode }) {
  const { c } = useTema();
  return <T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.5, textTransform: "uppercase" }}>{children}</T>;
}
