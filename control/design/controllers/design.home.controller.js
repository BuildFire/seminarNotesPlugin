'use strict';

(function (angular, window) {
  angular
    .module('seminarNotesPluginDesign')
    .controller('DesignHomeCtrl', ['$scope', 'Buildfire', 'LAYOUTS', 'DataStore', 'TAG_NAMES',
      function ($scope, Buildfire, LAYOUTS, DataStore, TAG_NAMES) {
        var DesignHome = this;
        var DesignHomeMaster;
        var _data = {
          design: {
            itemListLayout: "",
            itemListBgImage: ""
          },
          content: {}
        };

        DesignHome.layouts = {
          itemListLayout: [
            {name: "Item_List_1"},
            {name: "Item_List_2"},
            {name: "Item_List_3"},
            {name: "Item_List_4"},
            {name: "Item_List_5"}
          ]
        };

        /*On layout click event*/
        DesignHome.changeListLayout = function (layoutName) {
          if (layoutName && DesignHome.data.design) {
            DesignHome.data.design.itemListLayout = layoutName;
            console.log(DesignHome.data);
            saveData(function (err, data) {
                if (err) {
                  return DesignHome.data = angular.copy(DesignHomeMaster);
                }
                else if (data && data.obj) {

                  return DesignHomeMaster = data.obj;

                }
                $scope.$digest();
              }
            )
          }
        };

        /*save method*/
        var saveData = function (callback) {
          callback = callback || function () {

          };
          Buildfire.datastore.save(DesignHome.data, TAG_NAMES.SEMINAR_INFO, callback);
        };

        var init = function () {
          /* background image add </end>*/
          Buildfire.datastore.get(TAG_NAMES.SEMINAR_INFO, function (err, data) {
            if (err) {
              Console.log('------------Error in Design of People Plugin------------', err);
            }
            else if (data && data.data) {
              DesignHome.data = angular.copy(data.data);
              console.log("init Data:", DesignHome.data);
              if (!DesignHome.data.design)
                DesignHome.data.design = {};
              if (!DesignHome.data.design.itemListLayout)
                DesignHome.data.design.itemListLayout = DesignHome.layouts.itemListLayout[0].name;
              DesignHomeMaster = angular.copy(data.data);
              if (DesignHome.data.design.itemListBgImage) {
                background.loadbackground(DesignHome.data.design.itemListBgImage);
              }
              $scope.$digest();
            }
            else {
              DesignHome.data = _data;
              console.info('------------------unable to load data---------------');
            }
          });
        };

        /* background image add <start>*/
        var background = new Buildfire.components.images.thumbnail("#background", {title : "Item List Background Image"});

        background.onChange = function (url) {
          DesignHome.data.design.itemListBgImage = url;
          if (!$scope.$$phase && !$scope.$root.$$phase) {
            $scope.$apply();
          }
        };

        background.onDelete = function (url) {
          DesignHome.data.design.itemListBgImage = "";
          if (!$scope.$$phase && !$scope.$root.$$phase) {
            $scope.$apply();
          }
        };

        init();

        /*watch the change event and update in database*/
        $scope.$watch(function () {
          return DesignHome.data;
        }, function (oldObj,newObj) {

          if (oldObj != newObj && newObj) {
            console.log("Updated Object:", newObj);
            Buildfire.datastore.save(DesignHome.data, TAG_NAMES.SEMINAR_INFO, function (err, data) {
              if (err) {
                return DesignHome.data = angular.copy(DesignHomeMaster);
              }
              else if (data && data.obj) {
                return DesignHomeMaster = data.obj;

              }
              $scope.$digest();
            });
          }
        }, true);

      }]);
})(window.angular);
