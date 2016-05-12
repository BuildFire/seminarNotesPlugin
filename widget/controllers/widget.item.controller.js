'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetItemCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack) {
        var WidgetItem = this;
        $scope.toggle = 1;
        var currentView = ViewStack.getCurrentView();

        WidgetItem.safeHtml = function (html) {
          if (html) {
            return $sce.trustAsHtml(html);
          }
        };

        var getEventDetails = function () {
          var success = function (result) {
              WidgetItem.item = result;
              console.log(">>>>>>>>>>", WidgetItem.item);
            }
            , error = function (err) {
              console.error('Error In Fetching Event', err);
            };

          console.log(">>>>>>>>>>", currentView.params.itemId);
          if (currentView.params.itemId) {
            DataStore.getById(currentView.params.itemId, TAG_NAMES.SEMINAR_ITEMS).then(success, error);
          }
        };


        /*
         * Fetch user's data from datastore
         */
        var init = function () {
          var success = function (result) {
              WidgetItem.data = result.data;
              if (!WidgetItem.data.design)
                WidgetItem.data.design = {};
              getEventDetails();
            }
            , error = function (err) {
              console.error('Error while getting data', err);
            };
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
        };

        init();

        WidgetItem.showHideMenu = function(){

          if($scope.toggle){
            $scope.toggle = 0
          }else{
            $scope.toggle = 1
          }
        }

      }]);
})(window.angular, window.buildfire, window);
