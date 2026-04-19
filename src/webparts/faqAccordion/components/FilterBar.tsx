import * as React from 'react';
import styles from './FaqAccordion.module.scss';

export interface IFilterBarProps {
  label: string;
  values: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  showAll: boolean;
  fontSize?: number;
  alignment?: string;
}

const FilterBar: React.FC<IFilterBarProps> = ({
  label,
  values,
  selectedValue,
  onValueChange,
  showAll,
  fontSize,
  alignment,
}) => {
  if (!values || values.length === 0) return null;

  const allValues = showAll ? ['All', ...values] : values;

  const alignClass = alignment === 'center'
    ? styles.filterBarCenter
    : alignment === 'right'
    ? styles.filterBarRight
    : styles.filterBarLeft;

  const containerClass = `${styles.filterBar} ${alignClass}`;

  return (
    <div className={containerClass}>
      {label && (
        <span className={styles.filterBarLabel} style={{ fontSize: fontSize ? `${fontSize}px` : undefined }}>
          {label}:
        </span>
      )}
      <div className={styles.filterBarItems} role="group" aria-label={`Filter by ${label}`}>
        {allValues.map(val => {
          const isSelected = val === selectedValue || (val === 'All' && selectedValue === '');
          return (
            <button
              key={val}
              type="button"
              className={`${styles.filterBarItem} ${isSelected ? styles.filterBarItemSelected : ''}`}
              aria-pressed={isSelected}
              onClick={() => onValueChange(val === 'All' ? '' : val)}
              style={{ fontSize: fontSize ? `${fontSize}px` : undefined }}
            >
              {val}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterBar;
