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
});
