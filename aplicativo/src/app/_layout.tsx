/** Raiz do app: fontes, tema, sessão do membro e notificações. */
import { Montserrat_400Regular } from "@expo-google-fonts/montserrat/400Regular";
import { Montserrat_400Regular_Italic } from "@expo-google-fonts/montserrat/400Regular_Italic";
import { Montserrat_500Medium } from "@expo-google-fonts/montserrat/500Medium";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat/600SemiBold";
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat/700Bold";
import { Montserrat_700Bold_Italic } from "@expo-google-fonts/montserrat/700Bold_Italic";
import { Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat/800ExtraBold";
import { Lora_400Regular } from "@expo-google-fonts/lora/400Regular";
import { Lora_400Regular_Italic } from "@expo-google-fonts/lora/400Regular_Italic";
import { Lora_500Medium_Italic } from "@expo-google-fonts/lora/500Medium_Italic";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Aguardando, CriarSenha, Entrar } from "@/componentes/Acesso";
import { Aviso } from "@/componentes/ui";
import { carregarToken, chamar, definirToken, ErroApi, quandoExpirar, temToken } from "@/lib/api";
import { gravarCache, lerCache, limparCache } from "@/lib/cache";
import { aparelhoAtual, registrarAparelho } from "@/lib/push";
import { SessaoCtx, type Sessao } from "@/lib/sessao";
import { CLARO, ESCALA_LETRA, ESCURO, TemaCtx } from "@/lib/tema";
import type { Membro } from "@/lib/tipos";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Raiz() {
  const [fontes] = useFonts({
    Montserrat_400Regular, Montserrat_400Regular_Italic, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_700Bold_Italic, Montserrat_800ExtraBold,
    Lora_400Regular, Lora_400Regular_Italic, Lora_500Medium_Italic,
  });
  const sistema = useColorScheme();
  const [estado, setEstado] = useState<"carregando" | "fora" | "dentro" | "sem-rede">("carregando");
  const [membro, setMembro] = useState<Membro | null>(null);

  const escuro = membro?.prefs.tema === "escuro" || (membro?.prefs.tema !== "claro" && sistema === "dark");
  const c = escuro ? ESCURO : CLARO;
  const letra = ESCALA_LETRA[(membro?.prefs.letra ?? 3) - 1] ?? 1;

  const carregar = useCallback(async () => {
    await carregarToken();
    if (!temToken()) { setEstado("fora"); return; }
    const guardado = await lerCache<Membro>("membro");
    if (guardado) { setMembro(guardado); setEstado("dentro"); }
    try {
      const r = await chamar<{ membro: Membro | null }>("sessao");
      if (!r.membro) { await definirToken(null); setMembro(null); setEstado("fora"); return; }
      setMembro(r.membro); gravarCache("membro", r.membro); setEstado("dentro");
    } catch (e) {
      if (!guardado) setEstado(e instanceof ErroApi && e.rede ? "sem-rede" : "fora");
    }
  }, []);

  useEffect(() => { carregar(); quandoExpirar(() => { setMembro(null); setEstado("fora"); }); }, [carregar]);
  useEffect(() => { if (fontes && estado !== "carregando") SplashScreen.hideAsync().catch(() => {}); }, [fontes, estado]);
  useEffect(() => { SystemUI.setBackgroundColorAsync(c.fundo).catch(() => {}); }, [c.fundo]);

  const ativo = estado === "dentro" && membro?.situacao === "ativo" && !membro.trocarSenha;
  useEffect(() => { if (ativo) registrarAparelho(); }, [ativo]);

  // tocar na notificação leva à tela certa
  useEffect(() => {
    if (!ativo || Platform.OS === "web") return;
    const abrir = (d: Record<string, unknown> | undefined) => {
      if (d?.tela === "boletim" && typeof d.data === "string") router.push(`/boletim/${d.data}`);
      else if (d?.tela === "escala" && typeof d.id === "string" && d.id) router.push(`/escala/${d.id}`);
      else if (d?.tela === "escala" || d?.tela === "escalas") router.push("/participar?aba=escalas");
      else if (d?.tela === "votacao" || d?.tela === "participar") router.push("/participar");
    };
    Notifications.getLastNotificationResponseAsync().then((r) => abrir(r?.notification.request.content.data)).catch(() => {});
    const s = Notifications.addNotificationResponseReceivedListener((r) => abrir(r.notification.request.content.data));
    return () => s.remove();
  }, [ativo]);

  const sessao = useMemo<Sessao | null>(() => membro && {
    membro,
    atualizar: (m) => { setMembro(m); gravarCache("membro", m); },
    salvarPerfil: async (p) => {
      setMembro((m) => (m ? { ...m, ...p, prefs: { ...m.prefs, ...(p.prefs ?? {}) } } : m));
      const r = await chamar<{ membro: Membro }>("perfil", p);
      setMembro(r.membro); gravarCache("membro", r.membro);
    },
    sair: async () => {
      await chamar("sair", { aparelho: aparelhoAtual() }).catch(() => {});
      await definirToken(null); await limparCache();
      setMembro(null); setEstado("fora");
    },
  }, [membro]);

  if (!fontes || estado === "carregando") return <View style={{ flex: 1, backgroundColor: "#00436F" }} />;

  let conteudo: React.ReactNode;
  if (estado === "sem-rede") conteudo = <View style={{ flex: 1, justifyContent: "center", backgroundColor: c.fundo }}><Aviso texto="Sem conexão com a internet. Conecte-se para entrar no aplicativo." acao={() => { setEstado("carregando"); carregar(); }} /></View>;
  else if (estado === "fora" || !membro) conteudo = <Entrar aoEntrar={(m) => { setMembro(m); gravarCache("membro", m); setEstado("dentro"); }} />;
  else if (membro.situacao !== "ativo") conteudo = <Aguardando membro={membro} sair={() => sessao?.sair()} recarregar={carregar} />;
  else if (membro.trocarSenha) conteudo = <CriarSenha membro={membro} pronto={carregar} />;
  else conteudo = (
    <SessaoCtx.Provider value={sessao}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fundo }, animation: "slide_from_right" }} />
    </SessaoCtx.Provider>
  );

  return (
    <SafeAreaProvider>
      <TemaCtx.Provider value={{ c, letra }}>
        <StatusBar style={estado === "dentro" && ativo ? (escuro ? "light" : "dark") : "light"} />
        {conteudo}
      </TemaCtx.Provider>
    </SafeAreaProvider>
  );
}
