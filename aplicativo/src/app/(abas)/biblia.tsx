/** Bíblia: várias versões, leitura confortável, marcar, copiar e compartilhar versículos. */
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { Bookmark, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Search, Share2, Type, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Share, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Carregando, T } from "@/componentes/ui";
import { baixarVersao, interpretar, obterIndice, obterLivro, type Indice } from "@/lib/biblia";
import { useMembro } from "@/lib/sessao";
import { AZUL, F, useTema } from "@/lib/tema";

export default function Biblia() {
  const { membro, salvarPerfil } = useMembro();
  const { c, letra } = useTema();
  const ins = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ref?: string }>();
  const [indice, setIndice] = useState<Indice | null>(null);
  const [erro, setErro] = useState("");
  const [versao, setVersao] = useState(membro.prefs.versao || "blivre");
  const [livro, setLivro] = useState(membro.ultimaLeitura?.livro ?? "JHN");
  const [cap, setCap] = useState(membro.ultimaLeitura?.capitulo ?? 1);
  const [texto, setTexto] = useState<string[] | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [seletor, setSeletor] = useState<null | "livro" | "capitulo" | "versao" | "busca">(null);
  const [testamento, setTestamento] = useState<"AT" | "NT">("NT");
  const [busca, setBusca] = useState("");
  const [baixando, setBaixando] = useState<string | null>(null);
  const rolagem = useRef<ScrollViewInstance>(null);
  const alvo = useRef<number | null>(null);
  const posicoes = useRef<Record<number, number>>({});

  useEffect(() => { obterIndice().then(setIndice).catch((e) => setErro(e.message)); }, []);
  const v = indice?.versoes.find((x) => x.id === versao) ?? indice?.versoes[0];
  const l = indice?.livros.find((x) => x.id === livro);
  const ordem = useMemo(() => (indice?.livros ?? []).filter((x) => !v || v.capitulos[x.id]), [indice, v]);

  useEffect(() => {
    if (!v) return;
    if (!v.capitulos[livro]) { setLivro("MAT"); setCap(1); return; }
    let vivo = true;
    setTexto(null); setSel([]); setErro("");
    obterLivro(v.id, livro).then((lv) => { if (vivo) setTexto(lv[cap - 1] ?? []); }).catch((e) => vivo && setErro(e.message));
    salvarPerfil({ ultimaLeitura: { versao: v.id, livro, capitulo: cap } }).catch(() => {});
    rolagem.current?.scrollTo({ y: 0, animated: false });
    return () => { vivo = false; };
  }, [v?.id, livro, cap]); // eslint-disable-line react-hooks/exhaustive-deps

  // link de outra tela (ex.: versículo salvo): ?ref=JHN.3.16
  useEffect(() => {
    if (!params.ref) return;
    const [b, ch, vs] = params.ref.split(".");
    if (b) { setLivro(b); setCap(Number(ch) || 1); alvo.current = Number(vs) || null; if (alvo.current) setSel([alvo.current]); }
  }, [params.ref]);

  const passo = (d: 1 | -1) => {
    if (!v) return;
    const total = v.capitulos[livro] ?? 1;
    if (d === 1 && cap < total) return setCap(cap + 1);
    if (d === -1 && cap > 1) return setCap(cap - 1);
    const nl = ordem[ordem.findIndex((x) => x.id === livro) + d];
    if (!nl) return;
    setLivro(nl.id);
    setCap(d === 1 ? 1 : v.capitulos[nl.id] ?? 1);
  };

  const chave = (n: number) => `${livro}.${cap}.${n}`;
  const favoritos = new Set(membro.favoritos.versos);
  const textoSel = () => {
    if (!texto || !l || !sel.length) return "";
    const ord = [...sel].sort((a, b) => a - b);
    const faixa = ord.length > 1 && ord[ord.length - 1]! - ord[0]! === ord.length - 1 ? `${ord[0]}-${ord[ord.length - 1]}` : ord.join(",");
    return `“${ord.map((n) => texto[n - 1]).join(" ")}”\n${l.nome} ${cap}:${faixa} (${v?.sigla})`;
  };
  const guardar = () => {
    const novos = new Set(membro.favoritos.versos);
    const todos = sel.every((n) => novos.has(chave(n)));
    sel.forEach((n) => (todos ? novos.delete(chave(n)) : novos.add(chave(n))));
    salvarPerfil({ favoritos: { ...membro.favoritos, versos: [...novos] } }).catch(() => {});
    setSel([]);
  };
  const mudarLetra = (d: number) => salvarPerfil({ prefs: { ...membro.prefs, letra: Math.min(5, Math.max(1, membro.prefs.letra + d)) } }).catch(() => {});
  const trocarVersao = (id: string) => { setVersao(id); setSeletor(null); salvarPerfil({ prefs: { ...membro.prefs, versao: id } }).catch(() => {}); };
  const ir = () => {
    if (!indice) return;
    const r = interpretar(busca, indice.livros);
    if (!r || !v?.capitulos[r.livro]) return Alert.alert("Bíblia", "Não encontrei essa referência nesta versão. Exemplos: Jo 3:16, Salmos 23, 1Co 13.");
    setLivro(r.livro); setCap(Math.min(r.capitulo, v.capitulos[r.livro]!)); alvo.current = r.versiculo ?? null; if (r.versiculo) setSel([r.versiculo]);
    setSeletor(null); setBusca("");
  };
  const baixar = async () => {
    if (!v) return;
    setBaixando("0%");
    await baixarVersao(v, (f, t) => setBaixando(`${Math.round((f / t) * 100)}%`));
    setBaixando(null);
    Alert.alert("Bíblia", `${v.nome} disponível sem internet.`);
  };

  const tam = 18 * letra;
  const cabecalho = (
    <View style={{ paddingTop: ins.top + 6, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: c.sup, borderBottomWidth: 1, borderBottomColor: c.borda, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable onPress={() => setSeletor("livro")} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.negrito, fontSize: 19, color: c.escuro ? c.texto : AZUL, flexShrink: 1 }}>{l?.nome ?? "Bíblia"} {cap}</Text>
        <ChevronDown size={18} color={c.suave} />
      </Pressable>
      <Pressable onPress={() => setSeletor("versao")} style={{ borderWidth: 1, borderColor: c.borda, paddingHorizontal: 10, height: 34, justifyContent: "center" }}>
        <Text style={{ fontFamily: F.negrito, fontSize: 11.5, letterSpacing: 1, color: c.azul }}>{v?.sigla ?? "…"}</Text>
      </Pressable>
      <Pressable hitSlop={8} onPress={() => setSeletor("busca")} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Search size={20} color={c.azul} /></Pressable>
      <Pressable hitSlop={8} onPress={() => Alert.alert("Tamanho da letra", "", [{ text: "Menor", onPress: () => mudarLetra(-1) }, { text: "Maior", onPress: () => mudarLetra(1) }, { text: "Fechar", style: "cancel" }])} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Type size={20} color={c.azul} /></Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.sup }}>
      {cabecalho}
      <ScrollView ref={rolagem} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 140 }}>
        {erro ? <T cor={c.suave} centro style={{ marginTop: 40 }}>{erro}</T> : !texto ? <Carregando /> : (
          <>
            <Text style={{ fontFamily: F.negrito, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", color: c.suave, marginBottom: 4 }}>{l?.nome}</Text>
            <Text style={{ fontFamily: F.extra, fontSize: 44, color: c.escuro ? c.azul : AZUL, marginBottom: 10 }}>{cap}</Text>
            {texto.map((vs, i) => {
              const n = i + 1;
              if (!vs) return null;
              const marcado = sel.includes(n);
              const fav = favoritos.has(chave(n));
              return (
                <Pressable
                  key={n}
                  onLayout={(e) => { posicoes.current[n] = e.nativeEvent.layout.y; if (alvo.current === n) { rolagem.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 40), animated: true }); alvo.current = null; } }}
                  onPress={() => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))}
                  style={{ paddingVertical: 3, backgroundColor: marcado ? c.realce : "transparent", borderLeftWidth: fav ? 2 : 0, borderLeftColor: "#CC2127", paddingLeft: fav ? 8 : 0 }}
                >
                  <Text style={{ fontFamily: F.leitura, fontSize: tam, lineHeight: tam * 1.62, color: c.texto, textDecorationLine: marcado ? "underline" : "none", textDecorationColor: c.azul }}>
                    <Text style={{ fontFamily: F.negrito, fontSize: tam * 0.62, color: c.azul }}>{n}  </Text>
                    {vs}
                  </Text>
                </Pressable>
              );
            })}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 28 }}>
              <Pressable onPress={() => passo(-1)} style={{ flex: 1, height: 48, borderWidth: 1, borderColor: c.borda, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}><ChevronLeft size={18} color={c.azul} /><T f={F.semi} cor={c.azul} s={14}>Anterior</T></Pressable>
              <Pressable onPress={() => passo(1)} style={{ flex: 1, height: 48, backgroundColor: AZUL, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}><T f={F.semi} cor="#fff" s={14}>Próximo</T><ChevronRight size={18} color="#fff" /></Pressable>
            </View>
            {v ? <T s={11.5} cor={c.suave} style={{ marginTop: 26 }}>{v.credito}</T> : null}
          </>
        )}
      </ScrollView>

      {sel.length > 0 ? (
        <View style={{ position: "absolute", left: 14, right: 14, bottom: 16, backgroundColor: AZUL, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, height: 56, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 }}>
          <T cor="#fff" f={F.negrito} s={13} style={{ flex: 1, paddingLeft: 12 }}>{sel.length} selecionado{sel.length > 1 ? "s" : ""}</T>
          {[
            { I: Copy, f: async () => { await Clipboard.setStringAsync(textoSel()); setSel([]); } },
            { I: Share2, f: async () => { await Share.share({ message: textoSel() }); setSel([]); } },
            { I: Bookmark, f: guardar },
            { I: X, f: () => setSel([]) },
          ].map(({ I, f }, i) => <Pressable key={i} onPress={f} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}><I size={21} color="#fff" /></Pressable>)}
        </View>
      ) : null}

      <Modal visible={!!seletor} animationType="slide" transparent onRequestClose={() => setSeletor(null)}>
        <Pressable onPress={() => setSeletor(null)} style={{ flex: 1, backgroundColor: "#00142280" }} />
        <View style={{ maxHeight: "82%", backgroundColor: c.sup, paddingBottom: ins.bottom + 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: c.borda, gap: 8 }}>
            {seletor === "capitulo" ? (
              <Pressable onPress={() => setSeletor("livro")} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}><ChevronLeft size={20} color={c.azul} /><T f={F.negrito} s={16} cor={c.azul}>{l?.nome}</T></Pressable>
            ) : seletor === "livro" ? (
              <View style={{ flexDirection: "row", flex: 1, borderWidth: 1, borderColor: c.borda, alignSelf: "flex-start" }}>
                {(["AT", "NT"] as const).filter((t) => t === "NT" || !v?.somenteNT).map((t) => (
                  <Pressable key={t} onPress={() => setTestamento(t)} style={{ paddingHorizontal: 14, paddingVertical: 9, backgroundColor: testamento === t ? AZUL : "transparent" }}>
                    <Text style={{ fontFamily: F.negrito, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: testamento === t ? "#fff" : c.suave }}>{t === "AT" ? "Antigo" : "Novo"} Test.</Text>
                  </Pressable>
                ))}
              </View>
            ) : <T f={F.negrito} s={16} style={{ flex: 1 }}>{seletor === "versao" ? "Versão da Bíblia" : "Ir para"}</T>}
            <Pressable hitSlop={10} onPress={() => setSeletor(null)}><X size={22} color={c.suave} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {seletor === "livro" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {ordem.filter((x) => x.testamento === (v?.somenteNT ? "NT" : testamento)).map((x) => (
                  <Pressable key={x.id} onPress={() => { setLivro(x.id); setCap(1); setSeletor((v?.capitulos[x.id] ?? 1) > 1 ? "capitulo" : null); }} style={{ width: "50%", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderRightWidth: 1, borderColor: c.borda }}>
                    <T f={x.id === livro ? F.negrito : F.medio} cor={x.id === livro ? c.azul : c.texto}>{x.nome}</T>
                  </Pressable>
                ))}
              </View>
            ) : seletor === "capitulo" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 }}>
                {Array.from({ length: v?.capitulos[livro] ?? 1 }, (_, i) => i + 1).map((n) => (
                  <Pressable key={n} onPress={() => { setCap(n); setSeletor(null); }} style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: n === cap ? AZUL : c.borda, backgroundColor: n === cap ? AZUL : c.sup }}>
                    <T f={F.negrito} cor={n === cap ? "#fff" : c.texto}>{n}</T>
                  </Pressable>
                ))}
              </View>
            ) : seletor === "versao" ? (
              <View>
                {indice?.versoes.map((x) => (
                  <Pressable key={x.id} onPress={() => trocarVersao(x.id)} style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: c.borda, gap: 4, backgroundColor: x.id === v?.id ? c.realce : "transparent" }}>
                    <T f={F.negrito}>{x.nome} <T s={12} cor={c.suave}>({x.sigla}{x.somenteNT ? " · Novo Testamento" : ""})</T></T>
                    <T s={12} cor={c.suave}>{x.credito}</T>
                  </Pressable>
                ))}
                <Pressable onPress={baixar} disabled={!!baixando} style={{ margin: 16, height: 48, borderWidth: 1.5, borderColor: AZUL, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Download size={18} color={c.azul} />
                  <T f={F.negrito} s={12.5} cor={c.azul} style={{ letterSpacing: 1.2, textTransform: "uppercase" }}>{baixando ? `Baixando… ${baixando}` : `Baixar ${v?.sigla} para ler sem internet`}</T>
                </Pressable>
              </View>
            ) : (
              <View style={{ padding: 18, gap: 12 }}>
                <TextInput autoFocus value={busca} onChangeText={setBusca} onSubmitEditing={ir} placeholder="Ex.: Jo 3:16, Salmos 23, Rm 8" placeholderTextColor={c.suave} returnKeyType="go"
                  style={{ height: 52, borderWidth: 1, borderColor: c.borda, paddingHorizontal: 14, fontFamily: F.medio, fontSize: 16, color: c.texto }} />
                <Pressable onPress={ir} style={{ height: 50, backgroundColor: AZUL, alignItems: "center", justifyContent: "center" }}><T f={F.negrito} cor="#fff" s={12.5} style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>Abrir</T></Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
