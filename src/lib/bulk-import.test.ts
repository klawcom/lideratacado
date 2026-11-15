import { describe, expect, it } from "vitest";
import {
  agruparArquivos,
  caminhoFoto,
  codigoModelo,
  encontrarCategoriaCorrespondente,
  extrairPastaRaiz,
  nomeDaCategoria,
  temMarca,
  tituloDaPasta,
} from "./bulk-import";

const f = (path: string) => ({ path, file: path });

describe("importação de pasta", () => {
  it("cada subpasta vira um produto, em ordem alfabética", () => {
    const g = agruparArquivos([
      f("COTTON PIMA/Verde Óleo/2.jpg"),
      f("COTTON PIMA/Básica Preta/1.jpg"),
      f("COTTON PIMA/Verde Óleo/10.jpg"),
      f("COTTON PIMA/Verde Óleo/1.jpg"),
      f("COTTON PIMA/Verde Óleo/video.MOV"),
      f("COTTON PIMA/Verde Óleo/.DS_Store"),
      f("COTTON PIMA/Verde Óleo/notas.txt"),
    ]);
    expect(g.map((x) => x.pasta)).toEqual(["Básica Preta", "Verde Óleo"]);
    expect(g[1]!.fotos.map((x) => x.path.split("/").pop())).toEqual(["1.jpg", "2.jpg", "10.jpg"]);
    expect(g[1]!.videos).toHaveLength(1);
  });

  it("extrai a pasta raiz quando há subpastas de produtos", () => {
    const arquivos = [
      f("COTTON PIMA/Verde Óleo/1.jpg"),
      f("COTTON PIMA/Básica Preta/1.jpg"),
    ];
    expect(extrairPastaRaiz(arquivos)).toBe("COTTON PIMA");
    expect(nomeDaCategoria("COTTON PIMA")).toBe("Cotton Pima");
    expect(nomeDaCategoria("CAMISAS_POLO_PIQUET")).toBe("Camisas Polo Piquet");
  });

  it("retorna null para pasta raiz quando os arquivos já estão no primeiro nível", () => {
    const arquivos = [f("Modelo 01/foto1.jpg"), f("Modelo 01/foto2.jpg")];
    expect(extrairPastaRaiz(arquivos)).toBe(null);
  });

  it("encontra categoria correspondente por nome ou slug", () => {
    const categorias = [
      { id: "1", nome: "Camisetas Básicas Cotton Pima", slug: "camisetas-basicas-cotton-pima" },
      { id: "2", nome: "Camisas Polo Piquet", slug: "camisas-polo-piquet" },
    ];
    // Por slug parcial
    expect(encontrarCategoriaCorrespondente("COTTON PIMA", categorias)?.id).toBe("1");
    expect(encontrarCategoriaCorrespondente("Polos Piquet", categorias)?.id).toBe("2");
    // Não encontra se não houver relação
    expect(encontrarCategoriaCorrespondente("Bermudas Jeans", categorias)).toBe(null);
  });

  it("arquivos soltos na pasta escolhida formam um único produto", () => {
    const g = agruparArquivos([f("Modelo Liso/a.jpg"), f("Modelo Liso/b.jpg")]);
    expect(g).toHaveLength(1);
    expect(g[0]!.pasta).toBe("Modelo Liso");
  });

  it("nomes com marca viram 'Modelo NN'", () => {
    expect(temMarca("Camiseta Lacoste Branca")).toBe(true);
    expect(temMarca("TMMY HLFGR Azul")).toBe(true);
    expect(tituloDaPasta("Calvin Klein Preta", 7, "Camiseta Pima")).toEqual({ titulo: "Camiseta Pima Modelo 07", trocado: true });
  });

  it("nomes sem marca mantêm o nome da pasta", () => {
    expect(temMarca("Verde Óleo Básica")).toBe(false);
    expect(tituloDaPasta("VERDE ÓLEO BÁSICA", 3, "Camiseta Pima")).toEqual({ titulo: "Verde Óleo Básica", trocado: false });
  });

  it("códigos e caminhos seguem o padrão PIMA-NN", () => {
    expect(codigoModelo("pima", 3)).toBe("PIMA-03");
    expect(caminhoFoto("PIMA-03", 1)).toBe("products/PIMA-03/01.webp");
  });
});
