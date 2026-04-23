import { useEffect, useState } from "react";

/**
 * IntersectionObserver 기반 활성 섹션 추적.
 * 화면 상단 근처에 가장 잘 보이는 섹션의 id를 반환.
 */
export function useScrollSpy(sectionIds: string[], offset = 120) {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionIds.length) return;

    const observers: IntersectionObserver[] = [];
    const visible = new Map<string, number>();

    const update = () => {
      let best: { id: string; ratio: number } | null = null;
      visible.forEach((ratio, id) => {
        if (!best || ratio > best.ratio) best = { id, ratio };
      });
      if (best) setActiveId(best.id);
    };

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              visible.set(id, entry.intersectionRatio);
            } else {
              visible.delete(id);
            }
          });
          update();
        },
        {
          rootMargin: `-${offset}px 0px -55% 0px`,
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds.join("|"), offset]);

  return activeId;
}
