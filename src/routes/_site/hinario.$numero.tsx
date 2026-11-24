import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { LeitorHino } from "@/components/hinario/LeitorHino";
import { acharHino, HINARIO } from "@/lib/hinario";

export const Route = createFileRoute("/_site/hinario/$numero")({
  loader: ({ params }) => {
    const h = acharHino(Number(params.numero));
    if (!h) throw notFound();
    return h;
  },
  component: Hino,
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.numero}. ${loaderData.titulo} — Hinário` : "Hinário" }] }),
});

function Hino() {
  const h = Route.useLoaderData();
  const navegar = useNavigate();
  const i = HINARIO.findIndex((x) => x.numero === h.numero);
  return (
    <section className="bg-papel">
      <div className="container-site py-10 sm:py-14">
        <Link to="/hinario" className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-marca hover:text-marca-funda"><ChevronLeft size={16} /> Hinário</Link>
        <div className="mx-auto mt-6 max-w-[760px] border border-linha bg-white px-6 py-8 shadow-[0_24px_50px_-34px_rgba(0,42,71,0.45)] sm:px-12 sm:py-12">
          <LeitorHino hino={h} anterior={HINARIO[i - 1]?.numero} proximo={HINARIO[i + 1]?.numero} irPara={(n) => navegar({ to: "/hinario/$numero", params: { numero: String(n) } })} />
        </div>
      </div>
    </section>
  );
}
