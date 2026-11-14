import { useQuery } from "@tanstack/react-query";
import { siteQuery } from "@/lib/catalog.functions";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function useLogoUrl() {
  const { data } = useQuery(siteQuery());
  return data?.config?.logo_url ? mediaUrl(data.config.logo_url) : "/logo.webp";
}

export function Logo({ size = 44, className }: { size?: number; className?: string }) {
  const src = useLogoUrl();
  return (
    <img
      src={src}
      alt="Líder Atacado"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}
