module.exports = {
    label: "Roof Deck",
    id: "roofDeck",
    autoDiscoveryDeviceTypes: [],
    devices: [{
        label: "Plant Sensor R",
        id: "plantMonitor1",
        plugin: "xiaomi-smart-plant-monitor/plantMonitor",
        configuration: {},
        actors: [],
        sensors: []
    }, {
        label: "pH Meter Tilapia II",
        id: "plantMonitor2",
        plugin: "xiaomi-smart-plant-monitor/plantMonitor",
        configuration: {},
        actors: [],
        sensors: []
    }, {
        label: "pH Meter Koi I",
        id: "plantMonitor3",
        plugin: "xiaomi-smart-plant-monitor/plantMonitor",
        configuration: {},
        actors: [],
        sensors: []
    }],
    groups: [],
    services: [],
    eventProcessors: [],
    data: []
};
