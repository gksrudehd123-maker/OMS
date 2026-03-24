'use client';

import { useSession, signOut } from 'next-auth/react';
import { ThemeToggle } from './theme-toggle';
import { Bell, LogOut, User } from 'lucide-react';

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      {/* 모바일에서 햄버거 버튼 공간 확보 */}
      <div className="lg:hidden w-10" />
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        {session?.user && (
          <span className="hidden text-sm text-muted-foreground sm:block">
            {session.user.name}
          </span>
        )}
        <button
          className="rounded-lg p-2 hover:bg-muted transition-colors"
          aria-label="알림"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
        <ThemeToggle />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-lg p-2 hover:bg-muted transition-colors"
          aria-label="로그아웃"
          title="로그아웃"
        >
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
