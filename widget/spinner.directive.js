angular
    .module('seminarNotesPluginWidget')
    .directive('buildfireSpinner', spinner);

function spinner() {
    var directive = {
        link: link,
        template: '<div class="spinner spinner-center"></div>',
        restrict: 'E'
    };
    return directive;

    function link(scope, element, attrs) {
    }
}