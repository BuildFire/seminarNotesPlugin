// labels: the wording of the labels and messages the app shows, set in the Languages tab.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));

contract.describe('getLabels', () => {
  it('shows the text of the labels', async () => {
    expect(await call('getLabels', {})).toEqual(jasmine.objectContaining({ items: jasmine.any(String), done: jasmine.any(String) }));
  });
});

contract.describe('updateLabels', () => {
  it('changes one label', async () => {
    expect(await call('updateLabels', { items: 'Pre seminars' })).toEqual(jasmine.objectContaining({ items: 'Pre seminars' }));
  });

  it('changes several labels, and empties one', async () => {
    expect(await call('updateLabels', { myNotes: 'Pre my notes', nextSeminarOpen: 'Pre the next seminar is open', search: '' }))
      .toEqual(jasmine.objectContaining({ myNotes: 'Pre my notes', nextSeminarOpen: 'Pre the next seminar is open', search: 'Search' }));
  });
});
