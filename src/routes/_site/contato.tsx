import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { linkTelefone, linkWhatsapp } from "@/lib/utils";
import { CapaPagina, Redes } from "@/components/site/Layout";
import { BotoesRota, Mapa } from "@/components/site/Blocos";
import { IconeWhatsapp } from "@/components/site/Icones";

export const Route = createFileRoute("/_site/contato")({ component: Contato, head: () => ({ meta: [{ title: "Contato" }] }) });

function Contato() {
  const { contato: ct, geral: g } = useConteudo();
  const [nome, setNome] = useState("");
  const [assunto, setAssunto] = useState("Quero conhecer a igreja");
  const [msg, setMsg] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const texto = `Olá! Meu nome é ${nome}.\nAssunto: ${assunto}\n\n${msg}`;
    const zap = linkWhatsapp(g.whatsapp, texto);
    if (zap) window.open(zap, "_blank", "noopener");
    else if (g.email) window.location.href = `mailto:${g.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`;
  };

  const podeEnviar = !!(g.whatsapp || g.email);

  return (
    <>
      <CapaPagina rotulo="Estamos aqui" titulo={ct.titulo} texto={ct.texto} />
      <section className="container-site grid gap-10 py-20 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid content-start gap-5">
          <Info Icone={MapPin} titulo="Endereço">{g.endereco.linha1}<br />{g.endereco.linha2}{g.endereco.cep && <><br />CEP {g.endereco.cep}</>}</Info>
          {g.telefone && <Info Icone={Phone} titulo="Telefone"><a href={linkTelefone(g.telefone)} className="hover:text-marca">{g.telefone}</a></Info>}
          {g.email && <Info Icone={Mail} titulo="E-mail"><a href={`mailto:${g.email}`} className="break-all hover:text-marca">{g.email}</a></Info>}
          {g.horarioAtendimento && <Info Icone={Clock} titulo="Atendimento">{g.horarioAtendimento}</Info>}
          <div className="-ml-2"><Redes /></div>
        </div>
        {podeEnviar ? (
          <form onSubmit={enviar} className="rounded-3xl bg-white p-8 ring-1 ring-linha/60 sm:p-10">
            <h2 className="text-2xl font-bold text-marca-funda">Envie uma mensagem</h2>
            <p className="mt-1 text-sm text-tinta-suave">{g.whatsapp ? "A mensagem abre no WhatsApp da igreja." : "A mensagem abre no seu e-mail."}</p>
            <div className="mt-6 grid gap-4">
              <Campo rotulo="Seu nome"><input required value={nome} onChange={(e) => setNome(e.target.value)} className="campo" /></Campo>
              <Campo rotulo="Assunto">
                <select value={assunto} onChange={(e) => setAssunto(e.target.value)} className="campo">
                  {["Quero conhecer a igreja", "Pedido de oração", "Aconselhamento pastoral", "Batismo / membresia", "Outro assunto"].map((a) => <option key={a}>{a}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Mensagem"><textarea required rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} className="campo resize-y" /></Campo>
              <button className="btn-destaque mt-2 justify-self-start">{g.whatsapp ? <IconeWhatsapp size={17} /> : <Mail size={17} />} Enviar</button>
            </div>
          </form>
        ) : (
          <div className="rounded-3xl bg-white p-10 text-tinta-suave ring-1 ring-linha/60">Em breve, um canal de mensagens direto com a secretaria.</div>
        )}
      </section>
      <section className="container-site pb-20">
        <Mapa consulta={g.endereco.consultaMapa} className="aspect-[16/8] shadow-lg" />
        <div className="mt-5"><BotoesRota consulta={g.endereco.consultaMapa} /></div>
      </section>
      <style>{`.campo{width:100%;border-radius:14px;border:1px solid var(--color-linha);background:white;padding:12px 16px;font-size:15.5px;outline:none}.campo:focus{border-color:var(--cor-primaria)}`}</style>
    </>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-[14px] font-semibold text-tinta">{rotulo}{children}</label>;
}

function Info({ Icone, titulo, children }: { Icone: typeof MapPin; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-3xl bg-white p-6 ring-1 ring-linha/60">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-marca-clara text-marca"><Icone size={19} /></span>
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-destaque">{titulo}</p>
        <p className="mt-1 text-[16px] text-tinta">{children}</p>
      </div>
    </div>
  );
}
