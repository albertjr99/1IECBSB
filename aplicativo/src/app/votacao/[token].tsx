/** Cédula de votação dentro do app: o membro vota uma única vez. */
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { CheckCircle2, Lock } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Aviso, Botao, Cartao, Carregando, Sobre, T, Tela, Titulo } from "@/componentes/ui";
import { chamar } from "@/lib/api";
import { AZUL, F, useTema } from "@/lib/tema";
import type { Cedula } from "@/lib/tipos";
import { quando } from "@/lib/util";

const SIGILO = { secreta: "Voto secreto: ninguém, nem a presidência, vê o seu voto.", presidencia: "A presidência pode ver os votos; os demais membros não.", aberta: "Votação aberta: os votos são públicos." };

export default function TelaVotacao() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { c } = useTema();
  const [v, setV] = useState<Cedula | null>(null);
  const [erro, setErro] = useState("");
  const [escolha, setEscolha] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);
  const [comprovante, setComprovante] = useState("");

  const carregar = useCallback(() => chamar<Cedula>("cedula", { token }).then(setV).catch((e) => setErro(e.message)), [token]);
  useEffect(() => { carregar(); }, [carregar]);

  const confirmar = () => {
    if (!v?.encontrada || !escolha) return;
    const texto = v.opcoes.find((o) => o.id === escolha)?.texto;
    Alert.alert("Confirmar voto", `Seu voto: “${texto}”.\nDepois de confirmado, não é possível mudar.`, [
      { text: "Voltar", style: "cancel" },
      { text: "Confirmar", onPress: async () => {
        setIndo(true);
        try {
          const r = await chamar<{ ok: true; comprovante: string } | { ok: false; erro: string }>("votar", { token, opcao: escolha });
          if (!r.ok) throw new Error(r.erro);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setComprovante(r.comprovante); carregar();
        } catch (e) { Alert.alert("Votação", e instanceof Error ? e.message : "Erro"); }
        finally { setIndo(false); }
      } },
    ]);
  };

  return (
    <Tela voltar titulo="Votação">
      {!v ? (erro ? <Aviso texto={erro} /> : <Carregando />) : !v.encontrada ? <Aviso texto="Votação não encontrada." /> : (
        <>
          <View style={{ gap: 8 }}>
            <Sobre>{v.situacao === "em_andamento" ? "Votação aberta" : v.situacao === "agendada" ? "Ainda não começou" : "Encerrada"}</Sobre>
            <Titulo>{v.titulo}</Titulo>
            {v.descricao ? <T cor={c.suave}>{v.descricao}</T> : null}
            <T s={13} cor={c.suave}>{v.situacao === "agendada" ? `Começa ${quando(v.inicio)}` : `Até ${quando(v.fim)}`}</T>
          </View>

          {comprovante || v.jaVotou ? (
            <Cartao filete style={{ padding: 20, gap: 10, alignItems: "center" }}>
              <CheckCircle2 size={40} color={c.azul} />
              <T f={F.negrito} s={18} centro>Seu voto foi registrado</T>
              {comprovante ? <T s={13} cor={c.suave} centro>Comprovante: {comprovante}</T> : <T s={13} cor={c.suave} centro>Obrigado por participar.</T>}
            </Cartao>
          ) : v.situacao === "em_andamento" ? (
            <>
              <View style={{ gap: 10 }}>
                {v.opcoes.map((o) => {
                  const a = escolha === o.id;
                  return (
                    <Pressable key={o.id} onPress={() => { Haptics.selectionAsync().catch(() => {}); setEscolha(o.id); }} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderWidth: a ? 2 : 1, borderColor: a ? AZUL : c.borda, backgroundColor: a ? c.realce : c.sup }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: a ? AZUL : c.suave, alignItems: "center", justifyContent: "center" }}>{a ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: AZUL }} /> : null}</View>
                      <Text style={{ flex: 1, fontFamily: a ? F.negrito : F.semi, fontSize: 16.5, color: c.texto }}>{o.texto}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Botao onPress={confirmar} desativado={!escolha} carregando={indo}>Confirmar voto</Botao>
            </>
          ) : null}

          {v.resultado ? (
            <Cartao style={{ padding: 18, gap: 12 }}>
              <Sobre>Resultado</Sobre>
              {v.resultado.contagem.map((o) => {
                const pct = v.resultado!.votaram ? Math.round((o.votos / v.resultado!.votaram) * 100) : 0;
                return (
                  <View key={o.id} style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T f={F.semi}>{o.texto}</T><T f={F.negrito} cor={c.azul}>{o.votos} · {pct}%</T></View>
                    <View style={{ height: 8, backgroundColor: c.realce }}><View style={{ height: 8, width: `${pct}%`, backgroundColor: AZUL }} /></View>
                  </View>
                );
              })}
              <T s={12.5} cor={c.suave}>{v.resultado.votaram} de {v.resultado.totalEleitores} votaram{v.resultado.quorumAtingido ? "" : " · quórum não atingido"}</T>
            </Cartao>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Lock size={15} color={c.suave} style={{ marginTop: 2 }} />
            <T s={12.5} cor={c.suave} style={{ flex: 1 }}>{SIGILO[v.sigilo]}</T>
          </View>
        </>
      )}
    </Tela>
  );
}
