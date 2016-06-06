'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetBookmarkCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'PAGINATION', '$modal', '$timeout',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, PAGINATION, $modal, $timeout) {
        var WidgetBookmark = this;
        WidgetBookmark.busy = false;
        WidgetBookmark.items = [];
        $scope.isClicked = false;
        WidgetBookmark.bookmarkItem = [];
        WidgetBookmark.bookmarks = {};
        WidgetBookmark.currentLoggedInUser = null;
        WidgetBookmark.listeners = {};
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
        WidgetBookmark.hasAtleastOneBookmark = false;


        //Refresh list of bookmarks on pulling the tile bar

        buildfire.datastore.onRefresh(function () {
          WidgetBookmark.items = [];
          searchOptions.skip = 0;
          WidgetBookmark.busy = false;
          WidgetBookmark.loadMore();
        });

        /**
         * Check for current logged in user, if not show ogin screen
         */
        buildfire.auth.getCurrentUser(function (err, user) {
          console.log("===========LoggedInUser", user);
          if (user) {
            WidgetBookmark.currentLoggedInUser = user;
          }
        });
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
              var err = function (error) {
                Buildfire.spinner.hide();
                console.log("============ There is an error in getting data", error);
              }, result = function (result) {
                Buildfire.spinner.hide();
                console.log("===========search", result);
                WidgetBookmark.bookmarks = result;
                WidgetBookmark.getBookmarks();
              };
              UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);


            },
            errorAll = function (error) {
              Buildfire.spinner.hide();
              console.log("error", error)
            };
          DataStore.search(searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
        };

        WidgetBookmark.getBookmarks = function () {
          for (var item = 0; item < WidgetBookmark.items.length; item++) {
            WidgetBookmark.items[item].isBookmarked = false;
            for (var bookmark in WidgetBookmark.bookmarks) {
              if (WidgetBookmark.items[item].id == WidgetBookmark.bookmarks[bookmark].data.itemId) {
                WidgetBookmark.hasAtleastOneBookmark = true;
                WidgetBookmark.items[item].isBookmarked = true;
                WidgetBookmark.items[item].bookmarkId = WidgetBookmark.bookmarks[bookmark].id;
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

        WidgetBookmark.removeBookmark = function (item, index) {
          Buildfire.spinner.show();
          var successRemove = function (result) {
            Buildfire.spinner.hide();
            WidgetBookmark.items.splice(index, 1);
            WidgetBookmark.getBookmarks();
            if (!$scope.$$phase)
              $scope.$digest();
            var removeBookmarkModal = $modal.open({
              templateUrl: 'templates/Bookmark_Removed.html',
              size: 'sm',
              backdropClass: "ng-hide"
            });
            $timeout(function () {
              removeBookmarkModal.close();
            }, 3000);

          }, errorRemove = function () {
            Buildfire.spinner.hide();
            return console.error('There was a problem removing your data');
          };
          console.log("****************,", item.bookmarkId, TAG_NAMES.SEMINAR_BOOKMARKS, WidgetBookmark.currentLoggedInUser._id);
          UserData.delete(item.bookmarkId, TAG_NAMES.SEMINAR_BOOKMARKS, WidgetBookmark.currentLoggedInUser._id).then(successRemove, errorRemove)
        };

        $scope.$on("$destroy", function () {
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>destroyed");
          for (var i in WidgetBookmark.listeners) {
            if (WidgetBookmark.listeners.hasOwnProperty(i)) {
              WidgetBookmark.listeners[i]();
            }
          }
          DataStore.clearListener();
        });

        WidgetBookmark.listeners['CHANGED'] = $rootScope.$on('VIEW_CHANGED', function (e, type, view) {

          if (ViewStack.getCurrentView().template == 'Bookmarks') {
            //bind on refresh again

            buildfire.datastore.onRefresh(function () {
              WidgetBookmark.items = [];
              searchOptions.skip = 0;
              WidgetBookmark.busy = false;
              WidgetBookmark.loadMore();
            });
          }
        });
      }]);
})(window.angular, window.buildfire, window);

