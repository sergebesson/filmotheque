<script>
// @ts-check
import debounce from "lodash/debounce.js";

/** @typedef {import("../../../stores/movie-list.store.js").SearchList} SearchList */
/** @typedef {{ storeList: SearchList, search: string, searchInProgress: boolean, searchDebounced: import("lodash").DebouncedFunc<() => Promise<void>> }} SearchContext */

const debounceTimeToSearch = 1000;

export default {
	/**
	 * Singleton de liste lu via state.{search: string, loading: boolean}, jamais muté ici.
	 * setSearch(string): Promise<void> consomme les erreurs via ERROR ; délai de saisie 1000 ms.
	 * Au démontage, cancel annule le callback différé, pas une requête déjà partie.
	 */
	props: { storeList: { type: /** @type {import("vue").PropType<SearchList>} */ (Object), required: true } },
	data: () => ({ search: "", searchInProgress: false }),
	watch: {
		/** @this {SearchContext} */
		search() { this.searchDebounced(); },
		"storeList.state.loading"(loading) {
			this.searchInProgress = this.searchInProgress && loading;
		},
		"storeList.state.search"(storeSearch) {
			if (this.search !== storeSearch) { this.search = storeSearch; }
		},
	},
	/** @this {SearchContext} */
	created() {
		this.search = this.storeList.state.search;
		this.searchDebounced = debounce(async () => {
			if (this.search === this.storeList.state.search) { return; }
			this.searchInProgress = true;
			await this.storeList.setSearch(this.search);
		}, debounceTimeToSearch);
	},
	/** @this {SearchContext} */
	beforeUnmount() { this.searchDebounced.cancel(); },
};
</script>

<template>
	<div class="search">
		<v-text-field
			v-model.trim="search" label="Rechercher..." clearable hide-details autofocus
			:disabled="storeList.state.loading && !searchInProgress" @click:clear="search = ''"
		/>
		<spinner :animate="searchInProgress" />
	</div>
</template>

<style>
.search { position: relative; }
/* Pas de prop équivalente pour réserver la place au spinner dans l'input interne
 * sans changer la largeur/position des icônes ou la zone de saisie. */
.search .v-field__input { min-width: 88px; padding-right: 30px; }
.search .spinner { position: absolute; bottom: 4px; pointer-events: none; }
</style>
