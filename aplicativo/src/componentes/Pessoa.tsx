/** Foto da pessoa (a que ela escolheu no app) ou as iniciais, em círculo. */
import { Image, Text, View } from "react-native";
import { API, tokenAtual } from "@/lib/api";
import { AZUL, F, useTema } from "@/lib/tema";
import { iniciais } from "@/lib/util";

export function FotoPessoa({ id, nome, foto, tam = 40, borda }: { id?: string; nome: string; foto?: string; tam?: number; borda?: string }) {
  const { c } = useTema();
  const anel = borda ? { borderWidth: 2, borderColor: borda } : null;
  if (id && foto) {
    const t = tokenAtual();
    return <Image source={{ uri: `${API}/api/foto/${id}?v=${foto}`, headers: t ? { Authorization: `Bearer ${t}` } : undefined }} style={[{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: c.realce }, anel]} accessibilityLabel={nome} />;
  }
  return (
    <View style={[{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: AZUL, alignItems: "center", justifyContent: "center" }, anel]}>
      <Text style={{ fontFamily: F.negrito, color: "#fff", fontSize: tam * 0.36 }}>{iniciais(nome)}</Text>
    </View>
  );
}

/** Fileira de rostos sobrepostos (até `max`), com "+N". */
export function Rostos({ pessoas, max = 5, tam = 30 }: { pessoas: { id?: string; nome: string; foto?: string }[]; max?: number; tam?: number }) {
  const { c } = useTema();
  const extra = pessoas.length - max;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {pessoas.slice(0, max).map((p, i) => <View key={`${p.id}${i}`} style={{ marginLeft: i ? -tam * 0.28 : 0 }}><FotoPessoa id={p.id} nome={p.nome} foto={p.foto} tam={tam} borda={c.sup} /></View>)}
      {extra > 0 ? <View style={{ marginLeft: -tam * 0.28, width: tam, height: tam, borderRadius: tam / 2, backgroundColor: c.realce, borderWidth: 2, borderColor: c.sup, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.negrito, fontSize: tam * 0.34, color: c.azul }}>+{extra}</Text></View> : null}
    </View>
  );
}
