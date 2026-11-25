/** Peças visuais das escalas: bloco da data, status discreto e linha de pessoa. */
import { Check, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { Resposta } from "@/lib/escalas";
import { AZUL, F, VERMELHO, useTema } from "@/lib/tema";
import { emBrasilia, nomeCurto } from "@/lib/util";
import { FotoPessoa } from "./Pessoa";
import { T } from "./ui";

const MES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const SEM = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

/** Bloco azul com dia da semana, dia e mês (como um selo de calendário). */
export function DataBloco({ iso, tam = 58, claro }: { iso: string; tam?: number; claro?: boolean }) {
  const { c } = useTema();
  const b = emBrasilia(iso);
  const d = new Date(Date.UTC(b.ano, b.mes - 1, b.dia));
  const cor = claro ? c.azul : "#FFFFFF";
  return (
    <View style={{ width: tam, paddingVertical: tam * 0.14, alignItems: "center", backgroundColor: claro ? c.realce : AZUL }}>
      <Text style={{ fontFamily: F.negrito, fontSize: tam * 0.17, letterSpacing: 1, color: claro ? c.suave : "#D9E6EF" }}>{SEM[d.getUTCDay()]}</Text>
      <Text style={{ fontFamily: F.negrito, fontSize: tam * 0.44, lineHeight: tam * 0.5, color: cor, letterSpacing: -0.5 }}>{b.dia}</Text>
      <Text style={{ fontFamily: F.negrito, fontSize: tam * 0.17, letterSpacing: 1, color: claro ? c.suave : "#D9E6EF" }}>{MES[b.mes - 1]}</Text>
    </View>
  );
}

/** Ícone de status: preenchido (confirmado), tracejado (aguardando), × (não poderá). */
export function StatusIcone({ r, tam = 22 }: { r: Resposta; tam?: number }) {
  const { c } = useTema();
  if (r === "confirmado") return <View accessibilityLabel="Confirmado" style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: c.escuro ? c.azul : AZUL, alignItems: "center", justifyContent: "center" }}><Check size={tam * 0.62} color="#fff" strokeWidth={3} /></View>;
  if (r === "recusado") return <View accessibilityLabel="Não poderá" style={{ width: tam, height: tam, borderRadius: tam / 2, borderWidth: 1.5, borderColor: VERMELHO, alignItems: "center", justifyContent: "center" }}><X size={tam * 0.6} color={VERMELHO} strokeWidth={2.6} /></View>;
  return <View accessibilityLabel="Aguardando" style={{ width: tam, height: tam, borderRadius: tam / 2, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.suave }} />;
}

export const textoStatus = (r: Resposta, eu?: boolean) => (r === "confirmado" ? (eu ? "Você confirmou" : "Confirmado") : r === "recusado" ? (eu ? "Você avisou que não poderá" : "Não poderá") : eu ? "Aguardando a sua resposta" : "Aguardando");

/** Linha de pessoa: foto, nome curto, função embaixo e algo à direita. */
export function LinhaPessoa({ id, nome, foto, sub, direita, destaque, alerta, primeira }: { id?: string; nome?: string; foto?: string; sub?: ReactNode; direita?: ReactNode; destaque?: boolean; alerta?: boolean; primeira?: boolean }) {
  const { c } = useTema();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: primeira ? 0 : 1, borderTopColor: c.fundo }}>
      <View>
        {id && nome ? <FotoPessoa id={id} nome={nome} foto={foto} tam={40} /> : <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borda }} />}
        {alerta ? <View style={{ position: "absolute", right: -1, top: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: VERMELHO, borderWidth: 2, borderColor: c.sup }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <T s={15} f={F.semi} cor={!nome ? c.suave : destaque ? c.azul : c.texto} linhas={1}>{nome ? nomeCurto(nome) : "A definir"}{destaque ? " (você)" : ""}</T>
        {sub ? <T s={12.5} cor={c.suave} linhas={2}>{sub}</T> : null}
      </View>
      {direita}
    </View>
  );
}
