'use strict';

(function (angular, buildfire, window) {
    angular.module('seminarNotesPluginWidget')
        .controller('WidgetNotesCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'PAGINATION',
            function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, PAGINATION) {
                var WidgetNotes = this;
                WidgetNotes.Notes = [];
                WidgetNotes.busy = false;
                var searchOptions = {
                  skip:0,
                  limit:PAGINATION.noteCount
                };
                WidgetNotes.swiped = [];
                WidgetNotes.swipeToDeleteNote = function (e, i, toggle) {

                    toggle ? WidgetNotes.swiped[i] = true : WidgetNotes.swiped[i] = false;
                };
                WidgetNotes.getNoteList = function(){
                  console.log("=============i Am in of getNoteList")
                  Buildfire.spinner.show();
                    var err = function(error){
                      Buildfire.spinner.hide();
                        console.log("============ There is an error in getting data", error);
                    },result = function(result){
                      Buildfire.spinner.hide();
                      console.log("=============i Am in of getNoteList",result)
                      WidgetNotes.Notes = WidgetNotes.Notes.length ? WidgetNotes.Notes.concat(result) : result;
                      searchOptions.skip = searchOptions.skip + PAGINATION.noteCount;
                      if (result.length == PAGINATION.noteCount) {
                        WidgetNotes.busy = false;
                      }

                    };
                    UserData.search(searchOptions, TAG_NAMES.SEMINAR_NOTES).then(result, err);
                };
               // WidgetNotes.getNoteList();
                WidgetNotes.showBookmarkItems = function () {
                    ViewStack.push({
                        template: 'Bookmarks',
                        params: {
                            controller: "WidgetBookmarkCtrl as WidgetBookmark"
                        }
                    });
                };

                WidgetNotes.showItemNotes = function () {
                    ViewStack.push({
                        template: 'Notes',
                        params: {
                            controller: "WidgetNotesCtrl as WidgetNotes"
                        }
                    });
                };

              WidgetNotes.showSearchPage = function(){
                ViewStack.push({
                  template: 'Search',
                  params: {
                    controller: "WidgetSearchCtrl as WidgetSearch"
                  }
                });
              };

              WidgetNotes.openDetails = function (itemId, noteId) {
                ViewStack.push({
                  template: 'Item',
                  params: {
                    controller: "WidgetItemCtrl as WidgetItem",
                    itemId: itemId,
                    noteId: noteId
                  }
                });
              };

                WidgetNotes.deleteNote = function(noteId, itemId){
                   console.log('================I Am in delete notes',noteId, itemId);
                    WidgetNotes.itemNote = {
                        noteTitle: "test title kmt",
                        noteDescription: "test description kmt",
                        itemID: itemId,
                        itemTitle: "I Am item title",
                        dateAdded: new Date()
                    };

                    var success = function(res){
                      console.log( '================record deleted',res);
                      WidgetNotes.Notes = [];
                      WidgetNotes.busy = false;
                      searchOptions.skip = 0;
                      WidgetNotes.loadMore();
                      },error = function(err){
                    console.log('================there was a problem deleteing your data',err);
                  }
                    UserData.delete(noteId,TAG_NAMES.SEMINAR_NOTES,WidgetNotes.currentLoggedInUser._id).then(success, error)

                    //buildfire.userData.update(noteId,WidgetNotes.itemNote, TAG_NAMES.SEMINAR_NOTES,WidgetNotes.currentLoggedInUser._id, function(err, status){
                    //    if(err)
                    //        console.log('=============there was a problem saving your data',err);
                    //    else
                    //        console.log( '================updated tel',status);
                    //})
                }


              /**
               * Check for current logged in user, if not show ogin screen
               */
              buildfire.auth.getCurrentUser(function (err, user) {
                console.log("===========LoggedInUser2", user);
                if (user) {
                  WidgetNotes.currentLoggedInUser = user;
                }
              });

              /**
               * Method to open buildfire auth login pop up and allow user to login using credentials.
               */
              WidgetNotes.openLogin = function () {
                buildfire.auth.login({}, function () {

                });
              };

              var loginCallback = function () {
                buildfire.auth.getCurrentUser(function (err, user) {
                  console.log("=========User", user);
                  if (user) {
                    WidgetNotes.currentLoggedInUser = user;
                    $scope.$apply();
                  }
                });
              };

              buildfire.auth.onLogin(loginCallback);


              WidgetNotes.loadMore = function () {
                console.log("===============In loadmore Note");
                if (WidgetNotes.busy) return;
                WidgetNotes.busy = true;
                WidgetNotes.getNoteList();
              };
              WidgetNotes.showItemList = function(){
                ViewStack.popAllViews();
              };

            }]);
})(window.angular, window.buildfire, window);
