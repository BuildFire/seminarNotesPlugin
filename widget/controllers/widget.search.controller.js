'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetSearchCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'PAGINATION', '$modal', '$timeout',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, PAGINATION, $modal, $timeout) {
        var WidgetSearch = this;

        WidgetSearch.items = [];

        WidgetSearch.released = [];

        WidgetSearch.searchOptions = {};

        WidgetSearch.bookmarks = [];

        WidgetSearch.currentLoggedInUser = null;

        WidgetSearch.languages = [];

        var tmrDelay = null;

        /**
         * Method to open buildfire auth login pop up and allow user to login using credentials.
         */
        WidgetSearch.openLogin = function () {
          if ($rootScope.data && $rootScope.data.content && $rootScope.data.content.seminarDelay && $rootScope.data.content.seminarDelay.value) {
            buildfire.auth.login({ allowCancel: false }, () => {
              if (callback) callback();
            });
          } else {
            buildfire.auth.login({}, function () {
            });
          }
        };

        Buildfire.datastore.get("languages", (err, result) => {
          if (err) return console.log(err)
          let strings = {};
          if (result.data && result.data.screenOne)
            strings = result.data.screenOne;
          else
            strings = stringsConfig.screenOne.labels;

          let languages = {};
          Object.keys(strings).forEach(e => {
            strings[e].value ? languages[e] = strings[e].value : languages[e] = strings[e].defaultValue;
          });
          WidgetSearch.languages = languages;
          $scope.$apply();
        });

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
          if ($rootScope.data && $rootScope.data.content && $rootScope.data.content.seminarDelay && $rootScope.data.content.seminarDelay.value) {
            WidgetSearch.openLogin(() => {});
          }
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
          var success = function (resultAll) {
            var released = resultAll.filter(result => {
              return !result.data.releaseDate || result.data.releaseDate < Date.now();
            });
            Buildfire.spinner.hide();
            console.info('Searched data result:=================== ', resultAll);
            WidgetSearch.items = resultAll;
            WidgetSearch.released=released;

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
                }, { "$json.summary": { "$regex": searchTerm, "$options": "i" } }]
              };
            }
          }
          DataStore.search(WidgetSearch.searchOptions, tag).then(success, error);

          var err = function (error) {
            Buildfire.spinner.hide();
            console.log("============ There is an error in getting data", error);
          }, result = function (result) {
            Buildfire.spinner.hide();
            console.log("===========search", result);
            WidgetSearch.bookmarks = result;

          };
          if (WidgetSearch.currentLoggedInUser && WidgetSearch.currentLoggedInUser._id)
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

        const seminarDelayHandler = (itemRank, callback) => {
          if (
              // If item rank is bigger the current rank and nextOpenIn has not been set, exit
              (itemRank > $rootScope.seminarLastDocument.rank &&
                  !$rootScope.seminarLastDocument.nextOpenIn) ||
              // If If item rank is bigger the current rank and the item open time has not been reached, exit
              (itemRank > $rootScope.seminarLastDocument.rank &&
                  Date.now() < $rootScope.seminarLastDocument.nextOpenIn)
          ) {
              // set navigate to false to not allow to navigate to the item
              return callback(false);
          }

          // If the item is the same rank as the current rank
          if ($rootScope.seminarLastDocument.rank === itemRank) {
            // if the next item open time have not been initialized, initialize it.
            if (!$rootScope.seminarLastDocument.nextOpenIn) {
              $rootScope.seminarLastDocument.nextOpenIn = Date.now() + ($rootScope.data.content.seminarDelay.value * 60 * 1000);
              buildfire.userData.save($rootScope.seminarLastDocument, "seminarLastDocument", false, () => {});
            }
          } 
          // If item rank is bigger than the current rank by one and it reached it's open time
          else if (($rootScope.seminarLastDocument.rank + 1) === itemRank && Date.now() >= $rootScope.seminarLastDocument.nextOpenIn) {
            // Change the current rank to the item rank
            $rootScope.seminarLastDocument.rank = itemRank; 
            // Set the time for when the next item will open
            $rootScope.seminarLastDocument.nextOpenIn = Date.now() + ($rootScope.data.content.seminarDelay.value * 60 * 1000);
            buildfire.userData.save($rootScope.seminarLastDocument, "seminarLastDocument", false, () => {});
          }
          // Set navigate to true, to allow the user to navigate to the item
          callback(true);
        }

        WidgetSearch.openDetails = function (itemId, itemRank) {
          if ($rootScope.data && $rootScope.data.content && $rootScope.data.content.seminarDelay && $rootScope.data.content.seminarDelay.value) {
            seminarDelayHandler(itemRank, navigate => {
              if (navigate) {
                buildfire.analytics.trackAction(`DOCUMENT_${itemId}_OPENED`);
                ViewStack.push({
                  template: 'Item',
                  params: {
                    controller: "WidgetItemCtrl as WidgetItem",
                    itemId: itemId
                  }
                });
              } else {
                buildfire.dialog.toast({
                  message: $rootScope.languages.seminarNotAvailable ? $rootScope.languages.seminarNotAvailable : "This seminar is not available at this time",
                  type: "danger",
                });
              }
            });
          } else {
            buildfire.analytics.trackAction(`DOCUMENT_${itemId}_OPENED`);
            ViewStack.push({
              template: 'Item',
              params: {
                controller: "WidgetItemCtrl as WidgetItem",
                itemId: itemId
              }
            });
          }
        };

        $scope.shouldLockItem = (rank) => {
          if ($rootScope.data && $rootScope.data.content && $rootScope.data.content.seminarDelay && $rootScope.data.content.seminarDelay.value) {
            if (rank <= $rootScope.seminarLastDocument.rank) {
              return ''
            } else if ((rank === ($rootScope.seminarLastDocument.rank + 1)) && $rootScope.seminarLastDocument.nextOpenIn && $rootScope.seminarLastDocument.nextOpenIn <= Date.now()) {
              return ''
            }
            return $rootScope.data.content.lockedClass;
          } else return '';
        }

        WidgetSearch.addToBookmark = function (itemId, isBookmarked, index, item) {
          console.log("$$$$$$$$$$$$$$$$$111", item.isBookmarked);
          Buildfire.spinner.show();
          if (isBookmarked && item.bookmarkId) {
            var successRemove = function (result) {
              Buildfire.spinner.hide();
              WidgetSearch.released[index].isBookmarked = false;
              WidgetSearch.released[index].bookmarkId = null;
              if (!$scope.$$phase)
                $scope.$digest();
              $scope.text = WidgetSearch.languages.itemRemovedFromBookmarks;
              var removeBookmarkModal = $modal.open({
                templateUrl: 'templates/Bookmark_Removed.html',
                size: 'sm',
                backdropClass: "ng-hide",
                scope: $scope
              });
              $timeout(function () {
                removeBookmarkModal.close();
              }, 3000);

            }, errorRemove = function () {
              Buildfire.spinner.hide();
              return console.error('There was a problem removing your data');
            };

            if (WidgetSearch.currentLoggedInUser && WidgetSearch.currentLoggedInUser._id)
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
              WidgetSearch.released[index].isBookmarked = true;
              WidgetSearch.released[index].bookmarkId = result.id;
              console.log("Inserted", result);
              $scope.isClicked = itemId;
              if (!$scope.$$phase)
                $scope.$digest();
              $scope.text = WidgetSearch.languages.itemBookmarked;
              var addedBookmarkModal = $modal.open({
                templateUrl: 'templates/Bookmark_Confirm.html',
                size: 'sm',
                backdropClass: "ng-hide",
                scope: $scope
              });
              $timeout(function () {
                addedBookmarkModal.close();
              }, 3000);

              $rootScope.$broadcast("ITEM_BOOKMARKED");
            }, errorItem = function () {
              Buildfire.spinner.hide();
              return console.error('There was a problem saving your data');
            };
            if (WidgetSearch.currentLoggedInUser && WidgetSearch.currentLoggedInUser._id)
              UserData.insert(WidgetSearch.bookmarkItem.data, TAG_NAMES.SEMINAR_BOOKMARKS, WidgetSearch.currentLoggedInUser._id).then(successItem, errorItem);
          }
        };
      }]);
})(window.angular, window.buildfire, window);

