'use client';

import { useQuery } from '@tanstack/react-query';

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
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await fetch('/api/channels');
      return res.json();
    },
  });

  const activeChannels = channels.filter((ch) => ch.isActive);

  return (
    <div className="flex flex-wrap gap-1.5">
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
