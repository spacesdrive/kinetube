import { Panel } from '@/components/brand';
import { Pill } from '@/components/Pill';
import { usePageMeta } from '@/lib/seo';

export default function NotFound() {
  usePageMeta({ title: 'Page not found', description: 'This page is not on the kinetube site.', path: '/404' });
  return (
    <section className="container-page pt-32 md:pt-40">
      <Panel placement="bottom-right" className="flex flex-col items-start gap-5 rounded-panel px-8 py-16 md:px-14 md:py-24">
        <p className="label text-on-deep-muted">Error 404</p>
        <h1 className="display max-w-[14ch] text-[36px] leading-[42px] text-on-deep md:text-[52px] md:leading-[58px]">This page is not here.</h1>
        <p className="max-w-lg text-lg leading-7 text-on-deep-muted">The link may be old, or the address may have a typo. Start from the home page, or look in the docs.</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Pill href="/" size="lg">Go to the home page</Pill>
          <Pill href="/docs" variant="soft" size="lg">Open the docs</Pill>
        </div>
      </Panel>
    </section>
  );
}
