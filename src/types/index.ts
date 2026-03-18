export type DateRange = {
  from: Date;
  to: Date;
};

export type Period = 'daily' | 'weekly' | 'monthly';

export type KpiData = {
  label: string;
  value: number;
  previousValue: number;
  changeRate: number;
  format: 'currency' | 'percent' | 'number';
};
