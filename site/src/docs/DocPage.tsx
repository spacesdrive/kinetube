import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { MDXProvider } from '@mdx-js/react';
import type { MDXComponents } from 'mdx/types';
import { ChevronLeft, ChevronRight, Pencil, TriangleAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import { DOCS_EDIT_URL, ISSUES_URL } from '@/lib/links';
import { usePageMeta } from '@/lib/seo';

import { Callout, Card, Cards, CodeBlock, DocLink, Heading, InlineCode, Kbd, Step, Steps } from './mdx';
import { docEntry, docNeighbours, slugFromPath } from './nav';
import { Toc } from './Toc';

interface DocModule {
  default: ComponentType;
  meta: { title: string; description: string };
}

// every page under content/docs, loaded when it is opened
const PAGES = import.meta.glob<DocModule>('/content/docs/**/*.mdx');

// every MDX page renders through these, so the content files stay plain Markdown with a few named components
const MDX_COMPONENTS: MDXComponents = {
  h2: ({ children }) => <Heading level={2}>{children}</Heading>,
  h3: ({ children }) => <Heading level={3}>{children}</Heading>,
  p: (props) => <p className="my-4 text-base leading-7 text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink" {...props} />,
  ul: (props) => <ul className="my-4 flex list-disc flex-col gap-2 pl-6 text-base leading-7 text-ink-muted marker:text-line-strong" {...props} />,
  ol: (props) => <ol className="my-4 flex list-decimal flex-col gap-2 pl-6 text-base leading-7 text-ink-muted marker:text-ink-muted" {...props} />,
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  a: DocLink,
  pre: CodeBlock,
  code: InlineCode,
  kbd: Kbd,
  hr: () => <hr className="my-10 border-line" />,
  table: (props) => (
    <div className="my-6 overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[34rem] text-left text-sm leading-6" {...props} />
    </div>
  ),
  thead: (props) => <thead className="border-b border-line bg-surface" {...props} />,
  th: (props) => <th className="px-4 py-2.5 font-semibold text-ink" {...props} />,
  tr: (props) => <tr className="border-b border-line align-top last:border-0" {...props} />,
  td: (props) => <td className="px-4 py-3 text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink" {...props} />,
  Callout,
  Steps,
  Step,
  Cards,
  Card,
  Kbd,
};

function fileFor(slug: string): string | undefined {
  const candidates = slug ? [`/content/docs/${slug}.mdx`, `/content/docs/${slug}/index.mdx`] : ['/content/docs/index.mdx'];
  return candidates.find((path) => path in PAGES);
}

const FOOTER_LINK = 'inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-muted hover:border-line-strong hover:text-ink';

function PageNotFound() {
  return (
    <article id="doc-content" className="min-w-0 flex-1 py-12">
      <p className="label text-spin-text">Error 404</p>
      <h1 className="display mt-3 text-[32px] leading-[40px] text-ink">This docs page is not here.</h1>
      <p className="mt-4 text-lg text-ink-muted">
        The link may be old. Use the search above, or <Link to="/docs" className="font-medium text-spin-text underline underline-offset-4">start from the docs home</Link>.
      </p>
    </article>
  );
}

export default function DocPage() {
  const { pathname } = useLocation();
  const slug = slugFromPath(pathname);
  const file = fileFor(slug);
  const entry = docEntry(slug);
  const [loaded, setLoaded] = useState<{ file: string; module: DocModule } | null>(null);
  const [article, setArticle] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const load = file ? PAGES[file] : undefined;
    if (!file || !load) return;
    let isCurrent = true;
    void load().then((module) => isCurrent && setLoaded({ file, module }));
    return () => {
      isCurrent = false;
    };
  }, [file]);

  const module = loaded && loaded.file === file ? loaded.module : null;
  usePageMeta({ title: module?.meta.title ?? entry?.title ?? 'Page not found', description: module?.meta.description ?? 'The kinetube documentation.', path: pathname });

  if (!file) return <PageNotFound />;

  const { previous, next } = docNeighbours(slug);
  const Content = module?.default;
  return (
    <>
      <article id="doc-content" ref={setArticle} className="min-w-0 flex-1 py-10 lg:max-w-[46rem]">
        {entry && <p className="text-sm font-semibold text-spin-text">{entry.group.label}</p>}
        <h1 className="display mt-2 text-[30px] leading-[38px] text-ink md:text-[34px] md:leading-[42px]">{module?.meta.title ?? entry?.title}</h1>
        {/* until the page arrives, its space is held so nothing below it jumps */}
        {module ? <p className="mt-3 text-lg leading-7 text-ink-muted">{module.meta.description}</p> : <div className="mt-3 h-7" aria-hidden="true" />}
        <div className="mt-8" aria-busy={!Content}>
          {Content ? (
            <MDXProvider components={MDX_COMPONENTS}>
              <Content />
            </MDXProvider>
          ) : (
            <div className="flex min-h-[100svh] flex-col gap-3" aria-hidden="true">
              {[0, 1, 2, 3].map((line) => <div key={line} className="h-4 animate-pulse rounded-sm bg-surface" style={{ width: `${92 - line * 14}%` }} />)}
            </div>
          )}
        </div>
        {Content && (
          <>
            <div className="mt-14 flex flex-wrap gap-2 border-t border-line pt-6">
              <a href={`${DOCS_EDIT_URL}${file.replace('/content/docs', '')}`} target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}><Pencil className="size-4" />Suggest edits</a>
              <a href={`${ISSUES_URL}?title=${encodeURIComponent(`Docs: ${entry?.title ?? slug}`)}`} target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}><TriangleAlert className="size-4" />Raise issue</a>
            </div>
            <nav aria-label="Previous and next page" className="mt-8 flex justify-between gap-4">
              {previous ? <Link to={previous.path} className="flex items-center gap-1.5 text-[15px] font-semibold text-ink hover:text-spin-text"><ChevronLeft className="size-4" />{previous.title}</Link> : <span />}
              {next && <Link to={next.path} className="flex items-center gap-1.5 text-right text-[15px] font-semibold text-ink hover:text-spin-text">{next.title}<ChevronRight className="size-4" /></Link>}
            </nav>
          </>
        )}
      </article>
      <aside className="sticky top-28 hidden h-[calc(100svh-7rem)] w-60 shrink-0 overflow-y-auto py-10 xl:block">
        <Toc article={article} pageKey={`${file}:${module ? 'ready' : 'loading'}`} />
      </aside>
    </>
  );
}
