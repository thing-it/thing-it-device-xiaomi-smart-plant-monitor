var assert = require("assert");

describe('[thing-it] Atlas Scientific', function () {
    var testDriver;

    before(function () {
        testDriver = require("thing-it-test").createTestDriver({logLevel: "debug"});

        testDriver.registerDevicePlugin(__dirname + "/../pHMeter");
    });
    describe('Start Configuration', function () {
        it('should complete without error', function () {
            return testDriver.start({
                configuration: require("../examples/configuration.js"),
                heartbeat: 10,
                simulated: true
            });
        });
    });
    describe('Receive Measurements', function () {
        this.timeout(30000);

        before(function () {
            testDriver.removeAllListeners();
        });
        it('should produce Device values', function (done) {
            testDriver.addListener({
                publishDeviceStateChange: function (event) {
                    console.log(event);
                    done();
                }
            });
        });
    });
});





