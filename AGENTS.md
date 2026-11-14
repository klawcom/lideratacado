<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (Líder Atacado)

- Store UI is Portuguese (pt-BR) and mobile-first (360–430 px): touch targets ≥ 44 px, body text ≥ 16 px, fixed bottom action bar on product/cart/checkout.
- Price tier is decided by the TOTAL pieces of the whole order (`src/lib/pricing.ts`); the same module runs in the browser and in `criarPedido`, which recomputes prices server-side. Keep tests in `src/lib/pricing.test.ts`.
- WhatsApp order text lives only in `src/lib/whatsapp-message.ts` (tested); orders are saved by the `criarPedido` server function with the admin client, never by direct anonymous inserts.
- Product media bucket `produtos` is private (workspace blocks public buckets); browsers load files via `/api/public/midia/<path>` which redirects to a signed URL. Store paths in `produto_midias.url`, resolve with `mediaUrl()`.
- Public catalog reads go through server functions using an anonymous client (`src/lib/public-db.server.ts`) so SSR has data; query cache is shipped to the browser with `setupRouterSsrQueryIntegration`.
- Admin access = `user_roles` row checked by `is_admin()`/RLS in the database; the admin role is granted by the `handle_auth_user` trigger. Internal order notes live in `pedido_notas` (admin-only) so customers can never read them.
- Panel edits call `invalidateStore()` so store queries refetch immediately.
