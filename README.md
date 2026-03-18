# OMS - Online Commerce Margin & Sales Automation System

> 온라인 커머스 매출 및 마진 자동화 대시보드 시스템

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [개발 환경](#개발-환경)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [배포 환경](#배포-환경)
5. [디자인 가이드](#디자인-가이드)
6. [TODO 리스트](#todo-리스트)

---

## 프로젝트 개요

온라인 커머스 채널(쿠팡, 네이버, 11번가 등)의 매출 데이터를 통합 관리하고, 마진율을 자동 계산하여 실시간 대시보드로 시각화하는 시스템입니다.

### 핵심 기능

- **매출 대시보드**: 일별/주별/월별 매출 현황 시각화
- **마진 자동 계산**: 원가, 수수료, 배송비 등을 반영한 순마진 자동 산출
- **채널별 분석**: 판매 채널별 매출/마진 비교 분석
- **상품별 분석**: 상품 단위 수익성 분석
- **데이터 관리**: 엑셀 업로드 및 수동 입력 지원
- **리포트 생성**: PDF/엑셀 형태의 리포트 다운로드

---

## 개발 환경

### 기술 스택

| 구분 | 기술 | 버전 | 설명 |
|------|------|------|------|
| **Framework** | Next.js | 14.x | React 기반 풀스택 프레임워크 (App Router) |
| **Language** | TypeScript | 5.x | 타입 안정성 확보 |
| **UI Library** | shadcn/ui | latest | Radix UI 기반 컴포넌트 라이브러리 |
| **Styling** | Tailwind CSS | 3.x | 유틸리티 기반 CSS 프레임워크 |
| **Charts** | Recharts | 2.x | React 차트 라이브러리 |
| **Database** | PostgreSQL | 16.x | 관계형 데이터베이스 |
| **ORM** | Prisma | 5.x | Type-safe 데이터베이스 ORM |
| **Auth** | NextAuth.js | 5.x | 인증/인가 처리 |
| **State** | Zustand | 4.x | 경량 상태 관리 |
| **Data Fetching** | TanStack Query | 5.x | 서버 상태 관리 및 캐싱 |
| **Form** | React Hook Form + Zod | - | 폼 관리 및 유효성 검증 |
| **Table** | TanStack Table | 8.x | 데이터 테이블 처리 |
| **Excel** | SheetJS (xlsx) | - | 엑셀 파일 파싱/생성 |

### 개발 도구

| 도구 | 용도 |
|------|------|
| **pnpm** | 패키지 매니저 |
| **ESLint** | 코드 린팅 |
| **Prettier** | 코드 포맷팅 |
| **Husky** | Git Hooks 관리 |
| **Jest + Testing Library** | 단위/통합 테스트 |

### 로컬 개발 환경 요구사항

- Node.js 20.x LTS 이상
- pnpm 9.x 이상
- PostgreSQL 16.x
- Git 2.x 이상

### 로컬 실행

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local

# DB 마이그레이션
pnpm prisma migrate dev

# 개발 서버 실행
pnpm dev
```

---

## 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                   │
│                    Next.js App Router                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │Dashboard │  │ Products │  │ Reports  │  │Settings│  │
│  │  Pages   │  │  Pages   │  │  Pages   │  │ Pages  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       └──────────────┴──────────────┴───────────┘       │
│                          │                               │
│              ┌───────────┴───────────┐                   │
│              │   Zustand + TanStack  │                   │
│              │    (State & Cache)    │                   │
│              └───────────┬───────────┘                   │
└──────────────────────────┼───────────────────────────────┘
                           │ HTTP (REST API)
┌──────────────────────────┼───────────────────────────────┐
│                   Server (Next.js API)                   │
│  ┌───────────────────────┴────────────────────────────┐  │
│  │              API Route Handlers                    │  │
│  │        /api/sales  /api/products  /api/reports     │  │
│  └───────────────────────┬────────────────────────────┘  │
│                          │                               │
│  ┌───────────┐  ┌────────┴────────┐  ┌────────────────┐  │
│  │ NextAuth  │  │  Business Logic │  │  Excel Parser  │  │
│  │  (Auth)   │  │   (Services)    │  │  (SheetJS)     │  │
│  └───────────┘  └────────┬────────┘  └────────────────┘  │
│                          │                               │
│              ┌───────────┴───────────┐                   │
│              │    Prisma ORM Client  │                   │
│              └───────────┬───────────┘                   │
└──────────────────────────┼───────────────────────────────┘
                           │
               ┌───────────┴───────────┐
               │     PostgreSQL DB     │
               │  ┌─────┐ ┌─────────┐ │
               │  │Sales│ │Products │ │
               │  ├─────┤ ├─────────┤ │
               │  │Costs│ │Channels │ │
               │  ├─────┤ ├─────────┤ │
               │  │Fees │ │ Users   │ │
               │  └─────┘ └─────────┘ │
               └───────────────────────┘
```

### 디렉토리 구조

```
C:/git/
├── public/                    # 정적 파일
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # 인증 관련 페이지
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/       # 대시보드 레이아웃 그룹
│   │   │   ├── page.tsx       # 메인 대시보드
│   │   │   ├── sales/         # 매출 관리
│   │   │   ├── products/      # 상품 관리
│   │   │   ├── margins/       # 마진 분석
│   │   │   ├── channels/      # 채널 분석
│   │   │   ├── reports/       # 리포트
│   │   │   └── settings/      # 설정
│   │   ├── api/               # API Route Handlers
│   │   │   ├── auth/
│   │   │   ├── sales/
│   │   │   ├── products/
│   │   │   ├── margins/
│   │   │   ├── channels/
│   │   │   ├── reports/
│   │   │   └── upload/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/            # 공통 컴포넌트
│   │   ├── ui/                # shadcn/ui 컴포넌트
│   │   ├── charts/            # 차트 컴포넌트
│   │   ├── layout/            # 레이아웃 컴포넌트
│   │   └── data-table/        # 테이블 컴포넌트
│   ├── lib/                   # 유틸리티 및 설정
│   │   ├── prisma.ts          # Prisma 클라이언트
│   │   ├── utils.ts           # 공통 유틸
│   │   └── constants.ts       # 상수 정의
│   ├── services/              # 비즈니스 로직
│   │   ├── sales.service.ts
│   │   ├── product.service.ts
│   │   ├── margin.service.ts
│   │   └── report.service.ts
│   ├── stores/                # Zustand 스토어
│   ├── types/                 # TypeScript 타입 정의
│   └── hooks/                 # 커스텀 훅
├── prisma/
│   ├── schema.prisma          # DB 스키마
│   ├── migrations/            # 마이그레이션 파일
│   └── seed.ts                # 시드 데이터
├── .env.example
├── .eslintrc.json
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### 데이터 모델 (ERD 개요)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │     │   Product    │     │   Channel    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ email        │     │ name         │     │ name         │
│ password     │     │ sku          │     │ feeRate      │
│ name         │     │ costPrice    │     │ createdAt    │
│ role         │     │ sellingPrice │     └──────┬───────┘
│ createdAt    │     │ categoryId   │            │
└──────────────┘     │ createdAt    │            │
                     └──────┬───────┘            │
                            │                    │
                     ┌──────┴────────────────────┴──┐
                     │          SalesRecord          │
                     ├──────────────────────────────┤
                     │ id                            │
                     │ productId (FK)                │
                     │ channelId (FK)                │
                     │ quantity                      │
                     │ salesAmount                   │
                     │ costAmount                    │
                     │ channelFee                    │
                     │ shippingCost                  │
                     │ margin (자동 계산)             │
                     │ marginRate (자동 계산)         │
                     │ salesDate                     │
                     │ createdAt                     │
                     └──────────────────────────────┘
```

---

## 배포 환경

### 인프라 구성

| 구분 | 서비스 | 설명 |
|------|--------|------|
| **Frontend + API** | Vercel | Next.js 최적화 배포 플랫폼 |
| **Database** | Supabase (PostgreSQL) | 매니지드 PostgreSQL 서비스 |
| **File Storage** | Vercel Blob | 엑셀 업로드 파일 저장 |
| **Monitoring** | Vercel Analytics | 성능 모니터링 |

### 배포 파이프라인

```
GitHub Push → Vercel Auto Deploy
  ├── main branch    → Production  (https://oms.vercel.app)
  ├── develop branch → Preview     (https://oms-dev.vercel.app)
  └── feature/*      → Preview     (PR별 자동 생성)
```

### 환경 변수

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/oms

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# App
NEXT_PUBLIC_APP_NAME=OMS
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 배포 |
| `develop` | 개발 통합 브랜치 |
| `feature/*` | 기능 개발 |
| `fix/*` | 버그 수정 |

---

## 디자인 가이드

### 컬러 시스템

| 용도 | Light Mode | Dark Mode | CSS Variable |
|------|-----------|-----------|--------------|
| **Primary** | `#2563EB` (Blue 600) | `#3B82F6` (Blue 500) | `--primary` |
| **Secondary** | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | `--secondary` |
| **Accent** | `#8B5CF6` (Violet 500) | `#A78BFA` (Violet 400) | `--accent` |
| **Success** | `#16A34A` (Green 600) | `#22C55E` (Green 500) | `--success` |
| **Warning** | `#EA580C` (Orange 600) | `#F97316` (Orange 500) | `--warning` |
| **Danger** | `#DC2626` (Red 600) | `#EF4444` (Red 500) | `--danger` |
| **Background** | `#FFFFFF` | `#0F172A` (Slate 900) | `--background` |
| **Surface** | `#F8FAFC` (Slate 50) | `#1E293B` (Slate 800) | `--surface` |
| **Border** | `#E2E8F0` (Slate 200) | `#334155` (Slate 700) | `--border` |
| **Text Primary** | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | `--foreground` |
| **Text Secondary** | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | `--muted-foreground` |

### 타이포그래피

| 요소 | 폰트 | 크기 | 굵기 |
|------|------|------|------|
| **H1** | Pretendard | 30px (1.875rem) | Bold (700) |
| **H2** | Pretendard | 24px (1.5rem) | Semibold (600) |
| **H3** | Pretendard | 20px (1.25rem) | Semibold (600) |
| **Body** | Pretendard | 14px (0.875rem) | Regular (400) |
| **Caption** | Pretendard | 12px (0.75rem) | Regular (400) |
| **숫자/금액** | Inter | 각 요소와 동일 | Medium (500) |

### 간격 (Spacing)

```
4px  (0.25rem) - xs   : 아이콘 내부 간격
8px  (0.5rem)  - sm   : 요소 내부 패딩
12px (0.75rem) - md   : 컴포넌트 간 간격
16px (1rem)    - lg   : 섹션 내부 패딩
24px (1.5rem)  - xl   : 카드 패딩
32px (2rem)    - 2xl  : 섹션 간 간격
```

### 반응형 브레이크포인트

| 이름 | 크기 | 대상 |
|------|------|------|
| `sm` | 640px | 모바일 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 소형 데스크탑 |
| `xl` | 1280px | 데스크탑 |
| `2xl` | 1536px | 와이드 스크린 |

### 대시보드 레이아웃

```
┌────────────────────────────────────────────────────┐
│  Logo    Navigation Tabs           User │ Settings │
├────┬───────────────────────────────────────────────┤
│    │  Page Title              Date Filter  Export  │
│ S  │──────────────────────────────────────────────│
│ I  │  ┌─ KPI Card─┐ ┌─ KPI Card─┐ ┌─ KPI Card─┐ │
│ D  │  │ 총 매출   │ │ 순 마진   │ │ 마진율    │ │
│ E  │  │ ₩12.5M   │ │ ₩3.2M    │ │ 25.6%     │ │
│ B  │  │ ▲ 12.5%  │ │ ▲ 8.3%   │ │ ▼ 2.1%   │ │
│ A  │  └──────────┘ └──────────┘ └──────────┘   │
│ R  │──────────────────────────────────────────────│
│    │  ┌─ 매출 추이 차트 (Line/Bar) ──────────────┐ │
│ N  │  │                                          │ │
│ A  │  │          [Chart Area]                    │ │
│ V  │  │                                          │ │
│    │  └──────────────────────────────────────────┘ │
│    │──────────────────────────────────────────────│
│    │  ┌─ 채널별 매출 ────┐ ┌─ 상품별 마진 Top 10─┐ │
│    │  │   [Pie Chart]   │ │   [Bar Chart]       │ │
│    │  └─────────────────┘ └─────────────────────┘ │
│    │──────────────────────────────────────────────│
│    │  ┌─ 데이터 테이블 ──────────────────────────┐ │
│    │  │ Search  Filter  Columns        Export   │ │
│    │  │─────────────────────────────────────────│ │
│    │  │ SKU │ 상품명 │ 채널 │ 매출 │ 마진 │ ... │ │
│    │  └──────────────────────────────────────────┘ │
└────┴───────────────────────────────────────────────┘
```

### 컴포넌트 스타일 가이드

- **카드**: `rounded-xl`, `shadow-sm`, `border` 적용. hover 시 `shadow-md` 전환
- **버튼**: Primary(파랑), Secondary(회색), Danger(빨강) 3단계. `rounded-lg` 적용
- **입력 필드**: `rounded-lg`, `border`, focus 시 `ring-2 ring-primary` 적용
- **테이블**: 행 hover 시 배경색 변경, 짝수 행 줄무늬 없음 (깔끔한 스타일)
- **차트**: 브랜드 컬러 팔레트 사용, 툴팁에 금액 포맷(₩) 적용
- **다크 모드**: 시스템 설정 연동 + 수동 토글 지원

---

## TODO 리스트

### Phase 1 - 프로젝트 초기 설정
- [ ] Next.js 프로젝트 생성 (TypeScript, App Router)
- [ ] Tailwind CSS + shadcn/ui 설정
- [ ] Pretendard / Inter 폰트 설정
- [ ] ESLint + Prettier 설정
- [ ] Prisma 초기 설정 및 DB 스키마 작성
- [ ] 프로젝트 디렉토리 구조 생성
- [ ] 환경 변수 설정 (.env.example)

### Phase 2 - 인증 및 레이아웃
- [ ] NextAuth.js 설정 (이메일/비밀번호 인증)
- [ ] 로그인 / 회원가입 페이지
- [ ] 대시보드 레이아웃 (사이드바 + 상단바)
- [ ] 반응형 사이드바 네비게이션
- [ ] 다크 모드 토글

### Phase 3 - 핵심 데이터 관리
- [ ] 상품 CRUD (등록/조회/수정/삭제)
- [ ] 판매 채널 관리
- [ ] 매출 데이터 입력 (수동)
- [ ] 엑셀 파일 업로드 및 파싱
- [ ] 원가/수수료/배송비 관리

### Phase 4 - 대시보드 및 시각화
- [ ] KPI 카드 컴포넌트 (매출, 마진, 마진율)
- [ ] 매출 추이 차트 (일별/주별/월별)
- [ ] 채널별 매출 비교 차트
- [ ] 상품별 마진 순위 차트
- [ ] 날짜 범위 필터
- [ ] 데이터 테이블 (정렬, 필터, 페이지네이션)

### Phase 5 - 마진 자동화
- [ ] 마진 자동 계산 로직 구현
- [ ] 채널별 수수료율 자동 적용
- [ ] 배송비 계산 로직
- [ ] 마진 알림 (목표 마진율 미달 시)

### Phase 6 - 리포트 및 내보내기
- [ ] 엑셀 리포트 다운로드
- [ ] PDF 리포트 생성
- [ ] 기간별 리포트 자동 생성

### Phase 7 - 배포 및 최적화
- [ ] Vercel 배포 설정
- [ ] Supabase PostgreSQL 연동
- [ ] 성능 최적화 (캐싱, 이미지 등)
- [ ] SEO 및 메타 태그 설정
- [ ] 에러 모니터링 설정

---

## License

MIT License
