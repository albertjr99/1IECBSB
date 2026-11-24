/**
 * Bíblia (ARA e NVI): escolha fácil de livro → capítulo → versículo, títulos de
 * seção, deslizar para trocar de capítulo, comparar versões, guardar e compartilhar.
 */
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { ArrowLeftRight, Bookmark, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Search, Share2, Type, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, PanResponder, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Carregando, T } from "@/componentes/ui";
import { baixarVersao, interpretar, obterIndice, obterLivro, type Indice, type LivroTexto } from "@/lib/biblia";
import { useMembro } from "@/lib/sessao";
import { AZUL, F, useTema } from "@/lib/tema";

type Folha = null | "livro" | "capitulo" | "versiculo" | "busca" | "ajustes" | "comparar";
const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Biblia() {
  const { membro, salvarPerfil } = useMembro();
  const { c, letra } = useTema();
  const ins = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ref?: string }>();
  const [indice, setIndice] = useState<Indice | null>(null);
  const [versao, setVersao] = useState(["ara", "nvi"].includes(membro.prefs.versao) ? membro.prefs.versao : "ara");
  const [livro, setLivro] = useState(membro.ultimaLeitura?.livro ?? "JHN");
  const [cap, setCap] = useState(membro.ultimaLeitura?.capitulo ?? 1);
  const [dados, setDados] = useState<LivroTexto | null>(null);
  const [erro, setErro] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [folha, setFolha] = useState<Folha>(null);
  const [rascunho, setRascunho] = useState({ livro, cap });
  const [testamento, setTestamento] = useState<"AT" | "NT">("NT");
  const [filtro, setFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [versosCap, setVersosCap] = useState(0);
  const [serifa, setSerifa] = useState(true);
  const [comparacao, setComparacao] = useState<{ sigla: string; versos: [number, string][] } | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);
  const rolagem = useRef<ScrollViewInstance>(null);
  const alvo = useRef<number | null>(null);

  useEffect(() => { obterIndice().then(setIndice).catch((e) => setErro(e.message)); AsyncStorage.getItem("biblia:fonte").then((v) => v === "sem" && setSerifa(false)).catch(() => {}); }, []);
  const v = indice?.versoes.find((x) => x.id === versao) ?? indice?.versoes[0];
  const l = indice?.livros.find((x) => x.id === livro);
  const ordem = indice?.livros ?? [];
  const texto = dados?.capitulos[cap - 1] ?? null;

  useEffect(() => {
    if (!v) return;
    let vivo = true;
    setDados(null); setErro(""); setSel([]);
    obterLivro(v.id, livro).then((d) => vivo && setDados(d)).catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [v?.id, livro]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSel([]);
    rolagem.current?.scrollTo({ y: 0, animated: false });
    if (v) salvarPerfil({ ultimaLeitura: { versao: v.id, livro, capitulo: cap } }).catch(() => {});
  }, [v?.id, livro, cap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!params.ref) return;
    const [b, ch, vs] = params.ref.split(".");
    if (b) { setLivro(b); setCap(Number(ch) || 1); alvo.current = Number(vs) || null; if (alvo.current) setSel([alvo.current]); }
  }, [params.ref]);

  const passo = (d: 1 | -1) => {
    if (!v) return;
    const total = v.capitulos[livro] ?? 1;
    Haptics.selectionAsync().catch(() => {});
    if (d === 1 && cap < total) return setCap(cap + 1);
    if (d === -1 && cap > 1) return setCap(cap - 1);
    const nl = ordem[ordem.findIndex((x) => x.id === livro) + d];
    if (!nl) return;
    setLivro(nl.id); setCap(d === 1 ? 1 : v.capitulos[nl.id] ?? 1);
  };
  const passoRef = useRef(passo); passoRef.current = passo;
  const gesto = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_e, g) => { if (Math.abs(g.dx) > 80) passoRef.current(g.dx < 0 ? 1 : -1); },
  }), []);

  const chave = (n: number) => `${livro}.${cap}.${n}`;
  const favoritos = new Set(membro.favoritos.versos);
  const ord = [...sel].sort((a, b) => a - b);
  const refSel = () => {
    const contiguo = ord.length > 1 && ord[ord.length - 1]! - ord[0]! === ord.length - 1;
    return `${l?.nome} ${cap}:${contiguo ? `${ord[0]}-${ord[ord.length - 1]}` : ord.join(",")}`;
  };
  const textoSel = () => `“${ord.map((n) => texto?.[n - 1]).join(" ")}”\n${refSel()} (${v?.sigla})`;
  const guardar = () => {
    const novos = new Set(membro.favoritos.versos);
    const todos = sel.every((n) => novos.has(chave(n)));
    sel.forEach((n) => (todos ? novos.delete(chave(n)) : novos.add(chave(n))));
    salvarPerfil({ favoritos: { ...membro.favoritos, versos: [...novos] } }).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSel([]);
  };
  const comparar = async () => {
    const outra = indice?.versoes.find((x) => x.id !== v?.id);
    if (!outra) return;
    try {
      const d = await obterLivro(outra.id, livro);
      setComparacao({ sigla: outra.sigla, versos: ord.map((n) => [n, d.capitulos[cap - 1]?.[n - 1] ?? ""]) });
      setFolha("comparar");
    } catch (e) { Alert.alert("Comparar", e instanceof Error ? e.message : "Sem conexão."); }
  };
  const trocarVersao = (id: string) => { setVersao(id); salvarPerfil({ prefs: { ...membro.prefs, versao: id } }).catch(() => {}); };
  const ir = () => {
    if (!indice || !v) return;
    const r = interpretar(busca, indice.livros);
    if (!r || !v.capitulos[r.livro]) return Alert.alert("Bíblia", "Não encontrei essa referência. Exemplos: Jo 3:16, Salmos 23, 1Co 13.");
    setLivro(r.livro); setCap(Math.min(r.capitulo, v.capitulos[r.livro]!)); alvo.current = r.versiculo ?? null; if (r.versiculo) setSel([r.versiculo]);
    setFolha(null); setBusca("");
  };
  const abrirSeletor = () => { setRascunho({ livro, cap }); setTestamento(l?.testamento ?? "NT"); setFiltro(""); setFolha("livro"); };
  const escolherCapitulo = async (n: number, lv = rascunho.livro) => {
    setRascunho({ livro: lv, cap: n }); setVersosCap(0); setFolha("versiculo");
    try { const d = await obterLivro(v!.id, lv); setVersosCap(d.capitulos[n - 1]?.length ?? 0); } catch { setVersosCap(-1); }
  };
  const escolherVersiculo = (n: number) => { setLivro(rascunho.livro); setCap(rascunho.cap); alvo.current = n; setSel([n]); setFolha(null); };
  const baixar = async () => {
    if (!v) return;
    setBaixando("0%");
    await baixarVersao(v, (f, t) => setBaixando(`${Math.round((f / t) * 100)}%`));
    setBaixando(null);
    Alert.alert("Bíblia", `${v.sigla} disponível sem internet.`);
  };

  const tam = 18 * letra;
  const fonte = serifa ? F.leitura : F.regular;
  const livroRasc = indice?.livros.find((x) => x.id === rascunho.livro);

  return (
    <View style={{ flex: 1, backgroundColor: c.sup }}>
      <View style={{ paddingTop: ins.top + 6, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: c.sup, borderBottomWidth: 1, borderBottomColor: c.borda, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable onPress={abrirSeletor} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.negrito, fontSize: 19, color: c.escuro ? c.texto : AZUL, flexShrink: 1 }}>{l?.nome ?? "Bíblia"} {cap}</Text>
          <ChevronDown size={18} color={c.suave} />
        </Pressable>
        <View style={{ flexDirection: "row", borderWidth: 1, borderColor: c.borda }}>
          {indice?.versoes.map((x) => (
            <Pressable key={x.id} onPress={() => trocarVersao(x.id)} style={{ paddingHorizontal: 11, height: 34, justifyContent: "center", backgroundColor: x.id === v?.id ? AZUL : "transparent" }}>
              <Text style={{ fontFamily: F.negrito, fontSize: 11.5, letterSpacing: 0.8, color: x.id === v?.id ? "#fff" : c.suave }}>{x.sigla}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable hitSlop={8} onPress={() => setFolha("busca")} style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}><Search size={20} color={c.azul} /></Pressable>
        <Pressable hitSlop={8} onPress={() => setFolha("ajustes")} style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}><Type size={20} color={c.azul} /></Pressable>
      </View>

      <ScrollView ref={rolagem} {...gesto.panHandlers} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 150 }}>
        {erro ? <T cor={c.suave} centro style={{ marginTop: 40 }}>{erro}</T> : !texto ? <Carregando /> : (
          <>
            <Text style={{ fontFamily: F.negrito, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", color: c.suave }}>{l?.nome}</Text>
            <Text style={{ fontFamily: F.extra, fontSize: 48, color: c.escuro ? c.azul : AZUL, marginBottom: 6 }}>{cap}</Text>
            {texto.map((vs, i) => {
              const n = i + 1;
              if (!vs) return null;
              const titulo = dados?.titulos[`${cap}:${n}`];
              const marcado = sel.includes(n);
              const fav = favoritos.has(chave(n));
              return (
                <View key={n} onLayout={(e) => { if (alvo.current === n) { rolagem.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 60), animated: true }); alvo.current = null; } }}>
                  {titulo ? <Text style={{ fontFamily: F.negrito, fontSize: 13.5, letterSpacing: 0.9, textTransform: "uppercase", color: c.azul, marginTop: n > 1 ? 22 : 10, marginBottom: 8 }}>{titulo}</Text> : null}
                  <Pressable
                    onPress={() => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))}
                    style={{ paddingVertical: 2, backgroundColor: marcado ? c.realce : "transparent", borderLeftWidth: fav ? 2 : 0, borderLeftColor: "#CC2127", paddingLeft: fav ? 8 : 0 }}
                  >
                    <Text style={{ fontFamily: fonte, fontSize: tam, lineHeight: tam * 1.66, color: c.texto, textDecorationLine: marcado ? "underline" : "none", textDecorationColor: c.azul }}>
                      <Text style={{ fontFamily: F.negrito, fontSize: tam * 0.6, color: c.azul }}>{n}  </Text>
                      {vs}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 30 }}>
              <Pressable onPress={() => passo(-1)} style={{ flex: 1, height: 50, borderWidth: 1, borderColor: c.borda, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}><ChevronLeft size={18} color={c.azul} /><T f={F.semi} cor={c.azul} s={14}>Anterior</T></Pressable>
              <Pressable onPress={() => passo(1)} style={{ flex: 1, height: 50, backgroundColor: AZUL, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}><T f={F.semi} cor="#fff" s={14}>Próximo</T><ChevronRight size={18} color="#fff" /></Pressable>
            </View>
            <T s={11.5} cor={c.suave} centro style={{ marginTop: 10 }}>Deslize para o lado para trocar de capítulo</T>
            {v ? <T s={11.5} cor={c.suave} style={{ marginTop: 24 }}>{v.credito}</T> : null}
          </>
        )}
      </ScrollView>

      {sel.length > 0 ? (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 14, backgroundColor: AZUL, flexDirection: "row", alignItems: "center", paddingHorizontal: 4, height: 58, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 }}>
          <T cor="#fff" f={F.negrito} s={13} linhas={1} style={{ flex: 1, paddingLeft: 12 }}>{refSel()}</T>
          {[
            { I: Copy, f: async () => { await Clipboard.setStringAsync(textoSel()); setSel([]); } },
            { I: Share2, f: async () => { await Share.share({ message: textoSel() }); setSel([]); } },
            { I: Bookmark, f: guardar },
            { I: ArrowLeftRight, f: comparar },
            { I: X, f: () => setSel([]) },
          ].map(({ I, f }, i) => <Pressable key={i} onPress={f} style={{ width: 46, height: 52, alignItems: "center", justifyContent: "center" }}><I size={20} color="#fff" /></Pressable>)}
        </View>
      ) : null}

      <Modal visible={!!folha} animationType="slide" transparent onRequestClose={() => setFolha(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable onPress={() => setFolha(null)} style={[StyleSheet.absoluteFill, { backgroundColor: "#00142280" }]} />
        <View style={{ maxHeight: "86%", backgroundColor: c.sup, paddingBottom: ins.bottom + 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borda, gap: 6 }}>
            {folha === "capitulo" || folha === "versiculo" ? (
              <Pressable hitSlop={8} onPress={() => setFolha(folha === "versiculo" ? "capitulo" : "livro")} style={{ padding: 4 }}><ChevronLeft size={22} color={c.azul} /></Pressable>
            ) : <View style={{ width: 8 }} />}
            <T f={F.negrito} s={16} linhas={1} style={{ flex: 1 }}>
              {folha === "livro" ? "Escolha o livro" : folha === "capitulo" ? `${livroRasc?.nome} · capítulo` : folha === "versiculo" ? `${livroRasc?.nome} ${rascunho.cap} · versículo` : folha === "busca" ? "Ir para" : folha === "ajustes" ? "Leitura" : comparacao ? `${refSel()} · ${comparacao.sigla}` : ""}
            </T>
            <Pressable hitSlop={10} onPress={() => setFolha(null)} style={{ padding: 4 }}><X size={22} color={c.suave} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, gap: 12 }}>
            {folha === "livro" && indice && v ? (
              <>
                <TextInput value={filtro} onChangeText={setFiltro} placeholder="Procurar livro" placeholderTextColor={c.suave} style={{ height: 48, borderWidth: 1, borderColor: c.borda, paddingHorizontal: 12, fontFamily: F.medio, fontSize: 16, color: c.texto, backgroundColor: c.fundo }} />
                {!filtro ? (
                  <View style={{ flexDirection: "row", borderWidth: 1, borderColor: c.borda }}>
                    {(["AT", "NT"] as const).map((t) => (
                      <Pressable key={t} onPress={() => setTestamento(t)} style={{ flex: 1, paddingVertical: 11, alignItems: "center", backgroundColor: testamento === t ? AZUL : "transparent" }}>
                        <Text style={{ fontFamily: F.negrito, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: testamento === t ? "#fff" : c.suave }}>{t === "AT" ? "Antigo Testamento" : "Novo Testamento"}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderLeftWidth: 1, borderColor: c.borda }}>
                  {indice.livros.filter((x) => (filtro ? semAcento(x.nome).includes(semAcento(filtro)) : x.testamento === testamento)).map((x) => (
                    <Pressable key={x.id} onPress={() => { setRascunho({ livro: x.id, cap: 1 }); if ((v.capitulos[x.id] ?? 1) > 1) setFolha("capitulo"); else escolherCapitulo(1, x.id); }} style={{ width: "50%", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderRightWidth: 1, borderColor: c.borda, flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                      <T f={x.id === livro ? F.negrito : F.medio} cor={x.id === livro ? c.azul : c.texto} s={15} linhas={1}>{x.nome}</T>
                      <T s={11.5} f={F.semi} cor={c.suave}>{v.capitulos[x.id]}</T>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : folha === "capitulo" && v ? (
              <Grade total={v.capitulos[rascunho.livro] ?? 1} atual={rascunho.livro === livro ? cap : 0} escolher={(n) => escolherCapitulo(n)} />
            ) : folha === "versiculo" ? (
              versosCap === 0 ? <Carregando /> : versosCap < 0 ? <T cor={c.suave} centro>Sem internet para este livro.</T> : (
                <>
                  <Grade total={versosCap} atual={0} escolher={escolherVersiculo} />
                  <Pressable onPress={() => { setLivro(rascunho.livro); setCap(rascunho.cap); setFolha(null); }} style={{ alignSelf: "center", padding: 8 }}><T f={F.negrito} s={12} cor={c.azul} style={{ letterSpacing: 1.2, textTransform: "uppercase" }}>Abrir o capítulo inteiro</T></Pressable>
                </>
              )
            ) : folha === "busca" ? (
              <>
                <TextInput autoFocus value={busca} onChangeText={setBusca} onSubmitEditing={ir} placeholder="Ex.: Jo 3:16, Salmos 23, Rm 8" placeholderTextColor={c.suave} returnKeyType="go" style={{ height: 52, borderWidth: 1, borderColor: c.borda, paddingHorizontal: 14, fontFamily: F.medio, fontSize: 16, color: c.texto }} />
                <Pressable onPress={ir} style={{ height: 50, backgroundColor: AZUL, alignItems: "center", justifyContent: "center" }}><T f={F.negrito} cor="#fff" s={12.5} style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>Abrir</T></Pressable>
              </>
            ) : folha === "ajustes" ? (
              <>
                <T f={F.semi} cor={c.suave} s={13}>Tamanho da letra</T>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => salvarPerfil({ prefs: { ...membro.prefs, letra: n } }).catch(() => {})} style={{ flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: membro.prefs.letra === n ? AZUL : c.borda, backgroundColor: membro.prefs.letra === n ? AZUL : "transparent" }}>
                      <Text style={{ fontFamily: F.negrito, fontSize: 10 + n * 2.4, color: membro.prefs.letra === n ? "#fff" : c.texto }}>A</Text>
                    </Pressable>
                  ))}
                </View>
                <T f={F.semi} cor={c.suave} s={13}>Fonte</T>
                <View style={{ flexDirection: "row", borderWidth: 1, borderColor: c.borda }}>
                  {([true, false] as const).map((s) => (
                    <Pressable key={String(s)} onPress={() => { setSerifa(s); AsyncStorage.setItem("biblia:fonte", s ? "serifa" : "sem").catch(() => {}); }} style={{ flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: serifa === s ? AZUL : "transparent" }}>
                      <Text style={{ fontFamily: s ? F.leitura : F.semi, fontSize: 15, color: serifa === s ? "#fff" : c.texto }}>{s ? "Clássica" : "Moderna"}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={baixar} disabled={!!baixando} style={{ marginTop: 6, height: 50, borderWidth: 1.5, borderColor: AZUL, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Download size={18} color={c.azul} />
                  <T f={F.negrito} s={12} cor={c.azul} style={{ letterSpacing: 1.1, textTransform: "uppercase" }}>{baixando ? `Baixando… ${baixando}` : `Baixar ${v?.sigla} para ler sem internet`}</T>
                </Pressable>
                {v ? <T s={11.5} cor={c.suave}>{v.credito}</T> : null}
              </>
            ) : folha === "comparar" && comparacao ? (
              <View style={{ gap: 8 }}>
                {comparacao.versos.map(([n, t]) => (
                  <Text key={n} style={{ fontFamily: fonte, fontSize: tam, lineHeight: tam * 1.6, color: c.texto }}>
                    <Text style={{ fontFamily: F.negrito, fontSize: tam * 0.6, color: c.azul }}>{n}  </Text>{t}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
        </View>
      </Modal>
    </View>
  );
}

function Grade({ total, atual, escolher }: { total: number; atual: number; escolher: (n: number) => void }) {
  const { c } = useTema();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <Pressable key={n} onPress={() => escolher(n)} style={{ width: 54, height: 50, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: n === atual ? AZUL : c.borda, backgroundColor: n === atual ? AZUL : c.sup }}>
          <T f={F.negrito} cor={n === atual ? "#fff" : c.texto}>{n}</T>
        </Pressable>
      ))}
    </View>
  );
}
