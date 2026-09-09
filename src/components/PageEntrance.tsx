import type { ReactNode } from 'react';
import styles from './PageEntrance.module.css';

export default function PageEntrance({ children }: { children: ReactNode }) {
  return <div className={styles.entrance}>{children}</div>;
}
