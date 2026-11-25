/** Aba "Escalas" do Participar: quando eu sirvo, meus ministérios e minhas ausências. */
import { Rostos } from "./Pessoa";
import { router } from "expo-router";
import { CalendarOff, CheckCircle2, ChevronRight, CircleDashed, Crown, Plus, Trash2, XCircle } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Botao, Cartao, Sobre, T } from "./ui";
import { Folha, Rotulo } from "./Folha";
import { CampoData } from "./Calendario";
import { IconeMinisterio } from "./IconeMinisterio";
import { diaDe, marcarAusencia, removerAusencia, responderEscala, type EscalaVista, type InicioEscalas, type Resposta } from "@/lib/escalas";
import { AZUL, F, VERMELHO, useTema } from "@/lib/tema";
import { dataBR, dataComDia, emBrasilia, hojeBrasilia } from "@/lib/util";

export const horaBR = (iso: string) => { const b = emBrasilia(iso); return `${String(b.hora).padStart(2, "0")}h${String(b.minuto).padStart(2, "0")}`; };

export function falta(iso: string) {
  const n = Math.round((new Date(`${diaDe(iso)}T12:00:00Z`).getTime() - new Date(`${hojeBrasilia()}T12:00:00Z`).getTime()) / 864e5);
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  if (n < 0) return n === -1 ? "Ontem" : `Há ${-n} dias`;
  return `Em ${n} dias`;
}

export function Selo({ r, pequeno }: { r: Resposta; pequeno?: boolean }) {
  const { c } = useTema();
  const I = r === "confirmado" ? CheckCircle2 : r === "recusado" ? XCircle : CircleDashed;
  const cor = r === "confirmado" ? c.azul : r === "recusado" ? VERMELHO : c.suave;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <I size={pequeno ? 13 : 14} color={cor} />
      <Text style={{ fontFamily: F.negrito, fontSize: pequeno ? 10 : 10.5, letterSpacing: 1, textTransform: "uppercase", color: cor }}>{r === "confirmado" ? "Confirmado" : r === "recusado" ? "Não poderá" : "Aguardando"}</Text>
    </View>
  );
}

export function CampoTexto(p: React.ComponentProps<typeof TextInput>) {
  const { c } = useTema();
  return <TextInput placeholderTextColor={c.suave + "99"} {...p} style={[{ height: p.multiline ? 96 : 50, paddingHorizontal: 14, paddingTop: p.multiline ? 12 : 0, fontFamily: F.medio, fontSize: 16, color: c.texto, backgroundColor: c.sup, borderWidth: 1, borderColor: c.borda, textAlignVertical: p.multiline ? "top" : "center" }, p.style]} />;
}

export function MinhasEscalas({ d, recarregar }: { d: InicioEscalas; recarregar: () => void }) {
  const { c } = useTema();
  const [ausencia, setAusencia] = useState<{ de: string; ate: string; motivo: string } | null>(null);
  const [recusa, setRecusa] = useState<{ e: EscalaVista; motivo: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const responder = async (e: EscalaVista, resposta: "confirmado" | "recusado", motivo?: string) => {
    setEnviando(true);
    try {
      for (const v of e.vagas.filter((x) => e.minhas.includes(x.id) && x.resposta === "pendente")) await responderEscala(e.id, v.id, resposta, motivo);
      recarregar();
    } catch (x) { Alert.alert("Escala", x instanceof Error ? x.message : "Não foi possível responder."); }
    finally { setEnviando(false); }
  };

  if (!d.ministerios.length) {
    return (
      <Cartao style={{ padding: 22, gap: 8, alignItems: "center" }}>
        <T f={F.negrito} s={16} centro>Você ainda não está em nenhum ministério</T>
        <T s={14} cor={c.suave} centro>Quando a liderança incluir você (Louvor, Recepção, Multimídia…), as suas escalas aparecem aqui para confirmar.</T>
      </Cartao>
    );
  }

  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 12 }}>
        <Sobre>Quando eu sirvo</Sobre>
        {d.proximas.length === 0 ? <Cartao style={{ padding: 18 }}><T s={14} cor={c.suave}>Nenhuma escala publicada com o seu nome por enquanto.</T></Cartao> : d.proximas.map((e) => {
          const minhas = e.vagas.filter((v) => e.minhas.includes(v.id));
          const pendente = minhas.some((v) => v.resposta === "pendente");
          const perto = ["Hoje", "Amanhã"].includes(falta(e.inicio));
          return (
            <Cartao key={e.id} style={[{ padding: 0 }, pendente && { borderColor: AZUL }]}>
              <Pressable onPress={() => router.push(`/escala/${e.id}`)} style={{ padding: 18, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <IconeMinisterio chave={e.icone} size={14} color={c.suave} />
                  <T s={10.5} f={F.negrito} cor={c.suave} style={{ flex: 1, letterSpacing: 1.6, textTransform: "uppercase" }}>{e.ministerio}</T>
                  <T s={10.5} f={F.negrito} cor={perto ? VERMELHO : c.suave} style={{ letterSpacing: 1.6, textTransform: "uppercase" }}>{falta(e.inicio)}</T>
                </View>
                <Text style={{ fontFamily: F.negrito, fontSize: 18, lineHeight: 23, color: c.escuro ? c.texto : AZUL }}>{e.titulo}</Text>
                <T s={14} cor={c.suave}>{dataComDia(diaDe(e.inicio))} · {horaBR(e.inicio)}{e.local ? ` · ${e.local}` : ""}</T>
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
                  {minhas.map((v) => <View key={v.id} style={{ backgroundColor: c.realce, paddingHorizontal: 10, paddingVertical: 4 }}><T s={13} f={F.negrito} cor={c.azul}>{v.funcao}</T></View>)}
                  {minhas[0] ? <Selo r={minhas[0].resposta} /> : null}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <Rostos pessoas={e.vagas.filter((v) => v.membroId).map((v) => ({ id: v.membroId, nome: v.nome ?? "", foto: v.foto }))} />
                  <T s={12.5} cor={c.suave} style={{ flex: 1 }}>{e.confirmados} de {e.preenchidas} confirmados{e.musicas.length ? ` · ${e.musicas.length} músicas` : ""}</T>
                </View>
              </Pressable>
              {pendente ? (
                <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: c.borda }}>
                  <Pressable disabled={enviando} onPress={() => setRecusa({ e, motivo: "" })} style={{ flex: 1, height: 50, alignItems: "center", justifyContent: "center" }}><T s={12} f={F.negrito} cor={VERMELHO} style={{ letterSpacing: 1.2, textTransform: "uppercase" }}>Não poderei</T></Pressable>
                  <Pressable disabled={enviando} onPress={() => responder(e, "confirmado")} style={{ flex: 1, height: 50, alignItems: "center", justifyContent: "center", backgroundColor: AZUL }}><T s={12} f={F.negrito} cor="#fff" style={{ letterSpacing: 1.2, textTransform: "uppercase" }}>Confirmar</T></Pressable>
                </View>
              ) : null}
            </Cartao>
          );
        })}
      </View>

      <View style={{ gap: 12 }}>
        <Sobre>Meus ministérios</Sobre>
        {d.ministerios.map((m) => (
          <Cartao key={m.id} onPress={m.lider ? () => router.push(`/ministerio/${m.id}`) : undefined} style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 46, height: 46, backgroundColor: AZUL, alignItems: "center", justifyContent: "center" }}><IconeMinisterio chave={m.icone} size={21} color="#fff" /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><T f={F.negrito} s={16}>{m.nome}</T>{m.lider ? <Crown size={14} color={VERMELHO} /> : null}</View>
              <T s={13} cor={c.suave} linhas={1}>{m.funcoes.join(", ") || "Sem função definida"} · {m.pessoas} pessoas</T>
              {m.lider && (m.recusas > 0 || m.rascunhos > 0) ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {m.recusas > 0 ? <T s={11.5} f={F.negrito} cor={VERMELHO}>{m.recusas} com ausência avisada</T> : null}
                  {m.rascunhos > 0 ? <T s={11.5} f={F.negrito} cor={c.azul}>{m.rascunhos} em rascunho</T> : null}
                </View>
              ) : null}
            </View>
            {m.lider ? <ChevronRight size={18} color={c.suave} /> : null}
          </Cartao>
        ))}
        {d.ministerios.some((m) => m.lider) ? <T s={12.5} cor={c.suave}>Você lidera: toque no ministério para montar e publicar as escalas.</T> : null}
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Sobre>Minhas ausências</Sobre>
          <Pressable hitSlop={8} onPress={() => { const h = hojeBrasilia(); setAusencia({ de: h, ate: h, motivo: "" }); }} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Plus size={16} color={c.azul} /><T s={12} f={F.negrito} cor={c.azul} style={{ letterSpacing: 1.2, textTransform: "uppercase" }}>Marcar</T></Pressable>
        </View>
        {d.ausencias.length === 0 ? <T s={13.5} cor={c.suave}>Vai viajar ou não poderá servir em algumas datas? Marque aqui e a liderança já vê ao montar a escala.</T> : (
          <Cartao style={{ padding: 0 }}>
            {d.ausencias.map((a, i) => (
              <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda }}>
                <CalendarOff size={18} color={c.suave} />
                <View style={{ flex: 1 }}><T f={F.semi} s={15}>{a.de === a.ate ? dataBR(a.de) : `${dataBR(a.de)} a ${dataBR(a.ate)}`}</T>{a.motivo ? <T s={12.5} cor={c.suave}>{a.motivo}</T> : null}</View>
                <Pressable hitSlop={10} onPress={async () => { await removerAusencia(a.id).catch(() => {}); recarregar(); }} accessibilityLabel="Remover"><Trash2 size={17} color={c.suave} /></Pressable>
              </View>
            ))}
          </Cartao>
        )}
      </View>

      {d.recentes.length ? (
        <View style={{ gap: 10 }}>
          <Sobre>Servi recentemente</Sobre>
          <Cartao style={{ padding: 0 }}>
            {d.recentes.map((e, i) => (
              <Pressable key={e.id} onPress={() => router.push(`/escala/${e.id}`)} style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda }}>
                <T s={12.5} f={F.semi} cor={c.suave} style={{ width: 82 }}>{dataBR(diaDe(e.inicio))}</T>
                <T s={14} linhas={1} style={{ flex: 1 }}>{e.ministerio} · {e.titulo}</T>
              </Pressable>
            ))}
          </Cartao>
        </View>
      ) : null}

      <Folha aberta={!!ausencia} titulo="Marcar ausência" aoFechar={() => setAusencia(null)}>
        {ausencia ? (
          <>
            <CampoData rotulo="Primeiro dia fora" valor={ausencia.de} minimo={hojeBrasilia()} aoMudar={(v) => setAusencia({ ...ausencia, de: v, ate: ausencia.ate < v ? v : ausencia.ate })} />
            <CampoData rotulo="Último dia fora" valor={ausencia.ate} minimo={ausencia.de} aoMudar={(v) => setAusencia({ ...ausencia, ate: v })} />
            <View style={{ gap: 6 }}><Rotulo>Motivo (opcional, só a liderança vê)</Rotulo><CampoTexto value={ausencia.motivo} onChangeText={(t) => setAusencia({ ...ausencia, motivo: t })} placeholder="Ex.: viagem" maxLength={120} /></View>
            <Botao onPress={async () => {
              try { await marcarAusencia(ausencia.de, ausencia.ate, ausencia.motivo); setAusencia(null); recarregar(); } catch (x) { Alert.alert("Ausência", x instanceof Error ? x.message : "Erro"); }
            }}>Salvar</Botao>
          </>
        ) : null}
      </Folha>

      <Folha aberta={!!recusa} titulo="Não poderei servir" aoFechar={() => setRecusa(null)}>
        {recusa ? (
          <>
            <T s={14} cor={c.suave}>{recusa.e.titulo}: a liderança é avisada para achar alguém no seu lugar.</T>
            <View style={{ gap: 6 }}><Rotulo>Motivo (opcional, só a liderança vê)</Rotulo><CampoTexto value={recusa.motivo} onChangeText={(t) => setRecusa({ ...recusa, motivo: t })} multiline maxLength={300} /></View>
            <Botao tipo="perigo" carregando={enviando} onPress={async () => { await responder(recusa.e, "recusado", recusa.motivo); setRecusa(null); }}>Avisar a liderança</Botao>
          </>
        ) : null}
      </Folha>
    </View>
  );
}
