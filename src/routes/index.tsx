import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  HelpCircle,
  Layers,
  MessageCircle,
  Percent,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-card";
import { ShowcaseCarousel, buildVitrineProducts } from "@/components/store/showcase-carousel";
import { TestimonialsSection } from "@/components/store/testimonials-section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { homeQuery, siteQuery } from "@/lib/catalog.functions";
import { seo, canonical, resolveOrigin } from "@/lib/seo";
import { mediaUrl } from "@/lib/media";
import { whatsappLinkNumber } from "@/lib/format";
import { analytics } from "@/lib/analytics";
import heroWide from "@/assets/hero-wide.webp";
import heroMobile from "@/assets/hero-mobile.webp";

const FAQS_HOME = [
  {
    pergunta: "Qual é a quantidade mínima para comprar no atacado?",
    resposta:
      "O pedido mínimo é de apenas 10 peças no total. Você não precisa comprar 10 peças do mesmo modelo: pode mesclar modelos (camisetas básicas, polos piquet, plus size), cores e tamanhos variados no mesmo pedido.",
  },
  {
    pergunta: "Como funcionam os descontos progressivos por quantidade?",
    resposta:
      "Trabalhamos com faixas progressivas: 10+, 20+, 30+ e 50+ peças. Conforme o número total de peças no seu carrinho aumenta, o preço unitário de cada peça é recalculado automaticamente para a faixa mais vantajosa, barateando todo o seu pedido.",
  },
  {
    pergunta: "Posso escolher as cores e os tamanhos livremente (grade livre)?",
    resposta:
      "Sim! Você tem total liberdade na escolha de modelos e tamanhos (P ao GG e Plus Size G1/G2). Em relação às cores: vendemos no atacado, direto de fábrica e com alto giro. As cores são atendidas conforme o estoque disponível na hora da separação. Se alguma estiver em falta, enviamos cores sortidas, de mesma qualidade e modelo. As imagens são meramente ilustrativas com base nos produtos reais, e você pode solicitar imagens e vídeos reais das peças via WhatsApp a qualquer momento.",
  },
  {
    pergunta: "Como funciona o frete e o prazo de entrega para meu estado?",
    resposta:
      "Despachamos para todo o Brasil via Correios (modalidades PAC e SEDEX). Você pode calcular o valor do frete e o prazo estimado digitando seu CEP diretamente na página do produto ou durante a finalização do pedido.",
  },
  {
    pergunta: "Como finalizo o pedido e realizo o pagamento?",
    resposta:
      "Você monta seu carrinho, informa a entrega e escolhe pagar online com Pix ou cartão pela InfinitePay. Se preferir, envie o pedido para nosso WhatsApp oficial e nossa equipe combinará o pagamento com você.",
  },
];

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [site] = await Promise.all([
      context.queryClient.ensureQueryData(siteQuery()),
      context.queryClient.ensureQueryData(homeQuery()),
    ]);
    return { origin: site.origin, banners: site.banners };
  },
  head: ({ loaderData }) => {
    const origin = resolveOrigin(loaderData?.origin);
    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS_HOME.map((f) => ({
        "@type": "Question",
        name: f.pergunta,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.resposta,
        },
      })),
    };

    return {
      meta: seo({
        title: "Líder Atacado — Camisetas Básicas e Polos no Atacado Direto de Fábrica",
        description:
          "Camisetas básicas de algodão Pima peruano e camisas polo no atacado a partir de 10 peças. Descontos progressivos até 50+ peças, frete Correios e pedido pelo WhatsApp.",
        origin,
        path: "/",
      }),
      links: [
        ...canonical(origin, "/"),
        {
          rel: "preload",
          as: "image",
          href: heroWide,
          media: "(min-width: 768px)",
          fetchPriority: "high" as const,
        },
        {
          rel: "preload",
          as: "image",
          href: heroMobile,
          media: "(max-width: 767px)",
          fetchPriority: "high" as const,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(faqJsonLd),
        },
      ],
    };
  },
  component: Home,
});

const VANTAGENS = [
  {
    icon: Truck,
    titulo: "Frete Correios PAC e SEDEX",
    sub: "Envio rápido com rastreamento para todo o Brasil",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    icon: Layers,
    titulo: "Atacado a partir de 10 peças",
    sub: "Grade livre: misture modelos, cores e tamanhos",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Percent,
    titulo: "Descontos progressivos reais",
    sub: "Faixas especiais para 10+, 20+, 30+ e 50+ peças",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: Sparkles,
    titulo: "Algodão Pima, Polos e Plus Size",
    sub: "Malha nobre de toque macio e alta qualidade de fábrica",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: Headphones,
    titulo: "Atendimento 24h",
    sub: "Suporte dedicado 100% humanizado",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    icon: MessageCircle,
    titulo: "WhatsApp Suporte Rápido",
    sub: "Canal direto para tirar dúvidas e fechar pedidos",
    gradient: "from-teal-500 to-emerald-600",
  },
];

const FAIXAS_COMERCIAIS = [
  {
    faixa: "10 a 19 peças",
    destaque: "Pedido mínimo",
    beneficio: "Preço de atacado inicial direto de fábrica",
    tag: "Ideal para começar ou testar",
  },
  {
    faixa: "20 a 29 peças",
    destaque: "Mais vendido",
    beneficio: "Desconto automático em todas as peças do pedido",
    tag: "Excelente giro para lojas",
  },
  {
    faixa: "30 a 49 peças",
    destaque: "Margem extra",
    beneficio: "Preço unitário ainda menor para aumentar seu lucro",
    tag: "Para revendedores ativos",
  },
  {
    faixa: "50+ peças",
    destaque: "Melhor preço",
    beneficio: "Menor preço unitário de atacado em todo o catálogo",
    tag: "Maior rentabilidade de revenda",
  },
];

const PASSOS = [
  {
    icon: Sparkles,
    titulo: "Escolha as peças, modelos e cores",
    texto:
      "Selecione seus modelos favoritos, defina as cores e quantidades por tamanho (P ao GG e Plus Size). Mínimo de 10 peças no total.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Truck,
    titulo: "Calcule o frete Correios em tempo real",
    texto:
      "Simulação de frete PAC ou SEDEX com prazos reais e etiqueta de postagem com seu CPF para envio rápido e seguro.",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    icon: MessageCircle,
    titulo: "Finalize direto no WhatsApp",
    texto:
      "Seu pedido é enviado formatado com todos os itens, cores e frete escolhido para atendimento ágil da nossa equipe.",
    gradient: "from-violet-500 to-purple-600",
  },
];

interface BannerSlideData {
  id: number;
  wideSrc: string;
  mobileSrc: string;
  link: string | null;
  titulo: string | null;
  subtitulo: string | null;
}

function BannerCarousel({
  slides,
  primeira,
}: {
  slides: BannerSlideData[];
  primeira?: { slug: string; nome: string } | undefined;
}) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  const count = slides.length;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrent((p) => (p + 1) % count);
    }, 5500);
    return () => clearInterval(timer);
  }, [count, isPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0]?.clientX ?? 0;
    touchDeltaX.current = currentX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null) {
      if (touchDeltaX.current < -45) {
        next();
      } else if (touchDeltaX.current > 45) {
        prev();
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setIsPaused(false);
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border/50 bg-muted shadow-soft group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="Carrossel de banners em destaque"
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, idx) => {
          const targetLink = slide.link || (primeira ? `/categoria/${primeira.slug}` : "/carrinho");
          const isExternal = Boolean(targetLink && (targetLink.startsWith("http://") || targetLink.startsWith("https://")));

          const bannerImage = (
            <picture>
              <source media="(min-width: 768px)" srcSet={slide.wideSrc} />
              <img
                src={slide.mobileSrc}
                alt={
                  slide.titulo
                    ? `${slide.titulo} - Líder Atacado`
                    : "Líder Atacado — Camisetas básicas e polos no atacado direto de fábrica"
                }
                width={1200}
                height={525}
                fetchPriority={idx === 0 ? "high" : "auto"}
                loading={idx === 0 ? "eager" : "lazy"}
                className="aspect-[4/3] w-full object-cover md:aspect-[16/7] contrast-[1.02] brightness-[1.01]"
              />
            </picture>
          );

          return (
            <div
              key={slide.id || idx}
              className="relative w-full shrink-0"
              role="group"
              aria-roledescription="slide"
              aria-label={`Banner ${idx + 1} de ${count}`}
              aria-hidden={idx !== current}
            >
              {/* Preserva títulos semânticos H1/H2 e subtítulo para SEO e leitores de tela sem sobrepor arte gráfica */}
              <span className="sr-only">
                {idx === 0 ? (
                  <h1>{slide.titulo || "Camisetas básicas e polos no atacado, a partir de 10 peças"}</h1>
                ) : (
                  <h2>{slide.titulo || "Camisetas básicas e polos no atacado, a partir de 10 peças"}</h2>
                )}
                {slide.subtitulo && <p>{slide.subtitulo}</p>}
              </span>

              {targetLink ? (
                <a
                  href={targetLink}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  tabIndex={idx === current ? 0 : -1}
                  className="block relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer hover:opacity-95 transition-opacity"
                  aria-label={slide.titulo || "Ver ofertas deste banner"}
                >
                  {bannerImage}
                </a>
              ) : (
                <div className="relative">
                  {bannerImage}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex size-11 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-md shadow-md border border-border/40 hover:bg-background hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex size-11 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-md shadow-md border border-border/40 hover:bg-background hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            aria-label="Próximo banner"
          >
            <ChevronRight className="size-6" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-background/70 px-3 py-1.5 backdrop-blur-md border border-border/40 shadow-xs">
            {slides.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrent(dotIdx)}
                className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                  dotIdx === current
                    ? "w-7 bg-primary"
                    : "w-2.5 bg-muted-foreground/40 hover:bg-foreground/70"
                }`}
                aria-label={`Ir para banner ${dotIdx + 1}`}
                aria-current={dotIdx === current ? "true" : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Home() {
  const { data: site } = useSuspenseQuery(siteQuery());
  const { data: categorias } = useSuspenseQuery(homeQuery());
  const titulo = site.config?.home_titulo || "Camisetas básicas e polos no atacado, a partir de 10 peças";
  const sub = site.config?.home_subtitulo;
  const primeira = categorias[0];
  const whatsappNumber = site.config?.whatsapp || "5547991364084";

  const exibirBanners = (site as any).home_display?.exibir_banners ?? false;
  const exibirVitrine = (site as any).home_display?.exibir_vitrine ?? true;

  const vitrineProdutos = useMemo(() => buildVitrineProducts(categorias), [categorias]);

  const rawItems = (
    site.banners as {
      items?: Array<{
        id: number;
        wide: string | null;
        mobile: string | null;
        link?: string | null;
        titulo?: string | null;
        subtitulo?: string | null;
      }>;
    }
  )?.items;

  const slides: BannerSlideData[] =
    rawItems && rawItems.length > 0
      ? rawItems.map((item) => {
          const isFirst = item.id === 1;
          const wideSrc = item.wide
            ? mediaUrl(item.wide)
            : item.mobile
              ? mediaUrl(item.mobile)
              : heroWide;
          const mobileSrc = item.mobile
            ? mediaUrl(item.mobile)
            : item.wide
              ? mediaUrl(item.wide)
              : heroMobile;
          const defaultLink = primeira ? `/categoria/${primeira.slug}` : "/carrinho";
          return {
            id: item.id,
            wideSrc,
            mobileSrc,
            link: item.link || defaultLink,
            titulo: isFirst ? item.titulo || titulo : item.titulo || null,
            subtitulo: isFirst ? item.subtitulo || sub : item.subtitulo || null,
          };
        })
      : [
          {
            id: 1,
            wideSrc: site.banners?.wide ? mediaUrl(site.banners.wide) : heroWide,
            mobileSrc: site.banners?.mobile ? mediaUrl(site.banners.mobile) : heroMobile,
            link: primeira ? `/categoria/${primeira.slug}` : "/carrinho",
            titulo,
            subtitulo: sub,
          },
        ];

  return (
    <>
      <section className="container-page pt-4 md:pt-8 space-y-5">
        {exibirBanners && (
          <BannerCarousel slides={slides} primeira={primeira} />
        )}

        {exibirVitrine && vitrineProdutos.length > 0 && (
          <ShowcaseCarousel
            produtos={vitrineProdutos}
            exibirSelo={site.home_display?.selo_black_friday}
            seloUrl={site.home_display?.selo_url}
          />
        )}

        {/* Barra de benefícios comerciais e diferenciais */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Seção Destaque de Descontos Progressivos */}
      <section className="container-page mt-14 md:mt-20" aria-labelledby="tabela-descontos">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-10 shadow-soft">
          <div className="max-w-2xl">
            <p className="eyebrow">Descontos automáticos no atacado</p>
            <h2 id="tabela-descontos" className="mt-1 text-2xl font-extrabold md:text-3xl text-foreground">
              Como funcionam os Descontos Progressivos
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Grade 100% livre! Você pode somar modelos diferentes, cores e tamanhos variados. Conforme a quantidade total cresce no pedido, o preço unitário de cada peça cai automaticamente:
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {FAIXAS_COMERCIAIS.map((f, i) => (
              <div
                key={f.faixa}
                className="rounded-2xl border bg-background/80 p-4 shadow-2xs space-y-2 hover:border-primary/40 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Faixa {i + 1}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {f.destaque}
                  </span>
                </div>
                <p className="text-lg font-extrabold text-foreground">{f.faixa}</p>
                <p className="text-xs text-muted-foreground leading-snug">{f.beneficio}</p>
                <div className="pt-1 border-t border-border/50 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 shrink-0" /> {f.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vitrine de produtos organizada por categorias */}
      {categorias.map((c) => (
        <section key={c.id} className="container-page mt-14 md:mt-20" aria-labelledby={`cat-${c.id}`}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 id={`cat-${c.id}`} className="text-2xl font-bold md:text-3xl text-foreground">
                {c.nome}
              </h2>
              {c.descricao && (
                <p className="mt-1 text-sm sm:text-base text-muted-foreground leading-relaxed">{c.descricao}</p>
              )}
            </div>
          </div>
          <ProductGrid
            produtos={c.produtos}
            exibirSelo={site.home_display?.selo_black_friday}
            seloUrl={site.home_display?.selo_url}
          />
          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="w-full sm:w-auto shadow-2xs font-semibold">
              <Link to="/categoria/$slug" params={{ slug: c.slug }}>
                Ver todos os modelos de {c.nome.toLowerCase()} <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      ))}

      {/* Como Comprar em 3 passos */}
      <section className="container-page mt-16 md:mt-24" aria-labelledby="como-comprar">
        <div className="rounded-3xl border bg-card p-6 md:p-10 shadow-soft">
          <p className="eyebrow">Simples e rápido</p>
          <h2 id="como-comprar" className="mt-2 text-2xl font-bold md:text-3xl text-foreground">
            Como comprar no atacado
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li
                key={p.titulo}
                className="card-hover flex gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 transition-all"
              >
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${p.gradient} text-white shadow-xs`}
                >
                  <p.icon className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Passo {i + 1}
                  </p>
                  <h3 className="mt-0.5 font-sans text-base sm:text-lg font-bold tracking-normal text-foreground">
                    {p.titulo}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Perguntas Frequentes (FAQ) com Accordion */}
      <section className="container-page mt-16 md:mt-24" aria-labelledby="faq-home">
        <div className="rounded-3xl border bg-card p-6 md:p-10 shadow-soft">
          <div className="flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" />
            <p className="eyebrow">Tire suas dúvidas</p>
          </div>
          <h2 id="faq-home" className="mt-2 text-2xl font-bold md:text-3xl text-foreground">
            Perguntas Frequentes sobre o Atacado
          </h2>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            Respostas claras para as principais dúvidas de lojistas e revendedores.
          </p>

          <div className="mt-6">
            <Accordion type="single" collapsible className="w-full">
              {FAQS_HOME.map((faq, idx) => (
                <AccordionItem key={faq.pergunta} value={`faq-${idx}`}>
                  <AccordionTrigger className="text-left font-sans font-bold text-base text-foreground hover:no-underline">
                    {faq.pergunta}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-1">
                    {faq.resposta}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Depoimentos de Clientes de Todo o Brasil */}
      <TestimonialsSection whatsappLoja={whatsappNumber} />

      {/* Chamada Comercial Pré-Rodapé (Pre-footer CRO Banner) */}
      <section className="container-page mt-16 md:mt-24 mb-6">
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-8 sm:p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>Garantia de Qualidade · Direto de Fábrica</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Pronto para abastecer sua loja com peças premium no atacado?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Monte seu pedido a partir de 10 peças variadas. Tenha acesso a descontos progressivos, cálculo de frete Correios em tempo real e atendimento rápido pelo WhatsApp.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {primeira && (
                <Button
                  asChild
                  size="lg"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-12 px-6 shadow-md border border-cyan-400/30 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Link to="/categoria/$slug" params={{ slug: primeira.slug }}>
                    Ver catálogo de produtos <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="lg"
                className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold h-12 px-6 shadow-md border border-emerald-600/40 transition-all hover:scale-[1.02] active:scale-95"
                onClick={() => analytics.clickWhatsApp("footer")}
              >
                <a
                  href={`https://wa.me/${whatsappLinkNumber(whatsappNumber)}?text=${encodeURIComponent(
                    "Olá! Vim pelo site da Líder Atacado e gostaria de mais informações."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-1.5 size-5" />
                  Falar no WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
