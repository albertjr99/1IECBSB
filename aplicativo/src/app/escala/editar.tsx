/** Montar ou editar uma escala (liderança): data, equipe por função, músicas e roteiro. */
import { router, useLocalSearchParams } from "expo-router";
import { ArrowDown, ArrowUp, CalendarOff, Check, Music, Plus, Search, Sparkles, Trash2, UserRound, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Botao, Cartao, Carregando, Sobre, T, Tela } from "@/componentes/ui";
import { Folha, Rotulo } from "@/componentes/Folha";
import { CampoTexto } from "@/componentes/MinhasEscalas";
import {
  carregarMinisterio, dataDigitada, diaDe, duracaoRoteiro, horaValida, instante, mascaraData, mascaraHora, salvarEscala, sugerirEquipe, verEscala,
  type DadosMinisterio, type ItemRoteiro, type Musica,
} from "@/lib/escalas";
import { buscarHinos } from "@/lib/hinario";
import { AZUL, F, VERMELHO, useTema } from "@/lib/tema";
import { dataBR, emBrasilia, hojeBrasilia } from "@/lib/util";

type VagaForm = { id?: string; chave: string; funcaoId: string; membroId?: string };
type Form = { titulo: string; dia: string; hora: string; local: string; observacoes: string; vagas: VagaForm[]; roteiro: ItemRoteiro[]; musicas: Musica[]; situacao: "rascunho" | "publicada" };

const chave = () => Math.random().toString(36).slice(2, 9);
const TITULOS = ["Culto de domingo", "Culto de quarta", "Ensaio", "Escola Bíblica", "Culto especial"];
const p2 = (n: number) => String(n).padStart(2, "0");

function proximoDomingo() {
  const d = new Date(`${hojeBrasilia()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

export default function EditarEscala() {
  const { id, min } = useLocalSearchParams<{ id?: string; min: string }>();
  const nova = !id;
  const { c } = useTema();
  const ins = useSafeAreaInsets();
  const [mi, setMi] = useState<DadosMinisterio | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [escolher, setEscolher] = useState<string | null>(null);
  const [musica, setMusica] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const m = await carregarMinisterio(min);
        setMi(m);
        if (nova) {
          setF({ titulo: "", dia: dataBR(proximoDomingo()), hora: "10:00", local: "", observacoes: "", vagas: m.ministerio.funcoes.map((fn) => ({ chave: chave(), funcaoId: fn.id })), roteiro: [], musicas: [], situacao: "rascunho" });
        } else {
          const v = await verEscala(id!);
          const b = emBrasilia(v.escala.inicio);
          setF({ titulo: v.escala.titulo, dia: dataBR(diaDe(v.escala.inicio)), hora: `${p2(b.hora)}:${p2(b.minuto)}`, local: v.escala.local ?? "", observacoes: v.escala.observacoes ?? "", vagas: v.escala.vagas.map((x) => ({ id: x.id, chave: x.id, funcaoId: x.funcaoId, membroId: x.membroId })), roteiro: v.escala.roteiro, musicas: v.escala.musicas, situacao: v.escala.situacao });
        }
      } catch (e) { Alert.alert("Escala", e instanceof Error ? e.message : "Erro"); router.back(); }
    })();
  }, [id, min, nova]);

  const equipe = mi?.equipe ?? [];
  const nomes = useMemo(() => Object.fromEntries(equipe.map((p) => [p.membroId, p.nome])), [equipe]);
  const diaIso = f ? dataDigitada(f.dia) : "";
  const ausentes = useMemo(() => new Set((mi?.ausencias ?? []).filter((a) => diaIso && a.de <= diaIso && diaIso <= a.ate).map((a) => a.membroId)), [mi, diaIso]);

  if (!mi || !f) return <Tela voltar titulo={nova ? "Nova escala" : "Editar escala"}><Carregando /></Tela>;
  const m = mi.ministerio;
  const mudar = (fn: (x: Form) => void) => setF((a) => { const cp = JSON.parse(JSON.stringify(a)) as Form; fn(cp); return cp; });
  const vazias = f.vagas.filter((v) => !v.membroId).length;
  const vaga = escolher ? f.vagas.find((v) => v.chave === escolher) : undefined;

  const salvar = async (publicar: boolean) => {
    if (!f.titulo.trim()) return Alert.alert("Escala", "Dê um nome (ex.: Culto de domingo).");
    if (!diaIso) return Alert.alert("Escala", "Confira a data (dd/mm/aaaa).");
    if (!horaValida(f.hora)) return Alert.alert("Escala", "Confira o horário (hh:mm).");
    setSalvando(true);
    try {
      const r = await salvarEscala({ id, ministerioId: m.id, titulo: f.titulo, inicio: instante(diaIso, f.hora), local: f.local, observacoes: f.observacoes, vagas: f.vagas.map((v) => ({ id: v.id, funcaoId: v.funcaoId, membroId: v.membroId })), roteiro: f.roteiro, musicas: f.musicas, publicar });
      if (publicar && f.situacao === "rascunho") Alert.alert("Escala publicada", "Os escalados foram avisados no celular.");
      router.replace(`/escala/${r.id}`);
    } catch (e) { Alert.alert("Escala", e instanceof Error ? e.message : "Erro"); } finally { setSalvando(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      <Tela voltar titulo={`${m.nome} · ${nova ? "nova escala" : "editar"}`}>
        <View style={{ gap: 12 }}>
          <View style={{ gap: 6 }}><Rotulo>Nome</Rotulo><CampoTexto value={f.titulo} onChangeText={(t) => mudar((x) => { x.titulo = t; })} placeholder="Ex.: Culto de domingo" maxLength={80} /></View>
          {!f.titulo ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {[...new Set([...mi.series.map((s) => s.titulo), ...TITULOS])].slice(0, 6).map((t) => <Pressable key={t} onPress={() => mudar((x) => { x.titulo = t; })} style={{ borderWidth: 1, borderColor: c.borda, backgroundColor: c.sup, paddingHorizontal: 10, paddingVertical: 5 }}><T s={12.5} f={F.semi} cor={c.azul}>{t}</T></Pressable>)}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1.3, gap: 6 }}><Rotulo>Data</Rotulo><CampoTexto value={f.dia} onChangeText={(t) => mudar((x) => { x.dia = mascaraData(t); })} keyboardType="number-pad" placeholder="dd/mm/aaaa" /></View>
            <View style={{ flex: 1, gap: 6 }}><Rotulo>Horário</Rotulo><CampoTexto value={f.hora} onChangeText={(t) => mudar((x) => { x.hora = mascaraHora(t); })} keyboardType="number-pad" placeholder="hh:mm" /></View>
          </View>
          <View style={{ gap: 6 }}><Rotulo>Local (opcional)</Rotulo><CampoTexto value={f.local} onChangeText={(t) => mudar((x) => { x.local = t; })} placeholder="Templo" /></View>
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Sobre>Equipe</Sobre>
            <Pressable disabled={!vazias} onPress={() => { mudar((x) => { x.vagas = sugerirEquipe(x.vagas, equipe, ausentes); }); }} style={{ flexDirection: "row", alignItems: "center", gap: 5, opacity: vazias ? 1 : 0.4 }}><Sparkles size={16} color={c.azul} /><T s={12} f={F.negrito} cor={c.azul} style={{ letterSpacing: 1, textTransform: "uppercase" }}>Sugerir equipe</T></Pressable>
          </View>
          <Cartao style={{ padding: 0 }}>
            {m.funcoes.map((fn, gi) => {
              const vagas = f.vagas.filter((v) => v.funcaoId === fn.id);
              return (
                <View key={fn.id} style={{ paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: gi ? 1 : 0, borderTopColor: c.borda, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>{fn.nome}</T>
                    <Pressable hitSlop={10} onPress={() => mudar((x) => { x.vagas.push({ chave: chave(), funcaoId: fn.id }); })} accessibilityLabel={`Mais uma vaga de ${fn.nome}`}><Plus size={19} color={c.azul} /></Pressable>
                  </View>
                  {!vagas.length ? <T s={12.5} cor={c.suave}>Sem vaga nesta escala.</T> : null}
                  {vagas.map((v) => (
                    <View key={v.chave} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable onPress={() => setEscolher(v.chave)} style={{ flex: 1, height: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderStyle: v.membroId ? "solid" : "dashed", borderColor: c.borda, backgroundColor: v.membroId ? c.sup : "transparent" }}>
                        <UserRound size={16} color={c.suave} />
                        <Text numberOfLines={1} style={{ flex: 1, fontFamily: v.membroId ? F.semi : F.regular, fontSize: 15, color: v.membroId ? c.texto : c.suave }}>{v.membroId ? nomes[v.membroId] ?? "—" : "Escolher pessoa"}</Text>
                        {v.membroId && ausentes.has(v.membroId) ? <CalendarOff size={15} color={VERMELHO} /> : null}
                      </Pressable>
                      <Pressable hitSlop={8} onPress={() => mudar((x) => { x.vagas = x.vagas.filter((y) => y.chave !== v.chave); })} accessibilityLabel="Tirar a vaga"><X size={19} color={c.suave} /></Pressable>
                    </View>
                  ))}
                </View>
              );
            })}
          </Cartao>
          <T s={12.5} cor={c.suave}>Toque no + para mais de uma pessoa na mesma função e no × para tirar a vaga desta escala.</T>
        </View>

        {m.repertorio ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Sobre>Músicas</Sobre>
              <Pressable onPress={() => setMusica(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Plus size={16} color={c.azul} /><T s={12} f={F.negrito} cor={c.azul} style={{ letterSpacing: 1, textTransform: "uppercase" }}>Música</T></Pressable>
            </View>
            {!f.musicas.length ? <T s={13} cor={c.suave}>Nenhuma ainda. Busque no hinário pelo número ou nome, ou inclua uma música livre.</T> : (
              <Cartao style={{ padding: 0 }}>
                {f.musicas.map((mu, i) => (
                  <View key={mu.id || `m${i}`} style={{ padding: 12, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.borda }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <T s={13} f={F.negrito} cor={c.suave} style={{ width: 16 }}>{i + 1}</T>
                      <T f={F.semi} s={15} linhas={1} style={{ flex: 1 }}>{mu.hino ? `${mu.hino} · ` : ""}{mu.titulo}</T>
                      <Pressable disabled={!i} hitSlop={6} onPress={() => mudar((x) => { const [a] = x.musicas.splice(i, 1); x.musicas.splice(i - 1, 0, a!); })} style={{ opacity: i ? 1 : 0.3 }}><ArrowUp size={17} color={c.suave} /></Pressable>
                      <Pressable disabled={i === f.musicas.length - 1} hitSlop={6} onPress={() => mudar((x) => { const [a] = x.musicas.splice(i, 1); x.musicas.splice(i + 1, 0, a!); })} style={{ opacity: i === f.musicas.length - 1 ? 0.3 : 1 }}><ArrowDown size={17} color={c.suave} /></Pressable>
                      <Pressable hitSlop={6} onPress={() => mudar((x) => { x.musicas.splice(i, 1); })}><Trash2 size={17} color={c.suave} /></Pressable>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, paddingLeft: 24 }}>
                      <CampoTexto value={mu.tom ?? ""} onChangeText={(t) => mudar((x) => { x.musicas[i]!.tom = t.trim() || undefined; })} placeholder="Tom" autoCapitalize="characters" maxLength={4} style={{ width: 70, height: 42, fontSize: 15 }} />
                      <CampoTexto value={mu.link ?? ""} onChangeText={(t) => mudar((x) => { x.musicas[i]!.link = t.trim() || undefined; })} placeholder="Link (YouTube, cifra)" keyboardType="url" autoCapitalize="none" style={{ flex: 1, height: 42, fontSize: 15 }} />
                    </View>
                  </View>
                ))}
              </Cartao>
            )}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Sobre>Roteiro (opcional)</Sobre>{duracaoRoteiro(f.roteiro) ? <T s={12.5} f={F.semi} cor={c.suave}>{duracaoRoteiro(f.roteiro)} min</T> : null}</View>
          {f.roteiro.map((r, i) => (
            <View key={r.id || `r${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CampoTexto value={r.item} onChangeText={(t) => mudar((x) => { x.roteiro[i]!.item = t; })} placeholder="Ex.: Louvor, Avisos" style={{ flex: 1, height: 44, fontSize: 15 }} />
              <CampoTexto value={r.minutos ? String(r.minutos) : ""} onChangeText={(t) => mudar((x) => { x.roteiro[i]!.minutos = Number(t.replace(/\D/g, "")) || undefined; })} placeholder="min" keyboardType="number-pad" style={{ width: 64, height: 44, fontSize: 15, textAlign: "center", paddingHorizontal: 4 }} />
              <Pressable hitSlop={8} onPress={() => mudar((x) => { x.roteiro.splice(i, 1); })}><X size={19} color={c.suave} /></Pressable>
            </View>
          ))}
          <Pressable onPress={() => mudar((x) => { x.roteiro.push({ id: "", item: "" }); })} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Plus size={16} color={c.azul} /><T s={12} f={F.negrito} cor={c.azul} style={{ letterSpacing: 1, textTransform: "uppercase" }}>Item do roteiro</T></Pressable>
        </View>

        <View style={{ gap: 6 }}><Rotulo>Observações (opcional)</Rotulo><CampoTexto value={f.observacoes} onChangeText={(t) => mudar((x) => { x.observacoes = t; })} multiline placeholder="Ex.: ensaio às 8h; roupa escura" /></View>
        <View style={{ height: 70 }} />
      </Tela>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 8, padding: 12, paddingBottom: ins.bottom + 12, backgroundColor: c.sup, borderTopWidth: 1, borderTopColor: c.borda }}>
        {f.situacao === "rascunho" ? (
          <>
            <Botao tipo="sec" style={{ flex: 1, paddingHorizontal: 6 }} desativado={salvando} onPress={() => salvar(false)}>Rascunho</Botao>
            <Botao style={{ flex: 1, paddingHorizontal: 6 }} carregando={salvando} desativado={f.vagas.every((v) => !v.membroId)} onPress={() => salvar(true)}>Publicar</Botao>
          </>
        ) : <Botao style={{ flex: 1 }} carregando={salvando} icone={<Check size={17} color="#fff" />} onPress={() => salvar(false)}>Salvar e avisar</Botao>}
      </View>

      <Folha aberta={!!vaga} titulo={m.funcoes.find((x) => x.id === vaga?.funcaoId)?.nome ?? "Escolher"} aoFechar={() => setEscolher(null)}>
        {vaga ? <Escolha mi={mi} funcaoId={vaga.funcaoId} atual={vaga.membroId} ausentes={ausentes} dia={diaIso} naEscala={new Set(f.vagas.filter((v) => v.chave !== vaga.chave).map((v) => v.membroId).filter(Boolean) as string[])}
          aoEscolher={(membroId) => { mudar((x) => { x.vagas.find((v) => v.chave === vaga.chave)!.membroId = membroId; }); setEscolher(null); }} /> : null}
      </Folha>
      <Folha aberta={musica} titulo="Adicionar música" aoFechar={() => setMusica(false)}>
        <BuscarMusica usadas={mi.musicasUsadas} aoAdicionar={(mu) => { mudar((x) => { x.musicas.push(mu); }); setMusica(false); }} />
      </Folha>
    </View>
  );
}

function Escolha({ mi, funcaoId, atual, ausentes, dia, naEscala, aoEscolher }: { mi: DadosMinisterio; funcaoId: string; atual?: string; ausentes: Set<string>; dia: string; naEscala: Set<string>; aoEscolher: (id?: string) => void }) {
  const { c } = useTema();
  const [outros, setOutros] = useState(false);
  const com = mi.equipe.filter((p) => p.funcoes.includes(funcaoId)).sort((a, b) => Number(ausentes.has(a.membroId)) - Number(ausentes.has(b.membroId)) || a.vezes90 - b.vezes90);
  const resto = mi.equipe.filter((p) => !p.funcoes.includes(funcaoId));
  const Linha = ({ p }: { p: DadosMinisterio["equipe"][number] }) => {
    const aus = mi.ausencias.find((a) => a.membroId === p.membroId && dia && a.de <= dia && dia <= a.ate);
    return (
      <Pressable onPress={() => aoEscolher(p.membroId)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.borda, backgroundColor: p.membroId === atual ? c.realce : "transparent" }}>
        <View style={{ flex: 1, gap: 1 }}>
          <T f={F.semi} s={15} cor={aus ? c.suave : c.texto}>{p.nome}</T>
          <T s={12} cor={c.suave}>{p.vezes90 ? `${p.vezes90}× em 90 dias` : "Não serviu nos últimos 90 dias"}{p.ultima ? ` · última ${dataBR(diaDe(p.ultima))}` : ""}{naEscala.has(p.membroId) ? " · já está nesta escala" : ""}</T>
          {aus ? <T s={12} f={F.semi} cor={VERMELHO}>Ausente{aus.motivo ? `: ${aus.motivo}` : ""}</T> : null}
        </View>
        {p.membroId === atual ? <Check size={18} color={AZUL} /> : null}
      </Pressable>
    );
  };
  return (
    <View style={{ gap: 12 }}>
      {com.length ? <View>{com.map((p) => <Linha key={p.membroId} p={p} />)}</View> : <T s={13.5} cor={c.suave}>Ninguém tem esta função ainda. Ajuste em Ministério → Equipe.</T>}
      {resto.length ? (
        <View>
          <Pressable onPress={() => setOutros(!outros)}><T s={12} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1, textTransform: "uppercase" }}>{outros ? "Esconder" : "Ver"} outras pessoas do ministério</T></Pressable>
          {outros ? resto.map((p) => <Linha key={p.membroId} p={p} />) : null}
        </View>
      ) : null}
      {atual ? <Botao tipo="sec" onPress={() => aoEscolher(undefined)}>Deixar a definir</Botao> : null}
    </View>
  );
}

function BuscarMusica({ usadas, aoAdicionar }: { usadas: DadosMinisterio["musicasUsadas"]; aoAdicionar: (m: Musica) => void }) {
  const { c } = useTema();
  const [q, setQ] = useState("");
  const hinos = q.trim() ? buscarHinos(q).slice(0, 8) : [];
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const ja = usadas.filter((u) => !u.hino && (!q.trim() || norm(`${u.titulo} ${u.artista ?? ""}`).includes(norm(q)))).slice(0, 8);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ justifyContent: "center" }}>
        <Search size={17} color={c.suave} style={{ position: "absolute", left: 14, zIndex: 1 }} />
        <CampoTexto autoFocus value={q} onChangeText={setQ} placeholder="Número do hino ou nome da música" style={{ paddingLeft: 40 }} />
      </View>
      {hinos.length ? (
        <View><Rotulo>Salmos e Hinos</Rotulo>{hinos.map((h) => (
          <Pressable key={h.numero} onPress={() => aoAdicionar({ id: "", hino: h.numero, titulo: h.titulo, tom: usadas.find((u) => u.hino === h.numero)?.tom })} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.borda }}>
            <T f={F.negrito} s={14} cor={c.azul} style={{ width: 40 }}>{h.numero}</T><T s={15} linhas={1} style={{ flex: 1 }}>{h.titulo}</T><Plus size={17} color={c.azul} />
          </Pressable>
        ))}</View>
      ) : null}
      {ja.length ? (
        <View><Rotulo>Já tocadas no ministério</Rotulo>{ja.map((u) => (
          <Pressable key={u.titulo} onPress={() => aoAdicionar({ id: "", titulo: u.titulo, artista: u.artista, tom: u.tom, link: u.link })} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.borda }}>
            <View style={{ flex: 1 }}><T s={15} linhas={1}>{u.titulo}</T><T s={12} cor={c.suave}>{[u.artista, u.tom && `tom ${u.tom}`, `${u.vezes}×`].filter(Boolean).join(" · ")}</T></View><Plus size={17} color={c.azul} />
          </Pressable>
        ))}</View>
      ) : null}
      {q.trim() && !/^\d+$/.test(q.trim()) ? <Botao tipo="sec" icone={<Music size={16} color={AZUL} />} onPress={() => aoAdicionar({ id: "", titulo: q.trim() })}>Incluir como música livre</Botao> : null}
    </View>
  );
}
