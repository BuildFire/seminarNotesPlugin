'use strict';

(function (angular, buildfire) {
  angular
    .module('seminarNotesPluginContent')
    .controller('ContentHomeCtrl', ['$scope', 'TAG_NAMES', 'STATUS_CODE', 'DataStore', 'LAYOUTS', '$sce', 'PAGINATION', 'Buildfire', '$modal', '$rootScope', 'RankOfLastItem', 'SORT', 'UserData',
      function ($scope, TAG_NAMES, STATUS_CODE, DataStore, LAYOUTS, $sce, PAGINATION, Buildfire, $modal, $rootScope, RankOfLastItem, SORT, UserData) {

        var ContentHome = this;

        var _data = {
          "content": {
            "carouselImages": [],
            "description": ""
          },
          "design": {
            "itemListLayout": LAYOUTS.itemListLayout[0].name,
            "itemListBgImage": ""
          }
        };

        ContentHome.searchOptions = {
          filter: {"$json.title": {"$regex": '/*'}},
          skip: SORT._skip,
          limit: SORT._limit + 1 // the plus one is to check if there are any more
        };

        /**
         * ContentHome.busy used to enable/disable infiniteScroll. if busy true it means there is not more data.
         * @type {boolean}
         */
        ContentHome.busy = false;


        /**
         * ContentHome.items used to store the people list which fetched from server.
         * @type {null}
         */
        ContentHome.items = null;

        /**
         * ContentHome.data used to store PeopleInfo which fetched from server.
         * @type {null}
         */
        ContentHome.data = null;

        /*
         * ContentHome.data used to store EventsInfo which from datastore.
         */
        ContentHome.masterData = null;

        /**
         * ContentHome.sortingOptions are used to show options in Sort Items drop-down menu in home.html.
         */
        ContentHome.sortingOptions = [
          SORT.MANUALLY,
          SORT.ITEM_TITLE_A_Z,
          SORT.ITEM_TITLE_Z_A,
          SORT.NEWEST_PUBLICATION_DATE,
          SORT.OLDEST_PUBLICATION_DATE,
          SORT.NEWEST_FIRST,
          SORT.OLDEST_FIRST
        ];

        /**
         * ContentHome.removeListItem() used to delete an item from people list
         * @param _index tells the index of item to be deleted.
         */
        ContentHome.removeListItem = function (_index) {

          buildfire.navigation.scrollTop();

          var modalInstance = $modal.open({
            templateUrl: 'templates/deleteItemModal.html',
            controller: 'RemovePopupCtrl',
            controllerAs: 'RemovePopup',
            size: 'sm',
            resolve: {
              itemInfo: function () {
                return ContentHome.items[_index];
              }
            }
          });
          var searchOptionUserData = {};
          modalInstance.result.then(function (message) {
            if (message === 'yes') {
              var item = ContentHome.items[_index];
              DataStore.deleteById(item.id, TAG_NAMES.SEMINAR_ITEMS).then(function (result) {
                ContentHome.items.splice(_index, 1);
                searchOptionUserData.filter ={"$or": [{"$json.itemID": {"$eq": item.id}}]};
                var success = function(data) {
                    for (var note = 0; note < data.length; note++) {
                      var successDelete = function (data) {
                        console.log("Note-" + note + " is deleted", data);
                      }, errorDelete = function (err) {
                        console.log("There is an error in deleting the userData from seminar Notes");
                      }
                      UserData.delete(data[note].id, TAG_NAMES.SEMINAR_NOTES, data[note].userToken).then(successDelete, errorDelete)
                    }
                  } ,
                  error = function (err) {
                    console.log("There is an error in fetching the userData from seminar Notes");
                  }
                  UserData.search(searchOptionUserData, TAG_NAMES.SEMINAR_NOTES).then(success, error)

              }, function (error) {
                console.log("Error deleting item :", error);
              });
            }
          }, function (data) {
            //do something on cancel
          });
        };

        /**
         * ContentHome.searchListItem() used to search people list
         */
        ContentHome.searchListItem = function (value) {
          var searchTerm = '';
          ContentHome.searchOptions.skip = 0;
          ContentHome.busy = false;
          ContentHome.items = null;
          if (value) {
            value = value.trim();
            if (value.indexOf(' ') !== -1) {
              searchTerm = value.split(' ');
              ContentHome.searchOptions.filter = {
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
              searchTerm = value;
              ContentHome.searchOptions.filter = {
                "$or": [{
                  "$json.title": {
                    "$regex": searchTerm,
                    "$options": "i"
                  }
                }, {"$json.summary": {"$regex": searchTerm, "$options": "i"}}]
              };
            }
          } else {
            ContentHome.searchOptions.filter = {"$json.title": {"$regex": '/*'}};
          }
          ContentHome.loadMore('search');
        };

        /*
         * create an artificial delay so api isnt called on every character entered
         * */
        var tmrDelay = null;

        var updateMasterItem = function (data) {
          ContentHome.masterData = angular.copy(data);
        };

        var isUnchanged = function (data) {
          return angular.equals(data, ContentHome.masterData);
        };

        /*
         * Go pull any previously saved data
         * */
        var init = function () {
          var success = function (result) {
              console.info('Init success result:', result);
              ContentHome.data = result.data;
              if (!ContentHome.data) {
                ContentHome.data = angular.copy(_data);
              } else {
                if (!ContentHome.data.content)
                  ContentHome.data.content = {};
                if (!ContentHome.data.content.carouselImages)
                  editor.loadItems([]);
                else
                  editor.loadItems(ContentHome.data.content.carouselImages);
              }
              ContentHome.itemSortableOptions.disabled = !(ContentHome.data.content.sortBy === SORT.MANUALLY);
              RankOfLastItem.setRank(ContentHome.data.content.rankOfLastItem || 0);
              updateMasterItem(ContentHome.data);
              if (tmrDelay)clearTimeout(tmrDelay);
            }
            , error = function (err) {
              if (err && err.code !== STATUS_CODE.NOT_FOUND) {
                console.error('Error while getting data', err);
                if (tmrDelay)clearTimeout(tmrDelay);
              }
              else if (err && err.code === STATUS_CODE.NOT_FOUND) {
                saveData(JSON.parse(angular.toJson(ContentHome.data)), TAG_NAMES.SEMINAR_INFO);
              }
            };
          DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
        };

        /**
         * ContentHome.loadMore() called by infiniteScroll to implement lazy loading
         */
        ContentHome.noMore = false;

        ContentHome.loadMore = function (search) {
          Buildfire.spinner.show();
          if (ContentHome.busy) {
            return;
          }

          ContentHome.busy = true;
          if (ContentHome.data && ContentHome.data.content.sortBy && !search) {
            ContentHome.searchOptions = getSearchOptions(ContentHome.data.content.sortBy);
          }
          DataStore.search(ContentHome.searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(function (result) {
            if (result.length <= SORT._limit) {// to indicate there are more
              ContentHome.noMore = true;
              Buildfire.spinner.hide();
            } else {
              result.pop();
              ContentHome.searchOptions.skip = ContentHome.searchOptions.skip + SORT._limit;
              ContentHome.noMore = false;
            }
            ContentHome.items = ContentHome.items ? ContentHome.items.concat(result) : result;
            ContentHome.busy = false;
            Buildfire.spinner.hide();
          }, function (error) {
            Buildfire.spinner.hide();
            return console.error('-----------err in getting list-------------', error);
          });
        };

        /**
         * ContentHome.itemSortableOptions used for ui-sortable directory to sort people listing Manually.
         * @type object
         */
        ContentHome.itemSortableOptions = {
          handle: '> .cursor-grab',
          disabled: true,
          stop: function (e, ui) {
            var endIndex = ui.item.sortable.dropindex,
              maxRank = 0,
              draggedItem = ContentHome.items[endIndex];

            if (draggedItem) {
              var prev = ContentHome.items[endIndex - 1],
                next = ContentHome.items[endIndex + 1];
              var isRankChanged = false;
              if (next) {
                if (prev) {
                  draggedItem.data.rank = ((prev.data.rank || 0) + (next.data.rank || 0)) / 2;
                  isRankChanged = true;
                } else {
                  draggedItem.data.rank = (next.data.rank || 0) / 2;
                  isRankChanged = true;
                }
              } else {
                if (prev) {
                  draggedItem.data.rank = (((prev.data.rank || 0) * 2) + 10) / 2;
                  maxRank = draggedItem.data.rank;
                  isRankChanged = true;
                }
              }
              if (isRankChanged) {
                DataStore.update(draggedItem.id, draggedItem.data, TAG_NAMES.SEMINAR_ITEMS).then(function (success) {
                  if (ContentHome.data.content.rankOfLastItem < maxRank) {
                    ContentHome.data.content.rankOfLastItem = maxRank;
                    RankOfLastItem.setRank(maxRank);
                  }
                }, function (error) {
                  console.error('Error during updating rank');
                })
              }
            }
          }
        };


        ContentHome.descriptionWYSIWYGOptions = {
          plugins: 'advlist autolink link image lists charmap print preview',
          skin: 'lightgray',
          trusted: true,
          theme: 'modern'
        };

        // create a new instance of the buildfire carousel editor
        var editor = new Buildfire.components.carousel.editor("#carousel");

        // this method will be called when a new item added to the list
        editor.onAddItems = function (items) {
          if (!ContentHome.data.content.carouselImages)
            ContentHome.data.content.carouselImages = [];
          ContentHome.data.content.carouselImages.push.apply(ContentHome.data.content.carouselImages, items);
          $scope.$digest();
        };
        // this method will be called when an item deleted from the list
        editor.onDeleteItem = function (item, index) {
          ContentHome.data.content.carouselImages.splice(index, 1);
          $scope.$digest();
        };
        // this method will be called when you edit item details
        editor.onItemChange = function (item, index) {
          ContentHome.data.content.carouselImages.splice(index, 1, item);
          $scope.$digest();
        };
        // this method will be called when you change the order of items
        editor.onOrderChange = function (item, oldIndex, newIndex) {
          var items = ContentHome.data.content.carouselImages;

          var tmp = items[oldIndex];

          if (oldIndex < newIndex) {
            for (var i = oldIndex + 1; i <= newIndex; i++) {
              items[i - 1] = items[i];
            }
          } else {
            for (var i = oldIndex - 1; i >= newIndex; i--) {
              items[i + 1] = items[i];
            }
          }
          items[newIndex] = tmp;

          ContentHome.data.content.carouselImages = items;
          $scope.$digest();
        };

        /**
         * getSearchOptions(value) is used to get searchOptions with one more key sort which decide the order of sorting.
         */
        var getSearchOptions = function (value) {
          ContentHome.itemSortableOptions.disabled = true;
          switch (value) {
            case SORT.ITEM_TITLE_A_Z:
              ContentHome.searchOptions.sort = {"title": 1};
              break;
            case SORT.ITEM_TITLE_Z_A:
              ContentHome.searchOptions.sort = {"title": -1};
              break;
            case SORT.NEWEST_PUBLICATION_DATE:
              ContentHome.searchOptions.sort = {"publishedOn": 1};
              break;
            case SORT.OLDEST_PUBLICATION_DATE:
              ContentHome.searchOptions.sort = {"publishedOn": -1};
              break;
            case SORT.NEWEST_FIRST:
              ContentHome.searchOptions.sort = {"dateCreated": -1};
              break;
            case SORT.OLDEST_FIRST:
              ContentHome.searchOptions.sort = {"dateCreated": 1};
              break;
            default :
              ContentHome.itemSortableOptions.disabled = false;
              ContentHome.searchOptions.sort = {"rank": 1};
              break;
          }
          return ContentHome.searchOptions;
        };

        /**
         * ContentHome.sortItemBy(value) used to sort people list
         * @param value is a sorting option
         */
        ContentHome.sortItemBy = function (value) {
          if (!value) {
            console.info('There was a problem sorting your data');
          } else {
            ContentHome.items = null;
            ContentHome.searchOptions.skip = 0;
            ContentHome.busy = false;
            ContentHome.data.content.sortBy = value;
            ContentHome.loadMore();
          }
        };


        /*
         * Call the datastore to save the data object
         */
        var saveData = function (newObj, tag) {
          if (typeof newObj === 'undefined') {
            return;
          }
          var success = function (result) {
              console.info('Saved data result: ', result);
              RankOfLastItem.setRank(result.data.content.rankOfLastItem);
              updateMasterItem(newObj);
            }
            , error = function (err) {
              console.error('Error while saving data : ', err);
            };
          newObj.content.rankOfLastItem = newObj.content.rankOfLastItem || 0;
          DataStore.save(newObj, tag).then(success, error);
        };

        var saveDataWithDelay = function (newObj) {
          if (newObj) {
            if (isUnchanged(newObj)) {
              return;
            }
            if (tmrDelay) {
              clearTimeout(tmrDelay);
            }
            tmrDelay = setTimeout(function () {
              saveData(JSON.parse(angular.toJson(newObj)), TAG_NAMES.SEMINAR_INFO);
            }, 500);
          }
        };

        init();

        updateMasterItem(_data);

        /*
         * watch for changes in data and trigger the saveDataWithDelay function on change
         * */
        $scope.$watch(function () {
          return ContentHome.data;
        }, saveDataWithDelay, true);
      }]);
})(window.angular, window.buildfire);
