import { useSuspenseQuery } from "@tanstack/react-query";
import { RichText } from "./rich-text";
import { siteQuery, type Config } from "@/lib/catalog.functions";

export type CampoTexto = keyof Pick<Config, "texto_sobre" | "texto_como_comprar" | "texto_faq" | "texto_trocas" | "texto_privacidade">;

export function InstitucionalPage({ titulo, campo }: { titulo: string; campo: CampoTexto }) {
  const { data } = useSuspenseQuery(siteQuery());
  const texto = data.config?.[campo] ?? "";
  return (
    <div className="container-page max-w-3xl py-8 md:py-14">
      <h1 className="text-3xl font-extrabold md:text-4xl">{titulo}</h1>
      <div className="mt-6">{texto ? <RichText text={texto} /> : <p className="text-muted-foreground">Conteúdo em breve.</p>}</div>
    </div>
  );
}
