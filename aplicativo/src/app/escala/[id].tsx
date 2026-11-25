/** Uma escala: a sua parte, a equipe, músicas e roteiro. Limpo, do mais importante para o resto. */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AlertTriangle, ChevronDown, ChevronRight, Guitar, Headphones, History, MapPin, Pencil, Send, Share2, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, Share, Text, View } from "react-native";
import { Aviso, Botao, Cartao, Carregando, Sobre, T, Tela } from "@/componentes/ui";
import { Folha, Rotulo } from "@/componentes/Folha";
import { CampoTexto, falta, horaBR } from "@/componentes/MinhasEscalas";
import { DataBloco, LinhaPessoa, StatusIcone, textoStatus } from "@/componentes/EscalaUI";
import { diaDe, duracaoRoteiro, excluirEscala, responderEscala, salvarEscala, textoDaEscala, verEscala, type VerEscala } from "@/lib/escalas";
import { AZUL, F, VERMELHO, useTema } from "@/lib/tema";
import { dataComDia, nomeCurto, quando } from "@/lib/util";

function Acao({ onPress, rotulo, children }: { onPress: () => void; rotulo: string; children: React.ReactNode }) {
  return <Pressable hitSlop={6} onPress={onPress} accessibilityLabel={rotulo} style={({ pressed }) => ({ width: 42, height: 42, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>{children}</Pressable>;
}

export default function Escala() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTema();
  const [d, setD] = useState<VerEscala | null>(null);
  const [erro, setErro] = useState("");
  const [recusa, setRecusa] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [historico, setHistorico] = useState(false);
  const [verAlertas, setVerAlertas] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [agora] = useState(() => Date.now());
  const carregar = useCallback(() => verEscala(id).then((r) => { setD(r); setErro(""); }).catch((e) => setErro(e instanceof Error ? e.message : "Erro")), [id]);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  if (!d) return <Tela voltar titulo="Escala">{erro ? <Aviso texto={erro} acao={carregar} /> : <Carregando />}</Tela>;
  const { escala: e, ministerio: m, lider, alertas } = d;
  const minhas = e.vagas.filter((v) => e.minhas.includes(v.id));
  const passou = new Date(e.inicio).getTime() < agora - 3 * 3600e3;
  const nomes = Object.fromEntries(e.vagas.filter((v) => v.membroId).map((v) => [v.membroId!, nomeCurto(v.nome ?? "")]));
  const ordem = new Map(m.funcoes.map((f, i) => [f.id, i]));
  const equipe = [...e.vagas].sort((a, b) => (ordem.get(a.funcaoId) ?? 99) - (ordem.get(b.funcaoId) ?? 99));
  const comAlerta = lider ? equipe.filter((v) => alertas[v.id]?.length) : [];
  const inicios = e.roteiro.reduce<number[]>((l, r, i) => [...l, i ? l[i - 1]! + (e.roteiro[i - 1]!.minutos ?? 0) * 60_000 : new Date(e.inicio).getTime()], []);
  const pct = e.preenchidas ? e.confirmados / e.preenchidas : 0;

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
      Alert.alert("Escala publicada", "Cada pessoa recebeu um aviso no celular para confirmar.");
      await carregar();
    } catch (x) { Alert.alert("Escala", x instanceof Error ? x.message : "Erro"); } finally { setOcupado(false); }
  };
  const apagar = () => Alert.alert(e.situacao === "publicada" ? "Cancelar escala" : "Apagar rascunho", e.situacao === "publicada" ? "Os escalados serão avisados." : "Este rascunho será apagado.", [
    { text: "Voltar", style: "cancel" },
    { text: e.situacao === "publicada" ? "Cancelar escala" : "Apagar", style: "destructive", onPress: async () => { await excluirEscala(e.id).catch(() => {}); router.back(); } },
  ]);

  return (
    <Tela voltar titulo={m.nome} atualizar={carregar} direita={
      <View style={{ flexDirection: "row" }}>
        {lider ? <Acao rotulo="Editar" onPress={() => router.push({ pathname: "/escala/editar", params: { id: e.id, min: m.id } })}><Pencil size={20} color={c.azul} /></Acao> : null}
        <Acao rotulo="Compartilhar" onPress={compartilhar}><Share2 size={20} color={c.azul} /></Acao>
      </View>
    }>
      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
        <DataBloco iso={e.inicio} tam={66} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: F.negrito, fontSize: 23, lineHeight: 28, letterSpacing: -0.3, color: c.escuro ? c.texto : AZUL }}>{e.titulo}</Text>
          <T s={14.5} cor={c.suave}>{horaBR(e.inicio)} · {falta(e.inicio)}</T>
          {e.local ? <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><MapPin size={13} color={c.suave} /><T s={13.5} cor={c.suave}>{e.local}</T></View> : null}
        </View>
      </View>

      {d.repetidas?.length ? (
        <Pressable onPress={() => router.push(`/escala/${d.repetidas![0]!.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.sup, borderLeftWidth: 3, borderLeftColor: VERMELHO, padding: 14 }}>
          <AlertTriangle size={18} color={VERMELHO} />
          <View style={{ flex: 1 }}>
            <T s={14} f={F.semi}>Há outra escala do {m.nome} neste horário</T>
            <T s={13} cor={c.suave}>“{d.repetidas[0]!.titulo}” ({d.repetidas[0]!.situacao}). Se for repetida, apague uma delas.</T>
          </View>
          <ChevronRight size={18} color={c.suave} />
        </Pressable>
      ) : null}

      {e.situacao === "rascunho" ? (
        <View style={{ backgroundColor: c.realce, padding: 16, gap: 12 }}>
          <T s={14} cor={c.texto}><T s={14} f={F.negrito}>Rascunho.</T> Só a liderança vê. Ao publicar, cada pessoa recebe um aviso para confirmar.</T>
          {lider ? <Botao carregando={ocupado} desativado={!e.preenchidas} icone={<Send size={16} color="#fff" />} onPress={publicar}>Publicar e avisar</Botao> : null}
        </View>
      ) : null}

      {minhas.length && e.situacao === "publicada" ? (
        <Cartao filete style={{ padding: 18, gap: 14 }}>
          {minhas.map((v) => (
            <View key={v.id} style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <T s={12.5} cor={c.suave}>Você vai servir como</T>
                  <T s={19} f={F.negrito}>{v.funcao}</T>
                </View>
                <StatusIcone r={v.resposta} tam={28} />
              </View>
              {!passou ? (v.resposta === "pendente" ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Botao tipo="sec" style={{ flex: 1, paddingHorizontal: 6 }} onPress={() => { setRecusa(v.id); setMotivo(""); }}>Não posso</Botao>
                  <Botao style={{ flex: 1.4, paddingHorizontal: 6 }} carregando={ocupado} onPress={() => responder(v.id, "confirmado")}>Confirmar</Botao>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <T s={14} f={F.semi} cor={v.resposta === "recusado" ? VERMELHO : c.azul}>{textoStatus(v.resposta, true)}</T>
                  <Pressable hitSlop={8} onPress={() => responder(v.id, "pendente")}><T s={13} cor={c.suave} style={{ textDecorationLine: "underline" }}>Mudar</T></Pressable>
                </View>
              )) : null}
            </View>
          ))}
        </Cartao>
      ) : null}

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Sobre>Equipe</Sobre>
          <T s={13} f={F.semi} cor={c.suave}>{e.confirmados} de {e.preenchidas} confirmaram</T>
        </View>
        <View style={{ height: 4, backgroundColor: c.borda }}><View style={{ width: `${Math.round(pct * 100)}%`, height: 4, backgroundColor: AZUL }} /></View>
        {comAlerta.length ? (
          <Pressable onPress={() => setVerAlertas(!verAlertas)} style={{ backgroundColor: c.sup, borderLeftWidth: 3, borderLeftColor: VERMELHO, paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={16} color={VERMELHO} />
              <T s={13.5} f={F.semi} style={{ flex: 1 }}>{comAlerta.length === 1 ? "1 pessoa precisa de atenção" : `${comAlerta.length} pessoas precisam de atenção`}</T>
              <ChevronDown size={18} color={c.suave} style={{ transform: [{ rotate: verAlertas ? "180deg" : "0deg" }] }} />
            </View>
            {verAlertas ? comAlerta.map((v) => <T key={v.id} s={13} cor={c.suave}><T s={13} f={F.semi} cor={c.texto}>{nomeCurto(v.nome ?? "")}:</T> {alertas[v.id]!.join("; ").toLowerCase()}</T>) : null}
          </Pressable>
        ) : null}
        <Cartao style={{ padding: 0 }}>
          {equipe.map((v, i) => (
            <LinhaPessoa key={v.id} primeira={i === 0} id={v.membroId} nome={v.nome} foto={v.foto} destaque={e.minhas.includes(v.id)} alerta={!!alertas[v.id]?.length}
              sub={lider && v.motivo ? `${v.funcao} · “${v.motivo}”` : v.funcao}
              direita={v.membroId && e.situacao === "publicada" ? <StatusIcone r={v.resposta} /> : null} />
          ))}
        </Cartao>
      </View>

      {e.musicas.length ? (
        <View style={{ gap: 10 }}>
          <Sobre>Músicas</Sobre>
          <Cartao style={{ padding: 0 }}>
            {e.musicas.map((mu, i) => (
              <View key={mu.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.fundo }}>
                <T s={14} f={F.negrito} cor={c.suave} style={{ width: 16 }}>{i + 1}</T>
                <Pressable style={{ flex: 1 }} disabled={!mu.hino} onPress={() => router.push(`/hino/${mu.hino}`)}>
                  <T s={15} f={F.semi} cor={mu.hino ? c.azul : c.texto} linhas={2}>{mu.titulo}</T>
                  <T s={12.5} cor={c.suave}>{[mu.hino ? `Hino ${mu.hino}` : mu.artista, mu.tom ? `Tom ${mu.tom}` : null].filter(Boolean).join(" · ") || " "}</T>
                </Pressable>
                {mu.link ? <Pressable hitSlop={6} onPress={() => Linking.openURL(mu.link!)} accessibilityLabel="Ouvir" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.realce, alignItems: "center", justifyContent: "center" }}><Headphones size={17} color={c.azul} /></Pressable> : null}
                {mu.cifra ? <Pressable hitSlop={6} onPress={() => Linking.openURL(mu.cifra!)} accessibilityLabel="Cifra" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.realce, alignItems: "center", justifyContent: "center" }}><Guitar size={17} color={c.azul} /></Pressable> : null}
              </View>
            ))}
          </Cartao>
        </View>
      ) : null}

      {e.roteiro.length ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Sobre>Roteiro</Sobre>{duracaoRoteiro(e.roteiro) ? <T s={13} cor={c.suave}>{duracaoRoteiro(e.roteiro)} min</T> : null}</View>
          <Cartao style={{ padding: 0 }}>
            {e.roteiro.map((r, i) => (
              <View key={r.id || i} style={{ flexDirection: "row", gap: 14, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: c.fundo }}>
                <T s={13} f={F.semi} cor={c.suave} style={{ width: 44 }}>{horaBR(new Date(inicios[i]!).toISOString())}</T>
                <View style={{ flex: 1 }}><T s={14.5} f={F.semi}>{r.item}</T>{r.obs ? <T s={12.5} cor={c.suave}>{r.obs}</T> : null}</View>
                {r.minutos ? <T s={12.5} cor={c.suave}>{r.minutos} min</T> : null}
              </View>
            ))}
          </Cartao>
        </View>
      ) : null}

      {e.observacoes ? <View style={{ gap: 8 }}><Sobre>Observações</Sobre><T s={15} style={{ lineHeight: 22 }}>{e.observacoes}</T></View> : null}

      {lider ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 4 }}>
          {e.historico ? <Pressable onPress={() => setHistorico(true)} style={{ flexDirection: "row", gap: 6, alignItems: "center", padding: 6 }}><History size={15} color={c.suave} /><T s={13} cor={c.suave}>Histórico</T></Pressable> : <View />}
          <Pressable onPress={apagar} style={{ flexDirection: "row", gap: 6, alignItems: "center", padding: 6 }}><Trash2 size={15} color={c.suave} /><T s={13} cor={c.suave}>{e.situacao === "publicada" ? "Cancelar escala" : "Apagar rascunho"}</T></Pressable>
        </View>
      ) : null}

      <Folha aberta={!!recusa} titulo="Não posso servir" aoFechar={() => setRecusa(null)}>
        <T s={14} cor={c.suave}>A liderança é avisada para achar alguém no seu lugar.</T>
        <View style={{ gap: 6 }}><Rotulo>Motivo (opcional, só a liderança vê)</Rotulo><CampoTexto value={motivo} onChangeText={setMotivo} multiline maxLength={300} /></View>
        <Botao carregando={ocupado} onPress={async () => { await responder(recusa!, "recusado", motivo); setRecusa(null); }}>Avisar a liderança</Botao>
      </Folha>
      <Folha aberta={historico} titulo="Histórico" aoFechar={() => setHistorico(false)}>
        {[...(e.historico ?? [])].reverse().map((h, i) => <View key={i}><T s={14}><T s={14} f={F.semi}>{h.quem}</T> · {h.o}</T><T s={12} cor={c.suave}>{quando(h.em)}</T></View>)}
      </Folha>
    </Tela>
  );
}
