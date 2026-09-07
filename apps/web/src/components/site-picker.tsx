'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, qk } from '@/lib/api';

/** dropdown เลือกเว็บ + ทางกลับหน้าภาพรวม ไม่ให้หลงทาง */
export const SitePicker = ({ current }: { current: string }) => {
  const router = useRouter();
  const { data: sites } = useQuery({ queryKey: qk.sites, queryFn: api.sites, staleTime: Infinity });

  return (
    <div className="flex items-center gap-3">
      <Link href="/" className="text-[11.5px] text-[#1f5fbf] hover:underline">
        ← ภาพรวม 17 เว็บ
      </Link>
      <select
        value={current}
        onChange={(e) => router.push(`/sites/${e.target.value}`)}
        className="rounded-md border border-line bg-white px-2 py-1 text-xs"
        aria-label="เลือกเว็บ"
      >
        {(sites ?? []).map((s) => (
          <option key={s.id} value={s.id}>{s.domain}</option>
        ))}
      </select>
    </div>
  );
};
