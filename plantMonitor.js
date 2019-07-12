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
            id: "humidity",
            label: "Humidity",
            type: {
                id: "decimal"
            }
        }, {
            id: "fertility",
            label: "Fertility",
            type: {
                id: "decimal"
            }
        }, {
            id: "rssi",
            label: "RSSI",
            type: {
                id: "decimal"
            }
        }, {
            id: "batteryLevel",
            label: "Battery Level",
            type: {
                id: "decimal"
            }
        }],
        services: [],
        configuration: [{
            id: "macAddress",
            label: "MAC Address",
            type: {
                id: "string"
            }
        }, {
            id: "name",
            label: "Name",
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
        if (this.node.isSimulated()) {
        } else {
            if (!this.bluetoothConnector) {
                this.bluetoothConnector = new BluetoothConnector().initialize();

                this.bluetoothConnector.on('peripheral', function (peripheral) {
                    var plantMonitor = new PlantMonitor();

                    plantMonitor.uuid = peripheral.address;
                    plantMonitor.configuration = {
                        macAddress: peripheral.address,
                        name: peripheral.advertisement.localName
                    };

                    this.advertiseDevice(plantMonitor);
                }.bind(this));

                this.bluetoothConnector.start();
            }
        }
    };

    PlantMonitorDiscovery.prototype.stop = function () {
        if (this.isSimulated()) {
        } else {
            if (this.bluetoothConnector) {
                this.bluetoothConnector.stop();
            }
        }
    };
}

/**
 *
 * @constructor
 */
function PlantMonitor() {
    PlantMonitor.prototype.start = function () {
        var deferred = q.defer();

        this.operationalState = {
            status: 'PENDING',
            message: 'Waiting for initialization...'
        };
        this.publishOperationalStateChange();

        this.state = {};

        if (this.isSimulated()) {
            console.log('Simulated!!!!');
            this.interval = setInterval(function () {
                this.state.illumination = 10000 + 1000 * new Date().getTime() % 4;
                this.state.temperature = 17 + new Date().getTime() % 10;
                this.state.humidity = 50 + 50 * new Date().getTime() % 50;
                this.state.fertility = 5 + 0.1 * new Date().getTime() % 2;

                this.publishStateChange();
            }.bind(this), 20000);

            this.operationalState = {
                status: 'OK',
                message: 'Plant Monitor successfully initialized'
            }
            this.publishOperationalStateChange();
            deferred.resolve();
        } else {
            if (!this.bluetoothConnector) {
                this.bluetoothConnector = new BluetoothConnector().initialize(this.configuration);

                this.bluetoothConnector.on('data', function (data) {
                    this.state.illumination = data.illumination;
                    this.state.temperature = data.temperature;
                    this.state.humidity = data.humidity;
                    this.state.fertility = data.fertility;

                    this.publishStateChange();
                }.bind(this));

                this.bluetoothConnector.start();

                if (this.operationalState.status !== 'ERROR') {
                    this.operationalState = {
                        status: 'OK',
                        message: 'Plant Monitor successfully initialized'
                    }
                    this.publishOperationalStateChange();          
                }      
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
            if (this.bluetoothConnector) {
                this.bluetoothConnector.stop();
            }
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

const DEFAULT_DEVICE_NAME = 'Flower care';
const UUID_SERVICE_XIAOMI = 'fe95';
const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);

const SERVICE_UUIDS = [DATA_SERVICE_UUID];
const CHARACTERISTIC_UUIDS = [DATA_CHARACTERISTIC_UUID, FIRMWARE_CHARACTERISTIC_UUID, REALTIME_CHARACTERISTIC_UUID];

/**
 *
 * @constructor
 */
function BluetoothConnector() {
    /**
     *
     * @param macAddress
     */
    BluetoothConnector.prototype.initialize = function (filter) {
        try {
            this.noble = require('noble');
            this.filter = filter;
            this.callbacks = {};

            this.noble.on('discover', function (peripheral) {
                this.discover(peripheral);
            }.bind(this));

        } catch (x) {            
            console.error(x);
            this.operationalState = {
                status: 'ERROR',
                message: 'Plant Monitor initialization error'
              }
              this.publishOperationalStateChange();
        }

        return this;
    };

    /**
     *
     * @param macAddress
     */
    BluetoothConnector.prototype.on = function (event, callback) {
        this.callbacks[event] = callback;
    };

    /**
     *
     * @param macAddress
     */
    BluetoothConnector.prototype.start = function () {
        if (this.noble.state === 'poweredOn') {
            this.noble.startScanning([UUID_SERVICE_XIAOMI], true);
        } else {
            this.noble.on('stateChange', function (state) {
                if (state === 'poweredOn') {
                    this.noble.startScanning([UUID_SERVICE_XIAOMI], true);
                }
            }.bind(this));
        }
    };

    /**
     *
     * @param peripheral
     */
    BluetoothConnector.prototype.discover = function (peripheral) {
        if (!peripheral.advertisement.serviceData || !peripheral.advertisement.serviceData.length ||
            peripheral.advertisement.serviceData[0].uuid != 'fe95') {

            return;
        }

        console.log('MAC: ', peripheral.address);
        // console.log('RSSI: ', peripheral.rssi);
        // console.log('Name: ', peripheral.advertisement);
        // console.log('Service data: ', peripheral.advertisement.serviceData);


        if (this.callbacks['peripheral']) {
            this.callbacks['peripheral'](peripheral);
        }

        if (!this.filter || this.filter.macAddress && this.filter.macAddress.toLowerCase() === peripheral.address.toLowerCase()) {

            this.connectDevice(peripheral);
        }
    };

    /**
     *
     * @param peripheral
     */
    BluetoothConnector.prototype.connectDevice = function (peripheral) {
        if (peripheral.state === 'disconnected') {
            peripheral.connect(function () {
                peripheral.discoverSomeServicesAndCharacteristics(SERVICE_UUIDS, CHARACTERISTIC_UUIDS, function (error, services, characteristics) {
                    characteristics.forEach(function (characteristic) {
                        switch (characteristic.uuid) {
                            case DATA_CHARACTERISTIC_UUID:
                                characteristic.read(function (error, data) {
                                    if (this.callbacks['data']) {
                                        console.log('Data =>', data);

                                        var BitArray = require('node-bitarray');

                                        console.log('Data =>', BitArray.fromBuffer(data).toString());

                                        this.callbacks['data']({
                                            temperature: data.readUInt16LE(0) / 10,
                                            illumination: data.readUInt32LE(3),
                                            humidity: data.readUInt16BE(6),
                                            fertility: data.readUInt16LE(8)
                                        });
                                    }
                                }.bind(this));
                                break;
                            case FIRMWARE_CHARACTERISTIC_UUID:
                                characteristic.read(function (error, data) {
                                    this.firmware = {
                                        deviceId: peripheral.id,
                                        batteryLevel: parseInt(data.toString('hex', 0, 1), 16),
                                        firmwareVersion: data.toString('ascii', 2, data.length)
                                    };
                                });
                                break;
                            case REALTIME_CHARACTERISTIC_UUID:
                                characteristic.write(REALTIME_META_VALUE, true);
                                break;
                            default:
                                console.log('Unknown characteristic uuid: ', characteristic.uuid);
                        }
                    }.bind(this));
                }.bind(this));
            }.bind(this));
            // peripheral.once('connect', function () {
            //     this.listenDevice(peripheral, this);
            // }.bind(this));
        }
    };

    BluetoothConnector.prototype.stop = function () {
        this.noble.stopScanning();
    };
}

 