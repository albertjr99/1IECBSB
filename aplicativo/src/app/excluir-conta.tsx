/** Exclusão da conta pelo próprio membro (exigência da App Store e do Google Play). */
import { useState } from "react";
import { Alert } from "react-native";
import { Botao, Campo, Cartao, T, Tela, Titulo } from "@/componentes/ui";
import { chamar, definirToken } from "@/lib/api";
import { limparCache } from "@/lib/cache";
import { useMembro } from "@/lib/sessao";
import { useTema } from "@/lib/tema";

export default function ExcluirConta() {
  const { sair } = useMembro();
  const { c } = useTema();
  const [senha, setSenha] = useState("");
  const [indo, setIndo] = useState(false);
  const excluir = () => Alert.alert("Excluir conta", "Seus dados de acesso, preferências e favoritos serão apagados. Esta ação não pode ser desfeita.", [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: async () => {
      setIndo(true);
      try { await chamar("excluirConta", { senha }); await definirToken(null); await limparCache(); await sair(); }
      catch (e) { Alert.alert("Excluir conta", e instanceof Error ? e.message : "Erro"); }
      finally { setIndo(false); }
    } },
  ]);
  return (
    <Tela voltar titulo="Excluir minha conta">
      <Titulo s={20}>Tem certeza?</Titulo>
      <T cor={c.suave}>Ao excluir, apagamos o seu acesso ao aplicativo: nome, contatos, foto, preferências, versículos e hinos guardados. Os registros de contribuições informadas ficam com a tesouraria da igreja, como exige a contabilidade. Você pode pedir um novo acesso quando quiser.</T>
      <Cartao style={{ padding: 16, gap: 14 }}>
        <Campo rotulo="Confirme com a sua senha" value={senha} onChangeText={setSenha} secureTextEntry />
        <Botao tipo="perigo" onPress={excluir} carregando={indo} desativado={!senha}>Excluir minha conta</Botao>
      </Cartao>
    </Tela>
  );
}
