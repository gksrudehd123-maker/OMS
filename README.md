# OMS - Online Commerce Margin & Sales Automation System

> 온라인 커머스 매출 및 마진 자동화 대시보드 시스템

---

## 프로젝트 개요

온라인 커머스 채널(스마트스토어, 쿠팡 등)의 매출 데이터를 통합 관리하고, 마진율을 자동 계산하여 실시간 대시보드로 시각화하는 시스템입니다.

### 핵심 기능

- **매출 대시보드**: 일별 매출/마진 추이, KPI 카드, 채널별 비교 차트
- **마진 자동 계산**: 원가, 수수료, 배송비를 반영한 순마진 자동 산출
- **채널별 분석**: 판매 채널별 매출/마진 비교 (스마트스토어, 쿠팡 윙, 쿠팡 로켓그로스)
- **상품별 분석**: 상품 단위 수익성 분석 및 마진 Top 10
- **데이터 수집**: 엑셀 업로드 + 네이버 API 자동 동기화
- **광고비 관리**: 채널+날짜별 광고비 입력, 기간 총합에서 차감
- **리포트 생성**: PDF/엑셀 리포트 다운로드

---

## 지원 채널 및 데이터 구조

### 채널별 데이터 수집 방식

| 채널 | 수집 방식 | 데이터 유형 | DB 테이블 |
|------|-----------|-------------|-----------|
| **스마트스토어** | 엑셀 업로드 + API 자동 동기화 | 주문 단건 | `Order` |
| **쿠팡 윙** | 엑셀 업로드 (DeliveryList) | 주문 단건 | `Order` |
| **쿠팡 로켓그로스** | 엑셀 업로드 (Statistics) | 일별 상품 집계 | `DailySales` |

### DB 테이블 분리 설계

로켓그로스는 쿠팡 판매자센터에서 주문 단건이 아닌 **일별 상품별 판매 집계** 데이터만 제공합니다 (주문번호, 구매자, 배송상태 없음). 따라서 기존 `Order` 테이블에 넣지 않고 `DailySales` 테이블로 분리했습니다.

- **Order**: 주문 단건 데이터를 저장하는 채널 (스마트스토어, 쿠팡 윙)
- **DailySales**: 일별 집계 데이터를 저장하는 채널 (쿠팡 로켓그로스)
- 대시보드/리포트에서는 **두 테이블을 합산**하여 KPI, 차트, 상품별 마진에 표시
- 매출 관리에서는 **선택된 채널에 따라 OrderTable / DailySalesTable 전환** 표시
- 향후 새 채널 추가 시: 주문 단건 구조 → `Order`, 집계 구조 → `DailySales`

### 엑셀 파서별 처리 흐름

```
스마트스토어 (.xlsx)  → smartstore-parser  → order-processor    → Order 테이블
쿠팡 윙 (.xlsx)       → coupang-parser     → order-processor    → Order 테이블
로켓그로스 (.xlsx)    → rocketgrowth-parser → dailysales-processor → DailySales 테이블
```

### 마진 계산 방식

**스마트스토어 / 쿠팡 윙** (margin-calc.ts)
```
마진 = (판매가 × 수량) - (원가 × 수량) - 수수료 - 배송비
수수료 = 판매금액 × 수수료율
배송비 = 같은 주문번호 합산금액 기준 조건부 무료배송 판단
```

**쿠팡 로켓그로스** (rg-margin-calc.ts, VAT 포함)
```
할인쿠폰 = 판매자할인쿠폰 × 판매수량
판매수수료 = ROUND((순판매금액 - 할인쿠폰) × 수수료율, 0)
판매수수료VAT = ROUND(판매수수료 × 10%, 0)
정산대상액 = 순판매금액 - 판매수수료 - 판매수수료VAT - 할인쿠폰
입출고배송비 = 판매수량 × 입출고배송비(개당)
입출고VAT = ROUND(입출고배송비 × 10%, 0)
지급액 = 정산대상액 - 입출고배송비 - 입출고VAT
원가 = 원가(개당) × 판매수량
부가세 = (순매출-쿠폰) - (순매출-쿠폰)/1.1 - (원가-원가/1.1) - 판매수수료VAT - 입출고VAT
마진 = 지급액 - 원가 - 부가세
```

> **참고**: RG 순판매금액은 엑셀에서 오는 확정값이므로, 원가/수수료 미설정 시에도 **매출은 항상 합산**됩니다. 마진은 원가/수수료율/입출고배송비가 모두 설정된 경우에만 계산됩니다.

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
| **Server State** | TanStack Query 5 | API 데이터 캐싱, 중복 요청 방지, 자동 갱신 |
| **Error Monitoring** | Sentry (@sentry/nextjs 10) | 에러 자동 수집, Session Replay, 성능 모니터링 |

### 개발 도구

| 도구 | 용도 |
|------|------|
| **pnpm** | 패키지 매니저 |
| **ESLint + Prettier** | 코드 린팅 및 포맷팅 |
| **Prisma CLI** | DB 마이그레이션 및 스키마 관리 |

### 설치된 but 미적용 (향후 도입 예정)

| 기술 | 용도 | 적용 시점 |
|------|------|-----------|
| TanStack Table | 고급 데이터 테이블 (정렬/필터/가상화) | 필요 시 |
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
│   │   │   ├── dashboard/          # 대시보드 KPI + 차트 데이터 (Order + DailySales 합산)
│   │   │   ├── orders/             # 주문 조회 (스마트스토어/쿠팡 윙)
│   │   │   ├── daily-sales/        # 판매 조회 (쿠팡 로켓그로스)
│   │   │   ├── products/           # 상품 CRUD (RG 전용 필드 포함)
│   │   │   ├── channels/           # 채널 CRUD
│   │   │   ├── upload/             # 엑셀 업로드 (3-way 분기: 스마트스토어/쿠팡윙/로켓그로스)
│   │   │   ├── sync/smartstore/    # 스마트스토어 API 동기화
│   │   │   ├── ad-costs/           # 광고비 CRUD
│   │   │   ├── report/             # 리포트 데이터 (Order + DailySales 합산)
│   │   │   └── settings/           # 설정 API
│   │   ├── global-error.tsx        # Sentry 에러 바운더리 (자동 에러 보고)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   ├── instrumentation.ts          # Sentry 서버/엣지 초기화 (register 함수)
│   ├── instrumentation-client.ts   # Sentry 클라이언트 초기화 + Session Replay
│   ├── components/
│   │   ├── ui/                     # shadcn/ui + 공통 UI (skeleton, progress-bar 등)
│   │   ├── layout/                 # 사이드바, 헤더
│   │   ├── common/                 # 날짜 필터 등 공통 컴포넌트
│   │   ├── sales/                  # 주문 테이블, DailySales 테이블, 업로드 존
│   │   └── providers/              # Theme, Query Provider
│   └── lib/
│       ├── prisma.ts               # Prisma 클라이언트
│       ├── utils.ts                # 공통 유틸
│       ├── constants.ts            # 상수 정의
│       ├── excel/                  # 엑셀 파서
│       │   ├── smartstore-parser.ts  # 스마트스토어 주문조회 엑셀
│       │   ├── coupang-parser.ts     # 쿠팡 윙 DeliveryList 엑셀
│       │   ├── rocketgrowth-parser.ts # 쿠팡 로켓그로스 Statistics 엑셀
│       │   ├── column-map.ts         # 채널별 컬럼 매핑 (스마트스토어/쿠팡윙/로켓그로스)
│       │   └── validate-format.ts    # 업로드 양식 검증 (3-way: 스마트스토어/쿠팡/로켓그로스)
│       ├── helpers/                # 비즈니스 로직 헬퍼
│       │   ├── margin-calc.ts      # 마진 계산 (스마트스토어/쿠팡 윙)
│       │   ├── rg-margin-calc.ts   # 마진 계산 (로켓그로스, VAT 포함)
│       │   ├── product-key.ts      # 상품키 생성
│       │   └── status-map.ts       # 주문 상태 매핑
│       ├── naver/
│       │   └── commerce-api.ts     # 네이버 커머스 API 클라이언트
│       └── services/
│           ├── order-processor.ts       # 주문 처리 (스마트스토어/쿠팡 윙)
│           └── dailysales-processor.ts  # 판매 처리 (로켓그로스)
├── .env.example
├── package.json
└── README.md
```

---

## 데이터 모델

```
┌──────────────────┐     ┌──────────────┐     ┌──────────────┐
│     Product       │     │   Channel    │     │    AdCost    │
├──────────────────┤     ├──────────────┤     ├──────────────┤
│ id                │     │ id           │     │ id           │
│ name              │     │ name         │     │ channelId FK │
│ optionInfo        │     │ code         │     │ date         │
│ productKey        │     │ feeRate      │     │ cost         │
│ costPrice         │     │ isActive     │     │ memo         │
│ sellingPrice      │     └──────┬───────┘     └──────────────┘
│ feeRate           │            │
│ shippingCost      │            │
│ freeShipMin       │     ┌──────┴──────┐
│ couponDiscount ★  │     │   Upload    │
│ fulfillmentFee ★  │     ├─────────────┤
│ isActive          │     │ id          │
└──────┬────────────┘     │ fileName    │
       │                  │ channelId FK│
       │                  │ totalRows   │
       │                  │ successRows │
       │                  │ errorRows   │
       │                  └──┬──────┬───┘
       │                     │      │
┌──────┴─────────────────────┴──┐  ┌┴──────────────────────────────┐
│           Order               │  │         DailySales ★          │
│  (스마트스토어, 쿠팡 윙)      │  │     (쿠팡 로켓그로스)         │
├───────────────────────────────┤  ├────────────────────────────────┤
│ id                            │  │ id                             │
│ productOrderNumber            │  │ date                           │
│ orderNumber                   │  │ optionId                       │
│ orderDate                     │  │ exposureProductId              │
│ orderStatus                   │  │ optionName                     │
│ productName / optionInfo      │  │ salesAmount (순 판매 금액)     │
│ quantity                      │  │ salesQuantity (순 판매 수량)   │
│ buyerName / recipientName     │  │ totalAmount / cancelAmount     │
│ productId FK                  │  │ itemWinnerRate                 │
│ channelId FK                  │  │ productId FK                   │
│ uploadId FK (CASCADE)         │  │ channelId FK                   │
└───────────────────────────────┘  │ uploadId FK (CASCADE)          │
                                   └────────────────────────────────┘
★ = 로켓그로스 전용 필드          ★ = 로켓그로스 전용 테이블

┌──────────────┐
│   Setting    │
├──────────────┤
│ key          │
│ value        │
└──────────────┘
```

### Product 모델 필드 용도

| 필드 | 스마트스토어/쿠팡 윙 | 쿠팡 로켓그로스 |
|------|---------------------|----------------|
| `costPrice` | 원가 | 원가 |
| `sellingPrice` | 판매가 | 사용 안 함 (엑셀에서 판매금액 제공) |
| `feeRate` | 개별 수수료율 (채널 기본 수수료 오버라이드) | 판매수수료율 (10.8%, 7.8% 등) |
| `shippingCost` | 기본 배송비 | 사용 안 함 |
| `freeShippingMin` | 무료배송 기준금액 | 사용 안 함 |
| `couponDiscount` | 사용 안 함 | 판매자할인쿠폰 (개당) |
| `fulfillmentFee` | 사용 안 함 | 입출고배송비 (개당) |

---

## Sentry - 에러 모니터링

### 왜 필요한가?

운영 중 에러가 발생했을 때, Sentry가 없으면 사용자가 "안돼요"라고 알려주기 전까지 에러 발생 사실 자체를 알 수 없습니다.
Sentry를 연동하면 에러가 발생하는 순간 **자동으로 Sentry 대시보드에 기록**되어, 어떤 페이지에서 어떤 브라우저를 사용하는 사용자에게 어떤 에러가 발생했는지 스택트레이스까지 즉시 확인할 수 있습니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| **에러 자동 수집** | 프론트엔드(브라우저)와 백엔드(API Route) 모두에서 발생하는 에러를 자동으로 포착하여 Sentry 대시보드에 기록 |
| **Session Replay** | 에러 발생 시 사용자가 어떤 동작을 했는지 화면 녹화를 재생할 수 있음. 에러 재현이 어려운 경우 특히 유용 |
| **성능 모니터링** | API 응답 시간, 페이지 로딩 속도 등 성능 데이터를 수집하여 병목 구간을 파악 |
| **라우터 전환 추적** | Next.js 페이지 이동 시 전환 성능을 자동으로 추적 |
| **글로벌 에러 페이지** | 앱 전체에서 처리되지 않은 에러 발생 시 `global-error.tsx`에서 사용자에게 안내 메시지를 보여주고, 동시에 Sentry로 에러를 보고 |

### 설정 상세

```
tracesSampleRate: 1.0           → 모든 요청의 성능 데이터를 100% 수집
replaysOnErrorSampleRate: 1.0   → 에러 발생 시 세션 리플레이를 100% 녹화
replaysSessionSampleRate: 0.1   → 일반(정상) 세션은 10%만 녹화 (비용 절약)
```

### 파일 구조

| 파일 | 역할 |
|------|------|
| `src/instrumentation.ts` | 서버(Node.js)와 엣지(Edge Runtime)에서 Sentry를 초기화하는 `register()` 함수. Next.js가 서버 시작 시 자동 호출 |
| `src/instrumentation-client.ts` | 브라우저(클라이언트)에서 Sentry를 초기화. Session Replay 통합 및 라우터 전환 추적 설정 포함 |
| `src/app/global-error.tsx` | 앱 전체 에러 바운더리. 처리되지 않은 에러 발생 시 `Sentry.captureException()`으로 에러를 보고하고, 사용자에게 "다시 시도" 버튼이 포함된 안내 화면을 표시 |
| `next.config.mjs` | `withSentryConfig()`으로 Next.js 빌드를 감싸서 소스맵 업로드 및 Sentry 빌드 플러그인 적용 |

---

## TanStack Query - 서버 상태 관리

### 왜 필요한가?

기존에는 모든 페이지에서 `useState` + `useEffect` + `fetch`를 조합해서 데이터를 불러왔습니다. 이 방식에는 다음과 같은 문제가 있습니다:

```tsx
// 이전 방식: 모든 페이지마다 이런 보일러플레이트 코드를 반복
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  fetch('/api/dashboard')
    .then(res => res.json())
    .then(data => setData(data))
    .finally(() => setLoading(false));
}, [from, to]);
```

**문제점:**
- 대시보드 → 상품관리 → 다시 대시보드로 돌아오면 **매번 빈 화면에서 다시 로딩** (깜빡임)
- 채널 목록을 상품 관리와 설정 페이지에서 동시에 불러오면 **같은 API를 중복 호출**
- 상품 수정 후 목록 갱신을 위해 **수동으로 상태를 업데이트**해야 함
- 로딩/에러 상태를 **매번 직접 선언하고 관리**해야 함

### TanStack Query 적용 후

```tsx
// 현재 방식: 선언적이고 간결
const { data, isLoading } = useQuery({
  queryKey: ['dashboard', from, to],
  queryFn: () => fetch('/api/dashboard').then(res => res.json()),
});
```

### 체감되는 차이

| 항목 | 이전 (useState + useEffect) | 현재 (TanStack Query) |
|------|---|---|
| **페이지 전환 후 복귀** | 빈 화면 → 로딩 → 데이터 표시 (깜빡임) | 캐시된 데이터 즉시 표시, 백그라운드에서 최신 데이터 갱신 |
| **같은 API 동시 호출** | 컴포넌트마다 각각 fetch → 2~3번 중복 호출 | 자동 중복 제거, 1번만 호출 후 결과 공유 |
| **데이터 변경 후 목록 갱신** | `setProducts(prev => ...)` 수동 업데이트 | `invalidateQueries()` 한 줄로 자동 새로고침 |
| **로딩/에러 상태** | useState로 직접 선언 + try/catch | `isLoading`, `isError` 자동 제공 |
| **코드량** | fetch + useState 3개 + useEffect + try/catch | useQuery 한 줄 |

### 적용된 페이지

| 페이지 | 사용 패턴 | 설명 |
|------|------|------|
| **대시보드** (`page.tsx`) | `useQuery` | KPI, 차트 데이터 조회. 날짜 필터 변경 시 `queryKey`가 바뀌면서 자동 재조회 |
| **상품 관리** (`products/page.tsx`) | `useQuery` + `useMutation` | 상품 목록 조회 + 수정/비활성화. 변경 성공 시 `invalidateQueries`로 목록 자동 갱신 |
| **채널 관리** (`channels/page.tsx`) | `useQuery` + `useMutation` | 채널 목록 조회 + 등록/수정/활성화 토글 |
| **광고비** (`ad-costs/page.tsx`) | `useQuery` + `useMutation` | 광고비 내역 조회 + 등록/삭제 |
| **설정** (`settings/page.tsx`) | `useQuery` x3 | 기본값 설정, 채널 목록, 업로드 이력을 각각 독립적으로 조회 |
| **주문 테이블** (`order-table.tsx`) | `useQuery` | 주문 목록 페이지네이션 + 검색 |
| **판매 테이블** (`daily-sales-table.tsx`) | `useQuery` | 로켓그로스 판매 목록 페이지네이션 + 검색 |

### QueryProvider 전역 설정

```tsx
// src/components/providers/query-provider.tsx
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 데이터를 1분간 "신선한" 상태로 유지
                                     // → 1분 이내 페이지 전환 시 API 재호출 없이 캐시 사용
      refetchOnWindowFocus: false,   // 브라우저 탭 전환 시 자동 재호출 끔
                                     // → 내부 관리 도구이므로 실시간성이 불필요
    },
  },
});
```

### useQuery vs useMutation

| | useQuery | useMutation |
|---|---|---|
| **용도** | 데이터 **조회** (GET) | 데이터 **변경** (POST/PATCH/DELETE) |
| **실행 시점** | 컴포넌트 마운트 시 자동 실행 | `mutate()` 호출 시 수동 실행 |
| **캐싱** | `queryKey` 기반으로 자동 캐싱 | 캐싱 없음 (변경 작업이므로) |
| **상태** | `isLoading`, `data`, `isError` | `isPending`, `isSuccess`, `isError` |
| **연동** | - | `onSuccess`에서 `invalidateQueries()`로 관련 쿼리 자동 갱신 |

```tsx
// 예시: 상품 수정 → 목록 자동 갱신
const productMutation = useMutation({
  mutationFn: (data) => fetch(`/api/products/${id}`, { method: 'PATCH', body: ... }),
  onSuccess: () => {
    // 상품 수정이 성공하면 상품 목록 쿼리를 무효화 → 자동으로 다시 불러옴
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('저장되었습니다');
  },
});

// 저장 버튼에서 isPending으로 로딩 상태 표시
<button disabled={productMutation.isPending}>
  {productMutation.isPending ? '저장 중...' : '저장'}
</button>
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
- [x] 쿠팡 로켓그로스 엑셀 파서 (DailySales 모델, VAT 포함 마진 계산)
- [x] 업로드 시 채널-엑셀 양식 자동 검증 (3-way: 스마트스토어/쿠팡/로켓그로스)
- [x] 상품 자동 등록 + 수정/삭제 + 판매가/원가 설정
- [x] 주문 목록 조회 (검색, 페이지네이션)
- [x] KPI 카드 (총 매출, 총 마진, 평균 마진율, 총 광고비, 총 주문수)
- [x] 매출/마진 추이 차트 + 채널별 비교 차트 + 상품별 마진 Top 10
- [x] 날짜 범위 필터 (프리셋 버튼 + 직접 입력)

### Phase 5 - 마진 자동화 (완료)
- [x] 마진 자동 계산 (판매가 - 원가 - 수수료 - 배송비)
- [x] 로켓그로스 마진 자동 계산 (VAT 포함, 수수료/입출고배송비/할인쿠폰 반영)
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
  - [x] TanStack Query 도입 (캐싱, 중복 요청 방지 — 전 페이지 적용 완료)
  - [ ] DB 쿼리 최적화 (Prisma groupBy/aggregate, 인덱스 추가)
  - [ ] API 응답 캐싱 (Cache-Control, revalidate)
  - [ ] 번들 사이즈 최적화 (next/dynamic lazy load)
- [x] Sentry 에러 모니터링 (@sentry/nextjs 10 — instrumentation 패턴 적용, Session Replay, 라우터 전환 추적)
- [ ] 모바일 반응형 UI
  - [ ] 사이드바 → 햄버거 메뉴 전환
  - [ ] 테이블 가로 스크롤 처리
  - [ ] KPI 카드/차트 그리드 반응형
  - [ ] 다이얼로그/업로드 영역 터치 UX
- [ ] Vercel Analytics (현재 불필요 — 사용자 1명, 내부 도구. 팀원 추가 시 검토)

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
- [x] 쿠팡 로켓그로스 엑셀 파서 + DailySales 모델 + 전 화면 통합
- ~~쿠팡 Wing API 연동~~ (IP 제한 + 플레리오토 충돌 → 엑셀 업로드로 대체)
- [ ] 쿠팡 로켓배송 엑셀 파서 (샘플 파일 확보 후 추가)

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
