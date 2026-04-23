import { ReactNode } from "react";

type Props = {
  chip?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

/**
 * 데이터셔보드 원페이지 섹션 헤더.
 * 라이브 데모의 헤더 톤을 차용해 모든 섹션에서 동일한 위계로 사용.
 */
export default function SectionHeader({ chip, title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
      <div className="min-w-0">
        {chip && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">
            {chip}
          </span>
        )}
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground break-keep">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1 break-keep">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
