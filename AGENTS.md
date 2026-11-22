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

- Always pull and sync the remote repository (`git pull`) at the start of any work so that changes made directly in Lovable are merged and always up to date locally.
- Store UI is Portuguese (pt-BR) and mobile-first (360–430 px): touch targets ≥ 44 px, body text ≥ 16 px, fixed bottom action bar on product/cart/checkout.
- Price tier is decided by the TOTAL pieces of the whole order (`src/lib/pricing.ts`); the same module runs in the browser and in `criarPedido`, which recomputes prices server-side. Keep tests in `src/lib/pricing.test.ts`.
- WhatsApp order text lives only in `src/lib/whatsapp-message.ts` (tested); orders are saved by the `criarPedido` server function with the admin client, never by direct anonymous inserts.
- Product media bucket `produtos` is private (workspace blocks public buckets); browsers load files via `/api/public/midia/<path>` which redirects to a signed URL. Store paths in `produto_midias.url`, resolve with `mediaUrl()`. Product images must be uploaded in original quality (PNG, JPEG, etc.) without downscaling or lossy compression.
- Public catalog reads go through server functions using an anonymous client (`src/lib/public-db.server.ts`) so SSR has data; query cache is shipped to the browser with `setupRouterSsrQueryIntegration`.
- Admin access = `user_roles` row checked by `is_admin()`/RLS in the database; the admin role is granted by the `handle_auth_user` trigger. Internal order notes live in `pedido_notas` (admin-only) so customers can never read them.
- Panel edits call `invalidateStore()` so store queries refetch immediately.
- Bulk product import runs in the admin panel (`/admin/produtos/importar`) with the admin's own session and RLS, never with a service key in a local script; grouping/naming/brand rules live in `src/lib/bulk-import.ts` (tested), images keep original quality/format and storage paths are deterministic so re-runs resume.
- `.env` (publishable backend URL/key only) must stay tracked in git — the published build reads `VITE_SUPABASE_*` from it; ignoring it made the live site fail with "Missing Supabase environment variable(s)". Never put secret keys in it.
- Store menu "Atendimento" links come from `configuracoes.menu_links`, normalized by `src/lib/menu-links.ts` (tested); product menu entries are the active categories.
- Install Google Tag Manager only in RootShell, with the official head bootstrap and noscript as body's first child; GA4 configuration belongs in GTM, not an app-owned gtag.js loader, to avoid duplicate tracking while retaining analytics.ts events.
- InfinitePay credentials are server-only; checkout uses TanStack server functions, and the unsigned public webhook must confirm every payment through `payment_check` before marking it paid. Keep one payment per order and never delete orders with payment records.
- Parse InfinitePay link responses through the shared validated adapter, accepting the live API's `url` field and legacy aliases; provider payment controls use a dedicated semantic Button variant so store theme changes cannot override their contrast.
- New order email notifications: sent via Resend API using server function `enviarEmailNovoPedido` in `src/lib/order-email.ts` (tested); credentials stay server-only via `RESEND_API_KEY` in Lovable Secrets, and missing keys log a warning without blocking customer checkout.
