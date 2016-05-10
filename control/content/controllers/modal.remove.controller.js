'use strict';

(function (angular) {
  angular
    .module('seminarNotesPluginContent')
    .controller('RemovePopupCtrl', ['$scope', '$modalInstance', 'itemInfo', function ($scope, $modalInstance, itemInfo) {
      var RemovePopup = this;
      if (itemInfo) {
        RemovePopup.itemInfo = itemInfo;
      }
      RemovePopup.ok = function () {
        $modalInstance.close('yes');
      };
      RemovePopup.cancel = function () {
        $modalInstance.dismiss('No');
      };
    }])
})(window.angular);
