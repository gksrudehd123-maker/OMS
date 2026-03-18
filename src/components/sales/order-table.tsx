'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type MarginData = {
  salesAmount: number;
  costAmount: number;
  fee: number;
  shipping: number;
  margin: number;
  marginRate: number;
  isCalculable: boolean;
};

type Order = {
  id: string;
  productOrderNumber: string;
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  productName: string;
  optionInfo: string;
  quantity: number;
  buyerName: string | null;
  claimStatus: string | null;
  margin: MarginData;
};

export function OrderTable({ refreshKey }: { refreshKey: number }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
    });

    fetch(`/api/orders?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders);
        setTotal(data.total);
      });
  }, [page, search, refreshKey]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">주문 내역</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="상품명, 주문번호, 구매자 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">총 {total}건</span>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>주문일시</TableHead>
              <TableHead>주문번호</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead>옵션</TableHead>
              <TableHead className="text-center">수량</TableHead>
              <TableHead className="text-right">판매금액</TableHead>
              <TableHead className="text-right">마진</TableHead>
              <TableHead className="text-center">마진율</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-32 text-center text-muted-foreground"
                >
                  주문 데이터가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {new Date(order.orderDate).toLocaleString('ko-KR')}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {order.productName}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-muted-foreground">
                    {order.optionInfo || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {order.quantity}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {order.margin.isCalculable ? (
                      `₩${order.margin.salesAmount.toLocaleString()}`
                    ) : (
                      <span className="text-orange-500 text-xs">미설정</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {order.margin.isCalculable ? (
                      <span
                        className={
                          order.margin.margin >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        ₩{order.margin.margin.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-orange-500 text-xs">미설정</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {order.margin.isCalculable ? (
                      <span
                        className={
                          order.margin.marginRate >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {order.margin.marginRate.toFixed(1)}%
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.orderStatus} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    결제완료: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    배송준비중:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    배송중:
      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    배송완료:
      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    취소: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    반품: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  };

  const color =
    colorMap[status] ||
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {status}
    </span>
  );
}
