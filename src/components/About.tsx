import { siteContent } from '@/content/site';

export default function About() {
  const { title, paragraphs } = siteContent.about;

  return (
    <section className="w-full max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
      <div className="space-y-8">
        <h2 className="text-[36px] leading-tight tracking-[-0.03em] font-bold font-helvetica">
          {title}
        </h2>
        <div className="space-y-6">
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="text-[36px] leading-tight tracking-[-0.03em] font-helvetica"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
