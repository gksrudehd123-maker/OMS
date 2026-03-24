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

# 쿠팡 API (미사용 — IP 제한으로 엑셀 업로드 대체)
# COUPANG_ACCESS_KEY=...
# COUPANG_SECRET_KEY=...
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

프론트엔드/백엔드 에러를 자동 수집하여 Sentry 대시보드에 기록. Session Replay, 성능 모니터링, 라우터 전환 추적 포함. dev 환경에서는 비활성화 (컴파일 속도 개선).

| 파일 | 역할 |
|------|------|
| `src/instrumentation.ts` | 서버/엣지 Sentry 초기화 |
| `src/instrumentation-client.ts` | 클라이언트 Sentry 초기화 + Session Replay |
| `src/app/global-error.tsx` | 글로벌 에러 바운더리 → Sentry 보고 |
| `next.config.mjs` | 프로덕션에서만 `withSentryConfig()` 적용 |

---

## TanStack Query - 서버 상태 관리

전 페이지에 적용. API 데이터 캐싱(1분), 중복 요청 방지, 변경 시 자동 갱신(`invalidateQueries`).

| 패턴 | 사용 페이지 |
|------|------------|
| `useQuery` | 대시보드, 주문 테이블, 판매 테이블, 설정 |
| `useQuery` + `useMutation` | 상품 관리, 채널 관리, 광고비 |

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

### 로컬 네트워크 접속 (같은 공유기)

같은 공유기에 연결된 다른 기기에서 로컬 dev 서버에 접속할 수 있습니다.

```bash
# 모든 네트워크 인터페이스에서 수신하도록 dev 서버 실행
npx next dev -H 0.0.0.0

# 이 PC의 IP 확인
ipconfig | grep "IPv4"

# 다른 기기에서 접속
# http://{IP주소}:3000 (예: http://192.168.0.9:3000)
```

> **주의**: 공유기가 바뀌면 IP가 달라집니다. 접속 전 `ipconfig`로 IP 재확인 필요.
> Windows 방화벽에서 3000 포트가 열려 있어야 합니다 (`netsh advfirewall firewall add rule name="OMS Dev Server" dir=in action=allow protocol=TCP localport=3000`).

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
- [x] 채널별 비교 리포트 (채널별 매출/원가/수수료/배송비/마진 비교 테이블 + 합계행)
- [ ] 매주/매월 자동 리포트 생성
- [x] 리포트 인쇄 기능 (window.print + 인쇄용 CSS 처리)

### Phase 7 - 배포 및 최적화
- [x] Vercel 배포 (https://oms-dun.vercel.app/)
- [x] Python 의존성 제거 (xlsx-populate 자체 암호 해제)
- [x] 환경별 UI 분기 (Vercel에서 API 동기화 UI 숨김)
- [x] 로딩 UX (전 페이지 ProgressBar + Skeleton UI)
- [x] 성능 최적화
  - [x] TanStack Query 도입 (캐싱, 중복 요청 방지 — 전 페이지 적용 완료)
  - [x] DB 쿼리 최적화 (Promise.all 병렬화, select 최소화, aggregate 활용, N+1 제거)
  - [x] API 응답 캐싱 (Cache-Control s-maxage + stale-while-revalidate 전 API 적용)
  - [x] 번들 사이즈 최적화 (next/dynamic lazy load — 대시보드/매출관리 차트·테이블 분리)
- [x] Sentry 에러 모니터링 (@sentry/nextjs 10 — instrumentation 패턴 적용, Session Replay, 라우터 전환 추적)
- [x] 모바일 반응형 UI
  - [x] 사이드바 → 햄버거 메뉴 전환
  - [x] 테이블 가로 스크롤 처리
  - [x] KPI 카드/차트 그리드 반응형
  - [x] 다이얼로그/업로드 영역 터치 UX
- [ ] Vercel Analytics (현재 불필요 — 사용자 1명, 내부 도구. 팀원 추가 시 검토)

### Phase 7.5 - 채널별 대시보드 (완료)
- [x] 대시보드 상단 채널 선택 버튼 ([전체] [스마트스토어] [쿠팡 윙] [로켓그로스])
- [x] Dashboard API에 channelId 필터 파라미터 추가
- [x] 마진 분석 페이지에도 채널 필터 적용
- [x] 리포트 페이지 채널별 필터 적용

### Phase 8 - 인증 및 권한 관리
- [x] NextAuth.js 설정 (Credentials Provider, JWT 세션)
- [x] 로그인 / 회원가입 페이지 (로딩 스피너, 성공/실패 피드백)
- [x] 미로그인 시 로그인 페이지 리다이렉트 (Next.js Middleware)
- [x] Role enum 변경 (ADMIN/USER → OWNER/MANAGER/STAFF)
- [x] User 모델에 allowedChannels 필드 추가 (접근 가능 채널 지정)
- [x] API 인증 미들웨어 (세션 없으면 401, 역할 부족 시 403)
- [x] 역할별 API 접근 제어 (채널/설정: OWNER만, 상품/광고비: OWNER+MANAGER, 업로드: 로그인 필수)
- [x] 대시보드 채널 버튼을 사용자 권한에 따라 필터링 (allowedChannels 기반, OWNER 전체 허용, 채널 1개 시 자동 선택)
- [x] Dashboard/Report API 채널 접근 권한 서버 검증 (checkChannelAccess + getChannelFilter)
- [x] 사용자 관리 페이지 (OWNER가 역할/채널 권한 설정, 사용자 삭제)
- [ ] API Rate Limiting

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
- ~~쿠팡 로켓배송 엑셀 파서~~ (불필요 — 제외)

### Phase 10 - Notion 연동 (CS 관리)
- [ ] Notion API Integration 설정
- [ ] CS 데이터베이스 조회/등록/수정 (양방향 동기화)
- [ ] CS 전용 페이지

### 설정 페이지
- [x] 테마 설정 (다크/라이트/시스템)
- [x] 기본값 설정 (기본 배송비, 무료배송 기준금액)
- [x] 채널 관리 바로가기
- [x] 데이터 관리 (업로드 이력 조회/삭제)
- [x] 프로필 설정 — 이름 변경, 비밀번호 변경 (Phase 8)
- [x] 사용자 관리 — 역할/채널 권한 설정, 사용자 삭제 (Phase 8)
- [ ] Notion 연동 설정 (Phase 10)

### Phase 11 - SaaS 전환 (다중 셀러 서비스)
> Phase 8 완료 후 진행. 현재 코드 구조(Prisma + Next.js API Route)에서 큰 변경 없이 전환 가능.

- [ ] ADMIN 역할 + 어드민 대시보드 (시스템 관리자 전용 — 전체 테넌트 현황, 매출 통계, 구독 관리, 셀러 정지/삭제)
- [ ] 테넌트 분리 (전체 테이블에 tenantId 추가, API에서 로그인 사용자의 tenantId 필터링)
- [ ] 셀러 회원가입 + 온보딩 (가입 시 tenant 자동 생성, 채널 등록 안내, 첫 업로드 가이드)
- [ ] 결제 연동 (토스페이먼츠 or Paddle — 월 구독 모델)
- [ ] 플랜 분리 (Basic: 채널 1개 + 3개월 / Pro: 채널 무제한 + 1년 + 자동 리포트)
- [ ] 랜딩 페이지 (서비스 소개, 요금제, 가입 유도)
- [ ] SNS 로그인 추가 (Google, Kakao — NextAuth.js Provider 추가로 대응)

---

## 보안 참고사항

> 현재는 단일 사용자 내부 도구로 운영 중이며, 다중 사용자 전환 시 아래 항목을 반드시 적용해야 합니다.

### 현재 안전한 부분

| 항목 | 방어 수단 |
|------|-----------|
| SQL Injection | Prisma ORM — 파라미터 바인딩 자동 처리 |
| XSS | React — JSX 출력 시 HTML escape 기본 적용 |
| CSRF | Next.js API Route — same-origin 요청만 허용 |
| 파일 업로드 | `.xlsx`만 허용, 서버에서 파싱 후 DB 저장 (파일 저장 안 함) |
| 환경 변수 | `NEXT_PUBLIC_`에 민감 정보 없음 (APP_NAME, APP_URL, HIDE_API_SYNC만 해당) |
| 비밀번호 해싱 | bcryptjs (hash rounds 12) |
| 인증 인프라 | NextAuth.js JWT + Middleware 페이지 보호 |

### 보안 감사 결과 (2026-03-24 기준)

#### 즉시 해결 필요 (높음)

| # | 항목 | 설명 | 해당 API |
|---|------|------|----------|
| ~~1~~ | ~~GET API 인증 누락~~ | ✅ 해결 — 전체 GET API에 `requireAuth()` 적용 완료 | - |
| ~~2~~ | ~~회원가입 통제 없음~~ | ✅ 해결 — 첫 사용자만 공개 가입, 이후 OWNER만 추가 가능 | - |
| ~~3~~ | ~~STAFF에 민감 데이터 노출~~ | ✅ 해결 — STAFF일 때 원가/마진/수수료율 응답에서 제거 (dashboard, report, orders, daily-sales, products) | - |
| ~~4~~ | ~~upload DELETE 인증 없음~~ | ✅ 해결 — `requireRole('OWNER', 'MANAGER')` 적용 | - |

#### 보안 헤더/설정 (중간)

| # | 항목 | 설명 |
|---|------|------|
| 5 | **보안 헤더 미설정** | next.config.mjs에 CSP, X-Frame-Options, HSTS 등 없음 → XSS, 클릭재킹 취약 |
| 6 | **빌드 에러 무시** | `ignoreBuildErrors: true`, `ignoreDuringBuilds: true` → 보안 문제가 빌드에서 감지 안 됨 |
| ~~7~~ | ~~채널 접근 검증 불완전~~ | ✅ 해결 — orders, daily-sales, ad-costs GET에도 checkChannelAccess + getChannelFilter 적용 |
| 8 | **비밀번호 정책 미흡** | 최소 6자만 검증, 복잡도 요구 없음. 재설정/변경 기능 없음 |

#### 개선 권장 (낮음)

| # | 항목 | 설명 |
|---|------|------|
| 9 | API Rate Limiting | 무한 반복 호출에 의한 DB 부하 방어 (ex: `next-rate-limit`, Vercel Edge Config) |
| 10 | 에러 메시지 상세 노출 | API 에러 응답에 내부 정보 포함 가능. 프로덕션에서는 일반 메시지로 대체 권장 |
| 11 | SessionProvider 갱신 설정 | 토큰 만료 시 자동 갱신 미설정 (NextAuth 기본값 사용) |

### API 인증/권한 현황

| API | GET | POST | PATCH | DELETE |
|-----|-----|------|-------|--------|
| dashboard | `requireAuth` + 채널 검증 | - | - | - |
| report | `requireAuth` + 채널 검증 | - | - | - |
| orders | `requireAuth` | - | - | - |
| daily-sales | `requireAuth` | - | - | - |
| products | `requireAuth` | `requireAuth` | `OWNER, MANAGER` | `OWNER, MANAGER` |
| channels | `requireAuth` | `OWNER` | `OWNER` | - |
| ad-costs | `requireAuth` | `OWNER, MANAGER` | - | `OWNER, MANAGER` |
| upload | `requireAuth` | `requireAuth` | - | `OWNER, MANAGER` |
| settings | `requireAuth` | - | `OWNER` | - |
| users | `OWNER` | - | `OWNER` | `OWNER` |
| user/profile | - | - | `requireAuth` | - |
| user/password | - | `requireAuth` | - | - |
| sync/smartstore | **인증 없음** | **인증 없음** | - | - |

### 환경 변수 보안

- `.env` 파일은 `.gitignore`에 포함되어 Git에 커밋되지 않음
- `NEXT_PUBLIC_` 접두사 변수는 클라이언트 번들에 노출됨 — 현재 `APP_NAME`, `APP_URL`, `HIDE_API_SYNC`만 해당하며 민감 정보 없음
- DB 연결 정보, API 키 등은 서버 전용 변수로 클라이언트에 노출되지 않음

---

## License

MIT License
