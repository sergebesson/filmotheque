import { callApiBackend } from "../common/call-api-backend.js";
import cloneDeep from "lodash/cloneDeep.js";
import get from "lodash/get.js";
import { reactive } from "vue";

const configurationStore = {
	state: reactive({
		configuration: {},
	}),
	getValue(fromPath, defaultValue) {
		return cloneDeep(get(this.state.configuration, fromPath, defaultValue));
	},
	async load() {
		const { data } = await callApiBackend({
			method: "get", url: "configuration",
		});
		this.state.configuration = data;
	},
};

export { configurationStore };
