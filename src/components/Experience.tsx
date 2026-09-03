import Link from 'next/link';
import { siteContent } from '@/content/site';

export default function Experience() {
  const { title, items } = siteContent.experience;

  return (
    <section className="w-full max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
      <div className="space-y-8">
        <h2 className="text-[36px] leading-tight tracking-[-0.03em] font-bold font-helvetica">
          {title}
        </h2>
        <div className="space-y-8">
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="block group"
            >
              <div className="space-y-2">
                <h3 className="text-[36px] leading-tight tracking-[-0.03em] font-helvetica group-hover:underline">
                  [ {item.name} ]
                </h3>
                <p className="text-[36px] leading-tight tracking-[-0.03em] font-helvetica text-gray-600">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
