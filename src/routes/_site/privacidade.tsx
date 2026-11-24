import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useConteudo } from "@/lib/contexto";
import { abrirPreferenciasCookies } from "@/lib/consentimento";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/privacidade")({
  component: Privacidade,
  head: () => ({ meta: [{ title: "Privacidade e cookies" }, { name: "description", content: "Como a igreja trata seus dados e usa cookies neste site." }] }),
});

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-linha pt-8">
      <h2 className="text-[1.3rem] font-bold text-marca">{titulo}</h2>
      <div className="texto-corrido mt-4 text-[15.5px] leading-relaxed text-tinta [&_li]:mt-2 [&_strong]:text-marca-funda [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </section>
  );
}

function Privacidade() {
  const { geral: g } = useConteudo();
  const contato = [g.email, g.telefone].filter(Boolean).join(" · ");
  return (
    <>
      <CapaPagina rotulo="LGPD" titulo="Privacidade e cookies" texto="Como tratamos os seus dados neste site, em linha com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)." />
      <div className="container-site grid max-w-3xl gap-10 py-16">
        <p className="text-[13px] text-tinta-suave">Última atualização: novembro de 2026.</p>
        <Bloco titulo="Quem somos">
          <p>Este site é mantido pela <strong>{g.nome}</strong>{g.endereco.linha1 && <>, {g.endereco.linha1}, {g.endereco.linha2}{g.endereco.cep && <>, CEP {g.endereco.cep}</>}</>}. A igreja é a controladora dos dados tratados aqui.</p>
        </Bloco>
        <Bloco titulo="Quais dados usamos">
          <p>O site não pede cadastro de visitantes. Quando você entra em contato pelo WhatsApp, telefone ou e-mail, usamos as informações que você enviar apenas para responder. As votações online da igreja usam um link individual enviado ao membro, e o voto secreto não fica ligado ao nome de quem votou.</p>
          <p>A empresa de hospedagem registra informações técnicas de acesso (como endereço IP e navegador) por segurança e para o site funcionar.</p>
        </Bloco>
        <Bloco titulo="Aplicativo dos membros">
          <p>O aplicativo “1ª IEC Brasília” (Google Play, App Store e versão web) é só para membros, com cadastro aprovado pela secretaria. Guardamos o nome, o celular, o e-mail, a data de nascimento e, se você quiser, uma foto. Também ficam na sua conta as preferências de leitura, os versículos e hinos guardados e a última leitura da Bíblia.</p>
          <p>As contribuições por Pix são feitas no app do seu banco: o aplicativo não recebe dados bancários nem de cartão. Quando você informa que fez um Pix, registramos o tipo, o valor e a data para a tesouraria conferir.</p>
          <p>Se você permitir notificações, o aparelho recebe um código de notificação para avisos da igreja (boletim, votações e reuniões). Nas reuniões online, a sala é do serviço Jitsi Meet e registramos a sua presença.</p>
          <p>Os dados não são vendidos nem usados para publicidade. Você pode excluir a conta a qualquer momento no próprio aplicativo (Mais → Excluir minha conta); os registros de contribuições permanecem com a tesouraria, como exige a contabilidade da igreja.</p>
        </Bloco>
        <Bloco titulo="Cookies e armazenamento no navegador">
          <ul>
            <li><strong>Essenciais</strong> — guardam sua escolha sobre cookies e mantêm a sessão da equipe na área administrativa. Não podem ser desligados.</li>
            <li><strong>Vídeos e mapas (opcionais)</strong> — os vídeos vêm do YouTube (no modo de privacidade aprimorada) e o mapa vem do Google Maps. Esses serviços só são carregados depois da sua permissão e podem gravar cookies próprios, conforme as políticas do Google.</li>
          </ul>
          <p>Não usamos cookies de publicidade nem de rastreamento para anúncios.</p>
          <p><button type="button" onClick={abrirPreferenciasCookies} className="btn-contorno mt-2">Mudar minhas escolhas</button></p>
        </Bloco>
        <Bloco titulo="Seus direitos">
          <p>Você pode pedir a confirmação de que tratamos seus dados, acesso, correção, exclusão ou informações sobre compartilhamento, como prevê o art. 18 da LGPD. {contato ? <>Fale com a secretaria da igreja: <strong>{contato}</strong>.</> : "Fale com a secretaria da igreja."}</p>
        </Bloco>
      </div>
    </>
  );
}
