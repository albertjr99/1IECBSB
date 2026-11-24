/** Dízimos e ofertas por Pix: QR Code e copia-e-cola com valor; histórico do membro. */
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { CheckCircle2, Copy } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Botao, Cartao, Sobre, T, Tela, Titulo } from "@/componentes/ui";
import { chamar } from "@/lib/api";
import { gravarCache, lerCache } from "@/lib/cache";
import { brCode, normalizarChave } from "@/lib/pix";
import { AZUL, F, useTema } from "@/lib/tema";
import { TIPO_CONTRIBUICAO, type Contribuicao, type TipoContribuicao } from "@/lib/tipos";
import { reais } from "@/lib/util";

type Dados = { pix: { chave: string; tipo: string; favorecido: string }; minhas: Contribuicao[] };

export default function Ofertar() {
  const { c } = useTema();
  const [d, setD] = useState<Dados | null>(null);
  const [tipo, setTipo] = useState<TipoContribuicao>("dizimo");
  const [valor, setValor] = useState("");
  const [gerado, setGerado] = useState<{ codigo: string; txid: string; centavos: number } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [informando, setInformando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const g = await lerCache<Dados>("contribuir"); if (g) setD((x) => x ?? g);
    try { const r = await chamar<Dados>("contribuir"); setD(r); gravarCache("contribuir", r); } catch { /* usa o guardado */ }
    setAtualizando(false);
  }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const centavos = useMemo(() => Math.round(Number(valor.replace(/\./g, "").replace(",", ".")) * 100) || 0, [valor]);
  const mascara = (t: string) => { const n = t.replace(/\D/g, "").replace(/^0+/, ""); if (!n) return ""; const p = n.padStart(3, "0"); return `${Number(p.slice(0, -2)).toLocaleString("pt-BR")},${p.slice(-2)}`; };

  const gerar = () => {
    if (!d?.pix.chave) return;
    if (centavos < 100) return Alert.alert("Ofertar", "Informe um valor a partir de R$ 1,00.");
    const txid = `IECB${tipo.slice(0, 3).toUpperCase()}${Date.now().toString(36).toUpperCase()}`.slice(0, 25);
    const codigo = brCode({ chave: normalizarChave(d.pix.chave, d.pix.tipo), nome: "PRIMEIRA IEC BRASILIA", valorCentavos: centavos, txid, descricao: TIPO_CONTRIBUICAO[tipo] });
    setGerado({ codigo, txid, centavos }); setCopiado(false);
  };
  const copiar = async () => {
    if (!gerado) return;
    await Clipboard.setStringAsync(gerado.codigo);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopiado(true);
  };
  const informar = async () => {
    if (!gerado) return;
    setInformando(true);
    try {
      await chamar("informarContribuicao", { tipo, valor: gerado.centavos, txid: gerado.txid });
      Alert.alert("Obrigado!", "Registramos a sua contribuição. A tesouraria confirma assim que o Pix aparecer no extrato da igreja.");
      setGerado(null); setValor(""); carregar();
    } catch (e) { Alert.alert("Ofertar", e instanceof Error ? e.message : "Erro"); }
    finally { setInformando(false); }
  };

  return (
    <Tela atualizar={() => { setAtualizando(true); carregar(); }} atualizando={atualizando}>
      <View style={{ gap: 6 }}>
        <Sobre>Dízimos e ofertas</Sobre>
        <Titulo s={26}>Contribuir</Titulo>
        <T cor={c.suave} s={14}>“Cada um dê conforme determinou em seu coração, não com tristeza nem por obrigação, pois Deus ama quem dá com alegria.” — 2 Coríntios 9.7</T>
      </View>

      {d && !d.pix.chave ? (
        <Cartao style={{ padding: 18 }}><T cor={c.suave}>A chave Pix da igreja ainda não foi cadastrada. Fale com a tesouraria.</T></Cartao>
      ) : (
        <Cartao filete style={{ padding: 18, gap: 16 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(TIPO_CONTRIBUICAO) as TipoContribuicao[]).map((t) => (
              <Pressable key={t} onPress={() => { setTipo(t); setGerado(null); }} style={{ paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: tipo === t ? AZUL : c.borda, backgroundColor: tipo === t ? AZUL : "transparent" }}>
                <Text style={{ fontFamily: F.semi, fontSize: 13, color: tipo === t ? "#fff" : c.texto }}>{TIPO_CONTRIBUICAO[t]}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: AZUL, paddingBottom: 4 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 22, color: c.suave, marginRight: 8 }}>R$</Text>
            <TextInput value={valor} onChangeText={(t) => { setValor(mascara(t)); setGerado(null); }} keyboardType="number-pad" placeholder="0,00" placeholderTextColor={c.borda} style={{ flex: 1, fontFamily: F.extra, fontSize: 34, color: c.texto, paddingVertical: 4 }} />
          </View>
          {!gerado ? <Botao onPress={gerar} desativado={!d}>Gerar Pix</Botao> : (
            <View style={{ alignItems: "center", gap: 14 }}>
              <View style={{ padding: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: c.borda }}>
                <QRCode value={gerado.codigo} size={210} color="#002A47" backgroundColor="#FFFFFF" ecl="M" />
              </View>
              <T s={13} cor={c.suave} centro>{TIPO_CONTRIBUICAO[tipo]} de {reais(gerado.centavos)} para a Primeira Igreja Evangélica Congregacional de Brasília</T>
              <Botao onPress={copiar} icone={copiado ? <CheckCircle2 size={18} color="#fff" /> : <Copy size={18} color="#fff" />} style={{ alignSelf: "stretch" }}>{copiado ? "Código copiado" : "Copiar Pix copia e cola"}</Botao>
              <T s={12.5} cor={c.suave} centro>Abra o app do seu banco, escolha Pix copia e cola e cole o código. Depois volte aqui.</T>
              <Botao tipo="sec" onPress={informar} carregando={informando} style={{ alignSelf: "stretch" }}>Já fiz o Pix</Botao>
            </View>
          )}
        </Cartao>
      )}

      {d?.minhas.length ? (
        <View style={{ gap: 10 }}>
          <Sobre style={{ marginTop: 8 }}>Minhas contribuições</Sobre>
          <Cartao>
            {d.minhas.slice(0, 20).map((x, i) => (
              <View key={x.id} style={{ flexDirection: "row", alignItems: "center", padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda }}>
                <View style={{ flex: 1 }}>
                  <T f={F.semi} s={14.5}>{TIPO_CONTRIBUICAO[x.tipo]}</T>
                  <T s={12} cor={c.suave}>{new Date(x.em).toLocaleDateString("pt-BR")} · {x.situacao === "confirmada" ? "confirmada" : "aguardando confirmação"}</T>
                </View>
                <T f={F.negrito} s={15} cor={x.situacao === "confirmada" ? c.azul : c.suave}>{reais(x.valor)}</T>
              </View>
            ))}
          </Cartao>
        </View>
      ) : null}
    </Tela>
  );
}
