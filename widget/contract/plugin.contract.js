/* eslint-disable no-undef */
/**
 * Seminar and Lecture Notes contract — runtime implementation.
 *
 * This file only implements the operations declared with "type": "function" in plugin.contract.json. Every operation of this plugin is a function: each one either resolves an item's title first, validates and reshapes its input the way the control panel's forms do, or runs side effects (deep links, analytics, events) beside its write, so none of them is a single declarative platform call.
 *
 * Each function operation is dispatched by its context.functionName, receives (options, callback), may nest any number of buildfire.* calls, and may run its own logic between them. Each one declares a context.hosts in plugin.contract.json, which is what the `hosts:` tag on the JSDoc below refers to. An operation lists every place it can run: at most one widget host, at most one control host, and headlessSdk when it is server-safe (generic always stands alone):
 *
 *   generic            no buildfire at all — pure logic, evaluated anywhere.
 *   headlessSdk        uses buildfire and is server-safe; runs on the server.
 *   widgetForeground   runs in the iframe under the app; never on the server.
 *   widgetBackground   Foreground when someone has to be watching it run — it
 *                      surfaces UI, or reaches real people so unattended is
 *                      itself a problem; Background otherwise.
 *   controlForeground  runs in the iframe under the control panel; never on
 *   controlBackground  the server. Foreground/Background by the same rule.
 *
 * headlessSdk is left out when the operation needs frame state (device, localStorage, bookmarks, the actual signed-in session, UI) or handles user-sensitive data / critical behavior that must not be reachable remotely. Here it is left out of every item write: the control panel registers a deep link and an analytics event for each item it saves, and the server provides neither buildfire.deeplink nor buildfire.analytics.
 *
 * Only operations whose hosts include generic or headlessSdk are exposed to the MCP.
 *
 * `buildfire` is resolved as a global: in the widget/control hosts it comes from the injected SDK, and on the server the headless SDK provides it. `widgetContract`, `controlContract` and `frameId` are assigned as implicit globals for the same reason — the consumer reaches them without importing this file. The widget frame (widget/contract.html) and the server dispatch to widgetContract; the control panel's frame (control/contract.html) loads this same file and dispatches to controlContract.
 *
 * Every function is Node-style: callback(error, result), invoked exactly once, never with both error and result populated. Invalid input is reported through the callback rather than thrown synchronously.
 *
 * Every option a function reads here must be declared in that operation's `parameters` block, or a caller cannot pass it: the MCP server refuses any param the contract does not declare.
 */

// Must match the collection names in plugin.contract.json and TAG_NAMES in widget/enums.js / control/content/enums.js.
const ITEMS_TAG = 'seminarItems';
const INFO_TAG = 'seminarInfo';
const NOTES_TAG = 'seminarNotes';
const LANGUAGES_TAG = 'languages';

// The platform returns at most 50 records a search; further pages are told by recordCount / totalRecord.
const PAGE_SIZE = 50;
const BATCH_LIMIT = 50;

// Mirrors SORT in control/content/enums.js and the switch in getSearchOptions (content.home.controller.js, widget.home.controller.js).
const SORT_ORDERS = {
  'Manually': { rank: 1 },
  'Item title A-Z': { title: 1 },
  'Item title Z-A': { title: -1 },
  'Newest pub. date first': { publishDate: -1 },
  'Oldest pub. date first': { publishDate: 1 },
  'Newest entry first': { dateCreated: -1 },
  'Oldest entry first': { dateCreated: 1 }
};
// The widget shows items in manual order when the owner never picked one (widget.home.controller.js init).
const DEFAULT_SORT = 'Manually';

// Mirrors Settings.seminarDelayOptions and Settings.seminarLockedClassOptions in control/settings/controllers/settings.home.controller.js.
const SEMINAR_DELAY_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: 'Half hour', value: 30 },
  { label: 'One hour', value: 60 },
  { label: 'One Day', value: 1440 },
  { label: 'One Week', value: 10080 }
];
const LOCKED_STYLES = ['hidden', 'locked'];

// Mirrors LAYOUTS.itemListLayout in control/design/enums.js.
const LIST_LAYOUTS = ['Item_List_1', 'Item_List_2', 'Item_List_3', 'Item_List_4', 'Item_List_5'];

// Mirrors the labels of stringsConfig.screenOne in widget/assets/js/shared/stringsConfig.js: each label's default text and the
// maxLength its input enforces in the Languages tab.
const LABELS = {
  items: { defaultValue: 'Items', maxLength: 20 },
  myNotes: { defaultValue: 'My Notes', maxLength: 20 },
  bookmarks: { defaultValue: 'Bookmarks', maxLength: 20 },
  search: { defaultValue: 'Search', maxLength: 20 },
  openMenuOptions: { defaultValue: 'Open Menu Options', maxLength: 40 },
  openItemNotes: { defaultValue: 'Open Item Notes', maxLength: 40 },
  addNewNote: { defaultValue: 'Add New Note', maxLength: 40 },
  backToNoteList: { defaultValue: 'Back to Note List', maxLength: 40 },
  closeNoteList: { defaultValue: 'Close Note List', maxLength: 40 },
  done: { defaultValue: 'Done', maxLength: 40 },
  itemRemovedFromBookmarks: { defaultValue: 'Item removed From Bookmarks', maxLength: 60 },
  itemBookmarked: { defaultValue: 'Item bookmarked', maxLength: 60 },
  noItems: { defaultValue: 'No items added and released yet', maxLength: 60 },
  noNotesAddedYet: { defaultValue: 'No notes added yet', maxLength: 60 },
  noBookmarksAddedYet: { defaultValue: 'No bookmarks added yet', maxLength: 60 },
  noSearchResults: { defaultValue: 'No search results', maxLength: 60 },
  enterKeywordsOrPhraseToSearchItems: { defaultValue: 'Enter keywords or phrase to search items', maxLength: 60 },
  searchNoteTitlesAndContent: { defaultValue: 'Search note titles and content', maxLength: 60 },
  enterNoteTitle: { defaultValue: 'Enter Note Title', maxLength: 60 },
  enterNoteContent: { defaultValue: 'Enter note content', maxLength: 60 },
  saved: { defaultValue: 'Saved', maxLength: 60 },
  areYouSureTitle: { defaultValue: 'Are you sure?', maxLength: 60 },
  areYouSureMessage: { defaultValue: 'Are you sure you want to share notes for this item?', maxLength: 60 },
  areYouSureImportTitle: { defaultValue: 'Are you sure?', maxLength: 60 },
  areYouSureImportMessage: { defaultValue: 'Are you sure you want to replace notes for this item?', maxLength: 60 },
  expireWarning: { defaultValue: 'Shared content is available for 30 days', maxLength: 60 },
  errorSharing: { defaultValue: 'Error sharing notes', maxLength: 60 },
  shareTitle: { defaultValue: 'Sharing notes', maxLength: 60 },
  shareDescription: { defaultValue: 'Sharing notes for item: ', maxLength: 60 },
  errorSharingNoNotes: { defaultValue: "Error sharing notes: item doesn't contain notes", maxLength: 60 },
  deeplinkNoteNotFound: { defaultValue: 'Item does not exist!', maxLength: 50 },
  nextSeminarOpen: { defaultValue: 'The next seminar is now open', maxLength: 160 },
  seminarNotAvailable: { defaultValue: 'This seminar is not available at this time', maxLength: 60 }
};

/**
 * Throw only when there is no callback to report through; every other problem goes through the callback.
 */
const requireCallback = (callback) => {
  if (typeof callback !== 'function') throw new TypeError('callback must be a function');
};

/**
 * Assert that every named option is a non-empty string.
 * @returns {boolean} true when valid; false when the callback has already fired.
 */
const requireStringParams = (options, names, callback) => {
  requireCallback(callback);
  if (options === null || typeof options !== 'object') {
    callback(new Error('options must be an object'), undefined);
    return false;
  }
  const missing = names.find((name) => typeof options[name] !== 'string' || !options[name]);
  if (missing) {
    callback(new Error(`Missing required parameter: ${missing}`), undefined);
    return false;
  }
  return true;
};

const requireOptionsObject = (options, callback) => {
  requireCallback(callback);
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    callback(new Error('options must be an object'), undefined);
    return false;
  }
  return true;
};

const isEmptyRecord = (record) => !record || !record.id || !record.data || !Object.keys(record.data).length;

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Fire a declared event. Sent without a callback: the action it reports never waits on it.
 */
const emitEvent = (eventName, data) => {
  if (buildfire.services && buildfire.services.contract && buildfire.services.contract.events) {
    buildfire.services.contract.events.send(eventName, data);
  }
};

/**
 * A stored date (epoch milliseconds, as the control panel's date pickers store it, or '' when emptied) as an ISO instant, or null.
 */
const toIsoOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * Whether the app shows the item yet: mirrors the release-date filter in widget.home.controller.js getItems.
 */
const isReleased = (data) => !data.releaseDate || new Date(data.releaseDate) < Date.now();

/**
 * An item record as the operations return it: its id beside its stored fields, plus whether the app shows it yet.
 */
const toItem = (record) => {
  const data = record.data || {};
  return {
    id: record.id,
    title: data.title,
    summary: data.summary === undefined ? '' : data.summary,
    description: data.description === undefined ? '' : data.description,
    publishDate: data.publishDate === undefined ? '' : data.publishDate,
    releaseDate: data.releaseDate === undefined ? '' : data.releaseDate,
    isReleased: isReleased(data),
    listImage: data.listImage === undefined ? '' : data.listImage,
    carouselImages: data.carouselImages || [],
    links: data.links || [],
    itemListBgImage: data.itemListBgImage === undefined ? '' : data.itemListBgImage,
    deepLinkUrl: data.deepLinkUrl === undefined ? '' : data.deepLinkUrl,
    dateCreated: data.dateCreated,
    rank: data.rank
  };
};

/**
 * What the item events carry, from the record just written: nothing is fetched for it.
 */
const itemEventData = (id, data) => ({
  itemId: id,
  title: data.title,
  summary: data.summary || null,
  publishDate: toIsoOrNull(data.publishDate),
  releaseDate: toIsoOrNull(data.releaseDate),
  listImage: data.listImage || null
});

/**
 * One page of items in a stored sort order, with the total count the platform reports.
 */
const searchItemsPage = (filter, sort, skip, callback) => {
  const options = { filter, sort, skip, limit: PAGE_SIZE, recordCount: true };
  buildfire.datastore.search(options, ITEMS_TAG, (err, response) => {
    if (err) return callback(err, undefined);
    const records = Array.isArray(response) ? response : ((response && response.result) || []);
    const total = response && typeof response.totalRecord === 'number' ? response.totalRecord : records.length;
    callback(null, { records: records.filter(Boolean), total });
  });
};

/**
 * Every item in a stored sort order, page by page, as the content tab's loadMore reads them all.
 */
const loadAllItems = (sort, callback) => {
  const all = [];
  const next = (skip) => {
    searchItemsPage({}, sort, skip, (err, page) => {
      if (err) return callback(err, undefined);
      all.push(...page.records);
      if (page.records.length < PAGE_SIZE || all.length >= page.total) return callback(null, all);
      next(skip + PAGE_SIZE);
    });
  };
  next(0);
};

/**
 * Give every item its position in the list as its rank, as the content tab does when its list loads (loadMore) and when an item is dragged (itemSortableOptions.stop). Only items whose rank changes are written; like the content tab, the writes run side by side.
 */
const applyRanks = (records, callback) => {
  const changed = records.map((record, index) => ({ record, index })).filter(({ record, index }) => record.data.rank !== index);
  if (!changed.length) return callback(null);
  let pending = changed.length;
  let failure = null;
  changed.forEach(({ record, index }) => {
    const data = Object.assign({}, record.data, { rank: index });
    buildfire.datastore.update(record.id, data, ITEMS_TAG, (err) => {
      if (err && !failure) failure = err;
      record.data.rank = index;
      if (--pending === 0) callback(failure);
    });
  });
};

/**
 * The item a caller named by its exact title — the only handle a caller actually has. A title matching several items is refused rather than resolved to one of them: on a write, picking would mean acting on an item the caller did not mean.
 * @param {string} title
 * @param {function(Error=, object=)} callback - (error, record)
 */
const resolveItem = (title, callback) => {
  searchItemsPage({ '$json.title': title }, { rank: 1 }, 0, (err, page) => {
    if (err) return callback(err, undefined);
    if (!page.records.length) return callback(new Error(`No item titled "${title}"`), undefined);
    if (page.total > 1 || page.records.length > 1) {
      return callback(new Error(`${Math.max(page.total, page.records.length)} items are titled "${title}"`), undefined);
    }
    callback(null, page.records[0]);
  });
};

/**
 * The item record an advanced operation was given, checked to exist. The platform answers an unknown id with an empty record, not an error, so that is refused here.
 * @param {string} itemId
 * @param {function(Error=, object=)} callback - (error, record)
 */
const requireItemById = (itemId, callback) => {
  buildfire.datastore.getById(itemId, ITEMS_TAG, (err, record) => {
    if (err) return callback(err, undefined);
    if (isEmptyRecord(record)) return callback(new Error(`No item with id "${itemId}"`), undefined);
    callback(null, record);
  });
};

/**
 * An image param, checked against its declared count. Image params are always arrays, even for a single image, so a bare string is refused rather than wrapped: it means the caller misread the contract.
 * @param {*} value - the param as passed
 * @param {{ name: string, minValue: number, maxValue?: number }} bounds - exactly as declared
 * @returns {{ images?: string[], error?: string }}
 */
const readImageList = (value, { name, minValue, maxValue }) => {
  const range = maxValue === undefined ? `at least ${minValue}`
    : (minValue === maxValue ? `exactly ${minValue}` : (minValue === 0 ? `up to ${maxValue}` : `${minValue} to ${maxValue}`));
  if (!Array.isArray(value)) return { error: `${name} must be a list of image URLs (${range}), even for one image` };
  if (value.length < minValue || (maxValue !== undefined && value.length > maxValue)) {
    return { error: `${name} must hold ${range} image${maxValue === 1 ? '' : 's'}; got ${value.length}` };
  }
  if (value.some((url) => typeof url !== 'string' || !url)) return { error: `${name} must contain only image URLs` };
  return { images: value };
};

/**
 * A single-image param, unwrapped to the one URL the plugin stores. The thumbnail pickers store a removed image as '' (listImage.onDelete, background.onDelete), so an empty list does too.
 * @returns {{ url?: string, error?: string }}
 */
const readSingleImage = (value, name) => {
  const { images, error } = readImageList(value, { name, minValue: 0, maxValue: 1 });
  if (error) return { error };
  return { url: images.length ? images[0] : '' };
};

/**
 * A list of action items, stored exactly as given. Links need a title (the content tab's addLink keeps only links with one); carousel entries need the image they show (iconUrl), the field the carousel component reads.
 * @returns {{ actions?: object[], error?: string }}
 */
const readActionList = (value, name, requiredField) => {
  if (!Array.isArray(value)) return { error: `${name} must be a list of action items` };
  const bad = value.findIndex((entry) => !entry || typeof entry !== 'object' || Array.isArray(entry)
    || (entry.action !== undefined && (typeof entry.action !== 'string' || !entry.action))
    || typeof entry[requiredField] !== 'string' || !entry[requiredField]);
  if (bad !== -1) return { error: `${name} entry ${bad} must be an action item with a ${requiredField}` };
  return { actions: value };
};

/**
 * A date param ("2026-08-17"), stored as the control panel's date pickers store it: epoch milliseconds (+new Date(value)).
 * @returns {{ value?: number, error?: string }}
 */
const readDate = (value, name) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: `${name} must be a date like 2026-08-17` };
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return { error: `${name} must be a real date` };
  return { value: time };
};

/**
 * The item fields a create or an update asks for, checked and shaped the way the content tab stores them.
 * On an update (prefix "new"): left out skips a field; null or '' clears a nullable text field, null clears a date (stored as '',
 * which is what the date input holds once emptied), null or [] clears an image (stored as '') or a list (stored as []); anything else
 * sets it. The title is required by the item form (isValidItem), so it can be changed but never cleared.
 * @param {object} options
 * @param {boolean} isUpdate
 * @returns {{ fields?: object, error?: string }}
 */
const collectItemFields = (options, isUpdate) => {
  const key = (name) => (isUpdate ? `new${name.charAt(0).toUpperCase()}${name.slice(1)}` : name);
  const fields = {};

  const title = options[key('title')];
  if (title !== undefined || !isUpdate) {
    if (typeof title !== 'string' || !title.trim()) return { error: `${key('title')} is required and cannot be removed` };
    fields.title = title;
  }

  for (const name of ['summary', 'description']) {
    const value = options[key(name)];
    if (value === undefined) continue;
    if (value === null && isUpdate) { fields[name] = null; continue; }
    if (typeof value !== 'string') return { error: `${key(name)} must be text` };
    fields[name] = value;
  }

  for (const name of ['publishDate', 'releaseDate']) {
    const value = options[key(name)];
    if (value === undefined) continue;
    if (value === null && isUpdate) { fields[name] = ''; continue; }
    const { value: time, error } = readDate(value, key(name));
    if (error) return { error };
    fields[name] = time;
  }

  const images = [['listImage', 'listImage'], ['backgroundImage', 'itemListBgImage']];
  for (const [name, stored] of images) {
    const value = options[key(name)];
    if (value === undefined) continue;
    if (value === null && isUpdate) { fields[stored] = ''; continue; }
    const { url, error } = readSingleImage(value, key(name));
    if (error) return { error };
    fields[stored] = url;
  }

  const lists = [['carouselImages', 'iconUrl'], ['links', 'title']];
  for (const [name, requiredField] of lists) {
    const value = options[key(name)];
    if (value === undefined) continue;
    if (value === null && isUpdate) { fields[name] = []; continue; }
    const { actions, error } = readActionList(value, key(name), requiredField);
    if (error) return { error };
    fields[name] = actions;
  }

  if (isUpdate && !Object.keys(fields).length) {
    return { error: 'Pass at least one of newTitle, newSummary, newDescription, newPublishDate, newReleaseDate, newListImage, newCarouselImages, newLinks or newBackgroundImage' };
  }
  return { fields };
};

/**
 * The item's deep link address, as the item form fills its "Deep Link URL" (Buildfire.deeplink.createLink({ id })).
 */
const deepLinkUrlFor = (id) => {
  try {
    return buildfire.deeplink.createLink({ id }) || '';
  } catch (e) {
    return '';
  }
};

/**
 * Register the item's deep link and, for a new item, its analytics event, exactly as the item form does after saving
 * (ContentItem.saveDeeplink and buildfire.analytics.registerEvent in content.item.controller.js). Like the form, it does not wait for them.
 */
const registerItemExtras = (id, data, isNew) => {
  buildfire.deeplink.registerDeeplink({
    id,
    name: data.title,
    deeplinkData: { id },
    imageUrl: data.listImage ? data.listImage : null
  }, () => {});
  if (isNew) {
    buildfire.analytics.registerEvent({
      title: data.title,
      key: `DOCUMENT_${id}_OPENED`,
      description: 'Number of times this item has been opened'
    }, { silentNotification: true });
  }
};

/**
 * Create one item from already checked fields, as the item form's addNewItem does: stamped with its creation time, ranked after the
 * last item, inserted, given its deep link address, then its deep link and analytics event are registered and itemCreated is sent.
 * The form ranks a new item at the last item's rank plus 10; the last item's rank is read here, since there is no open list to take it from.
 */
const createItemRecord = (fields, callback) => {
  searchItemsPage({}, { rank: -1 }, 0, (searchErr, page) => {
    if (searchErr) return callback(searchErr, undefined);
    const last = page.records[0];
    const lastRank = last && typeof last.data.rank === 'number' ? last.data.rank : 0;
    const data = Object.assign({
      title: '',
      deepLinkUrl: '',
      summary: '',
      listImage: '',
      publishDate: '',
      links: [],
      description: '',
      carouselImages: [],
      itemListBgImage: ''
    }, fields, { dateCreated: Date.now(), rank: lastRank + 10 });

    buildfire.datastore.insert(data, ITEMS_TAG, false, (insertErr, inserted) => {
      if (insertErr) return callback(insertErr, undefined);
      const id = inserted.id;
      const saved = Object.assign({}, inserted.data || data);
      const finish = (record) => {
        registerItemExtras(id, record.data, true);
        emitEvent('itemCreated', Object.assign(itemEventData(id, record.data), {
          createdAt: toIsoOrNull(record.data.dateCreated)
        }));
        callback(null, toItem(record));
      };
      const url = deepLinkUrlFor(id);
      if (!url) return finish({ id, data: saved });
      // The form writes the deep link address in a second save, once the id it is built from exists.
      saved.deepLinkUrl = url;
      buildfire.datastore.update(id, saved, ITEMS_TAG, (updateErr, updated) => {
        if (updateErr) return callback(updateErr, undefined);
        finish({ id, data: (updated && updated.data) || saved });
      });
    });
  });
};

/**
 * Change the passed fields of one item, as the item form's updateItemData does: the whole item is saved back, then its deep link is
 * registered again (its name and image may have changed) and itemUpdated is sent. An item saved before it had a deep link address
 * gets one, as the form fills it when it opens such an item.
 */
const applyItemUpdate = (record, fields, callback) => {
  const data = Object.assign({}, record.data, fields);
  if (!data.deepLinkUrl) data.deepLinkUrl = deepLinkUrlFor(record.id);
  buildfire.datastore.update(record.id, data, ITEMS_TAG, (err, updated) => {
    if (err) return callback(err, undefined);
    const saved = { id: record.id, data: (updated && updated.data) || data };
    registerItemExtras(record.id, saved.data, false);
    emitEvent('itemUpdated', itemEventData(record.id, saved.data));
    callback(null, toItem(saved));
  });
};

/**
 * Delete one item, as the content tab's removeListItem does: its deep link and analytics event are unregistered, the item is deleted,
 * then the notes app users wrote on it are removed and itemDeleted is sent. Like the content tab, the note clean-up is not waited on and
 * its failures are ignored: notes belong to each app user, and the control panel cannot always reach them.
 */
const removeItem = (record, callback) => {
  buildfire.deeplink.unregisterDeeplink(record.id, () => {});
  buildfire.analytics.unregisterEvent(`DOCUMENT_${record.id}_OPENED`);
  buildfire.datastore.delete(record.id, ITEMS_TAG, (err, result) => {
    if (err) return callback(err, undefined);
    buildfire.userData.search({ filter: { '$or': [{ '$json.itemID': { '$eq': record.id } }] } }, NOTES_TAG, (searchErr, notes) => {
      if (searchErr || !Array.isArray(notes)) return;
      notes.forEach((note) => buildfire.userData.delete(note.id, NOTES_TAG, note.userToken, () => {}));
    });
    emitEvent('itemDeleted', { itemId: record.id, title: record.data.title });
    callback(null, { id: record.id, title: record.data.title, status: (result && result.status) || 'deleted' });
  });
};

/**
 * Move one item to a position in the manual order, as dragging it in the content tab does: every item is ranked by its new place.
 * Dragging is only possible while the list is sorted manually (itemSortableOptions.disabled), so this is refused otherwise.
 */
const moveItem = (record, position, callback) => {
  readSettings((settingsErr, stored) => {
    if (settingsErr) return callback(settingsErr, undefined);
    // An order never chosen reads as manual, as the widget reads it (and as getSettings reports it).
    const sortBy = (stored.content && stored.content.sortBy) || DEFAULT_SORT;
    if (sortBy !== 'Manually') {
      return callback(new Error(`Items can only be reordered while they are sorted manually; they are sorted by "${sortBy}"`), undefined);
    }
    loadAllItems(SORT_ORDERS.Manually, (loadErr, records) => {
      if (loadErr) return callback(loadErr, undefined);
      if (position > records.length) {
        return callback(new Error(`position must be between 1 and ${records.length}, the number of items`), undefined);
      }
      const from = records.findIndex((entry) => entry.id === record.id);
      const ordered = records.slice();
      const [moved] = ordered.splice(from === -1 ? ordered.length : from, 1);
      ordered.splice(position - 1, 0, moved || record);
      applyRanks(ordered, (rankErr) => {
        if (rankErr) return callback(rankErr, undefined);
        callback(null, { items: ordered.map((entry) => ({ id: entry.id, title: entry.data.title, rank: entry.data.rank })) });
      });
    });
  });
};

const readPosition = (options, callback) => {
  const { position } = options;
  if (typeof position !== 'number' || !Number.isInteger(position) || position < 1) {
    callback(new Error('position must be a whole number of at least 1'), undefined);
    return false;
  }
  return true;
};

/**
 * The plugin's settings document as stored (content, design and the settings tab share it), or {} when nothing is saved yet.
 */
const readSettings = (callback) => {
  buildfire.datastore.get(INFO_TAG, (err, record) => {
    if (err) return callback(err, undefined);
    callback(null, (record && record.data) || {});
  });
};

/**
 * The settings with the defaults each tab applies when it loads them: the content tab's empty carousel and text, the widget's manual
 * order, the settings tab's "Off" delay and "hidden" style, the design tab's first layout. The internal last-rank marker is left out.
 */
const withSettingsDefaults = (stored) => {
  const settings = clone(stored || {});
  settings.allowSharing = !!settings.allowSharing;
  settings.content = settings.content || {};
  settings.design = settings.design || {};
  const { content, design } = settings;
  if (!content.carouselImages) content.carouselImages = [];
  if (content.description === undefined) content.description = '';
  if (!content.sortBy) content.sortBy = DEFAULT_SORT;
  if (!content.seminarDelay) content.seminarDelay = SEMINAR_DELAY_OPTIONS[0];
  if (!content.lockedClass) content.lockedClass = LOCKED_STYLES[0];
  if (!design.itemListLayout) design.itemListLayout = LIST_LAYOUTS[0];
  if (design.itemListBgImage === undefined) design.itemListBgImage = '';
  delete content.rankOfLastItem;
  return settings;
};

/**
 * Read the settings document, let `change` edit it, and save the whole document back with datastore.save, as every control tab does.
 * A document never saved starts from the content tab's own starting document (_data in content.home.controller.js).
 */
const changeSettings = (change, callback) => {
  readSettings((err, stored) => {
    if (err) return callback(err, undefined);
    const settings = Object.keys(stored).length ? clone(stored) : {
      content: { carouselImages: [], description: '' },
      design: { itemListLayout: LIST_LAYOUTS[0], itemListBgImage: '' }
    };
    settings.content = settings.content || {};
    settings.design = settings.design || {};
    change(settings);
    buildfire.datastore.save(settings, INFO_TAG, (saveErr) => {
      if (saveErr) return callback(saveErr, undefined);
      callback(null, withSettingsDefaults(settings));
    });
  });
};

/**
 * The text each label shows in the app: its saved text, or its default when none is saved (widget.home.controller.js init).
 */
const shownLabels = (screen) => {
  const labels = {};
  Object.keys(LABELS).forEach((key) => {
    const saved = screen && screen[key];
    labels[key] = saved && saved.value ? saved.value : LABELS[key].defaultValue;
  });
  return labels;
};

/**
 * Run a batch: validate every entry first (nothing is written if any is invalid), resolve every id, refuse duplicates, then apply each
 * entry in turn through the single operation's own implementation, reporting every outcome.
 */
const runBatch = ({ entries, idKey, validate, apply }, callback) => {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > BATCH_LIMIT) {
    return callback(new Error(`items must be a list of 1 to ${BATCH_LIMIT} entries`), undefined);
  }
  const invalid = entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return `entry ${index}: must be an object`;
    if (idKey && (typeof entry[idKey] !== 'string' || !entry[idKey])) return `entry ${index}: missing ${idKey}`;
    const error = validate(entry);
    return error ? `entry ${index}: ${error}` : null;
  }).filter(Boolean);
  if (invalid.length) return callback(new Error(`Invalid entries: ${invalid.join('; ')}`), undefined);
  if (idKey && new Set(entries.map((entry) => entry[idKey])).size !== entries.length) {
    return callback(new Error('The same item is listed more than once'), undefined);
  }

  const records = [];
  const applyAll = () => {
    const results = [];
    const next = (index) => {
      if (index === entries.length) {
        const failed = results.filter((result) => result.error).length;
        return callback(null, { items: results, succeeded: results.length - failed, failed });
      }
      apply(entries[index], records[index], (err, result) => {
        results.push({ index, id: err ? null : ((result && result.id) || (records[index] && records[index].id) || null), error: err ? (err.message || String(err)) : null });
        next(index + 1);
      });
    };
    next(0);
  };

  if (!idKey) return applyAll();
  const unknown = [];
  let pending = entries.length;
  entries.forEach((entry, index) => {
    requireItemById(entry[idKey], (err, record) => {
      if (err) unknown.push(`entry ${index}: ${err.message || err}`);
      else records[index] = record;
      if (--pending === 0) {
        if (unknown.length) return callback(new Error(`Not found: ${unknown.join('; ')}`), undefined);
        applyAll();
      }
    });
  });
};

widgetContract = {
  /**
   * Bind this contract to a plugin instance. Called by the consumer; resolves the iframe window that widget/control-hosted operations are proxied into.
   * @param {string} instanceId - the plugin instance to contract with.
   */
  init(instanceId) {
    buildfire.services.contract.use({ instanceId }, (err, data) => {
      if (err) return console.error('Failed to initialize Seminar and Lecture Notes contract', err);
      frameId = data.fid;
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Lists the items, 50 a page, in the order the owner chose (or the sortBy given), optionally narrowed to an exact title or to words in the title or summary. Uses only buildfire.datastore, which behaves the same in both frames and on the server; nothing about it needs to be watched, so Background in both frames. A function rather than a declarative search: the sort order defaults to the owner's stored choice, which must be read first, and the word filter is built the way the search boxes build it.
   * The word filter mirrors searchListItem (content.home.controller.js) and searchData (widget.search.controller.js): the text is trimmed and, when it holds a space, its first two words are each matched case-insensitively against title and summary; the text is used as the plugin uses it, unescaped. Paging uses skip/limit 50 with recordCount, and hasMore comes from totalRecord.
   * @param {{ title?: string, searchText?: string, sortBy?: string, page?: number }} options
   * @param {function(Error=, object=)} callback - (error, { items, total, page, hasMore })
   */
  searchItems(options, callback) {
    requireCallback(callback);
    const opts = options || {};
    if (typeof opts !== 'object' || Array.isArray(opts)) return callback(new Error('options must be an object'), undefined);
    if (opts.title !== undefined && (typeof opts.title !== 'string' || !opts.title)) return callback(new Error('title must be non-empty text'), undefined);
    if (opts.searchText !== undefined && typeof opts.searchText !== 'string') return callback(new Error('searchText must be text'), undefined);
    if (opts.sortBy !== undefined && !SORT_ORDERS[opts.sortBy]) {
      return callback(new Error(`sortBy must be one of: ${Object.keys(SORT_ORDERS).join(', ')}`), undefined);
    }
    const page = opts.page === undefined ? 0 : opts.page;
    if (typeof page !== 'number' || !Number.isInteger(page) || page < 0) return callback(new Error('page must be a whole number of at least 0'), undefined);

    const filter = {};
    if (opts.title) filter['$json.title'] = opts.title;
    const text = (opts.searchText || '').trim();
    if (text) {
      const words = text.indexOf(' ') !== -1 ? text.split(' ').slice(0, 2) : [text];
      filter['$or'] = [];
      words.forEach((word) => {
        filter['$or'].push({ '$json.title': { '$regex': word, '$options': 'i' } });
        filter['$or'].push({ '$json.summary': { '$regex': word, '$options': 'i' } });
      });
    }

    const run = (sortBy) => {
      searchItemsPage(filter, SORT_ORDERS[sortBy], page * PAGE_SIZE, (err, result) => {
        if (err) return callback(err, undefined);
        callback(null, {
          items: result.records.map(toItem),
          total: result.total,
          page,
          hasMore: page * PAGE_SIZE + result.records.length < result.total
        });
      });
    };
    if (opts.sortBy) return run(opts.sortBy);
    readSettings((err, stored) => {
      if (err) return callback(err, undefined);
      const sortBy = stored.content && SORT_ORDERS[stored.content.sortBy] ? stored.content.sortBy : DEFAULT_SORT;
      run(sortBy);
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Reads one item, named by its exact title. Uses only buildfire.datastore, which behaves the same in both frames and on the server; nothing about it needs to be watched. Resolving the title is a search, which is why this is a function. usage: basic; its advanced alternative is getItemAdvanced.
   * @param {{ title: string }} options
   * @param {function(Error=, object=)} callback - (error, item)
   */
  getItem(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    resolveItem(options.title, (err, record) => {
      if (err) return callback(err, undefined);
      callback(null, toItem(record));
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: advanced; the alternative of getItem, taking the item's record id. Checks the id exists, so an unknown id is reported rather than answered with an empty item. A function so its result has getItem's shape.
   * @param {{ itemId: string }} options
   * @param {function(Error=, object=)} callback - (error, item)
   */
  getItemAdvanced(options, callback) {
    if (!requireStringParams(options, ['itemId'], callback)) return;
    requireItemById(options.itemId, (err, record) => {
      if (err) return callback(err, undefined);
      callback(null, toItem(record));
    });
  },

  /**
   * hosts: controlBackground. Adds an item the way the content tab's item form does (see createItemRecord). Kept off the server and excluded from the MCP: the form registers a deep link and an analytics event for every new item, and buildfire.deeplink / buildfire.analytics exist only in the frames. No widget host: app users must not add the owner's content. Background: it edits content, it does not publish to or contact anyone by itself.
   * @param {{ title: string, summary?: string, description?: string, publishDate?: string, releaseDate?: string, listImage?: string[], carouselImages?: object[], links?: object[], backgroundImage?: string[] }} options
   * @param {function(Error=, object=)} callback - (error, item)
   */
  createItem(options, callback) {
    if (!requireOptionsObject(options, callback)) return;
    const { fields, error } = collectItemFields(options, false);
    if (error) return callback(new Error(error), undefined);
    createItemRecord(fields, callback);
  },

  /**
   * hosts: controlBackground. usage: advanced (batches are never basic). The batch form of createItem: every entry is checked with createItem's own checks before anything is written, then each is created through createItemRecord, so every item gets exactly what createItem does. A failed write is reported per entry; it does not stop the rest. Same hosts as createItem, for the same reason.
   * @param {{ items: object[] }} options
   * @param {function(Error=, object=)} callback - (error, { items, succeeded, failed })
   */
  createItemsAdvanced(options, callback) {
    if (!requireOptionsObject(options, callback)) return;
    runBatch({
      entries: options.items,
      validate: (entry) => collectItemFields(entry, false).error,
      apply: (entry, record, done) => createItemRecord(collectItemFields(entry, false).fields, done)
    }, callback);
  },

  /**
   * hosts: controlBackground. Edits one item, named by its exact current title, changing only the fields passed (see collectItemFields and applyItemUpdate). Kept off the server and excluded from the MCP: the item form registers the item's deep link again on every save, and buildfire.deeplink exists only in the frames. No widget host: app users must not edit the owner's content. Background: a content edit. usage: basic; its advanced alternative is updateItemAdvanced.
   * @param {{ title: string, newTitle?: string, newSummary?: string|null, newDescription?: string|null, newPublishDate?: string|null, newReleaseDate?: string|null, newListImage?: string[]|null, newCarouselImages?: object[]|null, newLinks?: object[]|null, newBackgroundImage?: string[]|null }} options
   * @param {function(Error=, object=)} callback - (error, item)
   */
  updateItem(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    const { fields, error } = collectItemFields(options, true);
    if (error) return callback(new Error(error), undefined);
    resolveItem(options.title, (err, record) => {
      if (err) return callback(err, undefined);
      applyItemUpdate(record, fields, callback);
    });
  },

  /**
   * hosts: controlBackground. usage: advanced; the alternative of updateItem, taking the item's record id instead of its title. Same hosts, checks and effect, through the same applyItemUpdate; it checks the id exists instead of searching.
   * @param {{ itemId: string, newTitle?: string, newSummary?: string|null, newDescription?: string|null, newPublishDate?: string|null, newReleaseDate?: string|null, newListImage?: string[]|null, newCarouselImages?: object[]|null, newLinks?: object[]|null, newBackgroundImage?: string[]|null }} options
   * @param {function(Error=, object=)} callback - (error, item)
   */
  updateItemAdvanced(options, callback) {
    if (!requireStringParams(options, ['itemId'], callback)) return;
    const { fields, error } = collectItemFields(options, true);
    if (error) return callback(new Error(error), undefined);
    requireItemById(options.itemId, (err, record) => {
      if (err) return callback(err, undefined);
      applyItemUpdate(record, fields, callback);
    });
  },

  /**
   * hosts: controlBackground. usage: advanced (batches are never basic). The batch form of updateItemAdvanced: each entry names its item by record id. Validates every entry and checks every id exists before writing anything, then applies each through applyItemUpdate. A failed write is reported per entry; it does not stop the rest.
   * @param {{ items: object[] }} options
   * @param {function(Error=, object=)} callback - (error, { items, succeeded, failed })
   */
  updateItemsAdvanced(options, callback) {
    if (!requireOptionsObject(options, callback)) return;
    runBatch({
      entries: options.items,
      idKey: 'itemId',
      validate: (entry) => collectItemFields(entry, true).error,
      apply: (entry, record, done) => applyItemUpdate(record, collectItemFields(entry, true).fields, done)
    }, callback);
  },

  /**
   * hosts: controlBackground, headlessSdk. Moves one item, named by its exact title, to a place in the manual order, as dragging it in the content tab does (see moveItem): reads the sort setting and every item, then ranks each by its new place. Uses only buildfire.datastore, which behaves the same in the control frame and on the server; nothing about it needs to be watched. No widget host: app users must not reorder the owner's content. usage: basic; its advanced alternative is updateItemOrderAdvanced. No batch form: one move already re-ranks every item.
   * @param {{ title: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, { items })
   */
  updateItemOrder(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    if (!readPosition(options, callback)) return;
    resolveItem(options.title, (err, record) => {
      if (err) return callback(err, undefined);
      moveItem(record, options.position, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateItemOrder, taking the item's record id. Same hosts, checks and effect, through the same moveItem.
   * @param {{ itemId: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, { items })
   */
  updateItemOrderAdvanced(options, callback) {
    if (!requireStringParams(options, ['itemId'], callback)) return;
    if (!readPosition(options, callback)) return;
    requireItemById(options.itemId, (err, record) => {
      if (err) return callback(err, undefined);
      moveItem(record, options.position, callback);
    });
  },

  /**
   * hosts: controlBackground. Permanently deletes one item, named by its exact title, as the content tab's delete button does (see removeItem). Kept off the server and excluded from the MCP: the content tab unregisters the item's deep link and analytics event, which exist only in the frames. No widget host: app users must not delete the owner's content. Background: the content tab's own confirmation is the owner deciding to delete; called from outside, the dangerous flag is what gates it. usage: basic; its advanced alternative is deleteItemAdvanced.
   * @param {{ title: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, title, status })
   */
  deleteItem(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    resolveItem(options.title, (err, record) => {
      if (err) return callback(err, undefined);
      removeItem(record, callback);
    });
  },

  /**
   * hosts: controlBackground. usage: advanced; the alternative of deleteItem, taking the item's record id. Checks the id exists first, so an unknown id is reported rather than silently doing nothing; then the same removeItem.
   * @param {{ itemId: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, title, status })
   */
  deleteItemAdvanced(options, callback) {
    if (!requireStringParams(options, ['itemId'], callback)) return;
    requireItemById(options.itemId, (err, record) => {
      if (err) return callback(err, undefined);
      removeItem(record, callback);
    });
  },

  /**
   * hosts: controlBackground. usage: advanced (batches are never basic). The batch form of deleteItemAdvanced: checks every id exists before deleting anything, then deletes each through removeItem. A failed delete is reported per entry; it does not stop the rest.
   * @param {{ items: Array<{ itemId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { items, succeeded, failed })
   */
  deleteItemsAdvanced(options, callback) {
    if (!requireOptionsObject(options, callback)) return;
    runBatch({
      entries: options.items,
      idKey: 'itemId',
      validate: () => null,
      apply: (entry, record, done) => removeItem(record, done)
    }, callback);
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Reads the plugin's settings document (content, design and settings tabs share it) with the defaults the tabs apply (see withSettingsDefaults). Uses only buildfire.datastore, which behaves the same in both frames and on the server; nothing about it needs to be watched. A function because the defaults are applied here.
   * @param {object} options - none are read
   * @param {function(Error=, object=)} callback - (error, settings)
   */
  getSettings(options, callback) {
    requireCallback(callback);
    readSettings((err, stored) => {
      if (err) return callback(err, undefined);
      callback(null, withSettingsDefaults(stored));
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Changes the Settings tab's options, only those passed: content sharing, the next seminar delay (stored as the tab's { label, value } option) and the style of locked seminars. Read, merged and saved whole with datastore.save, as the tab does; the widget refreshes on its own when the document changes. Uses only buildfire.datastore, so it runs the same in the control frame and on the server. No widget host: app users must not change the owner's configuration. Background: it changes configuration, it does not publish to or contact anyone.
   * Values: seminarDelay in minutes, one of SEMINAR_DELAY_OPTIONS; lockedStyle one of LOCKED_STYLES (settings.home.controller.js).
   * @param {{ allowSharing?: boolean, seminarDelay?: number, lockedStyle?: string }} options
   * @param {function(Error=, object=)} callback - (error, settings)
   */
  updateSettings(options, callback) {
    if (!requireOptionsObject(options, callback)) return;
    const changes = {};
    if (options.allowSharing !== undefined) {
      if (typeof options.allowSharing !== 'boolean') return callback(new Error('allowSharing must be true or false'), undefined);
      changes.allowSharing = options.allowSharing;
    }
    if (options.seminarDelay !== undefined) {
      const option = SEMINAR_DELAY_OPTIONS.find((entry) => entry.value === options.seminarDelay);
      if (!option) return callback(new Error(`seminarDelay must be one of: ${SEMINAR_DELAY_OPTIONS.map((entry) => entry.value).join(', ')}`), undefined);
      changes.seminarDelay = option;
    }
    if (options.lockedStyle !== undefined) {
      if (LOCKED_STYLES.indexOf(options.lockedStyle) === -1) return callback(new Error(`lockedStyle must be one of: ${LOCKED_STYLES.join(', ')}`), undefined);
      changes.lockedClass = options.lockedStyle;
    }
    if (!Object.keys(changes).length) return callback(new Error('Pass at least one of allowSharing, seminarDelay or lockedStyle'), undefined);

    changeSettings((settings) => {
      // The settings tab saves its own defaults with every change (Settings.init).
      if (!settings.content.seminarDelay) settings.content.seminarDelay = SEMINAR_DELAY_OPTIONS[0];
      if (!settings.content.lockedClass) settings.content.lockedClass = LOCKED_STYLES[0];
      if (changes.allowSharing !== undefined) settings.allowSharing = changes.allowSharing;
      if (changes.seminarDelay) settings.content.seminarDelay = changes.seminarDelay;
      if (changes.lockedClass) settings.content.lockedClass = changes.lockedClass;
    }, callback);
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Changes the Design tab's options, only those passed: the item list layout and its background image (one URL, '' once removed, as the tab's thumbnail picker stores it). Read, merged and saved whole with datastore.save, as the tab does. Uses only buildfire.datastore, so it runs the same in the control frame and on the server. No widget host: app users must not change the owner's design. Background: a design edit.
   * @param {{ listLayout?: string, listBackgroundImage?: string[]|null }} options
   * @param {function(Error=, object=)} callback - (error, settings)
   */
  updateDesign(options, callback) {
    if (!requireOptionsObject(options, callback)) return;
    const changes = {};
    if (options.listLayout !== undefined) {
      if (LIST_LAYOUTS.indexOf(options.listLayout) === -1) return callback(new Error(`listLayout must be one of: ${LIST_LAYOUTS.join(', ')}`), undefined);
      changes.itemListLayout = options.listLayout;
    }
    if (options.listBackgroundImage !== undefined) {
      if (options.listBackgroundImage === null) {
        changes.itemListBgImage = '';
      } else {
        const { url, error } = readSingleImage(options.listBackgroundImage, 'listBackgroundImage');
        if (error) return callback(new Error(error), undefined);
        changes.itemListBgImage = url;
      }
    }
    if (!Object.keys(changes).length) return callback(new Error('Pass at least one of listLayout or listBackgroundImage'), undefined);

    changeSettings((settings) => {
      // The design tab fills in the first layout when none is saved (DesignHome init).
      if (!settings.design.itemListLayout) settings.design.itemListLayout = LIST_LAYOUTS[0];
      Object.assign(settings.design, changes);
    }, callback);
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Changes what the Content tab shows above the item list, only what is passed: the carousel (a list of action items, replaced whole), the text (HTML from the tab's editor) and the order of the items. Read, merged and saved whole with datastore.save, as the tab's saveData does. When the order is given, every item is then ranked by its place in that order, as the content tab does when its list reloads in the new order (loadMore), which replaces a manual order that was set before. Uses only buildfire.datastore, so it runs the same in the control frame and on the server. No widget host: app users must not change the owner's content. Background: a content edit.
   * @param {{ carouselImages?: object[]|null, description?: string|null, sortBy?: string }} options
   * @param {function(Error=, object=)} callback - (error, settings)
   */
  updateHomeContent(options, callback) {
    if (!requireOptionsObject(options, callback)) return;
    const changes = {};
    if (options.carouselImages !== undefined) {
      if (options.carouselImages === null) {
        changes.carouselImages = [];
      } else {
        const { actions, error } = readActionList(options.carouselImages, 'carouselImages', 'iconUrl');
        if (error) return callback(new Error(error), undefined);
        changes.carouselImages = actions;
      }
    }
    if (options.description !== undefined) {
      if (options.description !== null && typeof options.description !== 'string') return callback(new Error('description must be text'), undefined);
      changes.description = options.description;
    }
    if (options.sortBy !== undefined) {
      if (!SORT_ORDERS[options.sortBy]) return callback(new Error(`sortBy must be one of: ${Object.keys(SORT_ORDERS).join(', ')}`), undefined);
      changes.sortBy = options.sortBy;
    }
    if (!Object.keys(changes).length) return callback(new Error('Pass at least one of carouselImages, description or sortBy'), undefined);

    changeSettings((settings) => {
      // The content tab's saveData keeps its last-rank marker present on every save.
      settings.content.rankOfLastItem = settings.content.rankOfLastItem || 0;
      Object.assign(settings.content, changes);
    }, (err, saved) => {
      if (err) return callback(err, undefined);
      if (!changes.sortBy) return callback(null, saved);
      loadAllItems(SORT_ORDERS[changes.sortBy], (loadErr, records) => {
        if (loadErr) return callback(loadErr, undefined);
        applyRanks(records, (rankErr) => {
          if (rankErr) return callback(rankErr, undefined);
          callback(null, saved);
        });
      });
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Reads the text every customizable label shows in the app: its saved text, or its default (see shownLabels). Uses only buildfire.datastore, which behaves the same in both frames and on the server; nothing about it needs to be watched. A function because the defaults are applied here.
   * @param {object} options - none are read
   * @param {function(Error=, object=)} callback - (error, { <label>: text })
   */
  getLabels(options, callback) {
    requireCallback(callback);
    buildfire.datastore.get(LANGUAGES_TAG, (err, record) => {
      if (err) return callback(err, undefined);
      callback(null, shownLabels(record && record.data && record.data.screenOne));
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: basic. Changes the Languages tab's labels, only those passed, the way the tab saves them (buildfire.services.Strings in widget/assets/js/shared/strings.js): the saved document is read with search limit 1 as refresh() does, every label rebuilt from the defaults with its saved text, the new texts set, and the whole document saved with datastore.save. Each text is held to the maxLength its input enforces. An emptied label ('' or null) is stored as passed, and the app then shows its default. Uses only buildfire.datastore, so it runs the same in the control frame and on the server. No widget host: app users must not change the owner's wording. Background: a content edit.
   * @param {object} options - one optional text per label key in LABELS
   * @param {function(Error=, object=)} callback - (error, { <label>: text })
   */
  updateLabels(options, callback) {
    if (!requireOptionsObject(options, callback)) return;
    const changes = {};
    for (const key of Object.keys(LABELS)) {
      const value = options[key];
      if (value === undefined) continue;
      if (value !== null && typeof value !== 'string') return callback(new Error(`${key} must be text`), undefined);
      if (typeof value === 'string' && value.length > LABELS[key].maxLength) {
        return callback(new Error(`${key} must be at most ${LABELS[key].maxLength} characters`), undefined);
      }
      changes[key] = value;
    }
    if (!Object.keys(changes).length) return callback(new Error(`Pass at least one label: ${Object.keys(LABELS).join(', ')}`), undefined);

    buildfire.datastore.search({ limit: 1 }, LANGUAGES_TAG, (err, records) => {
      if (err) return callback(err, undefined);
      const stored = (Array.isArray(records) && records[0] && records[0].data) || {};
      const screen = {};
      Object.keys(LABELS).forEach((key) => {
        screen[key] = { defaultValue: LABELS[key].defaultValue };
      });
      const storedScreen = stored.screenOne || {};
      Object.keys(storedScreen).forEach((key) => {
        if (!screen[key]) screen[key] = {};
        if (storedScreen[key] && storedScreen[key].value !== undefined) screen[key].value = storedScreen[key].value;
      });
      Object.keys(changes).forEach((key) => {
        screen[key].value = changes[key];
      });
      const document = Object.assign({}, stored, { screenOne: screen });
      buildfire.datastore.save(document, LANGUAGES_TAG, (saveErr) => {
        if (saveErr) return callback(saveErr, undefined);
        callback(null, shownLabels(screen));
      });
    });
  }
};

/**
 * What the control panel's frame (control/contract.html) dispatches to: init plus every function whose hosts include controlBackground, in plugin.contract.json order. The implementations are widgetContract's own.
 */
controlContract = {
  init: widgetContract.init,
  searchItems: widgetContract.searchItems,
  getItem: widgetContract.getItem,
  getItemAdvanced: widgetContract.getItemAdvanced,
  createItem: widgetContract.createItem,
  createItemsAdvanced: widgetContract.createItemsAdvanced,
  updateItem: widgetContract.updateItem,
  updateItemAdvanced: widgetContract.updateItemAdvanced,
  updateItemsAdvanced: widgetContract.updateItemsAdvanced,
  updateItemOrder: widgetContract.updateItemOrder,
  updateItemOrderAdvanced: widgetContract.updateItemOrderAdvanced,
  deleteItem: widgetContract.deleteItem,
  deleteItemAdvanced: widgetContract.deleteItemAdvanced,
  deleteItemsAdvanced: widgetContract.deleteItemsAdvanced,
  getSettings: widgetContract.getSettings,
  updateSettings: widgetContract.updateSettings,
  updateDesign: widgetContract.updateDesign,
  updateHomeContent: widgetContract.updateHomeContent,
  getLabels: widgetContract.getLabels,
  updateLabels: widgetContract.updateLabels
};
