'use strict';

(function (angular) {
  angular.module('seminarNotesPluginContent')
    .constant('TAG_NAMES', {
      SEMINAR_INFO: 'seminarInfo',
      SEMINAR_ITEMS: "seminarItems"
    })
    .constant('STATUS_CODE', {
      INSERTED: 'inserted',
      UPDATED: 'updated',
      NOT_FOUND: 'NOTFOUND',
      UNDEFINED_DATA: 'UNDEFINED_DATA',
      UNDEFINED_OPTIONS: 'UNDEFINED_OPTIONS',
      UNDEFINED_ID: 'UNDEFINED_ID',
      ITEM_ARRAY_FOUND: 'ITEM_ARRAY_FOUND',
      NOT_ITEM_ARRAY: 'NOT_ITEM_ARRAY'
    })
    .constant('STATUS_MESSAGES', {
      UNDEFINED_DATA: 'Undefined data provided',
      UNDEFINED_OPTIONS: 'Undefined options provided',
      UNDEFINED_ID: 'Undefined id provided',
      NOT_ITEM_ARRAY: 'Array of Items not provided',
      ITEM_ARRAY_FOUND: 'Array of Items provided'
    })
    .constant('LAYOUTS', {
      itemListLayout: [
        {name: "Item_LIST_1"},
        {name: "Item_LIST_"},
        {name: "Item_LIST_"},
        {name: "Item_LIST_"}
      ]
    })
    .constant('PAGINATION', {
      itemCount: 10
    });
})(window.angular);