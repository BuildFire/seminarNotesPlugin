'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetNotesCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'PAGINATION',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, PAGINATION) {
        var WidgetNotes = this;
        WidgetNotes.Notes = [];
        WidgetNotes.busy = false;
        WidgetNotes.searchOptions = {};
        WidgetNotes.noItemFound = false;
        var tmrDelay = null;
        var searchOptions = {
          skip: 0,
          limit: PAGINATION.noteCount
        };
        WidgetNotes.swiped = [];
        WidgetNotes.listeners = {};

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
          WidgetNotes.languages = languages;
        });

        //Refresh list of notes on pulling the tile bar

        buildfire.datastore.onRefresh(function () {
          WidgetNotes.Notes = [];
          searchOptions.skip = 0;
          WidgetNotes.busy = false;
          WidgetNotes.loadMore();
          if (!$scope.$$phase)
            $scope.$digest();
        });


        WidgetNotes.swipeToDeleteNote = function (e, i, toggle) {
          toggle ? WidgetNotes.swiped[i] = true : WidgetNotes.swiped[i] = false;
        };
        WidgetNotes.getNoteList = function () {
          Buildfire.spinner.show();
          var err = function (error) {
            Buildfire.spinner.hide();
            WidgetNotes.noItemFound = true;
            console.log("============ There is an error in getting data", error);
          }, result = function (result) {
            Buildfire.spinner.hide();
            WidgetNotes.Notes = WidgetNotes.Notes.length ? WidgetNotes.Notes.concat(result) : result;
            searchOptions.skip = searchOptions.skip + PAGINATION.noteCount;
            if (result.length == PAGINATION.noteCount) {
              WidgetNotes.busy = false;
            }
            if (result.length < 1) {
              WidgetNotes.noItemFound = true;
            } else {
              WidgetNotes.noItemFound = false;
            }
          };
          if (WidgetNotes.currentLoggedInUser && WidgetNotes.currentLoggedInUser._id)
            UserData.search(searchOptions, TAG_NAMES.SEMINAR_NOTES).then(result, err);
          else
            buildfire.auth.getCurrentUser(function (err, user) {
              console.log("===========LoggedInUser2", user);
              if (user) {
                WidgetNotes.currentLoggedInUser = user;
                UserData.search(searchOptions, TAG_NAMES.SEMINAR_NOTES).then(result, err);
              }
            });
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

        WidgetNotes.showSearchPage = function () {
          ViewStack.push({
            template: 'Search',
            params: {
              controller: "WidgetSearchCtrl as WidgetSearch"
            }
          });
        };

        WidgetNotes.openDetails = function (itemId, noteId) {
          buildfire.analytics.trackAction(itemId);
          ViewStack.push({
            template: 'Item',
            params: {
              controller: "WidgetItemCtrl as WidgetItem",
              itemId: itemId,
              noteId: noteId
            }
          });
        };

        WidgetNotes.deleteNote = function (noteId, index) {
          var success = function (res) {
            console.log('================record deleted', res);
            WidgetNotes.Notes.splice(index, 1);
            WidgetNotes.swiped[index] = false;
          }, error = function (err) {
            console.log('================there was a problem deleting your data', err);
          };
          if (WidgetNotes.currentLoggedInUser && WidgetNotes.currentLoggedInUser._id)
            UserData.delete(noteId, TAG_NAMES.SEMINAR_NOTES, WidgetNotes.currentLoggedInUser._id).then(success, error);
        };

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
        var searchData = function (newValue, tag) {
          //Buildfire.spinner.show();
          var searchTerm = '';
          //if (typeof newValue === 'undefined') {
          //  return;
          //}
          //var success = function (result) {
          //    Buildfire.spinner.hide();
          //    console.info('Searched data result:=================== ', result);
          //    WidgetNotes.Notes = result;
          //  }
          //  , error = function (err) {
          //    Buildfire.spinner.hide();
          //    console.error('Error while searching data : ', err);
          //  };
          if (newValue) {
            newValue = newValue.trim();
            if (newValue.indexOf(' ') !== -1) {
              searchTerm = newValue.split(' ');
              searchOptions.filter = {
                "$or": [{
                  "$json.noteTitle": {
                    "$regex": searchTerm[0],
                    "$options": "i"
                  }
                }, {
                  "$json.noteDescription": {
                    "$regex": searchTerm[0],
                    "$options": "i"
                  }
                }, {
                  "$json.noteTitle": {
                    "$regex": searchTerm[1],
                    "$options": "i"
                  }
                }, {
                  "$json.noteDescription": {
                    "$regex": searchTerm[1],
                    "$options": "i"
                  }
                }
                ]
              };
            } else {

              searchTerm = newValue;
              searchOptions.filter = {
                "$or": [{
                  "$json.noteTitle": {
                    "$regex": searchTerm,
                    "$options": "i"
                  }
                }, {
                  "$json.noteDescription": {
                    "$regex": searchTerm,
                    "$options": "i"
                  }
                }]
              };
            }
          }
          WidgetNotes.Notes = [];
          searchOptions.skip = 0;
          WidgetNotes.busy = false;
          WidgetNotes.loadMore();
          // DataStore.search(WidgetNotes.searchOptions, tag).then(success, error);
        };
        WidgetNotes.clearSearchResult = function () {
          WidgetNotes.search = null;
          searchOptions.skip = 0;
          searchOptions.filter = {};
          WidgetNotes.busy = false;
          WidgetNotes.loadMore();
        };
        WidgetNotes.clearTextBox = function () {
          if (!WidgetNotes.search.length) {
            WidgetNotes.Notes = [];
            WidgetNotes.search = null;
            searchOptions.skip = 0;
            searchOptions.filter = {};
            WidgetNotes.busy = false;
            WidgetNotes.loadMore();
          } else {
            if (!WidgetNotes.search.length) {
              WidgetNotes.Notes = [];
              searchOptions.skip = 0;
              WidgetNotes.busy = false;
              WidgetNotes.loadMore();
            }
          }
        };
        var saveDataWithDelay = function (newObj) {
          console.log("******************", newObj);
          if (newObj) {
            if (tmrDelay) {
              clearTimeout(tmrDelay);
            }
            tmrDelay = setTimeout(function () {
              if (newObj)
                searchData(newObj, TAG_NAMES.SEMINAR_NOTES);
            }, 500);
          }
          else {
            WidgetNotes.Notes = [];
          }
        };

        $scope.$watch(function () {
          return WidgetNotes.search;
        }, saveDataWithDelay, true);

        WidgetNotes.loadMore = function () {
          console.log("===============In loadmore Note");
          if (WidgetNotes.busy) return;
          WidgetNotes.busy = true;
          WidgetNotes.getNoteList();
        };

        WidgetNotes.showItemList = function () {
          ViewStack.popAllViews();
        };

        $scope.$on("$destroy", function () {
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>destroyed");
          for (var i in WidgetNotes.listeners) {
            if (WidgetNotes.listeners.hasOwnProperty(i)) {
              WidgetNotes.listeners[i]();
            }
          }
          DataStore.clearListener();
        });

        WidgetNotes.listeners['CHANGED'] = $rootScope.$on('VIEW_CHANGED', function (e, type, view) {

          if (ViewStack.getCurrentView().template == 'Notes') {
            // bind on refresh again
            buildfire.datastore.onRefresh(function () {
              WidgetNotes.Notes = [];
              searchOptions.skip = 0;
              WidgetNotes.busy = false;
              WidgetNotes.loadMore();
              if (!$scope.$$phase)
                $scope.$digest();
            });
          }
        });
      }]);
})(window.angular, window.buildfire, window);
