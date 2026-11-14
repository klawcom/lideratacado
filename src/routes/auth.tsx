import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/store/logo";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { seo } from "@/lib/seo";

const NEXT_KEY = "lider-pos-login";

function safeNext(v: unknown): string | undefined {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      ...seo({ title: "Entrar | Líder Atacado", description: "Entre com sua conta Google ou Microsoft para acompanhar seus pedidos." }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const GoogleIcon = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);
const MicrosoftIcon = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 21 21">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [busy, setBusy] = useState<"google" | "microsoft" | null>(null);

  useEffect(() => {
    const n = safeNext(search.redirect);
    if (n) sessionStorage.setItem(NEXT_KEY, n);
  }, [search.redirect]);

  useEffect(() => {
    if (loading || !user) return;
    const n = safeNext(sessionStorage.getItem(NEXT_KEY));
    sessionStorage.removeItem(NEXT_KEY);
    navigate({ to: n ?? (isAdmin ? "/admin" : "/meus-pedidos"), replace: true });
  }, [user, isAdmin, loading, navigate]);

  async function entrar(provider: "google" | "microsoft") {
    setBusy(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/auth`,
      ...(provider === "google" ? { extraParams: { prompt: "select_account" } } : {}),
    });
    if (result.error) {
      setBusy(null);
      toast.error("Não foi possível entrar. Tente novamente.");
      return;
    }
    if (result.redirected) return;
    setBusy(null);
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 text-center shadow-soft sm:p-8">
        <Logo size={88} className="mx-auto" />
        <h1 className="mt-5 text-2xl font-bold">Entrar</h1>
        <p className="mt-2 text-muted-foreground">Acompanhe seus pedidos e tenha seus dados preenchidos na próxima compra.</p>
        <div className="mt-6 space-y-3">
          <button type="button" className="btn-provider" disabled={!!busy} onClick={() => entrar("google")}>
            {busy === "google" ? <Loader2 className="size-[18px] animate-spin" /> : <GoogleIcon />}
            Continuar com Google
          </button>
          <button type="button" className="btn-provider" disabled={!!busy} onClick={() => entrar("microsoft")}>
            {busy === "microsoft" ? <Loader2 className="size-[18px] animate-spin" /> : <MicrosoftIcon />}
            Continuar com Microsoft
          </button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Não é preciso entrar para fazer pedidos.</p>
      </div>
    </div>
  );
}
