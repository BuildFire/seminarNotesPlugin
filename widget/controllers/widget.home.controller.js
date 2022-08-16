'use strict';

(function (angular, buildfire) {
  angular.module('seminarNotesPluginWidget')
    .controller('WidgetHomeCtrl', ['$scope', 'TAG_NAMES', 'LAYOUTS', 'DataStore', 'PAGINATION', 'Buildfire', 'Location', '$rootScope', 'ViewStack', '$sce', 'UserData', 'TempPublicDataCopy', 'SORT', '$modal', '$timeout',
      function ($scope, TAG_NAMES, LAYOUTS, DataStore, PAGINATION, Buildfire, Location, $rootScope, ViewStack, $sce, UserData, TempPublicDataCopy, SORT, $modal, $timeout) {
        var WidgetHome = this;
        var currentListLayout, currentSortOrder = null;
        let nextSeminarTimout;
        var carouselContainer = null
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
          limit: PAGINATION.itemCount,
          recordCount: true
        };

        // Subscribe to notifications on the device
        buildfire.notifications.pushNotification.subscribe(
          {},
          (err, subscribed) => {
            if (err) return console.error(err);
        
            console.log("User subscribed to group", subscribed);
          }
        );

        buildfire.deeplink.onUpdate((deeplinkData) => {
          var notFound = function(){
            var text = WidgetHome.languages.deeplinkNoteNotFound ? WidgetHome.languages.deeplinkNoteNotFound:'Item does not exist!';
            buildfire.dialog.toast({
              message: text
            });
          }
          var errorAll = function (err) {
            notFound();
          };
          var successAll = function (result) {
            if (!result || !result.data || !result.data.title) notFound();
            else {
              buildfire.analytics.trackAction(`DOCUMENT_${result.id}_OPENED`);
              ViewStack.push({
                template: 'Item',
                params: {
                  controller: "WidgetItemCtrl as WidgetItem",
                  itemId: result.id
                }
              });
            }
          };
          DataStore.getById(deeplinkData.id, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
        });
        //Refresh list of items on pulling the tile bar

        buildfire.datastore.onRefresh(function () {
          WidgetHome.init(function (err) {
            if (!err) {
              renderCarousel();
              WidgetHome.items = [];
              searchOptions.skip = 0;
              WidgetHome.busy = false;
              WidgetHome.loadMore();
              if (!$scope.$$phase)
                $scope.$digest();
            }
          });
        });

        const seminarDelayHandler = (itemRank, itemIndex, callback) => {
            if (
                // If item rank is bigger the current rank and nextAvailableIn has not been set, exit
                (itemRank > $rootScope.seminarLastDocument.rank &&
                    !$rootScope.seminarLastDocument.nextAvailableIn) ||
                // If If item rank is bigger the current rank and the item open time has not been reached, exit
                (itemRank > $rootScope.seminarLastDocument.rank &&
                    Date.now() < $rootScope.seminarLastDocument.nextAvailableIn)
            ) {
                // set navigate to false to not allow to navigate to the item
                return callback(false);
            }

            // If the item is the same rank as the current rank
            if ($rootScope.seminarLastDocument.rank === itemRank) {
              // if the next item open time have not been initialized, initialize it.
              if (!$rootScope.seminarLastDocument.nextAvailableIn) {
                $rootScope.seminarLastDocument.nextAvailableIn = Date.now() + (WidgetHome.data.content.seminarDelay.value * 60 * 1000);
                buildfire.userData.save($rootScope.seminarLastDocument, "seminarLastDocument", false, () => {});
              }
              // create a timeout function to unlock the next item if it's time reached.
              let openAfter =  (Date.now() + ((WidgetHome.data.content.seminarDelay.value) * 60 * 1000)) - Date.now();
              // Show countdown timer
              countdown();
              clearTimeout(nextSeminarTimout);
              nextSeminarTimout = setTimeout(() => {
                // Remove next item locked status after the time is reached 
                let nextItem = document.getElementById(`seminarItem${$rootScope.seminarLastDocument.rank + 1}`);
                if (nextItem) {
                  nextItem.classList.remove(WidgetHome.data.content.lockedClass);
                }
              }, openAfter);

            } 
            // If item rank is bigger than the current rank by one and it reached it's open time
            else if (($rootScope.seminarLastDocument.rank + 1) === itemRank && Date.now() >= $rootScope.seminarLastDocument.nextAvailableIn) {
              // Change the current rank to the item rank
              $rootScope.seminarLastDocument.rank = itemRank; 
              // Set the time for when the next item will open
              $rootScope.seminarLastDocument.nextAvailableIn = Date.now() + (WidgetHome.data.content.seminarDelay.value * 60 * 1000);

              // If not last item 
              if (itemIndex !== ($rootScope.totalItemsCount - 1)) {
                // Schedule a notification for the next Item
                buildfire.notifications.pushNotification.schedule({
                  at: $rootScope.seminarLastDocument.nextAvailableIn,
                  title: "Push notification",
                  text: WidgetHome.languages.nextSeminarOpen ? WidgetHome.languages.nextSeminarOpen : 'The next seminar is now open!'
                })
                
                let openAfter =  $rootScope.seminarLastDocument.nextAvailableIn - Date.now();
                buildfire.userData.save($rootScope.seminarLastDocument, "seminarLastDocument", false, () => {
                  // Show countdown timer
                  countdown();
                  // Remove next item locked status after the time is reached 
                  clearTimeout(nextSeminarTimout)
                  nextSeminarTimout = setTimeout(() => {
                    // Remove item locked status after the time is reached 
                    let nextItem = document.getElementById(`seminarItem${$rootScope.seminarLastDocument.rank + 1}`);
                    if (nextItem) {
                      nextItem.classList.remove(WidgetHome.data.content.lockedClass);
                      $rootScope.seminarLastDocument.rank++;
                      $rootScope.seminarLastDocument.nextAvailableIn = null;
                      buildfire.userData.save($rootScope.seminarLastDocument, "seminarLastDocument", false, () => {});
                    }
                  }, openAfter);
                });
              }
            }
            // Set navigate to true, to allow the user to navigate to the item
            callback(true);
        }

        WidgetHome.openDetails = function (itemId, itemRank, index) {
          if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.seminarDelay && WidgetHome.data.content.seminarDelay.value) {
            seminarDelayHandler(itemRank, index, navigate => {
              if (navigate) {
                buildfire.analytics.trackAction(`DOCUMENT_${itemId}_OPENED`);
                ViewStack.push({
                  template: 'Item',
                  params: {
                    controller: "WidgetItemCtrl as WidgetItem",
                    itemId: itemId
                  }
                });
              } else {
                buildfire.dialog.toast({
                  message: WidgetHome.languages.seminarNotAvailable ? WidgetHome.languages.seminarNotAvailable : "This seminar is not available at this time",
                  type: "danger",
                });
              }
            });
          } else {
            buildfire.analytics.trackAction(`DOCUMENT_${itemId}_OPENED`);
            ViewStack.push({
              template: 'Item',
              params: {
                controller: "WidgetItemCtrl as WidgetItem",
                itemId: itemId
              }
            });
          }

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
        var lastImage=null;
        var changeTimer;

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
        var carouselContainer = document.getElementById("carousel");
          var myImg=document.getElementById("one_img");
          
          if(myImg==null){
              carouselContainer.innerHTML = '';
              var img = document.createElement('img');
              img.setAttribute("id", "one_img");
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
            if ( WidgetHome.data.content && WidgetHome.data.content.carouselImages) {
              var speed = WidgetHome.data.content.speed ? WidgetHome.data.content.speed : 5000 
              var order = WidgetHome.data.content.order ? WidgetHome.data.content.order : 0 
              var display = WidgetHome.data.content.display ? WidgetHome.data.content.display : 0 
              var carouselImages = WidgetHome.data.content.carouselImages;
              var isHome=(new URLSearchParams(window.location.search).get('fid').split("=")[0]=="launcherPluginv");
              var storagePlace=(isHome)?"carouselLastImageHome":"carouselLastImage";
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
                  WidgetHome.view = new buildfire.components.carousel.view({
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
            else {
              carouselContainer =  document.getElementById("carousel");
              renderCarousel();
            }
              
            if (typeof WidgetHome.data.content.sortBy == "undefined")
                WidgetHome.data.content.sortBy=SORT.MANUALLY;
              currentSortOrder=WidgetHome.data.content.sortBy;

            if (!WidgetHome.data.design.itemListBgImage) {
              $rootScope.itemListbackgroundImage = "";
            } else {
              $rootScope.itemListbackgroundImage = WidgetHome.data.design.itemListBgImage;
            }
            console.log("==============", WidgetHome.data.design);
            $rootScope.data = WidgetHome.data;
            cb();
          }
            , error = function (err) {
              Buildfire.spinner.hide();
              WidgetHome.data = { design: { itemListLayout: LAYOUTS.itemListLayout[0].name } };
              $rootScope.data = WidgetHome.data
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
          renderCarousel()
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
        
        var updateTimeout;
        var onUpdateCallback = function (event) {
          if (updateTimeout) clearTimeout(updateTimeout);

          setTimeout(function () {
            if (!$scope.$$phase) $scope.$digest();
            if (event && event.tag === TAG_NAMES.SEMINAR_INFO) {
              WidgetHome.data = event.data;
              if (!WidgetHome.data.design)
                WidgetHome.data.design = {};
              if (!WidgetHome.data.content)
                WidgetHome.data.content = {};

              if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.seminarDelay && WidgetHome.data.content.seminarDelay.value) {
                searchOptions.skip = 0;
                WidgetHome.busy = false;
                WidgetHome.items = [];
                WidgetHome.seminarItemsInitialFetch=false;
              } else if (event.data.content.sortBy && currentSortOrder != event.data.content.sortBy) {
                WidgetHome.data.content.sortBy = event.data.content.sortBy;
                searchOptions.skip = 0;
                WidgetHome.busy = false;
                WidgetHome.items = [];
                WidgetHome.seminarItemsInitialFetch=false;
              }
              if (!WidgetHome.data.design.itemListBgImage) {
                $rootScope.itemListbackgroundImage = "";
              } else {
                $rootScope.itemListbackgroundImage = WidgetHome.data.design.itemListBgImage;
              }
              $rootScope.data = WidgetHome.data;
            }
            else if (event && event.tag === TAG_NAMES.SEMINAR_ITEMS) {
              searchOptions.skip = 0;
              WidgetHome.busy = false;
              WidgetHome.items = [];
              WidgetHome.seminarItemsInitialFetch=false;
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
              renderCarousel();
            }

            currentListLayout = WidgetHome.data.design.itemListLayout;

            updateTimeout = setTimeout(() => {
              if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.seminarDelay && WidgetHome.data.content.seminarDelay.value) {
                WidgetHome.init(() => { WidgetHome.loadMore() });
              } else {
                WidgetHome.loadMore();
              }
            }, 700);

            if (!$scope.$$phase) $scope.$digest();
            if (!$rootScope.$$phase) $rootScope.$digest();
          }, 0);
        };
        DataStore.onUpdate().then(null, null, onUpdateCallback);

        WidgetHome.loadMore = function () {
          if (WidgetHome.busy) {
            return;
          }

          var itemsCount = (WidgetHome.items && WidgetHome.items.length) ? WidgetHome.items.length : 0;

          //If the items have loaded, and they are less than a page, don't try to load again
          if (itemsCount > 0 && (typeof $rootScope.totalItemsCount !== undefined && itemsCount === $rootScope.totalItemsCount)) {
            WidgetHome.busy = false;
            Buildfire.spinner.hide();
            return;
          }

          //If there are 0 items loaded and initial fetch was done, don't try to load again.
          if (itemsCount === 0 && WidgetHome.seminarItemsInitialFetch) return;
          if (WidgetHome.readyToLoadItems) WidgetHome.getItems();
        };

        WidgetHome.getItems = function () {
          //WidgetHome.busy = true;
          WidgetHome.readyToLoadItems = false;
          Buildfire.spinner.show();
          var successAll = function (resultAll) {
            Buildfire.spinner.hide();
            WidgetHome.busy = false;
            WidgetHome.seminarItemsInitialFetch = true;
            if (!resultAll.result) resultAll.result = [];
            WidgetHome.items = WidgetHome.items.length != 0 ? WidgetHome.items.concat(resultAll.result) : resultAll.result;
            var released = WidgetHome.items.filter(result => {
              return !result.data.releaseDate || new Date(result.data.releaseDate) < Date.now();
            });
            WidgetHome.released = released;
            searchOptions.skip = searchOptions.skip + PAGINATION.itemCount;

            // Set the total items count globally
            $rootScope.totalItemsCount = resultAll.totalRecord;

            console.log("----------------------", WidgetHome.items);
            WidgetHome.setBookmarks();
            WidgetHome.readyToLoadItems = true;
            $scope.$applyAsync();
            if (WidgetHome.currentLoggedInUser && WidgetHome.currentLoggedInUser._id) {
              WidgetHome.importDeepLinkData();
            } else {
              WidgetHome.openLogin();
            }
            WidgetHome.loadMore();
            if (!$scope.$$phase) $scope.$digest();
            if (!$rootScope.$$phase) $rootScope.$digest();
          },
            errorAll = function (error) {
              Buildfire.spinner.hide();
              WidgetHome.busy = false;
              console.log("error", error)
            };
          if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.sortBy) {
            searchOptions = WidgetHome.getSearchOptions(WidgetHome.data.content.sortBy);
          }

          if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.seminarDelay && WidgetHome.data.content.seminarDelay.value) {
            if (!WidgetHome.currentLoggedInUser) {
              WidgetHome.openLogin(() => {
                seminarDelayInit(() => {
                  DataStore.search(searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
                });
              });
            } else {
              seminarDelayInit(() => {
                DataStore.search(searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
              });
            }
          } else {
            DataStore.search(searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
          }
        };

        const seminarDelayInit = (callback) => {
          buildfire.userData.get("seminarLastDocument", (err, result) => {
            if (err) {
              console.error("Error while retrieving your data", err)
              return callback();
            };
            
            $rootScope.seminarLastDocument = result.data;
            
            if (typeof $rootScope.seminarLastDocument.rank === 'undefined') {
              $rootScope.seminarLastDocument.rank = 0;
              buildfire.userData.save($rootScope.seminarLastDocument, "seminarLastDocument", false, () => {});
            }

            if ($rootScope.seminarLastDocument.nextAvailableIn) {
              if ($rootScope.seminarLastDocument.nextAvailableIn <= Date.now()) {
                $rootScope.seminarLastDocument.rank++;
                $rootScope.seminarLastDocument.nextAvailableIn = null;
                buildfire.userData.save($rootScope.seminarLastDocument, "seminarLastDocument", false, () => {});
              } else {
                let openAfter = $rootScope.seminarLastDocument.nextAvailableIn - Date.now();
                // Show countdown timer
                countdown();
                clearTimeout(nextSeminarTimout);
                nextSeminarTimout = setTimeout(() => {
                  // Remove item locked status after the time is reached 
                  let nextItem = document.getElementById(`seminarItem${$rootScope.seminarLastDocument.rank + 1}`);
                  if (nextItem) {
                    nextItem.classList.remove(WidgetHome.data.content.lockedClass);
                    $rootScope.seminarLastDocument.rank++;
                    $rootScope.seminarLastDocument.nextAvailableIn = null;
                    buildfire.userData.save($rootScope.seminarLastDocument, "seminarLastDocument", false, () => {});
                  }
                }, openAfter);
              } 
            }

            callback();
          });
        }

        $scope.shouldLockItem = (rank) => {
          if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.seminarDelay && WidgetHome.data.content.seminarDelay.value) {
            if (rank <= $rootScope.seminarLastDocument.rank) {
              return ''
            } else if ((rank === ($rootScope.seminarLastDocument.rank + 1)) && $rootScope.seminarLastDocument.nextAvailableIn && $rootScope.seminarLastDocument.nextAvailableIn <= Date.now()) {
              return ''
            }
            return WidgetHome.data.content.lockedClass;
          } else return '';
        }

        WidgetHome.currentLoggedInUser = null;

        /**
         * Method to open buildfire auth login pop up and allow user to login using credentials.
         */
        WidgetHome.openLogin = function (callback) {
          if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.seminarDelay && WidgetHome.data.content.seminarDelay.value) {
            buildfire.auth.login({ allowCancel: false }, () => {
              if (callback) callback();
            });
          } else {
            buildfire.auth.login({}, function () {
            });
          }
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
          if (WidgetHome.data && WidgetHome.data.content && WidgetHome.data.content.seminarDelay && WidgetHome.data.content.seminarDelay.value) {
            WidgetHome.openLogin(() => {});
          }
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
              if (!$scope.$$phase) $scope.$digest();
            });
          }
        });

      let countdownInterval;
      const countdown = () => {
        clearInterval(countdownInterval);
          countdownInterval = setInterval(() => {
               let endDate  = $rootScope.seminarLastDocument.nextAvailableIn - Date.now();

              if (endDate >= 0) {
                  let days = Math.floor(endDate / (1000 * 60 * 60 * 24));
                  let hours = Math.floor(
                      (endDate % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                  );
                  let mins = Math.floor(
                      (endDate % (1000 * 60 * 60)) / (1000 * 60)
                  );
                  let secs = Math.floor((endDate % (1000 * 60)) / 1000);

                  $scope.days = days;
                  $scope.hours = ("0" + hours).slice(-2);
                  $scope.minutes = ("0" + mins).slice(-2);
                  $scope.seconds = ("0" + secs).slice(-2);
                  $scope.hideCountdown = false;
                  if (!$scope.$$phase) $scope.$digest();
              } else {
                  $scope.hours = "";
                  $scope.minutes = "";
                  $scope.seconds = "";
                  clearInterval(countdownInterval);
                  $scope.hideCountdown = true;
                  if (!$scope.$$phase) $scope.$digest();
              }
          }, 1000);
      };
      }])
})(window.angular, window.buildfire);
