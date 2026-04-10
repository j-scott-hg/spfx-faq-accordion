import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { IFaqItem, IconStyle, ArrowPosition, AccordionStyle, QuestionStyle } from './types/IFaqTypes';
import styles from './FaqAccordion.module.scss';

export interface IAccordionItemProps {
  item: IFaqItem;
  isExpanded: boolean;
  onToggle: (id: number) => void;
  iconStyle: IconStyle;
  arrowPosition: ArrowPosition;
  accordionStyle: AccordionStyle;
  animationEnabled: boolean;
  questionFontSize: number;
  questionStyle?: QuestionStyle;
  answerFontSize: number;
  colorQuestion?: string;
  colorAnswer?: string;
  colorIcons?: string;
  colorBorders?: string;
  borderRadius: number;
  borderThickness: number;
  isSelected?: boolean;
}

function getIconName(iconStyle: IconStyle, isExpanded: boolean): string {
  switch (iconStyle) {
    case 'plusMinus':
      return isExpanded ? 'Remove' : 'Add';
    case 'arrow':
      return isExpanded ? 'ChevronUpSmall' : 'ChevronRightSmall';
    case 'caret':
      return isExpanded ? 'CaretSolidUp' : 'CaretSolidDown';
    case 'chevron':
    default:
      return isExpanded ? 'ChevronUp' : 'ChevronDown';
  }
}

function resolveQuestionTypography(qs: QuestionStyle | undefined): { fontWeight: React.CSSProperties['fontWeight']; fontStyle: React.CSSProperties['fontStyle'] } {
  switch (qs) {
    case 'bold':       return { fontWeight: 700, fontStyle: 'normal' };
    case 'italic':     return { fontWeight: 'normal', fontStyle: 'italic' };
    case 'boldItalic': return { fontWeight: 700, fontStyle: 'italic' };
    default:           return { fontWeight: 'normal', fontStyle: 'normal' };
  }
}

const AccordionItem: React.FC<IAccordionItemProps> = ({
  item,
  isExpanded,
  onToggle,
  iconStyle,
  arrowPosition,
  accordionStyle,
  animationEnabled,
  questionFontSize,
  questionStyle,
  answerFontSize,
  colorQuestion,
  colorAnswer,
  colorIcons,
  colorBorders,
  borderRadius,
  borderThickness,
  isSelected,
}) => {
  const iconName = getIconName(iconStyle, isExpanded);
  const isLeftNav = accordionStyle === 'leftNavCard';

  const { fontWeight: qFontWeight, fontStyle: qFontStyle } = resolveQuestionTypography(questionStyle);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(item.id);
    }
  };

  const effectiveBorderWidth = borderThickness > 0 ? `${borderThickness}px` : '0';

  const headerStyle: React.CSSProperties = {
    fontSize: questionFontSize ? `${questionFontSize}px` : undefined,
    fontWeight: qFontWeight,
    fontStyle: qFontStyle,
    color: colorQuestion || undefined,
    borderColor: colorBorders || undefined,
    borderWidth: effectiveBorderWidth,
    borderRadius: isExpanded ? `${borderRadius}px ${borderRadius}px 0 0` : `${borderRadius}px`,
  };

  const bodyStyle: React.CSSProperties = {
    borderColor: colorBorders || undefined,
    borderWidth: effectiveBorderWidth,
    borderRadius: `0 0 ${borderRadius}px ${borderRadius}px`,
  };

  const answerContentStyle: React.CSSProperties = {
    fontSize: answerFontSize ? `${answerFontSize}px` : undefined,
    color: colorAnswer || undefined,
  };

  const iconColorStyle: React.CSSProperties = {
    color: colorIcons || undefined,
  };

  const styleKey = `style_${accordionStyle}` as keyof typeof styles;

  if (isLeftNav) {
    return (
      <div
        className={`${styles.leftNavItem} ${isSelected ? styles.leftNavItemSelected : ''}`}
        onClick={() => onToggle(item.id)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        style={{ borderRadius: `${borderRadius}px`, borderColor: colorBorders || undefined }}
      >
        <span
          className={styles.leftNavQuestion}
          style={{
            color: colorQuestion || undefined,
            fontSize: questionFontSize ? `${questionFontSize}px` : undefined,
            fontWeight: qFontWeight,
            fontStyle: qFontStyle,
          }}
        >
          {item.title}
        </span>
        <Icon iconName="ChevronRight" className={styles.leftNavArrow} style={iconColorStyle} />
      </div>
    );
  }

  // Show category tags below the question text when item has multiple categories
  const categoryTags = item.categories && item.categories.length > 1 ? (
    <div className={styles.categoryTags}>
      {item.categories.map(cat => (
        <span key={cat} className={styles.categoryTag}>{cat}</span>
      ))}
    </div>
  ) : null;

  return (
    <div
      className={`${styles.accordionItem} ${isExpanded ? styles.expanded : ''} ${styles[styleKey] || ''}`}
      style={{
        borderRadius: `${borderRadius}px`,
        borderColor: colorBorders || undefined,
        borderWidth: borderThickness > 0 ? `${borderThickness}px` : '0',
        borderStyle: borderThickness > 0 ? 'solid' : undefined,
      }}
    >
      <div
        className={styles.accordionHeader}
        onClick={() => onToggle(item.id)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`faq-body-${item.id}`}
        id={`faq-header-${item.id}`}
        style={headerStyle}
      >
        {(arrowPosition || 'right') === 'left' && (
          <Icon iconName={iconName} className={`${styles.accordionIcon} ${styles.iconLeft}`} style={iconColorStyle} aria-hidden="true" />
        )}
        <div className={styles.questionTextWrap}>
          <span className={styles.questionText}>{item.title}</span>
          {categoryTags}
        </div>
        {(arrowPosition || 'right') === 'right' && (
          <Icon iconName={iconName} className={`${styles.accordionIcon} ${styles.iconRight}`} style={iconColorStyle} aria-hidden="true" />
        )}
      </div>
      <div
        id={`faq-body-${item.id}`}
        role="region"
        aria-labelledby={`faq-header-${item.id}`}
        className={`${styles.accordionBody} ${isExpanded ? styles.accordionBodyOpen : ''} ${animationEnabled ? styles.animated : ''}`}
        style={bodyStyle}
      >
        <div
          className={styles.answerContent}
          style={answerContentStyle}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: item.answer }}
        />
      </div>
    </div>
  );
};

export default AccordionItem;
