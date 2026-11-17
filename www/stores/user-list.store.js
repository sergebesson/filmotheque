import { callApiBackend } from "../common/call-api-backend.js";
import { reactive } from "vue";

import { eventBus, eventName } from "../eventBus.js";
import { configurationStore } from "./configuration.store.js";

/**
 * Singleton de liste : lectures réactives dans state, configuration dans configuration.
 * Les consommateurs écrivent via les actions, jamais directement dans state.
 * Toutes les actions renvoient Promise<void>. Les lectures consomment les erreurs HTTP
 * via ERROR ; update les propage au parent, sans émission. Pas de garantie de priorité entre requêtes.
 */
const userListStore = {
	configuration: {
		get pageSize() { return configurationStore.getValue("pageSize", 30); },
		apiUrl: "api/users",
		apiMethod: "get",
	},
	state: reactive({
		page: 1,
		totalPages: 1,
		search: "",
		users: [],
		loading: false,
		updating: false,
		updateFailed: false,
	}),
	/** Charge la page suivante, sauf pendant loading ou si la dernière page est atteinte. */
	async nextPage() {
		if (this.state.loading || this.state.page >= this.state.totalPages) {
			return;
		}
		await this.getUsers(this.state.page + 1);
	},
	/** @param {string} search Texte de recherche ; "" efface le filtre et recharge la page 1. */
	async setSearch(search) {
		this.state.search = search;
		await this.getUsers();
	},

	/** Remplace les utilisateurs en page 1, concatène les pages suivantes ; conserve le filtre. */
	async getUsers(page = 1) {
		try {
			this.state.loading = true;
			const params = {
				page_size: this.configuration.pageSize,
				page,
			};
			if (this.state.search !== "") {
				params.search = this.state.search;
			}
			const { search = "" } = params;
			const { data } = await callApiBackend({
				method: this.configuration.apiMethod, url: this.configuration.apiUrl, params,
			});
			if (search !== this.state.search) {
				/* search a été modifié pendant la requête, on ne tient pas compte de cette requête
				   et on reste en loading */
				return;
			}
			this.state.page = data.page;
			this.state.totalPages = data.total_pages;
			this.state.users =
					this.state.page === 1 ? data.users : this.state.users.concat(data.users);
			if (this.state.page === 1) { this.state.updateFailed = false; }
		} catch (error) {
			eventBus.emit(eventName.ERROR, { message: "Impossible de récupérer la liste des utilisateurs", error });
		} finally {
			this.state.loading = false;
		}
	},

	/**
	 * Rafraîchit les pages déjà chargées après mutation. Rejette sans ERROR : users.vue
	 * possède l'attente et la présentation ; updateFailed signale la liste conservée,
	 * y compris après navigation. Une lecture remplaçant la liste retire ce signal.
	 * updating est libéré même en cas de rejet.
	 */
	async update() {
		this.state.updating = true;
		try {
			const params = {
				page: 1,
				page_size: this.state.page * this.configuration.pageSize,
			};
			if (this.state.search !== "") {
				params.search = this.state.search;
			}
			const { data: { total_users: totalUsers, users } } = await callApiBackend({
				method: this.configuration.apiMethod, url: this.configuration.apiUrl, params,
			});

			this.state.page = Math.ceil(users.length / this.configuration.pageSize);
			this.state.totalPages = Math.ceil(totalUsers / this.configuration.pageSize);
			this.state.users = users;
			this.state.updateFailed = false;
		} catch (error) {
			this.state.updateFailed = true;
			throw error;
		} finally {
			this.state.updating = false;
		}
	},
};

export { userListStore };
