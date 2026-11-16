import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, RotateCcw, Save, Sparkles, Trash2, Truck } from "lucide-react";
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
import { maskCep, maskPhone, onlyDigits } from "@/lib/format";
import heroWide from "@/assets/hero-wide.webp";
import heroMobile from "@/assets/hero-mobile.webp";

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
  const [uploadingBanner, setUploadingBanner] = useState<string | null>(null);
  const [bannerVersion, setBannerVersion] = useState<number>(Date.now());
  const [activeBannerSlot, setActiveBannerSlot] = useState<1 | 2 | 3>(1);
  const [bannerLinks, setBannerLinks] = useState<Record<1 | 2 | 3, string>>({ 1: "", 2: "", 3: "" });
  const [bannerTitulos, setBannerTitulos] = useState<Record<1 | 2 | 3, string>>({ 1: "", 2: "", 3: "" });
  const [bannerSubtitulos, setBannerSubtitulos] = useState<Record<1 | 2 | 3, string>>({ 1: "", 2: "", 3: "" });
  const [menu, setMenu] = useState<MenuLink[]>([]);
  const [tokenSuperFrete, setTokenSuperFrete] = useState("");
  const [cepOrigemSuperFrete, setCepOrigemSuperFrete] = useState("78464-222");
  const logoRef = useRef<HTMLInputElement>(null);
  const wideBannerRef = useRef<HTMLInputElement>(null);
  const mobileBannerRef = useRef<HTMLInputElement>(null);

  const { data: banners, refetch: refetchBanners } = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("produtos").list("banners");
      if (error) {
        return {
          1: { wide: false, mobile: false },
          2: { wide: false, mobile: false },
          3: { wide: false, mobile: false },
        };
      }
      const names = new Set(data?.map((b) => b.name) ?? []);
      return {
        1: {
          wide: names.has("hero-wide.webp") || names.has("banner-1-wide.webp"),
          mobile: names.has("hero-mobile.webp") || names.has("banner-1-mobile.webp"),
        },
        2: {
          wide: names.has("banner-2-wide.webp"),
          mobile: names.has("banner-2-mobile.webp"),
        },
        3: {
          wide: names.has("banner-3-wide.webp"),
          mobile: names.has("banner-3-mobile.webp"),
        },
      };
    },
  });

  async function enviarBanner(slot: 1 | 2 | 3, tipo: "wide" | "mobile", file: File) {
    setUploadingBanner(`${slot}-${tipo}`);
    try {
      const maxDim = tipo === "wide" ? 1920 : 1080;
      const blob = await resizeToWebp(file, maxDim, 0.85);
      const filename =
        slot === 1
          ? tipo === "wide"
            ? "hero-wide.webp"
            : "hero-mobile.webp"
          : `banner-${slot}-${tipo}.webp`;
      const path = `banners/${filename}`;
      const { error } = await supabase.storage.from("produtos").upload(path, blob, {
        contentType: "image/webp",
        upsert: true,
      });
      if (error) throw error;
      toast.success(`Banner ${slot} (${tipo === "wide" ? "desktop" : "celular"}) enviado com sucesso!`);
      setBannerVersion(Date.now());
      await refetchBanners();
      invalidateStore(qc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio do banner");
    } finally {
      setUploadingBanner(null);
    }
  }

  async function restaurarBanner(slot: 1 | 2 | 3, tipo?: "wide" | "mobile") {
    try {
      const pathsToDelete: string[] = [];
      if (slot === 1) {
        if (!tipo || tipo === "wide") {
          pathsToDelete.push("banners/hero-wide.webp", "banners/banner-1-wide.webp");
        }
        if (!tipo || tipo === "mobile") {
          pathsToDelete.push("banners/hero-mobile.webp", "banners/banner-1-mobile.webp");
        }
      } else {
        if (!tipo || tipo === "wide") pathsToDelete.push(`banners/banner-${slot}-wide.webp`);
        if (!tipo || tipo === "mobile") pathsToDelete.push(`banners/banner-${slot}-mobile.webp`);
      }
      const { error } = await supabase.storage.from("produtos").remove(pathsToDelete);
      if (error) throw error;
      toast.success(
        slot === 1
          ? "Banner 1 restaurado para a imagem padrão."
          : tipo
            ? `Imagem ${tipo === "wide" ? "desktop" : "celular"} do banner ${slot} removida.`
            : `Banner ${slot} removido do carrossel.`
      );
      setBannerVersion(Date.now());
      await refetchBanners();
      invalidateStore(qc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover banner");
    }
  }

  useEffect(() => {
    if (data) {
      setF({ ...data, whatsapp: maskPhone(data.whatsapp.replace(/^55/, "")) });
      setMenu(normalizeMenuLinks(data.menu_links));
      if (data.menu_links && typeof data.menu_links === "object" && !Array.isArray(data.menu_links)) {
        const sf = data.menu_links as Record<string, unknown>;
        const superfrete = sf["superfrete"] as { token?: string; cep_origem?: string } | undefined;
        if (superfrete?.token) setTokenSuperFrete(superfrete.token);
        if (superfrete?.cep_origem) setCepOrigemSuperFrete(maskCep(superfrete.cep_origem));

        if (Array.isArray(sf["banners"])) {
          const links: Record<1 | 2 | 3, string> = { 1: "", 2: "", 3: "" };
          const titulos: Record<1 | 2 | 3, string> = { 1: "", 2: "", 3: "" };
          const subs: Record<1 | 2 | 3, string> = { 1: "", 2: "", 3: "" };
          for (const b of sf["banners"] as Array<{ id?: number; link?: string; titulo?: string; subtitulo?: string }>) {
            if (b?.id === 1 || b?.id === 2 || b?.id === 3) {
              links[b.id] = b.link || "";
              titulos[b.id] = b.titulo || "";
              subs[b.id] = b.subtitulo || "";
            }
          }
          setBannerLinks(links);
          setBannerTitulos(titulos);
          setBannerSubtitulos(subs);
        }
      }
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
    const linksNormalizados = normalizeMenuLinks(menu.map((l) => ({ ...l, label: l.label.trim() })));
    const bannersMeta = [
      { id: 1, link: (bannerLinks[1] || "").trim(), titulo: (bannerTitulos[1] || "").trim(), subtitulo: (bannerSubtitulos[1] || "").trim() },
      { id: 2, link: (bannerLinks[2] || "").trim(), titulo: (bannerTitulos[2] || "").trim(), subtitulo: (bannerSubtitulos[2] || "").trim() },
      { id: 3, link: (bannerLinks[3] || "").trim(), titulo: (bannerTitulos[3] || "").trim(), subtitulo: (bannerSubtitulos[3] || "").trim() },
    ];
    const menu_links = {
      links: linksNormalizados,
      superfrete: {
        token: tokenSuperFrete.trim(),
        cep_origem: onlyDigits(cepOrigemSuperFrete),
      },
      banners: bannersMeta,
    };
    const { error } = await supabase
      .from("configuracoes")
      .update({
        ...rest,
        menu_links,
        whatsapp: wa.startsWith("55") && wa.length >= 12 ? wa : `55${wa}`,
        pedido_minimo: Math.max(1, Number(f.pedido_minimo) || 10),
      })
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
              <Button type="button" variant="ghost" size="sm" onClick={() => set("cor_destaque", "#14532D")}>
                Padrão
              </Button>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="font-sans text-lg font-bold tracking-normal">Carrossel de Banners da Loja</h2>
              <p className="text-sm text-muted-foreground">
                Configure até 3 banners para exibir no carrossel da página inicial. O Banner 1 é o principal; os Banners 2 e 3 entram automaticamente no carrossel quando imagens forem enviadas.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> 3 Opções de Banners
            </div>
          </div>

          {/* Abas dos 3 Banners */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted/70 p-1.5 border border-border/50">
            {([1, 2, 3] as const).map((slotNum) => {
              const hasW = banners?.[slotNum]?.wide;
              const hasM = banners?.[slotNum]?.mobile;
              const isConfigured = slotNum === 1 ? true : (hasW || hasM);
              const isSelected = activeBannerSlot === slotNum;
              return (
                <button
                  key={slotNum}
                  type="button"
                  onClick={() => setActiveBannerSlot(slotNum)}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all ${
                    isSelected
                      ? "bg-card text-foreground shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                  }`}
                >
                  <span className="truncate">Banner {slotNum} {slotNum === 1 ? "(Principal)" : ""}</span>
                  {isConfigured ? (
                    <span className="size-2 shrink-0 rounded-full bg-emerald-500" title="Ativo no carrossel" />
                  ) : (
                    <span className="size-2 shrink-0 rounded-full bg-muted-foreground/30" title="Vazio" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Configuração do Banner Selecionado */}
          <div className="space-y-5 rounded-2xl border bg-card/50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div>
                <h3 className="font-semibold text-base">
                  Banner {activeBannerSlot} {activeBannerSlot === 1 ? "— Principal da Loja" : "— Slide do Carrossel"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activeBannerSlot === 1
                    ? "Exibido por padrão. Se nenhuma imagem for enviada, usa o modelo original da Líder Atacado."
                    : "Será exibido automaticamente no carrossel da home assim que uma imagem for adicionada."}
                </p>
              </div>
              <div>
                {activeBannerSlot === 1 ? (
                  (banners?.[1]?.wide || banners?.[1]?.mobile) ? (
                    <span className="rounded-full bg-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
                      Personalizado
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      Padrão da loja
                    </span>
                  )
                ) : (
                  (banners?.[activeBannerSlot]?.wide || banners?.[activeBannerSlot]?.mobile) ? (
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      ✓ Ativo no carrossel
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      Vazio (não exibido)
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Campos de texto e links */}
            {activeBannerSlot === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="cfg-ht">Título do Banner 1</FieldLabel>
                  <Input id="cfg-ht" value={f.home_titulo} onChange={(e) => set("home_titulo", e.target.value)} />
                </div>
                <div>
                  <FieldLabel htmlFor="cfg-hs">Subtítulo</FieldLabel>
                  <Textarea id="cfg-hs" rows={2} value={f.home_subtitulo} onChange={(e) => set("home_subtitulo", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="cfg-b1-link" hint="(opcional, ex: /categoria/camisetas-cotton-pima)">
                    Link do botão do Banner 1
                  </FieldLabel>
                  <Input
                    id="cfg-b1-link"
                    placeholder="/categoria/camisetas-cotton-pima"
                    value={bannerLinks[1]}
                    onChange={(e) => setBannerLinks((prev) => ({ ...prev, 1: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor={`cfg-b${activeBannerSlot}-title`} hint="(opcional, deixe em branco para banner gráfico)">
                    Título do Banner {activeBannerSlot}
                  </FieldLabel>
                  <Input
                    id={`cfg-b${activeBannerSlot}-title`}
                    placeholder="Ex: Nova Coleção Camisas Polo"
                    value={bannerTitulos[activeBannerSlot]}
                    onChange={(e) => setBannerTitulos((prev) => ({ ...prev, [activeBannerSlot]: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor={`cfg-b${activeBannerSlot}-sub`} hint="(opcional)">
                    Subtítulo do Banner {activeBannerSlot}
                  </FieldLabel>
                  <Input
                    id={`cfg-b${activeBannerSlot}-sub`}
                    placeholder="Ex: Peças exclusivas no atacado a partir de 10 unidades"
                    value={bannerSubtitulos[activeBannerSlot]}
                    onChange={(e) => setBannerSubtitulos((prev) => ({ ...prev, [activeBannerSlot]: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor={`cfg-b${activeBannerSlot}-link`} hint="(opcional, link aberto ao clicar no banner)">
                    Link de destino do Banner {activeBannerSlot}
                  </FieldLabel>
                  <Input
                    id={`cfg-b${activeBannerSlot}-link`}
                    placeholder="Ex: /categoria/camisas-polos-peruanas ou /categoria/plus-size"
                    value={bannerLinks[activeBannerSlot]}
                    onChange={(e) => setBannerLinks((prev) => ({ ...prev, [activeBannerSlot]: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Uploads Desktop e Mobile */}
            <div className="grid gap-6 pt-2 md:grid-cols-2">
              {/* Banner Desktop */}
              {(() => {
                const slot = activeBannerSlot;
                const hasW = banners?.[slot]?.wide;
                const wideSrc =
                  slot === 1
                    ? (hasW ? `${mediaUrl("banners/hero-wide.webp")}?v=${bannerVersion}` : heroWide)
                    : (hasW ? `${mediaUrl(`banners/banner-${slot}-wide.webp`)}?v=${bannerVersion}` : null);

                return (
                  <div className="space-y-2.5 rounded-2xl border p-4 bg-background">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">Banner Desktop / Tablet</h4>
                        <p className="text-xs text-muted-foreground">Formato horizontal (recomendado 16:7 ou 1920×840)</p>
                      </div>
                      {hasW && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                          {slot === 1 ? "Personalizado" : "Enviado"}
                        </span>
                      )}
                    </div>
                    <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-muted border">
                      {wideSrc ? (
                        <img
                          src={wideSrc}
                          alt={`Banner Desktop ${slot}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
                          <ImagePlus className="size-8 opacity-40 mb-1.5" />
                          <p className="text-xs font-semibold">Nenhuma imagem desktop</p>
                          <p className="text-[11px] opacity-75">Clique em "Escolher foto" abaixo</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => wideBannerRef.current?.click()}
                        disabled={uploadingBanner !== null}
                      >
                        {uploadingBanner === `${slot}-wide` ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <ImagePlus className="size-4" />
                        )}
                        {hasW ? "Substituir foto" : "Escolher foto"}
                      </Button>
                      {hasW && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => restaurarBanner(slot, "wide")}
                          disabled={uploadingBanner !== null}
                        >
                          <RotateCcw className="size-4" /> {slot === 1 ? "Restaurar padrão" : "Remover foto"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Banner Mobile */}
              {(() => {
                const slot = activeBannerSlot;
                const hasM = banners?.[slot]?.mobile;
                const mobileSrc =
                  slot === 1
                    ? (hasM ? `${mediaUrl("banners/hero-mobile.webp")}?v=${bannerVersion}` : heroMobile)
                    : (hasM ? `${mediaUrl(`banners/banner-${slot}-mobile.webp`)}?v=${bannerVersion}` : null);

                return (
                  <div className="space-y-2.5 rounded-2xl border p-4 bg-background">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">Banner Celular / Mobile</h4>
                        <p className="text-xs text-muted-foreground">Formato compacto (recomendado 4:3 ou 900×675)</p>
                      </div>
                      {hasM && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                          {slot === 1 ? "Personalizado" : "Enviado"}
                        </span>
                      )}
                    </div>
                    <div className="relative aspect-[4/3] max-h-52 overflow-hidden rounded-xl bg-muted border">
                      {mobileSrc ? (
                        <img
                          src={mobileSrc}
                          alt={`Banner Mobile ${slot}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
                          <ImagePlus className="size-8 opacity-40 mb-1.5" />
                          <p className="text-xs font-semibold">Nenhuma imagem celular</p>
                          <p className="text-[11px] opacity-75">Clique em "Escolher foto" abaixo</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => mobileBannerRef.current?.click()}
                        disabled={uploadingBanner !== null}
                      >
                        {uploadingBanner === `${slot}-mobile` ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <ImagePlus className="size-4" />
                        )}
                        {hasM ? "Substituir foto" : "Escolher foto"}
                      </Button>
                      {hasM && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => restaurarBanner(slot, "mobile")}
                          disabled={uploadingBanner !== null}
                        >
                          <RotateCcw className="size-4" /> {slot === 1 ? "Restaurar padrão" : "Remover foto"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Botão de exclusão total do Banner 2 ou 3 */}
            {activeBannerSlot > 1 && (banners?.[activeBannerSlot]?.wide || banners?.[activeBannerSlot]?.mobile) && (
              <div className="flex justify-end pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => restaurarBanner(activeBannerSlot)}
                  disabled={uploadingBanner !== null}
                >
                  <Trash2 className="size-4" /> Excluir Banner {activeBannerSlot} do carrossel
                </Button>
              </div>
            )}
          </div>

          {/* Inputs de arquivo ocultos compartilhados */}
          <input
            ref={wideBannerRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                enviarBanner(activeBannerSlot, "wide", file);
                e.target.value = "";
              }
            }}
          />
          <input
            ref={mobileBannerRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                enviarBanner(activeBannerSlot, "mobile", file);
                e.target.value = "";
              }
            }}
          />
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
          <div className="flex items-center gap-2">
            <Truck className="size-5 text-primary" />
            <div>
              <h2 className="font-sans text-lg font-bold tracking-normal">SuperFrete — Cálculo de Frete</h2>
              <p className="text-sm text-muted-foreground">
                Integração para cotação em tempo real de PAC e SEDEX para os clientes na página do produto e carrinho.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="cfg-sf-cep" hint="(Lucas do Rio Verde/MT)">
                CEP de Origem (Remetente)
              </FieldLabel>
              <Input
                id="cfg-sf-cep"
                value={cepOrigemSuperFrete}
                onChange={(e) => setCepOrigemSuperFrete(maskCep(e.target.value))}
                placeholder="78464-222"
                inputMode="numeric"
                maxLength={9}
              />
            </div>

            <div>
              <FieldLabel htmlFor="cfg-sf-token" hint="(Bearer Token)">
                Token da API SuperFrete
              </FieldLabel>
              <Input
                id="cfg-sf-token"
                type="password"
                value={tokenSuperFrete}
                onChange={(e) => setTokenSuperFrete(e.target.value)}
                placeholder="Cole o token da API SuperFrete"
                autoCapitalize="none"
              />
            </div>
          </div>

          <div className="rounded-xl bg-accent p-3.5 text-xs text-accent-foreground leading-relaxed">
            <p className="font-semibold mb-1">📦 Regras de peso aplicadas automaticamente:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><strong>Camiseta:</strong> 200g (0,20 kg) por peça</li>
              <li><strong>Polo:</strong> 250g (0,25 kg) por peça</li>
              <li>Dimensões da embalagem calculadas proporcionalmente à quantidade de peças do pedido.</li>
            </ul>
          </div>
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
