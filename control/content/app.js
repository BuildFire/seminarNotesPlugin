'use strict';

(function (angular) {
  angular.module('seminarNotesPluginContent', ['ngRoute', 'ui.tinymce', 'infinite-scroll', 'ui.bootstrap', 'ui.sortable','ngAnimate'])
    //injected ngRoute for routing
    .config(['$routeProvider', function ($routeProvider) {
      $routeProvider
        .when('/', {
          templateUrl: 'templates/home.html',
          controllerAs: 'ContentHome',
          controller: 'ContentHomeCtrl'
        })
        .when('/item', {
          templateUrl: 'templates/item.html',
          controllerAs: 'ContentItem',
          controller: 'ContentItemCtrl'
        })
        .when('/item/:id', {
          templateUrl: 'templates/item.html',
          controllerAs: 'ContentItem',
          controller: 'ContentItemCtrl'
        })
        .otherwise('/');
    }])
    .filter('getImageUrl', ['Buildfire', function (Buildfire) {
      return function (url, width, height, type) {
        if (type == 'resize')
          return Buildfire.imageLib.resizeImage(url, {
            width: width,
            height: height
          });
        else
          return Buildfire.imageLib.cropImage(url, {
            width: width,
            height: height
          });
      }
    }])
    .directive('dateTime', function () {
      return {
        require: 'ngModel',
        scope: {},
        link: function (scope, elem, attrs, ngModel) {
          ngModel.$formatters.push(function (value) {
            //to view
            return new Date(value);
          });
          ngModel.$parsers.push(function (value) {
            //to model
            return +new Date(value);
          });
        }
      };
    })
    .run(['$location', '$rootScope',function ($location, $rootScope) {
      buildfire.messaging.onReceivedMessage = function (msg) {
        switch (msg.type) {
          case 'OpenItem':
            $location.path('/item/' + msg.data.id);
            $rootScope.$apply();
            break;
          case 'BackToHome':
            $location.path('/');
            $rootScope.$apply();
            break;
        }
      };
    }]);
})(window.angular);