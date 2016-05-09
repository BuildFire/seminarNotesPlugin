'use strict';

(function (angular, buildfire) {
    angular.module('seminarNotesPluginWidget')
        .controller('WidgetHomeCtrl', ['$scope', 'TAG_NAMES', 'LAYOUTS', 'DataStore', 'PAGINATION', 'Buildfire', 'Location', '$rootScope', 'ViewStack', '$sce',
            function ($scope, TAG_NAMES, LAYOUTS, DataStore, PAGINATION, Buildfire, Location, $rootScope, ViewStack, $sce) {
                var WidgetHome = this;
                var currentListLayout = null;
                $rootScope.deviceHeight = window.innerHeight;
                $rootScope.deviceWidth = window.innerWidth;

                WidgetHome.data={
                    design:{
                        itemListLayout:LAYOUTS.itemListLayout[0].name
                    }
                };
                WidgetHome.init = function () {
                    var success = function (result) {

                            if(result && result.data){
                                 WidgetHome.data = result.data;
                            }
                            else{
                                WidgetHome.data={
                                    design:{
                                        itemListLayout:LAYOUTS.itemListLayout[0].name
                                    }
                                };
                            }
                            if(WidgetHome.data && !WidgetHome.data.design){
                                WidgetHome.data.design={
                                    itemListLayout:LAYOUTS.itemListLayout[0].name
                                    };
                            }
                            currentListLayout = WidgetHome.data.design.itemList;
                            if (!WidgetHome.data.design)
                                WidgetHome.data.design = {};
                           if (!WidgetHome.data.design.itemListLayout) {
                                WidgetHome.data.design.itemListLayout = LAYOUTS.itemListLayout[0].name;
                            }
console.log("==============", WidgetHome.data.design.itemListLayout)
                        }
                        , error = function (err) {
                            WidgetHome.data={design:{itemListLayout:LAYOUTS.itemListLayout[0].name}};
                            console.error('Error while getting data', err);
                        };
                    DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
                };
                WidgetHome.init();

                WidgetHome.safeHtml = function (html) {
                    if (html) {
                        var $html = $('<div />', {html: html});
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
                    WidgetHome.view= null;
                    if (!WidgetHome.view) {
                        WidgetHome.view = new Buildfire.components.carousel.view("#carousel", []);
                    }
                    if (WidgetHome.data.content && WidgetHome.data.content.carouselImages) {
                        WidgetHome.view.loadItems(WidgetHome.data.content.carouselImages);
                    } else {
                        WidgetHome.view.loadItems([]);
                    }
                });

                var onUpdateCallback = function (event) {
                    console.log(event)
                    setTimeout(function () {
                        $scope.$digest();
                        if (event && event.tag === TAG_NAMES.SEMINAR_INFO) {
                            WidgetHome.data = event.data;
                            if (!WidgetHome.data.design)
                                WidgetHome.data.design = {};
                            if (!WidgetHome.data.content)
                                WidgetHome.data.content = {};
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
                        currentListLayout = WidgetHome.data.design.itemList;
                         $scope.$digest();
                        $rootScope.$digest();
                    }, 0);
                };
                DataStore.onUpdate().then(null, null, onUpdateCallback);
            }])
})(window.angular, window.buildfire);
