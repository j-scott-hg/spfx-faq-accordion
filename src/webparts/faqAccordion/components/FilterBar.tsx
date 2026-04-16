import * as React from 'react';
import styles from './FaqAccordion.module.scss';

export interface IFilterBarProps {
  label: string;          // Column display name shown as a prefix label
  values: string[];       // All possible values for this column
  selectedValue: string;  // Currently active filter value ('' = All)
  onValueChange: (value: string) => void;
  showAll: boolean;       // Whether to show an "All" option
  fontSize?: number;
}

const FilterBar: React.FC<IFilterBarProps> = ({
  label,
  values,
  selectedValue,
  onValueChange,
  showAll,
  fontSize,
}) => {
  if (!values || values.length === 0) return null;

  const allValues = showAll ? ['All', ...values] : values;

  return (
    <div className={styles.filterBar}>
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
