import { callApiBackend } from "../common/call-api-backend.js";
import { reactive } from "vue";

import { eventBus, eventName } from "../eventBus.js";

const meStore = {
	state: reactive({
		me: {},
	}),

	get name() {
		return this.state.me.name;
	},
	get isAdmin() {
		return this.state.me.is_admin;
	},
	async loadMe() {
		try {
			const { data } = await callApiBackend({ method: "get", url: "/api/users/me" });
			this.state.me = data;
		} catch (error) {
			eventBus.emit(eventName.ERROR, {
				message: "Impossible de récupérer les informations de l'api (/api/users/me)", error,
			});
		}
	},
};

export { meStore };
