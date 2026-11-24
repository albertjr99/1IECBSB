/** Perfil, preferências, favoritos, boletins, a igreja e a conta. */
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Bookmark, Church, FileText, KeyRound, LogOut, Moon, Shield, Sun, SunMoon, Trash2, Type, UserRound } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";
import Constants from "expo-constants";
import { Avatar, Cartao, Linha, Logo, Separador, Sobre, T, Tela, Titulo } from "@/componentes/ui";
import { API } from "@/lib/api";
import { useMembro } from "@/lib/sessao";
import { AZUL, F, useTema } from "@/lib/tema";
import type { Preferencias } from "@/lib/tipos";

export default function Mais() {
  const { membro, salvarPerfil, sair } = useMembro();
  const { c } = useTema();
  const ic = (I: typeof UserRound) => <I size={20} color={c.azul} />;
  const prefs = (p: Partial<Preferencias>) => salvarPerfil({ prefs: { ...membro.prefs, ...p } }).catch(() => {});

  return (
    <Tela>
      <Pressable onPress={() => router.push("/perfil")} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar nome={membro.nome} foto={membro.foto} tam={62} />
        <View style={{ flex: 1 }}>
          <Titulo s={20}>{membro.nome}</Titulo>
          <T s={13} cor={c.suave}>{membro.celular}</T>
        </View>
      </Pressable>

      <Cartao>
        <Linha icone={ic(UserRound)} titulo="Meus dados e foto" onPress={() => router.push("/perfil")} />
        <Separador />
        <Linha icone={ic(Bookmark)} titulo="Versículos guardados" sub={`${membro.favoritos.versos.length} versículo(s)`} onPress={() => router.push("/favoritos")} />
        <Separador />
        <Linha icone={ic(FileText)} titulo="Boletins" sub="Os boletins dominicais" onPress={() => router.push("/boletins")} />
        <Separador />
        <Linha icone={ic(Church)} titulo="A igreja" sub="Programação, eventos e contatos" onPress={() => router.push("/igreja")} />
      </Cartao>

      <Sobre style={{ marginTop: 6 }}>Aparência</Sobre>
      <Cartao style={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", borderWidth: 1, borderColor: c.borda }}>
          {([["claro", "Claro", Sun], ["escuro", "Escuro", Moon], ["sistema", "Automático", SunMoon]] as const).map(([v, r, I]) => {
            const a = membro.prefs.tema === v;
            return (
              <Pressable key={v} onPress={() => prefs({ tema: v })} style={{ flex: 1, paddingVertical: 12, alignItems: "center", gap: 4, backgroundColor: a ? AZUL : "transparent" }}>
                <I size={18} color={a ? "#fff" : c.suave} />
                <Text style={{ fontFamily: F.semi, fontSize: 12, color: a ? "#fff" : c.suave }}>{r}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Type size={20} color={c.azul} />
          <T f={F.semi} linhas={1} style={{ flex: 1 }}>Letra</T>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => prefs({ letra: n })} style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: membro.prefs.letra === n ? AZUL : c.borda, backgroundColor: membro.prefs.letra === n ? AZUL : "transparent" }}>
              <Text style={{ fontFamily: F.negrito, fontSize: 9 + n * 2, color: membro.prefs.letra === n ? "#fff" : c.texto }}>A</Text>
            </Pressable>
          ))}
        </View>
      </Cartao>

      <Sobre style={{ marginTop: 6 }}>Conta</Sobre>
      <Cartao>
        <Linha icone={ic(KeyRound)} titulo="Trocar senha" onPress={() => router.push("/perfil?senha=1")} />
        <Separador />
        <Linha icone={ic(Shield)} titulo="Privacidade" onPress={() => WebBrowser.openBrowserAsync(`${API}/privacidade`, { toolbarColor: AZUL })} />
        <Separador />
        <Linha icone={ic(LogOut)} titulo="Sair" onPress={() => Alert.alert("Sair", "Deseja sair do aplicativo?", [{ text: "Cancelar", style: "cancel" }, { text: "Sair", style: "destructive", onPress: () => sair() }])} />
        <Separador />
        <Linha icone={<Trash2 size={20} color="#CC2127" />} titulo="Excluir minha conta" perigo onPress={() => router.push("/excluir-conta")} />
      </Cartao>

      <View style={{ alignItems: "center", gap: 10, marginTop: 18 }}>
        <Logo tipo="simbolo" largura={70} negativo={c.escuro} />
        <T s={11.5} cor={c.suave} centro>Primeira Igreja Evangélica Congregacional de Brasília{"\n"}Versão {Constants.expoConfig?.version ?? "1.0.0"} · Produzido por GRATIA</T>
      </View>
    </Tela>
  );
}
