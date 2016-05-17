describe('Unit : seminarNotesPlugin design services', function () {
  describe('Unit: Buildfire Provider', function () {
    var Buildfire;
    beforeEach(module('seminarNotesPluginDesign'));

    beforeEach(inject(function (_Buildfire_) {
      Buildfire = _Buildfire_;

    }));
    it('Buildfire should exist and be an object', function () {
      expect(typeof Buildfire).toEqual('object');
    });
  });
  describe('Unit : DataStore Factory', function () {
    var DataStore, Buildfire, $rootScope, TAG_NAMES, STATUS_MESSAGES, STATUS_CODE, q;
    beforeEach(module('seminarNotesPluginDesign', function ($provide) {
      $provide.service('Buildfire', function () {
        this.datastore = jasmine.createSpyObj('datastore', ['get', 'save']);
        this.datastore.get.and.callFake(function (_tagName, callback) {
          if (_tagName) {
            callback(null, 'Success');
          } else {
            callback('Error', null);
          }
        });

        this.datastore.save.and.callFake(function (_item, _tagName, callback) {
          if (!_item || !typeof callback === 'function') {
            callback('Error', null);
          } else {
            callback(null, 'Success');
          }
        });
      });
    }));
    beforeEach(inject(function (_$rootScope_, _DataStore_, _Buildfire_, _TAG_NAMES_, _STATUS_CODE_, _STATUS_MESSAGES_) {
      $rootScope = _$rootScope_;
      DataStore = _DataStore_;
      Buildfire = _Buildfire_;
      TAG_NAMES = _TAG_NAMES_;
      STATUS_CODE = _STATUS_CODE_;
      STATUS_MESSAGES = _STATUS_MESSAGES_;
    }));
    it('DataStore should exist and be an object', function () {
      expect(typeof DataStore).toEqual('object');
    });
    it('DataStore.get should exist and be a function', function () {
      expect(typeof DataStore.get).toEqual('function');
    });
    it('DataStore.save should exist and be a function', function () {
      expect(typeof DataStore.save).toEqual('function');
    });
    it('DataStore.get should return error', function () {
      var result = ''
        , success = function (response) {
          result = response;
        }
        , error = function (err) {
          result = err;
        };
      DataStore.get(null).then(success, error);
      $rootScope.$digest();
      expect(result).toEqual('Error');
    });
    it('DataStore.get should return success', function () {
      var result = ''
        , success = function (response) {
          result = response;
        }
        , error = function (err) {
          result = err;
        };
      DataStore.get(TAG_NAMES.SEMINAR_INFO).then(success, error);
      $rootScope.$digest();
      expect(result).toEqual('Success');
    });
    it('DataStore.save should return error', function () {
      var result = ''
        , success = function (response) {
          result = response;
        }
        , error = function (err) {
          result = err;
        };
      DataStore.save( null,null, null).then(success, error);
      $rootScope.$digest();
      expect(result).toEqual('Error');
    });
    it('DataStore.save should return success', function () {
      var result = ''
        , success = function (response) {
          result = response;
        }
        , error = function (err) {
          result = err;
        };
      DataStore.save( 123, TAG_NAMES.SEMINAR_INFO, null).then(success, error);
      $rootScope.$digest();
      expect(result).toEqual('Success');
    });
  });
});

