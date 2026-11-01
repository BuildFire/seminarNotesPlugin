// items: the seminar items, one block per operation on them, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));

// Calls nothing here answers, made by every item write: the deep link and analytics bookkeeping the manifest does not
// mention, and the events, only answer.
const standIns = () => {
  spyOn(buildfire.deeplink, 'registerDeeplink').and.callFake((options, callback) => callback && callback(null, { data: options }));
  spyOn(buildfire.deeplink, 'unregisterDeeplink').and.callFake((id, callback) => callback && callback(null));
  spyOn(buildfire.analytics, 'registerEvent');
  spyOn(buildfire.analytics, 'unregisterEvent');
  spyOn(buildfire.services.contract.events, 'send').and.callFake((name, data, callback) => callback && callback(null, []));
};

// Only the control panel adds items, and its run comes first: it makes this one once, and the app's run finds it.
const forTheApp = 'Pre item for the app';
let madeItem;
const itemForTheApp = () => {
  madeItem = madeItem || (contract.host === 'control'
    ? call('createItem', { title: forTheApp, summary: 'Preappword summary' })
    : call('getItem', { title: forTheApp }));
  return madeItem;
};

contract.describe('searchItems', () => {
  beforeEach(standIns);

  it('finds an item by its title', async () => {
    await itemForTheApp();
    expect(await call('searchItems', { title: forTheApp })).toEqual(jasmine.objectContaining({
      items: jasmine.arrayContaining([jasmine.objectContaining({ id: jasmine.any(String), title: forTheApp })]),
      total: jasmine.any(Number),
      page: 0,
      hasMore: jasmine.any(Boolean)
    }));
  });

  it('finds an item by a word, in a given order and page', async () => {
    await itemForTheApp();
    expect(await call('searchItems', { title: forTheApp, searchText: 'Preappword', sortBy: 'Item title A-Z', page: 0 })).toEqual(jasmine.objectContaining({
      items: jasmine.arrayContaining([jasmine.objectContaining({ title: forTheApp })])
    }));
  });
});

contract.describe('getItem', () => {
  beforeEach(standIns);

  it('finds an item by its title', async () => {
    await itemForTheApp();
    expect(await call('getItem', { title: forTheApp })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), title: forTheApp }));
  });
});

contract.describe('getItemAdvanced', () => {
  beforeEach(standIns);

  it('finds an item by its id', async () => {
    const { id } = await itemForTheApp();
    expect(await call('getItemAdvanced', { itemId: id })).toEqual(jasmine.objectContaining({ id, title: forTheApp }));
  });
});

contract.describe('createItem', () => {
  beforeEach(standIns);

  it('adds an item from its title', async () => {
    const title = `Pre item (${contract.host})`;
    expect(await call('createItem', { title })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), title }));
  });

  it('adds an item with every detail', async () => {
    const title = `Pre full item (${contract.host})`;
    expect(await call('createItem', {
      title,
      summary: 'Pre summary',
      description: '<p>Pre notes</p>',
      publishDate: '2026-01-15',
      releaseDate: '2026-02-01',
      listImage: ['https://example.com/pre-list.png'],
      carouselImages: [{ title: 'Pre slide', action: 'linkToWeb', url: 'https://example.com', iconUrl: 'https://example.com/pre-slide.png' }],
      links: [{ title: 'Pre website', action: 'linkToWeb', url: 'https://example.com' }],
      backgroundImage: ['https://example.com/pre-background.png']
    })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), title, listImage: 'https://example.com/pre-list.png' }));
  });
});

contract.describe('createItemsAdvanced', () => {
  beforeEach(standIns);

  it('adds several items at once', async () => {
    const items = [{ title: `Pre batch item one (${contract.host})` }, { title: `Pre batch item two (${contract.host})`, summary: 'Pre batch summary' }];
    expect(await call('createItemsAdvanced', { items })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('updateItem', () => {
  beforeEach(standIns);

  it("changes an item's summary, naming the item by its title", async () => {
    const title = `Pre item to update (${contract.host})`;
    await call('createItem', { title });
    expect(await call('updateItem', { title, newSummary: 'Updated before the next contract' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), title }));
  });

  it('changes every detail of an item', async () => {
    const title = `Pre item to change fully (${contract.host})`;
    await call('createItem', { title, summary: 'Pre old summary' });
    expect(await call('updateItem', {
      title,
      newTitle: `Pre item changed fully (${contract.host})`,
      newSummary: null,
      newDescription: '<p>Pre new notes</p>',
      newPublishDate: '2026-03-01',
      newReleaseDate: null,
      newListImage: ['https://example.com/pre-new-list.png'],
      newCarouselImages: [],
      newLinks: [{ title: 'Pre new website', action: 'linkToWeb', url: 'https://example.com/new' }],
      newBackgroundImage: []
    })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), title: `Pre item changed fully (${contract.host})` }));
  });
});

contract.describe('updateItemAdvanced', () => {
  beforeEach(standIns);

  it("changes an item's description, naming the item by its id", async () => {
    const { id } = await call('createItem', { title: `Pre item to update by id (${contract.host})` });
    expect(await call('updateItemAdvanced', { itemId: id, newDescription: '<p>Pre by id</p>' })).toEqual(jasmine.objectContaining({ id }));
  });
});

contract.describe('updateItemsAdvanced', () => {
  beforeEach(standIns);

  it('changes several items at once', async () => {
    const one = await call('createItem', { title: `Pre batch update one (${contract.host})` });
    const two = await call('createItem', { title: `Pre batch update two (${contract.host})` });
    expect(await call('updateItemsAdvanced', { items: [{ itemId: one.id, newSummary: 'Pre first' }, { itemId: two.id, newSummary: 'Pre second' }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('updateItemOrder', () => {
  beforeEach(standIns);

  it('moves an item to the top of the manual order', async () => {
    await call('updateHomeContent', { sortBy: 'Manually' });
    const title = `Pre item to move (${contract.host})`;
    await call('createItem', { title });
    expect(await call('updateItemOrder', { title, position: 1 })).toEqual(jasmine.objectContaining({
      items: jasmine.arrayContaining([jasmine.objectContaining({ title })])
    }));
  }, 120000);
});

contract.describe('updateItemOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves an item, named by its id, to the second place', async () => {
    await call('updateHomeContent', { sortBy: 'Manually' });
    await call('createItem', { title: `Pre item to stay first (${contract.host})` });
    const { id } = await call('createItem', { title: `Pre item to move by id (${contract.host})` });
    expect(await call('updateItemOrderAdvanced', { itemId: id, position: 2 })).toEqual(jasmine.objectContaining({
      items: jasmine.arrayContaining([jasmine.objectContaining({ id })])
    }));
  }, 120000);
});

contract.describe('deleteItem', () => {
  beforeEach(standIns);

  it('removes an item by its title', async () => {
    const title = `Pre item to delete (${contract.host})`;
    await call('createItem', { title });
    expect(await call('deleteItem', { title })).toEqual(jasmine.objectContaining({ id: jasmine.any(String) }));
  });
});

contract.describe('deleteItemAdvanced', () => {
  beforeEach(standIns);

  it('removes an item by its id', async () => {
    const { id } = await call('createItem', { title: `Pre item to delete by id (${contract.host})` });
    expect(await call('deleteItemAdvanced', { itemId: id })).toEqual(jasmine.objectContaining({ id }));
  });
});

contract.describe('deleteItemsAdvanced', () => {
  beforeEach(standIns);

  it('removes several items at once', async () => {
    const one = await call('createItem', { title: `Pre batch delete one (${contract.host})` });
    const two = await call('createItem', { title: `Pre batch delete two (${contract.host})` });
    expect(await call('deleteItemsAdvanced', { items: [{ itemId: one.id }, { itemId: two.id }] })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});
