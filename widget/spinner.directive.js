angular
    .module('seminarNotesPluginWidget')
    .directive('spinner', spinner);

function spinner() {
    var directive = {
        link: link,
        template: '<i class="fa fa-spinner fa-spin" style="font-family: FontAwesome !important;font-size:24px"></i>',
        restrict: 'E'
    };
    return directive;

    function link(scope, element, attrs) {
        /* */
    }
}