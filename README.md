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

| 채널 | 수집 방식 | 데이터 유형 | DB 테이블 |
|------|-----------|-------------|-----------|
| **스마트스토어** (다중 스토어 지원) | 엑셀 업로드 + API 자동 동기화 | 주문 단건 | `Order` |
| **쿠팡 윙** | 엑셀 업로드 (DeliveryList) | 주문 단건 | `Order` |
| **쿠팡 로켓그로스** | 엑셀 업로드 (Statistics) | 일별 상품 집계 | `DailySales` |

### DB 테이블 분리 설계

로켓그로스는 쿠팡 판매자센터에서 주문 단건이 아닌 **일별 상품별 판매 집계** 데이터만 제공합니다 (주문번호, 구매자, 배송상태 없음). 따라서 기존 `Order` 테이블에 넣지 않고 `DailySales` 테이블로 분리했습니다.

- **Order**: 주문 단건 데이터를 저장하는 채널 (스마트스토어, 쿠팡 윙)
- **DailySales**: 일별 집계 데이터를 저장하는 채널 (쿠팡 로켓그로스)
- 대시보드/리포트에서는 **두 테이블을 합산**하여 KPI, 차트, 상품별 마진에 표시
- 매출 관리에서는 **선택된 채널에 따라 OrderTable / DailySalesTable 전환** 표시

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

---

## 기술 스택

| 구분 | 기술 | 설명 |
|------|------|------|
| **Framework** | Next.js 14 (App Router) | React 기반 풀스택 프레임워크 |
| **Language** | TypeScript 5 | 타입 안정성 확보 |
| **Styling** | Tailwind CSS 3 + shadcn/ui | 유틸리티 CSS + Radix UI 기반 컴포넌트 |
| **Charts** | Recharts 3 | 매출/마진 추이, 채널별 비교, 상품별 순위 차트 |
| **Database** | PostgreSQL (Supabase) | 매니지드 PostgreSQL (서울 리전) |
| **ORM** | Prisma 5 | Type-safe 데이터베이스 ORM |
| **Excel** | xlsx-populate | 엑셀 파싱 + 암호화 엑셀 복호화 |
| **PDF** | jspdf + html2canvas-pro | PDF 리포트 생성 (한글 지원) |
| **Server State** | TanStack Query 5 | API 데이터 캐싱, 중복 요청 방지, 자동 갱신 |
| **Auth** | NextAuth.js 4 | Credentials Provider, JWT 세션, RBAC |
| **Error Monitoring** | Sentry (@sentry/nextjs 10) | 에러 자동 수집, Session Replay |
| **Testing** | Vitest 4 | 핵심 비즈니스 로직 단위 테스트 (22개) |

### 개발 도구

| 도구 | 용도 |
|------|------|
| **pnpm** | 패키지 매니저 |
| **ESLint + Prettier** | 코드 린팅 및 포맷팅 |
| **Prisma CLI** | DB 마이그레이션 및 스키마 관리 |
| **Vitest** | 단위 테스트 (`pnpm test`, `pnpm test:watch`) |

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
│       │   ├── coupang-parser.ts
│       │   ├── rocketgrowth-parser.ts
│       │   └── validate-format.ts  # 채널-양식 자동 검증
│       ├── helpers/                # 비즈니스 로직
│       │   ├── margin-calc.ts      # 마진 계산 (스마트스토어/쿠팡 윙)
│       │   ├── rg-margin-calc.ts   # 마진 계산 (로켓그로스, VAT 포함)
│       │   ├── date-utils.ts       # 날짜 유틸리티 (UTC→KST 변환)
│       │   ├── product-key.ts
│       │   └── __tests__/          # 단위 테스트 (Vitest)
│       ├── naver/
│       │   ├── commerce-api.ts     # 네이버 커머스 API (주문 동기화)
│       │   └── shopping-search.ts  # 네이버 쇼핑 API (키워드 순위)
│       └── services/
│           ├── order-processor.ts
│           ├── dailysales-processor.ts
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

## 배포 환경

| 구분 | 서비스 | 설명 |
|------|--------|------|
| **Frontend + API** | Vercel | https://oms-dun.vercel.app/ (대시보드/조회용) |
| **Database** | Supabase | 매니지드 PostgreSQL (서울 리전) |
| **주문 자동 동기화** | Windows 작업 스케줄러 | 매일 09:00 (네이버 API IP 제한) |
| **키워드 순위 자동 조회** | Windows 작업 스케줄러 | 매일 10:00 |
| **자동 리포트** | Windows 작업 스케줄러 | 매주 월요일 / 매월 1일 |

```
GitHub Push → Vercel Auto Deploy (main branch → Production)
```

> **참고**: 네이버/쿠팡 API는 IP 화이트리스트 제한으로 Vercel에서 호출 불가.
> API 동기화는 로컬 환경에서만 가능하며, Vercel에서는 `NEXT_PUBLIC_HIDE_API_SYNC=true`로 관련 UI를 숨김 처리.

---

## 보안

### 방어 현황

| 항목 | 방어 수단 |
|------|-----------|
| SQL Injection | Prisma ORM — 파라미터 바인딩 자동 처리 |
| XSS | React JSX escape + 보안 헤더 (X-XSS-Protection, X-Content-Type-Options) |
| 클릭재킹 | X-Frame-Options: DENY |
| CSRF | Next.js API Route — same-origin 요청만 허용 |
| HTTPS 강제 | Strict-Transport-Security (HSTS 1년) |
| 파일 업로드 | `.xlsx`만 허용, 서버에서 파싱 후 DB 저장 (파일 저장 안 함) |
| 비밀번호 | bcryptjs (rounds 12), 최소 8자 + 영문/숫자 필수 |
| 인증 | NextAuth.js JWT + Middleware 페이지 보호 + 전체 API `requireAuth()` |
| 권한 제어 | RBAC (OWNER/MANAGER/STAFF) + 채널별 접근 제한 (allowedChannels) |
| 민감 데이터 | STAFF 역할에 원가/마진/수수료율 API 응답에서 제거 |
| 회원가입 통제 | 첫 사용자만 공개 가입, 이후 OWNER만 추가 가능 |
| Rate Limiting | IP 기반 인메모리 (API 분당 60회, 로그인/회원가입 분당 10회) |

### API 인증/권한 현황

| API | GET | POST | PATCH | DELETE |
|-----|-----|------|-------|--------|
| dashboard | `requireAuth` + 채널 검증 | - | - | - |
| report | `requireAuth` + 채널 검증 | - | - | - |
| orders | `requireAuth` + 채널 검증 | - | - | - |
| daily-sales | `requireAuth` + 채널 검증 | - | - | - |
| products | `requireAuth` | `requireAuth` | `OWNER, MANAGER` | `OWNER, MANAGER` |
| channels | `requireAuth` | `OWNER` | `OWNER` | - |
| ad-costs | `requireAuth` + 채널 검증 | `OWNER, MANAGER` | - | `OWNER, MANAGER` |
| ad-budgets | `requireAuth` + 채널 검증 | `OWNER, MANAGER` | - | `OWNER, MANAGER` |
| upload | `requireAuth` | `requireAuth` | - | `OWNER, MANAGER` |
| keywords | `requireAuth` | `requireAuth` | `requireAuth` | `requireAuth` |
| settings | `requireAuth` | - | `OWNER` | - |
| users | `OWNER` | - | `OWNER` | `OWNER` |
| audit-logs | `OWNER` | - | - | - |
| user/profile | - | - | `requireAuth` | - |
| user/password | - | `requireAuth` | - | - |
| report/auto | 인증 없음 (스케줄러용) | - | - | - |
| report/generated | `requireAuth` | - | - | `OWNER, MANAGER` |
| sync/smartstore | 인증 없음 (스케줄러용) | 인증 없음 (스케줄러용) | - | - |
| keywords/check-all | - | 인증 없음 (스케줄러용) | - | - |

---

## TODO

### 미완료

#### Phase 10 - Notion 연동 (CS 관리)
- [ ] Notion API Integration 설정
- [ ] CS 데이터베이스 조회/등록/수정 (양방향 동기화)
- [ ] CS 전용 페이지

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

#### 기능 개선
- [ ] API 동기화 장기간 조회 분할 처리 — 7일 단위 자동 분할 + 토큰 갱신 (현재 1개월 조회 시 타임아웃/토큰 만료)
- [ ] 입력값 검증 개선 — Zod 스키마 검증 도입 (수동 if문 → 선언적 검증)

#### Phase 11 - SaaS 전환 (다중 셀러 서비스)
- [ ] ADMIN 역할 + 어드민 대시보드
- [ ] 테넌트 분리 (tenantId)
- [ ] 셀러 회원가입 + 온보딩
- [ ] 결제 연동 (토스페이먼츠 or Paddle)
- [ ] 플랜 분리 (Basic/Pro)
- [ ] 랜딩 페이지
- [ ] SNS 로그인 추가 (Google, Kakao)

### 완료된 Phase 목록

- **Phase 1~4**: 초기 설정, 레이아웃, 채널/상품/주문 관리, 대시보드 KPI/차트
- **Phase 5**: 마진 자동 계산, 수수료/배송비, 광고비 관리
- **Phase 6**: 리포트 (PDF/엑셀/차트), 자동 리포트
- **Phase 7**: Vercel 배포, 성능 최적화 (TanStack Query, 캐싱, 번들 분리), Sentry, 모바일 반응형
- **Phase 7.5**: 채널별 대시보드 필터
- **Phase 8**: 인증/권한 (NextAuth, RBAC, 채널 접근 제한, Rate Limiting)
- **Phase 9**: 네이버 API 자동 동기화, 쿠팡 엑셀 파서
- **Phase 9.5**: 키워드 순위 추적 (네이버 쇼핑 API, 자동 스케줄링)
- **추가 개선**: KPI 이전 기간 비교, ROAS, 중복 업로드 방지, 감사 로그, 단위 테스트, API 응답 표준화, 당일 데이터 차단, 취소/반품/교환 매출 제외, CDN 캐시 제거
- **대시보드 개편**: 탭 분리 (월별 매출 데이터 + 매출 대시보드), 월 선택기, 채널별 색상 구분, 브랜드별 판매 갯수
- **매출 관리 개편**: 탭 분리 (API 동기화 + 엑셀 업로드), 데이터 수집 이력 로그, 신규상품 팝업에 브랜드 분류 추가
- **일별 매출 시간대 수정**: UTC→KST 변환으로 일별 집계 정확도 개선 (자정~오전 9시 주문이 전날로 밀리던 버그 수정)
- **React Query 전역 캐시 수정**: staleTime/refetchOnWindowFocus 기본값 복원으로 페이지 전환 시 데이터 불일치 해결
- **다중 스마트스토어 연동**: 채널 코드별 API 키 분기, 동기화 시 스토어 선택 가능, 자동 동기화(GET) 모든 스토어 순회
- **광고 손익분기**: 상품별 월 광고비 대비 손익분기 계산기, ProductAdBudget 테이블, 대시보드 탭(상품 카드 + 지표 + 달성률 프로그레스바), 메인 키워드 설정 + 월별 순위 에어리어 차트, 같은 상품명 전체 옵션 판매 수량 합산
- **코드 품질 개선**: Prettier 포맷팅 전체 적용 (64개 파일), JSX unescaped entities 수정, 타입 에러 수정 — Vercel 빌드 실패 해결
- **글로벌 로딩 오버레이**: API 호출/데이터 조회 시 전체 화면 로딩 표시 (TanStack Query 자동 감지, 클릭 차단)
- **날짜 KST 통일**: 키워드 순위 조회, 월별 대시보드, 자동 리포트의 날짜 기준을 UTC→KST로 수정 (Vercel 배포 환경 대응)
- **키워드 순위 추적 UI 개선**: 광고 손익분기 카드 하단 키워드 순위 추적 버튼 가시성 향상 (텍스트 확대, 아이콘 추가, 클릭 영역 확대)

---

## License

MIT License
