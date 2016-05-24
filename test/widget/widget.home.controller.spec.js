describe('Unit : seminarNotesPluginWidget widget.home.controller.js', function () {
  var WidgetHome, scope, $rootScope, $controller, Buildfire, ActionItems, TAG_NAMES, STATUS_CODE, LAYOUTS, STATUS_MESSAGES, CONTENT_TYPE, q, SORT;
  beforeEach(module('seminarNotesPluginWidget'));
  var editor;
  beforeEach(inject(function (_$rootScope_, _$q_, _$controller_, _TAG_NAMES_, _STATUS_CODE_, _LAYOUTS_, _STATUS_MESSAGES_, _SORT_) {
    $rootScope = _$rootScope_;
    q = _$q_;
    scope = $rootScope.$new();
    $controller = _$controller_;
    TAG_NAMES = _TAG_NAMES_;
    STATUS_CODE = _STATUS_CODE_;
    STATUS_MESSAGES = _STATUS_MESSAGES_;
    LAYOUTS = _LAYOUTS_;
    SORT = _SORT_;
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
      },
      spinner: {
        show: function () {
        }
      },
      userData:{
        search:function(){}
      }
    };
    ActionItems = jasmine.createSpyObj('ActionItems', ['showDialog']);
    Buildfire.components.carousel = jasmine.createSpyObj('Buildfire.components.carousel', ['editor', 'onAddItems']);

  }));

  beforeEach(function () {
    WidgetHome = $controller('WidgetHomeCtrl', {
      $scope: scope,
      $q: q,
      Buildfire: Buildfire,
      TAG_NAMES: TAG_NAMES,
      ActionItems: ActionItems,
      STATUS_CODE: STATUS_CODE,
      CONTENT_TYPE: CONTENT_TYPE,
      LAYOUTS: LAYOUTS
    });
  });



  describe('getItem Method Call', function () {
  it('should invoke when getItems is called for SORT.MANUALLY', function () {
      WidgetHome.data ={
        content:{
          sortBy:"test"
        }
      }
      WidgetHome.getSearchOptions(SORT.MANUALLY);
      WidgetHome.getItems();
    });
    it('should invoke when getItems is called for SORT.ITEM_TITLE_A_Z', function () {
      WidgetHome.data ={
        content:{
          sortBy:"test"
        }
      }
      WidgetHome.getSearchOptions(SORT.ITEM_TITLE_A_Z);
      WidgetHome.getItems();
    });
    it('should invoke when getItems is called for SORT.ITEM_TITLE_Z_A', function () {
      WidgetHome.data ={
        content:{
          sortBy:"test"
        }
      }
      WidgetHome.getSearchOptions(SORT.ITEM_TITLE_Z_A);
      WidgetHome.getItems();
    });
    it('should invoke when getItems is called for SORT.NEWEST_PUBLICATION_DATE', function () {
      WidgetHome.data ={
        content:{
          sortBy:"test"
        }
      }
      WidgetHome.getSearchOptions(SORT.NEWEST_PUBLICATION_DATE);
      WidgetHome.getItems();
    });
    it('should invoke when getItems is called for SORT.OLDEST_PUBLICATION_DATE', function () {
      WidgetHome.data ={
        content:{
          sortBy:"test"
        }
      }
      WidgetHome.getSearchOptions(SORT.OLDEST_PUBLICATION_DATE);
      WidgetHome.getItems();
    });
    it('should invoke when getItems is called for SORT.NEWEST_FIRST', function () {
      WidgetHome.data ={
        content:{
          sortBy:"test"
        }
      }
      WidgetHome.getSearchOptions(SORT.NEWEST_FIRST);
      WidgetHome.getItems();
    });
    it('should invoke when getItems is called for SORT.OLDEST_FIRST', function () {
      WidgetHome.data ={
        content:{
          sortBy:"test"
        }
      }
      WidgetHome.getSearchOptions(SORT.OLDEST_FIRST);
      WidgetHome.getItems();
    });
  });
  describe('WidgetHome.setBookmarks Method Call', function () {
    it('should invoke when WidgetHome.setBookmarks is called', function () {
      WidgetHome.bookmarks ={}
      WidgetHome.setBookmarks();
    });
  });

  describe('WidgetHome.safeHtml Method Call', function () {
    it('should invoke when WidgetHome.safeHtml is called', function () {
       WidgetHome.safeHtml('<div></div>');
    });
  });

  //describe('Carousel:LOADED', function () {
  //  var html = '<div id="carousel"></div>';
  //  angular.element(document.body).append(html);
  //  it('should invoke when get Carousel:LOADED with carousal images', function () {
  //    WidgetHome.data = {
  //
  //    };
  //    $rootScope.$broadcast('Carousel:LOADED');
  //  });
  //
  //  it('should invoke when get Carousel:LOADED without carousal images', function () {
  //    WidgetHome.data = {
  //    };
  //    $rootScope.$broadcast('Carousel:LOADED');
  //  });
  //
  //
  //});
  describe('$destroy', function () {
    it('should invoke when get $destroy', function () {
      $rootScope.$broadcast('$destroy');
    });
  });
});