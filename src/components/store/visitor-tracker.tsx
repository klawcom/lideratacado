import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { registrarVisitaFn } from "@/lib/visitas.functions";
import { formatarDataIso } from "@/lib/visitas";
import { useAuth } from "@/hooks/use-auth";

export const GESTOR_STORAGE_KEY = "lider_ignorar_gestor";

export function VisitorTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const registrar = useServerFn(registrarVisitaFn);
  const lastPathRef = useRef<string | null>(null);
  const { isAdmin, loading } = useAuth();

  useEffect(() => {
    // 1. Rastreia apenas clientes navegando na loja pública, ignorando rotas do painel admin
    if (!pathname || pathname.startsWith("/admin")) return;

    // 2. Aguarda carregamento da autenticação para evitar registrar o gestor durante a inicialização
    if (loading) return;

    // 3. Se o usuário logado for administrador, marca o aparelho e não registra
    if (isAdmin) {
      try {
        localStorage.setItem(GESTOR_STORAGE_KEY, "1");
      } catch {}
      return;
    }

    // 4. Se este dispositivo/navegador já foi identificado como do gestor, não registra mesmo deslogado
    try {
      if (localStorage.getItem(GESTOR_STORAGE_KEY) === "1") {
        return;
      }
    } catch {}

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
  }, [pathname, registrar, isAdmin, loading]);

  return null;
}
