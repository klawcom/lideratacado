import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { normalizeMenuLinks, type MenuLink } from "@/lib/menu-links";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminPage, FieldLabel, Loading, Panel, invalidateStore } from "@/components/admin/ui";
import { mediaUrl } from "@/lib/media";
import { resizeToWebp } from "@/lib/image-resize";
import { maskPhone, onlyDigits } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({ component: Config });

type Cfg = Tables<"configuracoes">;
const TEXTOS: { k: keyof Cfg; label: string }[] = [
  { k: "texto_sobre", label: "Sobre" },
  { k: "texto_como_comprar", label: "Como comprar" },
  { k: "texto_faq", label: "Dúvidas frequentes" },
  { k: "texto_trocas", label: "Trocas e devoluções" },
  { k: "texto_privacidade", label: "Política de privacidade (LGPD)" },
];

function Config() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState<Cfg | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [menu, setMenu] = useState<MenuLink[]>([]);
  const logoRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (data) {
      setF({ ...data, whatsapp: maskPhone(data.whatsapp.replace(/^55/, "")) });
      setMenu(normalizeMenuLinks(data.menu_links));
    }
  }, [data]);

  if (isLoading || !f) return <AdminPage title="Configurações"><Loading /></AdminPage>;
  const set = (k: keyof Cfg, v: string | number | null) => setF((x) => (x ? { ...x, [k]: v } : x));
  const setLink = (i: number, patch: Partial<MenuLink>) => setMenu((m) => m.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const moveLink = (i: number, dir: -1 | 1) =>
    setMenu((m) => {
      const j = i + dir;
      if (j < 0 || j >= m.length) return m;
      const c = [...m];
      [c[i], c[j]] = [c[j]!, c[i]!];
      return c;
    });

  async function enviarLogo(file: File) {
    setUploading(true);
    try {
      const blob = await resizeToWebp(file, 512, 0.9);
      const path = `marca/logo-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("produtos").upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;
      set("logo_url", path);
      toast.success("Logo enviado. Salve para aplicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setUploading(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    const wa = onlyDigits(f.whatsapp);
    if (wa.length < 10) { toast.error("WhatsApp da loja inválido."); return; }
    if (!/^#[0-9a-fA-F]{6}$/.test(f.cor_destaque)) { toast.error("Cor inválida."); return; }
    setSaving(true);
    const { id: _id, updated_at: _u, menu_links: _m, ...rest } = f;
    const menu_links = menu.map((l, i) => ({ ...l, label: l.label.trim() || normalizeMenuLinks([])[i]!.label }));
    const { error } = await supabase
      .from("configuracoes")
      .update({ ...rest, menu_links, whatsapp: wa.startsWith("55") && wa.length >= 12 ? wa : `55${wa}`, pedido_minimo: Math.max(1, Number(f.pedido_minimo) || 10) })
      .eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["admin", "config"] });
    invalidateStore(qc);
  }

  return (
    <AdminPage title="Configurações">
      <form onSubmit={salvar} className="space-y-4 pb-24">
        <Panel className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="cfg-wa">WhatsApp da loja</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">+55</span>
              <Input id="cfg-wa" type="tel" inputMode="tel" className="pl-14" value={f.whatsapp} onChange={(e) => set("whatsapp", maskPhone(e.target.value))} />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="cfg-min" hint="(peças no total)">
              Pedido mínimo
            </FieldLabel>
            <Input id="cfg-min" inputMode="numeric" value={String(f.pedido_minimo)} onChange={(e) => set("pedido_minimo", Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="cfg-email" hint="(opcional, aparece no rodapé)">
              E-mail de contato
            </FieldLabel>
            <Input id="cfg-email" type="email" inputMode="email" autoCapitalize="none" value={f.email_contato} onChange={(e) => set("email_contato", e.target.value)} />
          </div>
        </Panel>

        <Panel className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 font-medium">Logo</p>
            <div className="flex items-center gap-3">
              <img src={f.logo_url ? mediaUrl(f.logo_url) : "/logo.webp"} alt="Logo atual" className="size-20 rounded-full border object-cover" />
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" onClick={() => logoRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Trocar logo
                </Button>
                {f.logo_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set("logo_url", null)}>
                    Usar logo original
                  </Button>
                )}
              </div>
              <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && enviarLogo(e.target.files[0])} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Os ícones do navegador continuam com o logo original.</p>
          </div>
          <div>
            <FieldLabel htmlFor="cfg-cor">Cor de destaque</FieldLabel>
            <div className="flex items-center gap-3">
              <input id="cfg-cor" type="color" value={f.cor_destaque} onChange={(e) => set("cor_destaque", e.target.value)} className="h-12 w-16 cursor-pointer rounded-xl border bg-card p-1" />
              <Input value={f.cor_destaque} onChange={(e) => set("cor_destaque", e.target.value)} className="max-w-36 font-mono" autoCapitalize="none" />
              <Button type="button" variant="ghost" size="sm" onClick={() => set("cor_destaque", "#C9A227")}>
                Padrão
              </Button>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-4">
          <h2 className="font-sans text-lg font-bold tracking-normal">Página inicial</h2>
          <div>
            <FieldLabel htmlFor="cfg-ht">Título do banner</FieldLabel>
            <Input id="cfg-ht" value={f.home_titulo} onChange={(e) => set("home_titulo", e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="cfg-hs">Subtítulo</FieldLabel>
            <Textarea id="cfg-hs" rows={2} value={f.home_subtitulo} onChange={(e) => set("home_subtitulo", e.target.value)} />
          </div>
        </Panel>

        <Panel className="space-y-3">
          <div>
            <h2 className="font-sans text-lg font-bold tracking-normal">Menu do site</h2>
            <p className="text-sm text-muted-foreground">
              Os produtos do menu são as categorias ativas (edite em Categorias). Aqui você renomeia, reordena ou esconde os links de atendimento.
            </p>
          </div>
          <ul className="space-y-2">
            {menu.map((l, i) => (
              <li key={l.to} className="flex items-center gap-2 rounded-xl border p-2">
                <Input aria-label={`Nome do link ${l.to}`} value={l.label} maxLength={40} onChange={(e) => setLink(i, { label: e.target.value })} className="min-w-0 flex-1" />
                <Switch checked={l.visivel} onCheckedChange={(v) => setLink(i, { visivel: v })} aria-label={`Mostrar ${l.label}`} />
                <Button type="button" variant="ghost" size="icon" aria-label="Subir" disabled={i === 0} onClick={() => moveLink(i, -1)}>
                  <ArrowUp />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Descer" disabled={i === menu.length - 1} onClick={() => moveLink(i, 1)}>
                  <ArrowDown />
                </Button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="space-y-4">
          <div>
            <h2 className="font-sans text-lg font-bold tracking-normal">Páginas institucionais</h2>
            <p className="text-sm text-muted-foreground">Linha em branco separa parágrafos. Comece uma linha com "## " para criar um título.</p>
          </div>
          {TEXTOS.map((t) => (
            <div key={t.k}>
              <FieldLabel htmlFor={`cfg-${t.k}`}>{t.label}</FieldLabel>
              <Textarea id={`cfg-${t.k}`} rows={8} value={String(f[t.k] ?? "")} onChange={(e) => set(t.k, e.target.value)} />
            </div>
          ))}
        </Panel>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur safe-bottom md:left-64">
          <div className="mx-auto flex max-w-6xl justify-end px-4 pt-3 md:px-8">
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar configurações
            </Button>
          </div>
        </div>
      </form>
    </AdminPage>
  );
}
