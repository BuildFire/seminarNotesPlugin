// items: the seminar items, one block per operation on them, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
// One word only this spec wrote, for the word search.
const uniqueWord = (label) => `Post${label}${contract.host}${Date.now()}`;
const MISSING_ID = '000000000000000000000000';
// What the contract's own search finds by that exact title.
const found = async (title) => (await call('searchItems', { title })).items;

// Calls nothing here answers, made by every item write: the deep link and analytics bookkeeping the manifest does not
// mention only answer, and the events are recorded so the ones the manifest declares can be asserted.
const standIns = () => {
  spyOn(buildfire.deeplink, 'registerDeeplink').and.callFake((options, callback) => callback && callback(null, { data: options }));
  spyOn(buildfire.deeplink, 'unregisterDeeplink').and.callFake((id, callback) => callback && callback(null));
  spyOn(buildfire.analytics, 'registerEvent');
  spyOn(buildfire.analytics, 'unregisterEvent');
  spyOn(buildfire.services.contract.events, 'send').and.callFake((name, data, callback) => callback && callback(null, []));
};
const sent = (name) => buildfire.services.contract.events.send.calls.allArgs()
  .filter(([eventName]) => eventName === name).map(([, data]) => data);
const resetSent = () => buildfire.services.contract.events.send.calls.reset();

// Only the control panel adds items, and its run comes first: it makes these once, and the app's run finds them.
const forTheApp = 'Post item for the app';
const appWord = 'Postappword';
let madeItem;
const itemForTheApp = () => {
  madeItem = madeItem || (contract.host === 'control'
    ? call('createItem', { title: forTheApp, summary: `${appWord} summary` })
    : call('getItem', { title: forTheApp }));
  return madeItem;
};
const sharedForTheApp = 'Post shared item for the app';
let madeShared;
const sharedItemsForTheApp = () => {
  madeShared = madeShared || (contract.host === 'control'
    ? call('createItem', { title: sharedForTheApp }).then(() => call('createItem', { title: sharedForTheApp }))
    : Promise.resolve());
  return madeShared;
};
// More items than one page holds, all with this word in their summary.
const pageWord = 'Postpageword';
let madePages;
const pagesForTheApp = () => {
  madePages = madePages || (contract.host === 'control'
    ? call('createItemsAdvanced', { items: Array.from({ length: 50 }, (value, index) => ({ title: `Post page item ${index}`, summary: pageWord })) })
      .then(() => call('createItem', { title: 'Post page item 50', summary: pageWord }))
    : Promise.resolve());
  return madePages;
};

// The manual order is the only one items can be moved in.
const sortManually = () => call('updateHomeContent', { sortBy: 'Manually' });

contract.describe('searchItems', () => {
  beforeEach(standIns);

  it('finds an item by its exact title, with its details', async () => {
    const { id } = await itemForTheApp();
    const result = await call('searchItems', { title: forTheApp });
    expect(result).toEqual(jasmine.objectContaining({ total: 1, page: 0, hasMore: false }));
    expect(result.items).toEqual([jasmine.objectContaining({
      id, title: forTheApp, summary: `${appWord} summary`, isReleased: true, carouselImages: [], links: [],
      dateCreated: jasmine.any(Number), rank: jasmine.any(Number)
    })]);
  });

  it('finds items by a word in their summary', async () => {
    const { id } = await itemForTheApp();
    expect((await call('searchItems', { searchText: appWord })).items).toEqual([jasmine.objectContaining({ id, title: forTheApp })]);
  });

  it('finds nothing for a title no item has', async () => {
    expect(await call('searchItems', { title: unique('no such item') })).toEqual(jasmine.objectContaining({ items: [], total: 0, hasMore: false }));
  });

  it('shows 50 items a page, and tells there are more', async () => {
    await pagesForTheApp();
    const first = await call('searchItems', { searchText: pageWord, sortBy: 'Item title A-Z' });
    expect(first.items.length).toBe(50);
    expect(first).toEqual(jasmine.objectContaining({ total: 51, page: 0, hasMore: true }));
    const second = await call('searchItems', { searchText: pageWord, sortBy: 'Item title A-Z', page: 1 });
    expect(second.items.length).toBe(1);
    expect(second).toEqual(jasmine.objectContaining({ total: 51, page: 1, hasMore: false }));
  }, 600000);

  it('sorts by the order given', async () => {
    await pagesForTheApp();
    const titles = (await call('searchItems', { searchText: pageWord, sortBy: 'Item title Z-A' })).items.map((item) => item.title);
    expect(titles).toEqual(titles.slice().sort().reverse());
  }, 600000);

  describe('refuses', () => {
    it('an order it does not offer', async () => {
      expect(await refusal(call('searchItems', { sortBy: 'Random' }))).toContain('sortBy');
    });

    it('a page below 0', async () => {
      expect(await refusal(call('searchItems', { page: -1 }))).toContain('page');
    });

    it('a page that is not a number', async () => {
      expect(await refusal(call('searchItems', { page: 'two' }))).toContain('page');
    });
  });
});

contract.describe('getItem', () => {
  beforeEach(standIns);

  it('finds an item by its exact title', async () => {
    const { id } = await itemForTheApp();
    expect(await call('getItem', { title: forTheApp })).toEqual(jasmine.objectContaining({
      id, title: forTheApp, summary: `${appWord} summary`, isReleased: true
    }));
  });

  describe('refuses', () => {
    it('a title no item has, naming it', async () => {
      const title = unique('missing');
      expect(await refusal(call('getItem', { title }))).toContain(title);
    });

    it('a title two items share, saying how many', async () => {
      await sharedItemsForTheApp();
      expect((await refusal(call('getItem', { title: sharedForTheApp }))).replace(sharedForTheApp, '')).toContain('2');
    });

    it('without a title', async () => {
      expect(await refusal(call('getItem', {}))).toContain('title');
    });

    it('an empty title', async () => {
      expect(await refusal(call('getItem', { title: '' }))).toContain('title');
    });

    it('a title that is not text', async () => {
      expect(await refusal(call('getItem', { title: 5 }))).toContain('title');
    });
  });
});

contract.describe('getItemAdvanced', () => {
  beforeEach(standIns);

  it('finds an item by its id', async () => {
    const { id } = await itemForTheApp();
    expect(await call('getItemAdvanced', { itemId: id })).toEqual(jasmine.objectContaining({ id, title: forTheApp }));
  });

  describe('refuses', () => {
    it('an id no item has', async () => {
      expect(await refusal(call('getItemAdvanced', { itemId: MISSING_ID }))).toContain(MISSING_ID);
    });

    it('without an id', async () => {
      expect(await refusal(call('getItemAdvanced', {}))).toContain('itemId');
    });

    it('an empty id', async () => {
      expect(await refusal(call('getItemAdvanced', { itemId: '' }))).toContain('itemId');
    });
  });
});

// controlBackground only: this block runs in the control frame, where the datastore is writable.
contract.describe('createItem', () => {
  beforeEach(standIns);

  it('adds an item from its title, returns it and announces it', async () => {
    const title = unique('item');
    const created = await call('createItem', { title });
    expect(created).toEqual(jasmine.objectContaining({
      id: jasmine.any(String), title, summary: '', description: '', listImage: '', carouselImages: [], links: [],
      itemListBgImage: '', isReleased: true, dateCreated: jasmine.any(Number), rank: jasmine.any(Number)
    }));
    expect(await found(title)).toEqual([jasmine.objectContaining({ id: created.id, title })]);
    expect(sent('itemCreated')).toEqual([jasmine.objectContaining({ itemId: created.id, title })]);
  });

  it('keeps every detail it is given, with images as single URLs', async () => {
    const title = unique('full item');
    const carouselImages = [{ title: 'Slide', action: 'linkToWeb', url: 'https://example.com', iconUrl: 'https://example.com/slide.png' }];
    const links = [{ title: 'Visit website', action: 'linkToWeb', url: 'https://example.com' }];
    const created = await call('createItem', {
      title,
      summary: 'A short summary',
      description: '<p>Notes for the seminar</p>',
      publishDate: '2026-09-01',
      releaseDate: '2999-01-01',
      listImage: ['https://example.com/list.png'],
      carouselImages,
      links,
      backgroundImage: ['https://example.com/background.png']
    });
    const expected = {
      title,
      summary: 'A short summary',
      description: '<p>Notes for the seminar</p>',
      publishDate: new Date('2026-09-01').getTime(),
      releaseDate: new Date('2999-01-01').getTime(),
      isReleased: false,
      listImage: 'https://example.com/list.png',
      carouselImages,
      links,
      itemListBgImage: 'https://example.com/background.png'
    };
    expect(created).toEqual(jasmine.objectContaining(expected));
    expect(await call('getItem', { title })).toEqual(jasmine.objectContaining(expected));
  });

  it('adds the item at the end of the list', async () => {
    const first = await call('createItem', { title: unique('first') });
    const second = await call('createItem', { title: unique('second') });
    expect(second.rank).toBeGreaterThan(first.rank);
  });

  describe('refuses, stores nothing and announces nothing', () => {
    const refusedWith = async (parameters, named) => {
      resetSent();
      expect(await refusal(call('createItem', parameters))).toContain(named);
      expect(sent('itemCreated')).toEqual([]);
      if (typeof parameters.title === 'string' && parameters.title) expect(await found(parameters.title)).toEqual([]);
    };

    it('without a title', () => refusedWith({ summary: 'No title' }, 'title'));
    it('with an empty title', () => refusedWith({ title: '' }, 'title'));
    it('with a title that is not text', () => refusedWith({ title: 5 }, 'title'));
    it('with a list image that is not a list', () => refusedWith({ title: unique('bare image'), listImage: 'https://example.com/a.png' }, 'listImage'));
    it('with two list images', () => refusedWith({ title: unique('two images'), listImage: ['https://example.com/a.png', 'https://example.com/b.png'] }, 'listImage'));
    it('with a background image that is not a list', () => refusedWith({ title: unique('bare background'), backgroundImage: 'https://example.com/a.png' }, 'backgroundImage'));
    it('with a publication date that is not a date', () => refusedWith({ title: unique('bad date'), publishDate: 'tomorrow' }, 'publishDate'));
    it('with a release date that is not a date', () => refusedWith({ title: unique('bad release'), releaseDate: '01/02/2026' }, 'releaseDate'));
    it('with a link without a title', () => refusedWith({ title: unique('bad link'), links: [{ action: 'linkToWeb', url: 'https://example.com' }] }, 'links'));
    it('with slider pictures that are not a list', () => refusedWith({ title: unique('bad slider'), carouselImages: 'https://example.com/a.png' }, 'carouselImages'));
    it('with a slider picture without its image', () => refusedWith({ title: unique('no picture'), carouselImages: [{ title: 'Slide', action: 'linkToWeb' }] }, 'carouselImages'));
    it('with a summary that is not text', () => refusedWith({ title: unique('bad summary'), summary: 5 }, 'summary'));
  });
});

contract.describe('createItemsAdvanced', () => {
  beforeEach(standIns);

  it('adds every item, reports each and announces each', async () => {
    const titles = [unique('batch one'), unique('batch two')];
    const result = await call('createItemsAdvanced', { items: [{ title: titles[0] }, { title: titles[1], summary: 'Second' }] });
    expect(result).toEqual(jasmine.objectContaining({
      items: [jasmine.objectContaining({ index: 0, id: jasmine.any(String) }), jasmine.objectContaining({ index: 1, id: jasmine.any(String) })],
      succeeded: 2,
      failed: 0
    }));
    expect(await found(titles[0])).toEqual([jasmine.objectContaining({ title: titles[0] })]);
    expect(await found(titles[1])).toEqual([jasmine.objectContaining({ title: titles[1], summary: 'Second' })]);
    expect(sent('itemCreated').map((data) => data.title)).toEqual(titles);
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when one entry is invalid', async () => {
      const valid = unique('valid entry');
      expect(await refusal(call('createItemsAdvanced', { items: [{ title: valid }, { title: '' }] }))).toContain('title');
      expect(await found(valid)).toEqual([]);
    });

    it('when it is empty', async () => {
      await expectAsync(call('createItemsAdvanced', { items: [] })).toBeRejected();
    });

    it('when it is left out', async () => {
      expect(await refusal(call('createItemsAdvanced', {}))).toContain('items');
    });

    it('when it holds more than 50 entries', async () => {
      const items = Array.from({ length: 51 }, (value, index) => ({ title: unique(`entry ${index}`) }));
      await expectAsync(call('createItemsAdvanced', { items })).toBeRejected();
      expect(await found(items[0].title)).toEqual([]);
    });
  });
});

contract.describe('updateItem', () => {
  beforeEach(standIns);
  const create = async (label, extra) => {
    const title = unique(label);
    await call('createItem', Object.assign({ title, summary: 'Original summary', listImage: ['https://example.com/list.png'] }, extra || {}));
    resetSent();
    return title;
  };

  it('changes only the details it is given, returns the item and announces it', async () => {
    const title = await create('update');
    const updated = await call('updateItem', { title, newDescription: '<p>Changed</p>', newPublishDate: '2026-10-01' });
    const expected = { title, summary: 'Original summary', listImage: 'https://example.com/list.png', description: '<p>Changed</p>', publishDate: new Date('2026-10-01').getTime() };
    expect(updated).toEqual(jasmine.objectContaining(expected));
    expect(await call('getItem', { title })).toEqual(jasmine.objectContaining(expected));
    expect(sent('itemUpdated')).toEqual([jasmine.objectContaining({ itemId: updated.id, title })]);
  });

  it('renames the item', async () => {
    const title = await create('rename');
    await call('updateItem', { title, newTitle: `${title} renamed` });
    expect(await found(title)).toEqual([]);
    expect(await found(`${title} renamed`)).toEqual([jasmine.objectContaining({ summary: 'Original summary' })]);
  });

  it('clears the summary with null, and with an empty text', async () => {
    const title = await create('clear summary');
    await call('updateItem', { title, newSummary: null });
    expect((await call('getItem', { title })).summary).toBeNull();
    await call('updateItem', { title, newSummary: 'Again' });
    await call('updateItem', { title, newSummary: '' });
    expect((await call('getItem', { title })).summary).toBe('');
  });

  it('removes the list image with an empty list, and with null', async () => {
    const title = await create('clear image');
    expect((await call('updateItem', { title, newListImage: [] })).listImage).toBe('');
    await call('updateItem', { title, newListImage: ['https://example.com/other.png'] });
    expect((await call('getItem', { title })).listImage).toBe('https://example.com/other.png');
    await call('updateItem', { title, newListImage: null });
    expect((await call('getItem', { title })).listImage).toBe('');
  });

  it('removes the release date, so the item shows', async () => {
    const title = await create('clear release', { releaseDate: '2999-01-01' });
    expect((await call('getItem', { title })).isReleased).toBe(false);
    await call('updateItem', { title, newReleaseDate: null });
    expect(await call('getItem', { title })).toEqual(jasmine.objectContaining({ releaseDate: '', isReleased: true }));
  });

  it('replaces the links with the ones given', async () => {
    const title = await create('links', { links: [{ title: 'Old', action: 'linkToWeb', url: 'https://example.com/old' }] });
    const links = [{ title: 'New', action: 'linkToWeb', url: 'https://example.com/new' }];
    await call('updateItem', { title, newLinks: links });
    expect((await call('getItem', { title })).links).toEqual(links);
    await call('updateItem', { title, newLinks: [] });
    expect((await call('getItem', { title })).links).toEqual([]);
  });

  describe('refuses, changes nothing and announces nothing', () => {
    it('a title no item has, naming it', async () => {
      const title = unique('missing');
      expect(await refusal(call('updateItem', { title, newSummary: 'x' }))).toContain(title);
      expect(sent('itemUpdated')).toEqual([]);
    });

    it('a title two items share, saying how many', async () => {
      const title = unique('shared');
      await call('createItem', { title });
      await call('createItem', { title });
      resetSent();
      expect((await refusal(call('updateItem', { title, newSummary: 'x' }))).replace(title, '')).toContain('2');
      expect((await found(title)).map((item) => item.summary)).toEqual(['', '']);
      expect(sent('itemUpdated')).toEqual([]);
    });

    it('removing the title', async () => {
      const title = await create('keep title');
      expect(await refusal(call('updateItem', { title, newTitle: null }))).toContain('newTitle');
      expect(await refusal(call('updateItem', { title, newTitle: '' }))).toContain('newTitle');
      expect(await found(title)).toEqual([jasmine.objectContaining({ title })]);
      expect(sent('itemUpdated')).toEqual([]);
    });

    it('a call that changes nothing', async () => {
      const title = await create('nothing');
      await expectAsync(call('updateItem', { title })).toBeRejected();
      expect(sent('itemUpdated')).toEqual([]);
    });

    it('a list image that is not a list', async () => {
      const title = await create('bare image');
      expect(await refusal(call('updateItem', { title, newListImage: 'https://example.com/a.png' }))).toContain('newListImage');
      expect((await call('getItem', { title })).listImage).toBe('https://example.com/list.png');
    });

    it('a publication date that is not a date', async () => {
      const title = await create('bad date');
      expect(await refusal(call('updateItem', { title, newPublishDate: 'soon' }))).toContain('newPublishDate');
      expect((await call('getItem', { title })).publishDate).toBe('');
    });

    it('without a title', async () => {
      expect(await refusal(call('updateItem', { newSummary: 'x' }))).toContain('title');
    });

    it('an empty title', async () => {
      expect(await refusal(call('updateItem', { title: '', newSummary: 'x' }))).toContain('title');
    });
  });
});

contract.describe('updateItemAdvanced', () => {
  beforeEach(standIns);

  it('changes the item with that id, only what it is given', async () => {
    const title = unique('update by id');
    const { id } = await call('createItem', { title, summary: 'Kept' });
    resetSent();
    expect(await call('updateItemAdvanced', { itemId: id, newDescription: '<p>By id</p>' }))
      .toEqual(jasmine.objectContaining({ id, title, summary: 'Kept', description: '<p>By id</p>' }));
    expect(await call('getItemAdvanced', { itemId: id })).toEqual(jasmine.objectContaining({ summary: 'Kept', description: '<p>By id</p>' }));
    expect(sent('itemUpdated')).toEqual([jasmine.objectContaining({ itemId: id, title })]);
  });

  it('clears the summary with null', async () => {
    const { id } = await call('createItem', { title: unique('clear by id'), summary: 'Gone' });
    await call('updateItemAdvanced', { itemId: id, newSummary: null });
    expect((await call('getItemAdvanced', { itemId: id })).summary).toBeNull();
  });

  describe('refuses, and changes nothing', () => {
    it('an id no item has', async () => {
      resetSent();
      expect(await refusal(call('updateItemAdvanced', { itemId: MISSING_ID, newSummary: 'x' }))).toContain(MISSING_ID);
      expect(sent('itemUpdated')).toEqual([]);
    });

    it('without an id', async () => {
      expect(await refusal(call('updateItemAdvanced', { newSummary: 'x' }))).toContain('itemId');
    });

    it('a call that changes nothing', async () => {
      const { id } = await call('createItem', { title: unique('nothing by id') });
      await expectAsync(call('updateItemAdvanced', { itemId: id })).toBeRejected();
    });

    it('removing the title', async () => {
      const title = unique('keep title by id');
      const { id } = await call('createItem', { title });
      expect(await refusal(call('updateItemAdvanced', { itemId: id, newTitle: null }))).toContain('newTitle');
      expect((await call('getItemAdvanced', { itemId: id })).title).toBe(title);
    });
  });
});

contract.describe('updateItemsAdvanced', () => {
  beforeEach(standIns);

  it('changes every item it is given, and reports each', async () => {
    const one = await call('createItem', { title: unique('batch update one') });
    const two = await call('createItem', { title: unique('batch update two') });
    const result = await call('updateItemsAdvanced', { items: [{ itemId: one.id, newSummary: 'First' }, { itemId: two.id, newSummary: 'Second' }] });
    expect(result).toEqual(jasmine.objectContaining({
      items: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect((await call('getItemAdvanced', { itemId: one.id })).summary).toBe('First');
    expect((await call('getItemAdvanced', { itemId: two.id })).summary).toBe('Second');
  });

  describe('refuses the whole list, and changes none of it', () => {
    it('when one id matches no item', async () => {
      const item = await call('createItem', { title: unique('batch kept') });
      expect(await refusal(call('updateItemsAdvanced', { items: [{ itemId: item.id, newSummary: 'x' }, { itemId: MISSING_ID, newSummary: 'x' }] }))).toContain(MISSING_ID);
      expect((await call('getItemAdvanced', { itemId: item.id })).summary).toBe('');
    });

    it('when the same item is listed twice', async () => {
      const item = await call('createItem', { title: unique('batch twice') });
      await expectAsync(call('updateItemsAdvanced', { items: [{ itemId: item.id, newSummary: 'a' }, { itemId: item.id, newSummary: 'b' }] })).toBeRejected();
      expect((await call('getItemAdvanced', { itemId: item.id })).summary).toBe('');
    });

    it('when one entry is invalid', async () => {
      const item = await call('createItem', { title: unique('batch invalid') });
      expect(await refusal(call('updateItemsAdvanced', { items: [{ itemId: item.id, newSummary: 'x' }, { itemId: item.id }] }))).toContain('entry 1');
      expect((await call('getItemAdvanced', { itemId: item.id })).summary).toBe('');
    });

    it('when it is empty', async () => {
      await expectAsync(call('updateItemsAdvanced', { items: [] })).toBeRejected();
    });
  });
});

contract.describe('updateItemOrder', () => {
  beforeEach(standIns);

  it('moves the item to the top of the manual order', async () => {
    await sortManually();
    const title = unique('move');
    await call('createItem', { title });
    const result = await call('updateItemOrder', { title, position: 1 });
    expect(result.items[0]).toEqual(jasmine.objectContaining({ title, rank: 0 }));
    expect((await call('searchItems', { sortBy: 'Manually' })).items[0].title).toBe(title);
  }, 300000);

  it('moves the item to the second place', async () => {
    await sortManually();
    const title = unique('second place');
    await call('createItem', { title });
    const result = await call('updateItemOrder', { title, position: 2 });
    expect(result.items[1]).toEqual(jasmine.objectContaining({ title, rank: 1 }));
    expect((await call('getItem', { title })).rank).toBe(1);
  }, 300000);

  describe('refuses, and moves nothing', () => {
    it('while the items are sorted another way', async () => {
      const title = unique('sorted');
      await call('createItem', { title });
      await call('updateHomeContent', { sortBy: 'Newest entry first' });
      const rank = (await call('getItem', { title })).rank;
      expect(await refusal(call('updateItemOrder', { title, position: 1 }))).toContain('manual');
      expect((await call('getItem', { title })).rank).toBe(rank);
      await sortManually();
    }, 300000);

    it('a position below 1', async () => {
      const title = unique('position zero');
      await call('createItem', { title });
      expect(await refusal(call('updateItemOrder', { title, position: 0 }))).toContain('position');
    });

    it('a position that is not a whole number', async () => {
      const title = unique('position half');
      await call('createItem', { title });
      expect(await refusal(call('updateItemOrder', { title, position: 1.5 }))).toContain('position');
    });

    it('without a position', async () => {
      const title = unique('no position');
      await call('createItem', { title });
      expect(await refusal(call('updateItemOrder', { title }))).toContain('position');
    });

    it('a position past the last item', async () => {
      await sortManually();
      const title = unique('too far');
      await call('createItem', { title });
      const rank = (await call('getItem', { title })).rank;
      expect(await refusal(call('updateItemOrder', { title, position: 1000000 }))).toContain('position');
      expect((await call('getItem', { title })).rank).toBe(rank);
    }, 300000);

    it('a title no item has, naming it', async () => {
      const title = unique('missing');
      expect(await refusal(call('updateItemOrder', { title, position: 1 }))).toContain(title);
    });

    it('without a title', async () => {
      expect(await refusal(call('updateItemOrder', { position: 1 }))).toContain('title');
    });
  });
});

contract.describe('updateItemOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves the item with that id to the top of the manual order', async () => {
    await sortManually();
    const title = unique('move by id');
    const { id } = await call('createItem', { title });
    const result = await call('updateItemOrderAdvanced', { itemId: id, position: 1 });
    expect(result.items[0]).toEqual(jasmine.objectContaining({ id, title, rank: 0 }));
    expect((await call('getItemAdvanced', { itemId: id })).rank).toBe(0);
  }, 300000);

  describe('refuses', () => {
    it('an id no item has', async () => {
      expect(await refusal(call('updateItemOrderAdvanced', { itemId: MISSING_ID, position: 1 }))).toContain(MISSING_ID);
    });

    it('without an id', async () => {
      expect(await refusal(call('updateItemOrderAdvanced', { position: 1 }))).toContain('itemId');
    });

    it('a position below 1', async () => {
      const { id } = await call('createItem', { title: unique('position zero by id') });
      expect(await refusal(call('updateItemOrderAdvanced', { itemId: id, position: 0 }))).toContain('position');
    });
  });
});

contract.describe('deleteItem', () => {
  beforeEach(standIns);

  it('removes the item with that title, and announces it', async () => {
    const title = unique('delete');
    const { id } = await call('createItem', { title });
    resetSent();
    expect(await call('deleteItem', { title })).toEqual(jasmine.objectContaining({ id, title, status: jasmine.any(String) }));
    expect(await found(title)).toEqual([]);
    expect(sent('itemDeleted')).toEqual([jasmine.objectContaining({ itemId: id, title })]);
  });

  it('leaves every other item alone', async () => {
    const kept = unique('kept');
    await call('createItem', { title: kept });
    const deleted = unique('deleted');
    await call('createItem', { title: deleted });
    await call('deleteItem', { title: deleted });
    expect(await found(kept)).toEqual([jasmine.objectContaining({ title: kept })]);
  });

  describe('refuses, deletes nothing and announces nothing', () => {
    it('a title no item has, naming it', async () => {
      const title = unique('missing');
      resetSent();
      expect(await refusal(call('deleteItem', { title }))).toContain(title);
      expect(sent('itemDeleted')).toEqual([]);
    });

    it('a title two items share, saying how many', async () => {
      const title = unique('shared');
      await call('createItem', { title });
      await call('createItem', { title });
      resetSent();
      expect((await refusal(call('deleteItem', { title }))).replace(title, '')).toContain('2');
      expect((await found(title)).length).toBe(2);
      expect(sent('itemDeleted')).toEqual([]);
    });

    it('without a title', async () => {
      expect(await refusal(call('deleteItem', {}))).toContain('title');
    });

    it('an empty title', async () => {
      expect(await refusal(call('deleteItem', { title: '' }))).toContain('title');
    });
  });
});

contract.describe('deleteItemAdvanced', () => {
  beforeEach(standIns);

  it('removes the item with that id, and announces it', async () => {
    const title = unique('delete by id');
    const { id } = await call('createItem', { title });
    resetSent();
    expect(await call('deleteItemAdvanced', { itemId: id })).toEqual(jasmine.objectContaining({ id, title }));
    expect(await found(title)).toEqual([]);
    expect(sent('itemDeleted')).toEqual([jasmine.objectContaining({ itemId: id, title })]);
  });

  describe('refuses, and deletes nothing', () => {
    it('an id no item has', async () => {
      resetSent();
      expect(await refusal(call('deleteItemAdvanced', { itemId: MISSING_ID }))).toContain(MISSING_ID);
      expect(sent('itemDeleted')).toEqual([]);
    });

    it('without an id', async () => {
      expect(await refusal(call('deleteItemAdvanced', {}))).toContain('itemId');
    });
  });
});

contract.describe('deleteItemsAdvanced', () => {
  beforeEach(standIns);

  it('removes every item it is given, and reports each', async () => {
    const titles = [unique('batch delete one'), unique('batch delete two')];
    const one = await call('createItem', { title: titles[0] });
    const two = await call('createItem', { title: titles[1] });
    expect(await call('deleteItemsAdvanced', { items: [{ itemId: one.id }, { itemId: two.id }] })).toEqual(jasmine.objectContaining({
      items: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect(await found(titles[0])).toEqual([]);
    expect(await found(titles[1])).toEqual([]);
  });

  describe('refuses the whole list, and deletes none of it', () => {
    it('when one id matches no item', async () => {
      const title = unique('batch delete kept');
      const item = await call('createItem', { title });
      expect(await refusal(call('deleteItemsAdvanced', { items: [{ itemId: item.id }, { itemId: MISSING_ID }] }))).toContain(MISSING_ID);
      expect(await found(title)).toEqual([jasmine.objectContaining({ id: item.id })]);
    });

    it('when the same item is listed twice', async () => {
      const title = unique('batch delete twice');
      const item = await call('createItem', { title });
      await expectAsync(call('deleteItemsAdvanced', { items: [{ itemId: item.id }, { itemId: item.id }] })).toBeRejected();
      expect(await found(title)).toEqual([jasmine.objectContaining({ id: item.id })]);
    });

    it('when it is empty', async () => {
      await expectAsync(call('deleteItemsAdvanced', { items: [] })).toBeRejected();
    });
  });
});
