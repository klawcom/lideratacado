import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressDiscount } from "./progress-discount";

describe("ProgressDiscount component", () => {
  it("renders warning when below minimum (e.g. 6 pieces)", () => {
    render(<ProgressDiscount totalPecas={6} pedidoMinimo={10} />);
    expect(screen.getByText(/Faltam 4 peças/i)).toBeInTheDocument();
  });

  it("renders active tier when reached minimum (e.g. 15 pieces)", () => {
    render(
      <ProgressDiscount
        totalPecas={15}
        pedidoMinimo={10}
        faixaAtual={10}
        proxima={{ faixa: 20, faltam: 5 }}
      />
    );
    expect(screen.getByText(/Faixa ativa: a partir de 10 peças/i)).toBeInTheDocument();
    expect(screen.getByText(/desbloquear a faixa de 20 peças/i)).toBeInTheDocument();
  });

  it("renders maximum tier message when reaching 50 pieces", () => {
    render(
      <ProgressDiscount
        totalPecas={52}
        pedidoMinimo={10}
        faixaAtual={50}
        proxima={null}
      />
    );
    expect(screen.getByText(/Faixa máxima de desconto alcançada/i)).toBeInTheDocument();
  });
});
