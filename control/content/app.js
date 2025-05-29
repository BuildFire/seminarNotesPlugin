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
                document.activeElement.blur();
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
    .directive('dateTimeRelease', function () {
      return {
        scope: {releaseDate: "="},
        link: function (scope, elem, attrs) {
          setTimeout(function () {
            $(elem).datepicker({
              dateFormat: "mm/dd/yy",
              onSelect: function () {
                var value = $(this).val();
                scope.releaseDate = +new Date(value);
                scope.$apply();
                $(elem).datepicker("setDate", new Date(value));
                document.activeElement.blur();
              }
            });
            scope.hasDatePicker = true;
            scope.$apply();
          }, 0);

          var unbindWatch = scope.$watch("releaseDate", function (newVal) {
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
            $location.path('/item/' + msg.id);
            $rootScope.$apply();
            break;
          case 'BackToHome':
            $location.path('/');
            $rootScope.$apply();
            break;
        }
      };
    }]).directive('dynamicLinkComponent', ['$timeout',function ($timeout) {
      return {
        template: "<div id='actionItems'></div>",
        replace: true,
        scope: {links: '='},
        link: function (scope, elem, attrs) {
          $timeout(() => {
            // create a new instance of the buildfire action Items
            var linkEditor = new buildfire.components.actionItems.sortableList("#actionItems");
            function initDynamicLinks(){
              if(scope.links && scope.links.length>0)
                linkEditor.loadItems(scope.links);
              // this method will be called when a new item added to the list
              linkEditor.onAddItems = function (items) {
                if (!scope.links)
                  scope.links = [];

                $timeout(function(){
                  scope.$apply(function () {
                    scope.links.push(items);
                  });
                },0);
              };
              // this method will be called when an item deleted from the list
              linkEditor.onDeleteItem = function (item, index) {
                $timeout(function(){
                  scope.$apply(function () {
                    scope.links.splice(index, 1);
                  });
                },0);
              };
              // this method will be called when you edit item details
              linkEditor.onItemChange = function (item, index) {
                $timeout(function(){
                  scope.$apply(function () {
                    scope.links.splice(index, 1, item);
                  });
                },0);
              };
              // this method will be called when you change the order of items
              linkEditor.onOrderChange = function (item, oldIndex, newIndex) {
                $timeout(function(){
                  scope.$apply(function () {
                    var items = scope.links;
                    var i;
                    var tmp = items[oldIndex];
                    if (oldIndex < newIndex) {
                      for ( i = oldIndex + 1; i <= newIndex; i++) {
                        items[i - 1] = items[i];
                      }
                    } else {
                      for (i = oldIndex - 1; i >= newIndex; i--) {
                        items[i + 1] = items[i];
                      }
                    }
                    items[newIndex] = tmp;
                    scope.links = items;
                  });
                },0);
              };
            }
            initDynamicLinks();
            scope.$watch("links", function (newVal, oldVal) {
              if (newVal) {
                if (scope.links) {
                  initDynamicLinks();
                }
              }
            });
          });
        }
      };
    }]);
})(window.angular);