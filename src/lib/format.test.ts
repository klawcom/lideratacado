import { describe, expect, it } from "vitest";
import { maskCpf, validarCpf } from "./format";

describe("validação e máscara de CPF", () => {
  it("formata CPF com máscara 000.000.000-00", () => {
    expect(maskCpf("12345678909")).toBe("123.456.789-09");
    expect(maskCpf("123.456.789-09")).toBe("123.456.789-09");
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf("123456")).toBe("123.456");
  });

  it("valida dígitos verificadores corretamente", () => {
    // CPFs válidos de teste
    expect(validarCpf("52998224725")).toBe(true);
    expect(validarCpf("529.982.247-25")).toBe(true);

    // CPFs inválidos
    expect(validarCpf("12345678900")).toBe(false);
    expect(validarCpf("11111111111")).toBe(false); // repetição
    expect(validarCpf("00000000000")).toBe(false); // repetição
    expect(validarCpf("123")).toBe(false); // tamanho menor
  });
});
