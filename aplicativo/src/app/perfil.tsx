/** Dados do membro, foto e troca de senha. */
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { Camera } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Avatar, Botao, Campo, Cartao, Sobre, T, Tela } from "@/componentes/ui";
import { chamar } from "@/lib/api";
import { useMembro } from "@/lib/sessao";
import { AZUL, useTema } from "@/lib/tema";
import { mascaraCelular } from "@/lib/util";

export default function Perfil() {
  const { senha: focoSenha } = useLocalSearchParams<{ senha?: string }>();
  const { membro, salvarPerfil } = useMembro();
  const { c } = useTema();
  const [celular, setCelular] = useState(membro.celular);
  const [email, setEmail] = useState(membro.email);
  const [nasc, setNasc] = useState(membro.nascimento ? membro.nascimento.split("-").reverse().join("/") : "");
  const [salvando, setSalvando] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [trocando, setTrocando] = useState(false);

  const foto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (r.canceled || !r.assets[0]) return;
    const m = await ImageManipulator.manipulateAsync(r.assets[0].uri, [{ resize: { width: 320, height: 320 } }], { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    try { await salvarPerfil({ foto: `data:image/jpeg;base64,${m.base64}` }); }
    catch (e) { Alert.alert("Foto", e instanceof Error ? e.message : "Não foi possível salvar."); }
  };
  const salvar = async () => {
    setSalvando(true);
    try {
      const [d, mm, a] = nasc.split("/");
      await salvarPerfil({ celular, email, nascimento: d && mm && a?.length === 4 ? `${a}-${mm}-${d}` : membro.nascimento });
      Alert.alert("Pronto", "Seus dados foram atualizados.");
    } catch (e) { Alert.alert("Dados", e instanceof Error ? e.message : "Erro"); }
    finally { setSalvando(false); }
  };
  const trocar = async () => {
    setTrocando(true);
    try { await chamar("senha", { atual, nova }); setAtual(""); setNova(""); Alert.alert("Senha", "Senha alterada."); }
    catch (e) { Alert.alert("Senha", e instanceof Error ? e.message : "Erro"); }
    finally { setTrocando(false); }
  };

  return (
    <Tela voltar titulo={focoSenha ? "Trocar senha" : "Meus dados"}>
      {!focoSenha ? (
        <>
          <View style={{ alignItems: "center", gap: 10 }}>
            <Pressable onPress={foto}>
              <Avatar nome={membro.nome} foto={membro.foto} tam={110} />
              <View style={{ position: "absolute", right: -6, bottom: -6, width: 36, height: 36, backgroundColor: AZUL, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: c.fundo }}><Camera size={16} color="#fff" /></View>
            </Pressable>
            <T s={18} f="Montserrat_700Bold" centro>{membro.nome}</T>
            {membro.foto ? <Pressable onPress={() => salvarPerfil({ foto: null as unknown as string }).catch(() => {})}><T s={12.5} cor={c.suave} style={{ textDecorationLine: "underline" }}>Remover foto</T></Pressable> : null}
          </View>
          <Cartao style={{ padding: 16, gap: 14 }}>
            <Campo rotulo="Celular" value={celular} onChangeText={(t) => setCelular(mascaraCelular(t))} keyboardType="phone-pad" />
            <Campo rotulo="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Campo rotulo="Data de nascimento" value={nasc} onChangeText={(t) => { const d = t.replace(/\D/g, "").slice(0, 8); setNasc([d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/")); }} keyboardType="number-pad" placeholder="dd/mm/aaaa" />
            <Botao onPress={salvar} carregando={salvando}>Salvar</Botao>
          </Cartao>
          <T s={12.5} cor={c.suave}>Para corrigir o nome, fale com a secretaria.</T>
        </>
      ) : null}
      <Sobre style={{ marginTop: 6 }}>Senha</Sobre>
      <Cartao style={{ padding: 16, gap: 14 }}>
        <Campo rotulo="Senha atual" value={atual} onChangeText={setAtual} secureTextEntry autoComplete="current-password" />
        <Campo rotulo="Nova senha" value={nova} onChangeText={setNova} secureTextEntry autoComplete="new-password" dica="Ao menos 8 caracteres." />
        <Botao tipo="sec" onPress={trocar} carregando={trocando} desativado={!atual || nova.length < 8}>Trocar senha</Botao>
      </Cartao>
    </Tela>
  );
}
