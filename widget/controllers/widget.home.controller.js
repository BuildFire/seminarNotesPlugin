'use strict';

(function (angular, buildfire) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetHomeCtrl', ['$scope', 'TAG_NAMES', 'LAYOUTS', 'DataStore', 'PAGINATION', 'Buildfire', 'Location', '$rootScope', 'ViewStack', '$sce', 'UserData', 'SORT', '$modal',
      function ($scope, TAG_NAMES, LAYOUTS, DataStore, PAGINATION, Buildfire, Location, $rootScope, ViewStack, $sce, UserData, SORT, $modal) {
        var WidgetHome = this;
        var currentListLayout, currentSortOrder = null;
        $rootScope.deviceHeight = window.innerHeight;
        $rootScope.deviceWidth = window.innerWidth;
        WidgetHome.busy = false;
        WidgetHome.items = [];
        $scope.isClicked = false;
        WidgetHome.bookmarkItem = [];
        WidgetHome.bookmarks = {};
        $scope.isFetchedAllData = false;
        var searchOptions = {
          skip: 0,
          limit: PAGINATION.itemCount
        };

        /**
         * WidgetHome.sortingOptions are used to show options in Sort Items drop-down menu in home.html.
         */
        WidgetHome.sortingOptions = [
          SORT.MANUALLY,
          SORT.ITEM_TITLE_A_Z,
          SORT.ITEM_TITLE_Z_A,
          SORT.NEWEST_PUBLICATION_DATE,
          SORT.OLDEST_PUBLICATION_DATE,
          SORT.NEWEST_FIRST,
          SORT.OLDEST_FIRST
        ];

        /**
         * getSearchOptions(value) is used to get searchOptions with one more key sort which decide the order of sorting.
         */
        var getSearchOptions = function (value) {
          switch (value) {
            case SORT.ITEM_TITLE_A_Z:
              searchOptions.sort = {"title": 1};
              break;
            case SORT.ITEM_TITLE_Z_A:
              searchOptions.sort = {"title": -1};
              break;
            case SORT.NEWEST_PUBLICATION_DATE:
              searchOptions.sort = {"publishedOn": 1};
              break;
            case SORT.OLDEST_PUBLICATION_DATE:
              searchOptions.sort = {"publishedOn": -1};
              break;
            case SORT.NEWEST_FIRST:
              searchOptions.sort = {"dateCreated": -1};
              break;
            case SORT.OLDEST_FIRST:
              searchOptions.sort = {"dateCreated": 1};
              break;
            default :
              searchOptions.sort = {"rank": 1};
              break;
          }
          return searchOptions;
        };

        WidgetHome.data = {
          design: {
            itemListLayout: LAYOUTS.itemListLayout[0].name
          }
        };
        WidgetHome.init = function () {
          var success = function (result) {
              if (result && result.data) {
                WidgetHome.data = result.data;
              }
              else {
                WidgetHome.data = {
                  design: {
                    itemListLayout: LAYOUTS.itemListLayout[0].name
                  }
                };
              }
              if (WidgetHome.data && !WidgetHome.data.design) {
                WidgetHome.data.design = {
                  itemListLayout: LAYOUTS.itemListLayout[0].name
                };
              }
              currentListLayout = WidgetHome.data.design.itemListLayout;
              if (!WidgetHome.data.design)
                WidgetHome.data.design = {};
              if (!WidgetHome.data.design.itemListLayout) {
                WidgetHome.data.design.itemListLayout = LAYOUTS.itemListLayout[0].name;
              }
              if (!WidgetHome.data.content)
                WidgetHome.data.content = {};
              if (WidgetHome.data.content.sortBy) {
                currentSortOrder = WidgetHome.data.content.sortBy;
              }
              console.log("==============", WidgetHome.data.design.itemListLayout)
            }
            , error = function (err) {
              WidgetHome.data = {design: {itemListLayout: LAYOUTS.itemListLayout[0].name}};
              console.error('Error while getting data', err);
            };
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
        };

        WidgetHome.getBookMarkData = function () {
          var err = function (error) {
            console.log("============ There is an error in getting data", error);
          }, result = function (result) {
            console.log("===========Bookmarks", result);
            WidgetHome.bookmarks = result;
          };
          UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);
        };

        WidgetHome.setBookmarks = function () {
          for (var item = 0; item < WidgetHome.items.length; item++) {
            for (var bookmark in WidgetHome.bookmarks) {
              if (WidgetHome.items[item].id == WidgetHome.bookmarks[bookmark].data.itemIds) {
                WidgetHome.items[item].isBookmarked = true;
              }
            }
          }
          $scope.isFetchedAllData = true;
        };
        WidgetHome.init();

        WidgetHome.safeHtml = function (html) {
          if (html) {
            var $html = $('<div />', {html: html});
            $html.find('iframe').each(function (index, element) {
              var src = element.src;
              console.log('element is: ', src, src.indexOf('http'));
              src = src && src.indexOf('file://') != -1 ? src.replace('file://', 'http://') : src;
              element.src = src && src.indexOf('http') != -1 ? src : 'http:' + src;
            });
            return $sce.trustAsHtml($html.html());
          }
        };

        /**
         * This event listener is bound for "Carousel:LOADED" event broadcast
         */
        $rootScope.$on("Carousel:LOADED", function () {
          WidgetHome.view = null;
          if (!WidgetHome.view) {
            WidgetHome.view = new Buildfire.components.carousel.view("#carousel", []);
          }
          if (WidgetHome.data.content && WidgetHome.data.content.carouselImages) {
            WidgetHome.view.loadItems(WidgetHome.data.content.carouselImages);
          } else {
            WidgetHome.view.loadItems([]);
          }
        });
        WidgetHome.showBookmarkItems = function () {
          if (WidgetHome.currentLoggedInUser) {
            ViewStack.push({
              template: 'Bookmarks',
              params: {
                controller: "WidgetBookmarkCtrl as WidgetBookmark"
              }
            });
          } else {
            WidgetHome.openLogin();
          }
        };

        WidgetHome.showItemNotes = function () {
          if (WidgetHome.currentLoggedInUser) {
            ViewStack.push({
              template: 'Notes',
              params: {
                controller: "WidgetNotesCtrl as WidgetNotes"
              }
            });
          }
          else {
            WidgetHome.openLogin();
          }
        };
        var onUpdateCallback = function (event) {
          console.log(event);
          setTimeout(function () {
            $scope.$digest();
            if (event && event.tag === TAG_NAMES.SEMINAR_INFO) {
              WidgetHome.data = event.data;
              if (!WidgetHome.data.design)
                WidgetHome.data.design = {};
              if (!WidgetHome.data.content)
                WidgetHome.data.content = {};
              if (event.data.content.sortBy && currentSortOrder != event.data.content.sortBy) {
                WidgetHome.data.content.sortBy = event.data.content.sortBy;
                WidgetHome.items = [];
                searchOptions.skip = 0;
                WidgetHome.busy = false;
                WidgetHome.loadMore();
              }
            }
            else if (event && event.tag === TAG_NAMES.SEMINAR_ITEMS) {
              console.log("============items", event);
            }

            if (!WidgetHome.data.design.itemListLayout) {
              WidgetHome.data.design.itemListLayout = LAYOUTS.itemListLayout[0].name;
            }
            if (currentListLayout != WidgetHome.data.design.itemListLayout && WidgetHome.view && WidgetHome.data.content.carouselImages) {
              WidgetHome.view._destroySlider();
              WidgetHome.view = null;
              console.log("==========1")
            }
            else {
              if (WidgetHome.view) {
                WidgetHome.view.loadItems(WidgetHome.data.content.carouselImages);
                console.log("==========2")
              }
            }
            currentListLayout = WidgetHome.data.design.itemListLayout;
            $scope.$digest();
            $rootScope.$digest();
          }, 0);
        };
        DataStore.onUpdate().then(null, null, onUpdateCallback);

        WidgetHome.loadMore = function () {
          console.log("===============In loadmore");
          if (WidgetHome.busy) return;
          WidgetHome.busy = true;
          WidgetHome.getItems();
        };

        WidgetHome.getItems = function () {
          var successAll = function (resultAll) {
              WidgetHome.items = WidgetHome.items.length ? WidgetHome.items.concat(resultAll) : resultAll;
              searchOptions.skip = searchOptions.skip + PAGINATION.itemCount;
              if (resultAll.length == PAGINATION.itemCount) {
                WidgetHome.busy = false;
              }
              WidgetHome.setBookmarks();
            },
            errorAll = function (error) {
              console.log("error", error)
            };
          console.log("***********", WidgetHome.data.content);
          if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.sortBy) {
            searchOptions = getSearchOptions(WidgetHome.data.content.sortBy);
          }
          DataStore.search(searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
        };

        WidgetHome.openDetails = function (itemId) {
          ViewStack.push({
            template: 'Item',
            params: {
              controller: "WidgetItemCtrl as WidgetItem",
              itemId: itemId
            }
          });
        };

        WidgetHome.currentLoggedInUser = null;

        /**
         * Method to open buildfire auth login pop up and allow user to login using credentials.
         */
        WidgetHome.openLogin = function () {
          buildfire.auth.login({}, function () {

          });
        };

        var loginCallback = function () {
          buildfire.auth.getCurrentUser(function (err, user) {
            console.log("=========User", user);
            if (user) {
              WidgetHome.currentLoggedInUser = user;
              $scope.$apply();
              WidgetHome.getBookMarkData();
            }
          });
        };

        buildfire.auth.onLogin(loginCallback);

        /**
         * Check for current logged in user, if not show ogin screen
         */
        buildfire.auth.getCurrentUser(function (err, user) {
          console.log("===========LoggedInUser", user);
          if (user) {
            WidgetHome.currentLoggedInUser = user;
            $scope.$apply();
            WidgetHome.getBookMarkData();
          }
        });

        WidgetHome.addToBookmark = function (itemId) {
          WidgetHome.bookmarkItem = {
            data: {
              itemIds: itemId
            }
          };
          var successItem = function (result) {
            console.log("Inserted", result);
            $scope.isClicked = itemId;
            WidgetHome.setBookmarks();
            $modal.open({
              templateUrl: 'templates/Bookmark_Confirm.html',
              size: 'sm'
            });
          }, errorItem = function () {
            return console.error('There was a problem saving your data');
          };
          console.log("===============", WidgetHome.currentLoggedInUser.username);
          UserData.insert(WidgetHome.bookmarkItem.data, TAG_NAMES.SEMINAR_BOOKMARKS).then(successItem, errorItem);
        };

        WidgetHome.showSearchPage = function () {
          if (WidgetHome.currentLoggedInUser) {
            ViewStack.push({
              template: 'Search',
              params: {
                controller: "WidgetSearchCtrl as WidgetSearch"
              }
            });
          } else {
            WidgetHome.openLogin();
          }
        };

        WidgetHome.showDescription = function (description) {
          return !((description == '<p>&nbsp;<br></p>') || (description == '<p><br data-mce-bogus="1"></p>') || (description == ''));
        };
      }])
})(window.angular, window.buildfire);
