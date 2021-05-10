app.controller('LanguagesCtrl', ['$scope', function ($scope) {

    $scope.data = {};

    let strings;

    function loadLanguage(lang) {
        strings = new buildfire.services.Strings(lang, stringsConfig);
        strings.init().then(() => {
            strings.inject();
        });
        stringsUI.init("stringsContainer", strings, stringsConfig);
    }

    loadLanguage("en-us");

    $scope.createLanguage = function (language) {
        stringsContainer.disabled = true;
        strings.createLanguage(language, () => {
            stringsContainer.disabled = false;
        });
        return false;
    }

    $scope.save = function() {
        strings.save();
    }

}]);