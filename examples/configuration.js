module.exports = {
    label: "Roof Deck",
    id: "roofDeck",
    autoDiscoveryDeviceTypes: [/*{
        plugin: 'xiaomi-smart-plant-monitor/plantMonitor',
        confirmRegistration: false,
        persistRegistration: false,
        defaultConfiguration: {},
        options: {}
    }*/],
    devices: [{
        label: "Plant Sensor Rhododendron",
        id: "plantMonitorRhododendron",
        plugin: "xiaomi-smart-plant-monitor/plantMonitor",
        configuration: {macAddress: 'c4:7c:8d:66:ca:94'},
        actors: [],
        sensors: []
    }],
    groups: [],
    services: [],
    eventProcessors: [],
    data: []
};
