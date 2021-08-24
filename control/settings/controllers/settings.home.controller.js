(function (angular, window) {
    'use strict';
    angular
        .module('seminarSettings')
        .controller('SettingsCtrl', ['$scope', 'Buildfire', 'LAYOUTS', 'DataStore', 'TAG_NAMES',
            function ($scope, Buildfire, LAYOUTS, DataStore, TAG_NAMES) {
                var Settings = this;
                Settings.data = {};
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
                Settings.init = function () {
                    var success = function (result) {
                            console.info('Init success result:', result);
                            Settings.data = result.data;
                            if (!Settings.data) {
                                Settings.data = angular.copy(_data);
                            } else {
                                if (!Settings.data.content)
                                Settings.data.content = {};
                            }
                        },
                        error = function (err) {
                            console.error('Error while getting data', err);
                        };
                    DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
                };

                Settings.setAllowShare = function(check){
                    if(Settings.data.allowSharing!=check){
                        Settings.data.allowSharing=check;
                        var success = function (result) {
                            console.info('Data saved:', result);
                        },
                        error = function (err) {
                            console.error('Error while saving data', err);
                        };
                        DataStore.save(Settings.data,TAG_NAMES.SEMINAR_INFO).then(success, error);
                    }
                }

                Settings.init();
            }
        ])
})(window.angular, window);