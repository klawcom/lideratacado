import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildVitrineProducts, ShowcaseCarousel } from "./showcase-carousel";
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

  it("renderiza o carrossel de produtos com 4+ produtos e permite avançar pelas setas", () => {
    const mockProdutos: ProdutoCard[] = [
      {
        id: "p1",
        nome: "Camiseta Cotton Pima RMN",
        slug: "camiseta-cotton-pima-rmn",
        codigo_modelo: "CP01",
        destaque: true,
        ordem: 0,
        produto_midias: [],
        faixas_preco: [{ quantidade_minima: 10, preco_peca: 42 }],
      },
      {
        id: "p2",
        nome: "Camiseta Cotton Pima ARMS 1",
        slug: "camiseta-cotton-pima-arms-1",
        codigo_modelo: "CP02",
        destaque: false,
        ordem: 1,
        produto_midias: [],
        faixas_preco: [{ quantidade_minima: 10, preco_peca: 42 }],
      },
      {
        id: "p3",
        nome: "Camiseta Cotton Pima ARMS 2",
        slug: "camiseta-cotton-pima-arms-2",
        codigo_modelo: "CP03",
        destaque: false,
        ordem: 2,
        produto_midias: [],
        faixas_preco: [{ quantidade_minima: 10, preco_peca: 42 }],
      },
      {
        id: "p4",
        nome: "Camiseta Cotton Pima CLVN",
        slug: "camiseta-cotton-pima-clvn",
        codigo_modelo: "CP04",
        destaque: false,
        ordem: 3,
        produto_midias: [],
        faixas_preco: [{ quantidade_minima: 10, preco_peca: 42 }],
      },
      {
        id: "p5",
        nome: "Camiseta Cotton Pima PRETA",
        slug: "camiseta-cotton-pima-preta",
        codigo_modelo: "CP05",
        destaque: false,
        ordem: 4,
        produto_midias: [],
        faixas_preco: [{ quantidade_minima: 10, preco_peca: 42 }],
      },
    ];

    render(<ShowcaseCarousel produtos={mockProdutos} />);

    // Deve exibir o título da seção e os produtos
    expect(screen.getByText("Destaques da Coleção")).toBeInTheDocument();
    expect(screen.getByText("Camiseta Cotton Pima RMN")).toBeInTheDocument();
    expect(screen.getByText("Camiseta Cotton Pima CLVN")).toBeInTheDocument();

    // Deve possuir setas de navegação
    const nextBtn = screen.getByLabelText("Próximos produtos");
    expect(nextBtn).toBeInTheDocument();
    fireEvent.click(nextBtn);
  });
});
