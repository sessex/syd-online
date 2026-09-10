import IndexDisclosure, { type IndexItem } from './IndexDisclosure';
import styles from './PostHero.module.css';

type IndexSectionProps = {
  readonly title: string;
  readonly items: readonly IndexItem[];
};

export default function IndexSection({ title, items }: IndexSectionProps) {
  const headingId = `${title}-heading`;

  return (
    <section aria-labelledby={headingId} className={`${styles.shell} ${styles.indexSection}`}>
      <h2 id={headingId} className={styles.indexTitle}>{title}</h2>
      <ul className={styles.indexList}>
        {items.map((item) => <IndexDisclosure key={item.name} item={item} />)}
      </ul>
    </section>
  );
}
