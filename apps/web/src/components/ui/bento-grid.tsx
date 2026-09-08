import type { ComponentType, ReactNode, SVGProps } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const BentoGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      'grid w-full auto-rows-[minmax(10rem,auto)] grid-cols-1 gap-4 md:grid-cols-2',
      className,
    )}
  >
    {children}
  </div>
);

type BentoCardProps = {
  name: string;
  className?: string | undefined;
  /** เลเยอร์หลัง ใช้ใส่กราฟจางๆ หรือลายพื้น */
  background?: ReactNode | undefined;
  Icon?: ComponentType<SVGProps<SVGSVGElement>> | undefined;
  description?: string | undefined;
  href?: string | undefined;
  cta?: string | undefined;
  /** ป้าย mono ไว้อ้างถึงกันตอนคุยงาน เช่น Q1 · S4 */
  tag?: string | undefined;
  /** ตัวเลข/กราฟที่ต้องเห็นตลอด วางไว้เหนือ description */
  children?: ReactNode | undefined;
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  tag,
  children,
}: BentoCardProps) => (
  <div
    className={cn(
      'group bg-card relative flex flex-col overflow-hidden rounded-xl',
      'shadow-[0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
      'transform-gpu dark:shadow-[0_-20px_80px_-20px_#ffffff1f_inset] dark:ring-1 dark:ring-white/10',
      className,
    )}
  >
    {background ? <div className="pointer-events-none absolute inset-0">{background}</div> : null}

    <div className="relative z-10 flex flex-1 flex-col gap-3 p-4">
      <div className="text-muted-foreground flex items-center gap-2">
        {tag ? (
          <span className="bg-foreground text-background rounded px-1.5 py-0.5 font-mono text-[10px] font-medium">
            {tag}
          </span>
        ) : null}
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <h3 className="text-foreground text-[13px] font-semibold">{name}</h3>
      </div>

      {children}

      {description ? (
        <p className="text-muted-foreground text-[11px] leading-snug">{description}</p>
      ) : null}

      {href && cta ? (
        <Button
          variant="link"
          asChild
          size="sm"
          className="text-foreground mt-auto h-auto justify-start p-0 text-[11px]"
        >
          <Link href={href}>
            {cta}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      ) : null}
    </div>
  </div>
);

export { BentoCard, BentoGrid };
