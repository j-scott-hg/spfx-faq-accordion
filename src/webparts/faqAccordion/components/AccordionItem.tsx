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
  // When color-coding is on, pass the category's assigned color
  categoryColor?: string;
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

// Lighten a hex color for use as a hover background
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
  categoryColor,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const iconName = getIconName(iconStyle, isExpanded);
  const isLeftNav = accordionStyle === 'leftNavCard';

  const isPillPanel = accordionStyle === 'pillPanel';
  const hasCategoryColor = !!categoryColor;

  // Pill/Panel + color coding ON: text is always black; category color drives outline/highlight only.
  // All other styles: category color drives text color.
  const effectiveQuestionColor = isPillPanel && hasCategoryColor
    ? '#000000'
    : categoryColor || colorQuestion || undefined;

  // Hover background tint
  const hoverBg = isPillPanel && hasCategoryColor
    ? hexToRgba(categoryColor, 0.10)
    : categoryColor
    ? hexToRgba(categoryColor, 0.08)
    : undefined;

  const { fontWeight: qFontWeight, fontStyle: qFontStyle } = resolveQuestionTypography(questionStyle);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(item.id);
    }
  };

  const effectiveBorderWidth = borderThickness > 0 ? `${borderThickness}px` : '0';

  // Pill/Panel + color coding ON: header tint only on hover or expanded (not at rest)
  const pillPanelHeaderBg = isPillPanel && hasCategoryColor && (isExpanded || isHovered)
    ? hexToRgba(categoryColor, isExpanded ? 0.14 : 0.08)
    : undefined;

  const headerStyle: React.CSSProperties = {
    fontSize: questionFontSize ? `${questionFontSize}px` : undefined,
    fontWeight: qFontWeight,
    fontStyle: qFontStyle,
    color: effectiveQuestionColor,
    borderColor: colorBorders || undefined,
    borderWidth: effectiveBorderWidth,
    borderRadius: isExpanded ? `${borderRadius}px ${borderRadius}px 0 0` : `${borderRadius}px`,
    ...(pillPanelHeaderBg
      ? { background: pillPanelHeaderBg }
      : isHovered && hoverBg
      ? { background: hoverBg }
      : {}),
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
    // Pill/Panel + color coding ON: icon matches category color for visual accent
    color: isPillPanel && hasCategoryColor ? categoryColor : categoryColor || colorIcons || undefined,
  };

  const styleKey = `style_${accordionStyle}` as keyof typeof styles;

  // Pill/Panel + color coding ON: category color border on ALL items (not just expanded)
  const pillPanelWrapperStyle: React.CSSProperties = isPillPanel && hasCategoryColor
    ? { borderColor: categoryColor, borderWidth: '2px', borderStyle: 'solid' }
    : {};

  // Card Stack + color coding ON: left accent bar uses category color
  const cardStackWrapperStyle: React.CSSProperties = accordionStyle === 'cardStack' && hasCategoryColor
    ? { borderLeftColor: categoryColor }
    : {};

  if (isLeftNav) {
    // Color coding ON + selected: highlight nav item with category color tint
    const leftNavSelectedStyle: React.CSSProperties = hasCategoryColor && isSelected
      ? {
          borderColor: categoryColor,
          background: hexToRgba(categoryColor, 0.10),
        }
      : {};

    return (
      <div
        className={`${styles.leftNavItem} ${isSelected ? styles.leftNavItemSelected : ''}`}
        onClick={() => onToggle(item.id)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        style={{ borderRadius: `${borderRadius}px`, borderColor: colorBorders || undefined, ...leftNavSelectedStyle }}
      >
        <span
          className={styles.leftNavQuestion}
          style={{
            color: effectiveQuestionColor,
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

  return (
    <div
      className={`${styles.accordionItem} ${isExpanded ? styles.expanded : ''} ${styles[styleKey] || ''}`}
      style={{
        borderRadius: `${borderRadius}px`,
        borderColor: colorBorders || undefined,
        borderWidth: borderThickness > 0 ? `${borderThickness}px` : '0',
        borderStyle: borderThickness > 0 ? 'solid' : undefined,
        ...pillPanelWrapperStyle,
        ...cardStackWrapperStyle,
      }}
    >
      <div
        className={styles.accordionHeader}
        onClick={() => onToggle(item.id)}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
        <span className={styles.questionText}>{item.title}</span>
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
