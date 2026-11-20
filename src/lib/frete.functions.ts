import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { onlyDigits } from "./format";
import {
  calcularDimensoesPacote,
  calcularPesoTotalKg,
  criarOpcaoEtiquetaFixa,
  logoFrete,
  type FreteOpcao,
  type SimulacaoFreteResultado,
} from "./frete";

const itemSchema = z.object({
  nome: z.string().trim().min(1),
  pecas: z.number().int().min(1).max(10000),
});

export const simularFreteSchema = z.object({
  cepDestino: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 8, "CEP de destino inválido"),
  itens: z.array(itemSchema).min(1, "Informe ao menos 1 item para calcular o frete"),
});

export type SimularFreteInput = z.input<typeof simularFreteSchema>;

export const simularFrete = createServerFn({ method: "POST" })
  .validator((d: SimularFreteInput) => simularFreteSchema.parse(d))
  .handler(async ({ data }): Promise<SimulacaoFreteResultado> => {
    let token = process.env["SUPERFRETE_TOKEN"] ?? "";
    let cepOrigem = onlyDigits(process.env["SUPERFRETE_CEP_ORIGEM"] ?? "78464222") || "78464222";

    // Se o token não estiver nas variáveis de ambiente, tenta ler da tabela de configurações
    if (!token) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: config } = await supabaseAdmin
          .from("configuracoes")
          .select("menu_links")
          .eq("id", 1)
          .maybeSingle();

        if (config?.menu_links && typeof config.menu_links === "object" && !Array.isArray(config.menu_links)) {
          const sf = (config.menu_links as Record<string, unknown>)["superfrete"] as
            | { token?: string; cep_origem?: string }
            | undefined;
          if (sf?.token) token = sf.token;
          if (sf?.cep_origem) cepOrigem = onlyDigits(sf.cep_origem) || cepOrigem;
        }
      } catch {
        /* fallback */
      }
    }

    const totalPecas = data.itens.reduce((s, it) => s + it.pecas, 0);
    const pesoKg = calcularPesoTotalKg(data.itens);
    const pacote = calcularDimensoesPacote(totalPecas);

    if (!token) {
      return {
        sucesso: false,
        cepOrigem,
        cepDestino: data.cepDestino,
        pesoKg,
        totalPecas,
        opcoes: [],
        mensagem: "Cálculo de frete temporariamente indisponível. Combine o valor pelo WhatsApp.",
      };
    }

    try {
      const payload = {
        from: { postal_code: cepOrigem },
        to: { postal_code: data.cepDestino },
        services: "1,2",
        package: {
          height: pacote.altura,
          width: pacote.largura,
          length: pacote.comprimento,
          weight: pesoKg,
        },
      };

      const res = await fetch("https://api.superfrete.com/api/v0/calculator", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "User-Agent": "LiderAtacado/1.0 (contato@lideratacado.com.br)",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Não foi possível calcular o frete para este CEP.";
        try {
          const errJson = await res.json();
          if (errJson?.message) msg = errJson.message;
        } catch {
          /* ignore */
        }
        return {
          sucesso: false,
          cepOrigem,
          cepDestino: data.cepDestino,
          pesoKg,
          totalPecas,
          opcoes: [],
          mensagem: msg,
        };
      }

      const raw = await res.json();
      if (!Array.isArray(raw)) {
        return {
          sucesso: false,
          cepOrigem,
          cepDestino: data.cepDestino,
          pesoKg,
          totalPecas,
          opcoes: [],
          mensagem: "Resposta inválida da transportadora.",
        };
      }

      const opcoes: FreteOpcao[] = [];
      let sedexPrazo: number | undefined;

      for (const item of raw) {
        if (item.has_error || item.error || typeof item.price !== "number") continue;
        const nomeServico = String(item.name ?? "Correios");
        const prazo = Number(item.delivery_time ?? 0);
        if (nomeServico.toUpperCase().includes("SEDEX")) {
          sedexPrazo = prazo;
        }
        opcoes.push({
          id: Number(item.id),
          nome: nomeServico,
          transportadora: String(item.company?.name ?? "Correios"),
          preco: Number(item.price),
          prazoDias: prazo,
          desconto: item.discount ? String(item.discount) : undefined,
          icone: logoFrete(nomeServico) ?? item.company?.picture,
        });
      }

      // Adiciona sempre a opção Etiqueta Fixa Sedex (R$ 130,00)
      opcoes.push(criarOpcaoEtiquetaFixa(sedexPrazo));

      opcoes.sort((a, b) => a.preco - b.preco);

      return {
        sucesso: true,
        cepOrigem,
        cepDestino: data.cepDestino,
        pesoKg,
        totalPecas,
        opcoes,
      };
    } catch (err) {
      return {
        sucesso: true,
        cepOrigem,
        cepDestino: data.cepDestino,
        pesoKg,
        totalPecas,
        opcoes: [criarOpcaoEtiquetaFixa()],
      };
    }
  });
