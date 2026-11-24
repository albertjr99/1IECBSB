/** Boletim em modo leitura: o mesmo conteúdo das folhas, em texto corrido. */
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { FileDown, Share2 } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Aviso, Carregando, Logo, Marcado, T } from "@/componentes/ui";
import { Tela } from "@/componentes/ui";
import { API, chamar } from "@/lib/api";
import { gravarCache, lerCache } from "@/lib/cache";
import { CRUZ } from "@/lib/marca";
import { AZUL, F, NOITE, useTema } from "@/lib/tema";
import type { Bloco, Boletim } from "@/lib/tipos";
import { dataPorExtenso } from "@/lib/util";

const paragrafos = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const limpo = (t: string) => (t ?? "").replace(/\*+/g, "").trim();

function Parte({ rotulo, titulo, children }: { rotulo?: string; titulo?: string; children: ReactNode }) {
  const { c, letra } = useTema();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 26, paddingBottom: 4, borderTopWidth: 1, borderTopColor: c.borda, gap: 10 }}>
      {rotulo ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <SvgXml xml={CRUZ} width={7} height={13} />
          <Text style={{ fontFamily: F.negrito, fontSize: 10.5, letterSpacing: 2.3, textTransform: "uppercase", color: c.azul, flexShrink: 1 }}>{limpo(rotulo)}</Text>
        </View>
      ) : null}
      {titulo ? <Text style={{ fontFamily: F.negrito, fontSize: 23 * letra, lineHeight: 28 * letra, letterSpacing: -0.3, color: c.escuro ? c.texto : AZUL }}>{limpo(titulo)}</Text> : null}
      {children}
    </View>
  );
}

function Lista({ itens }: { itens: { a: string; b: string }[] }) {
  const { c, letra } = useTema();
  return (
    <View>
      {itens.map((x, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.borda }}>
          <Text style={{ minWidth: 68, fontFamily: F.negrito, fontSize: 14 * letra, color: c.azul }}>{x.a}</Text>
          <View style={{ flex: 1 }}><Marcado texto={x.b} s={14.5 * letra} style={{ lineHeight: 21 * letra }} /></View>
        </View>
      ))}
    </View>
  );
}

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: string[][] }) {
  const { c, letra } = useTema();
  return (
    <View>
      {linhas.map((l, i) => (
        <View key={i} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.borda, gap: 4 }}>
          <Text style={{ fontFamily: F.negrito, fontSize: 13.5, color: c.azul }}>{limpo(l[0] ?? "")}</Text>
          {l.slice(1).map((v, j) => (v.trim() && v.trim() !== "-" ? (
            <View key={j} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: c.suave }}>{limpo(cabecalho[j + 1] ?? "")}</Text>
              <Text style={{ flexShrink: 1, textAlign: "right", fontFamily: F.semi, fontSize: 14 * letra, color: c.texto }}>{limpo(v)}</Text>
            </View>
          ) : null))}
        </View>
      ))}
    </View>
  );
}

function BlocoLeitura({ b }: { b: Bloco }) {
  const { c, letra } = useTema();
  const corpo = (t: string) => paragrafos(t).map((p, i) => <Marcado key={i} texto={p} s={16.5 * letra} style={{ lineHeight: 27 * letra }} />);
  switch (b.tipo) {
    case "artigo": {
      const a = b as Extract<Bloco, { tipo: "artigo" }>;
      return (
        <Parte rotulo={a.rotulo} titulo={a.titulo}>
          <View style={{ gap: 14 }}>{corpo(a.texto)}</View>
          {a.autor ? <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 4 }}><View style={{ width: 22, height: 2, backgroundColor: "#CC2127" }} /><T f={F.negrito} cor={c.azul}>{a.autor}</T></View> : null}
        </Parte>
      );
    }
    case "avisos": {
      const a = b as Extract<Bloco, { tipo: "avisos" }>;
      return (
        <>
          <Parte rotulo="Avisos">
            {a.itens.filter((x) => x.estilo !== "caixa").map((x) => (
              <View key={x.id} style={x.estilo === "destaque" ? { backgroundColor: c.realce, borderTopWidth: 3, borderTopColor: AZUL, padding: 14, gap: 6, marginBottom: 6 } : { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.borda, gap: 6, marginBottom: 6 }}>
                <Text style={{ fontFamily: F.negrito, fontSize: 16 * letra, color: c.escuro ? c.texto : AZUL }}>{limpo(x.titulo)}</Text>
                {paragrafos(x.texto).map((p, i) => <Marcado key={i} texto={p} s={15 * letra} />)}
              </View>
            ))}
          </Parte>
          {a.itens.filter((x) => x.estilo === "caixa").map((x) => <Parte key={x.id} rotulo={x.titulo}><View style={{ gap: 10 }}>{corpo(x.texto)}</View></Parte>)}
        </>
      );
    }
    case "escala": {
      const e = b as Extract<Bloco, { tipo: "escala" }>;
      return (
        <>
          <Parte rotulo={e.titulo || "Escala"}><Tabela cabecalho={e.cabecalho} linhas={e.linhas.map((l) => l.celulas)} /></Parte>
          {e.porteiros?.length ? <Parte rotulo={e.porteirosTitulo || "Porteiros de oração"}><Lista itens={e.porteiros.map((p) => ({ a: p.horario.replace(/^Das\s+/i, ""), b: p.nome }))} /></Parte> : null}
        </>
      );
    }
    case "tabela": {
      const t = b as Extract<Bloco, { tipo: "tabela" }>;
      return <Parte rotulo={t.titulo}><Tabela cabecalho={t.cabecalho} linhas={t.linhas.map((l) => l.celulas)} /></Parte>;
    }
    case "agenda": {
      const a = b as Extract<Bloco, { tipo: "agenda" }>;
      return (
        <Parte rotulo={a.titulo || "Agenda"}>
          {a.grupos.map((g) => (
            <View key={g.id} style={{ marginTop: 6 }}>
              <Text style={{ fontFamily: F.extra, fontSize: 11, letterSpacing: 2, color: c.azul, borderBottomWidth: 2, borderBottomColor: AZUL, paddingBottom: 4 }}>{g.titulo}</Text>
              <Lista itens={g.itens.map((it) => ({ a: `${it.data.replace(/[()]/g, "")}${it.hora && it.hora !== "-" ? ` · ${it.hora}` : ""}`, b: it.texto }))} />
            </View>
          ))}
        </Parte>
      );
    }
    case "aniversariantes": {
      const a = b as Extract<Bloco, { tipo: "aniversariantes" }>;
      return (
        <Parte rotulo={a.titulo || "Aniversariantes"}>
          <Lista itens={a.linhas.flatMap((l) => l.nomes.split("\n").filter(Boolean).map((n) => ({ a: l.dia, b: n })))} />
          {a.versiculo ? <Text style={{ fontFamily: F.verso, fontSize: 15 * letra, lineHeight: 23 * letra, color: c.azul, marginTop: 8 }}>“{a.versiculo}” <Text style={{ fontFamily: F.negrito, fontSize: 11, color: c.suave }}>{a.referencia}</Text></Text> : null}
        </Parte>
      );
    }
    case "oficios": {
      const o = b as Extract<Bloco, { tipo: "oficios" }>;
      return <Parte rotulo={o.titulo || "Ofícios regulares"}><View style={{ gap: 12 }}>{o.colunas.map((col) => <Marcado key={col.id} texto={col.texto} s={14.5 * letra} />)}</View></Parte>;
    }
    case "texto": {
      const t = b as Extract<Bloco, { tipo: "texto" }>;
      return <Parte titulo={t.titulo}><View style={{ gap: 12 }}>{corpo(t.texto)}</View></Parte>;
    }
    default:
      return null;
  }
}

export default function TelaBoletim() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const { c, letra } = useTema();
  const [b, setB] = useState<Boletim | null | undefined>(undefined);
  const [erro, setErro] = useState("");
  useEffect(() => {
    lerCache<Boletim>(`boletim:${data}`).then((g) => { if (g) setB((x) => x ?? g); });
    chamar<Boletim | null>("boletim", { data }).then((r) => { setB(r); if (r) gravarCache(`boletim:${data}`, r); }).catch((e) => setErro(e.message));
  }, [data]);
  const link = `${API}/boletim/${data}`;
  return (
    <Tela voltar titulo="Boletim" fundo={c.sup} conteudoStyle={{ paddingHorizontal: 0, paddingTop: 0, gap: 0 }} direita={
      <View style={{ flexDirection: "row" }}>
        <Pressable hitSlop={8} onPress={() => WebBrowser.openBrowserAsync(`${API}/api/boletim/${data}/pdf`, { toolbarColor: AZUL })} style={{ padding: 8 }}><FileDown size={21} color={c.azul} /></Pressable>
        <Pressable hitSlop={8} onPress={() => Share.share({ message: `Boletim da 1ª IEC Brasília — ${dataPorExtenso(data)}\n${link}` })} style={{ padding: 8 }}><Share2 size={21} color={c.azul} /></Pressable>
      </View>
    }>
      {b === undefined ? (erro ? <Aviso texto={erro} /> : <Carregando />) : !b ? <Aviso texto="Boletim não encontrado." /> : (
        <View>
          <View style={{ padding: 20, paddingTop: 22, gap: 6, borderBottomWidth: 3, borderBottomColor: AZUL }}>
            <Logo largura={200} negativo={c.escuro} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
              <SvgXml xml={CRUZ} width={7} height={13} />
              <Text style={{ fontFamily: F.negrito, fontSize: 10.5, letterSpacing: 2.3, textTransform: "uppercase", color: c.azul }}>{b.titulo}</Text>
            </View>
            <Text style={{ fontFamily: F.negrito, fontSize: 22, color: c.escuro ? c.texto : AZUL }}>{dataPorExtenso(b.data)}</Text>
          </View>
          {b.versiculo ? (
            <View style={{ margin: 16, marginBottom: 20, padding: 18, backgroundColor: c.escuro ? NOITE : AZUL, gap: 10 }}>
              <Text style={{ fontFamily: F.negrito, fontSize: 10, letterSpacing: 2.4, textTransform: "uppercase", color: "#D9E6EF" }}>Martelando a Palavra</Text>
              <Text style={{ fontFamily: F.verso, fontSize: 19 * letra, lineHeight: 29 * letra, color: "#fff" }}>“{b.versiculo}”</Text>
              {b.versiculoRef ? <Text style={{ fontFamily: F.negrito, fontSize: 10.5, letterSpacing: 2, textTransform: "uppercase", color: "#fff" }}>{b.versiculoRef}</Text> : null}
            </View>
          ) : null}
          {b.paginas.flatMap((p) => p.blocos).map((bl) => <BlocoLeitura key={bl.id} b={bl} />)}
        </View>
      )}
    </Tela>
  );
}
