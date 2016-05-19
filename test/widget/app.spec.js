describe('Unit: seminarNotesPluginWidget widget app', function () {
  describe('Unit: app routes', function () {
    beforeEach(module('seminarNotesPluginWidget'));
    var location, route, rootScope, compile, scope, directiveElem;
    beforeEach(inject(function (_$rootScope_, _$compile_, $rootScope) {
      // route = _$route_;
      rootScope = _$rootScope_;
      compile = _$compile_;
      scope = $rootScope.$new();
      directiveElem = getCompiledElement();
    }));


    function getCompiledElement() {
      var element = angular.element('<div id="carousel" build-fire-carousel="></div>');
      var compiledElement = compile(element)(scope);
      scope.$digest();
      return compiledElement;
    }

    it('should call if build-fire-carousel is defined', function () {
      expect(directiveElem.find('build-fire-carousel')).toBeDefined();
    });
    it('should call if build-fire-carousel2 is defined', function () {
      expect(directiveElem.find('build-fire-carousel2')).toBeDefined();
    });
  });

  describe('View Switcher directive with PUSH call', function () {
    var $compile, $rootScope, viewSwitcher, $scope;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
    }));
    beforeEach(function () {
      var view = {
        template: ['Item'],
        params: {
          controller: "test"
        }
      };
      viewSwitcher = $compile('<div view-switcher=""></div>')($scope);
      $rootScope.$broadcast('VIEW_CHANGED', 'PUSH', view);
      //$rootScope.$digest();
    });

    it('it should pass and view switcher of div should be 1', function () {
      expect(viewSwitcher.length).toEqual(1);
    });

    it('it should be defined', function () {
      expect(viewSwitcher).toBeDefined();
    });
  });

  describe('view switcher directive with POP call', function () {
    var $compile, $rootScope, viewSwitcher, $scope;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
    }));
    beforeEach(function () {
      var view = {
        template: ['Item']
      };
      viewSwitcher = $compile('<div view-switcher=""></div>')($scope);
      $rootScope.$broadcast('VIEW_CHANGED', 'POP', view);
      //$rootScope.$digest();
    });

    it('it should pass and view switcher of div should be 1', function () {
      expect(viewSwitcher.length).toEqual(1);
    });

    it('it should be defined', function () {
      expect(viewSwitcher).toBeDefined();
    });
  });
  describe('view switcher directive with POPALL call', function () {
    var $compile, $rootScope, viewSwitcher, $scope;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
    }));
    beforeEach(function () {
      var view = {
        template: ['Item']
      };
      viewSwitcher = $compile('<div view-switcher=""></div>')($scope);
      $rootScope.$broadcast('VIEW_CHANGED', 'POPALL', view);
      $rootScope.$digest();
    });

    it('it should pass and view switcher of div should be 1', function () {
      expect(viewSwitcher.length).toEqual(1);
    });

    it('it should be defined', function () {
      expect(viewSwitcher).toBeDefined();
    });
  });

  describe('buildFireCarousel directive test', function () {
    var $compile, $rootScope, buildFireCarousel, $scope;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
    }));
    beforeEach(function () {
      buildFireCarousel = $compile('<div build-fire-carousel=""></div>')($scope);
      $rootScope.$digest();
    });

    it('it should pass and view switcher of div should be 1', function () {
      expect(buildFireCarousel.length).toEqual(1);
      buildfire.messaging.onReceivedMessage("aa")
    });
  });
  describe('buildFireCarousel2 directive test', function () {
    var $compile, $rootScope, buildFireCarousel2, $scope;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
    }));
    beforeEach(function () {
      buildFireCarousel2 = $compile('<div build-fire-carousel2=""></div>')($scope);
      $rootScope.$digest();
    });

    it('it should pass and view switcher of div should be 1', function () {
      expect(buildFireCarousel2.length).toEqual(1);
      buildfire.messaging.onReceivedMessage("aa")
    });
  });
  describe('Test the filter', function () {
    'use strict';
    var $filter;
    beforeEach(function () {
      module('seminarNotesPluginWidget');

      inject(function (_$filter_) {
        $filter = _$filter_;
      });
    });

    it('should Crop the Image', function () {
      // Arrange.
      var url = 'https://placeholdit.imgix.net/~text?txtsize=33&txt=350%C3%97150&w=350&h=150', result;
      var updatedUrl = 'http://s7obnu.cloudimage.io/s/crop/250x250/https://placeholdit.imgix.net/~text?txtsize=33&txt=350%C3%97150&w=350&h=150';
      // Act.
      result = $filter('getImageUrl')(url, '250', '250', 'no');

      // Assert.
      expect(result).toEqual(updatedUrl);
    });
    it('should Crop the Image when url', function () {
      // Arrange.
      var url = 'http://s7obnu.cloudimage.io/s/resizenp/250x250', result,
        updatedUrl = 'http://s7obnu.cloudimage.io/s/resizenp/250x250/http://s7obnu.cloudimage.io/s/resizenp/250x250';
      // Act.
      result = $filter('getImageUrl')(url, '250', '250', 'resize');

      // Assert.
      expect(result).toEqual(updatedUrl);
    });
  });

  describe('backImg directive test with background Image URL', function () {
    var $compile, $rootScope, backImg, $scope;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
    }));
    beforeEach(function () {
      backImg = $compile('<div back-img="value"></div>')($scope);
      // $rootScope.$broadcast('VIEW_CHANGED');
      $rootScope.$digest();
    });

    it('it should pass and view switcher of div should be 1', function () {
      expect(backImg.length).toEqual(1);
    });


  });
  describe('backImg directive test without background Image URL', function () {
    var $compile, $rootScope, backImg, $scope;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
    }));
    beforeEach(function () {
      backImg = $compile('<div back-img=""></div>')($scope);
      $rootScope.$digest();
    });

    it('it should pass and view switcher of div should be 1', function () {
      expect(backImg.length).toEqual(1);
    });


  });

  describe('loadImage directive test with background Image URL', function () {
    var $compile, $rootScope, backImg, $scope;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
    }));
    beforeEach(function () {
      backImg = $compile('<div load-image="value"></div>')($scope);
      $rootScope.$digest();
    });

    it('it should pass and view switcher of div should be 1', function () {
      expect(backImg.length).toEqual(1);
    });


  });

  describe('calling the buildfire.navigation.onBackButtonClick', function () {
    var ViewStack, $rootScope;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_ViewStack_, _$rootScope_) {
      ViewStack = _ViewStack_;
      $rootScope = _$rootScope_;
    }));
    var msg = {
      type: 'AddNewItem',
      id: 12345
    };
    it('it should pass when buildfire.messaging.onReceivedMessage', function () {
      buildfire.navigation.onBackButtonClick();
      $rootScope.$apply();
    });
  });

  describe('disableAnimate directive test', function () {
    var $animate, disAnimate, $scope, $rootScope,$compile;
    beforeEach(module('seminarNotesPluginWidget'));
    beforeEach(inject(function (_$animate_, _$rootScope_,_$compile_) {
      $compile = _$compile_;
      $animate = _$animate_;
      $rootScope = _$rootScope_;
      $scope = _$rootScope_.$new();
    }));

    beforeEach(function () {
      disAnimate = $compile('<div disable-animate></div>')($scope);
      $rootScope.$digest();
    });

    it('it should pass when animation is disabled for given element', function () {
      expect(disAnimate.length).toEqual(1);
    });
  });
});