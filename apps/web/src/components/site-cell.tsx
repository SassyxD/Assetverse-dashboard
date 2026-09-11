import Link from 'next/link';
import { SITE_KIND_LABEL, type SiteOverview } from '@assetverse/contracts';

import type { Stage } from '@/components/shell';

/** ชื่อเว็บในตารางรวม — คลิกแล้วเข้าหน้าเว็บนั้นของ "ขั้นเดิม" ที่กำลังดูอยู่ */
export const SiteCell = ({ s, stage }: { s: SiteOverview; stage: Stage }) => (
  <>
    <Link href={`/${stage}/${s.site}`} className="text-sm font-medium hover:underline">
      {s.domain}
    </Link>
    <div className="text-muted-foreground truncate text-[11px]">{SITE_KIND_LABEL[s.kind]}</div>
  </>
);
