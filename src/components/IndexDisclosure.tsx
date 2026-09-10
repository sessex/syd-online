'use client';

import { type CSSProperties, useId, useState } from 'react';
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

function ChromaTitle({ name }: { name: string }) {
  let letterIndex = 0;

  return (
    <span aria-hidden="true">
      {name.split(' ').map((word, wordIndex) => (
        <span key={wordIndex}>
          {wordIndex > 0 && ' '}
          <span className={styles.chromaWord}>
            {Array.from(word).map((letter, index) => (
              <span
                key={index}
                className={styles.chromaLetter}
                data-letter={letter}
                style={{ '--letter-delay': `${letterIndex++ * 20}ms` } as CSSProperties}
              >
                {letter}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

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
            <span id={`${id}-name`} className={styles.itemName}>
              <span className={styles.srOnly}>{item.name}</span>
              <ChromaTitle name={item.name} />
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
                Visit {item.name}<span aria-hidden="true"> ↗</span>
              </a>
            ) : (
              <span className={styles.linkStatus}>{item.linkStatus ?? 'link coming soon'}</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
