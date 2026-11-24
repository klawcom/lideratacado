import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MediaGallery } from "./media-gallery";
import type { MidiaRow } from "@/lib/catalog.functions";

const MOCK_MIDIAS: MidiaRow[] = [
  {
    id: 1,
    produto_id: 10,
    tipo: "foto",
    url: "produtos/10/foto-1.webp",
    capa_url: null,
    video_externo: null,
    ordem: 0,
    principal: true,
  },
  {
    id: 2,
    produto_id: 10,
    tipo: "foto",
    url: "produtos/10/foto-2.webp",
    capa_url: null,
    video_externo: null,
    ordem: 1,
    principal: false,
  },
];

describe("MediaGallery component", () => {
  it("renderiza botões de navegação discretos para múltiplas imagens", () => {
    render(<MediaGallery midias={MOCK_MIDIAS} nome="Camiseta Cotton Pima" />);

    const prevButton = screen.getByLabelText("Imagem anterior");
    const nextButton = screen.getByLabelText("Próxima imagem");

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    // No primeiro slide, o botão anterior deve estar desabilitado/invisível
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  it("permite ampliar a imagem sem abrir pop-up e alternar zoom", () => {
    render(<MediaGallery midias={MOCK_MIDIAS} nome="Camiseta Cotton Pima" />);

    // Deve possuir botão com label de ampliar imagem
    const zoomButton = screen.getAllByLabelText("Ampliar imagem")[0];
    expect(zoomButton).toBeInTheDocument();

    // Clica para ativar o zoom suave
    fireEvent.click(zoomButton);

    // O botão deve alternar para reduzir zoom sem abrir modais externos
    expect(screen.getByLabelText("Reduzir zoom da imagem")).toBeInTheDocument();
    expect(screen.getByText("Toque ou clique para voltar")).toBeInTheDocument();

    // Clica para fechar o zoom
    fireEvent.click(screen.getByLabelText("Reduzir zoom da imagem"));
    expect(screen.getAllByLabelText("Ampliar imagem")[0]).toBeInTheDocument();
  });

  it("não exibe setas quando há apenas uma mídia", () => {
    render(<MediaGallery midias={[MOCK_MIDIAS[0]]} nome="Camiseta Única" />);

    expect(screen.queryByLabelText("Imagem anterior")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Próxima imagem")).not.toBeInTheDocument();
  });

  it("exibe a tag da cor associada e navega para a foto da cor selecionada", () => {
    const fotoCores = {
      1: "Branca",
      2: "Preta",
    };

    const { rerender } = render(
      <MediaGallery
        midias={MOCK_MIDIAS}
        nome="Camiseta Cotton Pima"
        corAtiva="Branca"
        fotoCores={fotoCores}
      />,
    );

    expect(screen.getByText("Cor: Branca")).toBeInTheDocument();

    // Alterna a cor ativa para Preta
    rerender(
      <MediaGallery
        midias={MOCK_MIDIAS}
        nome="Camiseta Cotton Pima"
        corAtiva="Preta"
        fotoCores={fotoCores}
      />,
    );

    expect(screen.getByText("Cor: Preta")).toBeInTheDocument();
  });

  it("permite avançar e retroceder imagens através das setas nas miniaturas", () => {
    render(<MediaGallery midias={MOCK_MIDIAS} nome="Camiseta Cotton Pima" />);

    const prevThumbBtn = screen.getByLabelText("Miniatura anterior");
    const nextThumbBtn = screen.getByLabelText("Próxima miniatura");

    expect(prevThumbBtn).toBeInTheDocument();
    expect(nextThumbBtn).toBeInTheDocument();
    expect(prevThumbBtn).toBeDisabled();
    expect(nextThumbBtn).not.toBeDisabled();

    // Clica para avançar na miniatura
    fireEvent.click(nextThumbBtn);

    // Agora o botão anterior deve estar habilitado e o próximo desabilitado (são 2 imagens)
    expect(prevThumbBtn).not.toBeDisabled();
    expect(nextThumbBtn).toBeDisabled();

    // Clica para retroceder
    fireEvent.click(prevThumbBtn);
    expect(prevThumbBtn).toBeDisabled();
    expect(nextThumbBtn).not.toBeDisabled();
  });

  it("renderiza o selo de Black Friday no topo direito quando exibirSelo for true", () => {
    const { rerender } = render(<MediaGallery midias={MOCK_MIDIAS} nome="Camiseta Cotton Pima" exibirSelo={false} />);
    expect(screen.queryByAltText("Selo Promocional")).not.toBeInTheDocument();

    rerender(<MediaGallery midias={MOCK_MIDIAS} nome="Camiseta Cotton Pima" exibirSelo={true} />);
    const img = screen.getByAltText("Selo Promocional") as HTMLImageElement;
    expect(img).toBeInTheDocument();

    // Com selo personalizado
    rerender(<MediaGallery midias={MOCK_MIDIAS} nome="Camiseta Cotton Pima" exibirSelo={true} seloUrl="/api/public/midia/promocoes/natal.webp" />);
    const customImg = screen.getByAltText("Selo Promocional") as HTMLImageElement;
    expect(customImg.src).toContain("promocoes/natal.webp");
  });
});
