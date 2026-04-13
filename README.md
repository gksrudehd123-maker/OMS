# OMS - Online Commerce Margin & Sales Automation System

> 온라인 커머스 매출 및 마진 자동화 대시보드 시스템

---

## 프로젝트 개요

온라인 커머스 채널(스마트스토어, 쿠팡 등)의 매출 데이터를 통합 관리하고, 마진율을 자동 계산하여 실시간 대시보드로 시각화하는 시스템입니다.

### 핵심 기능

- **매출 대시보드**: 일별 매출/마진 추이, KPI 카드 (이전 기간 대비 증감률), 채널별 비교 차트
- **마진 자동 계산**: 원가, 수수료, 배송비를 반영한 순마진 자동 산출
- **채널별 분석**: 판매 채널별 매출/마진 비교 (스마트스토어, 쿠팡 윙, 쿠팡 로켓그로스)
- **상품별 분석**: 상품 단위 수익성 분석 및 마진 Top 10
- **데이터 수집**: 엑셀 업로드 + 네이버 API 자동 동기화 (당일 데이터 업로드 차단), 수집 이력 로그
- **매출 합산 규칙**: 취소/취소완료/반품/교환 주문은 매출에서 자동 제외
- **광고비 관리**: 채널+날짜별 광고비 입력, ROAS 분석
- **광고 손익분기**: 상품별 월 광고비 대비 손익분기 수량 계산, 실제 판매 대비 달성률 추적, 대시보드 탭
- **키워드 순위 추적**: 네이버 쇼핑 키워드 순위 조회 + 일별 추이 에어리어 차트 + 메인 키워드 설정
- **리포트 생성**: PDF/엑셀 리포트 다운로드 + 주간/월간 자동 리포트
- **인증/권한**: 로그인 + RBAC (OWNER/MANAGER/STAFF) + 채널별 접근 제한
- **감사 로그**: 데이터 변경 이력 추적 (생성/수정/삭제/업로드/동기화)

---

## 지원 채널 및 데이터 구조

### 채널별 데이터 수집 방식

| 채널                                | 수집 방식                     | 데이터 유형             | DB 테이블             |
| ----------------------------------- | ----------------------------- | ----------------------- | --------------------- |
| **스마트스토어** (다중 스토어 지원) | 엑셀 업로드 + API 자동 동기화 | 주문 단건               | `Order`               |
| **쿠팡 윙**                         | 엑셀 업로드 (SELLER_INSIGHTS) | 일별 집계 + 마케팅 지표 | `CoupangDailyMetrics` |
| **쿠팡 로켓그로스**                 | 엑셀 업로드 (Statistics)      | 일별 상품 집계          | `DailySales`          |

### DB 테이블 분리 설계

로켓그로스는 쿠팡 판매자센터에서 주문 단건이 아닌 **일별 상품별 판매 집계** 데이터만 제공합니다 (주문번호, 구매자, 배송상태 없음). 따라서 기존 `Order` 테이블에 넣지 않고 `DailySales` 테이블로 분리했습니다.

- **Order**: 주문 단건 데이터를 저장하는 채널 (스마트스토어)
- **DailySales**: 일별 집계 데이터를 저장하는 채널 (쿠팡 로켓그로스)
- **CoupangDailyMetrics**: 일별 집계 + 마케팅 지표를 저장하는 채널 (쿠팡 윙) — 방문자, 조회, 장바구니, 구매전환율 포함
- 대시보드/리포트에서는 **세 테이블을 합산**하여 KPI, 차트, 상품별 마진에 표시
- 매출 관리에서는 **선택된 채널에 따라 OrderTable / DailySalesTable / CWMetricsTable 전환** 표시

### 엑셀 파서별 처리 흐름

```
스마트스토어 (.xlsx)  → smartstore-parser    → order-processor         → Order 테이블
쿠팡 윙 (.xlsx)       → coupangwing-parser   → coupangwing-processor   → CoupangDailyMetrics 테이블
로켓그로스 (.xlsx)    → rocketgrowth-parser  → dailysales-processor    → DailySales 테이블
```

### 쿠팡 윙 엑셀 파서 현황

- **파서**: `coupangwing-parser.ts` — SELLER_INSIGHTS (판매통계) 엑셀 파일 파싱
- **주요 컬럼**: 옵션 ID, 옵션명, 상품명, 등록상품ID, 카테고리, 판매방식, 매출(원), 주문, 판매량, 방문자, 조회, 장바구니, 구매전환율, 아이템위너 비율(%), 총 매출(원), 총 판매수, 총 취소 금액(원), 총 취소된 상품수, 즉시 취소된 상품수
- **특이사항**:
  - 주문 단건이 아닌 **일별 상품별 집계 + 마케팅 지표** (방문자, 조회, 장바구니, 구매전환율)
  - 업로드 시 **판매 날짜를 사용자가 직접 선택** (엑셀에 날짜 정보 없음, 기본값 어제)
  - 쿠팡 통합 계정이라 **모든 브랜드(방짜/웰스파) 상품이 한 파일에 포함**
- **중복 방지**: `(date, optionId, channelId)` 유니크 제약
- **매출 관리**: 전용 CWMetricsTable로 마케팅 지표까지 표시

### 쿠팡 로켓그로스 엑셀 파서 현황

- **파서**: `rocketgrowth-parser.ts` — 판매통계 엑셀 파일 파싱
- **암호화**: 기본 비밀번호 `1234`
- **주요 컬럼**: 노출상품ID, 옵션ID, 옵션명, 상품타입, 카테고리, 아이템위너 비율(%), 순 판매 금액/수, 전체 거래 금액/수, 총 취소 금액/수, 즉시 취소 수
- **특이사항**:
  - 주문 단건이 아닌 **일별 상품별 집계 데이터** (주문번호, 구매자, 배송상태 없음)
  - 업로드 시 **판매 날짜를 사용자가 직접 선택** (엑셀에 날짜 정보 없음)
  - TOTAL 행 자동 필터링 (`exposureProductId === 'TOTAL'`)
  - 아이템위너 비율 % 문자열 → 숫자 변환
- **중복 방지**: `(date, optionId, channelId)` 유니크 제약
- **상품 필드 차이**: 판매가/배송비 대신 수수료율(`feeRate`), 입출고배송비(`fulfillmentFee`), 판매자할인쿠폰(`couponDiscount`) 사용

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

---

## 기술 스택

| 구분                 | 기술                       | 설명                                          |
| -------------------- | -------------------------- | --------------------------------------------- |
| **Framework**        | Next.js 14 (App Router)    | React 기반 풀스택 프레임워크                  |
| **Language**         | TypeScript 5               | 타입 안정성 확보                              |
| **Styling**          | Tailwind CSS 3 + shadcn/ui | 유틸리티 CSS + Radix UI 기반 컴포넌트         |
| **Charts**           | Recharts 3                 | 매출/마진 추이, 채널별 비교, 상품별 순위 차트 |
| **Database**         | PostgreSQL (Supabase)      | 매니지드 PostgreSQL (서울 리전)               |
| **ORM**              | Prisma 5                   | Type-safe 데이터베이스 ORM                    |
| **Excel**            | xlsx-populate              | 엑셀 파싱 + 암호화 엑셀 복호화                |
| **PDF**              | jspdf + html2canvas-pro    | PDF 리포트 생성 (한글 지원)                   |
| **Server State**     | TanStack Query 5           | API 데이터 캐싱, 중복 요청 방지, 자동 갱신    |
| **Auth**             | NextAuth.js 4              | Credentials Provider, JWT 세션, RBAC          |
| **Error Monitoring** | Sentry (@sentry/nextjs 10) | 에러 자동 수집, Session Replay                |
| **Testing**          | Vitest 4                   | 핵심 비즈니스 로직 단위 테스트 (22개)         |

### 개발 도구

| 도구                  | 용도                                         |
| --------------------- | -------------------------------------------- |
| **pnpm**              | 패키지 매니저                                |
| **ESLint + Prettier** | 코드 린팅 및 포맷팅                          |
| **Prisma CLI**        | DB 마이그레이션 및 스키마 관리               |
| **Vitest**            | 단위 테스트 (`pnpm test`, `pnpm test:watch`) |

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

# 테스트 실행
pnpm test
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

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...                # openssl rand -base64 32

# 네이버 커머스 API (스마트스토어 — 다중 스토어 지원)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
NAVER_CLIENT_ID_WELSPA=...              # 추가 스토어 (채널 코드: SMARTSTORE_WELSPA)
NAVER_CLIENT_SECRET_WELSPA=...          # $문자는 \$로 이스케이프 필수

# 네이버 검색 API (키워드 순위 조회)
NAVER_SEARCH_CLIENT_ID=...
NAVER_SEARCH_CLIENT_SECRET=...
NAVER_STORE_NAME=...
```

---

## 디렉토리 구조

```
OMS/
├── scripts/                        # 자동화 스크립트 (Windows 작업 스케줄러)
│   ├── auto-sync.bat               # 스마트스토어 주문 자동 동기화 (매일 09:00)
│   ├── auto-report.bat             # 자동 리포트 생성
│   └── auto-keyword-check.bat      # 키워드 순위 자동 조회 (매일 10:00)
├── prisma/
│   ├── schema.prisma               # DB 스키마
│   └── migrations/                 # 마이그레이션 파일
├── src/
│   ├── app/
│   │   ├── (dashboard)/            # 대시보드 레이아웃 그룹
│   │   │   ├── page.tsx            # 메인 대시보드
│   │   │   ├── sales/              # 매출 관리 (업로드 + API 동기화)
│   │   │   ├── products/           # 상품 관리 + 키워드 순위
│   │   │   ├── channels/           # 채널 관리
│   │   │   ├── ad-costs/           # 광고비 관리
│   │   │   ├── reports/            # 리포트 + 자동 리포트 이력
│   │   │   ├── margins/            # 마진 분석
│   │   │   ├── users/              # 사용자 관리 (OWNER 전용)
│   │   │   ├── audit-logs/         # 감사 로그 (OWNER 전용)
│   │   │   └── settings/           # 설정
│   │   ├── api/                    # API Route Handlers
│   │   │   ├── auth/               # 인증 (NextAuth, 회원가입)
│   │   │   ├── dashboard/          # 대시보드 KPI + 차트
│   │   │   ├── orders/             # 주문 조회
│   │   │   ├── daily-sales/        # 판매 조회 (로켓그로스)
│   │   │   ├── products/           # 상품 CRUD
│   │   │   ├── channels/           # 채널 CRUD
│   │   │   ├── upload/             # 엑셀 업로드
│   │   │   ├── sync/smartstore/    # 스마트스토어 API 동기화
│   │   │   ├── ad-costs/           # 광고비 CRUD
│   │   │   ├── keywords/           # 키워드 순위 추적
│   │   │   ├── report/             # 리포트 생성/다운로드
│   │   │   ├── audit-logs/         # 감사 로그 조회
│   │   │   ├── users/              # 사용자 관리
│   │   │   ├── user/               # 프로필 + 비밀번호
│   │   │   └── settings/           # 설정 API
│   │   ├── login/                  # 로그인 페이지
│   │   └── register/               # 회원가입 페이지 (첫 사용자 전용)
│   ├── components/
│   │   ├── ui/                     # shadcn/ui + 공통 UI
│   │   ├── layout/                 # 사이드바, 헤더
│   │   ├── common/                 # 날짜 필터, 채널 필터
│   │   ├── charts/                 # 대시보드 차트
│   │   ├── dashboard/              # 월별 매출 탭, 매출 대시보드 탭
│   │   ├── sales/                  # 주문/판매 테이블, 업로드 존, 수집 이력
│   │   ├── products/               # 키워드 순위 탭, 차트, 브랜드 분류
│   │   └── providers/              # Theme, Query, Session Provider
│   └── lib/
│       ├── prisma.ts               # Prisma 클라이언트
│       ├── auth.ts                 # NextAuth 설정
│       ├── auth-guard.ts           # API 인증/권한 미들웨어
│       ├── api-response.ts         # 표준 API 응답 헬퍼
│       ├── audit-log.ts            # 감사 로그 헬퍼
│       ├── rate-limit.ts           # IP 기반 Rate Limiter
│       ├── excel/                  # 엑셀 파서
│       │   ├── smartstore-parser.ts
│       │   ├── coupangwing-parser.ts  # 쿠팡 윙 SELLER_INSIGHTS
│       │   ├── rocketgrowth-parser.ts
│       │   └── validate-format.ts  # 채널-양식 자동 검증
│       ├── helpers/                # 비즈니스 로직
│       │   ├── margin-calc.ts      # 마진 계산 (스마트스토어/쿠팡 윙)
│       │   ├── rg-margin-calc.ts   # 마진 계산 (로켓그로스, VAT 포함)
│       │   ├── channel-colors.ts   # 채널별 고정 색상 매핑
│       │   ├── date-utils.ts       # 날짜 유틸리티 (UTC→KST 변환)
│       │   ├── product-key.ts
│       │   └── __tests__/          # 단위 테스트 (Vitest)
│       ├── naver/
│       │   ├── commerce-api.ts     # 네이버 커머스 API (주문 동기화)
│       │   └── shopping-search.ts  # 네이버 쇼핑 API (키워드 순위)
│       └── services/
│           ├── order-processor.ts
│           ├── dailysales-processor.ts
│           ├── coupangwing-processor.ts
│           └── report-generator.ts
├── vitest.config.ts                # Vitest 설정
├── .env.example
└── README.md
```

---

## 데이터 모델

```
┌──────────────────┐     ┌──────────────┐     ┌──────────────┐
│     Product       │     │   Channel    │     │    AdCost    │
├──────────────────┤     ├──────────────┤     ├──────────────┤
│ id                │     │ id           │     │ channelId FK │
│ name              │     │ name         │     │ date         │
│ optionInfo        │     │ code         │     │ cost         │
│ productKey        │     │ feeRate      │     │ memo         │
│ costPrice         │     │ isActive     │     └──────────────┘
│ sellingPrice      │     └──────┬───────┘
│ feeRate           │            │
│ shippingCost      │     ┌──────┴──────┐
│ freeShipMin       │     │   Upload    │
│ couponDiscount ★  │     ├─────────────┤
│ fulfillmentFee ★  │     │ fileName    │
│ storeProductId    │     │ channelId FK│
│ thumbnailUrl      │     │ totalRows   │
│ isActive          │     └──┬──────┬───┘
└──────┬────────────┘        │      │
       │              ┌──────┴──┐  ┌┴──────────────────────┐
       │              │  Order  │  │     DailySales ★      │
       │              └─────────┘  └────────────────────────┘

┌──────────────────┐  ┌──────────────┐  ┌────────────────────┐
│      User        │  │   Setting    │  │  GeneratedReport   │
├──────────────────┤  ├──────────────┤  ├────────────────────┤
│ email (unique)   │  │ key          │  │ type               │
│ password (hash)  │  │ value        │  │ periodFrom / To    │
│ name             │  └──────────────┘  │ reportData (JSON)  │
│ role (enum)      │                     └────────────────────┘
│ allowedChannels  │
└──────────────────┘  ┌──────────────────┐  ┌──────────────┐
                      │  ProductKeyword  │  │  AuditLog    │
Role: OWNER |         ├──────────────────┤  ├──────────────┤
  MANAGER | STAFF     │ productId FK     │  │ userId       │
                      │ keyword          │  │ userName     │
                      │ isMain           │  │ action       │
                      │ ranks[]          │  │ target       │
                      └──────────────────┘  │ summary      │
                      ┌──────────────────┐  │ changes (JSON│
                      │   KeywordRank    │  └──────────────┘
                      ├──────────────────┤
                      │ keywordId FK     │  ┌───────────────────┐
                      │ rank / page      │  │ ProductAdBudget   │
                      │ date             │  ├───────────────────┤
                      └──────────────────┘  │ month             │
                                            │ channelId FK      │
                                            │ productId FK      │
                                            │ adCost            │
                                            │ memo              │
                                            └───────────────────┘
★ = 로켓그로스 전용
```

### Product 모델 필드 용도

| 필드              | 스마트스토어/쿠팡 윙                        | 쿠팡 로켓그로스                     |
| ----------------- | ------------------------------------------- | ----------------------------------- |
| `costPrice`       | 원가                                        | 원가                                |
| `sellingPrice`    | 판매가                                      | 사용 안 함 (엑셀에서 판매금액 제공) |
| `feeRate`         | 개별 수수료율 (채널 기본 수수료 오버라이드) | 판매수수료율 (10.8%, 7.8% 등)       |
| `shippingCost`    | 기본 배송비                                 | 사용 안 함                          |
| `freeShippingMin` | 무료배송 기준금액                           | 사용 안 함                          |
| `couponDiscount`  | 사용 안 함                                  | 판매자할인쿠폰 (개당)               |
| `fulfillmentFee`  | 사용 안 함                                  | 입출고배송비 (개당)                 |

---

## 배포 환경

| 구분                      | 서비스                | 설명                                          |
| ------------------------- | --------------------- | --------------------------------------------- |
| **Frontend + API**        | Vercel                | https://oms-dun.vercel.app/ (대시보드/조회용) |
| **Database**              | Supabase              | 매니지드 PostgreSQL (서울 리전)               |
| **주문 자동 동기화**      | Windows 작업 스케줄러 | 매일 09:00 (네이버 API IP 제한)               |
| **키워드 순위 자동 조회** | Windows 작업 스케줄러 | 매일 10:00                                    |
| **자동 리포트**           | Windows 작업 스케줄러 | 매주 월요일 / 매월 1일                        |

```
GitHub Push → Vercel Auto Deploy (main branch → Production)
```

> **참고**: 네이버/쿠팡 API는 IP 화이트리스트 제한으로 Vercel에서 호출 불가.
> API 동기화는 로컬 환경에서만 가능하며, Vercel에서는 `NEXT_PUBLIC_HIDE_API_SYNC=true`로 관련 UI를 숨김 처리.

---

## 보안

### 방어 현황

| 항목          | 방어 수단                                                               |
| ------------- | ----------------------------------------------------------------------- |
| SQL Injection | Prisma ORM — 파라미터 바인딩 자동 처리                                  |
| XSS           | React JSX escape + 보안 헤더 (X-XSS-Protection, X-Content-Type-Options) |
| 클릭재킹      | X-Frame-Options: DENY                                                   |
| CSRF          | Next.js API Route — same-origin 요청만 허용                             |
| HTTPS 강제    | Strict-Transport-Security (HSTS 1년)                                    |
| 파일 업로드   | `.xlsx`만 허용, 서버에서 파싱 후 DB 저장 (파일 저장 안 함)              |
| 비밀번호      | bcryptjs (rounds 12), 최소 8자 + 영문/숫자 필수                         |
| 인증          | NextAuth.js JWT + Middleware 페이지 보호 + 전체 API `requireAuth()`     |
| 권한 제어     | RBAC (OWNER/MANAGER/STAFF) + 채널별 접근 제한 (allowedChannels)         |
| 민감 데이터   | STAFF 역할에 원가/마진/수수료율 API 응답에서 제거                       |
| 회원가입 통제 | 첫 사용자만 공개 가입, 이후 OWNER만 추가 가능                           |
| Rate Limiting | IP 기반 인메모리 (API 분당 60회, 로그인/회원가입 분당 10회)             |

### API 인증/권한 현황

| API                | GET                       | POST                   | PATCH            | DELETE           |
| ------------------ | ------------------------- | ---------------------- | ---------------- | ---------------- |
| dashboard          | `requireAuth` + 채널 검증 | -                      | -                | -                |
| report             | `requireAuth` + 채널 검증 | -                      | -                | -                |
| orders             | `requireAuth` + 채널 검증 | -                      | -                | -                |
| daily-sales        | `requireAuth` + 채널 검증 | -                      | -                | -                |
| products           | `requireAuth`             | `requireAuth`          | `OWNER, MANAGER` | `OWNER, MANAGER` |
| channels           | `requireAuth`             | `OWNER`                | `OWNER`          | -                |
| ad-costs           | `requireAuth` + 채널 검증 | `OWNER, MANAGER`       | -                | `OWNER, MANAGER` |
| ad-budgets         | `requireAuth` + 채널 검증 | `OWNER, MANAGER`       | -                | `OWNER, MANAGER` |
| upload             | `requireAuth`             | `requireAuth`          | -                | `OWNER, MANAGER` |
| keywords           | `requireAuth`             | `requireAuth`          | `requireAuth`    | `requireAuth`    |
| settings           | `requireAuth`             | -                      | `OWNER`          | -                |
| users              | `OWNER`                   | -                      | `OWNER`          | `OWNER`          |
| audit-logs         | `OWNER`                   | -                      | -                | -                |
| user/profile       | -                         | -                      | `requireAuth`    | -                |
| user/password      | -                         | `requireAuth`          | -                | -                |
| report/auto        | 인증 없음 (스케줄러용)    | -                      | -                | -                |
| report/generated   | `requireAuth`             | -                      | -                | `OWNER, MANAGER` |
| sync/smartstore    | 인증 없음 (스케줄러용)    | 인증 없음 (스케줄러용) | -                | -                |
| keywords/check-all | -                         | 인증 없음 (스케줄러용) | -                | -                |

---

## TODO

### 미완료

#### 대시보드 개편 — 탭 분리 (월별 매출 데이터 + 매출 대시보드)

- [x] 대시보드 탭 UI 구성 (상품관리와 동일한 방식)
  - 탭 1: **월별 매출 데이터** (기본 탭)
  - 탭 2: **매출 대시보드** (기존 대시보드 그대로 이동)
- [x] 월 선택기 (기본값: 현재 월, 당월 데이터 없으면 전월 자동 표시)
- [x] 월 전체 요약 KPI — 매출, 마진, 총 광고비, 총 주문건수 (전 채널 합산)
- [x] 일별 매출 그래프 — 해당 월 전체 날짜, 채널별 색상 구분 스택 바 차트
- [x] 채널별 매출 (스마트스토어 + 향후 쿠팡/로켓그로스)
- [x] 채널별 광고비
- [x] 브랜드별 판매 갯수 — 브랜드 분류 (방짜/웰스파/카모도) + 세부 카테고리별 카운트
- [ ] 잡비용(마케팅 비용) 테이블 — 문자비용 등 외부 데이터 연동 (추후 구현)

#### 문자 발송 기능 (알리고 SMS API)

> **진행 상태 (2026-04-13):** 알리고 회원가입 + 본인인증 완료. 발신번호 등록 신청 대기 중(승인 1영업일). 발신번호 승인 후 코드 구현 착수 예정.

**Phase 1 — 인프라 준비 (가입 전 선행 가능)**

- [x] Prisma `SmsLog` 모델 추가 (수신자, 템플릿ID, 본문, 상태, 응답코드, 발송자, 타임스탬프)
- [x] `MessageTemplate.channel` 필드 추가 (SMS/LMS/KAKAO 구분, 카카오 알림톡 대비)
- [x] `.env.example`에 `ALIGO_API_KEY`, `ALIGO_USER_ID`, `ALIGO_SENDER`, `ALIGO_TEST_MODE` 추가
- [x] `src/lib/aligo.ts` 알리고 REST 클라이언트 (패키지 미사용, fetch 직접 호출)
  - `sendSms()`: 단문(SMS, 90바이트)/장문(LMS) 자동 판별
  - `getRemainingQuota()`: 잔여 건수 조회
  - `/send_test/` 엔드포인트로 테스트 모드 지원

**Phase 2 — API 라우트**

- [ ] `POST /api/sms/send` — 발송 (requireAuth, 감사 로그 기록)
- [ ] `GET /api/sms/logs` — 발송 이력 조회 (페이징, 고객명/전화번호 필터)
- [ ] `GET /api/sms/quota` — 잔여 건수

**Phase 3 — UI (CS 페이지 통합)**

- [x] 메시지 템플릿 관리 페이지 (생성/수정/삭제, {{고객명}} 등 변수 지원)
- [ ] CS 목록 행에 "문자발송" 버튼 추가 → 모달 오픈
- [ ] 발송 모달: 템플릿 선택 → 변수 입력 → 미리보기(바이트 수/SMS/LMS 표시) → 발송
- [ ] 발송 이력 탭 (CS 페이지 4번째 탭 or 별도 `/sms` 페이지 — 월요일 결정)

**Phase 4 — 실계정 연동 (사용자 작업 필요)**

- [x] 알리고 회원가입 (smartsms.aligo.in) + 핸드폰 본인인증
- [x] 발신번호 등록 + 승인 완료
- [x] API Key 발급 (마이페이지 → API 문자서비스)
- [ ] 충전 (SMS 약 8.4원/건, LMS 약 25원/건, 최소 1만원)
- [ ] `/send_test/`로 테스트 → `/send/`로 실발송 검증

#### Phase 11 - SaaS 전환 (다중 셀러 서비스)

- [ ] ADMIN 역할 + 어드민 대시보드
- [ ] 입력값 검증 개선 — Zod 스키마 검증 도입 (수동 if문 → 선언적 검증)
- [ ] 테넌트 분리 (tenantId)
- [ ] 셀러 회원가입 + 온보딩
- [ ] 결제 연동 (토스페이먼츠 or Paddle)
- [ ] 플랜 분리 (Basic/Pro)
- [ ] 랜딩 페이지
- [ ] SNS 로그인 추가 (Google, Kakao)

### 완료된 작업 이력

#### 핵심 기능 구현

| 날짜  | 영역     | 내용                                                                         |
| ----- | -------- | ---------------------------------------------------------------------------- |
| 03-18 | 기반     | 초기 설정, 레이아웃, 채널/상품/주문 관리                                     |
| 03-18 | 대시보드 | KPI 카드, 매출 추이 차트, 상품별 마진 Top 10                                 |
| 03-18 | 마진     | 마진 자동 계산, 수수료/배송비, 광고비 관리                                   |
| 03-18 | 리포트   | PDF/엑셀 리포트 다운로드, 차트 시각화                                        |
| 03-18 | 배포     | Vercel 배포, Sentry 에러 모니터링                                            |
| 03-19 | 성능     | TanStack Query 전 페이지 적용, 로딩 UX (ProgressBar + Skeleton)              |
| 03-19 | 데이터   | 쿠팡 윙/로켓그로스 엑셀 파서, 채널별 비교 차트                               |
| 03-24 | 인증     | NextAuth, RBAC (OWNER/MANAGER/STAFF), 채널 접근 제한, Rate Limiting          |
| 03-24 | 리포트   | 매주/매월 자동 리포트 생성                                                   |
| 03-24 | 대시보드 | 채널별 대시보드 필터                                                         |
| 03-25 | 키워드   | 네이버 쇼핑 키워드 순위 추적, 일별 추이 차트, 자동 스케줄링                  |
| 03-25 | 대시보드 | KPI 이전 기간 비교, ROAS 분석                                                |
| 03-26 | 보안     | 감사 로그(Audit Log), 단위 테스트 22개, API 응답 표준화                      |
| 03-26 | 데이터   | 당일 데이터 업로드 차단, 취소/반품/교환 매출 제외, CDN 캐시 제거             |
| 03-27 | 대시보드 | 탭 분리 (월별 매출 데이터 + 매출 대시보드), 월 선택기, 브랜드별 판매 갯수    |
| 03-27 | 매출관리 | 탭 분리 (API 동기화 + 엑셀 업로드), 수집 이력 로그                           |
| 03-27 | 연동     | 다중 스마트스토어 API 동기화 (웰스파 스토어 연동)                            |
| 03-31 | 광고     | 상품별 월 광고비 손익분기 계산기, 달성률 프로그레스바, 메인 키워드 순위 차트 |

#### 개선 및 버그 수정

| 날짜  | 영역     | 내용                                                                                    |
| ----- | -------- | --------------------------------------------------------------------------------------- |
| 03-27 | 버그     | UTC→KST 변환으로 일별 집계 정확도 개선 (자정~오전 9시 주문 밀림 수정)                   |
| 04-01 | 코드     | Prettier 포맷팅 전체 적용 (64개 파일), 타입 에러 수정, Vercel 빌드 복구                 |
| 04-01 | UX       | 글로벌 로딩 오버레이 (TanStack Query 자동 감지, 클릭 차단)                              |
| 04-01 | 버그     | 날짜 기준 KST 통일 (키워드 순위, 월별 대시보드, 자동 리포트)                            |
| 04-01 | UX       | 사이드바 메뉴 그룹화 (채널 분석/사용자 관리/감사 로그 → 설정 드롭다운)                  |
| 04-01 | UX       | 키워드 순위 추적 버튼 가시성 향상 (텍스트 확대, 아이콘 추가)                            |
| 04-01 | 연동     | API 동기화 조회 기간 7일 제한, 하루 단위 분할 호출 + 진행률 표시                        |
| 04-02 | 광고     | 손익분기 탭 진입 시 미조회 키워드 자동 감지 → 순차 조회 + 진행률 표시                   |
| 04-02 | 업로드   | 로켓그로스 파일명에서 날짜 자동 추출, 판매가 자동 계산, 신규 상품 팝업 UX 개선          |
| 04-02 | 마진     | 상품관리 예상 마진 실제 반영 (RG: VAT 포함, SS/CW: 수수료+배송비), 브랜드별 채널 분리   |
| 04-03 | 데이터   | orderDate DateTime→Date 마이그레이션 (KST 날짜만 저장)                                  |
| 04-03 | UX       | 채널별 차트 색상 통일 (SS=Blue, CW=Green, RG=Amber)                                     |
| 04-03 | 버그     | 광고 손익분기 판매 수량 매칭을 channelProductId 기준으로 변경                           |
| 04-03 | 데이터   | 쿠팡 윙 SELLER_INSIGHTS 전환 — CoupangDailyMetrics 테이블 + 마케팅 지표                 |
| 04-06 | 검증     | 쿠팡 윙 실데이터 검증 완료 (SELLER_INSIGHTS 19건, 에러 0건)                             |
| 04-06 | UX       | 업로드 에러 토스트 → Dialog 팝업 전환, 드래그 영역 확대                                 |
| 04-07 | CS       | CS(A/S) 관리 기능 — 접수/수정/삭제, 상태별 필터, 월별/검색, 전체 필드 테이블            |
| 04-07 | 권한     | STAFF 역할 메뉴 제한 (CS 관리만 표시), 로그인 시 /cs 리다이렉트                         |
| 04-07 | UX       | 회원가입 버튼 → 관리자 문의 안내, 개발환경 Rate Limit 비활성화                          |
| 04-07 | 정리     | Notion API 설정/로드맵 제거, samples 폴더 gitignore 추가                                |
| 04-07 | CS       | 테이블 컬럼 리사이즈 + 드래그 순서 변경, 전화번호 자동 포맷, 등록 UX 개선, 헤더 고정    |
| 04-08 | 권한     | MANAGER 역할 페이지 접근 제한 (광고비/리포트/채널/사용자/감사로그 차단, API는 허용)     |
| 04-08 | 권한     | STAFF/MANAGER 설정 페이지 접근 허용 (프로필+테마만 표시, 비밀번호 변경 가능)            |
| 04-08 | UX       | CS 관리 테이블 넓이 오버플로우 수정 (레이아웃 min-w-0 + overflow-x-hidden)              |
| 04-08 | 마진     | 수수료 계산 10원 단위 올림 처리 (스마트스토어/쿠팡윙/로켓그로스 공통 적용)              |
| 04-08 | 대시보드 | 월별 매출 데이터 — 채널별 매출 테이블 추가 (매출/마진/마진율/주문수)                    |
| 04-08 | 마진     | 마진 분석 페이지 useQuery 전환 (글로벌 로딩 오버레이 자동 감지)                         |
| 04-08 | CS       | 등록 폼에 진행상태 필드 추가, 테이블에서 주소/전화번호 컬럼 제거 (수정 모드에서만 표시) |
| 04-08 | CS       | 상담내용/A/S 진행상황 클릭 팝오버, 고객명 강조, 상담날짜 최근 색상 표시                 |
| 04-08 | CS       | 보기 모드 추가 (목록/월별/상태별 그룹핑), 월별 필터 제거, 접기/펼치기 지원              |
| 04-09 | 자동화   | Vercel Cron으로 키워드 순위 자동 조회 (매일 09:00 KST, PC 꺼져도 동작)                  |
| 04-09 | CS       | 고객 관리 탭 개편 — CS 목록/메시지 템플릿/상품 정보 탭 분리, 탭 상태 URL 유지           |
| 04-09 | CS       | 메시지 템플릿 CRUD ({{변수}} 자동 감지, 미리보기, 카드 UI)                              |
| 04-09 | CS       | 상품 정보 카탈로그 — 브랜드별 탭, 카드 목록, 이미지 업로드, 상세 팝업                   |
| 04-09 | CS       | 상품 상세 — 구성품(개별 링크), FAQ(접기/펼치기), CS 이력 연동                           |
| 04-09 | 권한     | STAFF 미들웨어에 message-templates/cs-products/og-image API 허용 추가                   |
| 04-11 | CS       | 상품 카드 컴팩트화 (그리드 8열까지), 브랜드 배지 제거 → 스토어 바로가기, 최저가 표시    |
| 04-11 | CS       | 상품 옵션(패키지) 모델 추가 — 단품/싱글세트/더블세트 등 구성별 가격/포함품 관리         |
| 04-11 | CS       | 구성품 카드 그리드 + 이미지 업로드 + 스펙(freeform) 필드 추가                           |

---

## License

MIT License
