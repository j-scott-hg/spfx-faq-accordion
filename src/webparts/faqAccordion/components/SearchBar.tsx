import * as React from 'react';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { SearchAlignment } from './types/IFaqTypes';
import styles from './FaqAccordion.module.scss';

export interface ISearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  alignment?: SearchAlignment;
  fullWidth?: boolean;
}

const SearchBar: React.FC<ISearchBarProps> = ({ placeholder, value, onChange, alignment, fullWidth }) => {
  const alignClass = alignment === 'center'
    ? styles.searchBarCenter
    : alignment === 'right'
    ? styles.searchBarRight
    : styles.searchBarLeft;

  const widthClass = fullWidth ? styles.searchBarFullWidth : '';

  return (
    <div className={`${styles.searchBar} ${alignClass} ${widthClass}`.trim()}>
      <SearchBox
        placeholder={placeholder || 'Search FAQs...'}
        value={value}
        onChange={(_, newValue) => onChange(newValue || '')}
        onClear={() => onChange('')}
        ariaLabel="Search FAQs"
        className={styles.searchInput}
      />
    </div>
  );
};

export default SearchBar;
