'use client';

import { useId, useState } from 'react';
import styles from './PostHero.module.css';

export type IndexItem = {
  readonly name: string;
  readonly blurb: string;
  readonly description: string;
  readonly href: string;
  readonly dateLabel: string;
  readonly dateDescription: string;
  readonly linkStatus?: string;
};

export default function IndexDisclosure({ item }: { item: IndexItem }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <li className={styles.indexRow}>
      <h3>
        <button
          type="button"
          className={styles.rowButton}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          aria-labelledby={`${id}-name`}
          aria-describedby={`${id}-date ${id}-blurb`}
          onClick={() => setOpen((value) => !value)}
        >
          <span id={`${id}-date`} className={styles.rowDate} aria-label={item.dateDescription} title={item.dateDescription}>
            {item.dateLabel}
          </span>
          <span className={styles.rowCopy}>
            <span id={`${id}-name`} className={styles.itemName} data-chromatic-ink>
              {item.name}
            </span>
            <span id={`${id}-blurb`} className={styles.rowBlurb}>{item.blurb}</span>
          </span>
          <span className={styles.disclosureIcon} aria-hidden="true">+</span>
        </button>
      </h3>
      {/* Keep the grid mounted so interrupted transitions reverse from their current size.
          Inert removes closing links from keyboard navigation immediately. */}
      <div id={`${id}-panel`} className={styles.panel} data-open={open} inert={!open} aria-hidden={!open}>
        <div className={styles.panelClip}>
          <div className={styles.reveal}>
            <p className={styles.description}>{item.description}</p>
            {item.href !== '#' ? (
              <a className={styles.visit} href={item.href} target="_blank" rel="noopener noreferrer">
                visit {item.name}<span aria-hidden="true"> ↗</span>
              </a>
            ) : item.linkStatus ? (
              <span className={styles.linkStatus}>{item.linkStatus}</span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
