describe('Unit : Seminar Notes Plugin content.item.controller.js', function () {
  var ContentItem, scope, $rootScope, $controller, Buildfire, ActionItems, TAG_NAMES, STATUS_CODE, LAYOUTS, STATUS_MESSAGES, q;
  beforeEach(module('seminarNotesPluginContent'));
  var editor;
  beforeEach(inject(function (_$rootScope_, _$q_, _Buildfire_, _$controller_, _TAG_NAMES_, _STATUS_CODE_, _LAYOUTS_, _STATUS_MESSAGES_) {
    $rootScope = _$rootScope_;
    q = _$q_;
    scope = $rootScope.$new();
    $controller = _$controller_;
    TAG_NAMES = _TAG_NAMES_;
    STATUS_CODE = _STATUS_CODE_;
    STATUS_MESSAGES = _STATUS_MESSAGES_;
    LAYOUTS = _LAYOUTS_;
    Buildfire = {
      components: {
        carousel: {
          editor: function (name) {
            return {}
          },
          viewer: function (name) {
            return {}
          }
        },
        images: {
          thumbnail: function () {

          }
        },
        actionItems: {}
      }
    };
    Buildfire.actionItems = jasmine.createSpyObj('actionItems', ['showDialog']);
    //Buildfire.components.carousel = jasmine.createSpyObj('Buildfire.components.carousel', ['editor', 'onAddItems']);
    Buildfire.components.carousel = jasmine.createSpyObj('Buildfire.components.carousel', ['editor', '', '']);
    Buildfire.components.carousel.editor.and.callFake(function () {
      return {
        loadItems: function () {
          console.log("editor.loadItems hasbeen called");
        }
      };
    });
  }));

  beforeEach(function () {
    ContentItem = $controller('ContentItemCtrl', {
      $scope: scope,
      $q: q,
      Buildfire: Buildfire,
      TAG_NAMES: TAG_NAMES,
      ActionItems: ActionItems,
      STATUS_CODE: STATUS_CODE,
      LAYOUTS: LAYOUTS
    });
  });


  describe('It will test the defined methods', function () {
    it('it should pass if ContentItem is defined', function () {
      expect(ContentItem).not.toBeUndefined();
    });
    it('it should pass if ContentItem.removeLink remove the link', function () {
      ContentItem.item.data.links = [{id: 'item1'}];
      ContentItem.removeLink();
      $rootScope.$apply();
      expect(ContentItem.item.data.links.length).toEqual(0);
    });
    it('it should pass if ContentItem.addLink add the link', function () {
      var option1 = null;
      var option2 = {};
      Buildfire.actionItems.showDialog.and.callFake(function (option1, option2, callback) {
        callback(null, {'title': 'link1'});
      });
      ContentItem.item.data = {links: []};
      ContentItem.addLink();
      $rootScope.$apply();
      expect(ContentItem.item.data.links.length).toEqual(1);
    });
    it('it should pass if ContentItem.addLink Error case', function () {
      var option1 = null;
      var option2 = {};
      Buildfire.actionItems.showDialog.and.callFake(function (option1, option2, callback) {
        callback({'Error': 'Error'}, null);
      });
      ContentItem.item.data = {links: []};
      ContentItem.addLink();
      $rootScope.$apply();
      expect(ContentItem.item.data.links.length).toEqual(0);
    });
    it('it should pass if ContentItem.item.data.links is defined', function () {
      var option1 = null;
      var option2 = {};
      Buildfire.actionItems.showDialog.and.callFake(function (option1, option2, callback) {
        callback(null, {'title': 'link1'});
      });
      ContentItem.item.data = {};
      ContentItem.addLink();
      $rootScope.$apply();
      expect(ContentItem.item.data.links).toBeDefined();
    });
    it('it should pass if ContentItem.editLink', function () {
      var option1 = {'title': 'link1'};
      var option2 = {};
      Buildfire.actionItems.showDialog.and.callFake(function (option1, option2, callback) {
        callback(null, {'title': 'link1'});
      });
      ContentItem.item.data = {};
      ContentItem.editLink({'title': 'link1'}, 0);
      $rootScope.$apply();
      expect(ContentItem.item.data.links).toBeDefined();
    });
    it('it should pass if ContentItem.editLink Error Case', function () {
      var option1 = {'title': 'link1'};
      var option2 = {};
      Buildfire.actionItems.showDialog.and.callFake(function (option1, option2, callback) {
        callback({'Error': 'Error'}, null);
      });
      ContentItem.item.data = {links: [{'title': 'link1'}]};
      ContentItem.editLink({'title': 'link1'}, 0);
      $rootScope.$apply();
      expect(ContentItem.item.data.links.length).toEqual(1);
    });
    it('it should pass if ContentItem.editLink Error and result is null', function () {
      var option1 = {'title': 'link1'};
      var option2 = {};
      Buildfire.actionItems.showDialog.and.callFake(function (option1, option2, callback) {
        callback(null, null);
      });
      ContentItem.item.data = {links: []};
      ContentItem.editLink({'title': 'link1'}, 0);
      $rootScope.$apply();
      expect(ContentItem.item.data.links).toBeDefined();
    });
  });
});