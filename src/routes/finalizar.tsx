import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StickyBar } from "@/components/store/sticky-bar";
import { cart, useCart } from "@/lib/cart";
import { useSyncCart } from "@/lib/use-sync-cart";
import { calcularPedido } from "@/lib/pricing";
import { UFS, brl, maskCep, maskPhone, onlyDigits } from "@/lib/format";
import { siteQuery } from "@/lib/catalog.functions";
import { criarPedido, pedidoSchema } from "@/lib/orders.functions";
import { lerDadosEntrega, salvarDadosEntrega, salvarUltimoPedido } from "@/lib/checkout-storage";
import { tamanhosLinha } from "@/lib/whatsapp-message";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finalizar")({
  head: () => ({
    meta: [
      ...seo({ title: "Finalizar pedido | Líder Atacado", description: "Informe seus dados de entrega e envie o pedido pelo WhatsApp." }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinalizarPage,
});

type Form = {
  email: string;
  whatsapp: string;
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};
const VAZIO: Form = { email: "", whatsapp: "", nome: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-erro`} className="mt-1 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function FinalizarPage() {
  const items = useCart();
  useSyncCart(items);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: site } = useQuery(siteQuery());
  const minimo = site?.config?.pedido_minimo ?? 10;
  const resumo = calcularPedido(items, minimo);
  const enviar = useServerFn(criarPedido);

  const [f, setF] = useState<Form>(VAZIO);
  const [obs, setObs] = useState("");
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [enviando, setEnviando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const numeroRef = useRef<HTMLInputElement>(null);
  const lastCep = useRef("");

  // Prefill: saved delivery data, then the signed-in customer's record.
  useEffect(() => {
    const salvo = lerDadosEntrega();
    if (salvo) setF((cur) => ({ ...cur, ...salvo }));
  }, []);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("clientes").select("*").eq("user_id", user.id).maybeSingle();
      setF((cur) => ({
        ...cur,
        email: data?.email || cur.email || user.email || "",
        nome: data?.nome || cur.nome || (user.user_metadata?.full_name as string) || "",
        ...(data
          ? {
              whatsapp: maskPhone(data.whatsapp),
              cep: maskCep(data.cep),
              rua: data.rua,
              numero: data.numero,
              complemento: data.complemento,
              bairro: data.bairro,
              cidade: data.cidade,
              estado: data.estado,
            }
          : {}),
      }));
    })();
  }, [user]);

  const set = (k: keyof Form) => (v: string) => {
    setF((cur) => ({ ...cur, [k]: v }));
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }));
  };

  async function buscarCep(cepMask: string) {
    const cep = onlyDigits(cepMask);
    if (cep.length !== 8 || cep === lastCep.current) return;
    lastCep.current = cep;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = (await r.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (j.erro) {
        setErros((e) => ({ ...e, cep: "CEP não encontrado. Preencha o endereço manualmente." }));
        return;
      }
      setF((cur) => ({
        ...cur,
        rua: j.logradouro || cur.rua,
        bairro: j.bairro || cur.bairro,
        cidade: j.localidade || cur.cidade,
        estado: j.uf || cur.estado,
      }));
      setTimeout(() => numeroRef.current?.focus(), 50);
    } catch {
      /* offline: manual entry */
    } finally {
      setBuscandoCep(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || !resumo.podeFinalizar) return;
    const payload = {
      cliente: { ...f },
      observacao: obs,
      itens: items.map((i) => ({ produtoId: i.produtoId, qtd: i.qtd, observacao: i.observacao })),
    };
    const parsed = pedidoSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Partial<Record<keyof Form, string>> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "cliente") errs[issue.path[1] as keyof Form] ??= issue.message;
      }
      setErros(errs);
      const first = Object.keys(errs)[0];
      if (first) document.getElementById(`f-${first}`)?.focus();
      return;
    }
    // Open the WhatsApp tab during the tap so browsers don't block it.
    const win = window.open("", "_blank");
    setEnviando(true);
    try {
      const res = await enviar({ data: payload });
      salvarDadosEntrega({ ...f });
      salvarUltimoPedido(res);
      cart.clear();
      if (win) win.location.href = res.waUrl;
      navigate({ to: "/pedido-confirmado" });
    } catch (err) {
      win?.close();
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (items.length === 0 || !resumo.podeFinalizar) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">{items.length === 0 ? "Seu pedido está vazio" : `Faltam ${resumo.faltamMinimo} peças`}</h1>
        <p className="mt-2 text-muted-foreground">O pedido mínimo é de {minimo} peças no total.</p>
        <Button asChild className="mt-6">
          <Link to={items.length ? "/carrinho" : "/"}>{items.length ? "Voltar ao pedido" : "Ver produtos"}</Link>
        </Button>
      </div>
    );
  }

  const inv = (k: keyof Form) => ({ "aria-invalid": !!erros[k], "aria-describedby": erros[k] ? `f-${k}-erro` : undefined });

  return (
    <div className="container-page pb-bar pt-4 md:pt-8">
      <Link to="/carrinho" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-5" /> Voltar ao pedido
      </Link>
      <h1 className="mt-1 text-3xl font-extrabold">Finalizar pedido</h1>
      <p className="mt-1 text-muted-foreground">Sem pagamento no site. Seu pedido será enviado pelo WhatsApp.</p>
      {!user && (
        <p className="mt-3 text-sm text-muted-foreground">
          Já comprou antes?{" "}
          <Link to="/auth" className="font-semibold text-gold-ink underline-offset-4 hover:underline">
            Entre
          </Link>{" "}
          para preencher seus dados. Não é obrigatório.
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <form id="form-pedido" onSubmit={onSubmit} noValidate className="space-y-8">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-display text-lg font-bold">Seus dados</legend>
            <Field id="f-nome" label="Nome completo" error={erros.nome} className="sm:col-span-2">
              <Input id="f-nome" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={f.nome} onChange={(e) => set("nome")(e.target.value)} {...inv("nome")} />
            </Field>
            <Field id="f-email" label="E-mail" error={erros.email}>
              <Input id="f-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next" value={f.email} onChange={(e) => set("email")(e.target.value.trim())} {...inv("email")} />
            </Field>
            <Field id="f-whatsapp" label="WhatsApp com DDD" error={erros.whatsapp}>
              <Input id="f-whatsapp" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(66) 99999-9999" enterKeyHint="next" value={f.whatsapp} onChange={(e) => set("whatsapp")(maskPhone(e.target.value))} {...inv("whatsapp")} />
            </Field>
          </fieldset>

          <fieldset className="grid grid-cols-6 gap-4">
            <legend className="mb-3 font-display text-lg font-bold">Endereço de entrega</legend>
            <Field id="f-cep" label="CEP" error={erros.cep} className="col-span-6 sm:col-span-3">
              <div className="relative">
                <Input
                  id="f-cep"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  enterKeyHint="next"
                  value={f.cep}
                  onChange={(e) => {
                    const v = maskCep(e.target.value);
                    set("cep")(v);
                    if (onlyDigits(v).length === 8) buscarCep(v);
                  }}
                  {...inv("cep")}
                />
                {buscandoCep && <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
            </Field>
            <p className="col-span-6 -mt-2 text-sm text-muted-foreground sm:col-span-3 sm:mt-9">O endereço é preenchido pelo CEP. Você pode editar.</p>
            <Field id="f-rua" label="Rua" error={erros.rua} className="col-span-6">
              <Input id="f-rua" autoComplete="address-line1" enterKeyHint="next" value={f.rua} onChange={(e) => set("rua")(e.target.value)} {...inv("rua")} />
            </Field>
            <Field id="f-numero" label="Número" error={erros.numero} className="col-span-2">
              <Input id="f-numero" ref={numeroRef} inputMode="text" autoComplete="address-line2" enterKeyHint="next" value={f.numero} onChange={(e) => set("numero")(e.target.value)} {...inv("numero")} />
            </Field>
            <Field id="f-complemento" label="Complemento" className="col-span-4">
              <Input id="f-complemento" placeholder="Opcional" enterKeyHint="next" value={f.complemento} onChange={(e) => set("complemento")(e.target.value)} />
            </Field>
            <Field id="f-bairro" label="Bairro" error={erros.bairro} className="col-span-6">
              <Input id="f-bairro" enterKeyHint="next" value={f.bairro} onChange={(e) => set("bairro")(e.target.value)} {...inv("bairro")} />
            </Field>
            <Field id="f-cidade" label="Cidade" error={erros.cidade} className="col-span-4">
              <Input id="f-cidade" autoComplete="address-level2" enterKeyHint="next" value={f.cidade} onChange={(e) => set("cidade")(e.target.value)} {...inv("cidade")} />
            </Field>
            <Field id="f-estado" label="UF" error={erros.estado} className="col-span-2">
              <select
                id="f-estado"
                autoComplete="address-level1"
                value={f.estado}
                onChange={(e) => set("estado")(e.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
                {...inv("estado")}
              >
                <option value="">--</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </fieldset>

          <div>
            <label htmlFor="f-obs" className="mb-1.5 block font-display text-lg font-bold">
              Observação geral do pedido <span className="font-sans text-base font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Textarea id="f-obs" maxLength={500} rows={4} value={obs} onChange={(e) => setObs(e.target.value.slice(0, 500))} placeholder="Ex.: horário para entrega, transportadora de preferência" />
            <p className="mt-1 text-right text-sm text-muted-foreground">{obs.length}/500</p>
          </div>
        </form>

        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="font-sans text-lg font-bold tracking-normal">Resumo do pedido</h2>
          <ul className="mt-3 divide-y">
            {resumo.itens.map((i) => (
              <li key={i.produtoId} className="py-2.5 text-[15px]">
                <p className="font-semibold">{i.nome}</p>
                <p className="text-muted-foreground">{tamanhosLinha(i.qtd)}</p>
                <p className="tabular-nums">
                  {i.pecas} × {brl(i.preco)} = <strong>{brl(i.valor)}</strong>
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-1.5 border-t pt-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total de peças</dt>
              <dd className="font-semibold tabular-nums">{resumo.totalPecas}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Faixa aplicada</dt>
              <dd className="font-semibold">a partir de {resumo.faixa} peças</dd>
            </div>
            <div className="flex justify-between text-lg">
              <dt className="font-semibold">Total dos produtos</dt>
              <dd className="font-bold tabular-nums">{brl(resumo.total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-sm text-muted-foreground">Frete e pagamento: a combinar.</p>
        </aside>
      </div>

      <StickyBar>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-lg font-bold tabular-nums">{brl(resumo.total)}</p>
          <p className="truncate text-sm text-muted-foreground">{resumo.totalPecas} peças</p>
        </div>
        <Button type="submit" form="form-pedido" size="lg" className="shrink-0" disabled={enviando}>
          {enviando ? <Loader2 className="animate-spin" /> : <MessageCircle />}
          {enviando ? "Enviando..." : "Enviar pedido"}
        </Button>
      </StickyBar>
    </div>
  );
}
