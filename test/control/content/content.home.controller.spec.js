describe('Unit : Seminar notes Plugin content.home.controller.js', function () {
  var ContentHome, scope, $rootScope, $controller, Buildfire, ActionItems, TAG_NAMES, STATUS_CODE, LAYOUTS, STATUS_MESSAGES, q, buildfire;
  beforeEach(module('seminarNotesPluginContent'));
  var editor;
  beforeEach(inject(function (_$rootScope_, _$q_, _$controller_, _TAG_NAMES_, _STATUS_CODE_, _LAYOUTS_, _STATUS_MESSAGES_) {
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
        }
      }
    };
    buildfire = {
      navigation: {
        scrollTop: function () {
        }
      }
    };

    ActionItems = jasmine.createSpyObj('ActionItems', ['showDialog']);
    Buildfire.components.carousel = jasmine.createSpyObj('Buildfire.components.carousel', ['editor', 'onAddItems']);
    buildfire.navigation = jasmine.createSpyObj('buildfire.navigation', ['scrollTop']);

  }));

  beforeEach(function () {
    ContentHome = $controller('ContentHomeCtrl', {
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
    it('it should pass if ContentHome is defined', function () {
      expect(ContentHome).not.toBeUndefined();
    });
  });
});