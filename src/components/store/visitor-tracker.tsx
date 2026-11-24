import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { registrarVisitaFn } from "@/lib/visitas.functions";
import { formatarDataIso } from "@/lib/visitas";

export function VisitorTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const registrar = useServerFn(registrarVisitaFn);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Rastreia apenas clientes navegando na loja pública, ignorando o painel admin
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    void (async () => {
      try {
        const hoje = formatarDataIso(new Date());
        const storageKey = `lider_visita_${hoje}`;
        const jaVisitouHoje = localStorage.getItem(storageKey);

        const isUnique = !jaVisitouHoje;
        if (isUnique) {
          localStorage.setItem(storageKey, "1");
        }

        // Evita recontagem contínua de pageviews na mesma aba para a mesma página
        const sessionKey = `pv_${pathname}`;
        const jaViuNaSessao = sessionStorage.getItem(sessionKey);
        if (!isUnique && jaViuNaSessao) {
          return;
        }
        sessionStorage.setItem(sessionKey, "1");

        await registrar({
          data: {
            isUnique,
            path: pathname,
          },
        });
      } catch {
        // Tratamento silencioso caso o cliente esteja offline
      }
    })();
  }, [pathname, registrar]);

  return null;
}
