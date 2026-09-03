import Link from 'next/link';
import { siteContent } from '@/content/site';

export default function Projects() {
  const { title, items } = siteContent.projects;

  return (
    <section className="mx-auto w-full max-w-[90rem] px-[6.25vw] py-[clamp(30px,3vw,48px)]">
      <div>
        <h2 className="mb-[0.18em] font-helvetica text-[clamp(22px,2.35vw,36px)] font-bold leading-[1.12] tracking-[-0.03em]">
          {title}
        </h2>
        <div className="space-y-[0.9em]">
          {items.map((project) => (
            <Link
              key={project.name}
              href={project.href}
              className="group block max-w-[82rem] font-helvetica text-[clamp(22px,2.35vw,36px)] font-normal leading-[1.12] tracking-[-0.03em]"
            >
              <h3 className="font-normal group-hover:underline">[ {project.name} ]</h3>
              <p>{project.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
