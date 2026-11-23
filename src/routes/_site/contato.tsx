import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
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
      <CapaPagina titulo={ct.titulo} texto={ct.texto} />
      <section className="container-site grid gap-10 py-20 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid content-start gap-6">
          <Info titulo="Endereço">{g.endereco.linha1}<br />{g.endereco.linha2}{g.endereco.cep && <><br />CEP {g.endereco.cep}</>}</Info>
          {g.telefone && <Info titulo="Telefone"><a href={linkTelefone(g.telefone)} className="hover:text-marca">{g.telefone}</a></Info>}
          {g.email && <Info titulo="E-mail"><a href={`mailto:${g.email}`} className="break-all hover:text-marca">{g.email}</a></Info>}
          {g.horarioAtendimento && <Info titulo="Atendimento">{g.horarioAtendimento}</Info>}
          <div className="-ml-2"><Redes /></div>
        </div>
        {podeEnviar ? (
          <form onSubmit={enviar} className="rounded-lg bg-white p-8 border border-linha/70 sm:p-10">
            <h2 className="text-2xl font-semibold text-marca-funda">Envie uma mensagem</h2>
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
          <div className="self-start border-l-4 border-marca pl-6">
            <h2 className="text-2xl font-semibold text-marca-funda">Fale com a secretaria</h2>
            <p className="texto-justificado mt-2 max-w-md leading-relaxed text-tinta-suave">Ligue para a igreja ou envie uma mensagem pelo Instagram.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {g.telefone && <a href={linkTelefone(g.telefone)} className="btn-primario">Ligar {g.telefone}</a>}
              {g.redes.instagram && <a href={g.redes.instagram} target="_blank" rel="noopener noreferrer" className="btn-contorno">Mensagem no Instagram</a>}
            </div>
          </div>
        )}
      </section>
      <section className="container-site pb-20">
        <Mapa consulta={g.endereco.consultaMapa} className="aspect-[16/8]" />
        <div className="mt-5"><BotoesRota consulta={g.endereco.consultaMapa} /></div>
      </section>
      <style>{`.campo{width:100%;border-radius:6px;border:1px solid var(--color-linha);background:white;padding:12px 16px;font-size:15.5px;outline:none}.campo:focus{border-color:var(--cor-primaria)}`}</style>
    </>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-[14px] font-semibold text-tinta">{rotulo}{children}</label>;
}

function Info({ titulo, children }: { Icone?: unknown; titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-linha pt-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-tinta-suave">{titulo}</p>
      <p className="mt-1 text-[17px] leading-relaxed text-tinta">{children}</p>
    </div>
  );
}
