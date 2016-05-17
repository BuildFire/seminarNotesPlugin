'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetSearchCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'PAGINATION',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, PAGINATION) {
        var WidgetSearch = this;

        WidgetSearch.items = [];

        WidgetSearch.searchOptions = {};

        WidgetSearch.bookmarks = [];

        var tmrDelay = null;
        /*
         * Call the datastore to save the data object
         */
        var searchData = function (newValue, tag) {
          Buildfire.spinner.show();
          var searchTerm = '';
          if (typeof newValue === 'undefined') {
            return;
          }
          var success = function (result) {
              Buildfire.spinner.hide();
              console.info('Searched data result:=================== ', result);
              WidgetSearch.items = result;
              WidgetSearch.getBookmarks();
            }
            , error = function (err) {
              Buildfire.spinner.hide();
              console.error('Error while searching data : ', err);
            };
          if (newValue) {
            newValue = newValue.trim();
            if (newValue.indexOf(' ') !== -1) {
              searchTerm = newValue.split(' ');
              WidgetSearch.searchOptions.filter = {
                "$or": [{
                  "$json.title": {
                    "$regex": searchTerm[0],
                    "$options": "i"
                  }
                }, {
                  "$json.summary": {
                    "$regex": searchTerm[0],
                    "$options": "i"
                  }
                }, {
                  "$json.title": {
                    "$regex": searchTerm[1],
                    "$options": "i"
                  }
                }, {
                  "$json.summary": {
                    "$regex": searchTerm[1],
                    "$options": "i"
                  }
                }
                ]
              };
            } else {
              searchTerm = newValue;
              WidgetSearch.searchOptions.filter = {
                "$or": [{
                  "$json.title": {
                    "$regex": searchTerm,
                    "$options": "i"
                  }
                }, {"$json.summary": {"$regex": searchTerm, "$options": "i"}}]
              };
            }
          }
          DataStore.search(WidgetSearch.searchOptions, tag).then(success, error);
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
          var err = function (error) {
            Buildfire.spinner.hide();
            console.log("============ There is an error in getting data", error);
          }, result = function (result) {
            Buildfire.spinner.hide();
            console.log("===========search", result);
            WidgetSearch.bookmarks = result;
          };
          UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);
        };

        WidgetSearch.getBookmarks = function () {
          for (var item = 0; item < WidgetSearch.items.length; item++) {
            for (var bookmark in WidgetSearch.bookmarks) {
              if (WidgetSearch.items[item].id == WidgetSearch.bookmarks[bookmark].data.itemIds) {
                WidgetSearch.items[item].isBookmarked = true;
              }
            }
          }
          $scope.isFetchedAllData = true;
        };
        var saveDataWithDelay = function (newObj) {
          console.log("******************", newObj);
          if (newObj) {
            if (tmrDelay) {
              clearTimeout(tmrDelay);
            }
            tmrDelay = setTimeout(function () {
              if (newObj)
                searchData(newObj, TAG_NAMES.SEMINAR_ITEMS);
            }, 500);
          }
          else {
            WidgetSearch.items = [];
          }
        };

        $scope.$watch(function () {
          return WidgetSearch.keyword;
        }, saveDataWithDelay, true);

        WidgetSearch.clearSearchResult = function () {
          WidgetSearch.keyword = null;
          WidgetSearch.items = [];
        };

        WidgetSearch.showItemList = function () {
          ViewStack.popAllViews();
        };

        WidgetSearch.showBookmarkList = function () {
          ViewStack.push({
            template: 'Bookmarks',
            params: {
              controller: "WidgetBookmarkCtrl as WidgetBookmark"
            }
          });
        };

        WidgetSearch.showNotesList = function () {
          ViewStack.push({
            template: 'Notes',
            params: {
              controller: "WidgetBookmarkCtrl as WidgetBookmark"
            }
          });
        };

        WidgetSearch.openDetails = function (itemId) {
          ViewStack.push({
            template: 'Item',
            params: {
              controller: "WidgetItemCtrl as WidgetItem",
              itemId: itemId
            }
          });
        };
        WidgetSearch.addToBookmark= function(itemId){
          Buildfire.spinner.show();
          WidgetSearch.bookmarkItem = {
            data:{
              itemIds: itemId
            }
          }
          var successItem = function (result) {
            Buildfire.spinner.hide();
            console.log("Inserted", result);
            $scope.isClicked = itemId;
            WidgetSearch.getBookmarks();
          }, errorItem = function () {
            Buildfire.spinner.hide();
            return console.error('There was a problem saving your data');
          };
          UserData.insert(WidgetSearch.bookmarkItem.data, TAG_NAMES.SEMINAR_BOOKMARKS).then(successItem, errorItem);
        }
      }]);
})(window.angular, window.buildfire, window);

