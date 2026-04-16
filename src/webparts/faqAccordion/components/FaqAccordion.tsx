import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { IFaqAccordionMainProps, IFaqItem } from './types/IFaqTypes';
import { FaqListService } from '../services/FaqListService';
import AccordionItem from './AccordionItem';
import CategoryBar from './CategoryBar';
import SearchBar from './SearchBar';
import LeftNavCardLayout from './LeftNavCardLayout';
import styles from './FaqAccordion.module.scss';

function parseJsonArray(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return (parsed as string[]).filter(s => !!s);
  } catch { /* fall through */ }
  return [];
}

const DEFAULT_CATEGORY_COLORS = [
  '#0078d4', '#107c10', '#d83b01', '#5c2d91', '#008272',
  '#ca5010', '#004b1c', '#004e8c', '#750b1c', '#4f6bed',
];

function parseCategoryColorPalette(raw: string): string[] {
  if (!raw) return DEFAULT_CATEGORY_COLORS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return DEFAULT_CATEGORY_COLORS.map((def, i) => {
        const val = (parsed as string[])[i];
        return val && val.trim() ? val.trim() : def;
      });
    }
  } catch { /* fall through */ }
  return DEFAULT_CATEGORY_COLORS;
}


interface IFaqAccordionState {
  items: IFaqItem[];
  categories: string[];
  loading: boolean;
  error: string;
  expandedIds: number[];
  selectedCategory: string;
  searchQuery: string;
}

export default class FaqAccordion extends React.Component<IFaqAccordionMainProps, IFaqAccordionState> {
  private _service: FaqListService;

  constructor(props: IFaqAccordionMainProps) {
    super(props);
    this._service = new FaqListService(props.context);
    this.state = {
      items: [],
      categories: [],
      loading: false,
      error: '',
      expandedIds: [],
      selectedCategory: '',
      searchQuery: '',
    };
  }

  public componentDidMount(): void {
    this._loadData().catch(e => console.error(e));
  }

  public componentDidUpdate(prevProps: IFaqAccordionMainProps): void {
    const relevantChanged =
      prevProps.listName !== this.props.listName ||
      prevProps.sortField !== this.props.sortField ||
      prevProps.sortDirection !== this.props.sortDirection ||
      prevProps.showOnlyActive !== this.props.showOnlyActive ||
      prevProps.maxItems !== this.props.maxItems;

    if (relevantChanged) {
      this._loadData().catch(e => console.error(e));
    }
  }

  private async _loadData(): Promise<void> {
    const { listName, sortField, sortDirection, showOnlyActive, maxItems, expandFirstItem } = this.props;

    if (!listName) {
      this.setState({ items: [], categories: [], loading: false, error: '' });
      return;
    }

    this.setState({ loading: true, error: '' });

    try {
      // Fetch items and field-defined choices in parallel
      const [items, fieldChoices] = await Promise.all([
        this._service.getItems(listName, sortField || 'SortOrder', sortDirection || 'asc', showOnlyActive, maxItems || 500),
        this._service.getCategories(listName),
      ]);

      // Merge field choices with any values actually used in items (handles custom/legacy values)
      const seen: { [key: string]: boolean } = {};
      const categories: string[] = [];
      fieldChoices.forEach((cat: string) => {
        if (cat && !seen[cat]) { seen[cat] = true; categories.push(cat); }
      });
      items.forEach(item => {
        (item.categories || []).forEach((cat: string) => {
          if (cat && !seen[cat]) { seen[cat] = true; categories.push(cat); }
        });
      });
      categories.sort();

      const effectiveExpandMode = this.props.expandMode || 'single';
      let expandedIds: number[] = [];
      items.forEach(item => {
        if (item.expandedByDefault) expandedIds.push(item.id);
      });
      if (expandFirstItem && items.length > 0 && expandedIds.length === 0) {
        expandedIds.push(items[0].id);
      }
      // Enforce single-expand: keep only the first expanded item
      if (effectiveExpandMode === 'single' && expandedIds.length > 1) {
        expandedIds = [expandedIds[0]];
      }

      this.setState({ items, categories, loading: false, expandedIds });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.setState({ loading: false, error: `Failed to load FAQ items: ${msg}` });
    }
  }

  private _toggleItem = (id: number): void => {
    const expandMode = this.props.expandMode || 'single';
    this.setState(prev => {
      if (expandMode === 'single') {
        const isCurrentlyExpanded = prev.expandedIds.indexOf(id) !== -1;
        return { expandedIds: isCurrentlyExpanded ? [] : [id] };
      } else {
        const isExpanded = prev.expandedIds.indexOf(id) !== -1;
        return {
          expandedIds: isExpanded
            ? prev.expandedIds.filter(eid => eid !== id)
            : prev.expandedIds.concat([id]),
        };
      }
    });
  };

  private _getFilteredItems(): IFaqItem[] {
    const { searchScope, visibleCategories } = this.props;
    const { items, selectedCategory, searchQuery } = this.state;

    // Parse which categories are visible (empty array = all visible)
    const visibleList = parseJsonArray(visibleCategories);

    let filtered = items;

    // If editor has restricted visible categories, hide items that have NO
    // visible category (i.e. all their categories are hidden)
    if (visibleList.length > 0) {
      filtered = filtered.filter(i => {
        // Item is visible if at least one of its categories is in the visible list,
        // OR if it has no categories at all (uncategorised items always show)
        if (!i.categories || i.categories.length === 0) return true;
        return i.categories.some((cat: string) => visibleList.indexOf(cat) !== -1);
      });
    }

    // Multi-category: show item if any of its categories matches the selected filter
    if (selectedCategory) {
      filtered = filtered.filter(i => i.categories.indexOf(selectedCategory) !== -1);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => {
        const inQuestion = i.title.toLowerCase().indexOf(q) !== -1;
        const inAnswer = searchScope === 'questionAnswer'
          ? i.answer.toLowerCase().indexOf(q) !== -1
          : false;
        return inQuestion || inAnswer;
      });
    }

    return filtered;
  }

  private _getContainerStyle(): React.CSSProperties {
    const { spacingDensity, accordionStyle, shadowIntensity, borderRadius } = this.props;
    const padding = spacingDensity === 'compact' ? '12px' : spacingDensity === 'spacious' ? '32px' : '20px';

    const shadow = accordionStyle === 'cardStack' || accordionStyle === 'pillPanel'
      ? shadowIntensity === 'none' ? 'none'
        : shadowIntensity === 'light' ? '0 1px 4px rgba(0,0,0,0.08)'
        : shadowIntensity === 'medium' ? '0 4px 16px rgba(0,0,0,0.12)'
        : '0 8px 32px rgba(0,0,0,0.18)'
      : 'none';

    return {
      padding,
      boxShadow: shadow,
      borderRadius: `${borderRadius}px`,
    };
  }

  public render(): React.ReactElement {
    const {
      showTitle, titleText, titleAlignment, titleFontSize, showCategories, showSearch, categoryStyle,
      categoryAlignment, showAllCategory, categoryColorCoding, categoryColors,
      visibleCategories, categoryOrder,
      searchPlaceholder, searchPlacement, searchAlignment, accordionStyle, arrowPosition, iconStyle, animationEnabled,
      questionFontSize, questionStyle, answerFontSize, categoryFontSize,
      accentColor, colorTitle, colorQuestion, colorAnswer,
      colorIcons, colorBorders, borderDarkness, borderThickness, borderRadius,
      emptyStateText, loadingText, isDarkTheme,
    } = this.props;

    const { loading, error, expandedIds, selectedCategory, searchQuery, categories } = this.state;

    // Apply visibility filter: only show categories the editor has enabled
    const visibleList = parseJsonArray(visibleCategories);
    const visibleCats = visibleList.length > 0
      ? categories.filter(c => visibleList.indexOf(c) !== -1)
      : categories;

    // Apply custom order: editor-defined order first, then any remaining alphabetically
    const orderList = parseJsonArray(categoryOrder);
    const orderedCats = orderList.length > 0
      ? orderList.filter(c => visibleCats.indexOf(c) !== -1)
          .concat(visibleCats.filter(c => orderList.indexOf(c) === -1))
      : visibleCats;

    const filteredItems = this._getFilteredItems();

    const styleKey = `style_${accordionStyle}` as keyof typeof styles;
    const wrapperClass = [
      styles.faqWrapper,
      styles[styleKey] || '',
      isDarkTheme ? styles.darkTheme : '',
    ].filter(Boolean).join(' ');

    // Parse the stored category color palette (JSON array of hex strings)
    const parsedCategoryColors = parseCategoryColorPalette(categoryColors);

    // Build a stable map: sorted category name → assigned color
    // Use the full sorted categories list so color slots stay consistent
    const categoryColorMap: { [cat: string]: string } = {};
    categories.forEach((cat, idx) => {
      categoryColorMap[cat] = parsedCategoryColors[idx % parsedCategoryColors.length];
    });

    // When color coding is ON and a specific category is selected, use that category's color
    // as the accent. When "All" is selected (selectedCategory === ''), revert to base accent.
    const activeCategoryColor = categoryColorCoding && selectedCategory
      ? categoryColorMap[selectedCategory]
      : undefined;

    // Effective accent: active category color > user-supplied hex > SharePoint theme token
    const effectiveAccent = activeCategoryColor
      || (accentColor && accentColor.trim() ? accentColor.trim() : undefined);

    // Effective border color: custom hex > darkness slider
    const effectiveBorderColor = colorBorders && colorBorders.trim()
      ? colorBorders.trim()
      : borderDarkness > 0
      ? `rgba(0,0,0,${(borderDarkness / 100) * 0.85 + 0.15})`
      : undefined;

    // Effective border thickness: 0 = no border
    const effectiveBorderThickness = borderThickness !== undefined ? borderThickness : 1;

    const titleStyle: React.CSSProperties = {
      color: colorTitle && colorTitle.trim() ? colorTitle : undefined,
      fontSize: titleFontSize ? `${titleFontSize}px` : undefined,
      textAlign: (titleAlignment || 'left') as React.CSSProperties['textAlign'],
    };

    // Inject accent + border color + thickness as CSS custom properties
    const containerStyle: React.CSSProperties = {
      ...this._getContainerStyle(),
      ...(effectiveAccent ? { '--faq-accent': effectiveAccent, '--faq-accent-light': `${effectiveAccent}1a` } as React.CSSProperties : {}),
      ...(effectiveBorderColor ? { '--faq-border': effectiveBorderColor } as React.CSSProperties : {}),
      ...(effectiveBorderThickness === 0
        ? { '--faq-border-width': '0px' } as React.CSSProperties
        : { '--faq-border-width': `${effectiveBorderThickness}px` } as React.CSSProperties),
    };

    const isFullWidth = (searchPlacement || 'aboveCategories') === 'fullWidth';
    const searchBar = showSearch ? (
      <SearchBar
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={(val) => this.setState({ searchQuery: val })}
        alignment={searchAlignment || 'left'}
        fullWidth={isFullWidth}
      />
    ) : null;

    const categoryBar = showCategories && orderedCats.length > 0 ? (
      <CategoryBar
        categories={orderedCats}
        selectedCategory={selectedCategory}
        onCategoryChange={(cat) => this.setState({ selectedCategory: cat })}
        categoryStyle={categoryStyle}
        categoryAlignment={categoryAlignment || 'left'}
        showAll={showAllCategory}
        categoryFontSize={categoryFontSize}
        colorCoding={categoryColorCoding === true}
        categoryColorMap={categoryColorMap}
      />
    ) : null;

    // Determine render order based on searchPlacement
    const placement = searchPlacement || 'aboveCategories';
    // fullWidth: search bar spans the full width above everything (title excluded)
    // aboveCategories: search above category bar
    // belowCategories: search below category bar
    let fullWidthSearchNode: React.ReactNode = null;
    let searchNode: React.ReactNode = null;
    let categoryNode: React.ReactNode = null;

    if (placement === 'fullWidth') {
      fullWidthSearchNode = searchBar;
      categoryNode = categoryBar;
    } else if (placement === 'aboveCategories') {
      searchNode = searchBar;
      categoryNode = categoryBar;
    } else {
      // belowCategories
      categoryNode = (
        <>
          {categoryBar}
          {searchBar}
        </>
      );
    }

    return (
      <div className={wrapperClass} style={containerStyle}>
        {showTitle && titleText && (
          <h2 className={styles.webPartTitle} style={titleStyle}>{titleText}</h2>
        )}

        {error && (
          <MessageBar messageBarType={MessageBarType.error} isMultiline={false} dismissButtonAriaLabel="Close">
            {error}
          </MessageBar>
        )}

        {!this.props.listName && !loading && (
          <MessageBar messageBarType={MessageBarType.info}>
            Please configure a SharePoint list in the web part properties.
          </MessageBar>
        )}

        {loading && (
          <div className={styles.loadingContainer}>
            <Spinner size={SpinnerSize.medium} label={loadingText || 'Loading FAQs...'} />
          </div>
        )}

        {!loading && !error && this.props.listName && (
          <>
            {fullWidthSearchNode}
            {searchNode}
            {categoryNode}

            {filteredItems.length === 0 && (
              <div className={styles.emptyState}>
                {emptyStateText || 'No FAQ items found.'}
              </div>
            )}

            {filteredItems.length > 0 && accordionStyle === 'leftNavCard' && (
              <LeftNavCardLayout items={filteredItems} props={this.props} />
            )}

            {filteredItems.length > 0 && accordionStyle !== 'leftNavCard' && (
              <div
                className={`${styles.accordionList} ${styles[(`accordionList_${accordionStyle}`) as keyof typeof styles] || ''}`}
                role="list"
              >
                {filteredItems.map(item => (
                  <AccordionItem
                    key={item.id}
                    item={item}
                    isExpanded={expandedIds.indexOf(item.id) !== -1}
                    onToggle={this._toggleItem}
                    iconStyle={iconStyle}
                    arrowPosition={arrowPosition}
                    accordionStyle={accordionStyle}
                    animationEnabled={animationEnabled}
                    questionFontSize={questionFontSize || 15}
                    questionStyle={questionStyle}
                    answerFontSize={answerFontSize || 14}
                    colorQuestion={colorQuestion && colorQuestion.trim() ? colorQuestion : undefined}
                    colorAnswer={colorAnswer && colorAnswer.trim() ? colorAnswer : undefined}
                    colorIcons={colorIcons && colorIcons.trim() ? colorIcons : undefined}
                    colorBorders={effectiveBorderColor}
                    borderRadius={borderRadius}
                    borderThickness={effectiveBorderThickness}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}
