import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, CreditCard, Loader2, MessageCircle, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cart, useCart } from "@/lib/cart";
import { useSyncCart } from "@/lib/use-sync-cart";
import { calcularPedido, pecas } from "@/lib/pricing";
import { UFS, brl, faltamPecas, maskCep, maskCpf, maskPhone, onlyDigits } from "@/lib/format";
import { siteQuery } from "@/lib/catalog.functions";
import { criarPedido, pedidoSchema } from "@/lib/orders.functions";
import { configuracaoInfinitePay, criarCobrancaInfinitePay } from "@/lib/payments.functions";
import { simularFrete } from "@/lib/frete.functions";
import { formatarPrazoFrete, logoFrete, type FreteOpcao } from "@/lib/frete";
import { lerDadosEntrega, salvarDadosEntrega, salvarUltimoPedido } from "@/lib/checkout-storage";
import { tamanhosLinha } from "@/lib/whatsapp-message";
import { formatarCorTamanhos } from "@/lib/colors";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finalizar")({
  head: () => ({
    meta: [
      ...seo({ title: "Finalizar pedido | Líder Atacado", description: "Informe seus dados de entrega e escolha pagamento online ou atendimento pelo WhatsApp." }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinalizarPage,
});

type Form = {
  nome: string;
  cpf: string;
  email: string;
  whatsapp: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};
const VAZIO: Form = { nome: "", cpf: "", email: "", whatsapp: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };

type DestinatarioForm = {
  nome: string;
  cpf: string;
  whatsapp: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};
const VAZIO_DEST: DestinatarioForm = {
  nome: "",
  cpf: "",
  whatsapp: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  className?: string | undefined;
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
  const gerarCobranca = useServerFn(criarCobrancaInfinitePay);
  const simular = useServerFn(simularFrete);
  const { data: paymentConfig } = useQuery({
    queryKey: ["infinitepay", "config"],
    queryFn: () => configuracaoInfinitePay(),
    staleTime: 60_000,
  });

  const [formaPagamento, setFormaPagamento] = useState<"whatsapp" | "infinitepay">("whatsapp");
  const [f, setF] = useState<Form>(VAZIO);
  const [obs, setObs] = useState("");
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [isDropshipping, setIsDropshipping] = useState(false);
  const [dest, setDest] = useState<DestinatarioForm>(VAZIO_DEST);
  const [errosDest, setErrosDest] = useState<Partial<Record<keyof DestinatarioForm, string>>>({});
  const [buscandoDestCep, setBuscandoDestCep] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [opcoesFrete, setOpcoesFrete] = useState<FreteOpcao[] | null>(null);
  const [freteEscolhido, setFreteEscolhido] = useState<FreteOpcao | null>(null);
  const [carregandoFrete, setCarregandoFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState<string | null>(null);
  const [erroFreteValidacao, setErroFreteValidacao] = useState<string | null>(null);
  const numeroRef = useRef<HTMLInputElement>(null);
  const destNumeroRef = useRef<HTMLInputElement>(null);
  const lastCep = useRef("");
  const lastDestCep = useRef("");
  const checkoutKeyRef = useRef<string | null>(null);

  const cepEnvio = isDropshipping ? dest.cep : f.cep;

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
        nome: data?.nome || cur.nome || (user.user_metadata?.["full_name"] as string) || "",
        cpf: (data as any)?.cpf ? maskCpf(String((data as any).cpf)) : cur.cpf,
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

  const consultarFrete = async (cepMask: string) => {
    const cep = onlyDigits(cepMask);
    if (cep.length !== 8) {
      setOpcoesFrete(null);
      setFreteEscolhido(null);
      setErroFrete(null);
      return;
    }
    setCarregandoFrete(true);
    setErroFrete(null);
    setErroFreteValidacao(null);
    try {
      const res = await simular({
        data: {
          cepDestino: cep,
          itens: items.map((i) => ({ nome: i.nome, pecas: pecas(i.qtd) })),
        },
      });
      if (res.sucesso && res.opcoes.length > 0) {
        setOpcoesFrete(res.opcoes);
        setFreteEscolhido((cur) => {
          const primeiraOpcao = res.opcoes[0] ?? null;
          if (!cur) return primeiraOpcao;
          const found = res.opcoes.find((o) => o.id === cur.id || o.nome === cur.nome);
          return found ?? primeiraOpcao;
        });
      } else {
        setOpcoesFrete([]);
        setFreteEscolhido(null);
        setErroFrete(res.mensagem || "Não foi possível calcular o frete para este CEP.");
      }
    } catch (e) {
      setOpcoesFrete([]);
      setFreteEscolhido(null);
      setErroFrete(e instanceof Error ? e.message : "Erro ao consultar frete.");
    } finally {
      setCarregandoFrete(false);
    }
  };

  useEffect(() => {
    const cep = onlyDigits(cepEnvio);
    if (cep.length === 8) {
      consultarFrete(cep);
    } else {
      setOpcoesFrete(null);
      setFreteEscolhido(null);
    }
  }, [cepEnvio, items.length]);

  const set = (k: keyof Form) => (v: string) => {
    setF((cur) => ({ ...cur, [k]: v }));
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }));
  };

  const setD = (k: keyof DestinatarioForm) => (v: string) => {
    setDest((cur) => ({ ...cur, [k]: v }));
    if (errosDest[k]) setErrosDest((e) => ({ ...e, [k]: undefined }));
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

  async function buscarDestCep(cepMask: string) {
    const cep = onlyDigits(cepMask);
    if (cep.length !== 8 || cep === lastDestCep.current) return;
    lastDestCep.current = cep;
    setBuscandoDestCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = (await r.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (j.erro) {
        setErrosDest((e) => ({ ...e, cep: "CEP não encontrado. Preencha o endereço manualmente." }));
        return;
      }
      setDest((cur) => ({
        ...cur,
        rua: j.logradouro || cur.rua,
        bairro: j.bairro || cur.bairro,
        cidade: j.localidade || cur.cidade,
        estado: j.uf || cur.estado,
      }));
      setTimeout(() => destNumeroRef.current?.focus(), 50);
    } catch {
      /* offline: manual entry */
    } finally {
      setBuscandoDestCep(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || !resumo.podeFinalizar) return;

    if (!freteEscolhido) {
      const cep = onlyDigits(cepEnvio);
      if (cep.length !== 8) {
        if (isDropshipping) {
          setErrosDest((e) => ({ ...e, cep: "Informe o CEP do destinatário para calcular o frete." }));
          toast.error("Informe o CEP do destinatário para calcular o frete.");
          document.getElementById("f-dest-cep")?.focus();
        } else {
          setErros((e) => ({ ...e, cep: "Informe seu CEP para calcular o frete." }));
          toast.error("Informe o CEP de entrega para calcular e selecionar o frete.");
          document.getElementById("f-cep")?.focus();
        }
        return;
      }
      setErroFreteValidacao("Selecione obrigatoriamente uma opção de frete (PAC ou SEDEX) para envio do seu pedido.");
      toast.error("Escolha uma opção de frete para continuar.");
      document.getElementById("secao-frete")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (isDropshipping) {
      const errsD: Partial<Record<keyof DestinatarioForm, string>> = {};
      if (!dest.nome.trim() || dest.nome.trim().length < 2) errsD.nome = "Informe o nome do destinatário";
      if (onlyDigits(dest.cep).length !== 8) errsD.cep = "CEP do destinatário inválido";
      if (!dest.rua.trim()) errsD.rua = "Informe a rua de entrega";
      if (!dest.numero.trim()) errsD.numero = "Informe o número";
      if (!dest.bairro.trim()) errsD.bairro = "Informe o bairro";
      if (!dest.cidade.trim()) errsD.cidade = "Informe a cidade";
      if (!dest.estado.trim()) errsD.estado = "Informe a UF";

      if (Object.keys(errsD).length > 0) {
        setErrosDest(errsD);
        toast.error("Preencha todos os campos obrigatórios do destinatário.");
        const first = Object.keys(errsD)[0];
        if (first) document.getElementById(`f-dest-${first}`)?.focus();
        return;
      }
    }

    const checkoutKey = checkoutKeyRef.current ??= crypto.randomUUID();
    const payload = {
      idempotencyKey: checkoutKey,
      formaPagamento,
      cliente: { ...f },
      frete: {
        servico: `${freteEscolhido.nome} (${freteEscolhido.transportadora})`,
        preco: freteEscolhido.preco,
        prazo: formatarPrazoFrete(freteEscolhido.prazoDias),
      },
      dropshipping: isDropshipping
        ? {
            destinatarioNome: dest.nome.trim(),
            destinatarioCpf: dest.cpf ? onlyDigits(dest.cpf) : undefined,
            destinatarioWhatsapp: dest.whatsapp ? onlyDigits(dest.whatsapp) : undefined,
            cep: onlyDigits(dest.cep),
            rua: dest.rua.trim(),
            numero: dest.numero.trim(),
            complemento: dest.complemento.trim(),
            bairro: dest.bairro.trim(),
            cidade: dest.cidade.trim(),
            estado: dest.estado.trim().toUpperCase(),
          }
        : undefined,
      substituicaoCores: "sortidas",
      observacao: obs,
      itens: items.map((i) => ({ produtoId: i.produtoId, qtd: i.qtd, cores: i.cores, observacao: i.observacao })),
    };
    const parsed = pedidoSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Partial<Record<keyof Form, string>> = {};
      const errsD: Partial<Record<keyof DestinatarioForm, string>> = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "cliente") errs[issue.path[1] as keyof Form] ??= issue.message;
        if (issue.path[0] === "dropshipping") {
          const k = issue.path[1] as string;
          if (k === "destinatarioNome") errsD.nome = issue.message;
          else if (k === "destinatarioCpf") errsD.cpf = issue.message;
          else if (k === "destinatarioWhatsapp") errsD.whatsapp = issue.message;
          else errsD[k as keyof DestinatarioForm] ??= issue.message;
        }
        if (issue.path[0] === "frete") setErroFreteValidacao(issue.message);
      }
      setErros(errs);
      if (Object.keys(errsD).length > 0) setErrosDest(errsD);
      const first = Object.keys(errs)[0];
      if (first) document.getElementById(`f-${first}`)?.focus();
      return;
    }
    // Open the WhatsApp tab during the tap so browsers don't block it.
    const win = parsed.data.formaPagamento === "whatsapp" ? window.open("", "_blank") : null;
    setEnviando(true);
    try {
      const res = await enviar({ data: parsed.data });
      salvarDadosEntrega({ ...f });
      salvarUltimoPedido(res);

      if (res.formaPagamento === "infinitepay") {
        const cobranca = await gerarCobranca({ data: { pedidoId: res.id, checkoutKey: res.checkoutKey } });
        cart.clear();
        if (cobranca.paymentUrl) {
          window.location.assign(cobranca.paymentUrl);
        } else {
          navigate({ to: "/pagamento/retorno", search: { order_nsu: res.id } });
        }
        return;
      }

      analytics.clickWhatsApp("finalizar", {
        numero: res.numero,
        totalPecas: resumo.totalPecas,
        total: resumo.total + (freteEscolhido?.preco ?? 0),
      });
      analytics.purchase({
        numero: res.numero,
        total: resumo.total + (freteEscolhido?.preco ?? 0),
        frete: freteEscolhido?.preco ?? 0,
        totalPecas: resumo.totalPecas,
        itens: resumo.itens.map((i) => ({
          nome: i.nome,
          pecas: i.pecas,
          valor: i.valor,
        })),
      });
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
        <h1 className="text-2xl font-bold">{items.length === 0 ? "Seu pedido está vazio" : faltamPecas(resumo.faltamMinimo)}</h1>
        <p className="mt-2 text-muted-foreground">O pedido mínimo é de {minimo} peças no total.</p>
        <Button asChild className="mt-6">
          <Link to={items.length ? "/carrinho" : "/"}>{items.length ? "Voltar ao pedido" : "Ver produtos"}</Link>
        </Button>
      </div>
    );
  }

  const inv = (k: keyof Form) => ({ "aria-invalid": !!erros[k], "aria-describedby": erros[k] ? `f-${k}-erro` : undefined });
  const invD = (k: keyof DestinatarioForm) => ({ "aria-invalid": !!errosDest[k], "aria-describedby": errosDest[k] ? `f-dest-${k}-erro` : undefined });

  return (
    <div className="container-page pt-4 md:pt-8">
      <Link to="/carrinho" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-5" /> Voltar ao pedido
      </Link>
      <h1 className="mt-1 text-3xl font-extrabold">Finalizar pedido</h1>
      <p className="mt-1 text-muted-foreground">Escolha pagamento online ou conclua o pedido pelo WhatsApp.</p>
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
            <Field id="f-cpf" label="CPF (para Correios e envio)" error={erros.cpf}>
              <Input
                id="f-cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                maxLength={14}
                enterKeyHint="next"
                value={f.cpf}
                onChange={(e) => set("cpf")(maskCpf(e.target.value))}
                {...inv("cpf")}
              />
            </Field>
            <Field id="f-whatsapp" label="WhatsApp com DDD" error={erros.whatsapp}>
              <Input id="f-whatsapp" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(66) 99999-9999" enterKeyHint="next" value={f.whatsapp} onChange={(e) => set("whatsapp")(maskPhone(e.target.value))} {...inv("whatsapp")} />
            </Field>
            <Field id="f-email" label="E-mail" error={erros.email} className="sm:col-span-2">
              <Input id="f-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next" value={f.email} onChange={(e) => set("email")(e.target.value.trim())} {...inv("email")} />
            </Field>
          </fieldset>

          <fieldset className="grid grid-cols-6 gap-4">
            <legend className="mb-3 font-display text-lg font-bold">
              {isDropshipping ? "Seu endereço (Revendedor)" : "Endereço de entrega"}
            </legend>
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

          {/* Opção Dropshipping */}
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 sm:p-5 transition hover:border-primary/40">
            <label className="flex cursor-pointer items-start gap-3.5 select-none">
              <input
                type="checkbox"
                checked={isDropshipping}
                onChange={(e) => {
                  const check = e.target.checked;
                  setIsDropshipping(check);
                  setErroFreteValidacao(null);
                  if (!check) {
                    setErrosDest({});
                  }
                }}
                className="mt-1 size-5 rounded border-input text-primary focus:ring-primary shrink-0"
              />
              <div className="space-y-1">
                <p className="font-display text-base font-bold text-foreground">
                  📦 Enviar para outro endereço (Dropshipping)
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Marque esta opção se você estiver revendendo e desejar que o pedido seja despachado diretamente para o seu cliente final. O frete e a etiqueta dos Correios serão gerados com os dados do destinatário.
                </p>
              </div>
            </label>
          </div>

          {/* Dados do Destinatário (quando dropshipping estiver ativo) */}
          {isDropshipping && (
            <fieldset className="grid grid-cols-6 gap-4 rounded-2xl border-2 border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 p-4 sm:p-5 shadow-sm">
              <div className="col-span-6 flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 dark:border-blue-900 pb-3">
                <legend className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Destinatário final (Cliente Drop)</span>
                </legend>
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  Etiqueta de Envio
                </span>
              </div>

              <Field id="f-dest-nome" label="Nome do destinatário" error={errosDest.nome} className="col-span-6 sm:col-span-3">
                <Input
                  id="f-dest-nome"
                  autoComplete="name"
                  autoCapitalize="words"
                  placeholder="Nome de quem vai receber o pacote"
                  value={dest.nome}
                  onChange={(e) => setD("nome")(e.target.value)}
                  {...invD("nome")}
                />
              </Field>

              <Field id="f-dest-cpf" label="CPF do destinatário (para Correios)" error={errosDest.cpf} className="col-span-6 sm:col-span-3">
                <Input
                  id="f-dest-cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00 (Opcional)"
                  maxLength={14}
                  value={dest.cpf}
                  onChange={(e) => setD("cpf")(maskCpf(e.target.value))}
                  {...invD("cpf")}
                />
              </Field>

              <Field id="f-dest-whatsapp" label="WhatsApp do destinatário (opcional)" error={errosDest.whatsapp} className="col-span-6 sm:col-span-3">
                <Input
                  id="f-dest-whatsapp"
                  type="tel"
                  inputMode="tel"
                  placeholder="(00) 00000-0000"
                  value={dest.whatsapp}
                  onChange={(e) => setD("whatsapp")(maskPhone(e.target.value))}
                  {...invD("whatsapp")}
                />
              </Field>

              <Field id="f-dest-cep" label="CEP de entrega do destinatário" error={errosDest.cep} className="col-span-6 sm:col-span-3">
                <div className="relative">
                  <Input
                    id="f-dest-cep"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    value={dest.cep}
                    onChange={(e) => {
                      const v = maskCep(e.target.value);
                      setD("cep")(v);
                      if (onlyDigits(v).length === 8) buscarDestCep(v);
                    }}
                    {...invD("cep")}
                  />
                  {buscandoDestCep && <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
              </Field>

              <Field id="f-dest-rua" label="Rua / Logradouro" error={errosDest.rua} className="col-span-6">
                <Input
                  id="f-dest-rua"
                  placeholder="Nome da rua ou avenida"
                  value={dest.rua}
                  onChange={(e) => setD("rua")(e.target.value)}
                  {...invD("rua")}
                />
              </Field>

              <Field id="f-dest-numero" label="Número" error={errosDest.numero} className="col-span-2">
                <Input
                  id="f-dest-numero"
                  ref={destNumeroRef}
                  placeholder="Ex: 120"
                  value={dest.numero}
                  onChange={(e) => setD("numero")(e.target.value)}
                  {...invD("numero")}
                />
              </Field>

              <Field id="f-dest-complemento" label="Complemento" className="col-span-4">
                <Input
                  id="f-dest-complemento"
                  placeholder="Apto, Bloco, etc. (opcional)"
                  value={dest.complemento}
                  onChange={(e) => setD("complemento")(e.target.value)}
                />
              </Field>

              <Field id="f-dest-bairro" label="Bairro" error={errosDest.bairro} className="col-span-6">
                <Input
                  id="f-dest-bairro"
                  value={dest.bairro}
                  onChange={(e) => setD("bairro")(e.target.value)}
                  {...invD("bairro")}
                />
              </Field>

              <Field id="f-dest-cidade" label="Cidade" error={errosDest.cidade} className="col-span-4">
                <Input
                  id="f-dest-cidade"
                  value={dest.cidade}
                  onChange={(e) => setD("cidade")(e.target.value)}
                  {...invD("cidade")}
                />
              </Field>

              <Field id="f-dest-estado" label="UF" error={errosDest.estado} className="col-span-2">
                <select
                  id="f-dest-estado"
                  value={dest.estado}
                  onChange={(e) => setD("estado")(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
                  {...invD("estado")}
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
          )}

          <fieldset id="secao-frete" className="rounded-2xl border bg-card p-4 sm:p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <legend className="flex items-center gap-2 font-display text-lg font-bold">
                <span>Opção de envio / Frete</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  Obrigatório
                </span>
              </legend>
              {onlyDigits(cepEnvio).length === 8 && !carregandoFrete && (
                <button
                  type="button"
                  onClick={() => consultarFrete(cepEnvio)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="size-3" /> Recalcular frete
                </button>
              )}
            </div>

            {onlyDigits(cepEnvio).length !== 8 && (
              <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                <Truck className="mx-auto mb-1.5 size-5 opacity-60" />
                {isDropshipping
                  ? "Informe o CEP do destinatário acima para calcular o frete dos Correios."
                  : "Informe o seu CEP acima para calcular o frete e os prazos dos Correios (PAC / SEDEX)."}
              </div>
            )}

            {carregandoFrete && (
              <div className="flex items-center justify-center gap-2 rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span>Calculando frete com os Correios...</span>
              </div>
            )}

            {!carregandoFrete && erroFrete && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">Não foi possível calcular o frete</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{erroFrete}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => consultarFrete(cepEnvio)}
                    className="h-8 text-xs shrink-0"
                  >
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}

            {!carregandoFrete && opcoesFrete && opcoesFrete.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground">
                  Selecione uma opção de frete obrigatória para envio{" "}
                  {isDropshipping ? (
                    <strong className="text-foreground">para {dest.cidade || "o destinatário"}/{dest.estado} (CEP {maskCep(dest.cep)})</strong>
                  ) : (
                    <strong className="text-foreground">para {f.cidade || "seu endereço"}/{f.estado} (CEP {maskCep(f.cep)})</strong>
                  )}:
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {opcoesFrete.map((op) => {
                    const selecionado = freteEscolhido?.id === op.id || freteEscolhido?.nome === op.nome;
                    const icone = op.icone || logoFrete(op.nome);
                    return (
                      <button
                        key={op.id || op.nome}
                        type="button"
                        onClick={() => {
                          setFreteEscolhido(op);
                          setErroFreteValidacao(null);
                        }}
                        className={cn(
                          "relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
                          selecionado
                            ? "border-primary bg-primary/5 ring-2 ring-primary shadow-xs"
                            : "bg-card hover:border-foreground/30 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            {icone ? (
                              <img
                                src={icone}
                                alt={op.nome}
                                className="size-9 rounded-full object-contain shrink-0 shadow-xs mt-0.5"
                              />
                            ) : (
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-xs text-primary mt-0.5">
                                {op.nome.slice(0, 3)}
                              </span>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground text-sm">{op.nome}</span>
                                <span className="text-[11px] text-muted-foreground font-medium">({op.transportadora})</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatarPrazoFrete(op.prazoDias)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-base font-bold text-foreground tabular-nums">
                              {brl(op.preco)}
                            </span>
                          </div>
                        </div>
                        {selecionado && (
                          <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-primary">
                            <CheckCircle2 className="size-3.5" /> Selecionado
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {erroFreteValidacao && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{erroFreteValidacao}</span>
              </div>
            )}
          </fieldset>

          <div>
            <label htmlFor="f-obs" className="mb-1.5 block font-display text-lg font-bold">
              Observação geral do pedido <span className="font-sans text-base font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Textarea id="f-obs" maxLength={500} rows={4} value={obs} onChange={(e) => setObs(e.target.value.slice(0, 500))} placeholder="Ex.: horário para entrega, transportadora de preferência" />
            <p className="mt-1 text-right text-sm text-muted-foreground">{obs.length}/500</p>
          </div>

          <fieldset className="rounded-2xl border bg-card p-4 sm:p-5">
            <legend className="mb-3 font-display text-lg font-bold">Forma de pagamento</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="infinitepay"
                aria-pressed={formaPagamento === "infinitepay"}
                disabled={paymentConfig?.available !== true}
                onClick={() => setFormaPagamento("infinitepay")}
                className={cn(
                  "h-auto min-h-24 flex-col items-start gap-0 whitespace-normal rounded-xl border border-infinitepay p-4 text-left transition",
                  formaPagamento === "infinitepay" && "ring-2 ring-infinitepay ring-offset-2 ring-offset-background",
                  paymentConfig?.available !== true && "cursor-not-allowed opacity-60",
                )}
              >
                <span className="flex items-center gap-2 font-bold"><CreditCard className="size-5" /> Pagar online</span>
                <span className="mt-1 block text-base font-normal">Pix ou cartão pela InfinitePay</span>
                {paymentConfig?.available !== true && <span className="mt-1 block text-xs font-medium">Configuração pendente</span>}
              </Button>
              <button
                type="button"
                aria-pressed={formaPagamento === "whatsapp"}
                onClick={() => setFormaPagamento("whatsapp")}
                className={cn(
                  "min-h-24 rounded-xl border p-4 text-left transition",
                  formaPagamento === "whatsapp" ? "border-primary bg-primary/5 ring-2 ring-primary" : "bg-card hover:border-foreground/30",
                )}
              >
                <span className="flex items-center gap-2 font-bold"><MessageCircle className="size-5" /> Combinar pelo WhatsApp</span>
                <span className="mt-1 block text-sm text-muted-foreground">Nossa equipe informa as opções de pagamento</span>
              </button>
            </div>
            {formaPagamento === "infinitepay" && (
              <p className="mt-3 text-sm text-muted-foreground">Você será direcionado ao ambiente seguro da InfinitePay. O pedido só será marcado como pago após confirmação.</p>
            )}
          </fieldset>

          <div className="pt-2">
            <Button
              type="submit"
              variant={formaPagamento === "infinitepay" ? "infinitepay" : "default"}
              size="lg"
              className="w-full h-12 text-base font-semibold shadow-sm"
              disabled={enviando}
            >
              {enviando ? <Loader2 className="mr-2 size-5 animate-spin" /> : formaPagamento === "infinitepay" ? <CreditCard className="mr-2 size-5" /> : <MessageCircle className="mr-2 size-5" />}
              {enviando ? "Registrando pedido..." : formaPagamento === "infinitepay" ? "Ir para o pagamento" : "Enviar pedido via WhatsApp"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {formaPagamento === "infinitepay" ? "O valor é conferido no servidor antes de gerar a cobrança." : "Seu pedido será registrado com segurança e nossa equipe confirmará no WhatsApp."}
            </p>
          </div>
        </form>

        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="font-sans text-lg font-bold tracking-normal">Resumo do pedido</h2>
          <ul className="mt-3 divide-y">
            {resumo.itens.map((i) => {
              const it = items.find((x) => x.produtoId === i.produtoId);
              return (
                <li key={i.produtoId} className="py-2.5 text-[15px]">
                  <p className="font-semibold">{i.nome}</p>
                  {it?.cores && it.cores.length > 0 ? (
                    <div className="my-1 space-y-0.5 text-xs text-muted-foreground">
                      {it.cores.map((c) => (
                        <p key={c.cor}>{formatarCorTamanhos(c.cor, c.qtd)}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{tamanhosLinha(i.qtd)}</p>
                  )}
                  <p className="tabular-nums">
                    {i.pecas} × {brl(i.preco)} = <strong>{brl(i.valor)}</strong>
                  </p>
                </li>
              );
            })}
          </ul>
          <dl className="mt-2 space-y-1.5 border-t pt-3">
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Total de peças</dt>
              <dd className="font-semibold tabular-nums">{resumo.totalPecas}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Faixa aplicada</dt>
              <dd className="font-semibold">a partir de {resumo.faixa} peças</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Total dos produtos</dt>
              <dd className="font-semibold tabular-nums">{brl(resumo.total)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">
                Frete {freteEscolhido ? `(${freteEscolhido.nome})` : ""}
              </dt>
              <dd className={cn("font-semibold tabular-nums", !freteEscolhido && "text-xs text-muted-foreground")}>
                {freteEscolhido ? brl(freteEscolhido.preco) : "Selecione o frete"}
              </dd>
            </div>
            <div className="flex justify-between text-lg border-t border-border pt-2.5">
              <dt className="font-bold">Total do pedido</dt>
              <dd className="font-extrabold text-foreground tabular-nums">
                {brl(resumo.total + (freteEscolhido?.preco ?? 0))}
              </dd>
            </div>
          </dl>
          {freteEscolhido ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {logoFrete(freteEscolhido.nome) ? (
                <img
                  src={logoFrete(freteEscolhido.nome)!}
                  alt={freteEscolhido.nome}
                  className="size-4 rounded-full object-contain shrink-0"
                />
              ) : (
                <span>📦</span>
              )}
              <span>
                Envio via {freteEscolhido.nome} · {formatarPrazoFrete(freteEscolhido.prazoDias)}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Escolha o frete acima para concluir
            </p>
          )}

          <Button
            type="submit"
            form="form-pedido"
            variant={formaPagamento === "infinitepay" ? "infinitepay" : "default"}
            size="lg"
            className="mt-5 w-full h-12 text-base font-semibold shadow-sm"
            disabled={enviando}
          >
            {enviando ? <Loader2 className="mr-2 size-5 animate-spin" /> : formaPagamento === "infinitepay" ? <CreditCard className="mr-2 size-5" /> : <MessageCircle className="mr-2 size-5" />}
            {enviando ? "Registrando pedido..." : formaPagamento === "infinitepay" ? "Ir para o pagamento" : "Enviar pedido"}
          </Button>
        </aside>
      </div>
    </div>
  );
}
