'use client'
import { Avatar } from './avatar';
import { timeAgo } from '@/lib/format';
import type { ForumItem } from '@/lib/types';

export function ForumCard({ forum, onPress }: { forum: ForumItem; onPress?: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="mb-3 w-full rounded-[20px] border border-white/10 bg-[rgba(30,28,52,0.62)] p-4 text-left"
    >
      <div className="mb-3 flex items-center">
        <Avatar uri={forum.author.avatar} name={forum.author.username} size={34} />
        <div className="ml-2 flex-1">
          <p className="text-sm font-bold text-[#f5f5fa]">{forum.author.username}</p>
          <p className="text-xs text-[#62627a]">{timeAgo(forum.createdAt)}</p>
        </div>
        {forum.pinned ? <span className="text-base">📌</span> : null}
      </div>
      <h3 className="text-base font-bold leading-snug text-[#f5f5fa]">{forum.title}</h3>
      <p className="mt-0.5 line-clamp-2 text-sm leading-[19px] text-muted-foreground">{forum.content}</p>
      <div className="mt-3 flex gap-4 text-xs text-[#62627a]">
        <span>💬 {forum.repliesCount}</span>
        <span>❤️ {forum.likesCount}</span>
      </div>
    </button>
  );
}
