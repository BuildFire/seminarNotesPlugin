'use strict';

(function (angular, buildfire) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetHomeCtrl', ['$scope', 'TAG_NAMES', 'LAYOUTS', 'DataStore', 'PAGINATION', 'Buildfire', 'Location', '$rootScope', 'ViewStack', '$sce', 'UserData',
      function ($scope, TAG_NAMES, LAYOUTS, DataStore, PAGINATION, Buildfire, Location, $rootScope, ViewStack, $sce, UserData) {
        var WidgetHome = this;
        var currentListLayout = null;
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
              console.log("==============", WidgetHome.data.design.itemListLayout)
            }
            , error = function (err) {
              WidgetHome.data = {design: {itemListLayout: LAYOUTS.itemListLayout[0].name}};
              console.error('Error while getting data', err);
            };
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
          var err = function(error){
            console.log("============ There is an error in getting data", error);
          },result = function(result){
            console.log("===========search",result);
            WidgetHome.bookmarks = result;
          }
          UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);

        };
        WidgetHome.getBookmarks = function(){
          for (var item = 0; item<  WidgetHome.items.length; item++){
            for (var bookmark in WidgetHome.bookmarks)  {
               if(WidgetHome.items[item].id==WidgetHome.bookmarks[bookmark].data.itemIds){
                WidgetHome.items[item].isBookmarked = true;
              }
            };
          }
          $scope.isFetchedAllData = true;
        }
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
        WidgetHome.Items = function () {
          ViewStack.push({
            template: 'bookmarks',
            params: {
              controller: "WidgetBookmarkCtrl as WidgetBookmark",
              shouldUpdateTemplate: true
            }
          });
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
            }
            else if (event && event.tag === TAG_NAMES.SEMINAR_ITEMS) {
              console.log("============items", event);
              //WidgetHome.items.push(event.data);
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
              console.log("==============", WidgetHome.items)
              searchOptions.skip = searchOptions.skip + PAGINATION.itemCount;
              if (resultAll.length == PAGINATION.itemCount) {
                WidgetHome.busy = false;
              }
                WidgetHome.getBookmarks();
            },
            errorAll = function (error) {
              console.log("error", error)
            };
          DataStore.search(searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
        };

        WidgetHome.openDetails = function (itemId) {
          ViewStack.push({
            template: 'item_detail',
            params: {
              controller: "WidgetItemCtrl as WidgetItem",
              shouldUpdateTemplate: true,
              itemId : itemId
            }
          });
        }

        WidgetHome.currentLoggedInUser = null;

        /**
         * Method to open buildfire auth login pop up and allow user to login using credentials.
         */
        WidgetHome.openLogin = function () {
          buildfire.auth.login({}, function () {

          });

          $scope.$apply();
        };

        var loginCallback = function () {
          buildfire.auth.getCurrentUser(function (err, user) {
            console.log("=========User", user);

            $scope.$digest();
            if (user) {
              WidgetHome.currentLoggedInUser = user;
              $scope.$apply();
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
          }
          else
            WidgetHome.openLogin();
        });




        WidgetHome.addToBookmark = function(itemId){
          WidgetHome.bookmarkItem = {
            data:{
              itemIds: itemId
            }
          }
          var successItem = function (result) {
            console.log("Inserted", result);
            $scope.isClicked = true;
            WidgetHome.getBookmarks();
          }, errorItem = function () {
            return console.error('There was a problem saving your data');
          };
          console.log("===============",WidgetHome.currentLoggedInUser.username)
          UserData.insert(WidgetHome.bookmarkItem.data, TAG_NAMES.SEMINAR_BOOKMARKS).then(successItem, errorItem);
        }


      }])
})(window.angular, window.buildfire);
