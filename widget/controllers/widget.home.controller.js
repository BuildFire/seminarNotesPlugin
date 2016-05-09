'use strict';

(function (angular, buildfire) {
    angular.module('seminarNotesPluginWidget')
        .controller('WidgetHomeCtrl', ['$scope', 'TAG_NAMES', 'LAYOUTS', 'DataStore', 'PAGINATION', 'Buildfire', 'Location', '$rootScope', 'ViewStack',
            function ($scope, TAG_NAMES, LAYOUTS, DataStore, PAGINATION, Buildfire, Location, $rootScope, ViewStack) {
                var WidgetHome = this;
                WidgetHome.data = {
                    design: {
                        itemList: LAYOUTS.itemListLayout[0].name
                    }
                }
            }])
})(window.angular, window.buildfire);
