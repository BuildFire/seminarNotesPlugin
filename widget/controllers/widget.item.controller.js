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
          noteTitle : "",
          noteDescription: "",
          ItemID : "",
          ItemTitle: "",
          DateAdded: ""
        };

        WidgetItem.Note = {
          noteTitle:"",
          noteDescription:""
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
              console.log(">>>>>>>>>>", WidgetItem.item);
            }
            , error = function (err) {
              console.error('Error In Fetching Event', err);
            };

          console.log(">>>>>>>>>>", currentView.params.itemId);
          if (currentView.params.itemId) {
            DataStore.getById(currentView.params.itemId, TAG_NAMES.SEMINAR_ITEMS).then(success, error);
          }
        };


        /*
         * Fetch user's data from datastore
         */
        var init = function () {
          var success = function (result) {
              WidgetItem.data = result.data;
              if (!WidgetItem.data.design)
                WidgetItem.data.design = {};
              getEventDetails();
            }
            , error = function (err) {
              console.error('Error while getting data', err);
            };
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
        };

        init();

        WidgetItem.showHideNoteList = function(){
          WidgetItem.getNoteList();
          if($scope.toggleNoteList && !$scope.toggleNoteAdd){
            $scope.toggleNoteList = 0;
          }else{
            $scope.toggleNoteList = 1;
            $scope.showNoteList = 1;
            $scope.showNoteAdd = 0;
           }

          if($scope.toggleNoteList && $scope.toggleNoteAdd){
            $scope.toggleNoteList = 0;
            $scope.toggleNoteAdd = 0
          }
          console.log("==============inTogglenotelist", $scope.toggleNoteList, $scope.toggleNoteAdd)
        };
        WidgetItem.showHideAddNote = function(){
          if($scope.toggleNoteAdd && !$scope.toggleNoteList ){
            $scope.toggleNoteAdd = 0
           }else{
            $scope.toggleNoteAdd = 1
            $scope.showNoteAdd = 1;
            $scope.showNoteList = 0;
           }
          if($scope.toggleNoteList && $scope.toggleNoteAdd){
            $scope.toggleNoteList = 0;
            $scope.toggleNoteAdd = 0
          }
          console.log("==============inTogglenoteadd", $scope.toggleNoteAdd, $scope.toggleNoteList )
        };

        WidgetItem.addNoteToItem = function(itemId){
          WidgetItem.itemNote = {
            noteTitle : WidgetItem.Note.noteTitle,
            noteDescription: WidgetItem.Note.noteDescription,
            ItemID : itemId,
            ItemTitle : WidgetItem.item.data.title,
            DateAdded : new Date()
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

        WidgetItem.getNoteList = function(){
          searchOptions.filter = {"$or": [{"$json.ItemID": {"$eq": WidgetItem.item.id}}]};
          var err = function(error){
            console.log("============ There is an error in getting data", error);
          },result = function(result){
            console.log("===========searchItem",result);
            WidgetItem.ItemNoteList = result;
          }
          UserData.search({}, TAG_NAMES.SEMINAR_NOTES).then(result, err);
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
          UserData.search(searchOptions, TAG_NAMES.SEMINAR_NOTES).then(result, err);
        }
      }]);
})(window.angular, window.buildfire, window);
