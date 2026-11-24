/** Entrar, pedir cadastro, aguardar aprovação e criar a senha. */
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from "react-native";
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.fundo }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ backgroundColor: AZUL, paddingTop: ins.top + 34, paddingBottom: 34, paddingHorizontal: 24 }}>
          <Logo negativo largura={250} />
        </View>
        <View style={{ height: 4, backgroundColor: NOITE }} />
        <View style={{ padding: 24, paddingBottom: ins.bottom + 30, gap: 18 }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
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

  const enviar = async () => {
    setErro(""); setIndo(true);
    try {
      let r: { membro: Membro; token: string };
      if (modo === "entrar") r = await chamar("entrar", { login, senha });
      else {
        const [d, m, a] = nasc.split("/");
        const nascimento = d && m && a?.length === 4 ? `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
        r = await chamar("cadastrar", { nome, celular, email: email.trim() || undefined, nascimento, senha });
      }
      await definirToken(r.token);
      aoEntrar(r.membro);
    } catch (e) { setErro(e instanceof ErroApi ? e.message : "Não foi possível entrar."); }
    finally { setIndo(false); }
  };

  const mascaraData = (t: string) => { const d = t.replace(/\D/g, "").slice(0, 8); return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/"); };

  return (
    <Moldura>
      <View style={{ gap: 6 }}>
        <Titulo>{modo === "entrar" ? "Bem-vindo" : "Pedir acesso"}</Titulo>
        <T cor={c.suave}>{modo === "entrar" ? "Entre com o celular (ou e-mail) e a senha do aplicativo da igreja." : "Preencha seus dados. A secretaria confere e libera o seu acesso."}</T>
      </View>
      <Erro msg={erro} />
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
          <Campo rotulo="Data de nascimento" value={nasc} onChangeText={(t) => setNasc(mascaraData(t))} keyboardType="number-pad" placeholder="dd/mm/aaaa" dica="Para lembrarmos do seu aniversário." />
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

