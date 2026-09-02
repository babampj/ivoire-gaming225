'use client'
import { cn } from '@/lib/utils';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  className,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'accent';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  small?: boolean;
}) {
  const variantCls: Record<string, string> = {
    primary: 'bg-[#7c5cfc] text-white glow-violet',
    accent: 'bg-[#ff7a1a] text-[#5c4300] glow-orange',
    danger: 'bg-[#ef4444] text-white',
    outline: 'border border-white/15 bg-transparent text-[#f5f5fa]',
    ghost: 'bg-transparent text-[#8e8e9e]',
  };

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled || loading}
      className={cn(
        'w-full items-center justify-center rounded-2xl font-bold transition-opacity',
        small ? 'px-4 py-2 text-sm' : 'px-4 py-3.5 text-base',
        variantCls[variant],
        (disabled || loading) && 'opacity-45',
        className,
      )}
    >
      {loading ? (
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        title
      )}
    </button>
  );
}
