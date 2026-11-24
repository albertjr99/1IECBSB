/**
 * Editores de cada parte do site. Cada um recebe o rascunho e uma função
 * `mudar` que altera uma cópia — o painel cuida de salvar e da prévia.
 */
import type { ReactNode } from "react";
import { Building2, CalendarClock, CalendarHeart, Church, Eye, EyeOff, HandCoins, HeartHandshake, House, ListTree, Mail, MonitorPlay, Palette, Users, type LucideIcon } from "lucide-react";
import { ICONES_MARCA, iconeMinisterio, novoId, type Conteudo } from "@/lib/conteudo";
import { Campo, CampoImagem, Grade, Interruptor, ListaEditavel, ListaTextos, Secao, Selecao } from "./kit";

export type Mudar = (fn: (c: Conteudo) => void) => void;
type P = { c: Conteudo; mudar: Mudar };

export function EditorGeral({ c, mudar }: P) {
  const g = c.geral;
  return (
    <>
      <Secao titulo="Identidade" descricao="Nome da igreja como aparece no topo, no rodapé e nos buscadores.">
        <Campo rotulo="Nome completo" valor={g.nome} onChange={(v) => mudar((d) => { d.geral.nome = v; })} />
        <Grade>
          <Campo rotulo="Nome curto" valor={g.nomeCurto} onChange={(v) => mudar((d) => { d.geral.nomeCurto = v; })} dica="Usado em espaços menores." />
          <Campo rotulo="Frase de apresentação" valor={g.slogan} onChange={(v) => mudar((d) => { d.geral.slogan = v; })} />
        </Grade>
        <Campo rotulo="Descrição para o Google" valor={g.descricaoSite} multilinha linhas={2} onChange={(v) => mudar((d) => { d.geral.descricaoSite = v; })} dica="Aparece nos resultados de busca e ao compartilhar o link." />
      </Secao>
      <Secao titulo="Contatos" descricao="Campos vazios não aparecem no site.">
        <Grade>
          <Campo rotulo="Telefone" valor={g.telefone} placeholder="(61) 3000-0000" onChange={(v) => mudar((d) => { d.geral.telefone = v; })} />
          <Campo rotulo="WhatsApp" valor={g.whatsapp} placeholder="(61) 90000-0000" onChange={(v) => mudar((d) => { d.geral.whatsapp = v; })} dica="Ativa o botão de WhatsApp e o formulário de contato." />
          <Campo rotulo="E-mail" valor={g.email} tipo="email" onChange={(v) => mudar((d) => { d.geral.email = v; })} />
          <Campo rotulo="Horário de atendimento" valor={g.horarioAtendimento} placeholder="Ter – Sex: 9h às 17h" onChange={(v) => mudar((d) => { d.geral.horarioAtendimento = v; })} />
        </Grade>
      </Secao>
      <Secao titulo="Endereço e mapa">
        <Grade>
          <Campo rotulo="Endereço (linha 1)" valor={g.endereco.linha1} onChange={(v) => mudar((d) => { d.geral.endereco.linha1 = v; })} />
          <Campo rotulo="Bairro, cidade — UF" valor={g.endereco.linha2} onChange={(v) => mudar((d) => { d.geral.endereco.linha2 = v; })} />
          <Campo rotulo="CEP" valor={g.endereco.cep} onChange={(v) => mudar((d) => { d.geral.endereco.cep = v; })} />
        </Grade>
        <Campo
          rotulo="Busca do mapa"
          valor={g.endereco.consultaMapa}
          onChange={(v) => mudar((d) => { d.geral.endereco.consultaMapa = v; })}
          dica="O que o Google Maps, o Waze e o Uber procuram. Para o ponto exato, cole as coordenadas (ex.: -15.8267,-47.9218) copiadas do Google Maps."
        />
      </Secao>
      <Secao titulo="Redes sociais" descricao="Cole o endereço completo. Deixe vazio para esconder o ícone.">
        <Grade>
          <Campo rotulo="Instagram" valor={g.redes.instagram} onChange={(v) => mudar((d) => { d.geral.redes.instagram = v; })} />
          <Campo rotulo="YouTube" valor={g.redes.youtube} onChange={(v) => mudar((d) => { d.geral.redes.youtube = v; })} />
          <Campo rotulo="Facebook" valor={g.redes.facebook} onChange={(v) => mudar((d) => { d.geral.redes.facebook = v; })} />
          <Campo rotulo="Spotify" valor={g.redes.spotify} onChange={(v) => mudar((d) => { d.geral.redes.spotify = v; })} />
        </Grade>
      </Secao>
    </>
  );
}

const PALETA = [
  { nome: "Branco", hex: "#FFFFFF", uso: "Base · 60%" },
  { nome: "Névoa", hex: "#F3F6F9", uso: "Fundos de apoio" },
  { nome: "Azul Congregacional", hex: "#00436F", uso: "Principal · 30–35%" },
  { nome: "Azul Noite", hex: "#002A47", uso: "Fundos escuros" },
  { nome: "Azul Céu", hex: "#D9E6EF", uso: "Linhas e tons claros" },
  { nome: "Azul Médio", hex: "#5B7F99", uso: "Texto secundário" },
  { nome: "Grafite", hex: "#1D2B36", uso: "Texto corrido" },
  { nome: "Vermelho Cruz", hex: "#CC2127", uso: "Só detalhes · até 5%" },
];

/** As cores e fontes seguem o Manual da Marca e ficam fixas — aqui só são exibidas. */
export function EditorAparencia(_: P) {
  return (
    <>
      <Secao titulo="Cores da marca" descricao="Definidas pelo Manual da Marca da igreja. Ficam fixas para o site nunca sair da identidade visual.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PALETA.map((c) => (
            <div key={c.hex} className="overflow-hidden rounded-md border border-p-borda">
              <div className="h-12 border-b border-p-borda" style={{ background: c.hex }} />
              <div className="p-2">
                <p className="text-[12px] font-semibold text-p-texto">{c.nome}</p>
                <p className="font-mono text-[11px] text-p-suave">{c.hex}</p>
                <p className="text-[11px] text-p-suave">{c.uso}</p>
              </div>
            </div>
          ))}
        </div>
      </Secao>
      <Secao titulo="Regras de uso" descricao="O que o site já aplica automaticamente.">
        <ul className="grid gap-1.5 text-[13px] leading-relaxed text-p-texto-2 [&_strong]:text-p-texto">
          <li>• <strong>Montserrat</strong> em títulos e textos; <strong>Lora Itálico</strong> só em versículos e citações.</li>
          <li>• <strong>Vermelho só em detalhes:</strong> a cruz, a cruzinha antes dos sobretítulos, o traço acima dos nomes e o selo “ao vivo”.</li>
          <li>• <strong>Cantos retos</strong> e botões azuis em maiúsculas espaçadas.</li>
          <li>• <strong>Fotos:</strong> a foto principal da página inicial aparece recortada no formato do monte.</li>
          <li>• Logos, grafismos e ícones oficiais ficam em <span className="font-mono">/marca</span>.</li>
        </ul>
      </Secao>
    </>
  );
}

export function EditorMenu({ c, mudar }: P) {
  return (
    <Secao titulo="Menu do site" descricao="Renomeie, reordene ou esconda itens do menu. As páginas continuam existindo mesmo escondidas.">
      <div className="grid gap-2">
        {c.menu.map((m, i) => (
          <div key={m.id} className="flex items-center gap-2 rounded-md border border-p-borda bg-p-superficie p-2 pl-3">
            <input value={m.rotulo} onChange={(e) => mudar((d) => { d.menu[i]!.rotulo = e.target.value; })} className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-[14px] font-semibold outline-none focus:bg-p-sutil" />
            <span className="hidden text-[12px] text-p-suave sm:block">{m.para}</span>
            <button type="button" title="Subir" disabled={i === 0} onClick={() => mudar((d) => { [d.menu[i - 1], d.menu[i]] = [d.menu[i]!, d.menu[i - 1]!]; })} className="rounded-lg px-2 py-1 text-p-suave hover:bg-p-hover disabled:opacity-30">↑</button>
            <button type="button" title="Descer" disabled={i === c.menu.length - 1} onClick={() => mudar((d) => { [d.menu[i + 1], d.menu[i]] = [d.menu[i]!, d.menu[i + 1]!]; })} className="rounded-lg px-2 py-1 text-p-suave hover:bg-p-hover disabled:opacity-30">↓</button>
            <button type="button" title={m.visivel ? "Esconder" : "Mostrar"} onClick={() => mudar((d) => { d.menu[i]!.visivel = !m.visivel; })} className={`rounded-lg p-2 ${m.visivel ? "text-p-acento" : "text-p-borda-forte"} hover:bg-p-hover`}>
              {m.visivel ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        ))}
      </div>
    </Secao>
  );
}

export function EditorInicio({ c, mudar }: P) {
  const h = c.inicio.hero;
  const b = c.inicio.boasVindas;
  const m = c.inicio.mostrar;
  const nomes: Record<keyof typeof m, string> = {
    programacao: "Programação semanal", boasVindas: "Quem somos (boas-vindas)", mensagens: "Últimas mensagens (YouTube)",
    eventos: "Próximos eventos", versiculo: "Versículo", contribua: "Chamada de dízimos e ofertas", localizacao: "Localização e mapa",
  };
  return (
    <>
      <Secao titulo="Destaque do topo" descricao="A primeira coisa que o visitante vê.">
        <Campo rotulo="Texto acima do título" valor={h.sobretitulo} onChange={(v) => mudar((d) => { d.inicio.hero.sobretitulo = v; })} />
        <Campo rotulo="Título" valor={h.titulo} onChange={(v) => mudar((d) => { d.inicio.hero.titulo = v; })} />
        <Campo rotulo="Subtítulo" valor={h.subtitulo} multilinha linhas={2} onChange={(v) => mudar((d) => { d.inicio.hero.subtitulo = v; })} />
        <CampoImagem rotulo="Foto de fundo (opcional)" valor={h.imagem} onChange={(v) => mudar((d) => { d.inicio.hero.imagem = v; })} dica="Horizontal, de preferência 1920 × 1080. Sem foto, usa o fundo azul com o arco." proporcao="aspect-[16/7]" />
        <span className="text-[13px] font-semibold text-p-texto-2">Botões</span>
        {h.botoes.map((bt, i) => (
          <div key={i} className="grid gap-2 rounded-md bg-p-sutil p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input value={bt.rotulo} placeholder="Texto do botão" onChange={(e) => mudar((d) => { d.inicio.hero.botoes[i]!.rotulo = e.target.value; })} className="rounded-lg border border-p-borda-forte px-3 py-2 text-[14px]" />
            <input value={bt.link} placeholder="/programacao ou https://…" onChange={(e) => mudar((d) => { d.inicio.hero.botoes[i]!.link = e.target.value; })} className="rounded-lg border border-p-borda-forte px-3 py-2 text-[14px]" />
            <button type="button" onClick={() => mudar((d) => { d.inicio.hero.botoes.splice(i, 1); })} className="rounded-lg px-3 text-[13px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10">Remover</button>
          </div>
        ))}
        {h.botoes.length < 3 && (
          <button type="button" onClick={() => mudar((d) => { d.inicio.hero.botoes.push({ rotulo: "Novo botão", link: "/" }); })} className="justify-self-start text-[13px] font-semibold text-p-acento hover:underline">+ Adicionar botão</button>
        )}
      </Secao>
      <Secao titulo="Seções da página inicial" descricao="Ligue ou desligue cada bloco.">
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(m) as (keyof typeof m)[]).map((k) => (
            <Interruptor key={k} rotulo={nomes[k]} valor={m[k]} onChange={(v) => mudar((d) => { d.inicio.mostrar[k] = v; })} />
          ))}
        </div>
      </Secao>
      <Secao titulo="Quem somos (boas-vindas)">
        <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((d) => { d.inicio.boasVindas.titulo = v; })} />
        <Campo rotulo="Texto" valor={b.texto} multilinha linhas={6} onChange={(v) => mudar((d) => { d.inicio.boasVindas.texto = v; })} dica="Deixe uma linha em branco entre parágrafos." />
        <CampoImagem rotulo="Foto" valor={b.imagem} onChange={(v) => mudar((d) => { d.inicio.boasVindas.imagem = v; })} proporcao="aspect-[4/3]" />
        <Grade>
          <Campo rotulo="Texto do botão" valor={b.rotuloBotao} onChange={(v) => mudar((d) => { d.inicio.boasVindas.rotuloBotao = v; })} />
          <Campo rotulo="Link do botão" valor={b.link} onChange={(v) => mudar((d) => { d.inicio.boasVindas.link = v; })} />
        </Grade>
      </Secao>
      <Secao titulo="Versículo">
        <Campo rotulo="Texto" valor={c.inicio.versiculo.texto} multilinha linhas={3} onChange={(v) => mudar((d) => { d.inicio.versiculo.texto = v; })} />
        <Campo rotulo="Referência" valor={c.inicio.versiculo.referencia} onChange={(v) => mudar((d) => { d.inicio.versiculo.referencia = v; })} />
      </Secao>
    </>
  );
}

export function EditorProgramacao({ c, mudar }: P) {
  const p = c.programacao;
  const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return (
    <>
      <Secao titulo="Textos">
        <Campo rotulo="Título" valor={p.titulo} onChange={(v) => mudar((d) => { d.programacao.titulo = v; })} />
        <Campo rotulo="Subtítulo" valor={p.subtitulo} onChange={(v) => mudar((d) => { d.programacao.subtitulo = v; })} />
        <Campo rotulo="Aviso abaixo do carrossel" valor={p.aviso} onChange={(v) => mudar((d) => { d.programacao.aviso = v; })} placeholder="Ex.: Programação sujeita a alterações." />
      </Secao>
      <Secao titulo="Cartão de abertura" descricao="O primeiro cartão do carrossel. A foto é opcional.">
        <CampoImagem rotulo="Foto (opcional)" valor={p.capaImagem} onChange={(v) => mudar((d) => { d.programacao.capaImagem = v; })} proporcao="aspect-[5/4] max-w-xs" />
        <Grade>
          <Campo rotulo="Título" valor={p.capaTitulo} onChange={(v) => mudar((d) => { d.programacao.capaTitulo = v; })} dica="A primeira metade sai fina; a segunda, em destaque." />
          <Campo rotulo="Linha de baixo" valor={p.capaSubtitulo} onChange={(v) => mudar((d) => { d.programacao.capaSubtitulo = v; })} />
        </Grade>
      </Secao>
      <Secao titulo="Dias da semana" descricao="Cada dia vira um cartão do carrossel. O cartão do dia atual ganha o selo “Hoje”.">
        <ListaEditavel
          itens={p.dias}
          onChange={(v) => mudar((d) => { d.programacao.dias = v; })}
          novo={() => ({ id: novoId("dia"), dia: "Novo dia", diaSemana: -1, observacao: "", itens: [{ id: novoId("ag"), titulo: "Atividade", detalhe: "", horario: "19h" }] })}
          titulo={(d) => d.dia}
          subtitulo={(d) => d.itens.map((i) => `${i.titulo} ${i.horario}`).join(" · ")}
          rotuloNovo="Adicionar dia"
          render={(d, m) => (
            <>
              <Grade>
                <Campo rotulo="Nome no cartão" valor={d.dia} onChange={(v) => m((x) => { x.dia = v; })} placeholder="Domingo" />
                <Selecao rotulo="Dia da semana (para o selo “Hoje”)" valor={String(d.diaSemana)} onChange={(v) => m((x) => { x.diaSemana = Number(v); })} opcoes={[{ valor: "-1", rotulo: "Nenhum" }, ...DIAS.map((n, i) => ({ valor: String(i), rotulo: n }))]} />
              </Grade>
              <ListaEditavel
                itens={d.itens}
                onChange={(v) => m((x) => { x.itens = v; })}
                novo={() => ({ id: novoId("ag"), titulo: "Atividade", detalhe: "", horario: "" })}
                titulo={(i) => `${i.titulo}${i.horario ? ` — ${i.horario}` : ""}`}
                subtitulo={(i) => i.detalhe}
                rotuloNovo="Adicionar atividade"
                render={(i, mm) => (
                  <Grade cols={3}>
                    <Campo rotulo="Atividade" valor={i.titulo} onChange={(v) => mm((x) => { x.titulo = v; })} />
                    <Campo rotulo="Detalhe (opcional)" valor={i.detalhe} onChange={(v) => mm((x) => { x.detalhe = v; })} />
                    <Campo rotulo="Horário" valor={i.horario} onChange={(v) => mm((x) => { x.horario = v; })} placeholder="19h30" />
                  </Grade>
                )}
              />
              <Campo rotulo="Observação (rodapé do cartão)" valor={d.observacao} onChange={(v) => m((x) => { x.observacao = v; })} placeholder="*Confirme o local pelo direct do Instagram." />
            </>
          )}
        />
      </Secao>
    </>
  );
}

export function EditorEventos({ c, mudar }: P) {
  const e = c.eventos;
  return (
    <>
      <Secao titulo="Textos">
        <Grade>
          <Campo rotulo="Título" valor={e.titulo} onChange={(v) => mudar((d) => { d.eventos.titulo = v; })} />
          <Campo rotulo="Subtítulo" valor={e.subtitulo} onChange={(v) => mudar((d) => { d.eventos.subtitulo = v; })} />
        </Grade>
      </Secao>
      <Secao titulo="Eventos" descricao="Eventos passados saem da página inicial sozinhos e vão para “Eventos anteriores”.">
        <ListaEditavel
          itens={e.itens}
          onChange={(v) => mudar((d) => { d.eventos.itens = v; })}
          novo={() => ({ id: novoId("ev"), titulo: "Novo evento", data: new Date().toISOString().slice(0, 10), dataFim: "", horario: "", local: "", descricao: "", imagem: "", rotuloLink: "Inscreva-se", link: "", destaque: false, publicado: true })}
          titulo={(x) => x.titulo}
          subtitulo={(x) => `${x.data.split("-").reverse().join("/")}${x.publicado ? "" : " · rascunho"}${x.destaque ? " · em destaque" : ""}`}
          rotuloNovo="Adicionar evento"
          vazio="Nenhum evento cadastrado."
          render={(x, m) => (
            <>
              <Campo rotulo="Nome do evento" valor={x.titulo} onChange={(v) => m((d) => { d.titulo = v; })} />
              <Grade cols={3}>
                <Campo rotulo="Data de início" tipo="date" valor={x.data} onChange={(v) => m((d) => { d.data = v; })} />
                <Campo rotulo="Data de término" tipo="date" valor={x.dataFim} onChange={(v) => m((d) => { d.dataFim = v; })} dica="Opcional" />
                <Campo rotulo="Horário" valor={x.horario} onChange={(v) => m((d) => { d.horario = v; })} placeholder="19h30" />
              </Grade>
              <Campo rotulo="Local" valor={x.local} onChange={(v) => m((d) => { d.local = v; })} />
              <Campo rotulo="Descrição" valor={x.descricao} multilinha linhas={3} onChange={(v) => m((d) => { d.descricao = v; })} />
              <CampoImagem rotulo="Imagem / arte" valor={x.imagem} onChange={(v) => m((d) => { d.imagem = v; })} proporcao="aspect-[16/10]" />
              <Grade>
                <Campo rotulo="Texto do botão" valor={x.rotuloLink} onChange={(v) => m((d) => { d.rotuloLink = v; })} />
                <Campo rotulo="Link (inscrição, mais informações)" valor={x.link} onChange={(v) => m((d) => { d.link = v; })} placeholder="https://…" />
              </Grade>
              <div className="grid gap-2 sm:grid-cols-2">
                <Interruptor rotulo="Publicado" valor={x.publicado} onChange={(v) => m((d) => { d.publicado = v; })} dica="Desligado, fica só no painel." />
                <Interruptor rotulo="Aviso em destaque" valor={x.destaque} onChange={(v) => m((d) => { d.destaque = v; })} dica="Abre uma janela ao entrar no site, até o evento passar." />
              </div>
            </>
          )}
        />
      </Secao>
    </>
  );
}

export function EditorSobre({ c, mudar }: P) {
  const s = c.sobre;
  return (
    <>
      <Secao titulo="Apresentação">
        <Campo rotulo="Título da página" valor={s.titulo} onChange={(v) => mudar((d) => { d.sobre.titulo = v; })} />
        <Campo rotulo="Introdução" valor={s.introducao} multilinha linhas={2} onChange={(v) => mudar((d) => { d.sobre.introducao = v; })} />
      </Secao>
      <Secao titulo="História">
        <Campo rotulo="Título" valor={s.historiaTitulo} onChange={(v) => mudar((d) => { d.sobre.historiaTitulo = v; })} />
        <Campo rotulo="Texto" valor={s.historia} multilinha linhas={10} onChange={(v) => mudar((d) => { d.sobre.historia = v; })} dica="Deixe uma linha em branco entre parágrafos." />
        <CampoImagem rotulo="Foto" valor={s.imagem} onChange={(v) => mudar((d) => { d.sobre.imagem = v; })} proporcao="aspect-[4/5] max-w-xs" />
      </Secao>
      <Secao titulo="Missão, visão e valores">
        <Campo rotulo="Missão" valor={s.missao} multilinha linhas={2} onChange={(v) => mudar((d) => { d.sobre.missao = v; })} />
        <Campo rotulo="Visão" valor={s.visao} multilinha linhas={2} onChange={(v) => mudar((d) => { d.sobre.visao = v; })} />
        <ListaTextos rotulo="Valores" valores={s.valores} onChange={(v) => mudar((d) => { d.sobre.valores = v; })} />
      </Secao>
      <Secao titulo="O que cremos">
        <Campo rotulo="Título" valor={s.feTitulo} onChange={(v) => mudar((d) => { d.sobre.feTitulo = v; })} />
        <Campo rotulo="Introdução" valor={s.feIntroducao} multilinha linhas={2} onChange={(v) => mudar((d) => { d.sobre.feIntroducao = v; })} />
        <ListaEditavel
          itens={s.fe}
          onChange={(v) => mudar((d) => { d.sobre.fe = v; })}
          novo={() => ({ id: novoId("fe"), titulo: "Novo ponto", texto: "" })}
          titulo={(x) => x.titulo}
          rotuloNovo="Adicionar ponto de fé"
          render={(x, m) => (
            <>
              <Campo rotulo="Título" valor={x.titulo} onChange={(v) => m((d) => { d.titulo = v; })} />
              <Campo rotulo="Texto" valor={x.texto} multilinha linhas={3} onChange={(v) => m((d) => { d.texto = v; })} />
            </>
          )}
        />
      </Secao>
    </>
  );
}

export function EditorLideranca({ c, mudar }: P) {
  const l = c.lideranca;
  return (
    <>
      <Secao titulo="Textos">
        <Campo rotulo="Título" valor={l.titulo} onChange={(v) => mudar((d) => { d.lideranca.titulo = v; })} />
        <Campo rotulo="Introdução" valor={l.introducao} onChange={(v) => mudar((d) => { d.lideranca.introducao = v; })} />
      </Secao>
      <Secao titulo="Grupos" descricao="Pastores, presbitério, diaconia… Grupos sem pessoas não aparecem no site.">
        <ListaEditavel
          itens={l.grupos}
          onChange={(v) => mudar((d) => { d.lideranca.grupos = v; })}
          novo={() => ({ id: novoId("grp"), nome: "Novo grupo", membros: [] })}
          titulo={(g) => g.nome}
          subtitulo={(g) => `${g.membros.length} ${g.membros.length === 1 ? "pessoa" : "pessoas"}`}
          rotuloNovo="Adicionar grupo"
          render={(g, m) => (
            <>
              <Campo rotulo="Nome do grupo" valor={g.nome} onChange={(v) => m((d) => { d.nome = v; })} />
              <ListaEditavel
                itens={g.membros}
                onChange={(v) => m((d) => { d.membros = v; })}
                novo={() => ({ id: novoId("pes"), nome: "Nome", cargo: "", foto: "", bio: "" })}
                titulo={(p) => p.nome}
                subtitulo={(p) => p.cargo}
                rotuloNovo="Adicionar pessoa"
                render={(p, mm) => (
                  <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                    <CampoImagem rotulo="Foto" valor={p.foto} onChange={(v) => mm((d) => { d.foto = v; })} proporcao="aspect-square" />
                    <div className="grid content-start gap-4">
                      <Campo rotulo="Nome" valor={p.nome} onChange={(v) => mm((d) => { d.nome = v; })} />
                      <Campo rotulo="Cargo / função" valor={p.cargo} onChange={(v) => mm((d) => { d.cargo = v; })} />
                      <Campo rotulo="Apresentação curta" valor={p.bio} multilinha linhas={3} onChange={(v) => mm((d) => { d.bio = v; })} />
                    </div>
                  </div>
                )}
              />
            </>
          )}
        />
      </Secao>
    </>
  );
}

export function EditorMinisterios({ c, mudar }: P) {
  const m = c.ministerios;
  return (
    <>
      <Secao titulo="Textos">
        <Campo rotulo="Título" valor={m.titulo} onChange={(v) => mudar((d) => { d.ministerios.titulo = v; })} />
        <Campo rotulo="Introdução" valor={m.introducao} multilinha linhas={2} onChange={(v) => mudar((d) => { d.ministerios.introducao = v; })} />
      </Secao>
      <Secao titulo="Ministérios">
        <ListaEditavel
          itens={m.itens}
          onChange={(v) => mudar((d) => { d.ministerios.itens = v; })}
          novo={(): Conteudo["ministerios"]["itens"][number] => ({ id: novoId("min"), nome: "Novo ministério", descricao: "", icone: "grupos", imagem: "", lider: "", quando: "", contato: "" })}
          titulo={(x) => x.nome}
          subtitulo={(x) => x.lider}
          rotuloNovo="Adicionar ministério"
          render={(x, mm) => (
            <>
              <Grade>
                <Campo rotulo="Nome" valor={x.nome} onChange={(v) => mm((d) => { d.nome = v; })} />
                <Selecao rotulo="Ícone (da marca)" valor={x.icone || iconeMinisterio(x)} opcoes={ICONES_MARCA.map((i) => ({ valor: i.valor as string, rotulo: i.rotulo }))} onChange={(v) => mm((d) => { d.icone = v; })} />
              </Grade>
              <Campo rotulo="Descrição" valor={x.descricao} multilinha linhas={3} onChange={(v) => mm((d) => { d.descricao = v; })} />
              <CampoImagem rotulo="Foto" valor={x.imagem} onChange={(v) => mm((d) => { d.imagem = v; })} proporcao="aspect-[4/3] max-w-sm" />
              <Grade cols={3}>
                <Campo rotulo="Líder" valor={x.lider} onChange={(v) => mm((d) => { d.lider = v; })} />
                <Campo rotulo="Quando se reúne" valor={x.quando} onChange={(v) => mm((d) => { d.quando = v; })} placeholder="Sábados, 17h" />
                <Campo rotulo="WhatsApp de contato" valor={x.contato} onChange={(v) => mm((d) => { d.contato = v; })} dica="Mostra o botão “Quero participar”." />
              </Grade>
            </>
          )}
        />
      </Secao>
    </>
  );
}

export function EditorMensagens({ c, mudar }: P) {
  const m = c.mensagens;
  return (
    <>
      <Secao titulo="Página de mensagens">
        <Campo rotulo="Título" valor={m.titulo} onChange={(v) => mudar((d) => { d.mensagens.titulo = v; })} />
        <Campo rotulo="Subtítulo" valor={m.subtitulo} onChange={(v) => mudar((d) => { d.mensagens.subtitulo = v; })} />
        <Campo rotulo="Canal do YouTube" valor={m.canal} onChange={(v) => mudar((d) => { d.mensagens.canal = v.replace(/^.*@/, ""); })} dica="O identificador depois do @ (ex.: iecbsb). Os vídeos e as transmissões ao vivo vêm dele." />
        <Interruptor rotulo="Esconder vídeos curtos (Shorts)" valor={m.esconderCurtos} onChange={(v) => mudar((d) => { d.mensagens.esconderCurtos = v; })} dica="Esconde vídeos com até 3 minutos." />
      </Secao>
    </>
  );
}

export function EditorContribua({ c, mudar }: P) {
  const k = c.contribua;
  return (
    <>
      <Secao titulo="Textos">
        <Campo rotulo="Título" valor={k.titulo} onChange={(v) => mudar((d) => { d.contribua.titulo = v; })} />
        <Campo rotulo="Texto" valor={k.texto} multilinha linhas={3} onChange={(v) => mudar((d) => { d.contribua.texto = v; })} />
        <Campo rotulo="Versículo" valor={k.versiculo} multilinha linhas={2} onChange={(v) => mudar((d) => { d.contribua.versiculo = v; })} />
        <Campo rotulo="Referência" valor={k.referencia} onChange={(v) => mudar((d) => { d.contribua.referencia = v; })} />
      </Secao>
      <Secao titulo="PIX">
        <Grade cols={3}>
          <Selecao rotulo="Tipo da chave" valor={k.pixTipo} onChange={(v) => mudar((d) => { d.contribua.pixTipo = v; })} opcoes={["CNPJ", "E-mail", "Telefone", "Aleatória"].map((x) => ({ valor: x, rotulo: x }))} />
          <Campo rotulo="Chave PIX" valor={k.pixChave} onChange={(v) => mudar((d) => { d.contribua.pixChave = v; })} />
          <Campo rotulo="Favorecido" valor={k.pixFavorecido} onChange={(v) => mudar((d) => { d.contribua.pixFavorecido = v; })} />
        </Grade>
      </Secao>
      <Secao titulo="Contas bancárias">
        <ListaEditavel
          itens={k.contas}
          onChange={(v) => mudar((d) => { d.contribua.contas = v; })}
          novo={() => ({ id: novoId("cta"), banco: "Banco", agencia: "", conta: "", favorecido: "", documento: "" })}
          titulo={(x) => x.banco}
          subtitulo={(x) => [x.agencia, x.conta].filter(Boolean).join(" / ")}
          rotuloNovo="Adicionar conta"
          vazio="Nenhuma conta cadastrada."
          render={(x, mm) => (
            <Grade>
              <Campo rotulo="Banco" valor={x.banco} onChange={(v) => mm((d) => { d.banco = v; })} />
              <Campo rotulo="Favorecido" valor={x.favorecido} onChange={(v) => mm((d) => { d.favorecido = v; })} />
              <Campo rotulo="Agência" valor={x.agencia} onChange={(v) => mm((d) => { d.agencia = v; })} />
              <Campo rotulo="Conta" valor={x.conta} onChange={(v) => mm((d) => { d.conta = v; })} />
              <Campo rotulo="CNPJ" valor={x.documento} onChange={(v) => mm((d) => { d.documento = v; })} />
            </Grade>
          )}
        />
      </Secao>
    </>
  );
}

export function EditorContato({ c, mudar }: P) {
  return (
    <>
      <Secao titulo="Página de contato" descricao="Telefone, e-mail e endereço vêm de “Dados da igreja”.">
        <Campo rotulo="Título" valor={c.contato.titulo} onChange={(v) => mudar((d) => { d.contato.titulo = v; })} />
        <Campo rotulo="Texto" valor={c.contato.texto} multilinha linhas={2} onChange={(v) => mudar((d) => { d.contato.texto = v; })} />
      </Secao>
      <Secao titulo="Rodapé">
        <Campo rotulo="Frase do rodapé" valor={c.rodape.texto} onChange={(v) => mudar((d) => { d.rodape.texto = v; })} />
      </Secao>
    </>
  );
}

export type DefSecao = {
  id: string;
  rotulo: string;
  descricao: string;
  grupo: "Site" | "Páginas";
  previa: string;
  Icone: LucideIcon;
  /** Partes do conteúdo que a seção altera (para marcar o que ainda não foi publicado). */
  chaves: (keyof Conteudo)[];
  Editor: (p: P) => ReactNode;
};

export const SECOES: DefSecao[] = [
  { id: "geral", rotulo: "Dados da igreja", descricao: "Nome, contatos, endereço, mapa e redes sociais.", grupo: "Site", previa: "/contato", Icone: Building2, chaves: ["geral"], Editor: EditorGeral },
  { id: "aparencia", rotulo: "Identidade visual", descricao: "Cores, fontes e regras do Manual da Marca.", grupo: "Site", previa: "/", Icone: Palette, chaves: ["aparencia"], Editor: EditorAparencia },
  { id: "menu", rotulo: "Menu", descricao: "Itens, ordem e visibilidade do menu do site.", grupo: "Site", previa: "/", Icone: ListTree, chaves: ["menu"], Editor: EditorMenu },
  { id: "inicio", rotulo: "Página inicial", descricao: "Destaque do topo, seções e textos da página inicial.", grupo: "Páginas", previa: "/", Icone: House, chaves: ["inicio"], Editor: EditorInicio },
  { id: "programacao", rotulo: "Agenda semanal", descricao: "Os dias e horários do carrossel da agenda.", grupo: "Páginas", previa: "/programacao", Icone: CalendarClock, chaves: ["programacao"], Editor: EditorProgramacao },
  { id: "eventos", rotulo: "Eventos", descricao: "Congressos, conferências e datas especiais.", grupo: "Páginas", previa: "/programacao#eventos", Icone: CalendarHeart, chaves: ["eventos"], Editor: EditorEventos },
  { id: "sobre", rotulo: "A Igreja", descricao: "História, missão, visão, valores e o que cremos.", grupo: "Páginas", previa: "/sobre", Icone: Church, chaves: ["sobre"], Editor: EditorSobre },
  { id: "lideranca", rotulo: "Liderança", descricao: "Pastores, diretoria e oficiais, com fotos.", grupo: "Páginas", previa: "/lideranca", Icone: Users, chaves: ["lideranca"], Editor: EditorLideranca },
  { id: "ministerios", rotulo: "Ministérios", descricao: "Departamentos e ministérios da igreja.", grupo: "Páginas", previa: "/ministerios", Icone: HeartHandshake, chaves: ["ministerios"], Editor: EditorMinisterios },
  { id: "mensagens", rotulo: "Mensagens", descricao: "Canal do YouTube da página de mensagens.", grupo: "Páginas", previa: "/mensagens", Icone: MonitorPlay, chaves: ["mensagens"], Editor: EditorMensagens },
  { id: "contribua", rotulo: "Contribua", descricao: "PIX, contas bancárias e textos de dízimos e ofertas.", grupo: "Páginas", previa: "/contribua", Icone: HandCoins, chaves: ["contribua"], Editor: EditorContribua },
  { id: "contato", rotulo: "Contato e rodapé", descricao: "Textos da página de contato e do rodapé.", grupo: "Páginas", previa: "/contato", Icone: Mail, chaves: ["contato", "rodape"], Editor: EditorContato },
];
