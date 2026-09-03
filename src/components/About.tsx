import { siteContent } from '@/content/site';

export default function About() {
  const { paragraphs } = siteContent.about;

  return (
    <section
      aria-label="About Sydney Essex"
      className="mx-auto w-full max-w-[90rem] px-[6.25vw] pb-[clamp(32px,4vw,64px)] pt-[clamp(42px,5vw,76px)]"
    >
      <div className="max-w-[82rem] space-y-[1em]">
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className="font-helvetica text-[clamp(22px,2.35vw,36px)] font-normal leading-[1.12] tracking-[-0.03em]"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
