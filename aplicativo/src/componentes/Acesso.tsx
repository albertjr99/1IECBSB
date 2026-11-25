/** Entrar, pedir cadastro, aguardar aprovação e criar a senha. */
import { CampoData } from "./Calendario";
import { hojeBrasilia } from "@/lib/util";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { Fingerprint, ScanFace } from "lucide-react-native";
import { biometriaDoAparelho, biometriaLigada, confirmarBiometria, desligarBiometria, entrarComBiometria, ligarBiometria, nomeGuardado, renovarCopia, type Biometria } from "@/lib/biometria";
import { Linking, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Clock } from "lucide-react-native";
import { API, chamar, definirToken, ErroApi } from "@/lib/api";
import { AZUL, F, NOITE, useTema } from "@/lib/tema";
import type { Membro } from "@/lib/tipos";
import { mascaraCelular, primeiroNome } from "@/lib/util";
import { Botao, Campo, Logo, T, Titulo } from "./ui";

type Entrou = (m: Membro) => void;

function Moldura({ children }: { children: React.ReactNode }) {
  const ins = useSafeAreaInsets();
  const { c } = useTema();
  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      <KeyboardAwareScrollView bottomOffset={28} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ backgroundColor: AZUL, paddingTop: ins.top + 34, paddingBottom: 34, paddingHorizontal: 24 }}>
          <Logo negativo largura={250} />
        </View>
        <View style={{ height: 4, backgroundColor: NOITE }} />
        <View style={{ padding: 24, paddingBottom: ins.bottom + 30, gap: 18 }}>{children}</View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Erro({ msg }: { msg: string }) {
  if (!msg) return null;
  return <View style={{ borderLeftWidth: 3, borderLeftColor: "#CC2127", backgroundColor: "#CC212712", padding: 12 }}><T s={14}>{msg}</T></View>;
}

export function Entrar({ aoEntrar }: { aoEntrar: Entrou }) {
  const { c } = useTema();
  const [modo, setModo] = useState<"entrar" | "cadastro">("entrar");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [nasc, setNasc] = useState("");
  const [erro, setErro] = useState("");
  const [indo, setIndo] = useState(false);
  const [bio, setBio] = useState<(Biometria & { quem: string }) | null>(null);

  const entrarBio = async () => {
    setErro("");
    const t = await entrarComBiometria().catch(() => null);
    if (!t) return;
    setIndo(true);
    try {
      await definirToken(t);
      const r = await chamar<{ membro: Membro | null }>("sessao");
      if (!r.membro) throw new ErroApi("Sua sessão expirou. Entre com a senha uma vez para reativar a biometria.");
      aoEntrar(r.membro);
    } catch (e) {
      await definirToken(null);
      if (e instanceof ErroApi && !e.rede) { await desligarBiometria(); setBio(null); }
      setErro(e instanceof ErroApi ? e.message : "Não foi possível entrar.");
    } finally { setIndo(false); }
  };

  // biometria já ativada neste aparelho: oferece (e já pede) a entrada sem senha
  useEffect(() => {
    (async () => {
      if (!(await biometriaLigada())) return;
      const b = await biometriaDoAparelho();
      if (!b.ok) return;
      setBio({ ...b, quem: primeiroNome((await nomeGuardado()) ?? "") });
      entrarBio();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = async () => {
    setErro(""); setIndo(true);
    try {
      let r: { membro: Membro; token: string };
      if (modo === "entrar") r = await chamar("entrar", { login, senha });
      else {
        const nascimento = nasc;
        r = await chamar("cadastrar", { nome, celular, email: email.trim() || undefined, nascimento, senha });
      }
      await definirToken(r.token);
      await renovarCopia(r.token);
      // primeira vez com senha neste aparelho: oferece a biometria
      const b = await biometriaDoAparelho();
      if (b.ok && !(await biometriaLigada())) {
        await new Promise<void>((pronto) => Alert.alert(
          `Entrar com ${b.nome}?`,
          `Da próxima vez, entre no app só com ${b.tipo === "rosto" ? "o seu rosto" : b.tipo === "digital" ? "a sua digital" : "a biometria"}, sem digitar a senha.`,
          [
            { text: "Agora não", style: "cancel", onPress: () => pronto() },
            { text: "Ativar", onPress: () => { ligarBiometria(r.token, r.membro.nome).finally(pronto); } },
          ],
        ));
      }
      aoEntrar(r.membro);
    } catch (e) { setErro(e instanceof ErroApi ? e.message : "Não foi possível entrar."); }
    finally { setIndo(false); }
  };


  return (
    <Moldura>
      <View style={{ gap: 6 }}>
        <Titulo>{modo === "entrar" ? "Bem-vindo" : "Pedir acesso"}</Titulo>
        <T cor={c.suave}>{modo === "entrar" ? "Entre com o celular (ou e-mail) e a senha do aplicativo da igreja." : "Preencha seus dados. A secretaria confere e libera o seu acesso."}</T>
      </View>
      <Erro msg={erro} />
      {modo === "entrar" && bio ? (
        <Pressable onPress={entrarBio} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: c.realce, borderWidth: 1, borderColor: AZUL, opacity: pressed ? 0.85 : 1 })}>
          {bio.tipo === "rosto" ? <ScanFace size={32} color={AZUL} /> : <Fingerprint size={32} color={AZUL} />}
          <View style={{ flex: 1 }}>
            <T f={F.negrito} s={16} cor={c.azul}>Entrar com {bio.nome}</T>
            {bio.quem ? <T s={13} cor={c.suave}>Como {bio.quem}</T> : null}
          </View>
        </Pressable>
      ) : null}
      {modo === "entrar" ? (
        <>
          <Campo rotulo="Celular ou e-mail" value={login} onChangeText={setLogin} autoCapitalize="none" autoComplete="username" keyboardType="email-address" placeholder="(61) 99999-9999" />
          <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="current-password" onSubmitEditing={enviar} />
        </>
      ) : (
        <>
          <Campo rotulo="Nome completo" value={nome} onChangeText={setNome} autoComplete="name" autoCapitalize="words" />
          <Campo rotulo="Celular com DDD" value={celular} onChangeText={(t) => setCelular(mascaraCelular(t))} keyboardType="phone-pad" autoComplete="tel" placeholder="(61) 99999-9999" />
          <Campo rotulo="E-mail (opcional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <CampoData rotulo="Data de nascimento" valor={nasc} aoMudar={setNasc} maximo={hojeBrasilia()} anos vazio="Para lembrarmos do seu aniversário" />
          <Campo rotulo="Crie uma senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="new-password" dica="Ao menos 8 caracteres." />
        </>
      )}
      <Botao onPress={enviar} carregando={indo}>{modo === "entrar" ? "Entrar" : "Enviar pedido"}</Botao>
      <Botao tipo="sec" onPress={() => { setModo(modo === "entrar" ? "cadastro" : "entrar"); setErro(""); }}>{modo === "entrar" ? "Ainda não tenho acesso" : "Já tenho acesso"}</Botao>
      {modo === "entrar" ? <T s={13} cor={c.suave} centro>Esqueceu a senha? Peça à secretaria uma senha provisória.</T> : null}
      <Pressable onPress={() => Linking.openURL(`${API}/privacidade`)}><T s={12} cor={c.suave} centro style={{ textDecorationLine: "underline" }}>Política de privacidade</T></Pressable>
    </Moldura>
  );
}

/** App trancado na abertura: pede o rosto ou a digital. */
export function Bloqueio({ aoAbrir, aoSenha }: { aoAbrir: () => void; aoSenha: () => void }) {
  const { c } = useTema();
  const [b, setB] = useState<Biometria | null>(null);
  const [quem, setQuem] = useState("");
  const pedir = async () => { if (await confirmarBiometria("Abrir o app da igreja").catch(() => false)) aoAbrir(); };
  useEffect(() => {
    biometriaDoAparelho().then((x) => { setB(x); if (x.ok) pedir(); else aoSenha(); });
    nomeGuardado().then((n) => setQuem(n ? primeiroNome(n) : ""));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const Icone = b?.tipo === "rosto" ? ScanFace : Fingerprint;
  return (
    <Moldura>
      <View style={{ alignItems: "center", gap: 14, paddingVertical: 20 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.realce, alignItems: "center", justifyContent: "center" }}><Icone size={44} color={AZUL} /></View>
        <Titulo>{quem ? `Olá, ${quem}!` : "Bem-vindo de volta"}</Titulo>
        <T cor={c.suave} centro>Use {b?.nome ?? "a biometria"} para abrir o aplicativo.</T>
      </View>
      <Botao onPress={pedir} icone={<Icone size={18} color="#fff" />}>Abrir com {b?.nome ?? "biometria"}</Botao>
      <Botao tipo="sec" onPress={aoSenha}>Entrar com a senha</Botao>
    </Moldura>
  );
}

export function Aguardando({ membro, sair, recarregar }: { membro: Membro; sair: () => void; recarregar: () => void }) {
  const { c } = useTema();
  const inativo = membro.situacao === "inativo";
  return (
    <Moldura>
      <View style={{ width: 52, height: 52, backgroundColor: c.realce, alignItems: "center", justifyContent: "center" }}><Clock color={c.azul} size={26} /></View>
      <Titulo>{inativo ? "Acesso desativado" : `Quase lá, ${primeiroNome(membro.nome)}!`}</Titulo>
      <T cor={c.suave}>{inativo ? "Seu acesso ao aplicativo está desativado. Fale com a secretaria da igreja." : "Recebemos o seu pedido. Assim que a secretaria aprovar o cadastro, o aplicativo libera tudo para você."}</T>
      {!inativo ? <Botao onPress={recarregar}>Já fui aprovado</Botao> : null}
      <Botao tipo="sec" onPress={sair}>Sair</Botao>
    </Moldura>
  );
}

export function CriarSenha({ membro, pronto }: { membro: Membro; pronto: () => void }) {
  const { c } = useTema();
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState("");
  const [indo, setIndo] = useState(false);
  const salvar = async () => {
    if (nova !== conf) return setErro("As senhas não conferem.");
    setIndo(true); setErro("");
    try { await chamar("senha", { nova }); pronto(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro"); }
    finally { setIndo(false); }
  };
  return (
    <Moldura>
      <Titulo>Olá, {primeiroNome(membro.nome)}</Titulo>
      <T cor={c.suave}>Você entrou com a senha provisória. Crie agora a sua senha pessoal.</T>
      <Erro msg={erro} />
      <Campo rotulo="Nova senha" value={nova} onChangeText={setNova} secureTextEntry autoComplete="new-password" dica="Ao menos 8 caracteres." />
      <Campo rotulo="Repita a senha" value={conf} onChangeText={setConf} secureTextEntry autoComplete="new-password" />
      <Botao onPress={salvar} carregando={indo}>Salvar senha</Botao>
    </Moldura>
  );
}

