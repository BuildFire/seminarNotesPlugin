// labels: the wording of the labels and messages the app shows, set in the Languages tab.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
// A text unique to the run and the host, short enough for the 20-character labels.
const short = (letter) => `${letter}${contract.host.charAt(0)}${Date.now() % 100000000}`;

const LABEL_KEYS = ['items', 'myNotes', 'bookmarks', 'search', 'openMenuOptions', 'openItemNotes', 'addNewNote', 'backToNoteList',
  'closeNoteList', 'done', 'itemRemovedFromBookmarks', 'itemBookmarked', 'noItems', 'noNotesAddedYet', 'noBookmarksAddedYet',
  'noSearchResults', 'enterKeywordsOrPhraseToSearchItems', 'searchNoteTitlesAndContent', 'enterNoteTitle', 'enterNoteContent', 'saved',
  'areYouSureTitle', 'areYouSureMessage', 'areYouSureImportTitle', 'areYouSureImportMessage', 'expireWarning', 'errorSharing', 'shareTitle',
  'shareDescription', 'errorSharingNoNotes', 'deeplinkNoteNotFound', 'nextSeminarOpen', 'seminarNotAvailable'];

contract.describe('getLabels', () => {
  it('shows the text of every label', async () => {
    // Both hosts read the one record whatever the control specs last saved, so only that every label has a text is checked.
    const labels = await call('getLabels', {});
    LABEL_KEYS.forEach((key) => expect(labels[key]).toEqual(jasmine.any(String)));
    LABEL_KEYS.forEach((key) => expect(labels[key].length).toBeGreaterThan(0));
  });

  it('changes nothing', async () => {
    expect(await call('getLabels', {})).toEqual(await call('getLabels', {}));
  });
});

// controlBackground only: this block runs in the control frame, where the datastore is writable.
contract.describe('updateLabels', () => {
  it('changes only the labels it is given, and returns every label', async () => {
    const items = short('I');
    const open = unique('next seminar open');
    await call('updateLabels', { items, nextSeminarOpen: open });
    const done = short('D');
    const labels = await call('updateLabels', { done });
    expect(labels).toEqual(jasmine.objectContaining({ items, nextSeminarOpen: open, done }));
    expect(await call('getLabels', {})).toEqual(jasmine.objectContaining({ items, nextSeminarOpen: open, done }));
  });

  it('goes back to the original text when a label is emptied, or set to null', async () => {
    await call('updateLabels', { search: short('S'), saved: short('V') });
    expect((await call('updateLabels', { search: '' })).search).toBe('Search');
    expect((await call('updateLabels', { saved: null })).saved).toBe('Saved');
    expect(await call('getLabels', {})).toEqual(jasmine.objectContaining({ search: 'Search', saved: 'Saved' }));
  });

  it('takes a text as long as the label allows', async () => {
    const twenty = `${short('B')}xxxxxxxxxxxxxxxxxxxx`.slice(0, 20);
    expect((await call('updateLabels', { bookmarks: twenty })).bookmarks).toBe(twenty);
  });

  describe('refuses, and changes nothing', () => {
    let kept;
    beforeEach(async () => {
      kept = short('K');
      await call('updateLabels', { myNotes: kept });
    });

    it('a text longer than the label allows', async () => {
      expect(await refusal(call('updateLabels', { myNotes: 'x'.repeat(21) }))).toContain('myNotes');
      expect((await call('getLabels', {})).myNotes).toBe(kept);
    });

    it('a text that is not text', async () => {
      expect(await refusal(call('updateLabels', { myNotes: 5 }))).toContain('myNotes');
      expect((await call('getLabels', {})).myNotes).toBe(kept);
    });

    it('a call with no label in it', async () => {
      await expectAsync(call('updateLabels', {})).toBeRejected();
      expect((await call('getLabels', {})).myNotes).toBe(kept);
    });
  });
});
