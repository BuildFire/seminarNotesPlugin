describe('Unit: seminarNotesPluginDesign content app', function () {
  describe('Unit: app routes', function () {
    beforeEach(module('seminarNotesPluginDesign'));
    var location, route, rootScope;
    beforeEach(inject(function (_$location_, _$route_, _$rootScope_) {
      location = _$location_;
      route = _$route_;
      rootScope = _$rootScope_;
    }));

    describe('Home route', function () {
      beforeEach(inject(
        function ($httpBackend) {
          $httpBackend.expectGET('templates/home.html')
            .respond(200);
          $httpBackend.expectGET('/')
            .respond(200);
        }));

      it('should load the home page on successful load of location path /', function () {
        location.path('/');
        rootScope.$digest();
        expect(route.current.controller).toBe('DesignHomeCtrl')
      });
    });
  });
});