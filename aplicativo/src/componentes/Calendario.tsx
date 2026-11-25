/**
 * Campos de data e de horário do app: um toque abre, logo abaixo do campo, um
 * calendário (ou um relógio de toques) grande e claro. Sem digitar nada.
 * Datas no formato "aaaa-mm-dd" e horários "HH:MM", sempre de Brasília.
 */
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AZUL, F, VERMELHO, useTema } from "@/lib/tema";
import { dataBR, hojeBrasilia } from "@/lib/util";
import { T } from "./ui";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const p2 = (n: number) => String(n).padStart(2, "0");
const toque = () => Haptics.selectionAsync().catch(() => {});

function somaDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const diaDaSemana = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
export const proximoDia = (semana: number, desde = hojeBrasilia()) => somaDias(desde, ((semana - diaDaSemana(desde) + 7) % 7) || 7);
export const dataLonga = (iso: string) => `${DIAS[diaDaSemana(iso)]}, ${dataBR(iso)}`;

type Atalho = { rotulo: string; valor: string };

function Gatilho({ icone, texto, vazio, aberto, onPress, rotulo }: { icone: React.ReactNode; texto: string; vazio: boolean; aberto: boolean; onPress: () => void; rotulo: string }) {
  const { c } = useTema();
  return (
    <View style={{ gap: 6 }}>
      <T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.5, textTransform: "uppercase" }}>{rotulo}</T>
      <Pressable onPress={() => { toque(); onPress(); }} accessibilityRole="button" accessibilityLabel={`${rotulo}: ${texto}`}
        style={({ pressed }) => ({ height: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, backgroundColor: c.sup, borderWidth: aberto ? 2 : 1, borderColor: aberto ? AZUL : c.borda, opacity: pressed ? 0.85 : 1 })}>
        {icone}
        <Text style={{ flex: 1, fontFamily: vazio ? F.regular : F.semi, fontSize: 16, color: vazio ? c.suave : c.texto }}>{texto}</Text>
        <ChevronDown size={18} color={c.suave} style={{ transform: [{ rotate: aberto ? "180deg" : "0deg" }] }} />
      </Pressable>
    </View>
  );
}

/** Campo de data com calendário. */
export function CampoData({ rotulo, valor, aoMudar, minimo, maximo, atalhos, vazio = "Escolher a data", anos }: {
  rotulo: string; valor: string; aoMudar: (iso: string) => void; minimo?: string; maximo?: string; atalhos?: Atalho[]; vazio?: string;
  /** para datas antigas (nascimento): abre direto na escolha do ano */
  anos?: boolean;
}) {
  const { c } = useTema();
  const [aberto, setAberto] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Gatilho rotulo={rotulo} aberto={aberto} onPress={() => setAberto(!aberto)} vazio={!valor} texto={valor ? dataLonga(valor) : vazio} icone={<CalendarDays size={20} color={c.azul} />} />
      {aberto ? <Calendario valor={valor} minimo={minimo} maximo={maximo} atalhos={atalhos} comecarNoAno={anos && !valor} aoEscolher={(v) => { aoMudar(v); setAberto(false); }} /> : null}
    </View>
  );
}

export function Calendario({ valor, aoEscolher, minimo, maximo, atalhos, comecarNoAno }: { valor: string; aoEscolher: (iso: string) => void; minimo?: string; maximo?: string; atalhos?: Atalho[]; comecarNoAno?: boolean }) {
  const { c } = useTema();
  const hoje = hojeBrasilia();
  const base = valor || hoje;
  const [mes, setMes] = useState({ a: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
  const [modo, setModo] = useState<"dias" | "anos">(comecarNoAno ? "anos" : "dias");
  const primeiro = new Date(Date.UTC(mes.a, mes.m, 1)).getUTCDay();
  const total = new Date(Date.UTC(mes.a, mes.m + 1, 0)).getUTCDate();
  const celulas: (number | null)[] = [...Array(primeiro).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (celulas.length % 7) celulas.push(null);
  const iso = (d: number) => `${mes.a}-${p2(mes.m + 1)}-${p2(d)}`;
  const fora = (v: string) => (minimo && v < minimo) || (maximo && v > maximo);
  const mudarMes = (n: number) => { toque(); setMes(({ a, m }) => ({ a: a + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 })); };
  const [inicioAnos, setInicioAnos] = useState(() => Number(base.slice(0, 4)) - 12);

  return (
    <View style={{ backgroundColor: c.sup, borderWidth: 1, borderColor: c.borda, borderTopWidth: 3, borderTopColor: AZUL, padding: 12, gap: 10 }}>
      {atalhos?.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {atalhos.map((x) => {
            const sel = x.valor === valor;
            return (
              <Pressable key={x.rotulo} onPress={() => { toque(); aoEscolher(x.valor); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: sel ? AZUL : c.borda, backgroundColor: sel ? AZUL : c.realce }}>
                <T s={13} f={F.negrito} cor={sel ? "#fff" : c.azul}>{x.rotulo}</T>
                <T s={11} cor={sel ? "#ffffffcc" : c.suave}>{dataBR(x.valor).slice(0, 5)}</T>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable hitSlop={10} onPress={() => mudarMes(-1)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="Mês anterior"><ChevronLeft size={24} color={c.azul} /></Pressable>
        <Pressable onPress={() => { toque(); setModo(modo === "dias" ? "anos" : "dias"); }} style={{ flex: 1, alignItems: "center", paddingVertical: 6 }} accessibilityLabel="Escolher o ano">
          <Text style={{ fontFamily: F.negrito, fontSize: 17, color: c.escuro ? c.texto : AZUL, textTransform: "capitalize" }}>{MESES[mes.m]} {mes.a} <Text style={{ fontSize: 13, color: c.suave }}>▾</Text></Text>
        </Pressable>
        <Pressable hitSlop={10} onPress={() => mudarMes(1)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="Próximo mês"><ChevronRight size={24} color={c.azul} /></Pressable>
      </View>

      {modo === "anos" ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {MESES.map((n, i) => (
              <Pressable key={n} onPress={() => { toque(); setMes((x) => ({ ...x, m: i })); }} style={{ width: "23.5%", height: 38, alignItems: "center", justifyContent: "center", backgroundColor: mes.m === i ? AZUL : c.realce }}>
                <T s={13} f={F.semi} cor={mes.m === i ? "#fff" : c.azul} style={{ textTransform: "capitalize" }}>{n.slice(0, 3)}</T>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: c.borda, paddingTop: 8 }}>
            <Pressable hitSlop={8} onPress={() => setInicioAnos(inicioAnos - 20)} style={{ width: 36, alignItems: "center" }} accessibilityLabel="Anos anteriores"><ChevronLeft size={20} color={c.azul} /></Pressable>
            <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {Array.from({ length: 20 }, (_, i) => inicioAnos + i).map((a) => (
                <Pressable key={a} onPress={() => { toque(); setMes((x) => ({ ...x, a })); setModo("dias"); }} style={{ width: "18.2%", height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: a === mes.a ? AZUL : c.borda, backgroundColor: a === mes.a ? AZUL : "transparent" }}>
                  <T s={13.5} f={F.semi} cor={a === mes.a ? "#fff" : c.texto}>{a}</T>
                </Pressable>
              ))}
            </View>
            <Pressable hitSlop={8} onPress={() => setInicioAnos(inicioAnos + 20)} style={{ width: 36, alignItems: "center" }} accessibilityLabel="Próximos anos"><ChevronRight size={20} color={c.azul} /></Pressable>
          </View>
          <Pressable onPress={() => setModo("dias")} style={{ alignSelf: "center", padding: 6 }}><T s={12.5} f={F.negrito} cor={c.azul} style={{ letterSpacing: 1, textTransform: "uppercase" }}>Ver os dias</T></Pressable>
        </View>
      ) : (
        <View>
          <View style={{ flexDirection: "row" }}>
            {SEMANA.map((s, i) => <T key={i} s={12} f={F.negrito} cor={i === 0 ? VERMELHO : c.suave} centro style={{ flex: 1, paddingBottom: 6 }}>{s}</T>)}
          </View>
          {Array.from({ length: celulas.length / 7 }, (_, l) => (
            <View key={l} style={{ flexDirection: "row" }}>
              {celulas.slice(l * 7, l * 7 + 7).map((d, k) => {
                if (!d) return <View key={k} style={{ flex: 1, height: 46 }} />;
                const v = iso(d);
                const sel = v === valor;
                const eHoje = v === hoje;
                const bloq = !!fora(v);
                return (
                  <Pressable key={k} disabled={bloq} onPress={() => { toque(); aoEscolher(v); }} style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }} accessibilityLabel={dataLonga(v)}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: sel ? AZUL : "transparent", borderWidth: eHoje && !sel ? 1.5 : 0, borderColor: AZUL }}>
                      <Text style={{ fontFamily: sel || eHoje ? F.negrito : F.medio, fontSize: 15.5, color: sel ? "#fff" : bloq ? c.borda : k === 0 ? VERMELHO : c.texto }}>{d}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const COMUNS = ["08:00", "09:00", "10:00", "17:00", "18:00", "19:00", "19:30", "20:00"];
const HORAS = Array.from({ length: 18 }, (_, i) => i + 6); // 06h às 23h
const MINUTOS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/** Campo de horário: horários comuns num toque, ou hora + minutos. */
export function CampoHora({ rotulo, valor, aoMudar }: { rotulo: string; valor: string; aoMudar: (hhmm: string) => void }) {
  const { c } = useTema();
  const [aberto, setAberto] = useState(false);
  const [h, m] = (valor || "10:00").split(":").map(Number) as [number, number];
  const escolher = (nh: number, nm: number, fechar: boolean) => { toque(); aoMudar(`${p2(nh)}:${p2(nm)}`); if (fechar) setAberto(false); };
  const Chip = ({ ativo, texto, onPress, largura }: { ativo: boolean; texto: string; onPress: () => void; largura: string }) => (
    <Pressable onPress={onPress} style={{ width: largura as `${number}%`, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: ativo ? AZUL : c.borda, backgroundColor: ativo ? AZUL : "transparent" }}>
      <T s={14.5} f={F.semi} cor={ativo ? "#fff" : c.texto}>{texto}</T>
    </Pressable>
  );
  return (
    <View style={{ gap: 8 }}>
      <Gatilho rotulo={rotulo} aberto={aberto} onPress={() => setAberto(!aberto)} vazio={!valor} texto={valor ? valor.replace(":", "h") : "Escolher o horário"} icone={<Clock size={20} color={c.azul} />} />
      {aberto ? (
        <View style={{ backgroundColor: c.sup, borderWidth: 1, borderColor: c.borda, borderTopWidth: 3, borderTopColor: AZUL, padding: 12, gap: 12 }}>
          <View style={{ gap: 6 }}>
            <T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>Mais usados</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {COMUNS.map((x) => { const [a, b] = x.split(":").map(Number) as [number, number]; return <Chip key={x} largura="23.5%" ativo={x === valor} texto={x.replace(":", "h")} onPress={() => escolher(a, b, true)} />; })}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>Hora</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {HORAS.map((x) => <Chip key={x} largura="15.3%" ativo={x === h} texto={`${p2(x)}h`} onPress={() => escolher(x, m, false)} />)}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>Minutos</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {MINUTOS.map((x) => <Chip key={x} largura="15.3%" ativo={x === m} texto={`:${p2(x)}`} onPress={() => escolher(h, x, true)} />)}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
