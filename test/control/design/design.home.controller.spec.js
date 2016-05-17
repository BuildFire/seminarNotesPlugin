describe('Unit : seminarNotesPlugin design.home.controller.js', function () {
  var $scope, DesignHome, $rootScope, q, $controller, DataStore, TAG_NAMES, STATUS_CODE, STATUS_MESSAGES;
  beforeEach(module('seminarNotesPluginDesign'));

  beforeEach(inject(function (_$rootScope_, _$q_, _$controller_, _DataStore_, _TAG_NAMES_, _STATUS_CODE_, _STATUS_MESSAGES_) {
    $rootScope = _$rootScope_;
    q = _$q_;
    $scope = $rootScope.$new();
    $controller = _$controller_;
    DataStore = _DataStore_;
    TAG_NAMES = _TAG_NAMES_;
    STATUS_CODE = _STATUS_CODE_;
    STATUS_MESSAGES = _STATUS_MESSAGES_;
  }));

  beforeEach(function () {
    inject(function ($injector, $q) {
      $rootScope = $injector.get('$rootScope');
      $scope = $rootScope.$new();
      DesignHome = $injector.get('$controller')('DesignHomeCtrl', {
        $scope: $scope,
        data: {
          design: {
            itemListLayout: "test",
            itemListBgImage: "test123"
          }
        },
        Buildfire: {
          imageLib: {
            showDialog: function (options, callback) {
              DesignHome._callback(null, {selectedFiles: ['test']});
            }
          },
          components: {
            images: {
              thumbnail: function () {

              }
            }
          },
          datastore: {
            get: function () {
            },
            save: function () {
            }
          }
        }
      });
      q = $q;
    });
  });

  describe('Variable Unit: DesignHome.layouts', function () {
    it('it should pass if DesignHome.layouts match the result', function () {
      expect(DesignHome.layouts).toEqual({
        itemListLayout: [
          {name: "Item_List_1"},
          {name: "Item_List_2"},
          {name: "Item_List_3"},
          {name: "Item_List_4"},
          {name: "Item_List_5"}
        ]
      });
    });
    it('it should pass if DesignHome.changeListLayout change the layout', function () {
      DesignHome.data = {
        design: {
          itemListLayout: 'Layout'
        }
      };
      DesignHome.changeListLayout('Item_List_1');
      $rootScope.$apply();
      expect(DesignHome.data.design.itemListLayout).toEqual('Item_List_1');
    });
  });
});