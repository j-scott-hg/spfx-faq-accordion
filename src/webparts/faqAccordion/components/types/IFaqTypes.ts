export type AccordionStyle =
  | 'minimal'
  | 'leftNavCard'
  | 'pillPanel'
  | 'cardStack';

export type ArrowPosition = 'left' | 'right';
export type IconStyle = 'chevron' | 'plusMinus' | 'arrow' | 'caret';
export type ExpandMode = 'single' | 'multi';
export type CategoryStyle = 'tabs' | 'pills' | 'underline' | 'chips';
export type CategoryAlignment = 'left' | 'center' | 'right';
export type TitleAlignment = 'left' | 'center' | 'right';
export type SearchScope = 'question' | 'questionAnswer';
export type QuestionStyle = 'normal' | 'bold' | 'italic' | 'boldItalic';
export type SearchPlacement = 'aboveCategories' | 'belowCategories' | 'fullWidth';
export type SearchAlignment = 'left' | 'center' | 'right';
export type SortDirection = 'asc' | 'desc';
export type ShadowIntensity = 'none' | 'light' | 'medium' | 'heavy';

export interface IFaqItem {
  id: number;
  title: string;
  answer: string;
  // Multi-value: one item can belong to multiple categories
  categories: string[];
  sortOrder: number;
  isActive: boolean;
  expandedByDefault: boolean;
  // Extra raw field values for secondary filtering (keyed by internal field name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraFields: { [fieldName: string]: any };
}

export interface IFaqWebPartProps {
  listName: string;
  listId: string;

  // Accordion Style
  accordionStyle: AccordionStyle;
  arrowPosition: ArrowPosition;
  iconStyle: IconStyle;
  expandMode: ExpandMode;
  expandFirstItem: boolean;
  itemGap: number;

  // Title & Text
  showTitle: boolean;
  titleText: string;
  titleAlignment: TitleAlignment;
  titleFontSize: number;
  questionFontSize: number;
  questionStyle: QuestionStyle;
  answerFontSize: number;
  categoryFontSize: number;

  // Categories & Search
  showCategories: boolean;
  showSearch: boolean;
  searchPlacement: SearchPlacement;
  categoryStyle: CategoryStyle;
  categoryAlignment: CategoryAlignment;
  showAllCategory: boolean;
  // Color coding: when a category is selected its assigned color replaces the accent
  categoryColorCoding: boolean;
  // JSON array of up to 10 hex strings, one per category slot (sorted order)
  categoryColors: string;
  // JSON array of category names the editor has chosen to show (empty = show all)
  visibleCategories: string;
  // JSON array of category names defining display order (empty = alphabetical)
  categoryOrder: string;

  // Option F — SharePoint View selector
  // Internal name of the view to use for loading items (empty = default view)
  selectedView: string;

  // Option B — Secondary filter bar (user-facing)
  filterBarEnabled: boolean;
  // Internal name of the column to drive the secondary filter bar
  filterColumn: string;
  // Display name of that column (for the bar label)
  filterColumnLabel: string;
  // Placement: aboveSearch | belowSearch | inlineSearch | inlineCategories
  filterBarPlacement: string;
  // Alignment of filter chips: left | center | right
  filterBarAlignment: string;

  searchPlaceholder: string;
  searchScope: SearchScope;
  searchAlignment: SearchAlignment;

  // Appearance
  // Primary accent color — overrides the SharePoint theme blue everywhere
  accentColor: string;
  colorTitle: string;
  colorQuestion: string;
  colorAnswer: string;
  colorIcons: string;
  colorBorders: string;
  borderDarkness: number;
  borderThickness: number;
  borderRadius: number;
  shadowIntensity: ShadowIntensity;
  webPartPadding: number;

  // Advanced
  sortField: string;
  sortDirection: SortDirection;
  showOnlyActive: boolean;
  maxItems: number;
  emptyStateText: string;
  loadingText: string;
}

export interface IFaqAccordionMainProps extends IFaqWebPartProps {
  context: import('@microsoft/sp-webpart-base').WebPartContext;
  isDarkTheme: boolean;
  onPropertyPaneFieldChanged: () => void;
}
