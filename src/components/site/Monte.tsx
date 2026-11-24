/**
 * "Foto dentro do monte" — o recurso mais forte da marca (Manual, 06 · Grafismos).
 * A curva é a mesma do símbolo oficial; a cruz pousa no ombro direito e a linha
 * do horizonte fica embaixo. Sem foto, o monte é azul com as linhas do grafismo.
 */
import { useId } from "react";
import { cn } from "@/lib/utils";

const MONTE = "M0.0 640.0 L9.2 625.9 L20.3 606.8 L31.4 587.2 L42.4 567.4 L53.5 547.6 L64.6 527.9 L75.6 508.4 L86.7 489.0 L97.8 469.8 L108.9 450.7 L119.9 431.6 L131.0 412.7 L142.1 393.9 L153.1 375.0 L164.2 356.2 L175.3 337.4 L186.3 318.7 L197.4 300.1 L208.5 281.6 L219.6 263.2 L230.6 245.1 L241.7 227.2 L252.8 209.8 L263.8 192.6 L274.9 176.0 L286.0 159.9 L297.0 144.4 L308.1 129.5 L319.2 115.3 L330.3 101.8 L341.3 89.0 L352.4 77.2 L363.5 66.0 L374.5 55.8 L385.6 46.3 L396.7 37.8 L407.7 30.1 L418.8 23.4 L429.9 17.4 L441.0 12.4 L452.0 8.2 L463.1 4.9 L474.2 2.4 L485.2 0.8 L496.3 0.1 L507.4 0.3 L518.5 1.3 L529.5 3.1 L540.6 5.9 L551.7 9.5 L562.7 14.0 L573.8 19.3 L584.9 25.5 L595.9 32.6 L607.0 40.6 L618.1 49.4 L629.2 59.1 L640.2 69.6 L651.3 81.0 L662.4 93.2 L673.4 106.2 L684.5 119.9 L695.6 134.4 L706.6 149.5 L717.7 165.2 L728.8 181.5 L739.9 198.3 L750.9 215.6 L762.0 233.2 L773.1 251.1 L784.1 269.3 L795.2 287.7 L806.3 306.3 L817.3 325.0 L828.4 343.7 L839.5 362.5 L850.6 381.3 L861.6 400.2 L872.7 419.0 L883.8 438.0 L894.8 457.0 L905.9 476.2 L917.0 495.4 L928.0 514.8 L939.1 534.5 L950.2 554.2 L961.3 574.0 L972.3 593.8 L983.4 613.2 L1000.0 640.0 L1000.0 640.0 Z";
// Cruz do logotipo (35 × 63), escalada e pousada na curva em x = 84%.
const CRUZ = "M219 1h8v14h14v8h-14v41h-8v-41h-13v-8h13z";

export function MonteFoto({ imagem, className, cruz = true, horizonte = true }: { imagem?: string; className?: string; cruz?: boolean; horizonte?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 1000 670" className="block h-auto w-full" role="img" aria-hidden={!imagem}>
        <defs>
          <clipPath id={`m${id}`}><path d={MONTE} /></clipPath>
        </defs>
        <g clipPath={`url(#m${id})`}>
          <rect width="1000" height="640" fill="#00436F" />
          {imagem ? (
            <image href={imagem} width="1000" height="640" preserveAspectRatio="xMidYMid slice" />
          ) : (
            <image className="monte-linhas" href="/marca/grafismo-monte-transparente-branco.svg" x="-250" y="40" width="1500" height="650" opacity="0.14" preserveAspectRatio="xMidYMax meet" />
          )}
        </g>
        {cruz && <g className="cruz-monte"><path d={CRUZ} fill="#CC2127" transform="translate(812 262) scale(1.587) translate(-206 -1)" /></g>}
        {horizonte && <rect x="0" y="658" width="1000" height="6" fill="#00436F" />}
      </svg>
    </div>
  );
}
