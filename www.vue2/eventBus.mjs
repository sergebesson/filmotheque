/* global Vue */

const eventBus = new Vue();
const eventName = {
	ERROR: "error",
	CONFIGURATION_LOADED: "configurationStore:loaded",
};

export { eventBus, eventName };
