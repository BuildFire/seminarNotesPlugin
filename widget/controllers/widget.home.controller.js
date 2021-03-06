'use strict';

(function (angular, buildfire) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetHomeCtrl', ['$scope', 'TAG_NAMES', 'LAYOUTS', 'DataStore', 'PAGINATION', 'Buildfire', 'Location', '$rootScope', 'ViewStack', '$sce', 'UserData', 'TempPublicDataCopy', 'SORT', '$modal', '$timeout',
      function ($scope, TAG_NAMES, LAYOUTS, DataStore, PAGINATION, Buildfire, Location, $rootScope, ViewStack, $sce, UserData, TempPublicDataCopy, SORT, $modal, $timeout) {
        var WidgetHome = this;
        var currentListLayout, currentSortOrder = null;

        $rootScope.deviceHeight = window.innerHeight;
        $rootScope.deviceWidth = window.innerWidth || 320;
        WidgetHome.busy = false;
        WidgetHome.items = [];
        WidgetHome.released = [];
        $scope.isClicked = false;
        WidgetHome.bookmarkItem = [];
        WidgetHome.bookmarks = {};
        $scope.isFetchedAllData = false;
        WidgetHome.readyToLoadItems = true;
        WidgetHome.seminarItemsInitialFetch = false;
        WidgetHome.imported = false;
        WidgetHome.listeners = {};
        $rootScope.deeplinkingDone = false;//it makes bug if its not rootscope with cp
        var searchOptions = {
          skip: 0,
          limit: PAGINATION.itemCount
        };

        //Refresh list of items on pulling the tile bar

        buildfire.datastore.onRefresh(function () {
          WidgetHome.init(function (err) {
            if (!err) {
              if (!WidgetHome.view) {
                WidgetHome.view = new Buildfire.components.carousel.view("#carousel", []);
              }
              if (WidgetHome.data.content && WidgetHome.data.content.carouselImages) {
                WidgetHome.view.loadItems(WidgetHome.data.content.carouselImages);
              } else {
                WidgetHome.view.loadItems([]);
              }
              WidgetHome.items = [];
              searchOptions.skip = 0;
              WidgetHome.busy = false;
              WidgetHome.loadMore();
              if (!$scope.$$phase)
                $scope.$digest();
            }
          });
        });

        WidgetHome.openDetails = function (itemId) {
          ViewStack.push({
            template: 'Item',
            params: {
              controller: "WidgetItemCtrl as WidgetItem",
              itemId: itemId
            }
          });

          //buildfire.messaging.sendMessageToControl({
          //  type: 'OpenItem',
          //  data: {"id": itemId}
          //});
        };

        WidgetHome.importDeepLinkData = function () {
      //  if (WidgetHome.imported) return;
         // WidgetHome.imported = true;
          buildfire.deeplink.getData(function (data) {
            if(data && data.id && !$rootScope.deeplinkingDone){
              $rootScope.deeplinkingDone=true;
              var notFound = function(){
                var text=WidgetHome.languages.deeplinkNoteNotFound?WidgetHome.languages.deeplinkNoteNotFound:'Item does not exist!';
                buildfire.dialog.toast({
                  message: text
                });
              }
              var successAll = function (result) {
                if(!result || !result.data || !result.data.title)notFound();
                else WidgetHome.openDetails(data.id);
              };
              var errorAll = function (err) {
                  notFound();
              };
              DataStore.getById(data.id, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
            }else if (data && data.itemId && data.dataId) {
              TempPublicDataCopy.getById(data.dataId, TAG_NAMES.SEMINAR_TEMP_NOTES).then((tempCopyResult) => {
                if (tempCopyResult && tempCopyResult.data.notes) {
                  buildfire.notifications.confirm({
                    title: WidgetHome.languages.areYouSureImportTitle,
                    message: WidgetHome.languages.areYouSureImportMessage,
                  }, (errorOrConfirmed, result) => {
                    if (errorOrConfirmed === true || (result && result.selectedButton && result.selectedButton.key === 'confirm')) {
                      Buildfire.spinner.show();
                      WidgetHome.getAllNotes(data.itemId, (notesToDelete) => {
                        {
                          notesToDelete.forEach(note => {
                            UserData.delete(note.id, TAG_NAMES.SEMINAR_NOTES, WidgetHome.currentLoggedInUser._id).then(() => {
                              console.log("deleted note", note);
                            }, (e) => {
                              console.error("error deleting note", e);
                            });
                          });
                          tempCopyResult.data.notes.forEach(note => {
                            console.dir(note);
                            // note.data.userToken = WidgetHome.currentLoggedInUser._id;
                            // note.data.itemID = data.itemId;
                            UserData.insert(note.data, TAG_NAMES.SEMINAR_NOTES, WidgetHome.currentLoggedInUser._id).then(note => {
                              console.log("inserted note", note);
                            }, (e) => {
                              console.error("error inserting note", e);
                            });
                          });
                        }
                      });

                      Buildfire.spinner.hide();
                    }
                  });
                }
              });
            }
            // buildfire.components.toast.showToastMessage({ text: "deep link data: " + JSON.stringify(data) }, () => { });
          });
        }

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
        WidgetHome.getSearchOptions = function (value) {
          switch (value) {
            case SORT.ITEM_TITLE_A_Z:
              searchOptions.sort = { "title": 1 };
              break;
            case SORT.ITEM_TITLE_Z_A:
              searchOptions.sort = { "title": -1 };
              break;
            case SORT.NEWEST_PUBLICATION_DATE:
              searchOptions.sort = { "publishDate": -1 };
              break;
            case SORT.OLDEST_PUBLICATION_DATE:
              searchOptions.sort = { "publishDate": 1 };
              break;
            case SORT.NEWEST_FIRST:
              searchOptions.sort = { "dateCreated": -1 };
              break;
            case SORT.OLDEST_FIRST:
              searchOptions.sort = { "dateCreated": 1 };
              break;
            default:
              searchOptions.sort = { "rank": 1 };
              break;
          }
          return searchOptions;
        };

        WidgetHome.data = {
          design: {
            itemListLayout: LAYOUTS.itemListLayout[0].name
          }
        };
        WidgetHome.init = function (cb) {
          Buildfire.spinner.show();
          var success = function (result) {
            Buildfire.spinner.hide();
            if (result && result.data) {
              WidgetHome.data = result.data;
              WidgetHome.allowSharing = result.data.allowSharing;
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
              
            if (typeof WidgetHome.data.content.sortBy == "undefined")
                WidgetHome.data.content.sortBy=SORT.MANUALLY;
              currentSortOrder=WidgetHome.data.content.sortBy;

            if (!WidgetHome.data.design.itemListBgImage) {
              $rootScope.itemListbackgroundImage = "";
            } else {
              $rootScope.itemListbackgroundImage = WidgetHome.data.design.itemListBgImage;
            }
            console.log("==============", WidgetHome.data.design);
            cb();
          }
            , error = function (err) {
              Buildfire.spinner.hide();
              WidgetHome.data = { design: { itemListLayout: LAYOUTS.itemListLayout[0].name } };
              console.error('Error while getting data', err);
              cb(err);
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
            WidgetHome.languages = languages;
            // if (WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id) {
            //   WidgetHome.importDeepLinkData();
            // } else {
            //   WidgetHome.openLogin();
            // }
          });
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
        };

        WidgetHome.getBookMarkData = function (setBookMarks) {
          Buildfire.spinner.show();
          var err = function (error) {
            Buildfire.spinner.hide();
            console.log("============ There is an error in getting data", error);
          }, result = function (result) {
            Buildfire.spinner.hide();
            console.log("===========Bookmarks", result);
            WidgetHome.bookmarks = result;
            if (setBookMarks)
              WidgetHome.setBookmarks();
          };
          if (WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id)
            UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);
        };

        WidgetHome.setBookmarks = function () {
          for (var item = 0; item < WidgetHome.items.length; item++) {
            WidgetHome.items[item].isBookmarked = false;
            for (var bookmark in WidgetHome.bookmarks) {
              if (WidgetHome.items[item].id == WidgetHome.bookmarks[bookmark].data.itemId) {
                WidgetHome.items[item].isBookmarked = true;
                WidgetHome.items[item].bookmarkId = WidgetHome.bookmarks[bookmark].id;
              }
            }
          }
          console.log("$$$$$$$$$$$$$$$$$$", WidgetHome.bookmarks, WidgetHome.items);
          $scope.isFetchedAllData = true;
        };
        WidgetHome.init(function () {
        });

        WidgetHome.safeHtml = function (html) {
          if (html) {
            var $html = $('<div />', { html: html });
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
          if (WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id) {
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
          if (WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id) {
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
            if (!$scope.$$phase)
              $scope.$digest();
            if (event && event.tag === TAG_NAMES.SEMINAR_INFO) {
              WidgetHome.data = event.data;
              if (!WidgetHome.data.design)
                WidgetHome.data.design = {};
              if (!WidgetHome.data.content)
                WidgetHome.data.content = {};
              if (event.data.content.sortBy && currentSortOrder != event.data.content.sortBy) {
                WidgetHome.data.content.sortBy = event.data.content.sortBy;
                searchOptions.skip = 0;
                WidgetHome.busy = false;
                WidgetHome.items = [];
                WidgetHome.seminarItemsInitialFetch=false;
                WidgetHome.loadMore();
              }
              if (!WidgetHome.data.design.itemListBgImage) {
                $rootScope.itemListbackgroundImage = "";
              } else {
                $rootScope.itemListbackgroundImage = WidgetHome.data.design.itemListBgImage;
              }
            }
            else if (event && event.tag === TAG_NAMES.SEMINAR_ITEMS) {
              searchOptions.skip = 0;
              WidgetHome.busy = false;
              WidgetHome.items = [];
              WidgetHome.seminarItemsInitialFetch=false;
              WidgetHome.loadMore();
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
            if (!$scope.$$phase)
              $scope.$digest();
            if (!$rootScope.$$phase)
              $rootScope.$digest();
          }, 0);
        };
        DataStore.onUpdate().then(null, null, onUpdateCallback);

        WidgetHome.loadMore = function () {
          console.log("------------------------In loadmore");
          if (WidgetHome.busy) {
            return;
          }

          var itemsCount = (WidgetHome.items && WidgetHome.items.length) ? WidgetHome.items.length : 0;

          //If the items have loaded, and they are less than a page, don't try to load again
          if (itemsCount > 0 && itemsCount < PAGINATION.itemCount) {
            return;
          }
          //If there are 0 items loaded and initial fetch was done, don't try to load again.
          if (itemsCount === 0 && WidgetHome.seminarItemsInitialFetch) return;
          if (WidgetHome.readyToLoadItems)
            WidgetHome.getItems();
        };

        WidgetHome.getItems = function () {
          //WidgetHome.busy = true;
          WidgetHome.readyToLoadItems = false;
          Buildfire.spinner.show();
          var successAll = function (resultAll) {

            Buildfire.spinner.hide();
            WidgetHome.busy = false;
            WidgetHome.seminarItemsInitialFetch = true;
            WidgetHome.items = WidgetHome.items.length != 0 ? WidgetHome.items.concat(resultAll) : resultAll;
            var released = WidgetHome.items.filter(result => {
              return !result.data.releaseDate || result.data.releaseDate < Date.now();
            });
            WidgetHome.released = released;
            searchOptions.skip = searchOptions.skip + PAGINATION.itemCount;

            console.log("----------------------", WidgetHome.items);
            WidgetHome.setBookmarks();
            WidgetHome.readyToLoadItems = true;
            $scope.$applyAsync();
            if (WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id) {
              WidgetHome.importDeepLinkData();
            } else {
              WidgetHome.openLogin();
            }
          },
            errorAll = function (error) {
              Buildfire.spinner.hide();
              WidgetHome.busy = false;
              console.log("error", error)
            };
          if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.sortBy) {
            searchOptions = WidgetHome.getSearchOptions(WidgetHome.data.content.sortBy);
          }
          DataStore.search(searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
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
              WidgetHome.getBookMarkData(true);
              WidgetHome.importDeepLinkData();
            }
          });
        };

        buildfire.auth.onLogin(loginCallback);

        var logoutCallback = function () {
          WidgetHome.currentLoggedInUser = null;
          $scope.$apply();
        };

        buildfire.auth.onLogout(logoutCallback);

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

        WidgetHome.getAllNotes = function (id, cb) {
          searchOptions.filter = { "$or": [{ "$json.itemID": { "$eq": id } }] };

          _searchAll(searchOptions, tracks => {
            cb(tracks);
          });

          function _searchAll(searchOptions, cb) {

            get(0, cb, []);
            function get(skip, cb, res) {
              searchOptions.skip = skip;
              UserData.search(searchOptions, TAG_NAMES.SEMINAR_NOTES).then(r => {
                res = res.concat(r);
                if (r.length == PAGINATION.noteCount) {
                  get(skip + PAGINATION.noteCount, cb, res);
                } else {
                  cb(res);
                };
              });

            }

          }
        };

        WidgetHome.addToBookmark = function (item, isBookmarked, index) {
          console.log("$$$$$$$$$$$$$$$$$", item, isBookmarked, index);
          Buildfire.spinner.show();
          if (isBookmarked && item.bookmarkId) {
            var successRemove = function (result) {
              Buildfire.spinner.hide();
              WidgetHome.released[index].isBookmarked = false;
              WidgetHome.released[index].bookmarkId = null;
              if (!$scope.$$phase)
                $scope.$digest();
              $scope.text = WidgetHome.languages.itemRemovedFromBookmarks;
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
            if (WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id)
              UserData.delete(item.bookmarkId, TAG_NAMES.SEMINAR_BOOKMARKS, WidgetHome.currentLoggedInUser._id).then(successRemove, errorRemove);
          } else {
            WidgetHome.bookmarkItem = {
              data: {
                itemId: item.id
              }
            };
            var successItem = function (result) {
              Buildfire.spinner.hide();
              console.log("Inserted", result);
              WidgetHome.released[index].isBookmarked = true;
              WidgetHome.released[index].bookmarkId = result.id;
              if (!$scope.$$phase)
                $scope.$digest();

              $scope.text = WidgetHome.languages.itemBookmarked;
              var addedBookmarkModal = $modal.open({
                templateUrl: 'templates/Bookmark_Confirm.html',
                size: 'sm',
                backdropClass: "ng-hide",
                scope: $scope
              });
              $timeout(function () {
                addedBookmarkModal.close();
              }, 3000);

            }, errorItem = function () {
              Buildfire.spinner.hide();
              return console.error('There was a problem saving your data');
            };
            if (WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id)
              UserData.insert(WidgetHome.bookmarkItem.data, TAG_NAMES.SEMINAR_BOOKMARKS).then(successItem, errorItem);
          }
        };

        WidgetHome.showSearchPage = function () {
          if (WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id) {
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
          if (description)
            return !((description == '<p>&nbsp;<br></p>') || (description == '<p><br data-mce-bogus="1"></p>') || (description == ''));
          else return false;
        };

        WidgetHome.listeners['ITEM_BOOKMARKED'] = $rootScope.$on('ITEM_BOOKMARKED', function (e) {
          WidgetHome.getBookMarkData(true);
        });

        WidgetHome.listeners['CHANGED'] = $rootScope.$on('VIEW_CHANGED', function (e, type, view) {
          if (type === 'POP') {
            WidgetHome.getBookMarkData(true);
            WidgetHome.setBookmarks();
          }
          if (type === 'POPALL') {
            WidgetHome.getBookMarkData(true);
            WidgetHome.setBookmarks();
          }
          if (!ViewStack.hasViews()) {
            // bind on refresh again
            buildfire.datastore.onRefresh(function () {
              WidgetHome.items = [];
              searchOptions.skip = 0;
              WidgetHome.busy = false;
              WidgetHome.loadMore();
              if (!$scope.$$phase)
                $scope.$digest();
            });
          }
        });
      }])
})(window.angular, window.buildfire);
