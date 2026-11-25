/** A igreja: programação semanal, eventos e contatos. */
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { AtSign, Clock, Mail, MapPin, Phone, PlayCircle, ThumbsUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Aviso, Cartao, Carregando, Linha, Separador, Sobre, T, Tela, Titulo } from "@/componentes/ui";
import { chamar } from "@/lib/api";
import { gravarCache, lerCache } from "@/lib/cache";
import { AZUL, F, useTema } from "@/lib/tema";
import type { Igreja } from "@/lib/tipos";
import { diaEMes, emBrasilia, soDigitos } from "@/lib/util";

export default function TelaIgreja() {
  const { aba: inicial } = useLocalSearchParams<{ aba?: string }>();
  const { c } = useTema();
  const [d, setD] = useState<Igreja | null>(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<"programacao" | "eventos" | "contato">(inicial === "contato" ? "contato" : "programacao");
  useEffect(() => {
    lerCache<Igreja>("igreja").then((g) => g && setD((x) => x ?? g));
    chamar<Igreja>("igreja").then((r) => { setD(r); gravarCache("igreja", r); }).catch((e) => setErro(e.message));
  }, []);
  const hoje = emBrasilia().semana;
  const abrir = (u: string) => WebBrowser.openBrowserAsync(u, { toolbarColor: AZUL }).catch(() => Linking.openURL(u));
  const ic = (I: typeof Phone) => <I size={20} color={c.azul} />;

  return (
    <Tela voltar titulo="A igreja">
      <View style={{ flexDirection: "row", borderWidth: 1, borderColor: c.borda, backgroundColor: c.sup }}>
        {([["programacao", "Programação"], ["eventos", "Eventos"], ["contato", "Contato"]] as const).map(([k, r]) => (
          <Pressable key={k} onPress={() => setAba(k)} style={{ flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: aba === k ? AZUL : "transparent" }}>
            <Text style={{ fontFamily: F.negrito, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: aba === k ? "#fff" : c.suave }}>{r}</Text>
          </Pressable>
        ))}
      </View>
      {!d ? (erro ? <Aviso texto={erro} /> : <Carregando />) : aba === "programacao" ? (
        <>
          {d.programacao.aviso ? <T s={13.5} cor={c.suave}>{d.programacao.aviso}</T> : null}
          {d.programacao.dias.map((dia) => (
            <Cartao key={dia.id} filete={dia.diaSemana === hoje} style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Titulo s={18}>{dia.dia}</Titulo>
                {dia.diaSemana === hoje ? <Text style={{ fontFamily: F.negrito, fontSize: 10, letterSpacing: 1.6, color: "#fff", backgroundColor: AZUL, paddingHorizontal: 8, paddingVertical: 4 }}>HOJE</Text> : null}
              </View>
              {dia.itens.map((it) => (
                <View key={it.id} style={{ flexDirection: "row", gap: 12 }}>
                  <Text style={{ width: 58, fontFamily: F.negrito, fontSize: 14, color: c.azul }}>{it.horario}</Text>
                  <View style={{ flex: 1 }}><T f={F.semi} s={14.5}>{it.titulo}</T>{it.detalhe ? <T s={12.5} cor={c.suave}>{it.detalhe}</T> : null}</View>
                </View>
              ))}
              {dia.observacao ? <T s={12.5} cor={c.suave}>{dia.observacao}</T> : null}
            </Cartao>
          ))}
        </>
      ) : aba === "eventos" ? (
        d.eventos.length ? d.eventos.map((e) => (
          <Cartao key={e.id} style={{ padding: 16, gap: 6 }}>
            <Sobre>{diaEMes(e.data)}{e.dataFim && e.dataFim !== e.data ? ` a ${diaEMes(e.dataFim)}` : ""}</Sobre>
            <T f={F.negrito} s={17}>{e.titulo}</T>
            {e.horario || e.local ? <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><Clock size={14} color={c.suave} /><T s={13} cor={c.suave}>{[e.horario, e.local].filter(Boolean).join(" · ")}</T></View> : null}
            {e.descricao ? <T s={14}>{e.descricao}</T> : null}
          </Cartao>
        )) : <Aviso texto="Nenhum evento programado." />
      ) : (
        <>
          <Cartao>
            {d.geral.whatsapp ? <><Linha icone={ic(Phone)} titulo="WhatsApp da secretaria" sub={d.geral.whatsapp} onPress={() => Linking.openURL(`https://wa.me/55${soDigitos(d.geral.whatsapp).replace(/^55/, "")}`)} /><Separador /></> : null}
            {d.geral.telefone ? <><Linha icone={ic(Phone)} titulo="Telefone" sub={d.geral.telefone} onPress={() => Linking.openURL(`tel:${soDigitos(d.geral.telefone)}`)} /><Separador /></> : null}
            {d.geral.email ? <><Linha icone={ic(Mail)} titulo="E-mail" sub={d.geral.email} onPress={() => Linking.openURL(`mailto:${d.geral.email}`)} /><Separador /></> : null}
            <Linha icone={ic(MapPin)} titulo="Como chegar" sub={[d.geral.endereco.linha1, d.geral.endereco.linha2].filter(Boolean).join(" — ")} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.geral.endereco.consultaMapa || d.geral.endereco.linha1)}`)} />
          </Cartao>
          {d.geral.horarioAtendimento ? <T s={13} cor={c.suave}>Atendimento: {d.geral.horarioAtendimento}</T> : null}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {([["instagram", AtSign], ["youtube", PlayCircle], ["facebook", ThumbsUp]] as const).filter(([k]) => d.geral.redes[k]).map(([k, I]) => (
              <Cartao key={k} onPress={() => abrir(d.geral.redes[k])} style={{ flex: 1, paddingVertical: 16, alignItems: "center", gap: 6 }}>
                <I size={22} color={c.azul} /><T s={12} f={F.semi} style={{ textTransform: "capitalize" }}>{k}</T>
              </Cartao>
            ))}
          </View>
        </>
      )}
    </Tela>
  );
}
