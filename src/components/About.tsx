import { siteContent } from '@/content/site';
import styles from './PostHero.module.css';

export default function About() {
  const [intro, perspective] = siteContent.about.paragraphs;
  const split = intro.indexOf(' with ');

  return (
    <section aria-label="About Sydney Essex" className={`${styles.shell} ${styles.about}`}>
      <p>
        <span className={styles.introLead}>{intro.slice(0, split)}</span>{' '}
        <span className={styles.introSupport}>{intro.slice(split + 1)}</span>
      </p>
      <p className={styles.perspective}>{perspective}</p>
    </section>
  );
}
