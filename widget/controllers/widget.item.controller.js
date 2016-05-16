'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetItemCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData) {
        var WidgetItem = this;
        $scope.toggleNoteList = 0;
        $scope.toggleNoteAdd = 0;
        $scope.showNoteList = 1;
        $scope.showNoteAdd = 1;
        WidgetItem.swiped = [];
        var searchOptions = {};
        WidgetItem.itemNote = {
          noteTitle: "",
          noteDescription: "",
          itemID: "",
          itemTitle: "",
          dateAdded: ""
        };
        WidgetItem.currentLoggedInUser = null;
        WidgetItem.Note = {
          noteTitle: "",
          noteDescription: ""
        };
        WidgetItem.ItemNoteList = {};

        WidgetItem.swipeToDeleteNote = function (e, i, toggle) {
          console.log("=============i Am in swipe")
          toggle ? WidgetItem.swiped[i] = true : WidgetItem.swiped[i] = false;
        };
        var currentView = ViewStack.getCurrentView();

        WidgetItem.safeHtml = function (html) {
          if (html) {
            return $sce.trustAsHtml(html);
          }
        };

        var getEventDetails = function () {
          var success = function (result) {
              WidgetItem.item = result;
              console.log("========ingeteventdetails", WidgetItem.item);
            }
            , error = function (err) {
              console.error('Error In Fetching Event', err);
            };

          console.log(">>>>>>>>>>", currentView.params.itemId);
          if (currentView.params.itemId) {
            DataStore.getById(currentView.params.itemId, TAG_NAMES.SEMINAR_ITEMS).then(success, error);
          }
        };

        /**
         * Check for current logged in user, if not show ogin screen
         */
        buildfire.auth.getCurrentUser(function (err, user) {
          console.log("===========LoggedInUser", user);
          if (user) {
            WidgetItem.currentLoggedInUser = user;
          }
        });

        /**
         * Method to open buildfire auth login pop up and allow user to login using credentials.
         */
        WidgetItem.openLogin = function () {
          buildfire.auth.login({}, function () {

          });
        };

        var loginCallback = function () {
          buildfire.auth.getCurrentUser(function (err, user) {
            console.log("=========User", user);
            if (user) {
              WidgetItem.currentLoggedInUser = user;
              $scope.$apply();
            }
          });
        };

        buildfire.auth.onLogin(loginCallback);

        /*
         * Fetch user's data from datastore
         */
        var init = function () {
          var success = function (result) {
              WidgetItem.data = result.data;
              if (!WidgetItem.data.design)
                WidgetItem.data.design = {};
              getEventDetails();
                WidgetItem.getBookmarkedItems();
            }
            , error = function (err) {
              console.error('Error while getting data', err);
            };
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
        };

        init();

        WidgetItem.showHideNoteList = function () {
          if (WidgetItem.currentLoggedInUser) {
            WidgetItem.getNoteList();
            if ($scope.toggleNoteList && !$scope.toggleNoteAdd) {
              $scope.toggleNoteList = 0;
            } else {
              $scope.toggleNoteList = 1;
              $scope.showNoteList = 1;
              $scope.showNoteAdd = 0;
            }
            if ($scope.toggleNoteList && $scope.toggleNoteAdd) {
              $scope.toggleNoteList = 0;
              $scope.toggleNoteAdd = 0
            }
          }
          else{
            WidgetItem.openLogin();
          }
        };
        WidgetItem.showHideAddNote = function () {
          if (WidgetItem.currentLoggedInUser) {
            if ($scope.toggleNoteAdd && !$scope.toggleNoteList) {
              $scope.toggleNoteAdd = 0
            } else {
              $scope.toggleNoteAdd = 1;
              $scope.showNoteAdd = 1;
              $scope.showNoteList = 0;
            }
            if ($scope.toggleNoteList && $scope.toggleNoteAdd) {
              $scope.toggleNoteList = 0;
              $scope.toggleNoteAdd = 0
            }
          }else{
            WidgetItem.openLogin();
          }

        };

        WidgetItem.addNoteToItem = function (itemId) {
          WidgetItem.itemNote = {
            noteTitle: WidgetItem.Note.noteTitle,
            noteDescription: WidgetItem.Note.noteDescription,
            itemID: itemId,
            itemTitle: WidgetItem.item.data.title,
            dateAdded: new Date()
          };
          var successItem = function (result) {
            console.log("Inserted Item Note", result);
            $scope.isClicked = itemId;
            $scope.toggleNoteAdd = 0;
          }, errorItem = function () {
            return console.error('There was a problem saving your data');
          };
          UserData.insert(WidgetItem.itemNote, TAG_NAMES.SEMINAR_NOTES).then(successItem, errorItem);
        };

        /**
         * This event listener is bound for "Carousel:LOADED" event broadcast
         */
        $rootScope.$on("Carousel2:LOADED", function () {
          //  WidgetItem.view = null;
          if (!WidgetItem.view) {
            WidgetItem.view = new Buildfire.components.carousel.view("#carousel2", []);
          }
          if (WidgetItem.item.data && WidgetItem.item.data.carouselImages) {
            WidgetItem.view.loadItems(WidgetItem.item.data.carouselImages);
          } else {
            WidgetItem.view.loadItems([]);
          }
        });

        WidgetItem.getNoteList = function () {
          console.log("============itemIDDDD", WidgetItem.item.id)
          searchOptions.filter = {"$or": [{"$json.itemID": {"$eq": WidgetItem.item.id}}]};
          var err = function (error) {
            console.log("============ There is an error in getting data", error);
          }, result = function (result) {
            console.log("===========searchItem", result);
            WidgetItem.ItemNoteList = result;
          }
          UserData.search(searchOptions, TAG_NAMES.SEMINAR_NOTES).then(result, err);
        };

        WidgetItem.openLinks = function (actionItems) {
          if (actionItems && actionItems.length) {
            var options = {};
            var callback = function (error, result) {
              if (error) {
                console.error('Error:', error);
              }
            };
            buildfire.actionItems.list(actionItems, options, callback);
          }
        };

        WidgetItem.getBookmarkedItems = function () {
          var err = function(error){
            console.log("============ There is an error in getting data", error);
          },result = function(result){
            console.log("===========searchinItem",result);
            WidgetItem.bookmarks = result;
            WidgetItem.getBookmarks();
          };
          UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);
        };

        WidgetItem.addToBookmark = function(itemId){
          WidgetItem.bookmarkItem = {
            data:{
              itemIds: itemId
            }
          }
          var successItem = function (result) {
            console.log("Inserted", result);
            $scope.isClicked = itemId;
            WidgetItem.getBookmarks();
          }, errorItem = function () {
            return console.error('There was a problem saving your data');
          };
          UserData.insert(WidgetItem.bookmarkItem.data, TAG_NAMES.SEMINAR_BOOKMARKS).then(successItem, errorItem);
        };
        WidgetItem.getBookmarks = function(){
            for (var bookmark in WidgetItem.bookmarks)  {
              if(WidgetItem.bookmarks[bookmark].data.itemIds==WidgetItem.item.id){
                WidgetItem.item.isBookmarked = true;
              }
           }
          console.log("============initemGetBookmarks", WidgetItem.item)
          $scope.isFetchedAllData = true;
        };

      }]);
})(window.angular, window.buildfire, window);
