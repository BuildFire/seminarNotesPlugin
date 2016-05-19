'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetBookmarkCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'PAGINATION',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, PAGINATION) {
        var WidgetBookmark = this;
        WidgetBookmark.busy = false;
        WidgetBookmark.items = [];
        $scope.isClicked = false;
        WidgetBookmark.bookmarkItem = [];
        WidgetBookmark.bookmarks = {};
        $scope.isFetchedAllData = false;
        var searchOptions = {
          skip: 0,
          limit: PAGINATION.itemCount
        };
        WidgetBookmark.data = {
          design: {
            itemListLayout: LAYOUTS.itemListLayout[0].name
          }
        };
        WidgetBookmark.init = function () {
          Buildfire.spinner.show();
          var success = function (result) {
              Buildfire.spinner.hide();

              if (result && result.data) {
                WidgetBookmark.data = result.data;
              }

            }
            , error = function (err) {
              Buildfire.spinner.hide();
              console.error('Error while getting data', err);
            };
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
          var err = function (error) {
            Buildfire.spinner.hide();
            console.log("============ There is an error in getting data", error);
          }, result = function (result) {
            Buildfire.spinner.hide();
            console.log("===========search", result);
            WidgetBookmark.bookmarks = result;
          };
          UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);

        };

        WidgetBookmark.getItems = function () {
          Buildfire.spinner.show();
          var successAll = function (resultAll) {
              Buildfire.spinner.hide();
              WidgetBookmark.items = WidgetBookmark.items.length ? WidgetBookmark.items.concat(resultAll) : resultAll;
              console.log("==============", WidgetBookmark.items);
              searchOptions.skip = searchOptions.skip + PAGINATION.itemCount;
              if (resultAll.length == PAGINATION.itemCount) {
                WidgetBookmark.busy = false;
              }
              WidgetBookmark.getBookmarks();
            },
            errorAll = function (error) {
              Buildfire.spinner.hide();
              console.log("error", error)
            };
          DataStore.search(searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
        };

        WidgetBookmark.getBookmarks = function () {
          for (var item = 0; item < WidgetBookmark.items.length; item++) {
            for (var bookmark in WidgetBookmark.bookmarks) {
              if (WidgetBookmark.items[item].id == WidgetBookmark.bookmarks[bookmark].data.itemIds) {
                WidgetBookmark.items[item].isBookmarked = true;
              }
            }
          }
          $scope.isFetchedAllData = true;
        };
        WidgetBookmark.init();

        WidgetBookmark.openDetails = function (itemId) {
          ViewStack.push({
            template: 'Item',
            params: {
              controller: "WidgetItemCtrl as WidgetItem",
              itemId: itemId
            }
          });
        };
        WidgetBookmark.showItemNotes = function () {
          ViewStack.push({
            template: 'Notes',
            params: {
              controller: "WidgetNotesCtrl as WidgetNotes"
            }
          });
        };

        WidgetBookmark.showSearchPage = function () {
          ViewStack.push({
            template: 'Search',
            params: {
              controller: "WidgetSearchCtrl as WidgetSearch"
            }
          });
        };

        WidgetBookmark.goToItem = function () {
          ViewStack.popAllViews()
        };
        WidgetBookmark.loadMore = function () {
          console.log("===============In loadmore Bookmark");
          if (WidgetBookmark.busy) return;
          WidgetBookmark.busy = true;
          WidgetBookmark.getItems();
        };
      }]);
})(window.angular, window.buildfire, window);

