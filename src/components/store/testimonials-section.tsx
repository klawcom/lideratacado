import { useState, useMemo } from "react";
import {
  Star,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Repeat,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  PackageCheck,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  obterTodosDepoimentos,
  filtrarDepoimentosPorRegiao,
  calcularResumoDepoimentos,
  type Depoimento,
  type RegiaoBrasil,
} from "@/lib/testimonials";
import { TestimonialDialog } from "./testimonial-dialog";

const REGIOES: Array<{ id: RegiaoBrasil | "Todas"; label: string }> = [
  { id: "Todas", label: "Todas as Regiões" },
  { id: "Sudeste", label: "Sudeste" },
  { id: "Sul", label: "Sul" },
  { id: "Nordeste", label: "Nordeste" },
  { id: "Centro-Oeste", label: "Centro-Oeste" },
  { id: "Norte", label: "Norte" },
];

interface TestimonialsSectionProps {
  whatsappLoja?: string;
}

export function TestimonialsSection({ whatsappLoja }: TestimonialsSectionProps) {
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>(() => obterTodosDepoimentos());
  const [regiaoAtiva, setRegiaoAtiva] = useState<RegiaoBrasil | "Todas">("Todas");
  const [expandido, setExpandido] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  const filtrados = useMemo(() => {
    return filtrarDepoimentosPorRegiao(depoimentos, regiaoAtiva);
  }, [depoimentos, regiaoAtiva]);

  const resumo = useMemo(() => {
    return calcularResumoDepoimentos(depoimentos);
  }, [depoimentos]);

  // Exibe 5 inicialmente conforme o pedido do usuário
  const limiteInicial = 5;
  const visiveis = expandido ? filtrados : filtrados.slice(0, limiteInicial);
  const temMais = filtrados.length > limiteInicial;

  function handleDepoimentoAdicionado(novo: Depoimento) {
    setDepoimentos((prev) => [novo, ...prev]);
    setExpandido(true);
  }

  return (
    <section aria-labelledby="secao-depoimentos-titulo" className="container-page mt-14 sm:mt-20">
      <div className="rounded-3xl border bg-gradient-to-b from-card via-card/95 to-muted/30 p-5 sm:p-8 md:p-10 shadow-sm">
        {/* Cabeçalho */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>Depoimentos Reais · Clientes Verificados</span>
          </div>

          <h2
            id="secao-depoimentos-titulo"
            className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground"
          >
            Quem compra na Líder Atacado, aprova e compra de novo
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Veja a experiência real de lojistas, revendedores e sacoleiras de todas as regiões do Brasil. Roupas bem embaladas, malha de alta qualidade, cores variadas e peças com giro rápido.
          </p>

          {/* Destaques de confiança */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-foreground">
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 text-amber-500" />
                ))}
              </div>
              <span className="font-bold text-foreground">5.0 / 5.0</span>
              <span className="text-muted-foreground">({resumo.total}+ avaliações)</span>
            </div>

            <span className="hidden sm:inline text-muted-foreground/40">•</span>

            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <PackageCheck className="size-4" />
              <span>Embalagem Segura & Lacrada</span>
            </div>

            <span className="hidden sm:inline text-muted-foreground/40">•</span>

            <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
              <TrendingUp className="size-4" />
              <span>Alta Margem de Revenda</span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros por Região + Botão Adicionar Depoimento */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-b pb-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 w-full sm:w-auto">
            {REGIOES.map((r) => {
              const ativa = regiaoAtiva === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRegiaoAtiva(r.id);
                    setExpandido(false);
                  }}
                  className={`inline-flex min-h-11 items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    ativa
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalAberto(true)}
            className="w-full sm:w-auto gap-1.5 font-semibold border-dashed hover:border-primary shrink-0"
          >
            <PlusCircle className="size-4 text-primary" />
            <span>Deixar meu depoimento</span>
          </Button>
        </div>

        {/* Lista de Cards de Depoimentos */}
        <div className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((dep, index) => {
            const ehPrimeiro = index === 0 && !expandido && dep.id.startsWith("dep-local");
            return (
              <article
                key={dep.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${
                  ehPrimeiro
                    ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20"
                    : "bg-card hover:border-foreground/20"
                }`}
              >
                <div className="space-y-3">
                  {/* Topo do Card: Avatar + Nome + Cidade + Tag Verificado */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-primary/30 to-primary/10 text-primary font-bold text-sm">
                        {dep.nome
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-foreground text-sm truncate">
                            {dep.nome}
                          </h3>
                          {dep.verificado && (
                            <span
                              title="Compra Verificada"
                              className="inline-flex items-center text-emerald-600 dark:text-emerald-400 shrink-0"
                            >
                              <CheckCircle2 className="size-3.5" />
                            </span>
                          )}
                        </div>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                          <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
                          <span>
                            {dep.cidade} - {dep.estado} · {dep.regiao}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                      {dep.dataRelativa}
                    </span>
                  </div>

                  {/* Estrelas + Destaque rápido */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex text-amber-500">
                      {Array.from({ length: dep.nota }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-amber-400 text-amber-500" />
                      ))}
                    </div>

                    {dep.recompra && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <Repeat className="size-2.5" /> Recompra
                      </span>
                    )}

                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {dep.tipoCliente}
                    </span>
                  </div>

                  {/* Título de destaque do relato */}
                  {dep.destaque && (
                    <p className="text-xs font-bold text-foreground leading-snug">
                      &ldquo;{dep.destaque}&rdquo;
                    </p>
                  )}

                  {/* Texto do Depoimento */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    &ldquo;{dep.texto}&rdquo;
                  </p>
                </div>

                {/* Rodapé do Card: Produto Comprado */}
                {dep.produtosComprados && (
                  <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground/80 flex items-center justify-between">
                    <span className="truncate">Peças: {dep.produtosComprados}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] shrink-0">
                      Verificado
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Botão Ver Mais / Ver Menos */}
        {temMais && (
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setExpandido((prev) => !prev)}
              className="min-w-[220px] gap-2 font-bold shadow-xs hover:border-primary"
            >
              {expandido ? (
                <>
                  <ChevronUp className="size-4" />
                  Ver menos depoimentos
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" />
                  Ver mais depoimentos ({filtrados.length - limiteInicial} restantes)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Faixa inferior de segurança */}
        <div className="mt-8 pt-6 border-t flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Depoimentos autênticos enviados por clientes da Líder Atacado em todo o Brasil.</span>
          </div>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="text-primary hover:underline font-semibold cursor-pointer"
          >
            Já é nosso cliente? Clique aqui para deixar sua avaliação
          </button>
        </div>
      </div>

      {/* Modal para envio de novo depoimento */}
      <TestimonialDialog
        open={modalAberto}
        onOpenChange={setModalAberto}
        onDepoimentoAdicionado={handleDepoimentoAdicionado}
        whatsappLoja={whatsappLoja}
      />
    </section>
  );
}
