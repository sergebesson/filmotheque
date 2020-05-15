/* global axios */

import { eventBus, eventName } from "../eventBus.mjs";
import { configurationStore } from "./configuration.store.mjs";

// eslint-disable-next-line no-unused-vars
const userListStore = {
	configuration: {
		pageSize: 30,
		apiUrl: "api/users",
		apiMethod: "get",
	},
	state: {
		page: 1,
		totalPages: 1,
		search: "",
		users: [],
		loading: false,
		updating: false,
	},
	// page
	get page() {
		return this.state.page;
	},
	async nextPage() {
		if (this.state.loading || this.state.page >= this.state.totalPages) {
			return;
		}
		await this.getUsers(this.state.page + 1);
	},
	// total pages
	get totalPages() {
		return this.state.totalPages;
	},
	// search
	get search() {
		return this.state.search;
	},
	set search(search) {
		this.state.search = search;
		this.getUsers();
	},
	// users
	get users() {
		return this.state.users;
	},
	// pageSize
	get pageSize() {
		return this.configuration.pageSize;
	},
	// loading
	get loading() {
		return this.state.loading;
	},
	// updating
	get updating() {
		return this.state.updating;
	},

	// Méthode
	async getUsers(page = 1) {
		try {
			this.state.loading = true;
			const params = {
				page_size: this.pageSize,
				page,
			};
			if (this.state.search !== "") {
				params.search = this.state.search;
			}
			const { data, config: { params: { search = "" } } } = await axios({
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
		} catch (error) {
			eventBus.$emit(eventName.ERROR, "Impossible de récupérer la liste des utilisateurs", error);
		} finally {
			this.state.loading = false;
		}
	},

	async update() {
		this.state.updating = true;
		try {
			const params = {
				page: 1,
				page_size: this.state.page * this.pageSize,
			};
			if (this.state.search !== "") {
				params.search = this.state.search;
			}
			const { data: { total_users: totalUsers, users } } = await axios({
				method: this.configuration.apiMethod, url: this.configuration.apiUrl, params,
			});

			this.state.page = Math.ceil(users.length / this.pageSize);
			this.state.totalPages = Math.ceil(totalUsers / this.pageSize);
			this.state.users = users;
		} finally {
			this.state.updating = false;
		}
	},
};

eventBus.$on(eventName.CONFIGURATION_LOADED, () => {
	userListStore.configuration.pageSize = configurationStore
		.getValue("pageSize", userListStore.configuration.pageSize);
});

export { userListStore };
