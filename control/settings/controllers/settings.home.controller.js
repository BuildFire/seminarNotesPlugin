(function (angular, window) {
    'use strict';
    angular
        .module('seminarSettings')
        .controller('SettingsCtrl', ['$scope', 'Buildfire', 'LAYOUTS', 'DataStore', 'TAG_NAMES',
            function ($scope, Buildfire, LAYOUTS, DataStore, TAG_NAMES) {
                var Settings = this;
                Settings.data = {};

                Settings.seminarDelayOptions = [
                    { label: "Off", value: 0 },
                    { label: "Half hour", value: 30 },
                    { label: "One hour", value: 60 },
                    { label: "One Day", value: 1440 },
                    { label: "One Week", value: 10080 },
                ];

                $scope.nextSeminarDelay = false;

                Settings.seminarLockedClassOptions = ["hidden", "locked"];

                var _data = {
                    "content": {
                        "carouselImages": [],
                        "description": "",
                        seminarDelay: Settings.seminarDelayOptions[0],
                        lockedClass: Settings.seminarLockedClassOptions[0]
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
                                if (!Settings.data.content) {
                                    Settings.data.content = {};
                                }

                                if (!Settings.data.content.seminarDelay) {
                                    Settings.data.content.seminarDelay = Settings.seminarDelayOptions[0];
                                    $scope.nextSeminarDelay = false;
                                } else if(Settings.data.content.seminarDelay.value !== 0) $scope.nextSeminarDelay = true;
                                if (!Settings.data.content.lockedClass) Settings.data.content.lockedClass = Settings.seminarLockedClassOptions[0];
                            }
                        },
                        error = function (err) {
                            console.error('Error while getting data', err);
                        };
                        
                        DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
                };

                $scope.setAllowShare = function(){
                        var success = function (result) {
                            console.info('Data saved:', result);
                        },
                        error = function (err) {
                            console.error('Error while saving data', err);
                        };
                        DataStore.save(Settings.data,TAG_NAMES.SEMINAR_INFO).then(success, error); 
                }

                $scope.setSeminarSettings = () => {
                    if($scope.nextSeminarDelay) 
                        Settings.setSeminarSettings('seminarDelay', Settings.seminarDelayOptions[1]);
                    else Settings.setSeminarSettings('seminarDelay', Settings.seminarDelayOptions[0]);
                }

                 Settings.setSeminarSettings = (type, value) => {
                    if (type === 'seminarDelay') {
                        Settings.data.content.seminarDelay = value;
                    } else {
                        Settings.data.content.lockedClass = value;
                    }

                    let success = (result) => {
                        console.info('Data saved:', result);
                    },
                    error = (err) => {
                        console.error('Error while saving data', err);
                    };

                    DataStore.save(Settings.data, TAG_NAMES.SEMINAR_INFO).then(success, error);
                }

                // Settings.getDelaySettings = (callback) => {
                //     buildfire.appData.get("seminarDelay", (err, result) => {
                //         if (err) return console.error('Error while getting delay settings', err);
                //         if (result && result.data && result.data.seminarSettings) {
                //             console.error("Result", result.data)
                //             Settings.data.design.seminarDelay = result.data.seminarDelay;
                //         }
                //         callback();
                //       });
                // }

                // Settings.setDelaySettings = (type, value) => {
                //     if (type === 'seminarDelay') {
                //         Settings.data.design.seminarDelay = seminarDelay;
                //     } else {

                //     }
                //     buildfire.appData.save(
                //         { seminarDelay },
                //         "seminarDelay",
                //         (err, result) => {
                //           if (err) return console.error("Error while saving delay settings", err);
                //           console.log("Delay settings successfully", result);
                //         }
                //       );
                // }

                Settings.init();
            }
        ])
})(window.angular, window);