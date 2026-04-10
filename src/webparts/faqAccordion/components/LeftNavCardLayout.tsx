import * as React from 'react';
import { IFaqItem, IFaqWebPartProps } from './types/IFaqTypes';
import AccordionItem from './AccordionItem';
import styles from './FaqAccordion.module.scss';

export interface ILeftNavCardLayoutProps {
  items: IFaqItem[];
  props: IFaqWebPartProps;
  // Map of category name → hex color, populated when color coding is ON
  categoryColorMap: Record<string, string>;
}

// Convert hex to rgba for tinted backgrounds
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const LeftNavCardLayout: React.FC<ILeftNavCardLayoutProps> = ({ items, props, categoryColorMap }) => {
  const [selectedId, setSelectedId] = React.useState<number | null>(
    items.length > 0 ? items[0].id : null
  );

  React.useEffect(() => {
    const found = items.filter(i => i.id === selectedId);
    if (items.length > 0 && (selectedId === null || found.length === 0)) {
      setSelectedId(items[0].id);
    }
  }, [items]);

  const selectedItems = items.filter(i => i.id === selectedId);
  const selectedItem = selectedItems.length > 0 ? selectedItems[0] : undefined;

  // Category color for the currently selected item (only when color coding is ON)
  const selectedCategoryColor = props.categoryColorCoding && selectedItem
    ? categoryColorMap[selectedItem.category] || undefined
    : undefined;

  const cardStyle: React.CSSProperties = {
    borderRadius: `${props.borderRadius}px`,
    // Color coding ON: border matches the selected item's category color
    borderColor: selectedCategoryColor
      ? selectedCategoryColor
      : props.colorBorders && props.colorBorders.trim()
      ? props.colorBorders
      : undefined,
    borderWidth: selectedCategoryColor ? '2px' : undefined,
    boxShadow: selectedCategoryColor
      ? `0 4px 16px ${hexToRgba(selectedCategoryColor, 0.18)}`
      : props.shadowIntensity === 'none' ? 'none'
      : props.shadowIntensity === 'light' ? '0 1px 4px rgba(0,0,0,0.1)'
      : props.shadowIntensity === 'medium' ? '0 4px 12px rgba(0,0,0,0.15)'
      : '0 8px 24px rgba(0,0,0,0.2)',
  };

  return (
    <div className={styles.leftNavLayout}>
      <div className={styles.leftNavList} role="listbox" aria-label="FAQ Questions">
        {items.map(item => {
          // Per-item category color for the nav list (color coding ON)
          const itemCategoryColor = props.categoryColorCoding
            ? categoryColorMap[item.category] || undefined
            : undefined;

          return (
            <AccordionItem
              key={item.id}
              item={item}
              isExpanded={false}
              isSelected={item.id === selectedId}
              onToggle={(id) => setSelectedId(id)}
              iconStyle={props.iconStyle}
              arrowPosition="right"
              accordionStyle="leftNavCard"
              animationEnabled={props.animationEnabled}
              questionFontSize={props.questionFontSize}
              questionStyle={props.questionStyle}
              answerFontSize={props.answerFontSize}
              colorQuestion={props.colorQuestion && props.colorQuestion.trim() ? props.colorQuestion : undefined}
              colorAnswer={props.colorAnswer && props.colorAnswer.trim() ? props.colorAnswer : undefined}
              colorIcons={props.colorIcons && props.colorIcons.trim() ? props.colorIcons : undefined}
              colorBorders={props.colorBorders && props.colorBorders.trim() ? props.colorBorders : undefined}
              borderRadius={props.borderRadius}
              borderThickness={props.borderThickness !== undefined ? props.borderThickness : 1}
              categoryColor={itemCategoryColor}
            />
          );
        })}
      </div>
      <div className={styles.leftNavDetail} style={cardStyle} role="region" aria-live="polite" aria-label="FAQ Answer">
        {selectedItem ? (
          <>
            <h3
              className={styles.leftNavDetailQuestion}
              style={{
                fontSize: props.questionFontSize ? `${props.questionFontSize}px` : undefined,
                // Color coding ON: question title in detail card uses category color
                color: selectedCategoryColor
                  ? selectedCategoryColor
                  : props.colorQuestion && props.colorQuestion.trim()
                  ? props.colorQuestion
                  : undefined,
              }}
            >
              {selectedItem.title}
            </h3>
            <div
              className={styles.leftNavDetailAnswer}
              style={{
                fontSize: props.answerFontSize ? `${props.answerFontSize}px` : undefined,
                color: props.colorAnswer && props.colorAnswer.trim() ? props.colorAnswer : undefined,
              }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: selectedItem.answer }}
            />
          </>
        ) : (
          <p className={styles.emptyState}>Select a question to view the answer.</p>
        )}
      </div>
    </div>
  );
};

export default LeftNavCardLayout;
