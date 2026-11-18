# Integração InfinitePay

- [ ] Diagnosticar e corrigir a falha de geração do link do pedido existente, preservando a confirmação segura.
- [ ] Aplicar as cores InfinitePay aos controles de pagamento e verificar celular/computador.

- [x] Auditar checkout, pedidos, clientes, políticas de acesso e integrações existentes.
- [x] Criar estrutura de cobranças e eventos, sem alterar pedidos existentes.
- [x] Implementar criação idempotente de pedidos e links de pagamento.
- [x] Implementar webhook e confirmação obrigatória via `payment_check`.
- [x] Adicionar opção Pix/cartão ao checkout e página de retorno.
- [x] Exibir status e transações no painel administrativo.
- [x] Testar regras, build e fluxo completo sem simular pagamento real.
- [x] Publicar a infraestrutura e solicitar as credenciais pelo formulário seguro.
- [x] Validar a chave e a comunicação real com a InfinitePay após o cadastro.
- [ ] Testar uma cobrança e um pagamento reais de ponta a ponta — a InfinitePay não oferece sandbox; depende de uma compra real.
