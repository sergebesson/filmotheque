/* global _ */

import { storeListMovies } from "../list-movies-store.mjs";

const debounceTimeToSearch = 1000;

const moviesSearchComponent = {
	data: function () {
		return {
			search: "",
			storeListMovies,
			searchInProgress: false,
		};
	},
	watch: {
		search: _.debounce(function () {
			// eslint-disable-next-line no-invalid-this
			this.searchInProgress = true;
			// eslint-disable-next-line no-invalid-this
			this.storeListMovies.search = this.search;
		}, debounceTimeToSearch),
		"storeListMovies.loading": function (loading) {
			this.searchInProgress = this.searchInProgress && loading;
		},
	},
	template: `
		<div class="movies-search">
			<md-field md-inline md-clearable>
				<label>Rechercher...</label>
				<md-input v-model="search" autofocus></md-input>
			</md-field>
			<div class="load" v-show="searchInProgress"><div /></div>
		</div>
	`,
};

export { moviesSearchComponent };
