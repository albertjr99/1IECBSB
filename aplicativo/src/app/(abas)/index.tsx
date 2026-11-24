/** Início: saudação, o que é para hoje, votações, reuniões, versículo e avisos. */
import { router, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { BookOpen, CalendarDays, ChevronRight, Church, FileText, Gift, Video, Vote } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Avatar, Cartao, Marcado, Sobre, T, Tela, Titulo } from "@/componentes/ui";
import { chamar } from "@/lib/api";
import { gravarCache, lerCache } from "@/lib/cache";
import { useMembro } from "@/lib/sessao";
import { AZUL, F, NOITE, useTema } from "@/lib/tema";
import type { Inicio } from "@/lib/tipos";
import { dataPorExtenso, primeiroNome, quando, salaAberta, saudacao } from "@/lib/util";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LIVROS = (require("../../dados/indice-biblia.json") as { livros: { id: string; nome: string }[] }).livros;
const nomeLivro = (id: string) => LIVROS.find((l) => l.id === id)?.nome ?? id;

export default function TelaInicio() {
  const { membro } = useMembro();
  const { c, letra } = useTema();
  const [d, setD] = useState<Inicio | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async (puxou = false) => {
    if (puxou) setAtualizando(true);
    if (!d) { const g = await lerCache<Inicio>("inicio"); if (g) setD(g); }
    try { const r = await chamar<Inicio>("inicio"); setD(r); setErro(""); gravarCache("inicio", r); }
    catch (e) { setErro(e instanceof Error ? e.message : ""); }
    finally { setAtualizando(false); }
  }, [d]);
  useFocusEffect(useCallback(() => { carregar(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  const hoje = new Date();
  const aniversario = membro.nascimento?.slice(5) === `${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const abertas = d?.votacoes.filter((v) => v.situacao === "em_andamento" && !v.votou) ?? [];

  const entrarReuniao = async (id: string) => {
    try {
      const { url } = await chamar<{ url: string }>("entrarReuniao", { id });
      await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN, toolbarColor: AZUL });
    } catch (e) { Alert.alert("Reunião", e instanceof Error ? e.message : "Não foi possível entrar."); }
  };

  return (
    <Tela atualizar={() => carregar(true)} atualizando={atualizando}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 4 }}>
        <View style={{ flex: 1 }}>
          <T s={13} cor={c.suave} f={F.semi}>{saudacao()},</T>
          <Titulo s={28}>{primeiroNome(membro.nome)}</Titulo>
        </View>
        <Pressable onPress={() => router.push("/perfil")}><Avatar nome={membro.nome} foto={membro.foto} tam={48} /></Pressable>
      </View>

      {aniversario ? (
        <Cartao filete style={{ padding: 18, flexDirection: "row", gap: 14, alignItems: "center" }}>
          <Gift color={c.azul} size={26} />
          <View style={{ flex: 1 }}>
            <T f={F.negrito} s={16}>Feliz aniversário!</T>
            <T s={14} cor={c.suave}>A 1ª IEC Brasília celebra a sua vida hoje. Deus te abençoe!</T>
          </View>
        </Cartao>
      ) : null}

      {erro && !d ? <T cor={c.suave} centro>{erro}</T> : null}

      {abertas.map((v) => (
        <Cartao key={v.id} onPress={() => router.push(`/votacao/${v.token}`)} style={{ backgroundColor: AZUL, borderColor: AZUL, padding: 18, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Vote color="#fff" size={18} />
            <T s={10.5} f={F.negrito} cor="#D9E6EF" style={{ letterSpacing: 2, textTransform: "uppercase" }}>Votação aberta</T>
          </View>
          <T s={18} f={F.negrito} cor="#fff">{v.titulo}</T>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T s={13} cor="#D9E6EF">Até {quando(v.fim)}</T>
            <View style={{ flexDirection: "row", alignItems: "center" }}><T s={12.5} f={F.negrito} cor="#fff" style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>Votar</T><ChevronRight color="#fff" size={18} /></View>
          </View>
        </Cartao>
      ))}

      {d?.reunioes.map((r) => {
        const aberta = salaAberta(r);
        return (
          <Cartao key={r.id} filete style={{ padding: 18, gap: 8 }}>
            <Sobre>{aberta ? "Reunião acontecendo" : "Reunião online"}</Sobre>
            <T s={17} f={F.negrito}>{r.titulo}</T>
            <T s={13.5} cor={c.suave}>{quando(r.inicio)}</T>
            {r.descricao ? <T s={14}>{r.descricao}</T> : null}
            <Pressable
              onPress={() => (aberta ? entrarReuniao(r.id) : Alert.alert("Reunião online", "A sala abre 15 minutos antes do início."))}
              style={{ marginTop: 6, height: 46, backgroundColor: aberta ? AZUL : c.realce, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Video color={aberta ? "#fff" : c.suave} size={18} />
              <T s={12.5} f={F.negrito} cor={aberta ? "#fff" : c.suave} style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>{aberta ? "Entrar na sala" : "Abre 15 min antes"}</T>
            </Pressable>
          </Cartao>
        );
      })}

      {d?.boletim?.versiculo ? (
        <Pressable onPress={() => router.push(`/boletim/${d.boletim!.data}`)} style={{ backgroundColor: c.escuro ? NOITE : AZUL, padding: 22, gap: 12 }}>
          <T s={10} f={F.negrito} cor="#D9E6EF" style={{ letterSpacing: 2.4, textTransform: "uppercase" }}>Versículo da semana</T>
          <T s={19 * letra} f={F.verso} cor="#fff" style={{ lineHeight: 29 * letra }}>“{d.boletim.versiculo}”</T>
          <T s={11} f={F.negrito} cor="#fff" style={{ letterSpacing: 2, textTransform: "uppercase" }}>{d.boletim.referencia}</T>
        </Pressable>
      ) : null}

      {membro.ultimaLeitura ? (
        <Cartao onPress={() => router.push("/biblia")} style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <BookOpen color={c.azul} size={24} />
          <View style={{ flex: 1 }}>
            <T s={11} f={F.negrito} cor={c.suave} style={{ letterSpacing: 1.6, textTransform: "uppercase" }}>Continuar leitura</T>
            <T s={16} f={F.negrito}>{nomeLivro(membro.ultimaLeitura.livro)} {membro.ultimaLeitura.capitulo}</T>
          </View>
          <ChevronRight color={c.suave} size={20} />
        </Cartao>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          { t: "Boletim", s: d?.boletim ? dataPorExtenso(d.boletim.data).replace(/ de \d{4}$/, "") : "da semana", I: FileText, ir: () => (d?.boletim ? router.push(`/boletim/${d.boletim.data}`) : router.push("/boletins")) },
          { t: "Programação", s: "cultos e eventos", I: CalendarDays, ir: () => router.push("/igreja") },
          { t: "A igreja", s: "contatos", I: Church, ir: () => router.push("/igreja?aba=contato") },
        ].map((a) => (
          <Cartao key={a.t} onPress={a.ir} style={{ flex: 1, padding: 14, gap: 10 }}>
            <a.I color={c.azul} size={22} />
            <View><T s={14} f={F.negrito} linhas={1}>{a.t}</T><T s={11.5} cor={c.suave} linhas={1}>{a.s}</T></View>
          </Cartao>
        ))}
      </View>

      {d?.boletim?.pastoral ? (
        <Cartao onPress={() => router.push(`/boletim/${d.boletim!.data}`)} style={{ padding: 18, gap: 6 }}>
          <Sobre>Pastoral</Sobre>
          <T s={18} f={F.negrito}>{d.boletim.pastoral}</T>
          <T s={13} cor={c.suave}>{d.boletim.autor}</T>
        </Cartao>
      ) : null}

      {d?.avisos.length ? (
        <View style={{ gap: 10 }}>
          <Sobre style={{ marginTop: 6 }}>Avisos</Sobre>
          {d.avisos.map((a, i) => (
            <Cartao key={i} filete={a.destaque} style={{ padding: 16, gap: 6 }}>
              <T s={15.5} f={F.negrito} cor={c.escuro ? c.texto : AZUL}>{a.titulo.replace(/\*/g, "")}</T>
              <Marcado texto={a.texto} s={14.5 * letra} />
            </Cartao>
          ))}
        </View>
      ) : null}
    </Tela>
  );
}
