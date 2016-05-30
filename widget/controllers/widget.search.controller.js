'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetSearchCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'PAGINATION', '$modal', '$timeout',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, PAGINATION, $modal, $timeout) {
        var WidgetSearch = this;

        WidgetSearch.items = [];

        WidgetSearch.searchOptions = {};

        WidgetSearch.bookmarks = [];

        WidgetSearch.currentLoggedInUser = null;

        var tmrDelay = null;

        /**
         * Method to open buildfire auth login pop up and allow user to login using credentials.
         */
        WidgetSearch.openLogin = function () {
          buildfire.auth.login({}, function () {

          });
        };

        var loginCallback = function () {
          buildfire.auth.getCurrentUser(function (err, user) {
            console.log("=========User", user);
            if (user) {
              WidgetSearch.currentLoggedInUser = user;
              $scope.$apply();
             // WidgetSearch.getBookMarkData(true);
            }
          });
        };

        buildfire.auth.onLogin(loginCallback);

        var logoutCallback = function () {
          WidgetSearch.currentLoggedInUser = null;
          $scope.$apply();
        };

        buildfire.auth.onLogout(logoutCallback);

        /**
         * Check for current logged in user, if not show ogin screen
         */
        buildfire.auth.getCurrentUser(function (err, user) {
          console.log("===========LoggedInUser", user);
          if (user) {
            WidgetSearch.currentLoggedInUser = user;
            $scope.$apply();
            //WidgetSearch.getBookMarkData();
          }
        });

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
              if (WidgetSearch.items[item].id == WidgetSearch.bookmarks[bookmark].data.itemId) {
                WidgetSearch.items[item].isBookmarked = true;
                WidgetSearch.items[item].bookmarkId = WidgetSearch.bookmarks[bookmark].id;
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

        WidgetSearch.addToBookmark = function (itemId, isBookmarked, index, item) {
          console.log("$$$$$$$$$$$$$$$$$111", item.isBookmarked);
          Buildfire.spinner.show();
          if (isBookmarked && item.bookmarkId) {
            var successRemove = function (result) {
              Buildfire.spinner.hide();
              WidgetSearch.items[index].isBookmarked = false;
              WidgetSearch.items[index].bookmarkId = null;
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
            UserData.delete(item.bookmarkId, TAG_NAMES.SEMINAR_BOOKMARKS, WidgetSearch.currentLoggedInUser._id).then(successRemove, errorRemove)
          } else {
            Buildfire.spinner.show();
            WidgetSearch.bookmarkItem = {
              data: {
                itemId: itemId
              }
            };
            var successItem = function (result) {
              Buildfire.spinner.hide();
              WidgetSearch.items[index].isBookmarked = true;
              WidgetSearch.items[index].bookmarkId = result.id;
              console.log("Inserted", result);
              $scope.isClicked = itemId;
           //   WidgetSearch.getBookmarks();
              if (!$scope.$$phase)
                $scope.$digest();
              var addedBookmarkModal = $modal.open({
                templateUrl: 'templates/Bookmark_Confirm.html',
                size: 'sm',
                backdropClass: "ng-hide"
              });
              $timeout(function () {
                addedBookmarkModal.close();
              }, 3000);

              $rootScope.$broadcast("ITEM_BOOKMARKED");
            }, errorItem = function () {
              Buildfire.spinner.hide();
              return console.error('There was a problem saving your data');
            };
            UserData.insert(WidgetSearch.bookmarkItem.data, TAG_NAMES.SEMINAR_BOOKMARKS, WidgetSearch.currentLoggedInUser._id).then(successItem, errorItem);
          }
        };
      }]);
})(window.angular, window.buildfire, window);

