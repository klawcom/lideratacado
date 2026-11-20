import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { RichText } from "./rich-text";
import { siteQuery, type Config } from "@/lib/catalog.functions";
import { whatsappLinkNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";

export type CampoTexto = keyof Pick<
  Config,
  "texto_sobre" | "texto_como_comprar" | "texto_faq" | "texto_trocas" | "texto_privacidade"
>;

const CONTEUDOS_PADRAO: Record<CampoTexto, string> = {
  texto_sobre: `
### Quem Somos — Líder Atacado

A **Líder Atacado** é especializada no fornecimento e distribuição de vestuário básico masculino de alta qualidade para lojistas, revendedores autônomos e empreendedores de moda em todo o Brasil.

Nosso compromisso é viabilizar compras direto de fábrica com **pedido mínimo acessível a partir de 10 peças**, permitindo que pequenos e médios lojistas abasteçam suas lojas com produtos de alto valor percebido e excelente margem de revenda.

---

### Nossos Produtos e Diferenciais

- **100% Algodão Pima Peruano:** Malha de fibra longa com toque macio superior, elasticidade com elastano e alta durabilidade que não desbota nem deforma nas lavagens.
- **Camisas Polo Piquet:** Modelagem clássica com acabamento estruturado, botões reforçados e caimento elegante.
- **Linha Plus Size (G1 e G2):** Modelagens amplas especialmente desenvolvidas para conforto e caimento perfeito.
- **Grade 100% Livre:** O cliente escolhe livremente os tamanhos e as cores que deseja comprar.
- **Descontos Progressivos:** Faixas de desconto escalonadas (10+, 20+, 30+ e 50+ peças) aplicadas a todo o carrinho.
- **Modalidade Dropshipping:** Atendemos revendedores que vendem pela internet, gerando etiquetas de envio direto ao cliente final.
`.trim(),

  texto_como_comprar: `
### Como Comprar no Atacado — Passo a Passo

Comprar na Líder Atacado é simples, rápido e transparente. Não é necessário CNPJ para começar a comprar.

---

#### 1. Navegue pelo Catálogo e Escolha seus Produtos
Explore nossas categorias de camisetas básicas, polos e modelos plus size. Selecione os modelos que melhor atendem ao perfil dos seus clientes.

#### 2. Monte sua Grade de Tamanhos e Cores
Dentro da página de cada produto:
- Toque na cor desejada;
- Defina a quantidade de peças em cada tamanho (P, M, G, GG ou G1/G2);
- Clique em **Adicionar ao pedido**.
- O pedido mínimo é de **10 peças no total**, podendo mesclar produtos de diferentes categorias.

#### 3. Simule o Frete e Revise o Carrinho
No carrinho de compras, você confere o total de peças, a faixa de desconto aplicada e pode digitar seu CEP para consultar as opções de envio via Correios (PAC ou SEDEX) com prazos reais.

#### 4. Finalize os Dados e Escolha o Pagamento
Ao clicar em **Finalizar Pedido**, informe seus dados de entrega (ou dados do seu cliente final se for dropshipping). Você pode pagar online com Pix ou cartão pela InfinitePay, ou enviar o pedido ao nosso atendimento no WhatsApp para combinar o pagamento.
`.trim(),

  texto_faq: `
### Dúvidas Frequentes (FAQ)

Confira as respostas para as dúvidas mais comuns dos nossos clientes lojistas e revendedores:

---

#### Qual é o pedido mínimo no atacado?
O pedido mínimo é de apenas **10 peças no total**. Você pode misturar diferentes modelos, cores e tamanhos no mesmo pedido.

#### Como funcionam os descontos progressivos?
Quanto mais peças você adiciona ao pedido, menor o preço unitário de cada peça. As faixas são:
- A partir de 10 peças: Acesso à tabela de atacado.
- A partir de 20 peças: Desconto adicional em todos os itens.
- A partir de 30 peças: Maior margem para revenda.
- A partir de 50 peças: Melhor preço de atacado de fábrica.

#### Posso escolher cores e tamanhos específicos?
Sim! Trabalhamos com **grade livre** para modelos e tamanhos. Em relação às cores: vendemos no atacado, direto de fábrica e com alto giro. As cores são atendidas conforme o estoque disponível na hora da separação. Se alguma estiver em falta, enviamos cores sortidas, de mesma qualidade e modelo.

#### Como é calculado o frete?
O frete é calculado com base no peso e CEP de destino via integração oficial com os Correios (PAC e SEDEX). Você pode simular o frete diretamente na página do produto ou no carrinho.

#### Como é realizado o pagamento?
No checkout, você pode pagar online com Pix ou cartão de crédito pelo ambiente seguro da InfinitePay. Se preferir, envie o pedido pelo WhatsApp e nosso atendimento combinará o pagamento com você.
`.trim(),

  texto_trocas: `
### Política de Trocas e Devoluções

A Líder Atacado preza pela transparência, qualidade dos produtos e satisfação de seus parceiros lojistas, atuando em total conformidade com o Código de Defesa do Consumidor (Lei nº 8.078/1990).

---

#### 1. Trocas por Defeito de Fabricação
Todas as peças passam por rigorosa inspeção de qualidade antes do despacho. Caso seja constatado qualquer defeito de confecção, costura ou tecido:
- O prazo para notificação é de até **90 (noventa) dias corridos** após o recebimento do pedido.
- O frete de logística reversa para envio e reenvio de peças com defeito de fabricação comprovado é de responsabilidade integral da Líder Atacado.
- Após o recebimento em nossa fábrica e análise do defeito, providenciaremos a substituição da peça, crédito para futuras compras ou reembolso do valor correspondente.

#### 2. Direito de Desistência ou Devolução (CDC Art. 49)
Para compras não presenciais:
- O prazo para manifestar intenção de devolução total ou parcial por arrependimento é de até **7 (sete) dias corridos** contados a partir da data de entrega confirmada pelos Correios.
- As peças devem estar em perfeito estado, sem indícios de lavagem, uso, odores ou alterações, mantendo as etiquetas originais afixadas.

#### 3. Como Solicitar
Para iniciar qualquer procedimento de troca ou devolução, entre em contato imediatamente com nosso canal de atendimento no WhatsApp informando o número do pedido (#) e fotos das peças em questão.
`.trim(),

  texto_privacidade: `
### Política de Privacidade e Proteção de Dados (LGPD)

A Líder Atacado está comprometida com a privacidade, sigilo e segurança dos dados pessoais de seus clientes e parceiros comerciais, em estrita conformidade com a **Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)**.

---

#### 1. Quais Dados Coletamos e Para Qual Finalidade?
Coletamos exclusivamente os dados estritamente necessários para a formalização do pedido comercial e envio das mercadorias:
- **Nome completo e CPF:** Exigidos pelas transportadoras e Correios para postagem de encomendas e emissão de declarações de conteúdo.
- **Telefone / WhatsApp:** Utilizado para comunicação direta sobre o andamento do pedido, aprovação de cores e suporte ao cliente.
- **E-mail:** Para envio de confirmações e histórico do pedido.
- **Endereço de entrega:** Para postagem correta e entrega segura da encomenda.
- **Dados de destinatários (Dropshipping):** Utilizados única e exclusivamente para a confecção da etiqueta de envio ao cliente final do revendedor.

#### 2. Não Comercialização de Dados
A Líder Atacado **não vende, não compartilha e não comercializa dados pessoais** com terceiros para fins publicitários. O compartilhamento ocorre apenas com os prestadores estritamente necessários à operação (como a Empresa Brasileira de Correios e Telégrafos para efetivação da entrega).

#### 3. Direitos do Titular dos Dados
Você possui o direito de solicitar a qualquer momento a confirmação de tratamento de seus dados, retificação de informações incompletas ou incorretas, ou a eliminação de seus dados pessoais dos nossos registros cadastrais, bastando entrar em contato com nossa equipe pelo canal oficial de suporte.
`.trim(),
};

export function InstitucionalPage({ titulo, campo }: { titulo: string; campo: CampoTexto }) {
  const { data } = useSuspenseQuery(siteQuery());
  const cfg = data?.config;
  const textoBanco = cfg?.[campo]?.trim();
  const textoFinal = textoBanco || CONTEUDOS_PADRAO[campo];
  const wa = cfg?.whatsapp || "5547991364084";
  const email = cfg?.email_contato || "lideratacado8@gmail.com";

  return (
    <div className="container-page max-w-3xl py-6 sm:py-8 md:py-14">
      {/* Navegação estrutural / Breadcrumbs */}
      <nav aria-label="Navegação estrutural" className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="inline-flex min-h-11 items-center hover:text-foreground">
          Início
        </Link>
        <ChevronRight className="size-3 text-muted-foreground/60" aria-hidden />
        <span className="font-semibold text-foreground truncate" aria-current="page">
          {titulo}
        </span>
      </nav>

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">{titulo}</h1>

      <div className="mt-6 prose prose-slate dark:prose-invert max-w-none text-foreground">
        <RichText text={textoFinal} />
      </div>

      {/* Caixa de suporte e atendimento institucional */}
      <div className="mt-12 rounded-2xl border bg-card p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="font-sans text-base font-bold text-foreground">
            Canais Oficiais de Atendimento Líder Atacado
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Nossa equipe comercial e de suporte está à sua disposição para esclarecer qualquer dúvida sobre pedidos, frete, tabelas de preço e pós-venda.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {wa && (
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 h-10 px-4">
              <a href={`https://wa.me/${whatsappLinkNumber(wa)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" /> Atendimento via WhatsApp
              </a>
            </Button>
          )}
          {email && (
            <Button asChild variant="outline" size="sm" className="font-semibold gap-1.5 h-10 px-4">
              <a href={`mailto:${email}`}>
                <Mail className="size-4" /> {email}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
