import { callApiBackend } from "../common/call-api-backend.js";
import { reactive } from "vue";

import { eventBus, eventName } from "../eventBus.js";

const infosStore = {
	state: reactive({
		show: false,
		/** @type {{number_of_movies?: number}} */
		infos: {},
	}),

	get show() {
		return this.state.show;
	},
	set show(show) {
		this.state.show = Boolean(show);
	},
	showFlash() {
		this.state.show = true;
	},
	get infos() {
		return this.state.infos;
	},
	async loadInfos() {
		try {
			const { data } = await callApiBackend({ method: "get", url: "api/infos" });
			this.state.infos = data;
		} catch (error) {
			eventBus.emit(eventName.ERROR, {
				message: "Impossible de récupérer les informations de l'api", error,
			});
		}
	},
};

export { infosStore };
