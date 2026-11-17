/* global axios */

import { eventBus, eventName } from "../eventBus.mjs";

const meStore = {
	state: {
		me: {},
	},

	get name() {
		return this.state.me.name;
	},
	get isAdmin() {
		return this.state.me.is_admin;
	},
	async loadMe() {
		try {
			const { data } = await axios({ method: "get", url: "/api/users/me" });
			this.state.me = data;
		} catch (error) {
			eventBus.$emit(
				eventName.ERROR, "Impossible de récupérer les informations de l'api (/api/users/me)", error,
			);
		}
	},
};

export { meStore };
