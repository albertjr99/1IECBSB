/**
 * Montar (ou editar) uma escala, passo a passo, do jeito mais simples possível:
 * 1. Quando?  2. Quem vai servir?  3. Músicas (no louvor)  4. Tudo certo? → Publicar.
 */
import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Guitar, Headphones, Minus, Music, Plus, Search, Send, Sparkles, Trash2, UserPlus, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Botao, Cartao, Carregando, T, Tela } from "@/componentes/ui";
import { Folha, Rotulo } from "@/componentes/Folha";
import { CampoData, CampoHora, dataLonga, proximoDia } from "@/componentes/Calendario";
import { CampoTexto } from "@/componentes/MinhasEscalas";
import { FotoPessoa } from "@/componentes/Pessoa";
import { IconeMinisterio } from "@/componentes/IconeMinisterio";
import { carregarMinisterio, diaDe, instante, salvarEscala, sugerirEquipe, verEscala, type DadosMinisterio, type ItemRoteiro, type Musica } from "@/lib/escalas";
import { buscarHinos } from "@/lib/hinario";
import { AZUL, F, VERMELHO, useTema } from "@/lib/tema";
import { emBrasilia, nomeCurto } from "@/lib/util";

type VagaForm = { id?: string; chave: string; funcaoId: string; membroId?: string };
type Form = { titulo: string; dia: string; hora: string; local: string; observacoes: string; vagas: VagaForm[]; roteiro: ItemRoteiro[]; musicas: Musica[]; situacao: "rascunho" | "publicada" };

const chave = () => Math.random().toString(36).slice(2, 9);
const NOMES = ["Culto de domingo", "Culto de quarta", "Ensaio", "Escola Bíblica", "Culto especial", "Santa Ceia"];
const TONS_RAPIDOS = ["C", "D", "E", "F", "G", "A", "B", "Bb", "Eb", "Am", "Em", "Dm"];
const p2 = (n: number) => String(n).padStart(2, "0");
const toque = () => Haptics.selectionAsync().catch(() => {});

export default function EditarEscala() {
  const { id, min } = useLocalSearchParams<{ id?: string; min: string }>();
  const nova = !id;
  const { c } = useTema();
  const ins = useSafeAreaInsets();
  const [mi, setMi] = useState<DadosMinisterio | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [passo, setPasso] = useState(0);
  const [escolher, setEscolher] = useState<string | null>(null);
  const [musica, setMusica] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [outroNome, setOutroNome] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const m = await carregarMinisterio(min);
        setMi(m);
        if (nova) {
          setF({ titulo: "", dia: proximoDia(0), hora: "10:00", local: "", observacoes: "", vagas: m.ministerio.funcoes.map((fn) => ({ chave: chave(), funcaoId: fn.id })), roteiro: [], musicas: [], situacao: "rascunho" });
        } else {
          const v = await verEscala(id!);
          const b = emBrasilia(v.escala.inicio);
          setF({ titulo: v.escala.titulo, dia: diaDe(v.escala.inicio), hora: `${p2(b.hora)}:${p2(b.minuto)}`, local: v.escala.local ?? "", observacoes: v.escala.observacoes ?? "", vagas: v.escala.vagas.map((x) => ({ id: x.id, chave: x.id, funcaoId: x.funcaoId, membroId: x.membroId })), roteiro: v.escala.roteiro, musicas: v.escala.musicas, situacao: v.escala.situacao });
          setOutroNome(!NOMES.includes(v.escala.titulo));
        }
      } catch (e) { Alert.alert("Escala", e instanceof Error ? e.message : "Erro"); router.back(); }
    })();
  }, [id, min, nova]);

  const equipe = useMemo(() => mi?.equipe ?? [], [mi]);
  const pessoa = useMemo(() => new Map(equipe.map((p) => [p.membroId, p])), [equipe]);
  const ausentes = useMemo(() => new Set((mi?.ausencias ?? []).filter((a) => f && a.de <= f.dia && f.dia <= a.ate).map((a) => a.membroId)), [mi, f]);

  if (!mi || !f) return <Tela voltar titulo={nova ? "Nova escala" : "Editar escala"}><Carregando /></Tela>;
  const m = mi.ministerio;
  const PASSOS = ["Quando?", "Quem vai servir?", ...(m.repertorio ? ["Músicas"] : []), "Tudo certo?"];
  const ultimo = PASSOS.length - 1;
  const mudar = (fn: (x: Form) => void) => setF((a) => { const cp = JSON.parse(JSON.stringify(a)) as Form; fn(cp); return cp; });
  const preenchidas = f.vagas.filter((v) => v.membroId).length;
  const vaga = escolher ? f.vagas.find((v) => v.chave === escolher) : undefined;
  const nomeDe = (id?: string) => (id ? pessoa.get(id)?.nome ?? "—" : "");
  // próximos domingos e a próxima quarta, num toque
  const atalhos = [0, 7, 14, 21].map((n, i) => ({ rotulo: i === 0 ? "Domingo" : `Dom. +${i}`, valor: dataSoma(proximoDia(0), n) }))
    .concat([{ rotulo: "Quarta", valor: proximoDia(3) }]);

  const avancar = () => {
    if (passo === 0 && !f.titulo.trim()) { Alert.alert("Falta o nome", "Toque em um dos nomes (ex.: Culto de domingo)."); return; }
    toque(); setPasso(Math.min(ultimo, passo + 1));
  };
  const salvar = async (publicar: boolean) => {
    setSalvando(true);
    try {
      const r = await salvarEscala({ id, ministerioId: m.id, titulo: f.titulo, inicio: instante(f.dia, f.hora), local: f.local, observacoes: f.observacoes, vagas: f.vagas.map((v) => ({ id: v.id, funcaoId: v.funcaoId, membroId: v.membroId })), roteiro: f.roteiro, musicas: f.musicas, publicar });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (publicar && f.situacao === "rascunho") Alert.alert("Escala publicada! 🎉", "Cada pessoa recebeu um aviso no celular para confirmar.");
      router.replace(`/escala/${r.id}`);
    } catch (e) { Alert.alert("Escala", e instanceof Error ? e.message : "Erro"); } finally { setSalvando(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      <Tela voltar titulo={nova ? `Nova escala · ${m.nome}` : `Editar · ${m.nome}`}>
        {/* progresso */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {PASSOS.map((p, i) => <Pressable key={p} onPress={() => (i < passo || f.titulo.trim()) && setPasso(i)} style={{ flex: 1, height: 6, backgroundColor: i <= passo ? AZUL : c.borda }} accessibilityLabel={`Passo ${i + 1}: ${p}`} />)}
          </View>
          <T s={12} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.5, textTransform: "uppercase" }}>Passo {passo + 1} de {PASSOS.length}</T>
          <Text style={{ fontFamily: F.negrito, fontSize: 28, lineHeight: 33, color: c.escuro ? c.texto : AZUL }}>{PASSOS[passo]}</Text>
        </View>

        {passo === 0 ? (
          <View style={{ gap: 18 }}>
            <View style={{ gap: 8 }}>
              <Rotulo>O que é?</Rotulo>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[...new Set([...mi.series.map((s) => s.titulo), ...NOMES])].slice(0, 8).map((t) => {
                  const sel = f.titulo === t && !outroNome;
                  return (
                    <Pressable key={t} onPress={() => { toque(); setOutroNome(false); mudar((x) => { x.titulo = t; }); }} style={{ width: "48.6%", minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center", borderWidth: sel ? 2 : 1, borderColor: sel ? AZUL : c.borda, backgroundColor: sel ? c.realce : c.sup }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {sel ? <Check size={17} color={AZUL} /> : null}
                        <T s={15} f={sel ? F.negrito : F.semi} cor={sel ? c.azul : c.texto} style={{ flex: 1 }}>{t}</T>
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable onPress={() => { toque(); setOutroNome(true); mudar((x) => { x.titulo = NOMES.includes(x.titulo) ? "" : x.titulo; }); }} style={{ width: "48.6%", minHeight: 56, paddingHorizontal: 14, justifyContent: "center", borderWidth: outroNome ? 2 : 1, borderStyle: "dashed", borderColor: outroNome ? AZUL : c.borda }}>
                  <T s={15} f={F.semi} cor={c.azul}>Outro nome…</T>
                </Pressable>
              </View>
              {outroNome ? <CampoTexto autoFocus value={f.titulo} onChangeText={(t) => mudar((x) => { x.titulo = t; })} placeholder="Ex.: Culto de Natal" maxLength={80} /> : null}
            </View>
            <CampoData rotulo="Dia" valor={f.dia} aoMudar={(v) => mudar((x) => { x.dia = v; })} atalhos={atalhos} />
            {mi.escalas.filter((e) => e.id !== id && diaDe(e.inicio) === f.dia).map((e) => (
              <Pressable key={e.id} onPress={() => router.replace(`/escala/${e.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: VERMELHO, backgroundColor: c.realce }}>
                <View style={{ flex: 1 }}>
                  <T s={13.5} f={F.negrito}>Já existe uma escala neste dia</T>
                  <T s={13} cor={c.suave}>{e.titulo} às {horaDe(e.inicio)} ({e.situacao === "rascunho" ? "rascunho" : "publicada"}). Toque para abrir em vez de criar outra.</T>
                </View>
                <ChevronRight size={18} color={c.suave} />
              </Pressable>
            ))}
            <CampoHora rotulo="Horário" valor={f.hora} aoMudar={(v) => mudar((x) => { x.hora = v; })} />
            <Pressable onPress={() => setDetalhes(!detalhes)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ChevronDown size={18} color={c.azul} style={{ transform: [{ rotate: detalhes ? "180deg" : "0deg" }] }} />
              <T s={13} f={F.negrito} cor={c.azul} style={{ letterSpacing: 1, textTransform: "uppercase" }}>Local e observações (opcional)</T>
            </Pressable>
            {detalhes ? (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 6 }}><Rotulo>Local</Rotulo><CampoTexto value={f.local} onChangeText={(t) => mudar((x) => { x.local = t; })} placeholder="Templo" /></View>
                <View style={{ gap: 6 }}><Rotulo>Observações</Rotulo><CampoTexto value={f.observacoes} onChangeText={(t) => mudar((x) => { x.observacoes = t; })} multiline placeholder="Ex.: ensaio às 8h; roupa escura" /></View>
              </View>
            ) : null}
          </View>
        ) : null}

        {passo === 1 ? (
          <View style={{ gap: 14 }}>
            <Pressable onPress={() => { toque(); mudar((x) => { x.vagas = sugerirEquipe(x.vagas, equipe, ausentes); }); }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: AZUL, opacity: pressed ? 0.88 : 1 })}>
              <Sparkles size={26} color="#fff" />
              <View style={{ flex: 1 }}>
                <T f={F.negrito} s={16} cor="#fff">Montar a equipe para mim</T>
                <T s={12.5} cor="#D9E6EF">Escolhe quem serviu menos e não marcou ausência. Depois é só ajustar.</T>
              </View>
            </Pressable>
            <T s={13} cor={c.suave} centro>{preenchidas} de {f.vagas.length} lugares escolhidos · toque num lugar para escolher a pessoa</T>
            {m.funcoes.map((fn) => {
              const vagas = f.vagas.filter((v) => v.funcaoId === fn.id);
              if (!vagas.length) return null;
              return (
                <Cartao key={fn.id} style={{ padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <T f={F.negrito} s={16}>{fn.nome}</T>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Pressable hitSlop={8} onPress={() => { toque(); mudar((x) => { const k = x.vagas.map((v) => v.funcaoId).lastIndexOf(fn.id); x.vagas.splice(k, 1); }); }} style={{ width: 34, height: 34, borderWidth: 1, borderColor: c.borda, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`Menos ${fn.nome}`}><Minus size={17} color={c.azul} /></Pressable>
                      <T f={F.negrito} s={15} style={{ width: 22, textAlign: "center" }}>{vagas.length}</T>
                      <Pressable hitSlop={8} onPress={() => { toque(); mudar((x) => { x.vagas.push({ chave: chave(), funcaoId: fn.id }); }); }} style={{ width: 34, height: 34, borderWidth: 1, borderColor: c.borda, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`Mais ${fn.nome}`}><Plus size={17} color={c.azul} /></Pressable>
                    </View>
                  </View>
                  {vagas.map((v) => {
                    const p = v.membroId ? pessoa.get(v.membroId) : undefined;
                    return (
                      <Pressable key={v.chave} onPress={() => { toque(); setEscolher(v.chave); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderWidth: 1, borderStyle: p ? "solid" : "dashed", borderColor: p ? c.borda : AZUL, backgroundColor: p ? c.sup : c.realce, opacity: pressed ? 0.85 : 1 })}>
                        {p ? <FotoPessoa id={p.membroId} nome={p.nome} foto={p.foto} tam={44} /> : <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderStyle: "dashed", borderColor: AZUL, alignItems: "center", justifyContent: "center" }}><UserPlus size={20} color={AZUL} /></View>}
                        <View style={{ flex: 1 }}>
                          <T f={p ? F.negrito : F.semi} s={15.5} cor={p ? c.texto : c.azul}>{p ? nomeCurto(p.nome) : "Escolher pessoa"}</T>
                          {p && ausentes.has(p.membroId) ? <T s={12} f={F.semi} cor={VERMELHO}>Marcou ausência neste dia</T> : p ? <T s={12} cor={c.suave}>{p.vezes90 ? `Serviu ${p.vezes90}× nos últimos 90 dias` : "Não serviu nos últimos 90 dias"}</T> : null}
                        </View>
                        <ChevronRight size={18} color={c.suave} />
                      </Pressable>
                    );
                  })}
                </Cartao>
              );
            })}
            {m.funcoes.some((fn) => !f.vagas.some((v) => v.funcaoId === fn.id)) ? (
              <View style={{ gap: 8 }}>
                <Rotulo>Incluir mais funções</Rotulo>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {m.funcoes.filter((fn) => !f.vagas.some((v) => v.funcaoId === fn.id)).map((fn) => (
                    <Pressable key={fn.id} onPress={() => { toque(); mudar((x) => { x.vagas.push({ chave: chave(), funcaoId: fn.id }); }); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: c.borda, backgroundColor: c.sup }}>
                      <Plus size={15} color={c.azul} /><T s={14} f={F.semi} cor={c.azul}>{fn.nome}</T>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {m.repertorio && passo === 2 ? (
          <View style={{ gap: 12 }}>
            {f.musicas.length === 0 ? (
              <Cartao style={{ padding: 22, alignItems: "center", gap: 10 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.realce, alignItems: "center", justifyContent: "center" }}><Music size={26} color={c.azul} /></View>
                <T s={14.5} cor={c.suave} centro>Busque um hino pelo número ou pelo nome, ou inclua qualquer música.</T>
              </Cartao>
            ) : f.musicas.map((mu, i) => (
              <Cartao key={mu.id || `m${i}`} style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: AZUL, alignItems: "center", justifyContent: "center" }}><T s={13} f={F.negrito} cor="#fff">{i + 1}</T></View>
                  <T f={F.negrito} s={15.5} linhas={2} style={{ flex: 1 }}>{mu.hino ? `${mu.hino} · ` : ""}{mu.titulo}</T>
                  <Pressable hitSlop={8} disabled={!i} onPress={() => mudar((x) => { const [a] = x.musicas.splice(i, 1); x.musicas.splice(i - 1, 0, a!); })} style={{ opacity: i ? 1 : 0.3 }} accessibilityLabel="Subir"><ChevronDown size={20} color={c.suave} style={{ transform: [{ rotate: "180deg" }] }} /></Pressable>
                  <Pressable hitSlop={8} onPress={() => mudar((x) => { x.musicas.splice(i, 1); })} accessibilityLabel="Tirar"><Trash2 size={18} color={c.suave} /></Pressable>
                </View>
                <View style={{ gap: 6 }}>
                  <Rotulo>Tom</Rotulo>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {TONS_RAPIDOS.map((t) => { const sel = mu.tom === t; return <Pressable key={t} onPress={() => { toque(); mudar((x) => { x.musicas[i]!.tom = sel ? undefined : t; }); }} style={{ minWidth: 42, height: 38, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: sel ? AZUL : c.borda, backgroundColor: sel ? AZUL : "transparent" }}><T s={14} f={F.negrito} cor={sel ? "#fff" : c.texto}>{t}</T></Pressable>; })}
                    <CampoTexto value={mu.tom && !TONS_RAPIDOS.includes(mu.tom) ? mu.tom : ""} onChangeText={(t) => mudar((x) => { x.musicas[i]!.tom = t.trim() || undefined; })} placeholder="outro" autoCapitalize="characters" maxLength={4} style={{ width: 70, height: 38, fontSize: 14 }} />
                  </ScrollView>
                </View>
                <LinkCampo icone={<Headphones size={17} color={c.azul} />} rotulo="Link para ouvir" placeholder="YouTube, Spotify…" valor={mu.link ?? ""} aoMudar={(t) => mudar((x) => { x.musicas[i]!.link = t.trim() || undefined; })} />
                <LinkCampo icone={<Guitar size={17} color={c.azul} />} rotulo="Link da cifra" placeholder="Cifra Club, PDF…" valor={mu.cifra ?? ""} aoMudar={(t) => mudar((x) => { x.musicas[i]!.cifra = t.trim() || undefined; })} />
              </Cartao>
            ))}
            <Botao tipo="sec" icone={<Plus size={17} color={c.escuro ? c.texto : AZUL} />} onPress={() => setMusica(true)}>Adicionar música</Botao>
          </View>
        ) : null}

        {passo === ultimo ? (
          <View style={{ gap: 14 }}>
            <Cartao filete style={{ padding: 16, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><IconeMinisterio chave={m.icone} size={15} color={c.suave} /><T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.5, textTransform: "uppercase" }}>{m.nome}</T></View>
              <Text style={{ fontFamily: F.negrito, fontSize: 21, color: c.escuro ? c.texto : AZUL }}>{f.titulo || "Sem nome"}</Text>
              <T s={15} f={F.semi}>{dataLonga(f.dia)} · {f.hora.replace(":", "h")}{f.local ? ` · ${f.local}` : ""}</T>
              <Pressable onPress={() => setPasso(0)}><T s={12.5} f={F.semi} cor={c.azul} style={{ textDecorationLine: "underline" }}>Mudar</T></Pressable>
            </Cartao>
            <Cartao style={{ padding: 0 }}>
              {m.funcoes.map((fn) => f.vagas.filter((v) => v.funcaoId === fn.id).map((v, k) => (
                <Pressable key={v.chave} onPress={() => { setPasso(1); setEscolher(v.chave); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.borda }}>
                  {v.membroId ? <FotoPessoa id={v.membroId} nome={nomeDe(v.membroId)} foto={pessoa.get(v.membroId)?.foto} tam={38} /> : <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderStyle: "dashed", borderColor: VERMELHO }} />}
                  <View style={{ flex: 1 }}>
                    <T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.2, textTransform: "uppercase" }}>{fn.nome}{k ? ` ${k + 1}` : ""}</T>
                    <T s={15} f={F.semi} cor={v.membroId ? c.texto : VERMELHO}>{v.membroId ? nomeCurto(nomeDe(v.membroId)) : "Ainda sem ninguém"}</T>
                  </View>
                </Pressable>
              )))}
            </Cartao>
            {m.repertorio ? <T s={14} cor={c.suave}>{f.musicas.length ? `${f.musicas.length} música(s) escolhida(s)` : "Nenhuma música ainda (pode incluir depois)."}</T> : null}
            {f.vagas.some((v) => !v.membroId) ? <T s={13} cor={VERMELHO}>Há lugares sem ninguém. Pode publicar assim e completar depois.</T> : null}
          </View>
        ) : null}
        <View style={{ height: 96 }} />
      </Tela>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, gap: 8, padding: 12, paddingBottom: ins.bottom + 12, backgroundColor: c.sup, borderTopWidth: 1, borderTopColor: c.borda }}>
        {passo < ultimo ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {passo > 0 ? <Botao tipo="sec" style={{ width: 120, paddingHorizontal: 6 }} icone={<ChevronLeft size={17} color={c.escuro ? c.texto : AZUL} />} onPress={() => setPasso(passo - 1)}>Voltar</Botao> : null}
            <Botao style={{ flex: 1 }} onPress={avancar}>Continuar</Botao>
          </View>
        ) : f.situacao === "rascunho" ? (
          <>
            <Botao carregando={salvando} desativado={!preenchidas} icone={<Send size={17} color="#fff" />} onPress={() => salvar(true)}>Publicar e avisar a equipe</Botao>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Botao tipo="sec" style={{ width: 120, paddingHorizontal: 6 }} onPress={() => setPasso(passo - 1)}>Voltar</Botao>
              <Botao tipo="fantasma" style={{ flex: 1 }} desativado={salvando} onPress={() => salvar(false)}>Guardar rascunho</Botao>
            </View>
          </>
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Botao tipo="sec" style={{ width: 120, paddingHorizontal: 6 }} onPress={() => setPasso(passo - 1)}>Voltar</Botao>
            <Botao style={{ flex: 1 }} carregando={salvando} icone={<Check size={17} color="#fff" />} onPress={() => salvar(false)}>Salvar e avisar</Botao>
          </View>
        )}
      </View>

      <Folha aberta={!!vaga} titulo={`Quem vai no ${m.funcoes.find((x) => x.id === vaga?.funcaoId)?.nome ?? ""}?`} aoFechar={() => setEscolher(null)}>
        {vaga ? <Escolha mi={mi} funcaoId={vaga.funcaoId} atual={vaga.membroId} ausentes={ausentes} naEscala={new Set(f.vagas.filter((v) => v.chave !== vaga.chave).map((v) => v.membroId).filter(Boolean) as string[])}
          aoEscolher={(membroId) => { toque(); mudar((x) => { x.vagas.find((v) => v.chave === vaga.chave)!.membroId = membroId; }); setEscolher(null); }} /> : null}
      </Folha>
      <Folha aberta={musica} titulo="Adicionar música" aoFechar={() => setMusica(false)}>
        <BuscarMusica usadas={mi.musicasUsadas} aoAdicionar={(mu) => { toque(); mudar((x) => { x.musicas.push(mu); }); setMusica(false); }} />
      </Folha>
    </View>
  );
}

function horaDe(iso: string) { const b = emBrasilia(iso); return `${p2(b.hora)}h${p2(b.minuto)}`; }

function dataSoma(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function LinkCampo({ icone, rotulo, placeholder, valor, aoMudar }: { icone: React.ReactNode; rotulo: string; placeholder: string; valor: string; aoMudar: (t: string) => void }) {
  const { c } = useTema();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>{icone}<Rotulo>{rotulo}</Rotulo>{valor ? <ExternalLink size={13} color={c.suave} /> : null}</View>
      <CampoTexto value={valor} onChangeText={aoMudar} placeholder={placeholder} keyboardType="url" autoCapitalize="none" autoCorrect={false} style={{ height: 46, fontSize: 15 }} />
    </View>
  );
}

function Grade({ lista, atual, ausentes, naEscala, aoEscolher }: { lista: DadosMinisterio["equipe"]; atual?: string; ausentes: Set<string>; naEscala: Set<string>; aoEscolher: (id?: string) => void }) {
  const { c } = useTema();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {lista.map((p) => {
        const sel = p.membroId === atual;
        const aus = ausentes.has(p.membroId);
        const ja = naEscala.has(p.membroId);
        return (
          <Pressable key={p.membroId} onPress={() => aoEscolher(p.membroId)} style={({ pressed }) => ({ width: "31.6%", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 4, borderWidth: sel ? 2 : 1, borderColor: sel ? AZUL : c.borda, backgroundColor: sel ? c.realce : c.sup, opacity: pressed ? 0.85 : aus ? 0.55 : 1 })}>
            <View>
              <FotoPessoa id={p.membroId} nome={p.nome} foto={p.foto} tam={60} />
              {sel ? <View style={{ position: "absolute", right: -4, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: AZUL, borderWidth: 2, borderColor: c.sup, alignItems: "center", justifyContent: "center" }}><Check size={13} color="#fff" strokeWidth={3} /></View> : null}
            </View>
            <T s={13} f={F.negrito} centro linhas={2}>{nomeCurto(p.nome)}</T>
            <T s={11} f={F.semi} cor={aus ? VERMELHO : ja ? c.azul : c.suave} centro>{aus ? "Ausente" : ja ? "Já está na escala" : p.vezes90 ? `${p.vezes90}× em 90 dias` : "Disponível"}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Escolher a pessoa: rostos grandes; quem faz a função primeiro. */
function Escolha({ mi, funcaoId, atual, ausentes, naEscala, aoEscolher }: { mi: DadosMinisterio; funcaoId: string; atual?: string; ausentes: Set<string>; naEscala: Set<string>; aoEscolher: (id?: string) => void }) {
  const { c } = useTema();
  const [outros, setOutros] = useState(false);
  const com = mi.equipe.filter((p) => p.funcoes.includes(funcaoId)).sort((a, b) => Number(ausentes.has(a.membroId)) - Number(ausentes.has(b.membroId)) || a.vezes90 - b.vezes90);
  const resto = mi.equipe.filter((p) => !p.funcoes.includes(funcaoId));
  return (
    <View style={{ gap: 14 }}>
      {com.length ? <Grade lista={com} atual={atual} ausentes={ausentes} naEscala={naEscala} aoEscolher={aoEscolher} /> : <T s={14} cor={c.suave}>Ninguém tem esta função ainda. Na tela do ministério, em Equipe, toque na pessoa e marque a função.</T>}
      {resto.length ? (
        <View style={{ gap: 10 }}>
          <Pressable onPress={() => setOutros(!outros)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><ChevronDown size={18} color={c.azul} style={{ transform: [{ rotate: outros ? "180deg" : "0deg" }] }} /><T s={13} f={F.negrito} cor={c.azul}>Outras pessoas do ministério ({resto.length})</T></Pressable>
          {outros ? <Grade lista={resto} atual={atual} ausentes={ausentes} naEscala={naEscala} aoEscolher={aoEscolher} /> : null}
        </View>
      ) : null}
      {atual ? <Botao tipo="sec" icone={<X size={16} color={c.escuro ? c.texto : AZUL} />} onPress={() => aoEscolher(undefined)}>Deixar este lugar vazio</Botao> : null}
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
          <Pressable key={h.numero} onPress={() => { const u = usadas.find((x) => x.hino === h.numero); aoAdicionar({ id: "", hino: h.numero, titulo: h.titulo, tom: u?.tom, link: u?.link, cifra: u?.cifra }); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borda }}>
            <T f={F.negrito} s={15} cor={c.azul} style={{ width: 44 }}>{h.numero}</T><T s={15} linhas={1} style={{ flex: 1 }}>{h.titulo}</T><Plus size={18} color={c.azul} />
          </Pressable>
        ))}</View>
      ) : null}
      {ja.length ? (
        <View><Rotulo>Já tocadas no ministério</Rotulo>{ja.map((u) => (
          <Pressable key={u.titulo} onPress={() => aoAdicionar({ id: "", titulo: u.titulo, artista: u.artista, tom: u.tom, link: u.link, cifra: u.cifra })} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borda }}>
            <View style={{ flex: 1 }}><T s={15} linhas={1}>{u.titulo}</T><T s={12} cor={c.suave}>{[u.artista, u.tom && `tom ${u.tom}`, `${u.vezes}× tocada`].filter(Boolean).join(" · ")}</T></View><Plus size={18} color={c.azul} />
          </Pressable>
        ))}</View>
      ) : null}
      {q.trim() && !/^\d+$/.test(q.trim()) ? <Botao tipo="sec" icone={<Music size={16} color={AZUL} />} onPress={() => aoAdicionar({ id: "", titulo: q.trim() })}>Incluir “{q.trim()}”</Botao> : null}
      {!q.trim() && !ja.length ? <T s={13.5} cor={c.suave}>Digite o número do hino (ex.: 15) ou o nome da música.</T> : null}
    </View>
  );
}


