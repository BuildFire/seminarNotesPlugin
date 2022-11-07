'use strict';

(function (angular, buildfire, window) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetItemCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'TempPublicDataCopy', 'PAGINATION', '$modal', '$timeout', '$location',
      function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, TempPublicDataCopy, PAGINATION, $modal, $timeout, $location) {
        var WidgetItem = this;
        $scope.toggleNoteList = 0;
        $scope.toggleNoteAdd = 0;
        $scope.showNoteList = 1;
        $scope.showNoteAdd = 1;
        $scope.addKeyboardSafeView = 0;
        $scope.showNoteDescription = false;
        WidgetItem.isNoteSaved = false;
        WidgetItem.listeners = {};
        WidgetItem.inInsertNote = false;
        WidgetItem.busy = false;
        WidgetItem.swiped = [];
        WidgetItem.isNoteInserted = false;
        WidgetItem.noteIdToBeUpdate = "";
        var carouselContainer = null
        var changeTimer;
        var lastImage=null;
        var searchOptions = {
          skip: 0,
          limit: PAGINATION.noteCount
        };
        var noteSearchOptions = {};
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
        WidgetItem.masterItem = {};
        var updateMasterItem = function (item) {
          WidgetItem.masterItem = angular.copy(item);
        };
        var currentView = ViewStack.getCurrentView();

        var isUnchanged = function (item) {
          return angular.equals(item, WidgetItem.masterItem);
        };

        console.log("&&&&&&&&&&&&&&&&&&&&", currentView);
        if (currentView.params && currentView.params.itemId && !currentView.params.stopSwitch) {
          $rootScope.showFeed = false;
          buildfire.messaging.sendMessageToControl({
            id: currentView.params.itemId,
            type: 'OpenItem'
          });
        }

        //Refresh item details on pulling the tile bar

        buildfire.datastore.onRefresh(function () {
          if (currentView.params && currentView.params.noteId)
            WidgetItem.getNoteDetailFromItem(currentView.params.noteId);
          if (!$scope.$$phase)
            $scope.$digest();
        });

        WidgetItem.swipeToDeleteNote = function (e, i, toggle) {
          toggle ? WidgetItem.swiped[i] = true : WidgetItem.swiped[i] = false;
        };

        WidgetItem.safeHtml = function (html) {
          if (html) {
            return $sce.trustAsHtml(html);
          }
        };

        WidgetItem.addKeyboardView = function () {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
          if (isIOS) {
            $scope.addKeyboardSafeView = 1;
          }
          else {
            $scope.addKeyboardSafeView = 0;
          }
        };

        var getEventDetails = function () {
          Buildfire.spinner.show();
          var success = function (result) {
            Buildfire.spinner.hide();
            WidgetItem.item = result;

            //$rootScope.$broadcast("NEW_ITEM_ADDED_UPDATED");
            console.log("========ingeteventdetails", result);
           
            if (!WidgetItem.item.data.itemListBgImage) {
              $rootScope.itemDetailbackgroundImage = "";
            } else {
              $rootScope.itemDetailbackgroundImage = WidgetItem.item.data.itemListBgImage;
            }
            $timeout(function () {
              carouselContainer =  document.getElementById("carousel1");
              renderCarousel();
            }, 100);
            $timeout(function () {
              WidgetItem.forceScroll = true;
            }, 0);
          }
            , error = function (err) {
              Buildfire.spinner.hide();
              console.error('Error In Fetching Event', err);
            };

          console.log(">>>>>>>>>>", currentView);
          if (currentView.params && currentView.params.itemId) {
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
        WidgetItem.getNoteDetailFromItem = function (noteId) {

          var result = function (res) {
            WidgetItem.ItemNoteList = res;
            WidgetItem.editNote(noteId)
          }, err = function (err) {
            console.log("error in fetching data")
          };
          if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id)
            UserData.search({}, TAG_NAMES.SEMINAR_NOTES).then(result, err);
        };
        var init = function () {
          if (currentView.params && currentView.params.noteId) {
            WidgetItem.getNoteDetailFromItem(currentView.params.noteId);
            $scope.toggleNoteList = true;
            $scope.showNoteDescription = true;
            $scope.showNoteList = true;
            $scope.toggleNoteAdd = 0;
            $scope.showNoteAdd = false;
          }
          Buildfire.spinner.show();
          var success = function (result) {
            Buildfire.spinner.hide();
            WidgetItem.data = result.data;
            WidgetItem.allowSharing = result.data.allowSharing;
            if (!WidgetItem.data.design)
              WidgetItem.data.design = {};
            getEventDetails();
            WidgetItem.getBookmarkedItems();
          }
            , error = function (err) {
              Buildfire.spinner.hide();
              console.error('Error while getting data', err);
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
            WidgetItem.languages = languages;
          });
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
        };

        init();

        WidgetItem.showHideNoteList = function () {
          $scope.showNoteDescription = false;
          if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id) {
            if ($scope.toggleNoteList && !$scope.toggleNoteAdd) {
              $scope.toggleNoteList = 0;
              WidgetItem.ItemNoteList = [];
            } else {
              $scope.toggleNoteList = 1;
              $scope.showNoteList = 1;
              $scope.showNoteAdd = 0;
              WidgetItem.busy = false;
              searchOptions.skip = 0;
              WidgetItem.showNoteList();
            }
            if ($scope.toggleNoteList && $scope.toggleNoteAdd) {
              $scope.toggleNoteList = 0;
              $scope.toggleNoteAdd = 0;
              WidgetItem.ItemNoteList = [];
            }
          }
          else {
            WidgetItem.openLogin();
          }
        };

        WidgetItem.showNoteList = function () {
          WidgetItem.ItemNoteList = [];
          WidgetItem.busy = false;
          searchOptions.skip = 0;
          WidgetItem.loadMore();
          $scope.showNoteDescription = false;
          $scope.addKeyboardSafeView = 0;
        };

        WidgetItem.showHideAddNote = function () {
          WidgetItem.isNoteSaved = false;
          WidgetItem.inInsertNote = false;
          $scope.showNoteDescription = false;
          if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id) {
            if ($scope.toggleNoteAdd && !$scope.toggleNoteList) {
              $scope.toggleNoteAdd = 0
              $scope.addKeyboardSafeView = 0;
            } else {
              $scope.toggleNoteAdd = 1;
              $scope.showNoteAdd = 1;
              $scope.showNoteList = 0;
            }
            if ($scope.toggleNoteList && $scope.toggleNoteAdd) {
              $scope.toggleNoteList = 0;
              $scope.toggleNoteAdd = 0
            }
            WidgetItem.Note.noteTitle = null;
            WidgetItem.Note.noteDescription = null;
            WidgetItem.isNoteInserted = false;
          } else {
            WidgetItem.openLogin();
          }

        };

        WidgetItem.addNoteToItem = function () {
          WidgetItem.inInsertNote = true;
          Buildfire.spinner.show();
          
          WidgetItem.itemNote = {
            noteTitle: WidgetItem.Note.noteTitle,
            noteDescription: WidgetItem.Note.noteDescription,
            itemID: WidgetItem.item.id,
            itemTitle: WidgetItem.item.data.title,
            dateAdded: new Date(),
            itemRank: WidgetItem.item.data.rank
          };
          
          var successItem = function (result) {
            Buildfire.spinner.hide();
            console.log("Inserted Item Note", result);
            $scope.isClicked = WidgetItem.item.id;
            updateMasterItem(result.data)
            WidgetItem.isNoteInserted = result.id;
            WidgetItem.isNoteSaved = true;
            $timeout(function () {
              WidgetItem.isNoteSaved = false;
            }, 1000);

          }, errorItem = function () {
            Buildfire.spinner.hide();
            return console.error('There was a problem saving your data');
          };
          if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id)
            UserData.insert(WidgetItem.itemNote, TAG_NAMES.SEMINAR_NOTES, WidgetItem.currentLoggedInUser._id).then(successItem, errorItem);
        };

        WidgetItem.getAllNotes = function (cb) {
          searchOptions.filter = { "$or": [{ "$json.itemID": { "$eq": WidgetItem.item.id } }] };

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

        WidgetItem.getNoteList = function () {
          Buildfire.spinner.show();
          searchOptions.filter = { "$or": [{ "$json.itemID": { "$eq": WidgetItem.item.id } }] };
          var err = function (error) {
            Buildfire.spinner.hide();
            console.log("============ There is an error in getting data", error);
          }, result = function (result) {
            Buildfire.spinner.hide();
            console.log("===========Search Note", result, searchOptions);
            WidgetItem.ItemNoteList = WidgetItem.ItemNoteList.length ? WidgetItem.ItemNoteList.concat(result) : result;
            searchOptions.skip = searchOptions.skip + PAGINATION.noteCount;
            if (result.length == PAGINATION.noteCount) {
              WidgetItem.busy = false;
            }
          };
          if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id)
            UserData.search(searchOptions, TAG_NAMES.SEMINAR_NOTES).then(result, err);
        };

        WidgetItem.openLinks = function (actionItems, $event) {
          if (actionItems && actionItems.length) {
            var options = {};
            var callback = function (error, result) {
              if (error) {
                console.error('Error:', error);
              }
            };
            $event.preventDefault();
            $timeout(function () {
              Buildfire.actionItems.list(actionItems, options, callback);
            });
          }
        };

        WidgetItem.getBookmarkedItems = function () {
          Buildfire.spinner.show();
          var err = function (error) {
            Buildfire.spinner.hide();
            console.log("============ There is an error in getting data", error);
          }, result = function (result) {
            Buildfire.spinner.hide();
            console.log("===========searchinItem", result);
            WidgetItem.bookmarks = result;
            WidgetItem.getBookmarks();
          };
          if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id)
            UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);
        };

        WidgetItem.getNoteDetail = function (noteId) {
          $scope.showNoteDescription = true;
          WidgetItem.ItemNoteList.map(function (obj) {
            var rObj = {};
            if (obj.id == noteId) {
              rObj = obj;
              WidgetItem.noteDetail = rObj;
            }
          });
          console.log("==================...", WidgetItem.noteDetail)
        };

        WidgetItem.addToBookmark = function (itemId, item, isBookmarked) {
          Buildfire.spinner.show();
          if (isBookmarked && item.bookmarkId) {
            var successRemove = function (result) {
              Buildfire.spinner.hide();
              WidgetItem.item.isBookmarked = false;
              WidgetItem.item.bookmarkId = null;
              if (!$scope.$$phase)
                $scope.$digest();
              $scope.text = WidgetItem.languages.itemRemovedFromBookmarks;
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

            if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id)
              UserData.delete(item.bookmarkId, TAG_NAMES.SEMINAR_BOOKMARKS, WidgetItem.currentLoggedInUser._id).then(successRemove, errorRemove);
          } else {
            WidgetItem.bookmarkItem = {
              data: {
                itemId: itemId
              }
            };
            var successItem = function (result) {
              Buildfire.spinner.hide();
              WidgetItem.item.isBookmarked = true;
              WidgetItem.item.bookmarkId = result.id;
              console.log("Inserted", result);
              $scope.isClicked = itemId;
              //  WidgetItem.getBookmarks();
              $scope.text = WidgetItem.languages.itemBookmarked;
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
            if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id)
              UserData.insert(WidgetItem.bookmarkItem.data, TAG_NAMES.SEMINAR_BOOKMARKS).then(successItem, errorItem);
          }
        };

        WidgetItem.getBookmarks = function () {
          if (WidgetItem.item) {
            for (var bookmark in WidgetItem.bookmarks) {
              if (WidgetItem.bookmarks[bookmark].data.itemId == WidgetItem.item.id) {
                WidgetItem.item.isBookmarked = true;
                WidgetItem.item.bookmarkId = WidgetItem.bookmarks[bookmark].id;
              }
            }
            console.log("============initemGetBookmarks", WidgetItem.item, WidgetItem.bookmarks);
            $scope.isFetchedAllData = true;
          }
        };

        var onUpdateCallback = function (event) {
          setTimeout(function () {
            if (!$scope.$$phase)
              $scope.$digest();
            if (event && event.tag) {
              console.log("_____________________________", event);
              switch (event.tag) {
                case TAG_NAMES.SEMINAR_INFO:
                  WidgetItem.data = event.data;
                  if (!WidgetItem.data.design)
                    WidgetItem.data.design = {};
                  break;
                case TAG_NAMES.SEMINAR_ITEMS:
                  if (event.data) {
                    WidgetItem.item.data = event.data;
                      carouselContainer =  document.getElementById("carousel1");
                      renderCarousel();
                    if (!WidgetItem.item.data.itemListBgImage) {
                      $rootScope.itemDetailbackgroundImage = "";
                    } else {
                      $rootScope.itemDetailbackgroundImage = WidgetItem.item.data.itemListBgImage;
                    }
                  }
                  break;
              }
              if (!$scope.$$phase)
                $scope.$digest();
              if (!$rootScope.$$phase)
                $rootScope.$apply();
            }
          }, 500);
        };

        DataStore.onUpdate().then(null, null, onUpdateCallback);

        WidgetItem.shareContent = function () {
          buildfire.notifications.confirm({
            title: WidgetItem.languages.areYouSureTitle,
            message: WidgetItem.languages.areYouSureMessage
            , confirmButton: { text: 'Yes', key: 'confirm', type: 'danger' }
            , cancelButton: { text: 'No', key: 'cancel', type: 'default' }
          }, (errorOrConfirmed, result) => {
            if (errorOrConfirmed == 1 || result.selectedButton.key == 'confirm') {
              Buildfire.spinner.show();
              WidgetItem.getAllNotes((allNotes) => {
                if (allNotes.length > 0) {
                  let timeStamp = Date.now(),
                    id = WidgetItem.item.id;
                  let publicDataCopy = {
                    notes: allNotes,
                    timeStamp: timeStamp,
                    itemId: id,
                    _buildfire: {
                      index: {
                        date1: timeStamp
                      }
                    }
                  }
                  TempPublicDataCopy.insert(publicDataCopy, TAG_NAMES.SEMINAR_TEMP_NOTES).then((result) => {
                    let link = {
                      title: WidgetItem.languages.shareTitle,
                      type: "website",
                      description: WidgetItem.languages.shareDescription + WidgetItem.item.data.title
                    };

                    link.data = {

                      "itemId": WidgetItem.item.id,
                      "dataId": result.id
                    };

                    buildfire.deeplink.generateUrl(link, (err, result) => {
                      if (err) {
                        buildfire.dialog.toast({ message: WidgetItem.languages.errorSharing });
                      } else {
                        buildfire.device.share({
                          subject: link.title,
                          text: link.description,
                          link: result.url
                        }, (err, result) => {
                          if (err)
                            buildfire.dialog.toast({ message: WidgetItem.languages.errorSharing });
                          else
                            console.dir(result);
                          buildfire.dialog.toast({ message: WidgetItem.languages.expireWarning });
                        });
                      }
                    });
                  }, () => {
                    buildfire.dialog.toast({ message: WidgetItem.languages.errorSharing });
                  });
                } else {
                  buildfire.dialog.toast({ message: WidgetItem.languages.errorSharingNoNotes });
                }
                Buildfire.spinner.hide();
              });
            }
          });
        };


        WidgetItem.loadMore = function () {
          console.log("===============In loadmore Note");
          if (WidgetItem.busy) return;
          WidgetItem.busy = true;
          if (WidgetItem.item && WidgetItem.item.id)
            WidgetItem.getNoteList();
        };

        WidgetItem.deleteNote = function (noteId, index) {
          var success = function (res) {
            console.log('================record deleted', res);
            WidgetItem.ItemNoteList.splice(index, 1);
            WidgetItem.swiped[index] = false;
          }, error = function (err) {
            console.log('================there was a problem deleting your data', err);
          };
          if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id)
            UserData.delete(noteId, TAG_NAMES.SEMINAR_NOTES, WidgetItem.currentLoggedInUser._id).then(success, error);
        };

        var tmrDelayForNote = null;
        WidgetItem.isValidItem = function (note) {
          return note.noteTitle || note.noteDescription;
        };

        WidgetItem.updateNoteData = function () {
          WidgetItem.itemNote = {
            noteTitle: WidgetItem.Note.noteTitle,
            noteDescription: WidgetItem.Note.noteDescription,
            itemID: WidgetItem.item.id,
            itemTitle: WidgetItem.item.data.title,
            dateAdded: new Date()
          };
          var data = function (data) {
            WidgetItem.isUpdating = false;
            WidgetItem.isNoteSaved = true;
            $timeout(function () {
              WidgetItem.isNoteSaved = false;
            }, 1000);
          }, err = function (err) {
          };

          if (WidgetItem.currentLoggedInUser && WidgetItem.currentLoggedInUser._id)
            UserData.update(WidgetItem.isNoteInserted, WidgetItem.itemNote, TAG_NAMES.SEMINAR_NOTES, WidgetItem.currentLoggedInUser._id).then(data, err);
        };

        var updateNoteWithDelay = function (note) {
          clearTimeout(tmrDelayForNote);
          WidgetItem.isUpdating = false;
          WidgetItem.isItemValid = WidgetItem.isValidItem(WidgetItem.Note);
          if (!WidgetItem.isUpdating && !isUnchanged(WidgetItem.Note) && WidgetItem.isItemValid) {
            tmrDelayForNote = setTimeout(function () {
              if (WidgetItem.inInsertNote) {
                WidgetItem.updateNoteData();
              } else {
                WidgetItem.addNoteToItem();
              }
            }, 300);
          }
        };

        WidgetItem.editNote = function (noteId) {
          WidgetItem.inInsertNote = true;
          WidgetItem.getNoteDetail(noteId);
          WidgetItem.isNoteInserted = noteId;
          WidgetItem.Note.noteTitle = WidgetItem.noteDetail.data.noteTitle;
          WidgetItem.Note.noteDescription = WidgetItem.noteDetail.data.noteDescription;
        };

        $scope.$on("$destroy", function () {
          for (var i in WidgetItem.listeners) {
            if (WidgetItem.listeners.hasOwnProperty(i)) {
              WidgetItem.listeners[i]();
            }
          }
          DataStore.clearListener();
        });

        WidgetItem.listeners['CHANGED'] = $rootScope.$on('VIEW_CHANGED', function (e, type, view) {
          if (type === 'POP') {
            DataStore.onUpdate().then(null, null, onUpdateCallback);
          }

          if (ViewStack.getCurrentView().template == 'Item') {
            //bind on refresh again
            buildfire.datastore.onRefresh(function () {
              if (currentView.params && currentView.params.noteId) {
                WidgetItem.getNoteDetailFromItem(currentView.params.noteId);
                if (!$scope.$$phase)
                  $scope.$digest();
              }
            });
          }
        });

        $scope.$watch(function () {
          return WidgetItem.Note;
        }, updateNoteWithDelay, true);

        function shuffle(a,first,last) {
          var j, x, i;
          for (i = a.length - 1; i > 0; i--) {
              j = Math.floor(Math.random() * (i + 1));
              x = a[i];
              a[i] = a[j];
              a[j] = x;
          }
          if(last==a[0]||first==a[a.length-1]) return shuffle(a,first,last);
          else return a;
      }


      function randomizeArray(sent){
          shuffle(sent,null,null);
          var dup=Array.from(sent);
          shuffle(dup,null,sent[sent.length - 1]);
          sent.push(...dup);
          shuffle(dup,sent[0],sent[sent.length - 1]);
          sent.push(...dup);
      }

      function changeImage(carouselImages,random){
          var oldState=carouselImages;
          if(random){
              carouselImages=[carouselImages[Math.floor(Math.random() * carouselImages.length)]];
  
              if(carouselImages[0]!=lastImage[0]){
                  lastImage=carouselImages;
                  appendOneImage(carouselImages);
              }else changeImage(oldState);
          }else{
              var index=carouselImages.indexOf(lastImage[0]);
              var sendIndex=0;
              if(index==-1||index==carouselImages.length-1)carouselImages=[carouselImages[0]];
              else {carouselImages=[carouselImages[index+1]];sendIndex=index+1;}
              lastImage=carouselImages;
              var isHome=(new URLSearchParams(window.location.search).get('fid').split("=")[0]=="launcherPluginv");
              var storagePlace=(isHome)?"carouselLastImageHome":"carouselLastImage";
              buildfire.localStorage.setItem(storagePlace,sendIndex, function(e,r){
                  appendOneImage(carouselImages);
              });
          }
  
      }
      function appendOneImage(carouselImages){
          var myImg=document.getElementById("one_img_item");
          
          if(myImg==null){
              carouselContainer.innerHTML = '';
              var img = document.createElement('img');
              img.setAttribute("id", "one_img_item");
              img.setAttribute("src", buildfire.imageLib.cropImage(carouselImages[0].iconUrl, {
                  width: window.innerWidth,
                  height: Math.ceil(9 * (window.innerWidth) / 16)
              }));
              carouselContainer.appendChild(img);
              img.addEventListener("click", function () {
                  buildfire.actionItems.execute(carouselImages[0], function (err, result) {
                      if (err) {
                          console.warn('Error openning slider action: ', err);
                      }
                  });
              });
          }else{
              myImg.setAttribute("src", buildfire.imageLib.cropImage(carouselImages[0].iconUrl, {
                  width: window.innerWidth,
                  height: Math.ceil(9 * (window.innerWidth) / 16)
              }));
              myImg.removeEventListener("click",function(){});
              myImg.addEventListener("click", function () {
                  buildfire.actionItems.execute(carouselImages[0], function (err, result) {
                      if (err) {
                          console.warn('Error openning slider action: ', err);
                      }
                  });
              });
          }
      }
      var renderCarousel = function(){
          if(changeTimer) clearInterval(changeTimer);
          if(carouselContainer != null){
            if ( WidgetItem.item.data && WidgetItem.item.data.carouselImages && WidgetItem.item.data.carouselImages.length > 0) {
              var speed = WidgetItem.item.data.speed ? WidgetItem.item.data.speed : 5000 
              var order = WidgetItem.item.data.order ? WidgetItem.item.data.order : 0 
              var display = WidgetItem.item.data.display ? WidgetItem.item.data.display : 0 
              var carouselImages = WidgetItem.item.data.carouselImages;
              var isHome=(new URLSearchParams(window.location.search).get('fid').split("=")[0]=="launcherPluginv");
              var storagePlace=(isHome)?"carouselLastImageHomeItem":"carouselLastImageItem";
              if(order == 0 && display== 1 && carouselImages.length > 1){
                buildfire.localStorage.getItem(storagePlace, function(e,r) {
                    var images=carouselImages;
                    var sendIndex=0;
                    if(r==null){
                        carouselImages=[carouselImages[0]];
                    }else{
                        var index=Number(r);
                        if(index==-1||index==carouselImages.length-1)carouselImages=[carouselImages[0]];
                        else {carouselImages=[carouselImages[index+1]];sendIndex=index+1;}
                    }
                    buildfire.localStorage.setItem(storagePlace,sendIndex, function(e,r){
                            lastImage=carouselImages;
                            if(speed!=0)changeTimer=setInterval(changeImage, speed,images,false);
                        });
                });
            }
            else if(order == 1 && display== 1 && carouselImages.length > 1){
                if(speed!=0){
                    changeTimer=setInterval(changeImage, speed,carouselImages,true);
                }
                carouselImages=[carouselImages[Math.floor(Math.random() * carouselImages.length)]];
                lastImage=carouselImages;
                buildfire.localStorage.removeItem(storagePlace);
  
            }else if(order == 1 && display== 0 && carouselImages.length > 1){
                randomizeArray(carouselImages);
                buildfire.localStorage.removeItem(storagePlace);
            }
  
              if (carouselImages.length > 1) {
                setTimeout(()=>{
                  WidgetItem.view = new buildfire.components.carousel.view({
                    selector: carouselContainer,
                    items: carouselImages,
                    loop: (speed!=0),
                    infinite:false,
                    autoInterval:speed
                  });
                },100)
                
              } else {
                  appendOneImage(carouselImages);
              }
              carouselContainer.classList.remove('hide');
            } else {
              carouselContainer.classList.add('hide');
            }
          }
          
        }
      }]);
})(window.angular, window.buildfire, window);
