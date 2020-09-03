/* global axios */

import { eventBus, eventName } from "../eventBus.mjs";

const flashStore = {
	state: {
		show: false,
		infos: {},
	},

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
			const { data } = await axios({ method: "get", url: "api/infos" });
			this.state.infos = data;
		} catch (error) {
			eventBus.$emit(
				eventName.ERROR, "Impossible de récupérer les informations de l'api", error,
			);
		}
	},
};

export { flashStore };
