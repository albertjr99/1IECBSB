import { router } from "expo-router";
import { ChevronRight, FileText } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Aviso, Cartao, Carregando, Linha, Separador, Tela } from "@/componentes/ui";
import { chamar } from "@/lib/api";
import { useTema } from "@/lib/tema";
import { dataPorExtenso } from "@/lib/util";

export default function Boletins() {
  const { c } = useTema();
  const [l, setL] = useState<{ id: string; data: string }[] | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => { chamar<{ id: string; data: string }[]>("boletins").then(setL).catch((e) => setErro(e.message)); }, []);
  return (
    <Tela voltar titulo="Boletins">
      {!l ? (erro ? <Aviso texto={erro} /> : <Carregando />) : !l.length ? <Aviso texto="Nenhum boletim publicado ainda." /> : (
        <Cartao>
          {l.map((b, i) => (
            <View key={b.id}>
              {i ? <Separador /> : null}
              <Linha icone={<FileText size={20} color={c.azul} />} titulo="Boletim Dominical" sub={dataPorExtenso(b.data)} onPress={() => router.push(`/boletim/${b.data}`)} direita={<ChevronRight size={18} color={c.suave} />} />
            </View>
          ))}
        </Cartao>
      )}
    </Tela>
  );
}
