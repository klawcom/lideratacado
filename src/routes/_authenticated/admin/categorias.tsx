import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminPage, FieldLabel, Loading, invalidateStore } from "@/components/admin/ui";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/categorias")({ component: Categorias });

type Cat = Tables<"categorias">;

function Categorias() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Cat> | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*, produtos(count)").order("ordem").order("nome");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "categorias"] });
    invalidateStore(qc);
  };

  async function mover(i: number, dir: -1 | 1) {
    if (!data) return;
    const list = [...data];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await Promise.all(list.map((c, n) => supabase.from("categorias").update({ ordem: n + 1 }).eq("id", c.id)));
    refresh();
  }

  async function toggle(c: Cat, ativa: boolean) {
    const { error } = await supabase.from("categorias").update({ ativa }).eq("id", c.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <AdminPage
      title="Categorias"
      actions={
        <Button onClick={() => setEdit({ nome: "", slug: "", descricao: "", ativa: true })}>
          <Plus /> <span className="hidden sm:inline">Nova categoria</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      }
    >
      {isLoading || !data ? (
        <Loading />
      ) : (
        <ul className="space-y-2">
          {data.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 rounded-2xl border bg-card p-2 pl-4">
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate font-semibold">{c.nome}</p>
                <p className="truncate text-sm text-muted-foreground">
                  /{c.slug} · {(c.produtos as unknown as { count: number }[])[0]?.count ?? 0} produtos
                </p>
              </div>
              <label className="flex min-h-11 items-center gap-2 px-1 text-sm">
                <Switch checked={c.ativa} onCheckedChange={(v) => toggle(c, v)} aria-label="Ativa" />
                <span className="hidden sm:inline">{c.ativa ? "Ativa" : "Inativa"}</span>
              </label>
              <div className="flex">
                <Button variant="ghost" size="icon" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Descer" disabled={i === data.length - 1} onClick={() => mover(i, 1)}>
                  <ArrowDown />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEdit(c)}>
                  <Pencil />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <CategoriaDialog
        value={edit}
        total={data?.length ?? 0}
        onClose={() => setEdit(null)}
        onSaved={() => {
          setEdit(null);
          refresh();
        }}
      />
    </AdminPage>
  );
}

function CategoriaDialog({ value, total, onClose, onSaved }: { value: Partial<Cat> | null; total: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Cat>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const open = value !== null;
  const [lastId, setLastId] = useState<string | undefined | null>(null);
  if (open && lastId !== (value?.id ?? "new")) {
    setLastId(value?.id ?? "new");
    setForm(value ?? {});
    setSlugTouched(!!value?.id);
  }
  if (!open && lastId !== null) setLastId(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const nome = (form.nome ?? "").trim();
    const slug = slugify(form.slug || nome);
    if (!nome || !slug) return toast.error("Informe o nome.");
    setSaving(true);
    const payload = { nome, slug, descricao: form.descricao ?? "", ativa: form.ativa ?? true };
    const { error } = form.id
      ? await supabase.from("categorias").update(payload).eq("id", form.id)
      : await supabase.from("categorias").insert({ ...payload, ordem: total + 1 });
    setSaving(false);
    if (error) return toast.error(error.code === "23505" ? "Já existe uma categoria com esse endereço (slug)." : error.message);
    toast.success("Categoria salva");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <FieldLabel htmlFor="c-nome">Nome</FieldLabel>
            <Input
              id="c-nome"
              value={form.nome ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) }))}
            />
          </div>
          <div>
            <FieldLabel htmlFor="c-slug" hint="(endereço na loja)">
              Slug
            </FieldLabel>
            <Input
              id="c-slug"
              autoCapitalize="none"
              value={form.slug ?? ""}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
            />
          </div>
          <div>
            <FieldLabel htmlFor="c-desc">Descrição</FieldLabel>
            <Textarea id="c-desc" rows={3} value={form.descricao ?? ""} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>
          <label className="flex min-h-11 items-center gap-3">
            <Switch checked={form.ativa ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, ativa: v }))} /> Ativa na loja
          </label>
          <Button type="submit" className="w-full" disabled={saving}>
            Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
