import Image from "next/image";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";

export type ChallengeCardProps = {
  title: string;
  tags: string[];
  /** Local path under `public/` or absolute path Next Image allows */
  bannerSrc?: string;
  bannerAlt?: string;
  className?: string;
};

export function ChallengeCard({
  title,
  tags,
  bannerSrc,
  bannerAlt = "",
  className,
}: ChallengeCardProps) {
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {bannerSrc ? (
          <Image
            src={bannerSrc}
            alt={bannerAlt || title}
            fill
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/25 via-muted to-accent/40"
            aria-hidden
          />
        )}
        <div
          className="absolute inset-0 flex items-center justify-center bg-foreground/45 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
          aria-hidden
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-background/95 text-foreground shadow-lg ring-2 ring-background/60">
            <Play
              className="size-7 translate-x-0.5 fill-current"
              strokeWidth={1.5}
            />
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="font-heading text-base font-semibold leading-snug tracking-tight">
          {title}
        </h3>
        {tags.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <li key={`${tag}-${i}`}>
                <span className="inline-flex items-center rounded-md border border-border bg-muted/70 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
