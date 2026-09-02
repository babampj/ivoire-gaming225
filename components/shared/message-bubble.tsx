'use client'
import { cn } from '@/lib/utils';

export function MessageBubble({
  content,
  fromMe,
  time,
  type,
  imageUrl,
  read,
}: {
  content: string;
  fromMe: boolean;
  time: string;
  type?: string;
  imageUrl?: string | null;
  read?: boolean;
}) {
  return (
    <div className={cn('my-0.5 flex', fromMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-[20px] px-3 py-1.5',
          fromMe
            ? 'rounded-tr-[10px] bg-[#2B2452]'
            : 'rounded-tl-[10px] bg-[rgba(42,38,66,0.75)]',
        )}
      >
        {type === 'IMAGE' && imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-[140px] w-[200px] rounded-[10px] object-cover" />
        ) : (
          <p className="text-sm leading-[19px] text-[#f5f5fa]">{content}</p>
        )}
        <p className="mt-0.5 self-end text-xs text-[#62627a]">
          {time}
          {fromMe ? (read ? ' ✓✓' : ' ✓') : ''}
        </p>
      </div>
    </div>
  );
}
