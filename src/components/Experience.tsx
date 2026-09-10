import { siteContent } from '@/content/site';
import IndexSection from './IndexSection';

export default function Experience() {
  const { title, items } = siteContent.experience;

  return <IndexSection title={title} items={items} />;
}
