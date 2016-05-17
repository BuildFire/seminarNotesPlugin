describe('Unit : Seminar Notes Plugin content.RemovePopupCtrl.controller.js', function () {
  var RemovePopup, scope, $rootScope, $controller, modalInstance;
  beforeEach(module('seminarNotesPluginContent'));
  var editor;
  beforeEach(inject(function (_$rootScope_, _$controller_) {
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    $controller = _$controller_;
    modalInstance = {                    // Create a mock object using spies
      close: jasmine.createSpy('modalInstance.close'),
      dismiss: jasmine.createSpy('modalInstance.dismiss'),
      result: {
        then: jasmine.createSpy('modalInstance.result.then')
      }
    };
  }));

  beforeEach(function () {
    RemovePopup = $controller('RemovePopupCtrl', {
      $scope: scope,
      itemInfo: {},
      $modalInstance: modalInstance
    });
  });

  describe('It will test the defined methods', function () {
    it('it should pass if RemovePopup is defined', function () {
      expect(RemovePopup).not.toBeUndefined();
    });
    it('RemovePopup.cancel should close modalInstance', function () {
      RemovePopup.cancel();
      expect(modalInstance.dismiss).toHaveBeenCalledWith('No');
    });
    it('RemovePopup.ok should close modalInstance', function () {
      RemovePopup.ok();
      expect(modalInstance.close).toHaveBeenCalledWith('yes');
    });
  });
});
