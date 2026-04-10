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

export class FaqListService {
  private _sp: ReturnType<typeof spfi>;

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

    await list.fields.addChoice('Category', {
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
      await list.fields.addChoice('Category', {
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

  public async getItems(
    listName: string,
    sortField: string,
    sortDirection: 'asc' | 'desc',
    showOnlyActive: boolean,
    maxItems: number
  ): Promise<IFaqItem[]> {
    if (!listName) return [];

    try {
      let query = this._sp.web.lists
        .getByTitle(listName)
        .items.select('Id', 'Title', 'Answer', 'Category', 'SortOrder', 'IsActive', 'ExpandedByDefault')
        .orderBy(sortField || 'SortOrder', sortDirection !== 'desc')
        .top(maxItems > 0 ? maxItems : 500);

      if (showOnlyActive) {
        query = query.filter('IsActive eq 1');
      }

      interface IRawFaqItem {
        Id: number;
        Title: string;
        Answer: string;
        Category: string;
        SortOrder: number;
        IsActive: boolean;
        ExpandedByDefault: boolean;
      }
      const items = await query();
      return (items as IRawFaqItem[]).map(item => ({
        id: item.Id,
        title: item.Title || '',
        answer: item.Answer || '',
        category: item.Category || '',
        sortOrder: item.SortOrder || 0,
        isActive: item.IsActive !== false,
        expandedByDefault: item.ExpandedByDefault === true,
      }));
    } catch (e) {
      console.error('FaqListService.getItems error:', e);
      throw e;
    }
  }

  public async getCategories(listName: string): Promise<string[]> {
    if (!listName) return [];
    try {
      interface IRawCatItem { Category: string; }
      const items = await this._sp.web.lists
        .getByTitle(listName)
        .items.select('Category')
        .filter('IsActive eq 1')
        .top(500)();
      const cats = (items as IRawCatItem[])
        .map(i => i.Category || '')
        .filter((c: string) => !!c);
      // Deduplicate without Set spread (es5 compat)
      const seen: { [key: string]: boolean } = {};
      const unique: string[] = [];
      cats.forEach((c: string) => {
        if (!seen[c]) {
          seen[c] = true;
          unique.push(c);
        }
      });
      return unique.sort();
    } catch {
      return [];
    }
  }
}
