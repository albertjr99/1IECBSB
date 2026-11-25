/** Liderança do ministério: escalas, repetições, equipe e ausências. */
import { FotoPessoa, Rostos } from "@/componentes/Pessoa";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AlertTriangle, CalendarOff, CalendarPlus, ChevronRight, Crown, Pencil, Plus, Repeat, Search, Settings2, Trash2, UserPlus, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Aviso, Botao, Cartao, Carregando, T, Tela } from "@/componentes/ui";
import { Folha, Rotulo } from "@/componentes/Folha";
import { CampoData, CampoHora } from "@/componentes/Calendario";
import { IconeMinisterio } from "@/componentes/IconeMinisterio";
import { CampoTexto, falta, horaBR } from "@/componentes/MinhasEscalas";
import {
  FREQUENCIA_ROTULO, SEMANA_DO_MES, carregarMinisterio, descreverSerie, diaDe, excluirSerie, salvarEquipe, salvarSerie,
  type DadosMinisterio, type Frequencia, type Serie,
} from "@/lib/escalas";
import { AZUL, F, VERMELHO, useTema } from "@/lib/tema";
import { dataBR, hojeBrasilia } from "@/lib/util";

type Aba = "escalas" | "repeticoes" | "equipe" | "ausencias";
type SerieForm = Omit<Serie, "id" | "ativa" | "excluidas" | "ministerioId" | "desde" | "ate"> & { id?: string; desde: string; ate: string; aplicar?: boolean };
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default function Ministerio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTema();
  const [d, setD] = useState<DadosMinisterio | null>(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<Aba>("escalas");
  const [anteriores, setAnteriores] = useState(false);
  const [serie, setSerie] = useState<SerieForm | null>(null);
  const [pessoa, setPessoa] = useState<{ membroId: string; nome: string; funcoes: string[]; nova?: boolean } | null>(null);
  const [incluir, setIncluir] = useState(false);
  const [busca, setBusca] = useState("");
  const [funcoes, setFuncoes] = useState<{ id?: string; nome: string }[] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [agoraTela] = useState(() => Date.now());
  const carregar = useCallback(() => carregarMinisterio(id).then((r) => { setD(r); setErro(""); }).catch((e) => setErro(e instanceof Error ? e.message : "Erro")), [id]);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  if (!d) return <Tela voltar titulo="Liderança">{erro ? <Aviso texto={erro} acao={carregar} /> : <Carregando />}</Tela>;
  const m = d.ministerio;
  const agora = agoraTela - 4 * 3600e3;
  const futuras = d.escalas.filter((e) => new Date(e.inicio).getTime() > agora);
  const passadas = d.escalas.filter((e) => new Date(e.inicio).getTime() <= agora).reverse();
  const acao = async (p: () => Promise<unknown>) => { setOcupado(true); try { await p(); await carregar(); return true; } catch (e) { Alert.alert("Ministério", e instanceof Error ? e.message : "Erro"); return false; } finally { setOcupado(false); } };
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  return (
    <Tela voltar titulo="Liderança" atualizar={carregar}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 50, height: 50, backgroundColor: AZUL, alignItems: "center", justifyContent: "center" }}><IconeMinisterio chave={m.icone} size={23} color="#fff" /></View>
        <View style={{ flex: 1 }}><Text style={{ fontFamily: F.negrito, fontSize: 24, color: c.escuro ? c.texto : AZUL }}>{m.nome}</Text><T s={13} cor={c.suave}>{d.equipe.length} pessoas · {m.funcoes.length} funções</T></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginHorizontal: -18, paddingHorizontal: 18, flexGrow: 0 }}>
        {([["escalas", "Escalas"], ["repeticoes", "Repetições"], ["equipe", "Equipe"], ["ausencias", `Ausências${d.ausencias.length ? ` · ${d.ausencias.length}` : ""}`]] as const).map(([k, r]) => (
          <Pressable key={k} onPress={() => setAba(k)} style={{ height: 40, paddingHorizontal: 16, justifyContent: "center", borderWidth: 1, borderColor: aba === k ? AZUL : c.borda, backgroundColor: aba === k ? AZUL : c.sup }}>
            <T s={11.5} f={F.negrito} cor={aba === k ? "#fff" : c.suave} style={{ letterSpacing: 1, textTransform: "uppercase" }}>{r}</T>
          </Pressable>
        ))}
        <View style={{ width: 24 }} />
      </ScrollView>

      {aba === "escalas" ? (
        <>
          <Botao icone={<CalendarPlus size={17} color="#fff" />} onPress={() => router.push({ pathname: "/escala/editar", params: { min: m.id } })}>Montar nova escala</Botao>
          {!futuras.length ? <Cartao style={{ padding: 18 }}><T s={14} cor={c.suave}>Nenhuma escala por vir. Crie uma, ou uma repetição (ex.: todo domingo às 10h) para as datas aparecerem sozinhas.</T></Cartao> : futuras.map((e) => {
            const recusas = e.vagas.filter((v) => v.resposta === "recusado").length;
            const dia = diaDe(e.inicio);
            return (
              <Cartao key={e.id} onPress={() => router.push(`/escala/${e.id}`)} style={[{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }, e.situacao === "rascunho" && { borderStyle: "dashed" }]}>
                <View style={{ width: 46, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.negrito, fontSize: 22, color: c.escuro ? c.texto : AZUL }}>{dia.slice(8, 10)}</Text>
                  <T s={10.5} f={F.negrito} cor={c.suave} style={{ textTransform: "uppercase" }}>{DIAS_CURTOS[new Date(`${dia}T12:00:00Z`).getUTCDay()]}</T>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T f={F.negrito} s={15.5} linhas={1}>{e.titulo}</T>
                  <T s={12.5} cor={c.suave}>{horaBR(e.inicio)} · {falta(e.inicio)}{e.serieId ? " · repetição" : ""}</T>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {e.situacao === "rascunho" ? <T s={11.5} f={F.negrito} cor={c.azul}>Rascunho · {e.preenchidas}/{e.total} vagas</T> : <T s={11.5} f={F.negrito} cor={c.suave}>{e.confirmados}/{e.preenchidas} confirmados</T>}
                    {e.situacao === "publicada" && e.preenchidas < e.total ? <T s={11.5} f={F.negrito} cor={VERMELHO}>{e.total - e.preenchidas} a definir</T> : null}
                    {recusas ? <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><AlertTriangle size={12} color={VERMELHO} /><T s={11.5} f={F.negrito} cor={VERMELHO}>{recusas} não poderá(ão)</T></View> : null}
                  </View>
                  {e.preenchidas ? <View style={{ marginTop: 4 }}><Rostos pessoas={e.vagas.filter((v) => v.membroId).map((v) => ({ id: v.membroId, nome: v.nome ?? "", foto: v.foto }))} tam={26} max={7} /></View> : null}
                </View>
                <ChevronRight size={18} color={c.suave} />
              </Cartao>
            );
          })}
          {passadas.length ? (
            <View style={{ gap: 8 }}>
              <Pressable onPress={() => setAnteriores(!anteriores)}><T s={12} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1, textTransform: "uppercase" }}>{anteriores ? "Esconder" : "Ver"} anteriores ({passadas.length})</T></Pressable>
              {anteriores ? <Cartao style={{ padding: 0 }}>{passadas.map((e, i) => <Pressable key={e.id} onPress={() => router.push(`/escala/${e.id}`)} style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda }}><T s={12.5} f={F.semi} cor={c.suave} style={{ width: 82 }}>{dataBR(diaDe(e.inicio))}</T><T s={14} linhas={1} style={{ flex: 1 }}>{e.titulo}</T></Pressable>)}</Cartao> : null}
            </View>
          ) : null}
        </>
      ) : null}

      {aba === "repeticoes" ? (
        <>
          <T s={13.5} cor={c.suave}>A repetição cria sozinha as próximas datas (até 10 semanas à frente) como rascunho, com as vagas prontas. Você só escolhe as pessoas e publica.</T>
          <Botao icone={<Repeat size={17} color="#fff" />} onPress={() => setSerie({ titulo: "Culto de domingo", hora: "10:00", diaSemana: 0, frequencia: "semanal", desde: hojeBrasilia(), ate: "", vagas: m.funcoes.map((f) => f.id), roteiro: [] })}>Nova repetição</Botao>
          {!d.series.length ? <Cartao style={{ padding: 18 }}><T s={14} cor={c.suave}>Nenhuma repetição ainda.</T></Cartao> : d.series.map((s) => (
            <Cartao key={s.id} onPress={() => setSerie({ ...s, desde: s.desde, ate: s.ate ?? "", aplicar: true })} style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Repeat size={18} color={c.azul} />
              <View style={{ flex: 1 }}><T f={F.negrito} s={15.5}>{s.titulo}</T><T s={12.5} cor={c.suave}>{descreverSerie(s)}{s.ate ? ` · até ${dataBR(s.ate)}` : ""} · {s.vagas.length} vagas</T></View>
              <Pencil size={16} color={c.azul} />
            </Cartao>
          ))}
        </>
      ) : null}

      {aba === "equipe" ? (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Botao style={{ flex: 1, paddingHorizontal: 8 }} icone={<UserPlus size={17} color="#fff" />} onPress={() => { setBusca(""); setIncluir(true); }}>Incluir</Botao>
            <Botao tipo="sec" style={{ flex: 1, paddingHorizontal: 8 }} icone={<Settings2 size={17} color={c.escuro ? c.texto : AZUL} />} onPress={() => setFuncoes(m.funcoes.map((f) => ({ ...f })))}>Funções</Botao>
          </View>
          <Cartao style={{ padding: 0 }}>
            {d.equipe.map((p, i) => (
              <Pressable key={p.membroId} onPress={() => setPessoa({ membroId: p.membroId, nome: p.nome, funcoes: [...p.funcoes] })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda }}>
                <FotoPessoa id={p.membroId} nome={p.nome} foto={p.foto} tam={44} />
                <View style={{ flex: 1, gap: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><T f={F.semi} s={15}>{p.nome}</T>{p.lider ? <Crown size={13} color={VERMELHO} /> : null}</View>
                  <T s={12.5} cor={c.suave} linhas={1}>{p.funcoesNomes.join(", ") || "Sem função"}</T>
                  <T s={11.5} cor={c.suave}>{p.vezes90 ? `${p.vezes90}× em 90 dias` : "Não serviu em 90 dias"}{p.ultima ? ` · última ${dataBR(diaDe(p.ultima))}` : ""}{p.faltas ? ` · ${p.faltas} ausência(s)` : ""}</T>
                </View>
                <Pencil size={15} color={c.suave} />
              </Pressable>
            ))}
          </Cartao>
        </>
      ) : null}

      {aba === "ausencias" ? (
        !d.ausencias.length ? <Cartao style={{ padding: 18 }}><T s={14} cor={c.suave}>Ninguém da equipe marcou ausência por vir.</T></Cartao> : (
          <Cartao style={{ padding: 0 }}>
            {d.ausencias.map((a, i) => (
              <View key={a.id} style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda }}>
                <CalendarOff size={18} color={c.suave} />
                <View style={{ flex: 1 }}><T f={F.semi} s={15}>{a.nome}</T><T s={13} cor={c.suave}>{a.de === a.ate ? dataBR(a.de) : `${dataBR(a.de)} a ${dataBR(a.ate)}`}{a.motivo ? ` · ${a.motivo}` : ""}</T></View>
              </View>
            ))}
          </Cartao>
        )
      ) : null}

      <Folha aberta={!!serie} titulo={serie?.id ? "Editar repetição" : "Nova repetição"} aoFechar={() => setSerie(null)}>
        {serie ? (
          <>
            <View style={{ gap: 6 }}><Rotulo>Nome</Rotulo><CampoTexto value={serie.titulo} onChangeText={(t) => setSerie({ ...serie, titulo: t })} /></View>
            <View style={{ gap: 6 }}>
              <Rotulo>Dia</Rotulo>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {DIAS_CURTOS.map((n, i) => <Pressable key={i} onPress={() => setSerie({ ...serie, diaSemana: i })} style={{ flex: 1, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: serie.diaSemana === i ? AZUL : c.borda, backgroundColor: serie.diaSemana === i ? AZUL : c.sup }}><T s={12} f={F.negrito} cor={serie.diaSemana === i ? "#fff" : c.suave}>{n}</T></Pressable>)}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Rotulo>Repetir</Rotulo>
              <View style={{ gap: 4 }}>
                {(Object.keys(FREQUENCIA_ROTULO) as Frequencia[]).map((k) => <Pressable key={k} onPress={() => setSerie({ ...serie, frequencia: k })} style={{ height: 42, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: serie.frequencia === k ? AZUL : c.borda, backgroundColor: serie.frequencia === k ? c.realce : c.sup }}><T s={14} f={serie.frequencia === k ? F.negrito : F.regular} cor={serie.frequencia === k ? c.azul : c.texto}>{FREQUENCIA_ROTULO[k]}</T></Pressable>)}
              </View>
              {serie.frequencia === "mensal" ? (
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setSerie({ ...serie, semanaDoMes: n })} style={{ flex: 1, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: (serie.semanaDoMes ?? 1) === n ? AZUL : c.borda, backgroundColor: (serie.semanaDoMes ?? 1) === n ? AZUL : c.sup }}><T s={12} f={F.negrito} cor={(serie.semanaDoMes ?? 1) === n ? "#fff" : c.suave}>{SEMANA_DO_MES[n]}</T></Pressable>)}
                </View>
              ) : null}
            </View>
            <CampoHora rotulo="Horário" valor={serie.hora} aoMudar={(v) => setSerie({ ...serie, hora: v })} />
            <View style={{ backgroundColor: c.realce, padding: 12 }}><T s={14} f={F.negrito} cor={c.azul}>{descreverSerie(serie)}</T></View>
            <CampoData rotulo="Começa em" valor={serie.desde} aoMudar={(v) => setSerie({ ...serie, desde: v })} />
            <CampoData rotulo="Termina em (opcional)" valor={serie.ate} minimo={serie.desde} vazio="Sem data para terminar" aoMudar={(v) => setSerie({ ...serie, ate: v })} />
            {serie.ate ? <Pressable onPress={() => setSerie({ ...serie, ate: "" })}><T s={12.5} f={F.semi} cor={c.suave} style={{ textDecorationLine: "underline" }}>Tirar a data de término</T></Pressable> : null}
            <View style={{ gap: 6 }}>
              <Rotulo>Vagas em cada data</Rotulo>
              <Cartao style={{ padding: 0 }}>
                {m.funcoes.map((f, i) => {
                  const n = serie.vagas.filter((x) => x === f.id).length;
                  const por = (k: number) => setSerie({ ...serie, vagas: [...serie.vagas.filter((x) => x !== f.id), ...Array(k).fill(f.id)].sort((a, b) => m.funcoes.findIndex((x) => x.id === a) - m.funcoes.findIndex((x) => x.id === b)) });
                  return (
                    <View key={f.id} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda }}>
                      <T s={14.5} cor={n ? c.texto : c.suave} style={{ flex: 1 }}>{f.nome}</T>
                      <Pressable hitSlop={6} onPress={() => por(Math.max(0, n - 1))} style={{ width: 40, height: 42, alignItems: "center", justifyContent: "center" }}><T s={20} f={F.negrito} cor={c.azul}>−</T></Pressable>
                      <T s={15} f={F.negrito} style={{ width: 20, textAlign: "center" }}>{n}</T>
                      <Pressable hitSlop={6} onPress={() => por(n + 1)} style={{ width: 40, height: 42, alignItems: "center", justifyContent: "center" }}><T s={20} f={F.negrito} cor={c.azul}>+</T></Pressable>
                    </View>
                  );
                })}
              </Cartao>
            </View>
            <View style={{ gap: 6 }}><Rotulo>Local (opcional)</Rotulo><CampoTexto value={serie.local ?? ""} onChangeText={(t) => setSerie({ ...serie, local: t })} /></View>
            {serie.id ? <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Switch value={!!serie.aplicar} onValueChange={(v) => setSerie({ ...serie, aplicar: v })} trackColor={{ true: AZUL }} /><T s={13.5} style={{ flex: 1 }}>Aplicar também às próximas datas ainda em rascunho (as publicadas não mudam)</T></View> : null}
            <Botao carregando={ocupado} onPress={async () => {
              if (await acao(() => salvarSerie({ ...serie, ministerioId: m.id, ate: serie.ate || undefined }))) { setSerie(null); setAba("escalas"); }
            }}>Salvar</Botao>
            {serie.id ? <Pressable onPress={() => Alert.alert("Parar a repetição", "As próximas datas em rascunho saem; as já publicadas continuam.", [{ text: "Voltar", style: "cancel" }, { text: "Parar", style: "destructive", onPress: async () => { if (await acao(() => excluirSerie(serie.id!))) setSerie(null); } }])} style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}><Trash2 size={15} color={VERMELHO} /><T s={12.5} f={F.semi} cor={VERMELHO}>Parar a repetição</T></Pressable> : null}
          </>
        ) : null}
      </Folha>

      <Folha aberta={!!pessoa} titulo={pessoa?.nome ?? ""} aoFechar={() => setPessoa(null)}>
        {pessoa ? (
          <>
            <Rotulo>Funções</Rotulo>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {m.funcoes.map((f) => { const tem = pessoa.funcoes.includes(f.id); return <Pressable key={f.id} onPress={() => setPessoa({ ...pessoa, funcoes: tem ? pessoa.funcoes.filter((x) => x !== f.id) : [...pessoa.funcoes, f.id] })} style={{ borderWidth: 1, borderColor: tem ? AZUL : c.borda, backgroundColor: tem ? AZUL : "transparent", paddingHorizontal: 12, paddingVertical: 7 }}><T s={13.5} f={F.semi} cor={tem ? "#fff" : c.suave}>{f.nome}</T></Pressable>; })}
            </View>
            <Botao carregando={ocupado} onPress={async () => { if (await acao(() => salvarEquipe({ ministerioId: m.id, pessoa: { membroId: pessoa.membroId, funcoes: pessoa.funcoes } }))) setPessoa(null); }}>{pessoa.nova ? "Incluir no ministério" : "Salvar"}</Botao>
            {!pessoa.nova && !d.equipe.find((p) => p.membroId === pessoa.membroId)?.lider ? (
              <Pressable onPress={() => Alert.alert("Tirar do ministério", `Tirar ${pessoa.nome} do ministério?`, [{ text: "Voltar", style: "cancel" }, { text: "Tirar", style: "destructive", onPress: async () => { if (await acao(() => salvarEquipe({ ministerioId: m.id, pessoa: { membroId: pessoa.membroId, funcoes: [], remover: true } }))) setPessoa(null); } }])} style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}><Trash2 size={15} color={VERMELHO} /><T s={12.5} f={F.semi} cor={VERMELHO}>Tirar do ministério</T></Pressable>
            ) : null}
          </>
        ) : null}
      </Folha>

      <Folha aberta={incluir} titulo="Incluir pessoa" aoFechar={() => setIncluir(false)}>
        <View style={{ justifyContent: "center" }}>
          <Search size={17} color={c.suave} style={{ position: "absolute", left: 14, zIndex: 1 }} />
          <CampoTexto value={busca} onChangeText={setBusca} placeholder="Nome" style={{ paddingLeft: 40 }} />
        </View>
        {d.membrosIgreja.filter((p) => !busca || norm(p.nome).includes(norm(busca))).slice(0, 30).map((p) => (
          <Pressable key={p.id} onPress={() => { setIncluir(false); setPessoa({ membroId: p.id, nome: p.nome, funcoes: [], nova: true }); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.borda }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><FotoPessoa id={p.id} nome={p.nome} foto={p.foto} tam={36} /><T s={15}>{p.nome}</T></View><Plus size={17} color={c.azul} />
          </Pressable>
        ))}
        {!d.membrosIgreja.length ? <T s={13.5} cor={c.suave}>Todos os membros aprovados já estão no ministério.</T> : null}
      </Folha>

      <Folha aberta={!!funcoes} titulo="Funções do ministério" aoFechar={() => setFuncoes(null)}>
        {funcoes ? (
          <>
            <T s={13} cor={c.suave}>A ordem aqui é a ordem na escala.</T>
            {funcoes.map((f, i) => (
              <View key={f.id ?? `n${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <CampoTexto value={f.nome} onChangeText={(t) => setFuncoes(funcoes.map((x, k) => (k === i ? { ...x, nome: t } : x)))} placeholder="Nome da função" style={{ flex: 1, height: 44 }} />
                <Pressable hitSlop={8} onPress={() => setFuncoes(funcoes.filter((_, k) => k !== i))}><X size={19} color={c.suave} /></Pressable>
              </View>
            ))}
            <Pressable onPress={() => setFuncoes([...funcoes, { nome: "" }])} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Plus size={16} color={c.azul} /><T s={12} f={F.negrito} cor={c.azul} style={{ letterSpacing: 1, textTransform: "uppercase" }}>Função</T></Pressable>
            <Botao carregando={ocupado} onPress={async () => { if (await acao(() => salvarEquipe({ ministerioId: m.id, funcoes: funcoes.filter((x) => x.nome.trim()) }))) setFuncoes(null); }}>Salvar</Botao>
          </>
        ) : null}
      </Folha>
    </Tela>
  );
}
