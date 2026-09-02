'use client'

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher…',
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-[rgba(30,28,52,0.62)] px-3">
      <span className="text-sm">🔎</span>
      <input
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        autoCorrect="off"
        autoCapitalize="none"
        className="w-full bg-transparent py-3 text-base text-[#f5f5fa] outline-none placeholder:text-[#62627a]"
      />
      {value ? (
        <button type="button" onClick={() => onChangeText('')} className="p-1 text-sm text-[#62627a]">
          ✕
        </button>
      ) : null}
    </div>
  );
}
