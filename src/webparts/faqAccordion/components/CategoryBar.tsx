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
  categoryFontSize: number;
  colorCoding: boolean;
  categoryColorMap: { [cat: string]: string };
}

const CategoryBar: React.FC<ICategoryBarProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  categoryStyle,
  categoryAlignment,
  showAll,
  categoryFontSize,
  colorCoding,
  categoryColorMap,
}) => {
  const allCategories = showAll ? ['All', ...categories] : categories;

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
        const isAll = cat === 'All';
        const color = colorCoding && !isAll ? categoryColorMap[cat] : undefined;

        let itemStyle: React.CSSProperties = {
          fontSize: categoryFontSize ? `${categoryFontSize}px` : undefined,
        };

        if (colorCoding && color) {
          if (isSelected) {
            // Selected: fill with category color
            if (categoryStyle === 'underline') {
              itemStyle = { ...itemStyle, color, borderBottomColor: color };
            } else if (categoryStyle === 'tabs') {
              itemStyle = { ...itemStyle, color, borderTopColor: color };
            } else {
              // pills / chips: solid fill
              itemStyle = { ...itemStyle, backgroundColor: color, borderColor: color, color: '#fff' };
            }
          } else {
            // Unselected: show color as text/border hint
            if (categoryStyle === 'underline' || categoryStyle === 'tabs') {
              itemStyle = { ...itemStyle, color };
            } else {
              itemStyle = { ...itemStyle, borderColor: color, color };
            }
          }
        }

        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isSelected}
            className={`${styles.categoryItem} ${isSelected ? styles.categoryItemSelected : ''}`}
            onClick={() => onCategoryChange(isAll ? '' : cat)}
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
