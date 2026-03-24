'use client';

import { ThemeToggle } from './theme-toggle';
import { Bell, User } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      {/* 모바일에서 햄버거 버튼 공간 확보 */}
      <div className="lg:hidden w-10" />
      <div className="hidden lg:block">{/* 추후 페이지 제목 또는 Breadcrumb */}</div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-lg p-2 hover:bg-muted transition-colors"
          aria-label="알림"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
        <ThemeToggle />
        <button
          className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted transition-colors"
          aria-label="사용자 메뉴"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
        </button>
      </div>
    </header>
  );
}
