var assert = require("assert");

describe('[thing-it] Xiaomi Plant Monitor', function () {
    var testDriver;

    before(function () {
        testDriver = require("thing-it-test").createTestDriver({logLevel: "debug", simulated: false});

        testDriver.registerDevicePlugin('xiaomi-smart-plant-monitor', __dirname + "/../plantMonitor");
    });
    describe('Start Configuration', function () {
        this.timeout(30000);

        it('should complete without error', function (done) {
            setTimeout(function () {
                done();
            }.bind(this), 5000);

            testDriver.start({
                configuration: require("../examples/configuration.js"),
                heartbeat: 10,
                simulated: false
            });
        });
    });
    describe('Receive Measurements', function () {
        this.timeout(40000);

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





