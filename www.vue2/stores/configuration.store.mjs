/* global axios,_ */

import { eventBus, eventName } from "../eventBus.mjs";

const configurationStore = {
	state: {
		configuration: {},
	},
	getValue(fromPath, defaultValue) {
		return _.cloneDeep(_.get(this.state.configuration, fromPath, defaultValue));
	},
	async load() {
		const { data } = await axios({
			method: "get", url: "configuration",
		});
		this.state.configuration = data;
		eventBus.$emit(eventName.CONFIGURATION_LOADED);
	},
};

export { configurationStore };
