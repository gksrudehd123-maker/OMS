'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

type Channel = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type ChannelFilterProps = {
  value: string;
  onChange: (channelId: string) => void;
};

export function ChannelFilter({ value, onChange }: ChannelFilterProps) {
  const { data: session } = useSession();
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await fetch('/api/channels');
      return res.json();
    },
  });

  const activeChannels = channels.filter((ch) => {
    if (!ch.isActive) return false;
    if (!session?.user) return false;
    if (session.user.role === 'OWNER') return true;
    if (session.user.allowedChannels.length === 0) return true;
    return session.user.allowedChannels.includes(ch.id);
  });

  // 허용된 채널이 1개뿐이면 자동 선택, 선택된 채널이 권한 밖이면 초기화
  useEffect(() => {
    if (activeChannels.length === 0) return;
    if (activeChannels.length === 1) {
      if (value !== activeChannels[0].id) onChange(activeChannels[0].id);
      return;
    }
    if (value && !activeChannels.some((ch) => ch.id === value)) {
      onChange('');
    }
  }, [activeChannels, value, onChange]);

  const showAllButton = activeChannels.length > 1;

  return (
    <div className="flex flex-wrap gap-1.5">
      {showAllButton && (
        <button
          onClick={() => onChange('')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          전체
        </button>
      )}
      {activeChannels.map((ch) => (
        <button
          key={ch.id}
          onClick={() => onChange(ch.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === ch.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          {ch.name}
        </button>
      ))}
    </div>
  );
}
