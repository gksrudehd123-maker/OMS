-- 기존 orderDate(timestamp)를 KST 기준 날짜로 변환 후 DATE 타입으로 변경
-- Step 1: 시간 정보를 KST 기준 날짜로 변환 (UTC+9)
UPDATE "orders"
SET "orderDate" = DATE("orderDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul');

-- Step 2: 컬럼 타입을 DATE로 변경
ALTER TABLE "orders" ALTER COLUMN "orderDate" SET DATA TYPE DATE;
