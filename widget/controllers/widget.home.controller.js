'use strict';

(function (angular, buildfire) {
    angular.module('seminarNotesPluginWidget')
        .controller('WidgetHomeCtrl', ['$scope', 'TAG_NAMES', 'LAYOUTS', 'DataStore', 'PAGINATION', 'Buildfire', 'Location', '$rootScope', 'ViewStack', '$sce',
            function ($scope, TAG_NAMES, LAYOUTS, DataStore, PAGINATION, Buildfire, Location, $rootScope, ViewStack, $sce) {
                var WidgetHome = this;

                $rootScope.deviceHeight = window.innerHeight;
                $rootScope.deviceWidth = window.innerWidth;

                WidgetHome.data={
                    design:{
                        itemList:LAYOUTS.itemListLayout[0].name
                    }
                };
                WidgetHome.init = function () {
                    var success = function (result) {
                            console.log("=========",result)
                            if(result && result.data){
                                 WidgetHome.data = result.data;
                            }
                            else{
                                WidgetHome.data={
                                    design:{
                                        itemList:LAYOUTS.itemListLayout[0].name
                                    }
                                };
                            }
                            if (!WidgetHome.data.design)
                                WidgetHome.data.design = {};
                           if (!WidgetHome.data.design.itemList) {
                                WidgetHome.data.design.itemList = LAYOUTS.itemListLayout[0].name;
                            }
                        }
                        , error = function (err) {
                            WidgetHome.data={design:{itemList:LAYOUTS.itemListLayout[0].name}};
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
                    if (!WidgetHome.view) {
                        WidgetHome.view = new Buildfire.components.carousel.view("#carousel", []);
                    }
                    if (WidgetHome.data.content && WidgetHome.data.content.carouselImages) {
                        WidgetHome.view.loadItems(WidgetHome.data.content.carouselImages);
                    } else {
                        WidgetHome.view.loadItems([]);
                    }
                });

            }])
})(window.angular, window.buildfire);
