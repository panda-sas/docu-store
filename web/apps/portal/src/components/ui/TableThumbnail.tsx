"use client";

import Link from "next/link";
import { Skeleton } from "primereact/skeleton";
import { useAuthBlobUrl } from "@/hooks/use-auth-blob-url";
import { API_URL } from "@/lib/constants";

const sizes = {
  sm: { cls: "h-12 w-12", skW: "3rem", skH: "3rem", radius: "0.25rem" },
  md: { cls: "h-20 w-20", skW: "5rem", skH: "5rem", radius: "0.375rem" },
  lg: { cls: "h-32 w-32", skW: "8rem", skH: "8rem", radius: "0.375rem" },
} as const;

interface TableThumbnailProps {
  artifactId: string;
  href: string;
  size?: keyof typeof sizes;
}

export function TableThumbnail({ artifactId, href, size = "lg" }: TableThumbnailProps) {
  const src = `${API_URL}/artifacts/${artifactId}/pages/0/image?size=thumb`;
  const { blobUrl, error } = useAuthBlobUrl(src);
  const s = sizes[size];

  if (error) return null;

  return (
    <Link href={href} className={`block shrink-0 ${s.cls}`}>
      {!blobUrl && <Skeleton width={s.skW} height={s.skH} borderRadius={s.radius} />}
      {blobUrl && (
        <img
          src={blobUrl}
          alt=""
          className={`${s.cls} rounded-md border border-border-subtle object-cover object-top`}
        />
      )}
    </Link>
  );
}
