'use strict';

(function (angular, buildfire, window) {
    angular.module('seminarNotesPluginWidget')
        .controller('WidgetNotesCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData',
            function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData) {
                var WidgetNotes = this;
                WidgetNotes.Notes = [];
                var searchOptions = {};
                WidgetNotes.swiped = [];
                WidgetNotes.swipeToDeleteNote = function (e, i, toggle) {
                    console.log("=============i Am in swipe of Note")
                    toggle ? WidgetNotes.swiped[i] = true : WidgetNotes.swiped[i] = false;
                };
                WidgetNotes.getNoteList = function(){
                  //  searchOptions.filter = {"$or": [{"$json.ItemID": {"$eq": WidgetItem.item.id}}]};
                    var err = function(error){
                        console.log("============ There is an error in getting data", error);
                    },result = function(result){
                        console.log("===========searchItem",result);
                        WidgetNotes.Notes = result;
                    };
                    UserData.search({}, TAG_NAMES.SEMINAR_NOTES).then(result, err);
                };
                WidgetNotes.getNoteList();
                WidgetNotes.showBookmarkItems = function () {
                    ViewStack.push({
                        template: 'Bookmarks',
                        params: {
                            controller: "WidgetBookmarkCtrl as WidgetBookmark",
                            shouldUpdateTemplate: true
                        }
                    });
                };

                WidgetNotes.showItemNotes = function () {
                    ViewStack.push({
                        template: 'Notes',
                        params: {
                            controller: "WidgetNotesCtrl as WidgetNotes",
                            shouldUpdateTemplate: true
                        }
                    });
                };

              WidgetNotes.showSearchPage = function(){
                ViewStack.push({
                  template: 'Search',
                  params: {
                    controller: "WidgetSearchCtrl as WidgetSearch",
                    shouldUpdateTemplate: true
                  }
                });
              };

                WidgetNotes.deleteNote = function(noteId){
                   console.log('================I Am in delete notes',noteId);
                    WidgetNotes.itemNote = {
                        noteTitle: "test title kmt",
                        noteDescription: "test description kmt",
                        ItemID: "5735f33cc5b761cb2ced21e5",
                        ItemTitle: "I Am item title",
                        DateAdded: new Date()
                    };
                    buildfire.userData.delete(noteId,TAG_NAMES.SEMINAR_NOTES,function(err, status){
                        if(err)
                            console.log('================there was a problem deleteing your data',err);
                        else
                            console.log( '================record deleted',status);
                    })
                    //buildfire.userData.update(noteId,WidgetNotes.itemNote, TAG_NAMES.SEMINAR_NOTES,function(err, status){
                    //    if(err)
                    //        console.log('=============there was a problem saving your data',err);
                    //    else
                    //        console.log( '================updated tel',status);
                    //})
                }

              WidgetNotes.showItemList = function(){
                ViewStack.popAllViews();
              };

            }]);
})(window.angular, window.buildfire, window);
