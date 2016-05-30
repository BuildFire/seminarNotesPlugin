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
        scope: {publishDate: "="},
        link: function (scope, elem, attrs) {
          setTimeout(function () {
            $(elem).datepicker({
              dateFormat: "mm/dd/yy",
              onSelect: function () {
                var value = $(this).val();
                scope.publishDate = +new Date(value);
                scope.$apply();
                $(elem).datepicker("setDate", new Date(value));
              }
            });
            scope.hasDatePicker = true;
            scope.$apply();
          }, 0);

          var unbindWatch = scope.$watch("publishDate", function (newVal) {
            if(newVal && scope.hasDatePicker) {
              $(elem).datepicker("setDate", new Date(newVal));
              unbindWatch();
            }
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