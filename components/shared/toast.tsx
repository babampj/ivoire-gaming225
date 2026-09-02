'use client'
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/stores/app';

export function Toast() {
  const toast = useApp((s) => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-14 z-[1000] flex justify-center px-4">
      <div className="flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-[rgba(42,38,66,0.75)] px-4 py-2.5">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#ff7a1a]/30 border-t-[#ff7a1a]" />
        <span className="text-[13px] font-semibold text-[#f5f5fa]">{toast}</span>
      </div>
    </div>
  );
}
