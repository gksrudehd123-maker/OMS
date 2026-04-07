'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  Store,
  Megaphone,
  FileBarChart,
  Settings,
  Users,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Headphones,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[]; // 미지정 시 OWNER, MANAGER만 표시
};

const mainNavItems: NavItem[] = [
  { href: '/', label: '대시보드', icon: LayoutDashboard, roles: ['OWNER', 'MANAGER'] },
  { href: '/sales', label: '매출 관리', icon: ShoppingCart, roles: ['OWNER', 'MANAGER'] },
  { href: '/products', label: '상품 관리', icon: Package, roles: ['OWNER', 'MANAGER'] },
  { href: '/margins', label: '마진 분석', icon: TrendingUp, roles: ['OWNER', 'MANAGER'] },
  { href: '/ad-costs', label: '광고비 관리', icon: Megaphone, roles: ['OWNER', 'MANAGER'] },
  { href: '/cs', label: 'CS 관리', icon: Headphones, roles: ['OWNER', 'MANAGER', 'STAFF'] },
  { href: '/reports', label: '리포트', icon: FileBarChart, roles: ['OWNER', 'MANAGER'] },
];

const settingsSubItems: NavItem[] = [
  { href: '/settings', label: '설정', icon: Settings, roles: ['OWNER'] },
  { href: '/channels', label: '채널 분석', icon: Store, roles: ['OWNER'] },
  { href: '/users', label: '사용자 관리', icon: Users, roles: ['OWNER'] },
  { href: '/audit-logs', label: '감사 로그', icon: ScrollText, roles: ['OWNER'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const userRole = session?.user?.role;

  const canSee = (item: NavItem) =>
    !userRole || !item.roles || item.roles.includes(userRole);

  const visibleMainItems = mainNavItems.filter(canSee);
  const visibleSubItems = settingsSubItems.filter(canSee);

  // 설정 하위 메뉴가 활성화되어 있으면 자동으로 열기
  const isSettingsActive = visibleSubItems.some((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
  );

  useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true);
  }, [isSettingsActive]);

  // 모바일 메뉴 열릴 때 스크롤 방지
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const renderMainNav = (
    item: (typeof mainNavItems)[number],
    isMobile?: boolean,
  ) => {
    const isActive =
      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 text-sm transition-colors',
          isMobile ? 'py-2.5' : 'py-2',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          !isMobile && collapsed && 'justify-center px-2',
        )}
        title={!isMobile && collapsed ? item.label : undefined}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {(isMobile || !collapsed) && <span>{item.label}</span>}
      </Link>
    );
  };

  const renderSettingsGroup = (isMobile?: boolean) => {
    // 사이드바 접힌 상태에서는 설정 아이콘만 표시
    if (!isMobile && collapsed) {
      return (
        <div className="space-y-1">
          {visibleSubItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-center rounded-lg px-2 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                title={item.label}
              >
                <item.icon className="h-5 w-5 shrink-0" />
              </Link>
            );
          })}
        </div>
      );
    }

    return (
      <div>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors',
            isMobile ? 'py-2.5' : 'py-2',
            isSettingsActive
              ? 'text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">설정 / 관리</span>
          {settingsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {settingsOpen && (
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
            {visibleSubItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                    isMobile ? 'py-2' : 'py-1.5',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3.5 z-50 rounded-lg p-2 hover:bg-muted transition-colors lg:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 데스크톱 사이드바 */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-background transition-all duration-300',
          'max-lg:hidden',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-border px-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">OMS</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'rounded-lg p-1.5 hover:bg-muted transition-colors',
              collapsed ? 'mx-auto' : 'ml-auto',
            )}
            aria-label={collapsed ? '사이드바 열기' : '사이드바 접기'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col p-2">
          <div className="space-y-1">
            {visibleMainItems.map((item) => renderMainNav(item))}
          </div>
          {visibleSubItems.length > 0 && (
            <>
              <div className="my-2 border-t border-border" />
              {renderSettingsGroup()}
            </>
          )}
        </nav>
      </aside>

      {/* 모바일 사이드바 (슬라이드) */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-border bg-background transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo + 닫기 */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">OMS</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col p-2">
          <div className="space-y-1">
            {mainNavItems.map((item) => renderMainNav(item, true))}
          </div>
          <div className="my-2 border-t border-border" />
          {renderSettingsGroup(true)}
        </nav>
      </aside>
    </>
  );
}
