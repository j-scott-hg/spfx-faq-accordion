import * as React from 'react';
import { IFaqItem, IFaqWebPartProps } from './types/IFaqTypes';
import AccordionItem from './AccordionItem';
import styles from './FaqAccordion.module.scss';

export interface ILeftNavCardLayoutProps {
  items: IFaqItem[];
  props: IFaqWebPartProps;
}

const LeftNavCardLayout: React.FC<ILeftNavCardLayoutProps> = ({ items, props }) => {
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

  const cardStyle: React.CSSProperties = {
    borderRadius: `${props.borderRadius}px`,
    borderColor: props.colorBorders && props.colorBorders.trim() ? props.colorBorders : undefined,
    boxShadow: props.shadowIntensity === 'none' ? 'none'
      : props.shadowIntensity === 'light' ? '0 1px 4px rgba(0,0,0,0.1)'
      : props.shadowIntensity === 'medium' ? '0 4px 12px rgba(0,0,0,0.15)'
      : '0 8px 24px rgba(0,0,0,0.2)',
  };

  return (
    <div className={styles.leftNavLayout}>
      <div className={styles.leftNavList} role="listbox" aria-label="FAQ Questions">
        {items.map(item => (
          <AccordionItem
            key={item.id}
            item={item}
            isExpanded={false}
            isSelected={item.id === selectedId}
            onToggle={(id) => setSelectedId(id)}
            iconStyle={props.iconStyle}
            arrowPosition="right"
            accordionStyle="leftNavCard"
            questionFontSize={props.questionFontSize}
            questionStyle={props.questionStyle}
            answerFontSize={props.answerFontSize}
            colorQuestion={props.colorQuestion && props.colorQuestion.trim() ? props.colorQuestion : undefined}
            colorAnswer={props.colorAnswer && props.colorAnswer.trim() ? props.colorAnswer : undefined}
            colorIcons={props.colorIcons && props.colorIcons.trim() ? props.colorIcons : undefined}
            colorBorders={props.colorBorders && props.colorBorders.trim() ? props.colorBorders : undefined}
            borderRadius={props.borderRadius}
            borderThickness={props.borderThickness !== undefined ? props.borderThickness : 1}
          />
        ))}
      </div>
      <div className={styles.leftNavDetail} style={cardStyle} role="region" aria-live="polite" aria-label="FAQ Answer">
        {selectedItem ? (
          <>
            <h3
              className={styles.leftNavDetailQuestion}
              style={{
                fontSize: props.questionFontSize ? `${props.questionFontSize}px` : undefined,
                color: props.colorQuestion && props.colorQuestion.trim() ? props.colorQuestion : undefined,
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
