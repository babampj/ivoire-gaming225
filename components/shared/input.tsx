'use client'

export function Input({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | null;
}) {
  return (
    <div className="mb-3">
      {label ? (
        <label className="mb-1 block text-sm font-medium text-[#8e8e9e]">{label}</label>
      ) : null}
      <input
        className={`w-full rounded-xl border bg-[rgba(30,28,52,0.62)] px-4 py-3 text-base text-[#f5f5fa] outline-none placeholder:text-[#62627a] ${
          error ? 'border-[#ef4444]' : 'border-white/10'
        } ${className ?? ''}`}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-[#ef4444]">{error}</p> : null}
    </div>
  );
}
