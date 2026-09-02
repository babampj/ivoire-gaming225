'use client'

export function EmptyState({
  emoji = '🕹️',
  title,
  subtitle,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-3 text-[44px] leading-none">{emoji}</div>
      <p className="text-base font-bold text-[#f5f5fa]">{title}</p>
      {subtitle ? (
        <p className="mt-1 max-w-[16rem] text-sm leading-5 text-[#8e8e9e]">{subtitle}</p>
      ) : null}
    </div>
  );
}
