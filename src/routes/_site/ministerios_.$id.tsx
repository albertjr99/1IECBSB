/**
 * Página de cada ministério. Os "ambientes" (agenda, avisos, fotos, materiais)
 * ainda serão definidos com a liderança — por enquanto aparecem como "em breve".
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Images, Megaphone, BookOpen, Clock, UserRound } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { iconeMinisterio } from "@/lib/conteudo";
import { linkWhatsapp } from "@/lib/utils";

export const Route = createFileRoute("/_site/ministerios_/$id")({
  component: Ministerio,
  head: () => ({ meta: [{ title: "Ministérios" }] }),
});

const AMBIENTES = [
  { icone: CalendarDays, titulo: "Agenda", texto: "Encontros, ensaios e programações do ministério." },
  { icone: Megaphone, titulo: "Avisos", texto: "Recados e novidades para quem participa." },
  { icone: Images, titulo: "Fotos", texto: "Momentos registrados nos encontros e eventos." },
  { icone: BookOpen, titulo: "Materiais", texto: "Estudos, músicas e conteúdos de apoio." },
];

function Ministerio() {
  const { id } = Route.useParams();
  const { ministerios: m } = useConteudo();
  const i = m.itens.findIndex((x) => x.id === id);
  if (i < 0) throw notFound();
  const x = m.itens[i]!;
  const prox = m.itens[(i + 1) % m.itens.length]!;

  return (
    <>
      <section className="grafismo-monte-escuro overflow-hidden bg-marca-funda text-white">
        <div className="container-site py-14 sm:py-20">
          <Link to="/ministerios" className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-white/70 hover:text-white">
            <ArrowLeft size={15} /> Ministérios
          </Link>
          <div className="mt-8 flex flex-col gap-7 sm:flex-row sm:items-center">
            <span className="grid size-24 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/25 backdrop-blur">
              <img src={`/marca/icones/icone-${iconeMinisterio(x)}-branco.svg`} alt="" className="size-12" />
            </span>
            <div>
              <p className="rotulo-secao !text-white">Ministério</p>
              <h1 className="mt-3 text-[2.2rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[2.9rem]">{x.nome}</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="container-site grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {x.imagem && <img src={x.imagem} alt="" className="mb-8 aspect-[16/9] w-full object-cover" />}
          <p className="rotulo-secao">Sobre</p>
          <p className="texto-justificado mt-4 text-[17px] leading-relaxed text-tinta">{x.descricao}</p>
        </div>
        <aside className="h-fit border-t-[3px] border-marca bg-papel p-7">
          <dl className="grid gap-5">
            <div className="flex gap-4">
              <Clock size={20} className="mt-0.5 shrink-0 text-marca" />
              <div><dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-tinta-suave">Quando</dt><dd className="mt-1 text-tinta">{x.quando || "A definir"}</dd></div>
            </div>
            <div className="flex gap-4">
              <UserRound size={20} className="mt-0.5 shrink-0 text-marca" />
              <div><dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-tinta-suave">Liderança</dt><dd className="mt-1 text-tinta">{x.lider || "A definir"}</dd></div>
            </div>
          </dl>
          {x.contato ? (
            <a href={linkWhatsapp(x.contato, `Olá! Quero saber mais sobre o ministério ${x.nome}.`)} target="_blank" rel="noopener noreferrer" className="btn-primario mt-7 w-full">Quero participar</a>
          ) : (
            <Link to="/contato" className="btn-contorno mt-7 w-full">Fale com a igreja</Link>
          )}
        </aside>
      </section>

      <section className="border-t border-linha bg-papel">
        <div className="container-site py-16">
          <p className="rotulo-secao">Espaço do ministério</p>
          <h2 className="titulo-secao mt-3">Em breve, por aqui</h2>
          <p className="texto-justificado mt-3 max-w-2xl text-tinta">Estamos preparando um espaço próprio deste ministério, com conteúdos pensados para quem participa.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AMBIENTES.map((a) => (
              <div key={a.titulo} className="relative flex flex-col border border-dashed border-marca-media/40 bg-white/70 p-6">
                <span className="absolute right-4 top-4 bg-marca-suave px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-marca">Em breve</span>
                <a.icone size={26} strokeWidth={1.75} className="text-marca/70" />
                <h3 className="mt-5 text-[1.05rem] font-bold text-marca/80">{a.titulo}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-tinta-suave">{a.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {m.itens.length > 1 && (
        <Link to="/ministerios/$id" params={{ id: prox.id }} className="group block border-t border-linha bg-white">
          <div className="container-site flex items-center justify-between gap-6 py-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tinta-suave">Próximo ministério</p>
              <p className="mt-1 text-[1.2rem] font-bold text-marca">{prox.nome}</p>
            </div>
            <ArrowRight className="text-marca transition-transform group-hover:translate-x-1.5" />
          </div>
        </Link>
      )}
    </>
  );
}
