angular
    .module('seminarNotesPluginWidget')
    .directive('buildfireSpinner', spinner);

function spinner() {
    var directive = {
        link: link,
        template: '<div class="lazy-spinner lazy-spinner-center"></div>',
        restrict: 'E'
    };
    return directive;

    function link(scope, element, attrs) {
    }
}