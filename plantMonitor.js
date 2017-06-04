module.exports = {
    metadata: {
        family: 'plantMonitor',
        plugin: 'plantMonitor',
        label: 'Xiaomi Plant Monitor',
        manufacturer: 'Xiaomi',
        discoverable: false,
        tangible: true,
        additionalSoftware: [],
        actorTypes: [],
        sensorTypes: [],
        state: [{
            id: "illumination",
            label: "Illumination",
            type: {
                id: "decimal"
            }
        }, {
            id: "temperature",
            label: "Temperature",
            type: {
                id: "decimal"
            }
        }, {
            id: "moisture",
            label: "Moisture",
            type: {
                id: "decimal"
            }
        }, {
            id: "fertility",
            label: "Fertility",
            type: {
                id: "decimal"
            }
        }],
        services: [],
        configuration: [{
            id: "deviceId",
            label: "Device ID",
            type: {
                id: "string"
            }
        }]
    },
    create: function () {
        return new PlantMonitor();
    },
    discovery: function () {
        return new PlantMonitorDiscovery();
    }
};

var q = require('q');

function PlantMonitorDiscovery() {
    PlantMonitorDiscovery.prototype.start = function () {
        if (!this.node.isSimulated()) {
        }
    };

    PlantMonitorDiscovery.prototype.stop = function () {
        if (discoveryInterval !== undefined && discoveryInterval) {
            clearInterval(discoveryInterval);
        }
    };
}

/**
 *
 * @constructor
 */
function PlantMonitor() {
    const DEFAULT_DEVICE_NAME = 'Flower mate';
    const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
    const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
    const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
    const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
    const REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);

    const SERVICE_UUIDS = [DATA_SERVICE_UUID];
    const CHARACTERISTIC_UUIDS = [DATA_CHARACTERISTIC_UUID, FIRMWARE_CHARACTERISTIC_UUID, REALTIME_CHARACTERISTIC_UUID];

    PlantMonitor.prototype.start = function () {
        var deferred = q.defer();

        this.state = {illumination: 10000, temperature: 24, humidity: 66, fertility: 5.0};

        if (this.isSimulated()) {
            this.interval = setInterval(function () {
                this.state.illumination = 10000 + 1000 * new Date().getTime() % 4;
                this.state.temperature = 17 + new Date().getTime() % 10;
                this.state.humidity = 50 + 50 * new Date().getTime() % 50;
                this.state.fertility = 5 + 0.1 * new Date().getTime() % 2;

                this.publishStateChange();
            }.bind(this), 20000);

            deferred.resolve();
        } else {
            if (!this.bluetoothConnector) {
                this.bluetoothConnector = new BluetoothConnector().initialize();
            }

            deferred.resolve();
        }

        return deferred.promise;
    };

    /**
     *
     */
    PlantMonitor.prototype.stop = function () {
        var deferred = q.defer();

        if (this.isSimulated()) {
            if (this.interval) {
                clearInterval(this.interval);
            }
        } else {
        }

        deferred.resolve();

        return deferred.promise;
    };

    /**
     *
     */
    PlantMonitor.prototype.getState = function () {
        return this.state;
    };

    /**
     *
     */
    PlantMonitor.prototype.setState = function () {
    };
}

/**
 *
 * @constructor
 */
function BluetoothConnector() {
    /**
     *
     * @param macAddress
     */
    BluetoothConnector.prototype.initialize = function (macAddress) {
        this._macAddress = macAddress;
        this.noble = require('noble');

        this.noble.on('discover', this.discover.bind(this));
    };

    /**
     *
     * @param peripheral
     */
    BluetoothConnector.prototype.discover = function (peripheral) {
        debug('Plant sensor discovered: ', peripheral.advertisement.localName);

        if (this._macAddress !== undefined) {
            if (this._macAddress.toLowerCase() === peripheral.address.toLowerCase()) {
                debug('trying to connect mi flora, living at %s', this._macAddress);

                // start listening the specific device

                this.connectDevice(peripheral);
            }
        } else if (peripheral.advertisement.localName === DEFAULT_DEVICE_NAME) {
            debug('no mac address specified, trying to connect available mi flora...');

            // start listening found device

            this.connectDevice(peripheral);
        }
    };

    /**
     *
     * @param peripheral
     */
    BluetoothConnector.prototype.connectDevice = function (peripheral) {
        if (peripheral.state === 'disconnected') {
            peripheral.connect();
            peripheral.once('connect', function () {
                this.listenDevice(peripheral, this);
            }.bind(this));
        }
    };

    /**
     *
     * @param peripheral
     * @param context
     */
    BluetoothConnector.prototype.listenDevice = function (peripheral, context) {
        peripheral.discoverSomeServicesAndCharacteristics(SERVICE_UUIDS, CHARACTERISTIC_UUIDS, function (error, services, characteristics) {
            characteristics.forEach(function (characteristic) {
                switch (characteristic.uuid) {
                    case DATA_CHARACTERISTIC_UUID:
                        characteristic.read(function (error, data) {
                            context.parseData(peripheral, data);
                        });
                        break;
                    case FIRMWARE_CHARACTERISTIC_UUID:
                        characteristic.read(function (error, data) {
                            context.parseFirmwareData(peripheral, data);
                        });
                        break;
                    case REALTIME_CHARACTERISTIC_UUID:
                        characteristic.write(REALTIME_META_VALUE, true);
                        break;
                    default:
                        debug('Unknown characteristic uuid: ', characteristic.uuid);
                }
            });
        });
    };

    /**
     *
     * @param peripheral
     * @param data
     */
    BluetoothConnector.prototype.parseData = function (peripheral, data) {
        this.temperature = data.readUInt16LE(0) / 10;
        this.lux = data.readUInt32LE(3);
        this.moisture = data.readUInt16BE(6);
        this.fertility = data.readUInt16LE(8);
    };

    /**
     *
     * @param peripheral
     * @param data
     */
    BluetoothConnector.prototype.parseFirmwareData = function (peripheral, data) {
        this.firmware = {
            deviceId: peripheral.id,
            batteryLevel: parseInt(data.toString('hex', 0, 1), 16),
            firmwareVersion: data.toString('ascii', 2, data.length)
        };
    };

    /**
     *
     */
    BluetoothConnector.prototype.startScanning = function () {
        if (this.noble.state === 'poweredOn') {
            this.noble.startScanning([], true);
        } else {
            this.noble.on('stateChange', function (state) {
                if (state === 'poweredOn') {
                    this.noble.startScanning([], true);
                }
            });
        }
    };

    BluetoothConnector.prototype.stopScanning = function () {
        this.noble.stopScanning();
    };
}

