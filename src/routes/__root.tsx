import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { siteQuery } from "@/lib/catalog.functions";
import { accentCss, themeInitScript } from "@/lib/theme";
import { AuthProvider } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { resolveOrigin, schemaOrganization, schemaWebSite } from "@/lib/seo";

function NotFoundComponent() {
  const { data } = useQuery(siteQuery());
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md">
        <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-2xl font-bold text-destructive">
          404
        </span>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O link que você acessou não existe ou mudou de endereço. Explore nosso catálogo de atacado ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:opacity-95"
          >
            Ir para a página inicial
          </Link>
          <Link
            to="/carrinho"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-5 font-semibold text-foreground hover:bg-muted"
          >
            Ver carrinho
          </Link>
        </div>
        {data?.categorias && data.categorias.length > 0 && (
          <div className="mt-8 border-t border-border/60 pt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Categorias em destaque
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {data.categorias.map((c) => (
                <Link
                  key={c.id}
                  to="/categoria/$slug"
                  params={{ slug: c.slug }}
                  className="rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  {c.nome}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Esta página não carregou</h1>
        <p className="mt-2 text-muted-foreground">Algo deu errado. Tente novamente ou volte ao início.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a href="/" className="inline-flex h-11 items-center justify-center rounded-xl border px-5 font-semibold">
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery()),
  head: ({ loaderData }) => {
    const origin = resolveOrigin(loaderData?.origin);
    const orgJsonLd = schemaOrganization(origin);
    const siteJsonLd = schemaWebSite(origin);

    const gscVerification =
      (loaderData?.config as any)?.google_site_verification ||
      (import.meta.env["VITE_GOOGLE_SITE_VERIFICATION"] as string | undefined);

    const gaId =
      (loaderData?.config as any)?.ga_measurement_id ||
      (import.meta.env["VITE_GA_MEASUREMENT_ID"] as string | undefined);

    const meta: Array<Record<string, string>> = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Líder Atacado — Camisetas Básicas e Polos no Atacado" },
      {
        name: "description",
        content:
          "Camisetas básicas em algodão Pima peruano e camisas polo masculinas no atacado, a partir de 10 peças direto de fábrica. Pedidos rápidos pelo WhatsApp.",
      },
      { property: "og:site_name", content: "Líder Atacado" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#090D16" },
    ];

    if (gscVerification) {
      meta.push({ name: "google-site-verification", content: gscVerification });
    }

    const scripts: Array<Record<string, any>> = [
      {
        type: "application/ld+json",
        children: JSON.stringify(orgJsonLd),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(siteJsonLd),
      },
    ];

    if (gaId) {
      scripts.push(
        {
          src: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
          async: true,
        },
        {
          children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{send_page_view:true});`,
        }
      );
    }

    return {
      meta,
      links: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap",
        },
        { rel: "stylesheet", href: appCss },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/manifest.webmanifest" },
      ],
      scripts,
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          id="google-tag-manager"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PTMC46NX');`,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PTMC46NX"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AccentStyle() {
  const { data } = useQuery(siteQuery());
  const css = accentCss(data?.config?.cor_destaque);
  return css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null;
}

function AuthSync({ queryClient }: { queryClient: QueryClient }) {
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event === "SIGNED_OUT") {
        queryClient.removeQueries({ queryKey: ["admin"] });
        queryClient.removeQueries({ queryKey: ["me"] });
      } else queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthSync queryClient={queryClient} />
        <AccentStyle />
        {isAdmin ? (
          <Outlet />
        ) : (
          <div className="flex min-h-screen flex-col pt-16">
            <SiteHeader />
            <main className="flex-1">
              <Outlet />
            </main>
            <SiteFooter />
          </div>
        )}
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
