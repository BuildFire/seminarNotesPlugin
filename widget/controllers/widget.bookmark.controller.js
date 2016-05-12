'use strict';

(function (angular, buildfire, window) {
    angular.module('seminarNotesPluginWidget')
        .controller('WidgetBookmarkCtrl', ['$scope', 'DataStore', 'TAG_NAMES', 'LAYOUTS', '$routeParams', '$sce', '$rootScope', 'Buildfire', 'ViewStack', 'UserData', 'PAGINATION',
            function ($scope, DataStore, TAG_NAMES, LAYOUTS, $routeParams, $sce, $rootScope, Buildfire, ViewStack, UserData, PAGINATION) {
                var WidgetBookmark = this;
                WidgetBookmark.busy = false;
                WidgetBookmark.items = [];
                $scope.isClicked = false;
                WidgetBookmark.bookmarkItem = [];
                WidgetBookmark.bookmarks = {};
                $scope.isFetchedAllData = false;
                var searchOptions = {
                    skip: 0,
                    limit: PAGINATION.itemCount
                };
                WidgetBookmark.data = {
                    design: {
                        itemListLayout: LAYOUTS.itemListLayout[0].name
                    }
                };
                WidgetBookmark.init = function () {
                    var success = function (result) {

                            if (result && result.data) {
                                WidgetBookmark.data = result.data;
                            }

                        }
                        , error = function (err) {
                            console.error('Error while getting data', err);
                        };
                    DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
                    var err = function (error) {
                        console.log("============ There is an error in getting data", error);
                    }, result = function (result) {
                        console.log("===========search", result);
                        WidgetBookmark.bookmarks = result;
                    }
                    UserData.search({}, TAG_NAMES.SEMINAR_BOOKMARKS).then(result, err);

                };

                WidgetBookmark.getItems = function () {
                    var successAll = function (resultAll) {
                            WidgetBookmark.items = WidgetBookmark.items.length ? WidgetHome.items.concat(resultAll) : resultAll;
                            console.log("==============", WidgetBookmark.items)
                            searchOptions.skip = searchOptions.skip + WidgetBookmark.itemCount;
                            if (resultAll.length == WidgetBookmark.itemCount) {
                                WidgetBookmark.busy = false;
                            }
                            WidgetBookmark.getBookmarks();
                        },
                        errorAll = function (error) {
                            console.log("error", error)
                        };
                    DataStore.search(searchOptions, TAG_NAMES.SEMINAR_ITEMS).then(successAll, errorAll);
                };

                WidgetBookmark.getBookmarks = function () {
                    console.log("====================2222", WidgetBookmark.items, WidgetBookmark.items)
                    for (var item = 0; item < WidgetBookmark.items.length; item++) {
                        for (var bookmark in WidgetBookmark.bookmarks) {
                            console.log("====================", WidgetBookmark.items[item].id, WidgetBookmark.bookmarks[bookmark].data.itemIds)
                            if (WidgetBookmark.items[item].id == WidgetBookmark.bookmarks[bookmark].data.itemIds) {
                                WidgetBookmark.items[item].isBookmarked = true;
                            }
                        }
                        ;
                    }
                    $scope.isFetchedAllData = true;
                };
                WidgetBookmark.init();

                WidgetBookmark.openDetails = function (itemId) {
                    ViewStack.push({
                        template: 'item_detail',
                        params: {
                            controller: "WidgetItemCtrl as WidgetItem",
                            shouldUpdateTemplate: true,
                            itemId: itemId
                        }
                    });
                };
                WidgetBookmark.showItemNotes = function () {
                    ViewStack.push({
                        template: 'notes',
                        params: {
                            controller: "WidgetNotesCtrl as WidgetNotes",
                            shouldUpdateTemplate: true
                        }
                    });
                };
                WidgetBookmark.loadMore = function () {
                    console.log("===============In loadmore");
                    if (WidgetBookmark.busy) return;
                    WidgetBookmark.busy = true;
                    WidgetBookmark.getItems();
                };
            }]);
})(window.angular, window.buildfire, window);

