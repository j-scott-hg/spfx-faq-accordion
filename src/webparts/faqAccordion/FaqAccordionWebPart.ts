import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneDropdown,
  PropertyPaneSlider,
  PropertyPaneButton,
  PropertyPaneButtonType,
  PropertyPaneLabel,
  IPropertyPaneDropdownOption,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import FaqAccordion from './components/FaqAccordion';
import { IFaqWebPartProps } from './components/types/IFaqTypes';
import { FaqListService, IListInfo, IListViewInfo, IListColumnInfo } from './services/FaqListService';

export interface IFaqAccordionWebPartProps extends IFaqWebPartProps {
  // Extends the shared props interface
}

export default class FaqAccordionWebPart extends BaseClientSideWebPart<IFaqAccordionWebPartProps> {
  private _isDarkTheme: boolean = false;
  private _lists: IListInfo[] = [];
  private _listProvisionMessage: string = '';
  private _service: FaqListService | undefined;
  // Categories loaded from the list for use in property pane controls
  private _availableCategories: string[] = [];
  // Views and columns for property pane dropdowns
  private _availableViews: IListViewInfo[] = [];
  private _filterableColumns: IListColumnInfo[] = [];

  protected async onInit(): Promise<void> {
    this._service = new FaqListService(this.context);
    await this._loadLists();

    // Auto-provision list on first load if no list is configured
    if (!this.properties.listName) {
      await this._ensureDefaultList();
    }
  }

  private async _loadLists(): Promise<void> {
    try {
      if (this._service) {
        this._lists = await this._service.getLists();
      }
    } catch {
      this._lists = [];
    }
  }

  private async _ensureDefaultList(): Promise<void> {
    const defaultListName = 'FAQ Accordion';
    if (!this._service) return;

    const result = await this._service.ensureList(defaultListName);
    this._listProvisionMessage = result.message;

    if (result.success) {
      this.properties.listName = defaultListName;
      this.properties.listId = result.listId;
      await this._loadLists();
    }
  }

  public render(): void {
    const element = React.createElement(FaqAccordion, {
      ...this.properties,
      context: this.context,
      isDarkTheme: this._isDarkTheme,
      onPropertyPaneFieldChanged: () => this.context.propertyPane.refresh(),
    });

    ReactDom.render(element, this.domElement);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) return;
    this._isDarkTheme = !!currentTheme.isInverted;

    const { semanticColors } = currentTheme;
    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected async onPropertyPaneConfigurationStart(): Promise<void> {
    await this._loadLists();
    await Promise.all([
      this._loadAvailableCategories(),
      this._loadViewsAndColumns(),
    ]);
    this.context.propertyPane.refresh();
  }

  protected async onPropertyPaneFieldChanged(propertyPath: string): Promise<void> {
    // Re-fetch list-dependent data whenever the list changes or the filter bar is enabled
    if (propertyPath === 'listName' || propertyPath === 'filterBarEnabled') {
      await Promise.all([
        this._loadAvailableCategories(),
        this._loadViewsAndColumns(),
      ]);
      this.context.propertyPane.refresh();
    }
  }

  private async _loadAvailableCategories(): Promise<void> {
    if (!this._service || !this.properties.listName) return;
    try {
      this._availableCategories = await this._service.getCategories(this.properties.listName);
    } catch {
      this._availableCategories = [];
    }
  }

  private async _loadViewsAndColumns(): Promise<void> {
    if (!this._service || !this.properties.listName) return;
    try {
      const [views, cols] = await Promise.all([
        this._service.getListViews(this.properties.listName),
        this._service.getFilterableColumns(this.properties.listName),
      ]);
      this._availableViews = views;
      this._filterableColumns = cols;
    } catch {
      this._availableViews = [];
      this._filterableColumns = [];
    }
  }

  private _getListOptions(): IPropertyPaneDropdownOption[] {
    return this._lists.map(l => ({ key: l.Title, text: l.Title }));
  }

  // ── Visible Categories helpers ──────────────────────────────────────────────

  private _parseJsonArray(raw: string): string[] {
    if (!raw) return [];
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return (p as string[]).filter(s => !!s);
    } catch { /* ignore */ }
    return [];
  }

  private _getVisibleCategories(): string[] {
    // visibleCategories stores the HIDDEN list (empty = all shown)
    // This is more intuitive: "hide" adds to the list, "show" removes
    return this._parseJsonArray(this.properties.visibleCategories);
  }

  private _isCategoryVisible(cat: string): boolean {
    const hidden = this._getVisibleCategories();
    // Empty hidden list = all visible
    return hidden.indexOf(cat) === -1;
  }

  private _toggleVisibleCategory(cat: string): void {
    const hidden = this._getVisibleCategories();
    const idx = hidden.indexOf(cat);
    if (idx === -1) {
      // Currently visible → hide it
      hidden.push(cat);
    } else {
      // Currently hidden → show it
      hidden.splice(idx, 1);
    }
    this.properties.visibleCategories = JSON.stringify(hidden);
    this.context.propertyPane.refresh();
    this.render();
  }

  private _getCategoryOrder(): string[] {
    const order = this._parseJsonArray(this.properties.categoryOrder);
    // Merge: put ordered items first, append any new categories not yet in the order list
    const all = this._availableCategories;
    const merged = order.filter(c => all.indexOf(c) !== -1);
    all.forEach(c => { if (merged.indexOf(c) === -1) merged.push(c); });
    return merged;
  }

  private _moveCategoryUp(cat: string): void {
    const order = this._getCategoryOrder();
    const idx = order.indexOf(cat);
    if (idx <= 0) return;
    order.splice(idx, 1);
    order.splice(idx - 1, 0, cat);
    this.properties.categoryOrder = JSON.stringify(order);
    this.context.propertyPane.refresh();
    this.render();
  }

  private _moveCategoryDown(cat: string): void {
    const order = this._getCategoryOrder();
    const idx = order.indexOf(cat);
    if (idx === -1 || idx >= order.length - 1) return;
    order.splice(idx, 1);
    order.splice(idx + 1, 0, cat);
    this.properties.categoryOrder = JSON.stringify(order);
    this.context.propertyPane.refresh();
    this.render();
  }

  // ── Category visibility + order property pane fields ────────────────────────

  private _getCategoryVisibilityFields(): import('@microsoft/sp-property-pane').IPropertyPaneField<unknown>[] {
    const cats = this._getCategoryOrder();
    const hidden = this._getVisibleCategories();
    const hiddenCount = cats.filter(c => hidden.indexOf(c) !== -1).length;

    if (cats.length === 0) {
      return [
        PropertyPaneLabel('noCatsLabel', {
          text: 'Open the property pane after selecting a list to manage categories.',
        }),
      ];
    }

    const fields: import('@microsoft/sp-property-pane').IPropertyPaneField<unknown>[] = [];

    fields.push(
      PropertyPaneLabel('catVisibilityHint', {
        text: hiddenCount > 0
          ? `${hiddenCount} of ${cats.length} categories hidden.`
          : `All ${cats.length} categories visible.`,
      })
    );

    cats.forEach((cat, idx) => {
      const isVisible = this._isCategoryVisible(cat);
      // Visibility toggle as a button (reliable in SPFx dynamic fields)
      fields.push(
        PropertyPaneButton(`catToggle_${idx}`, {
          text: isVisible ? `👁 ${cat} — click to Hide` : `🚫 ${cat} — click to Show`,
          buttonType: PropertyPaneButtonType.Normal,
          onClick: () => { this._toggleVisibleCategory(cat); return ''; },
        })
      );
      // Up button (disabled for first item)
      if (idx > 0) {
        fields.push(
          PropertyPaneButton(`catUp_${idx}`, {
            text: `↑ Move "${cat}" up`,
            buttonType: PropertyPaneButtonType.Normal,
            onClick: () => { this._moveCategoryUp(cat); return ''; },
          })
        );
      }
      // Down button (disabled for last item)
      if (idx < cats.length - 1) {
        fields.push(
          PropertyPaneButton(`catDown_${idx}`, {
            text: `↓ Move "${cat}" down`,
            buttonType: PropertyPaneButtonType.Normal,
            onClick: () => { this._moveCategoryDown(cat); return ''; },
          })
        );
      }
    });

    return fields;
  }

  private _parseCategoryColors(): string[] {
    const defaults = [
      '#0078d4', '#107c10', '#d83b01', '#5c2d91', '#008272',
      '#ca5010', '#004b1c', '#004e8c', '#750b1c', '#4f6bed',
    ];
    const raw = this.properties.categoryColors;
    if (!raw) return defaults;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return defaults.map((def, i) => {
          const v = (parsed as string[])[i];
          return v && v.trim() ? v.trim() : def;
        });
      }
    } catch { /* ignore */ }
    return defaults;
  }

  private _setCategoryColor(slotIndex: number, hex: string): void {
    const colors = this._parseCategoryColors();
    colors[slotIndex] = hex && hex.trim() ? hex.trim() : colors[slotIndex];
    this.properties.categoryColors = JSON.stringify(colors);
  }

  private _getCategoryColorFields(categories: string[]): import('@microsoft/sp-property-pane').IPropertyPaneField<unknown>[] {
    const colors = this._parseCategoryColors();
    // Show one field per known category (up to 10), labelled with the category name
    const slots = categories.slice(0, 10);
    return slots.map((cat, i) =>
      PropertyPaneTextField(`categoryColors_slot${i}`, {
        label: `"${cat}" color (hex)`,
        placeholder: colors[i],
        value: colors[i],
        onGetErrorMessage: (value: string) => {
          if (!value || value === '') return '';
          if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
            this._setCategoryColor(i, value);
            return '';
          }
          return 'Enter a valid hex color (e.g. #0078d4)';
        },
      })
    );
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    const listOptions = this._getListOptions();

    return {
      pages: [
        {
          header: { description: 'Configure your FAQ - Accordion web part' },
          displayGroupsAsAccordion: true,
          groups: [
            // ── 1. Data Source ─────────────────────────────────────────────
            {
              groupName: '📋 Data Source',
              isCollapsed: false,
              groupFields: [
                PropertyPaneDropdown('listName', {
                  label: 'SharePoint List',
                  options: listOptions,
                  selectedKey: this.properties.listName,
                }),
                PropertyPaneButton('listName', {
                  text: 'Create / Reconnect FAQ List',
                  buttonType: PropertyPaneButtonType.Normal,
                  onClick: async () => {
                    await this._ensureDefaultList();
                    this.context.propertyPane.refresh();
                    this.render();
                    return this.properties.listName;
                  },
                }),
                PropertyPaneLabel('listName', {
                  text: this._listProvisionMessage
                    ? `ℹ️ ${this._listProvisionMessage}`
                    : this.properties.listName
                    ? `✅ Connected: ${this.properties.listName}`
                    : '⚠️ No list selected',
                }),
                // ── View Selector (Option F) ──
                ...(this._availableViews.length > 0 ? [
                  PropertyPaneDropdown('selectedView', {
                    label: 'List View (optional)',
                    options: [
                      { key: '', text: '— Default (all items) —' },
                      ...this._availableViews.map(v => ({ key: v.Title, text: v.DefaultView ? `${v.Title} (default)` : v.Title })),
                    ],
                    selectedKey: this.properties.selectedView || '',
                  }),
                  PropertyPaneLabel('selectedViewHint', {
                    text: this.properties.selectedView
                      ? `Items are scoped to the "${this.properties.selectedView}" view.`
                      : 'All items shown. Select a view to filter by its built-in criteria.',
                  }),
                ] : []),
              ],
            },

            // ── 2. Accordion Style ─────────────────────────────────────────
            {
              groupName: '🎨 Accordion Style',
              isCollapsed: true,
              groupFields: [
                PropertyPaneDropdown('accordionStyle', {
                  label: 'Layout Style',
                  options: [
                    { key: 'minimal', text: 'Minimal Classic (Default)' },
                    { key: 'leftNavCard', text: 'Left Nav + Detail Card' },
                    { key: 'pillPanel', text: 'Pill / Panel Accordion' },
                    { key: 'cardStack', text: 'Card Stack Layout' },
                  ],
                  selectedKey: this.properties.accordionStyle || 'minimal',
                }),
                PropertyPaneDropdown('arrowPosition', {
                  label: 'Arrow Position',
                  options: [
                    { key: 'right', text: 'Right (Default)' },
                    { key: 'left', text: 'Left' },
                  ],
                  selectedKey: this.properties.arrowPosition || 'right',
                }),
                PropertyPaneDropdown('iconStyle', {
                  label: 'Icon Style',
                  options: [
                    { key: 'chevron', text: 'Chevron' },
                    { key: 'plusMinus', text: 'Plus / Minus' },
                    { key: 'arrow', text: 'Arrow' },
                    { key: 'caret', text: 'Caret' },
                  ],
                  selectedKey: this.properties.iconStyle || 'chevron',
                }),
                PropertyPaneDropdown('expandMode', {
                  label: 'Expand Mode',
                  options: [
                    { key: 'single', text: 'Single (one open at a time)' },
                    { key: 'multi', text: 'Multi (multiple open)' },
                  ],
                  selectedKey: this.properties.expandMode || 'single',
                }),
                PropertyPaneToggle('expandFirstItem', {
                  label: 'Expand First Item by Default',
                  checked: this.properties.expandFirstItem || false,
                }),
                PropertyPaneSlider('itemGap', {
                  label: 'Space Between Items (px)',
                  min: 0,
                  max: 24,
                  step: 1,
                  value: this.properties.itemGap !== undefined ? this.properties.itemGap : (
                    (this.properties.accordionStyle === 'cardStack') ? 10 :
                    (this.properties.accordionStyle === 'pillPanel') ? 8 : 0
                  ),
                  showValue: true,
                }),
                PropertyPaneToggle('animationEnabled', {
                  label: 'Enable Smooth Animation',
                  checked: this.properties.animationEnabled !== false,
                }),
              ],
            },

            // ── 3. Title & Text ────────────────────────────────────────────
            {
              groupName: '✏️ Title & Text',
              isCollapsed: true,
              groupFields: [
                PropertyPaneToggle('showTitle', {
                  label: 'Show Web Part Title',
                  checked: this.properties.showTitle || false,
                }),
                PropertyPaneTextField('titleText', {
                  label: 'Title Text',
                  placeholder: 'Frequently Asked Questions',
                  value: this.properties.titleText || '',
                }),
                PropertyPaneDropdown('titleAlignment', {
                  label: 'Title Alignment',
                  options: [
                    { key: 'left', text: 'Left (Default)' },
                    { key: 'center', text: 'Center' },
                    { key: 'right', text: 'Right' },
                  ],
                  selectedKey: this.properties.titleAlignment || 'left',
                }),
                PropertyPaneSlider('titleFontSize', {
                  label: 'Title Font Size (px)',
                  min: 14,
                  max: 36,
                  step: 1,
                  showValue: true,
                  value: this.properties.titleFontSize || 20,
                }),
                PropertyPaneSlider('questionFontSize', {
                  label: 'Question Font Size (px)',
                  min: 12,
                  max: 24,
                  step: 1,
                  showValue: true,
                  value: this.properties.questionFontSize || 15,
                }),
                PropertyPaneDropdown('questionStyle', {
                  label: 'Question Text Style',
                  options: [
                    { key: 'normal', text: 'Normal' },
                    { key: 'bold', text: 'Bold' },
                    { key: 'italic', text: 'Italic' },
                    { key: 'boldItalic', text: 'Bold + Italic' },
                  ],
                  selectedKey: this.properties.questionStyle || 'normal',
                }),
                PropertyPaneSlider('answerFontSize', {
                  label: 'Answer Font Size (px)',
                  min: 11,
                  max: 20,
                  step: 1,
                  showValue: true,
                  value: this.properties.answerFontSize || 14,
                }),
                PropertyPaneSlider('categoryFontSize', {
                  label: 'Category Font Size (px)',
                  min: 11,
                  max: 18,
                  step: 1,
                  showValue: true,
                  value: this.properties.categoryFontSize || 13,
                }),
              ],
            },

            // ── 4. Categories & Search ─────────────────────────────────────
            {
              groupName: '🔍 Categories & Search',
              isCollapsed: true,
              groupFields: [
                PropertyPaneToggle('showCategories', {
                  label: 'Show Category Filter',
                  // Default OFF
                  checked: this.properties.showCategories === true,
                }),
                PropertyPaneDropdown('categoryStyle', {
                  label: 'Category UI Style',
                  options: [
                    { key: 'tabs', text: 'Tabs' },
                    { key: 'pills', text: 'Pills' },
                    { key: 'underline', text: 'Underline' },
                    { key: 'chips', text: 'Chips' },
                  ],
                  selectedKey: this.properties.categoryStyle || 'pills',
                }),
                PropertyPaneDropdown('categoryAlignment', {
                  label: 'Category Alignment',
                  options: [
                    { key: 'left', text: 'Left (Default)' },
                    { key: 'center', text: 'Center' },
                    { key: 'right', text: 'Right' },
                  ],
                  selectedKey: this.properties.categoryAlignment || 'left',
                }),
                PropertyPaneToggle('showAllCategory', {
                  label: 'Show "All" Option',
                  checked: this.properties.showAllCategory === true,
                }),
                PropertyPaneToggle('categoryColorCoding', {
                  label: 'Color-Code Categories',
                  checked: this.properties.categoryColorCoding === true,
                }),
                ...(this.properties.categoryColorCoding === true
                  ? this._getCategoryColorFields(
                      ['General', 'Account', 'Billing', 'Technical', 'Other']
                    )
                  : []),
                PropertyPaneToggle('showSearch', {
                  label: 'Show Search Bar',
                  // Default OFF
                  checked: this.properties.showSearch === true,
                }),
                PropertyPaneDropdown('searchPlacement', {
                  label: 'Search Bar Placement',
                  options: [
                    { key: 'aboveCategories', text: 'Above Categories (Default)' },
                    { key: 'belowCategories', text: 'Below Categories' },
                    { key: 'fullWidth', text: 'Full Width (spans entire web part)' },
                  ],
                  selectedKey: this.properties.searchPlacement || 'aboveCategories',
                }),
                PropertyPaneDropdown('searchAlignment', {
                  label: 'Search Bar Alignment',
                  options: [
                    { key: 'left', text: 'Left (Default)' },
                    { key: 'center', text: 'Center' },
                    { key: 'right', text: 'Right' },
                  ],
                  selectedKey: this.properties.searchAlignment || 'left',
                }),
                PropertyPaneTextField('searchPlaceholder', {
                  label: 'Search Placeholder Text',
                  placeholder: 'Search FAQs...',
                  value: this.properties.searchPlaceholder || '',
                }),
                PropertyPaneDropdown('searchScope', {
                  label: 'Search Scope',
                  options: [
                    { key: 'question', text: 'Question Only' },
                    { key: 'questionAnswer', text: 'Question + Answer' },
                  ],
                  selectedKey: this.properties.searchScope || 'questionAnswer',
                }),
              ],
            },

            // ── 5. Secondary Filter Bar (Option B) ─────────────────────────
            {
              groupName: '🔎 Secondary Filter Bar',
              isCollapsed: true,
              groupFields: [
                PropertyPaneToggle('filterBarEnabled', {
                  label: 'Show Secondary Filter Bar',
                  checked: this.properties.filterBarEnabled === true,
                  onText: 'On',
                  offText: 'Off',
                }),
                ...(this.properties.filterBarEnabled ? [
                  // Reload button — useful if columns were added after pane was opened
                  PropertyPaneButton('refreshColumns', {
                    text: '↺ Refresh Column List',
                    buttonType: PropertyPaneButtonType.Normal,
                    onClick: () => {
                      this._loadViewsAndColumns().then(() => this.context.propertyPane.refresh()).catch(() => undefined);
                      return '';
                    },
                  }),
                  // Column picker — shows a warning if none found, but Placement/Alignment always visible
                  ...(this._filterableColumns.length > 0 ? [
                    PropertyPaneDropdown('filterColumn', {
                      label: 'Filter by Column',
                      options: [
                        { key: '', text: '— Select a column —' },
                        ...this._filterableColumns.map(c => ({ key: c.InternalName, text: c.Title })),
                      ],
                      selectedKey: this.properties.filterColumn || '',
                    }),
                    PropertyPaneTextField('filterColumnLabel', {
                      label: 'Filter Bar Label (optional)',
                      placeholder: this.properties.filterColumn
                        ? (this._filterableColumns.find(c => c.InternalName === this.properties.filterColumn) || { Title: '' }).Title
                        : 'e.g. Audience',
                      value: this.properties.filterColumnLabel || '',
                      description: 'Label shown to the left of the filter chips. Leave blank to use the column name.',
                    }),
                  ] : [
                    PropertyPaneLabel('noColsLabel', {
                      text: 'No filterable columns found. Make sure the list has Choice or Yes/No columns, then close and reopen the property pane.',
                    }),
                  ]),
                  // Placement and alignment always available once the bar is enabled
                  PropertyPaneDropdown('filterBarPlacement', {
                    label: 'Placement',
                    options: [
                      { key: 'aboveSearch', text: 'Above Search Bar' },
                      { key: 'belowSearch', text: 'Below Search Bar' },
                    ] as IPropertyPaneDropdownOption[],
                    selectedKey: this.properties.filterBarPlacement || 'aboveSearch',
                  }),
                  PropertyPaneDropdown('filterBarAlignment', {
                    label: 'Chip Alignment',
                    options: [
                      { key: 'left', text: 'Left' },
                      { key: 'center', text: 'Center' },
                      { key: 'right', text: 'Right' },
                    ] as IPropertyPaneDropdownOption[],
                    selectedKey: this.properties.filterBarAlignment || 'left',
                  }),
                ] : []),
              ],
            },

            // ── 6. Category Visibility & Order ─────────────────────────────
            {
              groupName: '📂 Category Visibility & Order',
              isCollapsed: true,
              groupFields: [
                ...this._getCategoryVisibilityFields(),
              ],
            },

            // ── 6. Appearance ──────────────────────────────────────────────
            {
              groupName: '🖌️ Appearance',
              isCollapsed: true,
              groupFields: [
                PropertyPaneTextField('accentColor', {
                  label: 'Accent Color (hex) — overrides default blue',
                  placeholder: '#0078d4',
                  value: this.properties.accentColor || '',
                  description: 'Leave blank to use the SharePoint theme color.',
                }),
                PropertyPaneTextField('colorTitle', {
                  label: 'Title Color (hex)',
                  placeholder: 'Leave blank for default',
                  value: this.properties.colorTitle || '',
                }),
                PropertyPaneTextField('colorQuestion', {
                  label: 'Question Color (hex)',
                  placeholder: 'Leave blank for default',
                  value: this.properties.colorQuestion || '',
                }),
                PropertyPaneTextField('colorAnswer', {
                  label: 'Answer Color (hex)',
                  placeholder: 'Leave blank for default',
                  value: this.properties.colorAnswer || '',
                }),
                PropertyPaneTextField('colorIcons', {
                  label: 'Icon Color (hex)',
                  placeholder: 'Leave blank for default',
                  value: this.properties.colorIcons || '',
                }),
                PropertyPaneTextField('colorBorders', {
                  label: 'Border Color (hex)',
                  placeholder: 'Leave blank to use Border Darkness slider',
                  value: this.properties.colorBorders || '',
                }),
                PropertyPaneSlider('borderThickness', {
                  label: 'Border Thickness (0 = no border)',
                  min: 0,
                  max: 4,
                  step: 1,
                  showValue: true,
                  value: this.properties.borderThickness !== undefined ? this.properties.borderThickness : 1,
                }),
                PropertyPaneSlider('borderDarkness', {
                  label: 'Border Darkness (0 = subtle, 100 = dark)',
                  min: 0,
                  max: 100,
                  step: 5,
                  showValue: true,
                  value: this.properties.borderDarkness !== undefined ? this.properties.borderDarkness : 30,
                }),
                PropertyPaneSlider('borderRadius', {
                  label: 'Border Radius (px)',
                  min: 0,
                  max: 16,
                  step: 1,
                  showValue: true,
                  value: this.properties.borderRadius || 4,
                }),
                PropertyPaneSlider('webPartPadding', {
                  label: 'Web Part Padding (px)',
                  min: 0,
                  max: 40,
                  step: 2,
                  value: this.properties.webPartPadding !== undefined ? this.properties.webPartPadding : 20,
                  showValue: true,
                }),
                PropertyPaneDropdown('shadowIntensity', {
                  label: 'Shadow Intensity (Card Styles)',
                  options: [
                    { key: 'none', text: 'None' },
                    { key: 'light', text: 'Light' },
                    { key: 'medium', text: 'Medium (Default)' },
                    { key: 'heavy', text: 'Heavy' },
                  ],
                  selectedKey: this.properties.shadowIntensity || 'medium',
                }),
              ],
            },

            // ── 6. Advanced ────────────────────────────────────────────────
            {
              groupName: '⚙️ Advanced',
              isCollapsed: true,
              groupFields: [
                PropertyPaneDropdown('sortField', {
                  label: 'Sort Field',
                  options: [
                    { key: 'SortOrder', text: 'Sort Order (Default)' },
                    { key: 'Title', text: 'Question (A–Z)' },
                    { key: 'Category', text: 'Category' },
                    { key: 'Modified', text: 'Last Modified' },
                  ],
                  selectedKey: this.properties.sortField || 'SortOrder',
                }),
                PropertyPaneDropdown('sortDirection', {
                  label: 'Sort Direction',
                  options: [
                    { key: 'asc', text: 'Ascending' },
                    { key: 'desc', text: 'Descending' },
                  ],
                  selectedKey: this.properties.sortDirection || 'asc',
                }),
                PropertyPaneToggle('showOnlyActive', {
                  label: 'Show Only Active Items',
                  checked: this.properties.showOnlyActive !== false,
                }),
                PropertyPaneSlider('maxItems', {
                  label: 'Max Items to Display',
                  min: 1,
                  max: 500,
                  step: 1,
                  showValue: true,
                  value: this.properties.maxItems || 100,
                }),
                PropertyPaneTextField('emptyStateText', {
                  label: 'Empty State Message',
                  placeholder: 'No FAQ items found.',
                  value: this.properties.emptyStateText || '',
                }),
                PropertyPaneTextField('loadingText', {
                  label: 'Loading Message',
                  placeholder: 'Loading FAQs...',
                  value: this.properties.loadingText || '',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
