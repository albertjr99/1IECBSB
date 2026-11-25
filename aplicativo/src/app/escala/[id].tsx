/** Uma escala: minha resposta, a equipe, músicas, roteiro; para a liderança, alertas e ações. */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AlertTriangle, Clock, ExternalLink, History, MapPin, Pencil, Send, Share2, StickyNote, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, Share, Text, View } from "react-native";
import { Aviso, Botao, Cartao, Carregando, Sobre, T, Tela } from "@/componentes/ui";
import { Folha, Rotulo } from "@/componentes/Folha";
import { IconeMinisterio } from "@/componentes/IconeMinisterio";
import { CampoTexto, Selo, falta, horaBR } from "@/componentes/MinhasEscalas";
import { diaDe, duracaoRoteiro, excluirEscala, responderEscala, salvarEscala, textoDaEscala, verEscala, type VerEscala } from "@/lib/escalas";
import { AZUL, F, VERMELHO, useTema } from "@/lib/tema";
import { dataComDia, quando } from "@/lib/util";

export default function Escala() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTema();
  const [d, setD] = useState<VerEscala | null>(null);
  const [erro, setErro] = useState("");
  const [recusa, setRecusa] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [historico, setHistorico] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [agora] = useState(() => Date.now());
  const carregar = useCallback(() => verEscala(id).then((r) => { setD(r); setErro(""); }).catch((e) => setErro(e instanceof Error ? e.message : "Erro")), [id]);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  if (!d) return <Tela voltar titulo="Escala">{erro ? <Aviso texto={erro} acao={carregar} /> : <Carregando />}</Tela>;
  const { escala: e, ministerio: m, lider, alertas } = d;
  const minhas = e.vagas.filter((v) => e.minhas.includes(v.id));
  const passou = new Date(e.inicio).getTime() < agora - 3 * 3600e3;
  const nomes = Object.fromEntries(e.vagas.filter((v) => v.membroId).map((v) => [v.membroId!, v.nome!]));
  const grupos = m.funcoes.map((f) => ({ f, vagas: e.vagas.filter((v) => v.funcaoId === f.id) })).filter((g) => g.vagas.length);

  const responder = async (vagaId: string, resposta: "confirmado" | "recusado" | "pendente", mot?: string) => {
    setOcupado(true);
    try { await responderEscala(e.id, vagaId, resposta, mot); await carregar(); }
    catch (x) { Alert.alert("Escala", x instanceof Error ? x.message : "Erro"); } finally { setOcupado(false); }
  };
  const compartilhar = () => Share.share({ message: textoDaEscala(e, m, nomes, `${dataComDia(diaDe(e.inicio))} às ${horaBR(e.inicio)}`) });
  const publicar = async () => {
    setOcupado(true);
    try {
      await salvarEscala({ id: e.id, ministerioId: m.id, titulo: e.titulo, inicio: e.inicio, local: e.local, observacoes: e.observacoes, vagas: e.vagas.map((v) => ({ id: v.id, funcaoId: v.funcaoId, membroId: v.membroId })), roteiro: e.roteiro, musicas: e.musicas, publicar: true });
      Alert.alert("Escala publicada", "Os escalados foram avisados no celular.");
      await carregar();
    } catch (x) { Alert.alert("Escala", x instanceof Error ? x.message : "Erro"); } finally { setOcupado(false); }
  };
  const apagar = () => Alert.alert(e.situacao === "publicada" ? "Cancelar escala" : "Apagar rascunho", e.situacao === "publicada" ? "Os escalados serão avisados." : "Este rascunho será apagado.", [
    { text: "Voltar", style: "cancel" },
    { text: e.situacao === "publicada" ? "Cancelar escala" : "Apagar", style: "destructive", onPress: async () => { await excluirEscala(e.id).catch(() => {}); router.back(); } },
  ]);

  // horário de início de cada item do roteiro
  const inicios = e.roteiro.reduce<number[]>((l, r, i) => [...l, i ? l[i - 1]! + (e.roteiro[i - 1]!.minutos ?? 0) * 60_000 : new Date(e.inicio).getTime()], []);
  return (
    <Tela voltar titulo={m.nome} direita={<Pressable hitSlop={8} onPress={compartilhar} style={{ padding: 8 }} accessibilityLabel="Compartilhar"><Share2 size={21} color={c.azul} /></Pressable>} atualizar={carregar}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <IconeMinisterio chave={m.icone} size={14} color={c.suave} />
          <T s={10.5} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.6, textTransform: "uppercase" }}>{m.nome}</T>
          {e.situacao === "rascunho" ? <View style={{ backgroundColor: c.realce, paddingHorizontal: 8, paddingVertical: 2 }}><T s={10} f={F.negrito} cor={c.azul} style={{ letterSpacing: 1.2, textTransform: "uppercase" }}>Rascunho</T></View> : null}
        </View>
        <Text style={{ fontFamily: F.negrito, fontSize: 26, lineHeight: 31, color: c.escuro ? c.texto : AZUL }}>{e.titulo}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Clock size={16} color={c.suave} /><T f={F.semi} s={15}>{dataComDia(diaDe(e.inicio))} · {horaBR(e.inicio)}</T><T s={13} f={F.negrito} cor={c.suave}>({falta(e.inicio)})</T></View>
        {e.local ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><MapPin size={16} color={c.suave} /><T s={14} cor={c.suave}>{e.local}</T></View> : null}
      </View>

      {minhas.length && e.situacao === "publicada" ? (
        <Cartao filete style={{ padding: 16, gap: 12 }}>
          <Sobre>Você nesta escala</Sobre>
          {minhas.map((v) => (
            <View key={v.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><T f={F.negrito} s={17}>{v.funcao}</T><Selo r={v.resposta} /></View>
              {!passou ? (v.resposta === "pendente" ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Botao tipo="perigo" style={{ flex: 1, paddingHorizontal: 8 }} onPress={() => { setRecusa(v.id); setMotivo(""); }}>Não poderei</Botao>
                  <Botao style={{ flex: 1, paddingHorizontal: 8 }} carregando={ocupado} onPress={() => responder(v.id, "confirmado")}>Confirmar</Botao>
                </View>
              ) : <Pressable onPress={() => responder(v.id, "pendente")}><T s={12.5} f={F.semi} cor={c.suave} style={{ textDecorationLine: "underline" }}>Mudar a minha resposta</T></Pressable>) : null}
            </View>
          ))}
        </Cartao>
      ) : null}

      {lider ? (
        <View style={{ gap: 8 }}>
          {e.situacao === "rascunho" ? <T s={13.5} cor={c.suave}>Só a liderança vê este rascunho. Ao publicar, cada escalado recebe a notificação para confirmar.</T> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Botao tipo="sec" style={{ flex: 1, paddingHorizontal: 8 }} icone={<Pencil size={16} color={c.escuro ? c.texto : AZUL} />} onPress={() => router.push({ pathname: "/escala/editar", params: { id: e.id, min: m.id } })}>Editar</Botao>
            {e.situacao === "rascunho"
              ? <Botao style={{ flex: 1, paddingHorizontal: 8 }} desativado={!e.preenchidas} carregando={ocupado} icone={<Send size={16} color="#fff" />} onPress={publicar}>Publicar</Botao>
              : <Botao style={{ flex: 1, paddingHorizontal: 8 }} icone={<Share2 size={16} color="#fff" />} onPress={compartilhar}>Enviar</Botao>}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}><Sobre>Equipe</Sobre><T s={12.5} f={F.semi} cor={c.suave}>{e.confirmados} de {e.preenchidas} confirmados</T></View>
        <Cartao style={{ padding: 0 }}>
          {grupos.map(({ f, vagas }, gi) => (
            <View key={f.id} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: gi ? 1 : 0, borderTopColor: c.borda, gap: 6 }}>
              <T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>{f.nome}</T>
              {vagas.map((v) => (
                <View key={v.id} style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: v.membroId ? F.semi : "Montserrat_400Regular_Italic", fontSize: 15, color: !v.membroId ? c.suave : e.minhas.includes(v.id) ? c.azul : c.texto }}>{v.nome ?? "A definir"}</Text>
                    {v.membroId && e.situacao === "publicada" ? <Selo r={v.resposta} pequeno /> : null}
                  </View>
                  {lider && v.motivo ? <T s={12.5} cor={VERMELHO}>“{v.motivo}”</T> : null}
                  {lider ? (alertas[v.id] ?? []).map((a) => <View key={a} style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}><AlertTriangle size={13} color={VERMELHO} style={{ marginTop: 2 }} /><T s={12.5} f={F.semi} cor={VERMELHO} style={{ flex: 1 }}>{a}</T></View>) : null}
                </View>
              ))}
            </View>
          ))}
        </Cartao>
      </View>

      {e.musicas.length ? (
        <View style={{ gap: 8 }}>
          <Sobre>Músicas</Sobre>
          <Cartao style={{ padding: 0 }}>
            {e.musicas.map((mu, i) => (
              <View key={mu.id} style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda, alignItems: "flex-start" }}>
                <T s={13} f={F.negrito} cor={c.suave} style={{ width: 18, paddingTop: 1 }}>{i + 1}</T>
                <View style={{ flex: 1, gap: 2 }}>
                  {mu.hino ? <Pressable onPress={() => router.push(`/hino/${mu.hino}`)}><T f={F.semi} s={15} cor={c.azul}>{mu.hino} · {mu.titulo}</T></Pressable> : <T f={F.semi} s={15}>{mu.titulo}</T>}
                  {mu.artista || mu.obs ? <T s={12.5} cor={c.suave}>{[mu.artista, mu.obs].filter(Boolean).join(" · ")}</T> : null}
                  {mu.link ? <Pressable onPress={() => Linking.openURL(mu.link!)} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}><ExternalLink size={13} color={c.azul} /><T s={12.5} f={F.semi} cor={c.azul}>Ouvir / cifra</T></Pressable> : null}
                </View>
                {mu.tom ? <View style={{ borderWidth: 1, borderColor: c.borda, paddingHorizontal: 8, paddingVertical: 2 }}><T s={13} f={F.negrito}>{mu.tom}</T></View> : null}
              </View>
            ))}
          </Cartao>
        </View>
      ) : null}

      {e.roteiro.length ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}><Sobre>Roteiro</Sobre>{duracaoRoteiro(e.roteiro) ? <T s={12.5} f={F.semi} cor={c.suave}>{duracaoRoteiro(e.roteiro)} min</T> : null}</View>
          <Cartao style={{ padding: 0 }}>
            {e.roteiro.map((r, i) => {
              const ini = inicios[i]!;
              return (
                <View key={r.id || i} style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda }}>
                  <T s={12.5} f={F.negrito} cor={c.suave} style={{ width: 46 }}>{horaBR(new Date(ini).toISOString())}</T>
                  <View style={{ flex: 1 }}><T f={F.semi} s={14.5}>{r.item}</T>{r.obs ? <T s={12.5} cor={c.suave}>{r.obs}</T> : null}</View>
                  {r.minutos ? <T s={12.5} cor={c.suave}>{r.minutos} min</T> : null}
                </View>
              );
            })}
          </Cartao>
        </View>
      ) : null}

      {e.observacoes ? <Cartao style={{ padding: 16, flexDirection: "row", gap: 10 }}><StickyNote size={17} color={c.suave} /><T s={14.5} style={{ flex: 1 }}>{e.observacoes}</T></Cartao> : null}

      {lider ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.borda, paddingTop: 14 }}>
          {e.historico ? <Pressable onPress={() => setHistorico(true)} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><History size={15} color={c.suave} /><T s={12.5} f={F.semi} cor={c.suave}>Histórico</T></Pressable> : <View />}
          <Pressable onPress={apagar} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><Trash2 size={15} color={VERMELHO} /><T s={12.5} f={F.semi} cor={VERMELHO}>{e.situacao === "publicada" ? "Cancelar escala" : "Apagar rascunho"}</T></Pressable>
        </View>
      ) : null}

      <Folha aberta={!!recusa} titulo="Não poderei servir" aoFechar={() => setRecusa(null)}>
        <T s={14} cor={c.suave}>A liderança é avisada para achar alguém no seu lugar.</T>
        <View style={{ gap: 6 }}><Rotulo>Motivo (opcional, só a liderança vê)</Rotulo><CampoTexto value={motivo} onChangeText={setMotivo} multiline maxLength={300} /></View>
        <Botao tipo="perigo" carregando={ocupado} onPress={async () => { await responder(recusa!, "recusado", motivo); setRecusa(null); }}>Avisar a liderança</Botao>
      </Folha>
      <Folha aberta={historico} titulo="Histórico da escala" aoFechar={() => setHistorico(false)}>
        {[...(e.historico ?? [])].reverse().map((h, i) => <View key={i}><T s={14}><T s={14} f={F.semi}>{h.quem}</T> · {h.o}</T><T s={12} cor={c.suave}>{quando(h.em)}</T></View>)}
      </Folha>
    </Tela>
  );
}
