'use client'
import { ChevronLeft } from 'lucide-react';
import { useRouter } from '@/lib/router';

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  headerRight,
  footer,
  back,
}: {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  scroll?: boolean;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  back?: boolean;
}) {
  const router = useRouter();
  const inner = (
    <div className="flex min-h-full flex-col px-4 pb-4">
      {title || headerRight || back ? (
        <div className="flex items-start justify-between pb-1 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            {back ? (
              <button
                type="button"
                onClick={router.goBack}
                aria-label="Retour"
                className="glass glass-border flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
            <div>
              {title ? (
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              ) : null}
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
          {headerRight}
        </div>
      ) : null}
      {scroll ? <div className="flex-1">{children}</div> : <div className="flex-1">{children}</div>}
    </div>
  );
  if (!footer) return inner;
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">{inner}</div>
      {footer}
    </div>
  );
}

export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7c5cfc]/30 border-t-[#7c5cfc]" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
