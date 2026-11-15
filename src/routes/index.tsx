import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Headphones, Layers, MessageCircle, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-card";
import { homeQuery, siteQuery } from "@/lib/catalog.functions";
import { seo, canonical } from "@/lib/seo";
import { mediaUrl } from "@/lib/media";
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

const VANTAGENS = [
  {
    icon: Truck,
    titulo: "Frete Correios PAC e SEDEX",
    sub: "Envio rápido para todo o Brasil",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    icon: Layers,
    titulo: "Atacado a partir de 10 peças",
    sub: "Descontos progressivos até 50+ un.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Sparkles,
    titulo: "100% Algodão Pima Peruano",
    sub: "Toque macio com elastano e durabilidade",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: Headphones,
    titulo: "Atendimento Humanizado 24h",
    sub: "Suporte dedicado e ágil para seu pedido",
    gradient: "from-amber-500 to-orange-600",
  },
];

const PASSOS = [
  {
    icon: Sparkles,
    titulo: "Escolha as peças e cores",
    texto: "Selecione seus modelos favoritos, defina as cores e quantidades por tamanho (P ao GG). Pedido mínimo de 10 peças no atacado.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Truck,
    titulo: "Calcule o frete Correios",
    texto: "Simulação de frete PAC ou SEDEX com prazos reais e etiqueta de postagem com seu CPF para envio rápido e seguro.",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    icon: MessageCircle,
    titulo: "Finalize direto no WhatsApp",
    texto: "Seu pedido é enviado formatado com todos os itens, cores e frete escolhido para atendimento ágil da nossa equipe.",
    gradient: "from-violet-500 to-purple-600",
  },
];

function Home() {
  const { data: site } = useSuspenseQuery(siteQuery());
  const { data: categorias } = useSuspenseQuery(homeQuery());
  const titulo = site.config?.home_titulo || "Camisetas básicas e polos no atacado, a partir de 10 peças";
  const sub = site.config?.home_subtitulo;
  const primeira = categorias[0];

  const bannerWideSrc = site.banners?.wide ? mediaUrl(site.banners.wide) : heroWide;
  const bannerMobileSrc = site.banners?.mobile ? mediaUrl(site.banners.mobile) : heroMobile;

  return (
    <>
      <section className="container-page pt-4 md:pt-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-muted shadow-soft">
          <picture>
            <source media="(min-width: 768px)" srcSet={bannerWideSrc} />
            <img
              src={bannerMobileSrc}
              alt="Pilhas de camisetas básicas e camisas polo lisas em cores neutras"
              width={900}
              height={691}
              fetchPriority="high"
              className="aspect-[4/3] w-full object-cover md:aspect-[16/7]"
            />
          </picture>
          <div className="md:absolute md:inset-y-0 md:left-0 md:flex md:w-3/5 lg:w-1/2 md:items-center md:bg-gradient-to-r md:from-background/95 md:via-background/85 md:to-transparent">
            <div className="space-y-4 p-6 bg-card md:bg-transparent md:p-12">
              <p className="eyebrow drop-shadow-xs">Atacado · Pedido pelo WhatsApp</p>
              <h1 className="text-[1.9rem] font-extrabold leading-[1.1] text-balance text-foreground md:text-5xl">{titulo}</h1>
              {sub && <p className="max-w-md text-[15px] sm:text-base font-medium text-foreground/80 dark:text-foreground/90">{sub}</p>}
              {primeira && (
                <Button asChild size="lg" className="w-full sm:w-auto shadow-sm">
                  <Link to="/categoria/$slug" params={{ slug: primeira.slug }}>
                    Ver produtos <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Barra de benefícios e destaques coloridos */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VANTAGENS.map((v) => (
            <div
              key={v.titulo}
              className="card-hover flex items-center gap-3.5 rounded-2xl border bg-card p-3.5 sm:p-4 shadow-2xs"
            >
              <div
                className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${v.gradient} text-white shadow-xs`}
              >
                <v.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-bold text-foreground leading-snug">{v.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {categorias.map((c) => (
        <section key={c.id} className="container-page mt-14 md:mt-20" aria-labelledby={`cat-${c.id}`}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 id={`cat-${c.id}`} className="text-2xl font-bold md:text-3xl text-foreground">
                {c.nome}
              </h2>
              {c.descricao && <p className="mt-1 text-sm sm:text-base text-muted-foreground">{c.descricao}</p>}
            </div>
          </div>
          <ProductGrid produtos={c.produtos} />
          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="w-full sm:w-auto shadow-2xs">
              <Link to="/categoria/$slug" params={{ slug: c.slug }}>
                Ver todos <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      ))}

      <section className="container-page mt-16 md:mt-24" aria-labelledby="como-comprar">
        <div className="rounded-3xl border bg-card p-6 md:p-10 shadow-soft">
          <p className="eyebrow">Simples e rápido</p>
          <h2 id="como-comprar" className="mt-2 text-2xl font-bold md:text-3xl text-foreground">
            Como comprar
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="card-hover flex gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 transition-all">
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${p.gradient} text-white shadow-xs`}>
                  <p.icon className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Passo {i + 1}</p>
                  <h3 className="mt-0.5 font-sans text-base sm:text-lg font-bold tracking-normal text-foreground">{p.titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
