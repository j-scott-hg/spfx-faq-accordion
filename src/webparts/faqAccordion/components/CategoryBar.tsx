import * as React from 'react';
import { CategoryStyle, CategoryAlignment } from './types/IFaqTypes';
import styles from './FaqAccordion.module.scss';

export interface ICategoryBarProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categoryStyle: CategoryStyle;
  categoryAlignment: CategoryAlignment;
  showAll: boolean;
  colorCoding: boolean;
  // Active palette resolved by parent (custom or defaults)
  colorPalette: string[];
  categoryFontSize: number;
}

// Grey used for the "All" button when color coding is active
const ALL_GREY = '#767676';

const CategoryBar: React.FC<ICategoryBarProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  categoryStyle,
  categoryAlignment,
  showAll,
  colorCoding,
  colorPalette,
  categoryFontSize,
}) => {
  // "All" is a virtual entry — real categories start at index 0 in the palette
  const allCategories = showAll ? ['All', ...categories] : categories;

  // Returns the palette color for a real category by its position in `categories`.
  // When color coding is on, "All" is always neutral grey.
  const getColor = (cat: string): string => {
    if (!colorCoding) return '';
    if (cat === 'All') return ALL_GREY;
    const realIdx = categories.indexOf(cat);
    return colorPalette[realIdx !== -1 ? realIdx % colorPalette.length : 0];
  };

  const alignKey = (categoryAlignment === 'center'
    ? 'categoryBarCenter'
    : categoryAlignment === 'right'
    ? 'categoryBarRight'
    : 'categoryBarLeft') as keyof typeof styles;

  const styleKey = `categoryBar_${categoryStyle}` as keyof typeof styles;
  const containerClass = `${styles.categoryBar} ${styles[styleKey] || ''} ${styles[alignKey] || ''}`;

  return (
    <div className={containerClass} role="tablist" aria-label="FAQ Categories">
      {allCategories.map(cat => {
        const isSelected = cat === selectedCategory || (cat === 'All' && selectedCategory === '');
        const color = getColor(cat);

        // Build inline style based on category style variant + color coding state
        let itemStyle: React.CSSProperties = {
          fontSize: categoryFontSize ? `${categoryFontSize}px` : undefined,
        };

        if (colorCoding && color) {
          if (categoryStyle === 'underline') {
            // Underline: selected = colored bottom border + colored text
            itemStyle = {
              ...itemStyle,
              color: color,
              borderBottomColor: isSelected ? color : undefined,
            };
          } else if (categoryStyle === 'tabs') {
            // Tabs: selected = colored top accent border + colored text
            itemStyle = {
              ...itemStyle,
              color: color,
              borderTopColor: isSelected ? color : undefined,
            };
          } else {
            // Pills / chips: fill background with category color when selected
            if (isSelected) {
              itemStyle = {
                ...itemStyle,
                backgroundColor: color,
                borderColor: color,
                color: '#fff',
              };
            } else {
              itemStyle = {
                ...itemStyle,
                borderColor: color,
                color: color,
              };
            }
          }
        }

        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isSelected}
            className={`${styles.categoryItem} ${isSelected ? styles.categoryItemSelected : ''}`}
            onClick={() => onCategoryChange(cat === 'All' ? '' : cat)}
            style={itemStyle}
            type="button"
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryBar;
