'use strict';
(function (angular) {
  angular
    .module('seminarSettings', ['ngRoute', 'ui.bootstrap'])
    .config(['$routeProvider', function ($routeProvider) {
      $routeProvider
        .when('/', {
          templateUrl: 'templates/home.html',
          controllerAs: 'Settings',
          controller: 'SettingsCtrl'
        })
        .otherwise('/');
    }])
})(window.angular);
