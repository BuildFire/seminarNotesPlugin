// settings: the plugin's one settings record, shared by the content, design and settings tabs.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));

contract.describe('getSettings', () => {
  it('shows the settings', async () => {
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      allowSharing: jasmine.any(Boolean), content: jasmine.any(Object), design: jasmine.any(Object)
    }));
  });
});

contract.describe('updateSettings', () => {
  it('turns content sharing on', async () => {
    expect(await call('updateSettings', { allowSharing: true })).toEqual(jasmine.objectContaining({ allowSharing: true }));
  });

  it('changes every setting', async () => {
    expect(await call('updateSettings', { allowSharing: false, seminarDelay: 60, lockedStyle: 'locked' })).toEqual(jasmine.objectContaining({
      allowSharing: false,
      content: jasmine.objectContaining({ seminarDelay: jasmine.objectContaining({ value: 60 }), lockedClass: 'locked' })
    }));
  });
});

contract.describe('updateDesign', () => {
  it('changes the layout', async () => {
    expect(await call('updateDesign', { listLayout: 'Item_List_2' })).toEqual(jasmine.objectContaining({
      design: jasmine.objectContaining({ itemListLayout: 'Item_List_2' })
    }));
  });

  it('changes the layout and the background', async () => {
    expect(await call('updateDesign', { listLayout: 'Item_List_3', listBackgroundImage: ['https://example.com/pre-list-background.png'] }))
      .toEqual(jasmine.objectContaining({
        design: jasmine.objectContaining({ itemListLayout: 'Item_List_3', itemListBgImage: 'https://example.com/pre-list-background.png' })
      }));
  });
});

contract.describe('updateHomeContent', () => {
  it('changes the text', async () => {
    expect(await call('updateHomeContent', { description: '<p>Pre welcome</p>' })).toEqual(jasmine.objectContaining({
      content: jasmine.objectContaining({ description: '<p>Pre welcome</p>' })
    }));
  });

  it('changes the slider, the text and the order', async () => {
    const carouselImages = [{ title: 'Pre slide', action: 'linkToWeb', url: 'https://example.com', iconUrl: 'https://example.com/pre-home-slide.png' }];
    expect(await call('updateHomeContent', { carouselImages, description: '<p>Pre home</p>', sortBy: 'Manually' })).toEqual(jasmine.objectContaining({
      content: jasmine.objectContaining({ description: '<p>Pre home</p>', sortBy: 'Manually' })
    }));
  }, 120000);
});
