import { Link as RLink } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ehExterno } from "@/lib/utils";

/** Link que serve tanto para páginas do site quanto para endereços externos. */
export function LinkSite({ para, className, children, onClick }: { para: string; className?: string; children: ReactNode; onClick?: () => void }) {
  if (!para) return <span className={className}>{children}</span>;
  if (ehExterno(para)) {
    return <a href={para} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>{children}</a>;
  }
  const [caminho, ancora] = para.split("#");
  return (
    <RLink to={caminho || "/"} hash={ancora} className={className} onClick={onClick}>
      {children}
    </RLink>
  );
}
