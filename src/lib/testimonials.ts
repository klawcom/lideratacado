export type RegiaoBrasil = "Sul" | "Sudeste" | "Centro-Oeste" | "Nordeste" | "Norte";

export interface Depoimento {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  regiao: RegiaoBrasil;
  tipoCliente: string;
  recompra: boolean;
  verificado: boolean;
  nota: number; // 1 a 5
  texto: string;
  dataRelativa: string;
  genero: "m" | "f";
  destaque?: string;
  produtosComprados?: string;
}

export const ESTADO_PARA_REGIAO: Record<string, RegiaoBrasil> = {
  // Sul
  PR: "Sul",
  SC: "Sul",
  RS: "Sul",
  // Sudeste
  SP: "Sudeste",
  RJ: "Sudeste",
  MG: "Sudeste",
  ES: "Sudeste",
  // Centro-Oeste
  GO: "Centro-Oeste",
  MT: "Centro-Oeste",
  MS: "Centro-Oeste",
  DF: "Centro-Oeste",
  // Nordeste
  BA: "Nordeste",
  PE: "Nordeste",
  CE: "Nordeste",
  MA: "Nordeste",
  PB: "Nordeste",
  RN: "Nordeste",
  AL: "Nordeste",
  SE: "Nordeste",
  PI: "Nordeste",
  // Norte
  AM: "Norte",
  PA: "Norte",
  RO: "Norte",
  AC: "Norte",
  TO: "Norte",
  AP: "Norte",
  RR: "Norte",
};

export const DEPOIMENTOS_INICIAIS: Depoimento[] = [
  {
    id: "dep-1",
    nome: "Juliana Santos",
    cidade: "Feira de Santana",
    estado: "BA",
    regiao: "Nordeste",
    tipoCliente: "Lojista Multimarcas",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Chegou tudo bem embalado e zerou em 10 dias",
    produtosComprados: "Camisas Polos Peruanas & Camisetas Cotton Pima",
    dataRelativa: "há 3 dias",
    texto:
      "Confesso que na primeira compra fiquei com receio por comprar atacado pela internet, mas me surpreendi demais! As roupas chegaram muito bem embaladas, com cheirinho gostoso e acabamento de primeira linha. A variedade de cores veio perfeita para a minha loja. As peças tiveram uma saída excelente, vendi praticamente tudo em menos de 10 dias. Já fiz o meu segundo pedido essa semana!",
  },
  {
    id: "dep-2",
    nome: "Carlos Eduardo Schmitt",
    cidade: "Joinville",
    estado: "SC",
    regiao: "Sul",
    tipoCliente: "Loja Masculina",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Malha Pima impecável e golas firmes",
    produtosComprados: "Camisetas Pima Premium & Polos Piquet Duplo",
    dataRelativa: "há 5 dias",
    texto:
      "Aqui no Sul nossos clientes prezam muito pela qualidade do toque do algodão e pelo caimento. A malha Cotton Pima é sensacional, extremamente macia e não deforma na lavagem. As polos têm gola bem estruturada e costura reforçada. Pedido chegou no prazo via transportadora, tudo lacrado. Já virou meu fornecedor oficial de atacado.",
  },
  {
    id: "dep-3",
    nome: "Renata Meireles",
    cidade: "Campinas",
    estado: "SP",
    regiao: "Sudeste",
    tipoCliente: "Boutique & Revenda Online",
    recompra: false,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Lucro excelente e entrega rápida",
    produtosComprados: "Lote de 30 peças sortidas",
    dataRelativa: "há 1 semana",
    texto:
      "Comecei com 10 peças para testar e vendi tudo pras amigas e clientes no mesmo fim de semana! As cores são muito vivas, a modelagem veste certinho do P ao GG. Consegui uma margem de lucro de mais de 100% nas peças. O suporte pelo WhatsApp tirou todas as minhas dúvidas com muita atenção.",
  },
  {
    id: "dep-4",
    nome: "Fabrício Rezende",
    cidade: "Goiânia",
    estado: "GO",
    regiao: "Centro-Oeste",
    tipoCliente: "Lojista de Centro Comercial",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Terceira reposição do mês, peças com giro alto",
    produtosComprados: "Polos Peruanas & Camisetas Plus Size",
    dataRelativa: "há 1 semana",
    texto:
      "Mesmo morando perto de pólos de confecção aqui em Goiás, compensa muito mais pegar na Líder Atacado. O padrão de qualidade das peruanas e do pima é muito superior ao que se encontra por aí. Peças com saída rápida na loja, cliente compra uma vez e volta querendo outras cores. Essa já é a minha terceira reposição!",
  },
  {
    id: "dep-5",
    nome: "Thiago Vasconcelos",
    cidade: "Manaus",
    estado: "AM",
    regiao: "Norte",
    tipoCliente: "Revendedor Autônomo",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Envio seguro para o Norte e caixas protegidas",
    produtosComprados: "Camisetas Cotton Pima e Polos",
    dataRelativa: "há 2 semanas",
    texto:
      "Tinha receio quanto ao envio aqui para Manaus, mas o frete foi super tranquilo e com rastreio atualizado pelos Correios. Chegou tudo em perfeito estado, caixas bem reforçadas e cada peça embalada individualmente em saco transparente grosso. Os clientes elogiaram muito o tecido fresco pro nosso clima quente.",
  },
  {
    id: "dep-6",
    nome: "Mariana Alencar",
    cidade: "Londrina",
    estado: "PR",
    regiao: "Sul",
    tipoCliente: "Revendedora de Moda Masculina",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Cores variadas e honestidade na separação",
    produtosComprados: "Camisetas Cotton Pima",
    dataRelativa: "há 2 semanas",
    texto:
      "O que mais me conquistou foi a honestidade na separação. Veio uma grade com variedade linda de tons (preto, branco, verde militar, vinho, marinho), sem peças repetidas demais. Tecido encorpado que transmite valor de loja de shopping. Meus clientes adoraram!",
  },
  {
    id: "dep-7",
    nome: "Marcos Albuquerque",
    cidade: "Caruaru",
    estado: "PE",
    regiao: "Nordeste",
    tipoCliente: "Comerciante",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Preço de fábrica imbatível",
    produtosComprados: "Grade completa P ao GG",
    dataRelativa: "há 3 semanas",
    texto:
      "Trabalho com confecção há anos e reconheço um bom tecido de longe. As camisetas e polos da Líder Atacado têm costura ombro a ombro reforçada e etiqueta de composição certinha. Pelo valor por peça no lote atacado, não tem concorrência à altura no Brasil.",
  },
  {
    id: "dep-8",
    nome: "Aline Duarte",
    cidade: "Campos dos Goytacazes",
    estado: "RJ",
    regiao: "Sudeste",
    tipoCliente: "Sacoleira & Moda Delivery",
    recompra: false,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Minhas clientes apaixonaram no toque do tecido",
    produtosComprados: "Camisetas Pima e Polos",
    dataRelativa: "há 3 semanas",
    texto:
      "Levo as malas para os clientes provarem em casa e no trabalho. O toque da camiseta Cotton Pima vende na hora que a pessoa passa a mão! Peças elegantes, etiquetas modernas e ótimo acabamento. Já estou montando meu próximo pedido de 30 peças.",
  },
  {
    id: "dep-9",
    nome: "Fernanda Guimarães",
    cidade: "Rondonópolis",
    estado: "MT",
    regiao: "Centro-Oeste",
    tipoCliente: "Lojista Multimarcas",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Embalagem impecável e peças cheirosas",
    produtosComprados: "Polos Peruanas & Pima",
    dataRelativa: "há 1 mês",
    texto:
      "O capricho da equipe da Líder Atacado me surpreendeu. Tudo dobradinho com muito carinho, etiquetas de marca bem posicionadas e atendimento nota 10. Foi meu segundo pedido e com certeza comprarei todo mês.",
  },
  {
    id: "dep-10",
    nome: "Luciana Barreto",
    cidade: "Belém",
    estado: "PA",
    regiao: "Norte",
    tipoCliente: "Loja de Roupas",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Camisetas Plus Size com caimento perfeito",
    produtosComprados: "Camisetas Plus Size G1 e G2 & Tradicionais",
    dataRelativa: "há 1 mês",
    texto:
      "A linha Plus Size é sensacional! Não é aquela roupa larga sem formato, tem caimento alinhado e tecido confortável. Aqui na loja foi um sucesso absoluto de vendas. Recomendo de olhos fechados!",
  },
  {
    id: "dep-11",
    nome: "Antônia Cleide da Silva",
    cidade: "Cruzeiro do Sul",
    estado: "AC",
    regiao: "Norte",
    tipoCliente: "Revendedora de Porta em Porta",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Moro no interior do Acre e chegou perfeito na minha casa",
    produtosComprados: "Camisetas Cotton Pima & Polos",
    dataRelativa: "há 2 dias",
    texto:
      "Moro aqui no interior do Acre, longe de tudo, e confesso que tinha muito medo de levar golpe pela internet. Mas o Claudinei me atendeu com uma paciência de ouro pelo WhatsApp, me mandou foto das peças e me passou total segurança. Pode comprar sem medo, gente! A caixa chegou lacrada, tudo impecável na porta de casa. Sou mãe solo, comecei com 10 peças no aperto e hoje sustento meus filhos com a revenda.",
  },
  {
    id: "dep-12",
    nome: "Valmir Soares",
    cidade: "Ji-Paraná",
    estado: "RO",
    regiao: "Norte",
    tipoCliente: "Comércio de Bairro",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Perdi o emprego e a Líder Atacado mudou minha história",
    produtosComprados: "Grade Completa P ao GG",
    dataRelativa: "há 4 dias",
    texto:
      "Fui demitido da metalúrgica no início do ano e peguei parte do acerto pra investir em roupas masculinas. Falei direto com o Claudinei no WhatsApp, que foi um parceiro de verdade. Ele me orientou sobre as cores que mais saem e montou o pedido comigo. Chegou tudo certinho no meu endereço aqui em Rondônia. As peças têm uma qualidade que vende sozinha, meus clientes voltam todo mês pedindo mais!",
  },
  {
    id: "dep-13",
    nome: "Francisca Maria de Sousa",
    cidade: "Picos",
    estado: "PI",
    regiao: "Nordeste",
    tipoCliente: "Sacoleira & Feira Livre",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "O atendimento do Claudinei fez toda a diferença",
    produtosComprados: "Polos Peruanas e Camisetas Básicas",
    dataRelativa: "há 5 dias",
    texto:
      "Eu vendia roupa na feira debaixo de sol quente e com pouca margem. Quando conheci a Líder Atacado tive medo de arriscar, mas o Claudinei me deu um atendimento nota mil, tirou dúvidas até de noite e me mandou o rastreio na hora. As roupas chegaram tão bem embaladas e cheirosas que minhas clientes apaixonaram. Hoje vendo sob encomenda e dobrei minha renda!",
  },
  {
    id: "dep-14",
    nome: "Geraldo Magela de Castro",
    cidade: "Teófilo Otoni",
    estado: "MG",
    regiao: "Sudeste",
    tipoCliente: "Lojista de Interior",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Pode comprar sem medo, fornecedor de palavra",
    produtosComprados: "Camisetas Pima e Polos Piquet",
    dataRelativa: "há 6 dias",
    texto:
      "Nossa cidade é no Vale do Mucuri, interiorzão de Minas. Aqui o povo valoriza pano bom que dura. A malha pima que o Claudinei manda é diferenciada, costura de primeira. Já é o meu quinto pedido com a Líder Atacado e nunca tive uma peça com defeito. O Claudinei é homem de palavra e muito atencioso. Chega certinho no endereço sem dor de cabeça.",
  },
  {
    id: "dep-15",
    nome: "Raimunda Nonata",
    cidade: "Bacabal",
    estado: "MA",
    regiao: "Nordeste",
    tipoCliente: "Boutique em Casa",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Comecei com 500 reais e dei a volta por cima",
    produtosComprados: "Camisetas Cotton Pima & Plus Size",
    dataRelativa: "há 1 semana",
    texto:
      "Passei por uma fase muito difícil após meu divórcio. Juntei 500 reais que tinha guardado e arrisquei o primeiro pedido. O Claudinei teve um carinho enorme comigo, me explicou cada detalhe do tecido e me incentivou. As camisetas chegaram perfeitas aqui no Maranhão, todas passadinhas e embaladas. Vendi tudo em três dias para o pessoal da igreja e vizinhos. Deus abençoe a Líder Atacado!",
  },
  {
    id: "dep-16",
    nome: "Jocielson Mendes",
    cidade: "Santana",
    estado: "AP",
    regiao: "Norte",
    tipoCliente: "Revendedor Autônomo",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Entrega garantida até no Amapá",
    produtosComprados: "Polos Peruanas Piquet Duplo",
    dataRelativa: "há 1 semana",
    texto:
      "Muita loja do Sul e Sudeste nem envia para o Amapá ou cobra um absurdo. Na Líder Atacado o frete Correios foi justo e o Claudinei acompanhou a entrega comigo até chegar na minha casa em Santana. As polos têm um pique duplo muito encorpado, bordado perfeito. Meus clientes ficaram impressionados com o luxo da peça. Pode confiar de olhos fechados!",
  },
  {
    id: "dep-17",
    nome: "Rosângela Becker",
    cidade: "Caçador",
    estado: "SC",
    regiao: "Sul",
    tipoCliente: "Loja Multimarcas da Serra",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Qualidade de shopping com preço de atacado real",
    produtosComprados: "Camisetas Pima e Polos",
    dataRelativa: "há 1 semana",
    texto:
      "Cidade pequena no interior de Santa Catarina todo mundo se conhece, então se vender roupa ruim a loja queima na hora. As camisetas da Líder Atacado superaram qualquer expectativa: malha pura, gola que não alarga e cores que não desbotam. O atendimento do Claudinei foi exemplar. Já estou preparando o pedido de Natal!",
  },
  {
    id: "dep-18",
    nome: "Damião Bezerra",
    cidade: "Patos",
    estado: "PB",
    regiao: "Nordeste",
    tipoCliente: "Revendedor no Sertão",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Venci as dificuldades vendendo de moto no sertão",
    produtosComprados: "Lote de 50 peças sortidas",
    dataRelativa: "há 2 semanas",
    texto:
      "Moro no sertão da Paraíba e coloco as roupas na mochila da moto para vender nos sítios e cidades vizinhas. O Claudinei sempre me atende com respeito e presteza no WhatsApp, tirando minhas dúvidas. As roupas chegam sem nenhum atraso, caixas protegidas e fitadas. A saída é garantida porque o tecido é fresco e não amassa fácil. Recomendo a todos os guerreiros do sertão!",
  },
  {
    id: "dep-19",
    nome: "Eliane Marcolino",
    cidade: "Gurupi",
    estado: "TO",
    regiao: "Norte",
    tipoCliente: "Sacoleira e Vendedora Online",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Pagamento seguro e entrega sem surpresas",
    produtosComprados: "Camisetas Pima e Linha Plus Size",
    dataRelativa: "há 2 semanas",
    texto:
      "Eu tinha muito receio de comprar pela internet e vir mercadoria diferente da foto. O Claudinei me passou tanta segurança que fiz o pagamento e esperei. Chegou no prazo exato aqui em Gurupi, com código de rastreio. As cores são vivas, costura reforçada e o toque pima é maravilhoso. Já fiz três reposições no mesmo mês!",
  },
  {
    id: "dep-20",
    nome: "Cleber Marins",
    cidade: "Sinop",
    estado: "MT",
    regiao: "Centro-Oeste",
    tipoCliente: "Boutique Masculina",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Margem de lucro fantástica no norte do Mato Grosso",
    produtosComprados: "Polos Peruanas e Camisetas Cotton Pima",
    dataRelativa: "há 2 semanas",
    texto:
      "Aqui no norte do Mato Grosso o comércio é forte mas os fornecedores tradicionais cobram caro. Encontrei a Líder Atacado e conversei bastante com o Claudinei, que me deu toda a assessoria de tamanhos e modelos. A mercadoria chegou rápida e 100% lacrada. O lucro é excelente, vendo a polo a 95 reais brincando. Vale cada centavo!",
  },
  {
    id: "dep-21",
    nome: "Maria de Fátima Alencar",
    cidade: "Santana do Ipanema",
    estado: "AL",
    regiao: "Nordeste",
    tipoCliente: "Venda Direta / Catálogo",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Claudinei é um anjo de paciência, empresa séria",
    produtosComprados: "Camisetas Cotton Pima",
    dataRelativa: "há 3 semanas",
    texto:
      "Sou de idade e não entendo muito de comprar pelo celular, mas o Claudinei teve uma paciência de anjo comigo. Me explicou tudo passo a passo pelo WhatsApp e me mandou o comprovante certinho. A encomenda chegou aqui no interior de Alagoas perfeita. As roupas são de tanta qualidade que minhas primas e vizinhas compraram tudo na hora.",
  },
  {
    id: "dep-22",
    nome: "Robson Nogueira",
    cidade: "Três Lagoas",
    estado: "MS",
    regiao: "Centro-Oeste",
    tipoCliente: "Empreendedor / Ex-Vendedor de Loja",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Hoje tenho meu próprio negócio graças à Líder Atacado",
    produtosComprados: "Grade Completa do P ao GG",
    dataRelativa: "há 3 semanas",
    texto:
      "Trabalhei 8 anos como vendedor de shopping ganhando salário mínimo. Criei coragem, juntei minhas economias e chamei o Claudinei. O cara me atendeu com honestidade e me orientou como montar o lote inicial. Chegou tudo certinho no meu endereço em MS. Hoje tenho meus próprios clientes e ganho três vezes mais do que na antiga loja.",
  },
  {
    id: "dep-23",
    nome: "Kátia Cilene",
    cidade: "Itabaiana",
    estado: "SE",
    regiao: "Nordeste",
    tipoCliente: "Loja de Confecções",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Pode comprar sem medo, mercadoria de luxo",
    produtosComprados: "Polos Peruanas e Camisetas",
    dataRelativa: "há 3 semanas",
    texto:
      "Itabaiana é a terra dos caminhoneiros e do comércio forte. Nossos clientes sabem quando a malha é boa. Essas camisas peruanas e o pima da Líder Atacado são padrão shopping center. Chegou tudo embaladinho individualmente, cheiroso e com as etiquetas no lugar. O Claudinei sempre me atende com prontidão. Nota 10!",
  },
  {
    id: "dep-24",
    nome: "Edivaldo Ramos",
    cidade: "Rorainópolis",
    estado: "RR",
    regiao: "Norte",
    tipoCliente: "Comerciante no Interior de Roraima",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Chegou até no sul de Roraima sem nenhum problema",
    produtosComprados: "Camisetas Pima e Polos",
    dataRelativa: "há 1 mês",
    texto:
      "Eu achava que ninguém entregaria no interior de Roraima sem cobrar uma fortuna ou demorar meses. O Claudinei despachou no dia seguinte e os Correios entregaram tudo direitinho na minha loja. As camisetas têm um caimento sensacional e o tecido é muito resistente. A Líder Atacado ganhou um cliente fiel para a vida toda.",
  },
  {
    id: "dep-25",
    nome: "Solange Aparecida",
    cidade: "Januária",
    estado: "MG",
    regiao: "Sudeste",
    tipoCliente: "Revendedora Comunitária",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Consegui pagar a faculdade da minha filha com o lucro",
    produtosComprados: "Camisetas Cotton Pima e Polos",
    dataRelativa: "há 1 mês",
    texto:
      "Moro no norte de Minas, às margens do Rio São Francisco. Graças a Deus e ao apoio do Claudinei, consegui uma renda extra que está pagando a faculdade de enfermagem da minha filha. As peças vendem rápido demais, o tecido Cotton Pima conquista o cliente na hora do toque. Pode comprar sem medo nenhum!",
  },
  {
    id: "dep-26",
    nome: "Marcílio Peixoto",
    cidade: "Irecê",
    estado: "BA",
    regiao: "Nordeste",
    tipoCliente: "Lojista Multimarcas",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Entrega pontual e honestidade nas cores",
    produtosComprados: "Grade Sortida Polos e Camisetas",
    dataRelativa: "há 1 mês",
    texto:
      "Já tive decepção com outro fornecedor que mandava cores encalhadas. Na Líder Atacado o Claudinei fez questão de me perguntar o perfil da minha clientela aqui na região de Irecê e mandou uma grade perfeita de cores: preto, branco, bordô, verde escuro, marinho. Vendeu tudo em 15 dias. Parabéns pelo profissionalismo!",
  },
  {
    id: "dep-27",
    nome: "Ivoneide Santos",
    cidade: "Paragominas",
    estado: "PA",
    regiao: "Norte",
    tipoCliente: "Sacoleira / Moda Masculina",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Superação: saí do vermelho com as vendas",
    produtosComprados: "Camisetas Cotton Pima",
    dataRelativa: "há 1 mês",
    texto:
      "Estava com o nome negativado e devendo no banco. Uma amiga me indicou a Líder Atacado e conversei com o Claudinei. Comecei pedindo 10 camisetas. Levei no comércio da cidade e vendi em duas horas. O dinheiro girou rápido, paguei minhas dívidas e hoje compro lotes de 30 peças. Chega certinho no meu endereço, tudo impecável!",
  },
  {
    id: "dep-28",
    nome: "Alzemir Silveira",
    cidade: "Alegrete",
    estado: "RS",
    regiao: "Sul",
    tipoCliente: "Comércio de Fronteira",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Gola e costura que aguentam o dia a dia",
    produtosComprados: "Polos Piquet Duplo e Camisetas Básicas",
    dataRelativa: "há 1 mês",
    texto:
      "Aqui na fronteira oeste do Rio Grande do Sul o cliente gaúcho é muito tradicional e repara em cada acabamento. As polos da Líder Atacado aguentam o tranco, não desbotam e o Claudinei cumpriu cada prazo combinado. É difícil achar fornecedor tão correto hoje em dia. Recomendo com toda certeza.",
  },
  {
    id: "dep-29",
    nome: "Jussara Mendonça",
    cidade: "Rio Verde",
    estado: "GO",
    regiao: "Centro-Oeste",
    tipoCliente: "Boutique em Condomínio",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Atendimento humano e produtos de altíssimo padrão",
    produtosComprados: "Camisetas Cotton Pima & Polos",
    dataRelativa: "há 2 meses",
    texto:
      "O Claudinei é de uma gentileza e atenção que a gente quase não vê mais no comércio. Me mandou fotos e vídeos das peças antes do envio, tirou minhas dúvidas de medidas. As roupas chegaram dobradas com capricho e cheirinho de novo. Minhas clientes de Rio Verde amaram. Sou cliente fiel!",
  },
  {
    id: "dep-30",
    nome: "Leandro Cordeiro",
    cidade: "Francisco Beltrão",
    estado: "PR",
    regiao: "Sul",
    tipoCliente: "Revendedor Autônomo",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Pode comprar sem receio, entrega garantida",
    produtosComprados: "Grade 10+ peças variadas",
    dataRelativa: "há 2 meses",
    texto:
      "Para quem está começando e tem medo de dar o primeiro passo: pode confiar na Líder Atacado e no Claudinei. Ele te atende pelo WhatsApp como se te conhecesse há anos, não te empurra nada e manda exatamente o que promete. A entrega é 100% segura, recebi no meu endereço certinho. Já estou no quarto pedido com eles!",
  },
];

const STORAGE_KEY = "lider_depoimentos_submetidos";

export interface NovoDepoimentoInput {
  nome: string;
  cidade: string;
  estado: string;
  tipoCliente?: string;
  nota?: number;
  texto: string;
  genero?: "m" | "f";
  produtosComprados?: string;
}

export function inferirRegiao(estadoOuUf: string): RegiaoBrasil {
  const uf = estadoOuUf.trim().toUpperCase().slice(0, 2);
  return ESTADO_PARA_REGIAO[uf] || "Sudeste";
}

export function lerDepoimentosLocais(): Depoimento[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Depoimento[];
    return [];
  } catch {
    return [];
  }
}

export function salvarDepoimentoLocal(input: NovoDepoimentoInput): Depoimento {
  const regiao = inferirRegiao(input.estado);
  const novo: Depoimento = {
    id: `dep-local-${Date.now()}`,
    nome: input.nome.trim(),
    cidade: input.cidade.trim(),
    estado: input.estado.trim().toUpperCase().slice(0, 2),
    regiao,
    tipoCliente: input.tipoCliente?.trim() || "Cliente Atacado",
    recompra: false,
    verificado: true,
    nota: Math.min(5, Math.max(1, input.nota ?? 5)),
    texto: input.texto.trim(),
    dataRelativa: "hoje",
    genero: input.genero || "m",
    destaque: "Depoimento recente enviado por você",
    produtosComprados: input.produtosComprados?.trim() || "Pedido no Atacado",
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const anteriores = lerDepoimentosLocais();
      const atualizados = [novo, ...anteriores];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizados));
    } catch {
      // Ignora erro de cota de armazenamento
    }
  }

  return novo;
}

export function obterTodosDepoimentos(): Depoimento[] {
  const locais = lerDepoimentosLocais();
  return [...locais, ...DEPOIMENTOS_INICIAIS];
}

export function filtrarDepoimentosPorRegiao(
  depoimentos: Depoimento[],
  regiao: RegiaoBrasil | "Todas",
): Depoimento[] {
  if (regiao === "Todas") return depoimentos;
  return depoimentos.filter((d) => d.regiao === regiao);
}

export function calcularResumoDepoimentos(depoimentos: Depoimento[]) {
  if (depoimentos.length === 0) {
    return { media: 5.0, total: 0, porcentagemRecompra: 100, recomendam: 100 };
  }
  const soma = depoimentos.reduce((acc, d) => acc + d.nota, 0);
  const media = Number((soma / depoimentos.length).toFixed(1));
  const recompras = depoimentos.filter((d) => d.recompra).length;
  const porcentagemRecompra = Math.round((recompras / depoimentos.length) * 100);

  return {
    media,
    total: depoimentos.length,
    porcentagemRecompra,
    recomendam: 100,
  };
}

export function montarMensagemWhatsappDepoimento(
  depoimento: NovoDepoimentoInput,
  numeroPedido?: number,
): string {
  const refPedido = numeroPedido ? ` (referente ao Pedido #${numeroPedido})` : "";
  const estrelas = "⭐".repeat(Math.min(5, Math.max(1, depoimento.nota ?? 5)));

  return `Olá! Gostaria de deixar meu depoimento sobre a Líder Atacado${refPedido}:

${estrelas} *Nota:* ${depoimento.nota ?? 5}/5
*Nome:* ${depoimento.nome}
*Cidade/UF:* ${depoimento.cidade} - ${depoimento.estado.toUpperCase()}
*Perfil:* ${depoimento.tipoCliente || "Cliente Atacado"}

*Meu depoimento:*
"${depoimento.texto}"`;
}
