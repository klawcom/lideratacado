import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircle, Ruler, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-card";
import { homeQuery, siteQuery } from "@/lib/catalog.functions";
import { seo, canonical } from "@/lib/seo";
import heroWide from "@/assets/hero-wide.webp";
import heroMobile from "@/assets/hero-mobile.webp";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [site] = await Promise.all([
      context.queryClient.ensureQueryData(siteQuery()),
      context.queryClient.ensureQueryData(homeQuery()),
    ]);
    return { origin: site.origin };
  },
  head: ({ loaderData }) => ({
    meta: seo({
      title: "Líder Atacado — Camisetas básicas e polos no atacado",
      description: "Camisetas básicas de algodão Pima e camisas polo piquet no atacado, a partir de 10 peças. Monte seu pedido por tamanho e finalize pelo WhatsApp.",
      origin: loaderData?.origin,
      path: "/",
    }),
    links: canonical(loaderData?.origin, "/"),
  }),
  component: Home,
});

const PASSOS = [
  { icon: Ruler, titulo: "Escolha as peças por tamanho", texto: "Informe quantas quer em P, M, G e GG. Mínimo de 10 peças no total." },
  { icon: MessageCircle, titulo: "Envie o pedido no WhatsApp", texto: "Preencha seus dados e o pedido chega pronto para nós." },
  { icon: Truck, titulo: "Combine frete e pagamento", texto: "Respondemos com o frete e as formas de pagamento." },
];

function Home() {
  const { data: site } = useSuspenseQuery(siteQuery());
  const { data: categorias } = useSuspenseQuery(homeQuery());
  const titulo = site.config?.home_titulo || "Camisetas básicas e polos no atacado, a partir de 10 peças";
  const sub = site.config?.home_subtitulo;
  const primeira = categorias[0];

  return (
    <>
      <section className="container-page pt-4 md:pt-8">
        <div className="relative overflow-hidden rounded-3xl bg-muted">
          <picture>
            <source media="(min-width: 768px)" srcSet={heroWide} />
            <img
              src={heroMobile}
              alt="Pilhas de camisetas básicas e camisas polo lisas em cores neutras"
              width={900}
              height={691}
              fetchPriority="high"
              className="aspect-[4/3] w-full object-cover md:aspect-[16/7]"
            />
          </picture>
          <div className="md:absolute md:inset-y-0 md:left-0 md:flex md:w-1/2 md:items-center">
            <div className="space-y-4 p-6 md:p-12">
              <p className="eyebrow">Atacado · Pedido pelo WhatsApp</p>
              <h1 className="text-[1.9rem] font-extrabold leading-[1.1] text-balance md:text-5xl md:text-foreground">{titulo}</h1>
              {sub && <p className="max-w-md text-muted-foreground">{sub}</p>}
              {primeira && (
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/categoria/$slug" params={{ slug: primeira.slug }}>
                    Ver produtos <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {categorias.map((c) => (
        <section key={c.id} className="container-page mt-16 md:mt-24" aria-labelledby={`cat-${c.id}`}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 id={`cat-${c.id}`} className="text-2xl font-bold md:text-3xl">
                {c.nome}
              </h2>
              {c.descricao && <p className="mt-1 text-muted-foreground">{c.descricao}</p>}
            </div>
          </div>
          <ProductGrid produtos={c.produtos} />
          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/categoria/$slug" params={{ slug: c.slug }}>
                Ver todos <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      ))}

      <section className="container-page mt-20 md:mt-28" aria-labelledby="como-comprar">
        <div className="rounded-3xl border bg-card p-6 md:p-10">
          <p className="eyebrow">Simples e rápido</p>
          <h2 id="como-comprar" className="mt-2 text-2xl font-bold md:text-3xl">
            Como comprar
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <p.icon className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Passo {i + 1}</p>
                  <h3 className="mt-0.5 font-sans text-lg font-bold tracking-normal">{p.titulo}</h3>
                  <p className="mt-1 text-muted-foreground">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
