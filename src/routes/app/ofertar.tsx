import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, CheckCircle2, ChevronLeft, Copy, HandCoins, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { appContribuir, appInformarContribuicao } from "@/lib/api-app";
import { TIPO_CONTRIBUICAO, reais, type TipoContribuicao } from "@/lib/membros";
import { brCode, normalizarChave } from "@/lib/pix";
import { cn } from "@/lib/utils";
import { data } from "@/lib/datas";

export const Route = createFileRoute("/app/ofertar")({ component: Ofertar });

type Dados = Awaited<ReturnType<typeof appContribuir>>;
const SUGESTOES = [2000, 5000, 10000, 20000];

function Ofertar() {
  const [d, setD] = useState<Dados | null>(null);
  const [tipo, setTipo] = useState<TipoContribuicao>("dizimo");
  const [valor, setValor] = useState(0);
  const [pix, setPix] = useState<{ codigo: string; qr: string; txid: string } | null>(null);
  const [informando, setInformando] = useState(false);
  const carregar = () => appContribuir().then(setD).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []);
  const ano = new Date().getFullYear();
  const doAno = useMemo(() => (d?.minhas ?? []).filter((c) => c.em.startsWith(String(ano))), [d, ano]);

  const gerar = async () => {
    if (!d?.pix.chave) return;
    const txid = `IECB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const codigo = brCode({ chave: normalizarChave(d.pix.chave, d.pix.tipo), nome: "PRIMEIRA IEC BRASILIA", valorCentavos: valor, txid, descricao: TIPO_CONTRIBUICAO[tipo] });
    const qr = await QRCode.toDataURL(codigo, { margin: 1, width: 560, color: { dark: "#002a47", light: "#ffffff" } });
    setPix({ codigo, qr, txid });
  };

  const informar = async () => {
    if (!pix) return;
    setInformando(true);
    try {
      await appInformarContribuicao({ data: { tipo, valor, txid: pix.txid } });
      toast.success("Obrigado! Sua contribuição foi registrada.");
      setPix(null); setValor(0); carregar();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setInformando(false); }
  };

  if (pix) {
    return (
      <div className="a-entra grid gap-5 pb-4">
        <header className="a-topo">
          <button onClick={() => setPix(null)} className="flex items-center gap-1 text-[14px] font-semibold text-white/80"><ChevronLeft size={18} /> Voltar</button>
          <p className="a-sobre mt-5 !text-white/80">{TIPO_CONTRIBUICAO[tipo]}</p>
          <p className="mt-1 text-[34px] font-bold tracking-[-0.02em]">{reais(valor)}</p>
        </header>
        <section className="mx-5 a-cartao a-filete px-5 py-6 text-center">
          <p className="text-[14px] font-semibold">Abra o app do seu banco, escolha <strong>Pix › Pagar com QR Code</strong> ou <strong>Pix copia e cola</strong>.</p>
          <img src={pix.qr} alt="QR Code do Pix" className="mx-auto mt-5 w-[240px] max-w-full border border-[var(--a-borda)] bg-white p-2" />
          <button onClick={() => navigator.clipboard?.writeText(pix.codigo).then(() => toast.success("Código Pix copiado. Cole no app do seu banco."))} className="a-btn a-btn-pri mt-5 w-full"><Copy size={17} /> Copiar código Pix</button>
          <p className="mt-3 break-all text-left font-mono text-[10.5px] leading-snug text-[var(--a-suave)]">{pix.codigo}</p>
          <p className="mt-4 text-[12.5px] text-[var(--a-suave)]">Favorecido: {d?.pix.favorecido}</p>
        </section>
        <section className="mx-5 grid gap-2">
          <button disabled={informando} onClick={informar} className="a-btn a-btn-sec w-full !h-14 !border-[#00436f]">{informando ? <Loader2 size={17} className="animate-spin" /> : <Check size={18} />} Já fiz o Pix</button>
          <p className="text-center text-[12.5px] text-[var(--a-suave)]">Toque depois de pagar: a contribuição entra no seu histórico e a tesouraria confere no extrato.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="a-entra grid gap-6 pb-4">
      <header className="a-topo">
        <p className="a-sobre !text-white/80">Dízimos e ofertas</p>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.02em]">Ofertar</h1>
        <p className="mt-2 font-serif text-[15px] italic leading-relaxed text-white/80">“Cada um dê conforme determinou em seu coração… porque Deus ama quem dá com alegria.”</p>
        <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/60">2 Coríntios 9.7</p>
      </header>

      {d && !d.pix.chave ? (
        <div className="mx-5 a-cartao a-filete px-5 py-6 text-center"><HandCoins className="mx-auto text-[var(--a-azul)]" size={28} /><p className="mt-3 font-bold">A chave Pix da igreja ainda não foi cadastrada</p><p className="mt-1 text-[14px] text-[var(--a-suave)]">Assim que a tesouraria cadastrar, você poderá contribuir por aqui.</p></div>
      ) : (
        <>
          <section className="px-5">
            <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--a-suave)]">Destino</h2>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TIPO_CONTRIBUICAO) as TipoContribuicao[]).map((t) => (
                <button key={t} onClick={() => setTipo(t)} className={cn("border px-3 py-3.5 text-left text-[14px] font-bold", tipo === t ? "border-[#00436f] bg-[#00436f] text-white" : "border-[var(--a-borda)] bg-[var(--a-sup)]")}>{TIPO_CONTRIBUICAO[t]}</button>
              ))}
            </div>
          </section>
          <section className="px-5">
            <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--a-suave)]">Valor</h2>
            <div className="a-cartao flex items-baseline gap-2 px-4 py-3">
              <span className="text-[20px] font-bold text-[var(--a-suave)]">R$</span>
              <input
                inputMode="numeric"
                value={valor ? (valor / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
                onChange={(e) => setValor(Math.min(100_000_000, Number(e.target.value.replace(/\D/g, "")) || 0))}
                placeholder="0,00"
                className="w-full bg-transparent text-[34px] font-bold tracking-[-0.02em] text-[var(--a-azul)] outline-none"
                aria-label="Valor"
              />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {SUGESTOES.map((s) => <button key={s} onClick={() => setValor(s)} className="border border-[var(--a-borda)] bg-[var(--a-sup)] py-2.5 text-[13px] font-bold">{reais(s).replace(",00", "")}</button>)}
            </div>
            <button disabled={valor < 100 || !d} onClick={gerar} className="a-btn a-btn-pri mt-5 w-full">Gerar Pix</button>
          </section>
        </>
      )}

      <section className="px-5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--a-suave)]">Minhas contribuições</h2>
          {doAno.length > 0 && <span className="text-[12px] font-semibold text-[var(--a-suave)]">{ano}: {reais(doAno.reduce((t, c) => t + c.valor, 0))}</span>}
        </div>
        {!d ? null : d.minhas.length === 0 ? (
          <p className="text-[14px] text-[var(--a-suave)]">Suas contribuições pelo app aparecem aqui.</p>
        ) : (
          <ul className="a-cartao divide-y divide-[var(--a-borda)]">
            {d.minhas.slice(0, 24).map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-bold">{TIPO_CONTRIBUICAO[c.tipo]}</span><span className="text-[12px] text-[var(--a-suave)]">{data(c.em)}</span></span>
                <span className="text-right"><span className="block text-[15px] font-bold">{reais(c.valor)}</span><span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", c.situacao === "confirmada" ? "text-emerald-600" : "text-[var(--a-suave)]")}>{c.situacao === "confirmada" ? <><CheckCircle2 size={12} /> Recebida</> : "Informada"}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
