import { useEffect, useState } from 'react';
import { AlignLeft } from 'lucide-react';

import { cn } from '@/lib/cn';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface TocProps {
  // the rendered article, read once its MDX has loaded
  article: HTMLElement | null;
  // changes with each page, so the list is read again
  pageKey: string;
}

// "On this page": the h2 and h3 headings, with the one being read lit as the reader scrolls
export function Toc({ article, pageKey }: TocProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState('');

  useEffect(() => {
    if (!article) return;
    const headings = [...article.querySelectorAll<HTMLElement>('[data-toc]')];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the list comes from the DOM the MDX rendered
    setItems(headings.map((heading) => ({ id: heading.id, text: heading.textContent?.trim() ?? '', level: Number(heading.dataset.toc) })));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -66% 0px' },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [article, pageKey]);

  if (items.length === 0) return null;
  return (
    <nav aria-label="On this page" className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <AlignLeft className="size-4" />
        On this page
      </p>
      <ul className="flex flex-col gap-2.5 text-sm">
        {items.map((item) => (
          <li key={item.id} className={cn(item.level === 3 && 'pl-4')}>
            <a href={`#${item.id}`} className={cn('transition-colors', active === item.id ? 'font-medium text-spin-text' : 'text-ink-muted hover:text-ink')}>{item.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
