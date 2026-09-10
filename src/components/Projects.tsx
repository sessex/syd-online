import { siteContent } from '@/content/site';
import IndexSection from './IndexSection';

export default function Projects() {
  const { title, items } = siteContent.projects;

  return <IndexSection title={title} items={items} />;
}
