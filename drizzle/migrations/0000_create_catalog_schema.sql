
create type public.app_role as enum ('admin', 'user');
create type public.midia_tipo as enum ('foto', 'video');
create type public.pedido_status as enum ('novo', 'em_atendimento', 'pago', 'enviado', 'cancelado');

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;
grant execute on function public.is_admin() to authenticated, anon;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- CATEGORIAS
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text not null default '',
  ordem integer not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categorias to anon;
grant select, insert, update, delete on public.categorias to authenticated;
grant all on public.categorias to service_role;
alter table public.categorias enable row level security;
create policy "Public reads active categories" on public.categorias for select to anon, authenticated using (ativa or public.has_role(auth.uid(), 'admin'));
create policy "Admin inserts categories" on public.categorias for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates categories" on public.categorias for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes categories" on public.categorias for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PRODUTOS
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_modelo text not null unique,
  slug text not null unique,
  descricao text not null default '',
  composicao text not null default '',
  categoria_id uuid references public.categorias(id) on delete set null,
  ativo boolean not null default true,
  destaque boolean not null default false,
  ordem integer not null default 0,
  estoque integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index produtos_categoria_idx on public.produtos(categoria_id);
create trigger produtos_updated_at before update on public.produtos for each row execute function public.set_updated_at();
grant select on public.produtos to anon;
grant select, insert, update, delete on public.produtos to authenticated;
grant all on public.produtos to service_role;
alter table public.produtos enable row level security;
create policy "Public reads active products" on public.produtos for select to anon, authenticated using (ativo or public.has_role(auth.uid(), 'admin'));
create policy "Admin inserts products" on public.produtos for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates products" on public.produtos for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes products" on public.produtos for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PRODUTO_MIDIAS
create table public.produto_midias (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  tipo public.midia_tipo not null default 'foto',
  url text,
  video_externo text,
  capa_url text,
  ordem integer not null default 0,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);
create index produto_midias_produto_idx on public.produto_midias(produto_id);
grant select on public.produto_midias to anon;
grant select, insert, update, delete on public.produto_midias to authenticated;
grant all on public.produto_midias to service_role;
alter table public.produto_midias enable row level security;
create policy "Public reads media of active products" on public.produto_midias for select to anon, authenticated using (
  exists (select 1 from public.produtos p where p.id = produto_id and p.ativo) or public.has_role(auth.uid(), 'admin'));
create policy "Admin inserts media" on public.produto_midias for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates media" on public.produto_midias for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes media" on public.produto_midias for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- FAIXAS_PRECO
create table public.faixas_preco (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  quantidade_minima integer not null check (quantidade_minima in (10, 20, 30, 50)),
  preco_peca numeric(10,2) not null check (preco_peca >= 0),
  unique (produto_id, quantidade_minima)
);
grant select on public.faixas_preco to anon;
grant select, insert, update, delete on public.faixas_preco to authenticated;
grant all on public.faixas_preco to service_role;
alter table public.faixas_preco enable row level security;
create policy "Public reads prices of active products" on public.faixas_preco for select to anon, authenticated using (
  exists (select 1 from public.produtos p where p.id = produto_id and p.ativo) or public.has_role(auth.uid(), 'admin'));
create policy "Admin inserts prices" on public.faixas_preco for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates prices" on public.faixas_preco for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes prices" on public.faixas_preco for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CLIENTES
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  whatsapp text not null default '',
  rua text not null default '',
  numero text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  estado text not null default '',
  cep text not null default '',
  user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clientes_user_idx on public.clientes(user_id);
create trigger clientes_updated_at before update on public.clientes for each row execute function public.set_updated_at();
create or replace function public.clientes_lower_email()
returns trigger language plpgsql set search_path = public as $$
begin new.email = lower(trim(new.email)); return new; end; $$;
create trigger clientes_email_lower before insert or update on public.clientes for each row execute function public.clientes_lower_email();
grant select, insert, update, delete on public.clientes to authenticated;
grant all on public.clientes to service_role;
alter table public.clientes enable row level security;
create policy "Clients read own record, admin reads all" on public.clientes for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admin inserts clients" on public.clientes for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates clients" on public.clientes for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes clients" on public.clientes for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PEDIDOS
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated by default as identity (start with 1) unique not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  user_id uuid,
  status public.pedido_status not null default 'novo',
  total numeric(12,2) not null default 0,
  total_pecas integer not null default 0,
  faixa_aplicada integer not null default 10,
  observacao text not null default '',
  cliente_nome text not null default '',
  cliente_email text not null default '',
  cliente_whatsapp text not null default '',
  rua text not null default '',
  numero_endereco text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  estado text not null default '',
  cep text not null default '',
  created_at timestamptz not null default now()
);
create index pedidos_cliente_idx on public.pedidos(cliente_id);
create index pedidos_user_idx on public.pedidos(user_id);
create index pedidos_created_idx on public.pedidos(created_at desc);
grant select, insert, update, delete on public.pedidos to authenticated;
grant all on public.pedidos to service_role;
alter table public.pedidos enable row level security;
create policy "Clients read own orders, admin reads all" on public.pedidos for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or user_id = auth.uid()
  or exists (select 1 from public.clientes c where c.id = cliente_id and c.user_id = auth.uid()));
create policy "Admin inserts orders" on public.pedidos for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates orders" on public.pedidos for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes orders" on public.pedidos for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- NOTAS INTERNAS (admin only)
create table public.pedido_notas (
  pedido_id uuid primary key references public.pedidos(id) on delete cascade,
  notas text not null default '',
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.pedido_notas to authenticated;
grant all on public.pedido_notas to service_role;
alter table public.pedido_notas enable row level security;
create policy "Admin manages internal notes" on public.pedido_notas for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- PEDIDO_ITENS
create table public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  produto_nome text not null default '',
  codigo_modelo text not null default '',
  qtd_p integer not null default 0 check (qtd_p >= 0),
  qtd_m integer not null default 0 check (qtd_m >= 0),
  qtd_g integer not null default 0 check (qtd_g >= 0),
  qtd_gg integer not null default 0 check (qtd_gg >= 0),
  preco_unitario numeric(10,2) not null default 0,
  valor numeric(12,2) not null default 0,
  observacao text not null default ''
);
create index pedido_itens_pedido_idx on public.pedido_itens(pedido_id);
grant select, insert, update, delete on public.pedido_itens to authenticated;
grant all on public.pedido_itens to service_role;
alter table public.pedido_itens enable row level security;
create policy "Read items of visible orders" on public.pedido_itens for select to authenticated using (
  exists (select 1 from public.pedidos p where p.id = pedido_id));
create policy "Admin inserts items" on public.pedido_itens for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates items" on public.pedido_itens for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes items" on public.pedido_itens for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- CONFIGURACOES (single row)
create table public.configuracoes (
  id integer primary key default 1 check (id = 1),
  whatsapp text not null default '5566996444461',
  pedido_minimo integer not null default 10 check (pedido_minimo >= 1),
  home_titulo text not null default '',
  home_subtitulo text not null default '',
  email_contato text not null default '',
  texto_sobre text not null default '',
  texto_como_comprar text not null default '',
  texto_faq text not null default '',
  texto_trocas text not null default '',
  texto_privacidade text not null default '',
  logo_url text,
  cor_destaque text not null default '#C9A227',
  updated_at timestamptz not null default now()
);
create trigger configuracoes_updated_at before update on public.configuracoes for each row execute function public.set_updated_at();
grant select on public.configuracoes to anon;
grant select, update on public.configuracoes to authenticated;
grant all on public.configuracoes to service_role;
alter table public.configuracoes enable row level security;
create policy "Public reads settings" on public.configuracoes for select to anon, authenticated using (true);
create policy "Admin updates settings" on public.configuracoes for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- AUTH LIFECYCLE: admin role + link clientes by verified email
create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null and new.email_confirmed_at is not null then
    if lower(new.email) = 'klaw.com@gmail.com' then
      insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
    end if;
    update public.clientes set user_id = new.id where email = lower(new.email) and user_id is null;
  end if;
  return new;
end; $$;
revoke execute on function public.handle_auth_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_auth_user();
create trigger on_auth_user_updated after update of email, email_confirmed_at on auth.users for each row execute function public.handle_auth_user();

-- STORAGE policies (bucket "produtos" is private; public reads go through the app's media route)
create policy "Admin reads product files" on storage.objects for select to authenticated using (bucket_id = 'produtos' and public.has_role(auth.uid(), 'admin'));
create policy "Admin uploads product files" on storage.objects for insert to authenticated with check (bucket_id = 'produtos' and public.has_role(auth.uid(), 'admin'));
create policy "Admin updates product files" on storage.objects for update to authenticated using (bucket_id = 'produtos' and public.has_role(auth.uid(), 'admin'));
create policy "Admin deletes product files" on storage.objects for delete to authenticated using (bucket_id = 'produtos' and public.has_role(auth.uid(), 'admin'));

-- SEED
insert into public.configuracoes (id, whatsapp, pedido_minimo, home_titulo, home_subtitulo, email_contato, texto_sobre, texto_como_comprar, texto_faq, texto_trocas, texto_privacidade, cor_destaque) values (
  1, '5566996444461', 10,
  'Camisetas básicas e polos no atacado, a partir de 10 peças',
  'Peças lisas de algodão com ótimo caimento. Monte seu pedido por tamanho e finalize pelo WhatsApp.',
  '',
  E'A Líder Atacado vende camisetas básicas e camisas polo lisas no atacado para lojistas, revendedores, uniformes e personalização.\n\nTrabalhamos com tecidos de qualidade, modelagem confortável e preços que melhoram conforme o tamanho do pedido.',
  E'## 1. Escolha as peças por tamanho\nEntre no produto e informe quantas peças quer em P, M, G e GG. O pedido mínimo é de 10 peças no total, somando todos os produtos.\n\n## 2. Envie o pedido no WhatsApp\nPreencha seus dados de entrega e confirme. O pedido chega pronto no nosso WhatsApp.\n\n## 3. Combine frete e pagamento\nRespondemos com o valor do frete e as formas de pagamento disponíveis.',
  E'## Qual é o pedido mínimo?\n10 peças no total, podendo misturar produtos, categorias e tamanhos.\n\n## Posso escolher as cores?\nNão. As cores são sortidas, conforme a disponibilidade do estoque.\n\n## Como o preço por peça é calculado?\nPelo total de peças do pedido: a partir de 10, 20, 30 ou 50 peças. Quanto mais peças, menor o preço de todas.\n\n## Como pago e recebo?\nDepois do pedido, combinamos o frete e o pagamento pelo WhatsApp.',
  E'Aceitamos trocas por defeito de fabricação em até 7 dias após o recebimento.\n\nEntre em contato pelo WhatsApp com o número do pedido e fotos da peça. Peças usadas, lavadas ou personalizadas não podem ser trocadas, exceto em caso de defeito.',
  E'Esta política explica como tratamos seus dados pessoais, de acordo com a Lei Geral de Proteção de Dados (LGPD).\n\n## Quais dados coletamos\nNome, e-mail, WhatsApp e endereço de entrega, informados ao finalizar um pedido.\n\n## Para que usamos\nSomente para atender seu pedido, calcular o frete, entrar em contato e emitir documentos fiscais.\n\n## Compartilhamento\nNão vendemos seus dados. Compartilhamos apenas o necessário com transportadoras.\n\n## Seus direitos\nVocê pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo nosso WhatsApp.',
  '#C9A227'
);

insert into public.categorias (id, nome, slug, descricao, ordem) values
  ('11111111-1111-1111-1111-111111111111', 'Camisetas Básicas Cotton Pima', 'camisetas-basicas-cotton-pima', 'Camisetas lisas de algodão Pima, macias e com ótimo caimento.', 1),
  ('22222222-2222-2222-2222-222222222222', 'Camisas Polo Piquet Duplo', 'camisas-polo-piquet-duplo', 'Polos lisas em malha piquet dupla, encorpadas e elegantes.', 2);

insert into public.produtos (id, nome, codigo_modelo, slug, descricao, composicao, categoria_id, destaque, ordem, estoque) values
  ('a0000000-0000-0000-0000-000000000001', 'Camiseta Pima Modelo 01', 'CP-01', 'camiseta-pima-modelo-01', 'Camiseta básica gola redonda, modelagem tradicional.', '100% algodão Pima', '11111111-1111-1111-1111-111111111111', true, 1, 500),
  ('a0000000-0000-0000-0000-000000000002', 'Camiseta Pima Modelo 02', 'CP-02', 'camiseta-pima-modelo-02', 'Camiseta básica gola redonda, modelagem slim.', '100% algodão Pima', '11111111-1111-1111-1111-111111111111', false, 2, 400),
  ('a0000000-0000-0000-0000-000000000003', 'Camiseta Pima Modelo 03', 'CP-03', 'camiseta-pima-modelo-03', 'Camiseta básica gola V, toque macio.', '100% algodão Pima', '11111111-1111-1111-1111-111111111111', false, 3, 300),
  ('a0000000-0000-0000-0000-000000000004', 'Camiseta Pima Modelo 04', 'CP-04', 'camiseta-pima-modelo-04', 'Camiseta básica oversized, ombro caído.', '100% algodão Pima', '11111111-1111-1111-1111-111111111111', false, 4, 250),
  ('b0000000-0000-0000-0000-000000000001', 'Polo Piquet Modelo 01', 'PP-01', 'polo-piquet-modelo-01', 'Camisa polo lisa, três botões, modelagem tradicional.', 'Malha piquet dupla, 100% algodão', '22222222-2222-2222-2222-222222222222', true, 1, 300),
  ('b0000000-0000-0000-0000-000000000002', 'Polo Piquet Modelo 02', 'PP-02', 'polo-piquet-modelo-02', 'Camisa polo lisa, modelagem slim.', 'Malha piquet dupla, 100% algodão', '22222222-2222-2222-2222-222222222222', false, 2, 250),
  ('b0000000-0000-0000-0000-000000000003', 'Polo Piquet Modelo 03', 'PP-03', 'polo-piquet-modelo-03', 'Camisa polo lisa com punho canelado.', 'Malha piquet dupla, 100% algodão', '22222222-2222-2222-2222-222222222222', false, 3, 200),
  ('b0000000-0000-0000-0000-000000000004', 'Polo Piquet Modelo 04', 'PP-04', 'polo-piquet-modelo-04', 'Camisa polo lisa com bolso.', 'Malha piquet dupla, 100% algodão', '22222222-2222-2222-2222-222222222222', false, 4, 150);

insert into public.produto_midias (produto_id, tipo, url, ordem, principal) values
  ('a0000000-0000-0000-0000-000000000001', 'foto', 'exemplos/camiseta-branca.webp', 0, true),
  ('a0000000-0000-0000-0000-000000000001', 'foto', 'exemplos/camisetas-pilha.webp', 1, false),
  ('a0000000-0000-0000-0000-000000000002', 'foto', 'exemplos/camisetas-pilha.webp', 0, true),
  ('a0000000-0000-0000-0000-000000000002', 'foto', 'exemplos/camiseta-branca.webp', 1, false),
  ('a0000000-0000-0000-0000-000000000003', 'foto', 'exemplos/camiseta-branca.webp', 0, true),
  ('a0000000-0000-0000-0000-000000000004', 'foto', 'exemplos/camisetas-pilha.webp', 0, true),
  ('b0000000-0000-0000-0000-000000000001', 'foto', 'exemplos/polo-marinho.webp', 0, true),
  ('b0000000-0000-0000-0000-000000000001', 'foto', 'exemplos/polos-pilha.webp', 1, false),
  ('b0000000-0000-0000-0000-000000000002', 'foto', 'exemplos/polos-pilha.webp', 0, true),
  ('b0000000-0000-0000-0000-000000000002', 'foto', 'exemplos/polo-marinho.webp', 1, false),
  ('b0000000-0000-0000-0000-000000000003', 'foto', 'exemplos/polo-marinho.webp', 0, true),
  ('b0000000-0000-0000-0000-000000000004', 'foto', 'exemplos/polos-pilha.webp', 0, true);

insert into public.faixas_preco (produto_id, quantidade_minima, preco_peca)
select p.id, f.q, round((case when p.codigo_modelo like 'CP-%' then f.base_c else f.base_p end + (right(p.codigo_modelo, 1)::int - 1) * 1.00)::numeric, 2)
from public.produtos p
cross join (values (10, 29.90, 49.90), (20, 27.90, 46.90), (30, 25.90, 43.90), (50, 23.90, 39.90)) as f(q, base_c, base_p);
