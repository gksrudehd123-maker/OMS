# OMS - Online Commerce Margin & Sales Automation System

> 온라인 커머스 매출 및 마진 자동화 대시보드 시스템

---

## 프로젝트 개요

온라인 커머스 채널(스마트스토어, 쿠팡 등)의 매출 데이터를 통합 관리하고, 마진율을 자동 계산하여 실시간 대시보드로 시각화하는 시스템입니다.

### 핵심 기능

- **매출 대시보드**: 일별 매출/마진 추이, KPI 카드, 채널별 비교 차트
- **마진 자동 계산**: 원가, 수수료, 배송비를 반영한 순마진 자동 산출
- **채널별 분석**: 판매 채널별 매출/마진 비교 (스마트스토어, 쿠팡 윙 등)
- **상품별 분석**: 상품 단위 수익성 분석 및 마진 Top 10
- **데이터 수집**: 엑셀 업로드 + 네이버 API 자동 동기화
- **광고비 관리**: 채널+날짜별 광고비 입력, 기간 총합에서 차감
- **리포트 생성**: PDF/엑셀 리포트 다운로드

---

## 기술 스택

### 사용 중

| 구분 | 기술 | 설명 |
|------|------|------|
| **Framework** | Next.js 14 (App Router) | React 기반 풀스택 프레임워크 |
| **Language** | TypeScript 5 | 타입 안정성 확보 |
| **Styling** | Tailwind CSS 3 + shadcn/ui | 유틸리티 CSS + Radix UI 기반 컴포넌트 |
| **Charts** | Recharts 3 | 매출/마진 추이, 채널별 비교, 상품별 순위 차트 |
| **Database** | PostgreSQL (Supabase) | 매니지드 PostgreSQL (서울 리전) |
| **ORM** | Prisma 5 | Type-safe 데이터베이스 ORM |
| **Excel** | xlsx-populate | 엑셀 파싱 + 암호화 엑셀 복호화 (Python 의존성 없음) |
| **Upload** | react-dropzone | 드래그 앤 드롭 파일 업로드 |
| **PDF** | jspdf + html2canvas-pro | PDF 리포트 생성 (한글 지원) |
| **Toast** | sonner | 알림 토스트 UI |
| **Theme** | next-themes | 다크모드/라이트모드/시스템 연동 |

### 개발 도구

| 도구 | 용도 |
|------|------|
| **pnpm** | 패키지 매니저 |
| **ESLint + Prettier** | 코드 린팅 및 포맷팅 |
| **Prisma CLI** | DB 마이그레이션 및 스키마 관리 |

### 설치된 but 미적용 (향후 도입 예정)

| 기술 | 용도 | 적용 시점 |
|------|------|-----------|
| TanStack Query | 서버 상태 캐싱/중복 요청 방지 | Phase 7 성능 최적화 |
| TanStack Table | 고급 데이터 테이블 | 필요 시 |
| Zod | 폼 유효성 검증 | 필요 시 |

---

## 로컬 실행

### 요구사항

- Node.js 20.x LTS 이상
- pnpm 9.x 이상
- PostgreSQL 16.x (또는 Supabase)

### 실행

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

### 환경 변수

```env
# Database (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# App
NEXT_PUBLIC_APP_NAME=OMS
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_HIDE_API_SYNC=false    # true: Vercel에서 API 동기화 UI 숨김

# 네이버 커머스 API (스마트스토어 자동 동기화)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# 쿠팡 API (현재 미사용 — IP 제한)
COUPANG_ACCESS_KEY=...
COUPANG_SECRET_KEY=...
```

---

## 디렉토리 구조

```
OMS/
├── public/                         # 정적 파일
├── scripts/                        # 자동화 스크립트
│   ├── auto-sync.bat               # Windows 작업 스케줄러용 자동 동기화
│   ├── sync-log.txt                # 동기화 실행 로그
│   └── decrypt-xlsx.py             # (레거시) 엑셀 복호화 스크립트
├── prisma/
│   ├── schema.prisma               # DB 스키마
│   └── migrations/                 # 마이그레이션 파일
├── src/
│   ├── app/
│   │   ├── (dashboard)/            # 대시보드 레이아웃 그룹
│   │   │   ├── page.tsx            # 메인 대시보드
│   │   │   ├── sales/              # 매출 관리 (업로드 + API 동기화)
│   │   │   ├── products/           # 상품 관리
│   │   │   ├── channels/           # 채널 관리
│   │   │   ├── ad-costs/           # 광고비 관리
│   │   │   ├── reports/            # 리포트
│   │   │   ├── margins/            # 마진 분석
│   │   │   └── settings/           # 설정
│   │   ├── api/                    # API Route Handlers
│   │   │   ├── dashboard/          # 대시보드 KPI + 차트 데이터
│   │   │   ├── orders/             # 주문 조회
│   │   │   ├── products/           # 상품 CRUD
│   │   │   ├── channels/           # 채널 CRUD
│   │   │   ├── upload/             # 엑셀 업로드 + 이력 관리
│   │   │   ├── sync/smartstore/    # 스마트스토어 API 동기화
│   │   │   ├── ad-costs/           # 광고비 CRUD
│   │   │   ├── report/             # 리포트 데이터
│   │   │   └── settings/           # 설정 API
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # shadcn/ui + 공통 UI (skeleton, progress-bar 등)
│   │   ├── layout/                 # 사이드바, 헤더
│   │   ├── common/                 # 날짜 필터 등 공통 컴포넌트
│   │   ├── sales/                  # 주문 테이블, 업로드 존
│   │   └── providers/              # Theme, Query Provider
│   └── lib/
│       ├── prisma.ts               # Prisma 클라이언트
│       ├── utils.ts                # 공통 유틸
│       ├── constants.ts            # 상수 정의
│       ├── excel/                  # 엑셀 파서
│       │   ├── smartstore-parser.ts
│       │   ├── coupang-parser.ts
│       │   ├── column-map.ts       # 채널별 컬럼 매핑
│       │   └── validate-format.ts  # 업로드 양식 검증
│       ├── helpers/                # 비즈니스 로직 헬퍼
│       │   ├── margin-calc.ts      # 마진 계산
│       │   ├── product-key.ts      # 상품키 생성
│       │   └── status-map.ts       # 주문 상태 매핑
│       ├── naver/
│       │   └── commerce-api.ts     # 네이버 커머스 API 클라이언트
│       └── services/
│           └── order-processor.ts  # 공통 주문 처리 (업로드 + API 공유)
├── .env.example
├── package.json
└── README.md
```

---

## 데이터 모델

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Product    │     │   Channel    │     │    AdCost    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ name         │     │ name         │     │ channelId FK │
│ optionInfo   │     │ code         │     │ date         │
│ productKey   │     │ feeRate      │     │ cost         │
│ costPrice    │     │ isActive     │     │ memo         │
│ sellingPrice │     └──────┬───────┘     └──────────────┘
│ feeRate      │            │
│ shippingCost │            │
│ freeShipMin  │     ┌──────┴──────┐
│ isActive     │     │   Upload    │
└──────┬───────┘     ├─────────────┤
       │             │ id          │
       │             │ fileName    │
       │             │ channelId FK│
       │             │ totalRows   │
       │             │ successRows │
       │             │ errorRows   │
       │             └──────┬──────┘
       │                    │
┌──────┴────────────────────┴──┐     ┌──────────────┐
│           Order              │     │   Setting    │
├──────────────────────────────┤     ├──────────────┤
│ id                           │     │ key          │
│ productOrderNumber           │     │ value        │
│ orderNumber                  │     └──────────────┘
│ orderDate                    │
│ orderStatus                  │
│ productName / optionInfo     │
│ quantity                     │
│ productId FK                 │
│ channelId FK                 │
│ uploadId FK (CASCADE)        │
└──────────────────────────────┘
```

---

## 배포 환경

| 구분 | 서비스 | 설명 |
|------|--------|------|
| **Frontend + API** | Vercel | https://oms-dun.vercel.app/ (대시보드/조회용) |
| **Database** | Supabase | 매니지드 PostgreSQL (서울 리전) |
| **자동 동기화** | Windows 작업 스케줄러 | 로컬 PC에서 매일 09:00 실행 (네이버 API IP 제한) |

```
GitHub Push → Vercel Auto Deploy (main branch → Production)
```

> **참고**: 네이버/쿠팡 API는 IP 화이트리스트 제한으로 Vercel에서 호출 불가.
> API 동기화는 로컬 환경에서만 가능하며, Vercel에서는 `NEXT_PUBLIC_HIDE_API_SYNC=true`로 관련 UI를 숨김 처리.

---

## TODO 리스트

### Phase 1~4 - 초기 설정 + 핵심 기능 (완료)
- [x] Next.js + TypeScript + Tailwind CSS + shadcn/ui 프로젝트 설정
- [x] Prisma + Supabase PostgreSQL 연동
- [x] 대시보드 레이아웃 (사이드바 + 상단바 + 다크 모드)
- [x] 판매 채널 관리 (등록/수정/활성화/비활성화)
- [x] 엑셀 업로드 및 파싱 (스마트스토어 — 암호화 엑셀 지원)
- [x] 쿠팡 윙 엑셀 파서 (등록상품명+등록옵션명 기반, 주문상태 자동 추론)
- [x] 업로드 시 채널-엑셀 양식 자동 검증 (헤더 시그니처 기반)
- [x] 상품 자동 등록 + 수정/삭제 + 판매가/원가 설정
- [x] 주문 목록 조회 (검색, 페이지네이션)
- [x] KPI 카드 (총 매출, 총 마진, 평균 마진율, 총 광고비, 총 주문수)
- [x] 매출/마진 추이 차트 + 채널별 비교 차트 + 상품별 마진 Top 10
- [x] 날짜 범위 필터 (프리셋 버튼 + 직접 입력)

### Phase 5 - 마진 자동화 (완료)
- [x] 마진 자동 계산 (판매가 - 원가 - 수수료 - 배송비)
- [x] 채널별 수수료율 설정 + 상품별 개별 수수료율 오버라이드 (쿠팡 카테고리별 대응)
- [x] 배송비 설정 (상품별 기본 배송비 + 조건부 무료배송)
- [x] 광고비 관리 (채널+날짜별 입력, 기간 총합에서 차감)
- [ ] 마진 알림 (목표 마진율 미달 시 — 우선순위 낮음)

### Phase 6 - 리포트 (완료)
- [x] 리포트 전용 페이지 (기간 선택 → 조회 → 미리보기)
- [x] 엑셀 리포트 다운로드 (요약/일별/상품별 3시트)
- [x] PDF 리포트 다운로드 (html2canvas 캡처, 한글 지원)
- [x] 리포트 차트 (매출/마진 추이, 매출 구성 비율 파이, 상품별 마진 Top 5)
- [ ] 채널별 비교 리포트
- [ ] 매주/매월 자동 리포트 생성

### Phase 7 - 배포 및 최적화
- [x] Vercel 배포 (https://oms-dun.vercel.app/)
- [x] Python 의존성 제거 (xlsx-populate 자체 암호 해제)
- [x] 환경별 UI 분기 (Vercel에서 API 동기화 UI 숨김)
- [x] 로딩 UX (전 페이지 ProgressBar + Skeleton UI)
- [ ] 성능 최적화
  - [ ] TanStack Query 도입 (캐싱, 중복 요청 방지)
  - [ ] DB 쿼리 최적화 (Prisma groupBy/aggregate, 인덱스 추가)
  - [ ] API 응답 캐싱 (Cache-Control, revalidate)
  - [ ] 번들 사이즈 최적화 (next/dynamic lazy load)
- [ ] 에러 모니터링
  - [ ] Sentry 연동 (프론트엔드/API 에러 수집, Slack 알림)
  - [ ] Vercel Analytics 활성화

### Phase 8 - 인증 및 권한 관리
- [ ] NextAuth.js 설정
- [ ] 로그인 / 회원가입 페이지
- [ ] 역할 기반 접근 제어 (OWNER/MANAGER: 전체, STAFF: 마진/원가 차단)

### Phase 9 - 매출 데이터 자동 수집 (대부분 완료)
- [x] 네이버 커머스 API 연동 (스마트스토어 주문 자동 수집)
- [x] 공통 주문 처리 로직 분리 (엑셀 + API 공유 — order-processor)
- [x] 매출관리 페이지 API 동기화 UI (기간 선택, 24시간 자동 분할)
- [x] 주문 상태/배송 속성 영문 코드 통일
- [x] 자동 주문 수집 스케줄링 (Windows 작업 스케줄러 등록 완료, 매일 09:00)
  - 작업 이름: OMS_AutoSync, 실행: `scripts/auto-sync.bat`, 로그: `scripts/sync-log.txt`
- [x] 쿠팡 윙 엑셀 파서 + 채널 코드 기반 파서 자동 분기
- ~~쿠팡 Wing API 연동~~ (IP 제한 + 플레리오토 충돌 → 엑셀 업로드로 대체)
- [ ] 쿠팡 로켓그로스/로켓배송 엑셀 파서 (샘플 파일 확보 후 추가)

### Phase 10 - Notion 연동 (CS 관리)
- [ ] Notion API Integration 설정
- [ ] CS 데이터베이스 조회/등록/수정 (양방향 동기화)
- [ ] CS 전용 페이지

### 설정 페이지
- [x] 테마 설정 (다크/라이트/시스템)
- [x] 기본값 설정 (기본 배송비, 무료배송 기준금액)
- [x] 채널 관리 바로가기
- [x] 데이터 관리 (업로드 이력 조회/삭제)
- [ ] 프로필 설정 (Phase 8 이후)
- [ ] Notion 연동 설정 (Phase 10)

---

## License

MIT License
