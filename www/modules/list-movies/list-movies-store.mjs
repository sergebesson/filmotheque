/* global axios */

import { eventBus } from "../../eventBus.mjs";
import { configurationStore } from "../../configurationStore.mjs";

// eslint-disable-next-line no-unused-vars
const storeListMovies = {
	configuration: {
		pageSize: 30,
		apiUrl: "api/movies",
		apiMethod: "get",

	},
	state: {
		page: 1,
		totalPages: 1,
		search: "",
		movies: [],
		loading: false,
	},
	// page
	get page() {
		return this.state.page;
	},
	async nextPage() {
		if (this.state.loading || this.state.page >= this.state.totalPages) {
			return;
		}
		await this.getMovies(this.state.page + 1);
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
		this.getMovies();
	},
	// movies
	get movies() {
		return this.state.movies;
	},
	// loading
	get loading() {
		return this.state.loading;
	},
	// pageSize
	get pageSize() {
		return this.configuration.pageSize;
	},

	// Méthode
	async getMovies(page = 1) {
		try {
			const params = {
				page_size: this.configuration.pageSize,
				page,
				sort: "date-added",
				search: this.state.search,
			};
			this.state.loading = true;
			const { data, config: { params: { search } } } = await axios({
				method: this.configuration.apiMethod, url: this.configuration.apiUrl, params,
			});
			if (search !== this.state.search) {
				/* search a été modifié pendant la requête, on ne tient pas compte de cette requête
				   et on reste en loading */
				return;
			}
			this.state.page = data.page;
			this.state.totalPages = data.total_pages;
			this.state.movies =
					this.state.page === 1 ? data.movies : this.state.movies.concat(data.movies);
			this.state.loading = false;
		} catch (error) {
			eventBus.$emit("error", "Impossible de récupérer la liste des films", error);
			this.state.loading = false;
		}
	},
};

eventBus.$on("configuration-loaded", () => {
	storeListMovies.configuration.pageSize = configurationStore
		.getValue("pageSize", storeListMovies.configuration.pageSize);
});

export { storeListMovies };
