'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetSearchCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'PAGINATION',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, PAGINATION) {
        var WidgetSearch = this;

        WidgetSearch.items = [];

        WidgetSearch.searchOptions = {};

        WidgetSearch.bookmarks= [];

        var tmrDelay = null;
        /*
         * Call the datastore to save the data object
         */
        var searchData = function (newValue, tag) {
          var searchTerm = '';
          if (typeof newValue === 'undefined') {
            return;
          }
          var success = function (result) {
              console.info('Searched data result:=================== ', result);
              WidgetSearch.items = result;
              WidgetSearch.getBookmarks();
            }
            , error = function (err) {
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
          var err = function(error){
            console.log("============ There is an error in getting data", error);
          },result = function(result){
            console.log("===========search",result);
            WidgetSearch.bookmarks = result;
          };
          UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);
        };

        WidgetSearch.getBookmarks = function(){
          for (var item = 0; item<  WidgetSearch.items.length; item++){
            for (var bookmark in WidgetSearch.bookmarks)  {
              if(WidgetSearch.items[item].id==WidgetSearch.bookmarks[bookmark].data.itemIds){
                WidgetSearch.items[item].isBookmarked = true;
              }
            }
          }
          $scope.isFetchedAllData = true;
        };
        var saveDataWithDelay = function (newObj) {
          if (newObj) {
            if (tmrDelay) {
              clearTimeout(tmrDelay);
            }
            tmrDelay = setTimeout(function () {
              searchData(newObj, TAG_NAMES.SEMINAR_ITEMS);
            }, 500);
          }
        };

        $scope.$watch(function () {
          return WidgetSearch.keyword;
        }, saveDataWithDelay, true);

        WidgetSearch.clearSearchResult = function () {
          WidgetSearch.keyword = null;
          WidgetSearch.items = [];
        };

        WidgetSearch.showItemList = function (){
          ViewStack.popAllViews();
        };

        WidgetSearch.showBookmarkList = function (){
          ViewStack.push({
            template: 'bookmarks',
            params: {
              controller: "WidgetBookmarkCtrl as WidgetBookmark",
              shouldUpdateTemplate: true
            }
          });
        };

        WidgetSearch.showNotesList = function (){
          ViewStack.push({
            template: 'notes',
            params: {
              controller: "WidgetBookmarkCtrl as WidgetBookmark",
              shouldUpdateTemplate: true
            }
          });
        }

      }]);
})(window.angular, window.buildfire, window);

