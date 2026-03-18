'use client';

import { useState } from 'react';

type DateRangeFilterProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function getQuarter(date: Date): { start: Date; end: Date } {
  const q = Math.floor(date.getMonth() / 3);
  const start = new Date(date.getFullYear(), q * 3, 1);
  const end = new Date(date.getFullYear(), q * 3 + 3, 0);
  return { start, end };
}

type Preset = {
  label: string;
  getRange: () => { from: string; to: string };
};

const presets: Preset[] = [
  {
    label: '오늘',
    getRange: () => {
      const today = formatDate(new Date());
      return { from: today, to: today };
    },
  },
  {
    label: '이번 주',
    getRange: () => {
      const now = new Date();
      const monday = getMonday(now);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return { from: formatDate(monday), to: formatDate(sunday) };
    },
  },
  {
    label: '이번 달',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: formatDate(start), to: formatDate(end) };
    },
  },
  {
    label: '이번 분기',
    getRange: () => {
      const { start, end } = getQuarter(new Date());
      return { from: formatDate(start), to: formatDate(end) };
    },
  },
  {
    label: '올해',
    getRange: () => {
      const y = new Date().getFullYear();
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    },
  },
  {
    label: '지난 주',
    getRange: () => {
      const now = new Date();
      const thisMonday = getMonday(now);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      return { from: formatDate(lastMonday), to: formatDate(lastSunday) };
    },
  },
  {
    label: '지난 달',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: formatDate(start), to: formatDate(end) };
    },
  },
  {
    label: '지난 분기',
    getRange: () => {
      const now = new Date();
      const prevQ = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const { start, end } = getQuarter(prevQ);
      return { from: formatDate(start), to: formatDate(end) };
    },
  },
  {
    label: '작년',
    getRange: () => {
      const y = new Date().getFullYear() - 1;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    },
  },
];

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePreset = (preset: Preset) => {
    const range = preset.getRange();
    onFromChange(range.from);
    onToChange(range.to);
    setActivePreset(preset.label);
  };

  const handleManualChange = (type: 'from' | 'to', value: string) => {
    setActivePreset(null);
    if (type === 'from') onFromChange(value);
    else onToChange(value);
  };

  const handleReset = () => {
    onFromChange('');
    onToChange('');
    setActivePreset(null);
  };

  return (
    <div className="space-y-3">
      {/* 프리셋 버튼 */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activePreset === preset.label
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* 날짜 직접 선택 */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => handleManualChange('from', e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-sm text-muted-foreground">~</span>
        <input
          type="date"
          value={to}
          onChange={(e) => handleManualChange('to', e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {(from || to) && (
          <button
            onClick={handleReset}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}
