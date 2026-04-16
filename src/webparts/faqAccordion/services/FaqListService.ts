import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi } from '@pnp/sp';
import { SPFx } from '@pnp/sp/behaviors/spfx';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/fields';
import '@pnp/sp/items';
import '@pnp/sp/views';
import { IFaqItem } from '../components/types/IFaqTypes';

export interface IListInfo {
  Id: string;
  Title: string;
}

export interface IListViewInfo {
  Id: string;
  Title: string;
  DefaultView: boolean;
}

export interface IListColumnInfo {
  InternalName: string;
  Title: string;
  FieldTypeKind: number; // 6=Choice, 8=Boolean, 15=GridChoice
}

export class FaqListService {
  private _sp: ReturnType<typeof spfi>;

  /**
   * Normalises every possible shape SharePoint REST can return for a Choice/MultiChoice field:
   *   - Modern multi-choice:  { results: ["Account", "Billing"] }
   *   - Plain string:         "General"
   *   - Comma-separated:      "Account, Billing"   (list-view display format)
   *   - Semicolon-separated:  "Account;Billing"
   *   - Classic lookup fmt:   "Account;#Billing;#"
   *   - null / undefined / ""
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static _parseCategories(raw: any): string[] {
    if (raw === null || raw === undefined || raw === '') return [];

    // PnPjs v4 unwraps OData — multi-choice comes back as a plain string[]
    if (Array.isArray(raw)) {
      return raw.map((c: string) => String(c).trim()).filter((c: string) => !!c);
    }

    // Older OData wrapper: { results: string[] }
    if (typeof raw === 'object' && raw.results && Array.isArray(raw.results)) {
      return (raw.results as string[]).map((c: string) => c.trim()).filter((c: string) => !!c);
    }

    if (typeof raw === 'string' && raw.trim() !== '') {
      // Remove classic SharePoint lookup "#" markers: "Account;#Billing;#" → "Account;Billing"
      const cleaned = raw.replace(/;#/g, ';').replace(/^;+|;+$/g, '').trim();
      // Determine delimiter: prefer semicolon, fall back to comma
      const delimiter = cleaned.indexOf(';') !== -1 ? ';' : ',';
      return cleaned.split(delimiter).map((c: string) => c.trim()).filter((c: string) => !!c);
    }

    return [];
  }

  constructor(context: WebPartContext) {
    this._sp = spfi().using(SPFx(context));
  }

  public async getLists(): Promise<IListInfo[]> {
    try {
      const lists = await this._sp.web.lists
        .filter("Hidden eq false and BaseTemplate eq 100")
        .select('Id', 'Title')
        .orderBy('Title')();
      return lists as IListInfo[];
    } catch (e) {
      console.error('FaqListService.getLists error:', e);
      return [];
    }
  }

  public async ensureList(listName: string): Promise<{ success: boolean; listId: string; message: string }> {
    try {
      const exists = await this._listExists(listName);
      if (exists) {
        const list = await this._sp.web.lists.getByTitle(listName).select('Id')();
        await this._ensureColumns(listName);
        return { success: true, listId: (list as IListInfo).Id, message: `List "${listName}" already exists and is ready.` };
      }

      const result = await this._sp.web.lists.add(listName, 'FAQ Accordion list', 100, false, {
        OnQuickLaunch: false,
      } as Record<string, unknown>);
      const listId: string = (result as unknown as IListInfo).Id;
      await this._createColumns(listName);
      return { success: true, listId, message: `List "${listName}" created successfully.` };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('FaqListService.ensureList error:', e);
      return { success: false, listId: '', message: `Failed to create/access list: ${msg}` };
    }
  }

  private async _listExists(listName: string): Promise<boolean> {
    try {
      await this._sp.web.lists.getByTitle(listName).select('Id')();
      return true;
    } catch {
      return false;
    }
  }

  private async _createColumns(listName: string): Promise<void> {
    const list = this._sp.web.lists.getByTitle(listName);

    await list.fields.addMultilineText('Answer', {
      RichText: true,
      NumberOfLines: 10,
    });

    await list.fields.addMultiChoice('Category', {
      Choices: ['General', 'Account', 'Billing', 'Technical', 'Other'],
    });

    await list.fields.addNumber('SortOrder');
    await list.fields.addBoolean('IsActive');
    await list.fields.addBoolean('ExpandedByDefault');

    // Add fields to default view
    const viewFields = list.defaultView.fields;
    await viewFields.add('Answer');
    await viewFields.add('Category');
    await viewFields.add('SortOrder');
    await viewFields.add('IsActive');
    await viewFields.add('ExpandedByDefault');
  }

  private async _ensureColumns(listName: string): Promise<void> {
    const list = this._sp.web.lists.getByTitle(listName);
    const existingFields = await list.fields.select('InternalName')();
    const fieldNames = (existingFields as Array<{ InternalName: string }>).map(f => f.InternalName);

    if (fieldNames.indexOf('Answer') === -1) {
      await list.fields.addMultilineText('Answer', { RichText: true, NumberOfLines: 10 });
    }
    if (fieldNames.indexOf('Category') === -1) {
      await list.fields.addMultiChoice('Category', {
        Choices: ['General', 'Account', 'Billing', 'Technical', 'Other'],
      });
    }
    if (fieldNames.indexOf('SortOrder') === -1) {
      await list.fields.addNumber('SortOrder');
    }
    if (fieldNames.indexOf('IsActive') === -1) {
      await list.fields.addBoolean('IsActive');
    }
    if (fieldNames.indexOf('ExpandedByDefault') === -1) {
      await list.fields.addBoolean('ExpandedByDefault');
    }
  }

  /** Returns all non-hidden views for a list */
  public async getListViews(listName: string): Promise<IListViewInfo[]> {
    if (!listName) return [];
    try {
      const views = await this._sp.web.lists
        .getByTitle(listName)
        .views
        .select('Id', 'Title', 'DefaultView')
        .filter('Hidden eq false')();
      return (views as IListViewInfo[]).sort((a, b) => {
        // Default view first, then alphabetical
        if (a.DefaultView && !b.DefaultView) return -1;
        if (!a.DefaultView && b.DefaultView) return 1;
        return a.Title.localeCompare(b.Title);
      });
    } catch (e) {
      console.error('FaqListService.getListViews error:', e);
      return [];
    }
  }

  /** Returns filterable columns (Choice, MultiChoice, Boolean/Yes-No) */
  public async getFilterableColumns(listName: string): Promise<IListColumnInfo[]> {
    if (!listName) return [];
    try {
      const fields = await this._sp.web.lists
        .getByTitle(listName)
        .fields
        .select('InternalName', 'Title', 'FieldTypeKind')
        .filter('Hidden eq false and ReadOnlyField eq false')();
      // FieldTypeKind: 6=Choice, 15=MultiChoice, 8=Boolean
      return (fields as IListColumnInfo[])
        .filter(f =>
          f.FieldTypeKind === 6 ||
          f.FieldTypeKind === 15 ||
          f.FieldTypeKind === 8
        )
        .sort((a, b) => a.Title.localeCompare(b.Title));
    } catch (e) {
      console.error('FaqListService.getFilterableColumns error:', e);
      return [];
    }
  }

  /** Returns distinct values for a given column (for the filter bar chips) */
  public async getColumnValues(listName: string, columnInternalName: string): Promise<string[]> {
    if (!listName || !columnInternalName) return [];
    try {
      const items = await this._sp.web.lists
        .getByTitle(listName)
        .items
        .select(columnInternalName)
        .top(500)();

      const seen: { [k: string]: boolean } = {};
      const unique: string[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (items as any[]).forEach(item => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any = item[columnInternalName];
        let vals: string[] = [];

        if (raw === null || raw === undefined) return;
        if (typeof raw === 'boolean') {
          vals = [raw ? 'Yes' : 'No'];
        } else if (Array.isArray(raw)) {
          vals = raw.map(String);
        } else if (typeof raw === 'object' && raw.results) {
          vals = (raw.results as string[]).map(String);
        } else {
          vals = [String(raw)];
        }

        vals.forEach(v => {
          const trimmed = v.trim();
          if (trimmed && !seen[trimmed]) {
            seen[trimmed] = true;
            unique.push(trimmed);
          }
        });
      });

      return unique.sort();
    } catch (e) {
      console.error('FaqListService.getColumnValues error:', e);
      return [];
    }
  }

  public async getItems(
    listName: string,
    sortField: string,
    sortDirection: 'asc' | 'desc',
    showOnlyActive: boolean,
    maxItems: number,
    viewTitle?: string,
    extraColumns?: string[]
  ): Promise<IFaqItem[]> {
    if (!listName) return [];

    try {
      // First, resolve the actual internal name of the Category field
      const categoryInternalName = await this._getCategoryFieldName(listName);

      const selectFields = ['Id', 'Title', 'Answer', categoryInternalName, 'SortOrder', 'IsActive', 'ExpandedByDefault',
        ...(extraColumns || [])
      ];

      // If a view is specified, load items scoped to that view's filter/sort
      // by fetching the view's CAML query and applying it, otherwise use direct query
      let baseItems: unknown[];

      if (viewTitle) {
        try {
          // Get the view's items using the view's own filter/sort
          const viewItems = await this._sp.web.lists
            .getByTitle(listName)
            .getItemsByCAMLQuery(
              await this._getViewCaml(listName, viewTitle),
              ...selectFields
            );
          baseItems = viewItems;
        } catch {
          // Fall back to normal query if view CAML fails
          baseItems = await this._sp.web.lists
            .getByTitle(listName)
            .items.select(...selectFields)
            .orderBy(sortField || 'SortOrder', sortDirection !== 'desc')
            .top(maxItems > 0 ? maxItems : 500)();
        }
      } else {
        let query = this._sp.web.lists
          .getByTitle(listName)
          .items.select(...selectFields)
          .orderBy(sortField || 'SortOrder', sortDirection !== 'desc')
          .top(maxItems > 0 ? maxItems : 500);

        if (showOnlyActive) {
          query = query.filter('IsActive eq 1');
        }
        baseItems = await query();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (baseItems as any[]).map(item => {
        // Try the resolved internal name first, then fall back to 'Category'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any = item[categoryInternalName] !== undefined ? item[categoryInternalName] : item.Category;
        const cats: string[] = FaqListService._parseCategories(raw);
        // Collect extra column values for secondary filtering
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extraFields: { [k: string]: any } = {};
        (extraColumns || []).forEach(col => {
          extraFields[col] = item[col];
        });

        return {
          id: item.Id,
          title: item.Title || '',
          answer: item.Answer || '',
          categories: cats,
          sortOrder: item.SortOrder || 0,
          isActive: item.IsActive !== false,
          expandedByDefault: item.ExpandedByDefault === true,
          extraFields,
        };
      });
    } catch (e) {
      console.error('FaqListService.getItems error:', e);
      throw e;
    }
  }

  /** Builds a CAML query from a named view's ViewQuery so items are scoped to that view */
  private async _getViewCaml(listName: string, viewTitle: string): Promise<{ ViewXml: string }> {
    interface IRawView { ViewQuery: string; RowLimit: number; }
    const view = await this._sp.web.lists
      .getByTitle(listName)
      .views.getByTitle(viewTitle)
      .select('ViewQuery', 'RowLimit')() as IRawView;

    const rowLimit = view.RowLimit || 500;
    const viewXml = `<View><Query>${view.ViewQuery || ''}</Query><RowLimit>${rowLimit}</RowLimit></View>`;
    return { ViewXml: viewXml };
  }

  /**
   * Finds the actual internal name of the Category field.
   * SharePoint renames user-created fields to avoid built-in collisions
   * (e.g. "Category" → "Category0").
   */
  private async _getCategoryFieldName(listName: string): Promise<string> {
    try {
      interface IRawField { InternalName: string; Title: string; }
      const fields = await this._sp.web.lists
        .getByTitle(listName)
        .fields
        .select('InternalName', 'Title')
        .filter("Title eq 'Category' or InternalName eq 'Category' or InternalName eq 'Category0'")() as IRawField[];

      // Prefer exact internal name match, then title match
      const byInternal = fields.filter(f => f.InternalName === 'Category' || f.InternalName === 'Category0');
      if (byInternal.length > 0) {
        return byInternal[0].InternalName;
      }
      const byTitle = fields.filter(f => f.Title === 'Category');
      if (byTitle.length > 0) {
        return byTitle[0].InternalName;
      }
    } catch {
      // fall through to default
    }
    return 'Category';
  }

  /**
   * Returns the available category choices from the field definition.
   * Using the field schema guarantees the filter bar shows all configured
   * choices even when no items have been tagged yet.
   */
  public async getCategories(listName: string): Promise<string[]> {
    if (!listName) return [];
    try {
      const internalName = await this._getCategoryFieldName(listName);
      interface IRawFieldInfo {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Choices: any;
        InternalName: string;
      }
      const field = await this._sp.web.lists
        .getByTitle(listName)
        .fields.getByInternalNameOrTitle(internalName)
        .select('Choices', 'InternalName')() as IRawFieldInfo;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = field && field.Choices;
      if (!raw) return [];

      let choices: string[] = [];
      if (Array.isArray(raw)) {
        choices = raw as string[];
      } else if (raw.results && Array.isArray(raw.results)) {
        choices = raw.results as string[];
      }
      return choices.filter((c: string) => !!c).sort();
    } catch {
      return [];
    }
  }
}
