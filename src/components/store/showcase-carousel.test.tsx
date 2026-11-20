import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildVitrineProducts, ShowcaseCarousel, type VitrineProduct } from "./showcase-carousel";
import type { ProdutoCard } from "@/lib/catalog.functions";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, className, ...props }: any) => {
    const href = typeof to === "string" && params?.slug ? to.replace("$slug", params.slug) : to;
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    );
  },
}));

describe("ShowcaseCarousel & buildVitrineProducts", () => {
  it("buildVitrineProducts seleciona destaques, 1 de cada categoria e novidades sem duplicar", () => {
    const mockCategorias: { nome: string; slug: string; produtos: ProdutoCard[] }[] = [
      {
        nome: "Camisetas Cotton Pima",
        slug: "camisetas-cotton-pima",
        produtos: [
          {
            id: "p1",
            nome: "Camiseta Pima 01",
            slug: "camiseta-pima-01",
            codigo_modelo: "CP01",
            destaque: true,
            ordem: 0,
            produto_midias: [],
            faixas_preco: [{ quantidade_minima: 10, preco_peca: 42 }],
          },
          {
            id: "p2",
            nome: "Camiseta Pima 02",
            slug: "camiseta-pima-02",
            codigo_modelo: "CP02",
            destaque: false,
            ordem: 1,
            produto_midias: [],
            faixas_preco: [{ quantidade_minima: 10, preco_peca: 42 }],
          },
        ],
      },
      {
        nome: "Camisas Polo",
        slug: "camisas-polo",
        produtos: [
          {
            id: "p3",
            nome: "Camisa Polo 01",
            slug: "camisa-polo-01",
            codigo_modelo: "PL01",
            destaque: false,
            ordem: 0,
            produto_midias: [],
            faixas_preco: [{ quantidade_minima: 10, preco_peca: 55 }],
          },
        ],
      },
    ];

    const result = buildVitrineProducts(mockCategorias);

    // Deve conter p1 (Mais Vendido), p2 (Novidade) e p3 (1 de cada categoria)
    expect(result.length).toBe(3);
    expect(result.map((r) => r.id)).toContain("p1");
    expect(result.map((r) => r.id)).toContain("p2");
    expect(result.map((r) => r.id)).toContain("p3");

    // Não deve haver IDs duplicados
    const ids = result.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("renderiza a vitrine de produtos e permite navegação entre os itens", () => {
    const mockProdutos: VitrineProduct[] = [
      {
        id: "p1",
        nome: "Camiseta Cotton Pima Especial",
        slug: "camiseta-pima-especial",
        codigo_modelo: "PIMA-01",
        badge: "Mais Vendido",
        categoriaNome: "Cotton Pima",
        categoriaSlug: "camisetas-cotton-pima",
        produto_midias: [],
        faixas_preco: [
          { quantidade_minima: 10, preco_peca: 46 },
          { quantidade_minima: 50, preco_peca: 42 },
        ],
      },
      {
        id: "p2",
        nome: "Camisa Polo Peruana Prime",
        slug: "camisa-polo-peruana-prime",
        codigo_modelo: "POLO-01",
        badge: "Polos Peruanas",
        categoriaNome: "Polos",
        categoriaSlug: "camisas-polos-peruanas",
        produto_midias: [],
        faixas_preco: [{ quantidade_minima: 10, preco_peca: 55 }],
      },
    ];

    render(<ShowcaseCarousel produtos={mockProdutos} />);

    // Produto inicial deve ser exibido
    expect(screen.getAllByText("Camiseta Cotton Pima Especial")[0]).toBeInTheDocument();
    expect(screen.getByText("Ref: PIMA-01")).toBeInTheDocument();
    expect(screen.getByText(/Mais Vendido/i)).toBeInTheDocument();

    // Clica no botão para avançar para o próximo produto
    const nextBtn = screen.getByLabelText("Próximo produto da vitrine");
    fireEvent.click(nextBtn);

    // O segundo produto agora deve estar em destaque
    expect(screen.getAllByText("Camisa Polo Peruana Prime")[0]).toBeInTheDocument();
    expect(screen.getByText("Ref: POLO-01")).toBeInTheDocument();
  });
});
