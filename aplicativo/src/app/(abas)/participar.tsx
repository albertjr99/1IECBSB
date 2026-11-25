/** Participar: votações online e reuniões online da igreja, num só lugar. */
import { router, useFocusEffect } from "expo-router";
import { Bell, BellRing, CheckCircle2, ChevronRight, Clock, Lock, Radio, Users, Video, Vote } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Aviso, Cartao, Carregando, Sobre, T, Tela, Titulo } from "@/componentes/ui";
import { gravarCache, lerCache } from "@/lib/cache";
import { alternarLembrete, carregarParticipacao, entrarNaSala, lembretesAtivos, type Participacao, type ReuniaoMembro, type VotacaoMembro } from "@/lib/participar";
import { AZUL, F, NOITE, useTema } from "@/lib/tema";
import { quando } from "@/lib/util";

const SIGILO = { secreta: "Voto secreto", presidencia: "Voto visível só à presidência", aberta: "Voto aberto" };

function falta(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "agora";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `em ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `em ${h} h`;
  return `em ${Math.round(h / 24)} dias`;
}

export default function Participar() {
  const { c } = useTema();
  const [d, setD] = useState<Participacao | null>(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<"votacoes" | "reunioes">("votacoes");
  const [lembretes, setLembretes] = useState<Record<string, string>>({});
  const [atualizando, setAtualizando] = useState(false);
  const [entrando, setEntrando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const g = await lerCache<Participacao>("participar"); if (g) setD((x) => x ?? g);
    try { const r = await carregarParticipacao(); setD(r); setErro(""); gravarCache("participar", r); }
    catch (e) { setErro(e instanceof Error ? e.message : ""); }
    lembretesAtivos().then(setLembretes);
    setAtualizando(false);
  }, []);
  useFocusEffect(useCallback(() => { carregar(); const t = setInterval(carregar, 45_000); return () => clearInterval(t); }, [carregar]));

  const abertas = d?.votacoes.filter((v) => v.situacao === "em_andamento" && !v.votou).length ?? 0;
  const aoVivo = d?.reunioes.filter((r) => r.aoVivo && !r.cancelada).length ?? 0;

  const entrar = async (r: ReuniaoMembro) => {
    setEntrando(r.id);
    try { await entrarNaSala(r.id); carregar(); }
    catch (e) { Alert.alert("Reunião", e instanceof Error ? e.message : "Não foi possível entrar."); }
    finally { setEntrando(null); }
  };
  const lembrar = async (r: ReuniaoMembro) => {
    try {
      const ligado = await alternarLembrete(r);
      setLembretes(await lembretesAtivos());
      if (ligado) Alert.alert("Lembrete ativado", "Avisamos 15 minutos antes, quando a sala abrir.");
    } catch (e) { Alert.alert("Lembrete", e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <Tela atualizar={() => { setAtualizando(true); carregar(); }} atualizando={atualizando}>
      <View style={{ gap: 6 }}>
        <Sobre>Igreja</Sobre>
        <Titulo s={28}>Participar</Titulo>
        <T cor={c.suave} s={14}>Votações da igreja e reuniões online, direto pelo celular.</T>
      </View>

      <View style={{ flexDirection: "row", borderWidth: 1, borderColor: c.borda, backgroundColor: c.sup }}>
        {([["votacoes", "Votações", Vote, abertas], ["reunioes", "Reuniões", Video, aoVivo]] as const).map(([k, r, I, n]) => (
          <Pressable key={k} onPress={() => setAba(k)} style={{ flex: 1, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: aba === k ? AZUL : "transparent" }}>
            <I size={17} color={aba === k ? "#fff" : c.suave} />
            <Text style={{ fontFamily: F.negrito, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: aba === k ? "#fff" : c.suave }}>{r}</Text>
            {n ? <View style={{ minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: "#CC2127", alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.negrito, fontSize: 11, color: "#fff" }}>{n}</Text></View> : null}
          </Pressable>
        ))}
      </View>

      {!d ? (erro ? <Aviso texto={erro} acao={carregar} /> : <Carregando />) : aba === "votacoes" ? (
        d.votacoes.length === 0 ? <Vazio I={Vote} texto="Nenhuma votação para você no momento. Quando a igreja abrir uma votação, ela aparece aqui e você recebe um aviso." /> : (
          <View style={{ gap: 12 }}>
            {d.votacoes.map((v) => <CartaoVotacao key={v.id} v={v} />)}
          </View>
        )
      ) : (
        d.reunioes.length === 0 ? <Vazio I={Video} texto="Nenhuma reunião online agendada. Quando houver, ela aparece aqui com o botão para entrar." /> : (
          <View style={{ gap: 12 }}>
            {d.reunioes.map((r) => (
              <CartaoReuniao key={r.id} r={r} lembrete={!!lembretes[r.id]} entrando={entrando === r.id} entrar={() => entrar(r)} lembrar={() => lembrar(r)} />
            ))}
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingHorizontal: 2 }}>
              <Video size={15} color={c.suave} style={{ marginTop: 2 }} />
              <T s={12.5} cor={c.suave} style={{ flex: 1 }}>As reuniões usam o Jitsi Meet. Com o app Jitsi Meet instalado, a sala abre nele; sem o app, abre no navegador. A sala abre 15 minutos antes.</T>
            </View>
          </View>
        )
      )}
    </Tela>
  );
}

function Vazio({ I, texto }: { I: typeof Vote; texto: string }) {
  const { c } = useTema();
  return (
    <Cartao style={{ padding: 24, alignItems: "center", gap: 12 }}>
      <View style={{ width: 52, height: 52, backgroundColor: c.realce, alignItems: "center", justifyContent: "center" }}><I size={24} color={c.azul} /></View>
      <T cor={c.suave} centro s={14}>{texto}</T>
    </Cartao>
  );
}

function CartaoVotacao({ v }: { v: VotacaoMembro }) {
  const { c } = useTema();
  const aberta = v.situacao === "em_andamento";
  const pendente = aberta && !v.votou;
  const pct = v.participacao.eleitores ? Math.round((v.participacao.votaram / v.participacao.eleitores) * 100) : 0;
  return (
    <Cartao onPress={() => router.push(`/votacao/${v.token}`)} style={[{ padding: 18, gap: 10 }, pendente && { backgroundColor: AZUL, borderColor: AZUL }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {pendente ? <Radio size={15} color="#fff" /> : v.votou ? <CheckCircle2 size={15} color={c.azul} /> : v.situacao === "agendada" ? <Clock size={15} color={c.suave} /> : <Lock size={15} color={c.suave} />}
        <Text style={{ flex: 1, fontFamily: F.negrito, fontSize: 10.5, letterSpacing: 1.8, textTransform: "uppercase", color: pendente ? "#D9E6EF" : v.votou ? c.azul : c.suave }}>
          {pendente ? "Aberta · falta o seu voto" : v.votou && aberta ? "Você já votou" : v.situacao === "agendada" ? `Começa ${falta(v.inicio)}` : v.votou ? "Encerrada · você votou" : "Encerrada"}
        </Text>
      </View>
      <Text style={{ fontFamily: F.negrito, fontSize: 18, lineHeight: 23, color: pendente ? "#fff" : c.escuro ? c.texto : AZUL }}>{v.titulo}</Text>
      {v.descricao ? <Text numberOfLines={2} style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: pendente ? "#ffffffd9" : c.texto }}>{v.descricao}</Text> : null}
      {aberta ? (
        <View style={{ gap: 6 }}>
          <View style={{ height: 4, backgroundColor: pendente ? "#ffffff33" : c.realce }}><View style={{ height: 4, width: `${pct}%`, backgroundColor: pendente ? "#fff" : AZUL }} /></View>
          <Text style={{ fontFamily: F.semi, fontSize: 12, color: pendente ? "#D9E6EF" : c.suave }}>{v.participacao.votaram} de {v.participacao.eleitores} já votaram · até {quando(v.fim)}</Text>
        </View>
      ) : (
        <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: c.suave }}>{v.situacao === "agendada" ? quando(v.inicio) : `Encerrada em ${quando(v.fim)}`} · {SIGILO[v.sigilo]}</Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
        <Text style={{ fontFamily: F.negrito, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", color: pendente ? "#fff" : c.azul }}>{pendente ? "Votar agora" : v.situacao === "encerrada" ? "Ver resultado" : "Abrir"}</Text>
        <ChevronRight size={18} color={pendente ? "#fff" : c.azul} />
      </View>
    </Cartao>
  );
}

function CartaoReuniao({ r, lembrete, entrando, entrar, lembrar }: { r: ReuniaoMembro; lembrete: boolean; entrando: boolean; entrar: () => void; lembrar: () => void }) {
  const { c } = useTema();
  const vivo = r.aoVivo && !r.cancelada;
  return (
    <Cartao filete={!r.passou} style={[{ padding: 18, gap: 8 }, vivo && { backgroundColor: c.escuro ? NOITE : "#EAF1F7" }, r.passou && { opacity: 0.8 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {vivo ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#CC2127" }} /> : null}
        <Text style={{ flex: 1, fontFamily: F.negrito, fontSize: 10.5, letterSpacing: 1.8, textTransform: "uppercase", color: vivo ? "#CC2127" : c.suave }}>
          {r.cancelada ? "Cancelada" : vivo ? "Acontecendo agora" : r.passou ? (r.participei ? "Realizada · você participou" : "Realizada") : `Começa ${falta(r.inicio)}`}
        </Text>
        {!r.passou && !r.cancelada && !vivo ? (
          <Pressable hitSlop={10} onPress={lembrar} accessibilityLabel={lembrete ? "Cancelar lembrete" : "Lembrar-me"}>
            {lembrete ? <BellRing size={20} color={AZUL} /> : <Bell size={20} color={c.suave} />}
          </Pressable>
        ) : null}
      </View>
      <Text style={{ fontFamily: F.negrito, fontSize: 18, lineHeight: 23, color: c.escuro ? c.texto : AZUL, textDecorationLine: r.cancelada ? "line-through" : "none" }}>{r.titulo}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Clock size={14} color={c.suave} /><T s={13.5} cor={c.suave}>{quando(r.inicio)} · {r.duracaoMin} min</T></View>
      {r.descricao ? <T s={14}>{r.descricao}</T> : null}
      {r.passou ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Users size={14} color={c.suave} /><T s={12.5} cor={c.suave}>{r.presentes} participante{r.presentes === 1 ? "" : "s"}</T></View>
      ) : !r.cancelada ? (
        <Pressable onPress={vivo ? entrar : lembrar} disabled={entrando} style={{ marginTop: 6, height: 50, backgroundColor: vivo ? AZUL : "transparent", borderWidth: vivo ? 0 : 1.5, borderColor: AZUL, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {vivo ? <Video size={18} color="#fff" /> : lembrete ? <BellRing size={17} color={c.azul} /> : <Bell size={17} color={c.azul} />}
          <Text style={{ fontFamily: F.negrito, fontSize: 12.5, letterSpacing: 1.4, textTransform: "uppercase", color: vivo ? "#fff" : c.azul }}>
            {vivo ? (entrando ? "Abrindo a sala…" : "Entrar na reunião") : lembrete ? "Lembrete ativado" : "Lembrar-me 15 min antes"}
          </Text>
        </Pressable>
      ) : null}
    </Cartao>
  );
}
