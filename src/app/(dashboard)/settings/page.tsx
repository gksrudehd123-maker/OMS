'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const themes = [
  {
    value: 'light',
    label: '라이트 모드',
    description: '밝은 배경에 어두운 텍스트',
    icon: Sun,
  },
  {
    value: 'dark',
    label: '다크 모드',
    description: '어두운 배경에 밝은 텍스트',
    icon: Moon,
  },
  {
    value: 'system',
    label: '시스템 설정',
    description: '운영체제 설정에 따라 자동 전환',
    icon: Monitor,
  },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">설정</h1>
        <p className="text-sm text-muted-foreground">
          시스템 설정을 관리합니다
        </p>
      </div>

      {/* 테마 설정 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">테마 설정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          화면 테마를 선택하세요
        </p>

        {mounted && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {themes.map((t) => {
              const isActive = theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                  }`}
                >
                  <div
                    className={`rounded-full p-3 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <t.icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}
                    >
                      {t.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                  {isActive && (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                      사용 중
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 추후 구현 예정 설정 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">기본값 설정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          신규 상품 등록 시 적용되는 기본값
        </p>
        <div className="mt-4 flex h-24 items-center justify-center text-sm text-muted-foreground">
          추후 구현 예정
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">데이터 관리</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          업로드 이력 조회 및 데이터 관리
        </p>
        <div className="mt-4 flex h-24 items-center justify-center text-sm text-muted-foreground">
          추후 구현 예정
        </div>
      </div>
    </div>
  );
}
