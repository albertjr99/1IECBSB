/** Formulário de cada tipo de bloco do boletim. */
import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { LARGURA_ROTULO, novoIdB, type Bloco, type Largura } from "@/lib/boletim";
import { Campo, Grade, Interruptor, ListaEditavel, Selecao } from "../kit";

type Mudar = (fn: (b: Bloco) => void) => void;

const DICA_FORMATO = "Use **negrito** e *itálico*. Linha em branco separa parágrafos.";

const DIVISOES = [
  { valor: "0.5", rotulo: "Iguais (50/50)" },
  { valor: "0.591", rotulo: "Esquerda maior (como a Segunda da pastoral)" },
  { valor: "0.339", rotulo: "Esquerda estreita (como os avisos)" },
  { valor: "0.661", rotulo: "Direita estreita" },
];
const divisao = (n: number | undefined, padrao: string) => {
  const v = String(n ?? padrao);
  return DIVISOES.some((d) => d.valor === v) ? v : padrao;
};

function Celula({ valor, onChange, placeholder, largura }: { valor: string; onChange: (v: string) => void; placeholder?: string; largura?: string }) {
  return (
    <input
      value={valor}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-0 rounded-lg border border-p-borda-forte bg-p-superficie px-2.5 py-1.5 text-[13.5px] outline-none focus:border-p-acento"
      style={largura ? { width: largura } : { flex: 1 }}
    />
  );
}

function BotaoRemover({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-lg p-1.5 text-p-suave hover:bg-red-500/10 hover:text-red-600 dark:text-red-400" aria-label="Remover linha"><Trash2 size={14} /></button>;
}

function BotaoAdicionar({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 justify-self-start rounded-lg border border-dashed border-p-borda-forte px-3 py-1.5 text-[13px] font-semibold text-p-acento hover:border-p-acento">
      <Plus size={14} /> {children}
    </button>
  );
}

function Rotulo({ children }: { children: ReactNode }) {
  return <span className="text-[13px] font-semibold text-p-texto-2">{children}</span>;
}

export function EditorBloco({ b, mudar }: { b: Bloco; mudar: Mudar }) {
  const comum = (
    <Grade>
      <Selecao<Largura>
        rotulo="Largura na página"
        valor={b.largura}
        onChange={(v) => mudar((x) => { x.largura = v; })}
        opcoes={(Object.keys(LARGURA_ROTULO) as Largura[]).map((k) => ({ valor: k, rotulo: LARGURA_ROTULO[k] }))}
      />
      <div className="grid gap-1.5">
        <Rotulo>Tamanho das letras: {b.ajuste || 100}%</Rotulo>
        <input type="range" min={85} max={100} step={1} value={b.ajuste || 100} onChange={(e) => mudar((x) => { x.ajuste = Number(e.target.value); })} className="mt-2 accent-[var(--cor-primaria)]" />
        <p className="text-[12px] text-p-suave">Para caber na página sem mudar o padrão. 100% = original.</p>
      </div>
    </Grade>
  );

  let corpo: ReactNode = null;
  switch (b.tipo) {
    case "artigo":
      corpo = (
        <>
          <Grade>
            <Campo rotulo="Rótulo (acima do título)" valor={b.rotulo} onChange={(v) => mudar((x) => { if (x.tipo === "artigo") x.rotulo = v; })} placeholder="Pastoral" />
            <Selecao rotulo="Posição do rótulo" valor={b.rotuloLado} onChange={(v) => mudar((x) => { if (x.tipo === "artigo") x.rotuloLado = v; })} opcoes={[{ valor: "direita", rotulo: "À direita" }, { valor: "esquerda", rotulo: "À esquerda" }]} />
          </Grade>
          <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((x) => { if (x.tipo === "artigo") x.titulo = v; })} />
          <Campo rotulo="Texto" valor={b.texto} multilinha linhas={14} onChange={(v) => mudar((x) => { if (x.tipo === "artigo") x.texto = v; })} dica={DICA_FORMATO} />
          <Grade>
            <Campo rotulo="Assinatura" valor={b.autor} onChange={(v) => mudar((x) => { if (x.tipo === "artigo") x.autor = v; })} placeholder="Pr. Hilário José" />
            <Selecao rotulo="Colunas" valor={String(b.colunas) as "1" | "2"} onChange={(v) => mudar((x) => { if (x.tipo === "artigo") x.colunas = v === "2" ? 2 : 1; })} opcoes={[{ valor: "1", rotulo: "Uma coluna (pastoral)" }, { valor: "2", rotulo: "Duas colunas (segunda da pastoral)" }]} />
          </Grade>
          {b.colunas === 2 && (
            <Selecao rotulo="Divisão das colunas" valor={divisao(b.proporcao, "0.591")} onChange={(v) => mudar((x) => { if (x.tipo === "artigo") x.proporcao = Number(v); })} opcoes={DIVISOES} />
          )}
        </>
      );
      break;
    case "avisos":
      corpo = (
        <>
        <Grade>
          <Selecao rotulo="Colunas" valor={String(b.colunas ?? 1)} onChange={(v) => mudar((x) => { if (x.tipo === "avisos") x.colunas = v === "2" ? 2 : 1; })} opcoes={[{ valor: "1", rotulo: "Uma coluna" }, { valor: "2", rotulo: "Duas colunas (texto corre de uma para a outra)" }]} />
          {(b.colunas ?? 1) === 2 ? <Selecao rotulo="Divisão das colunas" valor={divisao(b.proporcao, "0.339")} onChange={(v) => mudar((x) => { if (x.tipo === "avisos") x.proporcao = Number(v); })} opcoes={DIVISOES} /> : <span />}
        </Grade>
        <ListaEditavel
          itens={b.itens}
          onChange={(v) => mudar((x) => { if (x.tipo === "avisos") x.itens = v; })}
          novo={() => ({ id: novoIdB("av"), titulo: "Novo aviso", texto: "" })}
          titulo={(a) => a.titulo}
          subtitulo={(a) => a.texto.slice(0, 60)}
          rotuloNovo="Adicionar aviso"
          render={(a, m) => (
            <>
              <Campo rotulo="Título" valor={a.titulo} onChange={(v) => m((d) => { d.titulo = v; })} />
              <Campo rotulo="Texto" valor={a.texto} multilinha linhas={5} onChange={(v) => m((d) => { d.texto = v; })} dica={DICA_FORMATO} />
            </>
          )}
        />
        </>
      );
      break;
    case "escala":
      corpo = (
        <>
          <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.titulo = v; })} />
          <Rotulo>Escala (função · hoje · próximo domingo)</Rotulo>
          <div className="grid gap-1.5">
            <div className="flex gap-1.5">{b.cabecalho.map((c, i) => <Celula key={i} valor={c} onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.cabecalho[i] = v; })} />)}<span className="w-7" /></div>
            {b.linhas.map((l, li) => (
              <div key={l.id} className="flex gap-1.5">
                {l.celulas.map((c, i) => <Celula key={i} valor={c} onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.linhas[li]!.celulas[i] = v; })} />)}
                <BotaoRemover onClick={() => mudar((x) => { if (x.tipo === "escala") x.linhas.splice(li, 1); })} />
              </div>
            ))}
            <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "escala") x.linhas.push({ id: novoIdB("l"), celulas: ["", "", ""] }); })}>Adicionar função</BotaoAdicionar>
          </div>
          <Campo rotulo="Título dos porteiros de oração" valor={b.porteirosTitulo} onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.porteirosTitulo = v; })} />
          <div className="grid gap-1.5">
            {b.porteiros.map((p, pi) => (
              <div key={p.id} className="flex gap-1.5">
                <Celula valor={p.horario} placeholder="Das 19h00 às 19h15" largura="45%" onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.porteiros[pi]!.horario = v; })} />
                <Celula valor={p.nome} placeholder="Nome" onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.porteiros[pi]!.nome = v; })} />
                <BotaoRemover onClick={() => mudar((x) => { if (x.tipo === "escala") x.porteiros.splice(pi, 1); })} />
              </div>
            ))}
            <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "escala") x.porteiros.push({ id: novoIdB("po"), horario: "", nome: "" }); })}>Adicionar horário</BotaoAdicionar>
          </div>
          <Campo rotulo="Título dos outros trabalhos da semana" valor={b.semanaTitulo} onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.semanaTitulo = v; })} />
          <div className="grid gap-1.5">
            <div className="flex gap-1.5">
              <span className="flex-1 self-center text-[12px] text-p-suave">Dia e atividade de cada coluna →</span>
              {b.semanaColunas.map((c, ci) => (
                <div key={c.id} className="grid flex-1 gap-1">
                  <Celula valor={c.dia} placeholder="Quarta-Feira (19h30)" onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.semanaColunas[ci]!.dia = v; })} />
                  <Celula valor={c.atividade} placeholder="Estudo Bíblico" onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.semanaColunas[ci]!.atividade = v; })} />
                </div>
              ))}
              <span className="w-7" />
            </div>
            {b.semanaLinhas.map((l, li) => (
              <div key={l.id} className="flex gap-1.5">
                <Celula valor={l.funcao} placeholder="Função" onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.semanaLinhas[li]!.funcao = v; })} />
                {b.semanaColunas.map((_, ci) => <Celula key={ci} valor={l.valores[ci] ?? ""} onChange={(v) => mudar((x) => { if (x.tipo === "escala") x.semanaLinhas[li]!.valores[ci] = v; })} />)}
                <BotaoRemover onClick={() => mudar((x) => { if (x.tipo === "escala") x.semanaLinhas.splice(li, 1); })} />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "escala") x.semanaLinhas.push({ id: novoIdB("sl"), funcao: "", valores: x.semanaColunas.map(() => "") }); })}>Adicionar função</BotaoAdicionar>
              <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "escala") { x.semanaColunas.push({ id: novoIdB("sc"), dia: "", atividade: "" }); x.semanaLinhas.forEach((l) => l.valores.push("")); } })}>Adicionar dia</BotaoAdicionar>
              {b.semanaColunas.length > 0 && (
                <button type="button" className="text-[12.5px] font-semibold text-red-600 dark:text-red-400 hover:underline" onClick={() => mudar((x) => { if (x.tipo === "escala") { x.semanaColunas.pop(); x.semanaLinhas.forEach((l) => l.valores.pop()); } })}>Remover último dia</button>
              )}
            </div>
          </div>
        </>
      );
      break;
    case "aniversariantes":
      corpo = (
        <>
          <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((x) => { if (x.tipo === "aniversariantes") x.titulo = v; })} />
          <div className="grid gap-1.5">
            <Rotulo>Dia · nomes (um por linha)</Rotulo>
            {b.linhas.map((l, li) => (
              <div key={l.id} className="flex items-start gap-1.5">
                <Celula valor={l.dia} largura="56px" onChange={(v) => mudar((x) => { if (x.tipo === "aniversariantes") x.linhas[li]!.dia = v; })} />
                <textarea value={l.nomes} rows={Math.max(1, l.nomes.split("\n").length)} onChange={(e) => mudar((x) => { if (x.tipo === "aniversariantes") x.linhas[li]!.nomes = e.target.value; })} className="min-w-0 flex-1 resize-y rounded-lg border border-p-borda-forte px-2.5 py-1.5 text-[13.5px] outline-none focus:border-p-acento" />
                <BotaoRemover onClick={() => mudar((x) => { if (x.tipo === "aniversariantes") x.linhas.splice(li, 1); })} />
              </div>
            ))}
            <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "aniversariantes") x.linhas.push({ id: novoIdB("an"), dia: "", nomes: "" }); })}>Adicionar dia</BotaoAdicionar>
          </div>
          <Campo rotulo="Versículo abaixo" valor={b.versiculo} multilinha linhas={2} onChange={(v) => mudar((x) => { if (x.tipo === "aniversariantes") x.versiculo = v; })} />
          <Campo rotulo="Referência" valor={b.referencia} onChange={(v) => mudar((x) => { if (x.tipo === "aniversariantes") x.referencia = v; })} />
        </>
      );
      break;
    case "oficios":
      corpo = (
        <>
          <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((x) => { if (x.tipo === "oficios") x.titulo = v; })} />
          <div className="grid gap-2 sm:grid-cols-2">
            {b.colunas.map((c, ci) => (
              <div key={c.id} className="grid gap-1">
                <div className="flex items-center justify-between"><Rotulo>Coluna {ci + 1}</Rotulo><BotaoRemover onClick={() => mudar((x) => { if (x.tipo === "oficios") x.colunas.splice(ci, 1); })} /></div>
                <textarea rows={6} value={c.texto} onChange={(e) => mudar((x) => { if (x.tipo === "oficios") x.colunas[ci]!.texto = e.target.value; })} className="resize-y rounded-lg border border-p-borda-forte px-2.5 py-1.5 text-[13.5px] outline-none focus:border-p-acento" />
              </div>
            ))}
          </div>
          <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "oficios") x.colunas.push({ id: novoIdB("of"), texto: "" }); })}>Adicionar coluna</BotaoAdicionar>
          <p className="text-[12px] text-p-suave">Use ***Dia*** para o título em negrito e itálico de cada dia.</p>
        </>
      );
      break;
    case "trabalhos":
      corpo = (
        <>
          <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((x) => { if (x.tipo === "trabalhos") x.titulo = v; })} />
          <ListaEditavel
            itens={b.itens}
            onChange={(v) => mudar((x) => { if (x.tipo === "trabalhos") x.itens = v; })}
            novo={() => ({ id: novoIdB("tr"), titulo: "Novo campo", texto: "" })}
            titulo={(t) => t.titulo}
            rotuloNovo="Adicionar trabalho"
            render={(t, m) => (
              <>
                <Campo rotulo="Nome" valor={t.titulo} onChange={(v) => m((d) => { d.titulo = v; })} />
                <Campo rotulo="Responsável, endereço e contato" valor={t.texto} multilinha linhas={3} onChange={(v) => m((d) => { d.texto = v; })} />
              </>
            )}
          />
        </>
      );
      break;
    case "parcerias":
      corpo = (
        <>
          <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((x) => { if (x.tipo === "parcerias") x.titulo = v; })} />
          <p className="text-[12px] text-p-suave">Os itens são distribuídos em duas colunas, da esquerda para a direita.</p>
          <ListaEditavel
            itens={b.itens}
            onChange={(v) => mudar((x) => { if (x.tipo === "parcerias") x.itens = v; })}
            novo={() => ({ id: novoIdB("pa"), nome: "", texto: "" })}
            titulo={(p) => p.nome || "(espaço em branco)"}
            subtitulo={(p) => p.texto}
            rotuloNovo="Adicionar parceria"
            render={(p, m) => (
              <>
                <Campo rotulo="Nome (em negrito)" valor={p.nome} onChange={(v) => m((d) => { d.nome = v; })} />
                <Campo rotulo="Descrição" valor={p.texto} onChange={(v) => m((d) => { d.texto = v; })} />
              </>
            )}
          />
        </>
      );
      break;
    case "agenda":
      corpo = (
        <>
          <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((x) => { if (x.tipo === "agenda") x.titulo = v; })} />
          {b.grupos.map((g, gi) => (
            <div key={g.id} className="grid gap-1.5 rounded-md border border-p-borda p-3">
              <div className="flex items-center gap-2">
                <Celula valor={g.titulo} placeholder="MÊS" onChange={(v) => mudar((x) => { if (x.tipo === "agenda") x.grupos[gi]!.titulo = v; })} />
                <BotaoRemover onClick={() => mudar((x) => { if (x.tipo === "agenda" && confirm(`Remover ${g.titulo}?`)) x.grupos.splice(gi, 1); })} />
              </div>
              {g.itens.map((it, ii) => (
                <div key={it.id} className="flex gap-1.5">
                  <Celula valor={it.data} placeholder="22 (dom)" largura="84px" onChange={(v) => mudar((x) => { if (x.tipo === "agenda") x.grupos[gi]!.itens[ii]!.data = v; })} />
                  <Celula valor={it.hora} placeholder="19h" largura="56px" onChange={(v) => mudar((x) => { if (x.tipo === "agenda") x.grupos[gi]!.itens[ii]!.hora = v; })} />
                  <Celula valor={it.texto} placeholder="Evento" onChange={(v) => mudar((x) => { if (x.tipo === "agenda") x.grupos[gi]!.itens[ii]!.texto = v; })} />
                  <BotaoRemover onClick={() => mudar((x) => { if (x.tipo === "agenda") x.grupos[gi]!.itens.splice(ii, 1); })} />
                </div>
              ))}
              <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "agenda") x.grupos[gi]!.itens.push({ id: novoIdB("i"), data: "", hora: "", texto: "" }); })}>Adicionar data</BotaoAdicionar>
            </div>
          ))}
          <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "agenda") x.grupos.push({ id: novoIdB("g"), titulo: "MÊS", itens: [] }); })}>Adicionar mês</BotaoAdicionar>
          <p className="text-[12px] text-p-suave">Linhas seguidas com a mesma data são agrupadas, como no Word.</p>
        </>
      );
      break;
    case "expediente":
      corpo = (
        <>
          <Campo rotulo="Nome da igreja" valor={b.nome} multilinha linhas={2} onChange={(v) => mudar((x) => { if (x.tipo === "expediente") x.nome = v; })} />
          <Campo rotulo="Endereço e contatos" valor={b.texto} multilinha linhas={6} onChange={(v) => mudar((x) => { if (x.tipo === "expediente") x.texto = v; })} />
          <Grade>
            <Campo rotulo="Título" valor={b.pastoresTitulo} onChange={(v) => mudar((x) => { if (x.tipo === "expediente") x.pastoresTitulo = v; })} />
            <span />
          </Grade>
          <Campo rotulo="Pastores (um por linha)" valor={b.pastores} multilinha linhas={3} onChange={(v) => mudar((x) => { if (x.tipo === "expediente") x.pastores = v; })} />
          <Campo rotulo="Título" valor={b.diretoriaTitulo} onChange={(v) => mudar((x) => { if (x.tipo === "expediente") x.diretoriaTitulo = v; })} />
          <Campo rotulo="Diretoria (um por linha)" valor={b.diretoria} multilinha linhas={6} onChange={(v) => mudar((x) => { if (x.tipo === "expediente") x.diretoria = v; })} />
        </>
      );
      break;
    case "texto":
      corpo = (
        <>
          <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((x) => { if (x.tipo === "texto") x.titulo = v; })} />
          <Campo rotulo="Texto" valor={b.texto} multilinha linhas={6} onChange={(v) => mudar((x) => { if (x.tipo === "texto") x.texto = v; })} dica={DICA_FORMATO} />
          <Interruptor rotulo="Com moldura" valor={b.caixa} onChange={(v) => mudar((x) => { if (x.tipo === "texto") x.caixa = v; })} />
        </>
      );
      break;
    case "tabela":
      corpo = (
        <>
          <Campo rotulo="Título" valor={b.titulo} onChange={(v) => mudar((x) => { if (x.tipo === "tabela") x.titulo = v; })} />
          <div className="grid gap-1.5 overflow-x-auto">
            <div className="flex gap-1.5">{b.cabecalho.map((c, i) => <Celula key={i} valor={c} placeholder={`Coluna ${i + 1}`} onChange={(v) => mudar((x) => { if (x.tipo === "tabela") x.cabecalho[i] = v; })} />)}<span className="w-7" /></div>
            {b.linhas.map((l, li) => (
              <div key={l.id} className="flex gap-1.5">
                {b.cabecalho.map((_, i) => <Celula key={i} valor={l.celulas[i] ?? ""} onChange={(v) => mudar((x) => { if (x.tipo === "tabela") x.linhas[li]!.celulas[i] = v; })} />)}
                <BotaoRemover onClick={() => mudar((x) => { if (x.tipo === "tabela") x.linhas.splice(li, 1); })} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "tabela") x.linhas.push({ id: novoIdB("l"), celulas: x.cabecalho.map(() => "") }); })}>Adicionar linha</BotaoAdicionar>
            <BotaoAdicionar onClick={() => mudar((x) => { if (x.tipo === "tabela") { x.cabecalho.push(""); x.linhas.forEach((l) => l.celulas.push("")); } })}>Adicionar coluna</BotaoAdicionar>
            {b.cabecalho.length > 1 && <button type="button" className="text-[12.5px] font-semibold text-red-600 dark:text-red-400 hover:underline" onClick={() => mudar((x) => { if (x.tipo === "tabela") { x.cabecalho.pop(); x.linhas.forEach((l) => l.celulas.pop()); } })}>Remover última coluna</button>}
          </div>
        </>
      );
      break;
  }

  return (
    <div className="grid gap-4">
      {corpo}
      <div className="border-t border-p-borda pt-4">{comum}</div>
    </div>
  );
}
