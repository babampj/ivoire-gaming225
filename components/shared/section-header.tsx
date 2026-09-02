'use client'

export function SectionHeader({
  title,
  icon,
  action,
  onAction,
}: {
  title: string;
  icon?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold text-[#f5f5fa]">
        {icon ? `${icon} ` : ''}
        {title}
      </h2>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-medium text-[#7c5cfc]"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}
