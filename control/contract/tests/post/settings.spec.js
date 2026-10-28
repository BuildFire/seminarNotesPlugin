// settings: the plugin's one settings record, shared by the content, design and settings tabs.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;

const SORT_ORDERS = ['Manually', 'Item title A-Z', 'Item title Z-A', 'Newest pub. date first', 'Oldest pub. date first', 'Newest entry first', 'Oldest entry first'];
const DELAYS = [0, 30, 60, 1440, 10080];
const LOCKED_STYLES = ['hidden', 'locked'];
const LAYOUTS = ['Item_List_1', 'Item_List_2', 'Item_List_3', 'Item_List_4', 'Item_List_5'];

// Calls nothing here answers, made when items are added for the order check: bookkeeping the manifest does not mention.
const standIns = () => {
  spyOn(buildfire.deeplink, 'registerDeeplink').and.callFake((options, callback) => callback && callback(null, { data: options }));
  spyOn(buildfire.analytics, 'registerEvent');
  spyOn(buildfire.services.contract.events, 'send').and.callFake((name, data, callback) => callback && callback(null, []));
};

contract.describe('getSettings', () => {
  it('shows every setting, with a value each tab offers', async () => {
    // Both hosts read the one record whatever the control specs last saved, so only its shape and allowed values are checked.
    const settings = await call('getSettings', {});
    expect(settings.allowSharing).toEqual(jasmine.any(Boolean));
    expect(settings.content).toEqual(jasmine.objectContaining({
      description: jasmine.any(String), carouselImages: jasmine.any(Array), seminarDelay: jasmine.any(Object)
    }));
    expect(SORT_ORDERS).toContain(settings.content.sortBy);
    expect(DELAYS).toContain(settings.content.seminarDelay.value);
    expect(LOCKED_STYLES).toContain(settings.content.lockedClass);
    expect(LAYOUTS).toContain(settings.design.itemListLayout);
    expect(settings.design.itemListBgImage).toEqual(jasmine.any(String));
  });

  it('changes nothing', async () => {
    expect(await call('getSettings', {})).toEqual(await call('getSettings', {}));
  });
});

// controlBackground only: this block and the next two run in the control frame, where the datastore is writable.
contract.describe('updateSettings', () => {
  it('changes only the settings it is given, and returns them', async () => {
    await call('updateSettings', { allowSharing: true, seminarDelay: 60, lockedStyle: 'locked' });
    const saved = await call('updateSettings', { seminarDelay: 1440 });
    expect(saved.allowSharing).toBe(true);
    expect(saved.content).toEqual(jasmine.objectContaining({ seminarDelay: { label: 'One Day', value: 1440 }, lockedClass: 'locked' }));
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      allowSharing: true,
      content: jasmine.objectContaining({ seminarDelay: { label: 'One Day', value: 1440 }, lockedClass: 'locked' })
    }));
  });

  it('turns sharing and the delay off', async () => {
    await call('updateSettings', { allowSharing: false, seminarDelay: 0, lockedStyle: 'hidden' });
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      allowSharing: false,
      content: jasmine.objectContaining({ seminarDelay: { label: 'Off', value: 0 }, lockedClass: 'hidden' })
    }));
  });

  it('leaves the design and the home content alone', async () => {
    const before = await call('getSettings', {});
    await call('updateSettings', { allowSharing: !before.allowSharing });
    const after = await call('getSettings', {});
    expect(after.design).toEqual(before.design);
    expect(after.content.description).toEqual(before.content.description);
  });

  describe('refuses, and changes nothing', () => {
    beforeEach(() => call('updateSettings', { allowSharing: true, seminarDelay: 30, lockedStyle: 'locked' }));
    const unchanged = async () => expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      allowSharing: true,
      content: jasmine.objectContaining({ seminarDelay: { label: 'Half hour', value: 30 }, lockedClass: 'locked' })
    }));

    it('a delay it does not offer', async () => {
      expect(await refusal(call('updateSettings', { seminarDelay: 45 }))).toContain('seminarDelay');
      await unchanged();
    });

    it('a style it does not offer', async () => {
      expect(await refusal(call('updateSettings', { lockedStyle: 'blurred' }))).toContain('lockedStyle');
      await unchanged();
    });

    it('a sharing setting that is not true or false', async () => {
      expect(await refusal(call('updateSettings', { allowSharing: 'yes' }))).toContain('allowSharing');
      await unchanged();
    });

    it('a call with no setting in it', async () => {
      await expectAsync(call('updateSettings', {})).toBeRejected();
      await unchanged();
    });
  });
});

contract.describe('updateDesign', () => {
  it('changes only what it is given, and keeps the background as a single URL', async () => {
    await call('updateDesign', { listLayout: 'Item_List_2', listBackgroundImage: ['https://example.com/list-background.png'] });
    const saved = await call('updateDesign', { listLayout: 'Item_List_4' });
    expect(saved.design).toEqual({ itemListLayout: 'Item_List_4', itemListBgImage: 'https://example.com/list-background.png' });
    expect((await call('getSettings', {})).design).toEqual({ itemListLayout: 'Item_List_4', itemListBgImage: 'https://example.com/list-background.png' });
  });

  it('removes the background with an empty list, and with null', async () => {
    await call('updateDesign', { listBackgroundImage: ['https://example.com/a.png'] });
    expect((await call('updateDesign', { listBackgroundImage: [] })).design.itemListBgImage).toBe('');
    await call('updateDesign', { listBackgroundImage: ['https://example.com/b.png'] });
    await call('updateDesign', { listBackgroundImage: null });
    expect((await call('getSettings', {})).design.itemListBgImage).toBe('');
  });

  describe('refuses, and changes nothing', () => {
    beforeEach(() => call('updateDesign', { listLayout: 'Item_List_3', listBackgroundImage: ['https://example.com/kept.png'] }));
    const unchanged = async () => expect((await call('getSettings', {})).design)
      .toEqual({ itemListLayout: 'Item_List_3', itemListBgImage: 'https://example.com/kept.png' });

    it('a layout it does not offer', async () => {
      expect(await refusal(call('updateDesign', { listLayout: 'Item_List_9' }))).toContain('listLayout');
      await unchanged();
    });

    it('a background that is not a list', async () => {
      expect(await refusal(call('updateDesign', { listBackgroundImage: 'https://example.com/a.png' }))).toContain('listBackgroundImage');
      await unchanged();
    });

    it('two backgrounds', async () => {
      expect(await refusal(call('updateDesign', { listBackgroundImage: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toContain('listBackgroundImage');
      await unchanged();
    });

    it('a call with nothing in it', async () => {
      await expectAsync(call('updateDesign', {})).toBeRejected();
      await unchanged();
    });
  });
});

contract.describe('updateHomeContent', () => {
  beforeEach(standIns);
  const slider = [{ title: 'Welcome', action: 'linkToWeb', url: 'https://example.com', iconUrl: 'https://example.com/welcome.png' }];

  it('changes only what it is given, and returns the settings', async () => {
    await call('updateHomeContent', { description: '<p>Welcome</p>', carouselImages: slider });
    const saved = await call('updateHomeContent', { description: '<p>Changed</p>' });
    expect(saved.content).toEqual(jasmine.objectContaining({ description: '<p>Changed</p>', carouselImages: slider }));
    expect((await call('getSettings', {})).content).toEqual(jasmine.objectContaining({ description: '<p>Changed</p>', carouselImages: slider }));
  });

  it('replaces the slider, and empties it', async () => {
    const other = [{ title: 'Other', action: 'linkToWeb', url: 'https://example.com/other', iconUrl: 'https://example.com/other.png' }];
    await call('updateHomeContent', { carouselImages: slider });
    await call('updateHomeContent', { carouselImages: other });
    expect((await call('getSettings', {})).content.carouselImages).toEqual(other);
    await call('updateHomeContent', { carouselImages: [] });
    expect((await call('getSettings', {})).content.carouselImages).toEqual([]);
    await call('updateHomeContent', { carouselImages: other });
    await call('updateHomeContent', { carouselImages: null });
    expect((await call('getSettings', {})).content.carouselImages).toEqual([]);
  });

  it('clears the text with an empty text, and with null', async () => {
    await call('updateHomeContent', { description: '<p>Text</p>' });
    await call('updateHomeContent', { description: '' });
    expect((await call('getSettings', {})).content.description).toBe('');
    await call('updateHomeContent', { description: '<p>Text</p>' });
    expect((await call('updateHomeContent', { description: null })).content.description).toBeNull();
  });

  it('sets the order, and ranks every item by it', async () => {
    const stamp = `(${contract.host}) ${Date.now()}`;
    await call('createItem', { title: `Post zz order ${stamp}` });
    await call('createItem', { title: `Post aa order ${stamp}` });
    const saved = await call('updateHomeContent', { sortBy: 'Item title A-Z' });
    expect(saved.content.sortBy).toBe('Item title A-Z');
    const first = await call('getItem', { title: `Post aa order ${stamp}` });
    const last = await call('getItem', { title: `Post zz order ${stamp}` });
    expect(first.rank).toBeLessThan(last.rank);
    const ranked = (await call('searchItems', { sortBy: 'Manually' })).items.map((item) => item.rank);
    expect(ranked).toEqual(ranked.map((rank, index) => index));
    await call('updateHomeContent', { sortBy: 'Manually' });
  }, 300000);

  describe('refuses, and changes nothing', () => {
    beforeEach(() => call('updateHomeContent', { description: '<p>Kept</p>', carouselImages: slider }));
    const unchanged = async () => expect((await call('getSettings', {})).content)
      .toEqual(jasmine.objectContaining({ description: '<p>Kept</p>', carouselImages: slider }));

    it('an order it does not offer', async () => {
      expect(await refusal(call('updateHomeContent', { sortBy: 'Random' }))).toContain('sortBy');
      await unchanged();
    });

    it('a slider that is not a list', async () => {
      expect(await refusal(call('updateHomeContent', { carouselImages: 'https://example.com/a.png' }))).toContain('carouselImages');
      await unchanged();
    });

    it('a slider picture without its image', async () => {
      expect(await refusal(call('updateHomeContent', { carouselImages: [{ title: 'No picture', action: 'linkToWeb' }] }))).toContain('carouselImages');
      await unchanged();
    });

    it('a text that is not text', async () => {
      expect(await refusal(call('updateHomeContent', { description: 5 }))).toContain('description');
      await unchanged();
    });

    it('a call with nothing in it', async () => {
      await expectAsync(call('updateHomeContent', {})).toBeRejected();
      await unchanged();
    });
  });

  it('keeps a text it is given exactly as written', async () => {
    const text = `<p>${unique('home text')}</p><ul><li>One</li></ul>`;
    expect((await call('updateHomeContent', { description: text })).content.description).toBe(text);
  });
});
