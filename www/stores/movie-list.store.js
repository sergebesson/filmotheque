// @ts-check
import { callApiBackend } from "../common/call-api-backend.js";
import { reactive } from "vue";

import { eventBus, eventName } from "../eventBus.js";
import { configurationStore } from "./configuration.store.js";
import { infosStore } from "./infos.store.js";

/**
 * @typedef {object} SearchList
 * @property {{search: string, loading: boolean}} state
 * @property {(search: string) => Promise<void>} setSearch
 */

/**
 * Singleton de liste : lectures réactives dans state, configuration dans configuration.
 * Les consommateurs écrivent via les actions, jamais directement dans state.
 * Toutes les actions renvoient Promise<void> ; les erreurs HTTP sont affichées via ERROR
 * et consommées. Attendre une action n'implique ni succès ni priorité sur les autres requêtes.
 */
const movieListStore = {
	configuration: {
		get pageSize() { return configurationStore.getValue("pageSize", 30); },
		apiUrl: "api/movies",
		apiMethod: "get",

	},
	state: reactive({
		page: 1,
		totalPages: 1,
		search: "",
		movies: [],
		loading: false,
	}),
	/** Charge la page suivante, sauf pendant loading ou si la dernière page est atteinte. */
	async nextPage() {
		if (this.state.loading || this.state.page >= this.state.totalPages) {
			return;
		}
		await this.getMovies(this.state.page + 1);
	},
	/** @param {string} search Texte de recherche ; "" efface le filtre et recharge la page 1. */
	async setSearch(search) {
		this.state.search = search;
		await this.getMovies();
	},

	/** Remplace les films en page 1, concatène les pages suivantes ; conserve le filtre courant. */
	async getMovies(page = 1) {
		try {
			this.state.loading = true;
			/** @type {{page_size: number, page: number, sort: string, search?: string}} */
			const params = {
				page_size: this.configuration.pageSize,
				page,
				sort: "date-added",
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
			this.state.movies =
					this.state.page === 1 ? data.movies : this.state.movies.concat(data.movies);
			this.state.loading = false;
		} catch (error) {
			this.state.loading = false;
			eventBus.emit(eventName.ERROR, { message: "Impossible de récupérer la liste des films", error });
		}
	},

	/** Vide immédiatement les films et la recherche, puis charge tous les films en une requête. */
	async getAllMovies() {
		try {
			this.state.loading = true;
			this.state.movies = [];
			this.state.search = "";
			const params = {
				page_size: Math.max(1, infosStore.state.infos.number_of_movies ?? 0),
				page: 1,
				sort: "date-added",
			};
			const { data } = await callApiBackend({
				method: this.configuration.apiMethod, url: this.configuration.apiUrl, params,
			});
			this.state.page = data.page;
			this.state.totalPages = data.total_pages;
			this.state.movies = data.movies;
		} catch (error) {
			eventBus.emit(eventName.ERROR, { message: "Impossible de récupérer la liste des films", error });
		} finally {
			this.state.loading = false;
		}
	},
};

export { movieListStore };
