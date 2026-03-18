'use client';

import { useEffect, useState } from 'react';

export function ProgressBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      setProgress(0);

      // 빠르게 70%까지 진행
      const t1 = setTimeout(() => setProgress(30), 100);
      const t2 = setTimeout(() => setProgress(60), 400);
      const t3 = setTimeout(() => setProgress(75), 800);
      // 느리게 90%까지
      const t4 = setTimeout(() => setProgress(85), 1500);
      const t5 = setTimeout(() => setProgress(90), 3000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
      };
    } else if (visible) {
      // 완료: 100%까지 채운 후 숨김
      setProgress(100);
      const t = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [loading, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
