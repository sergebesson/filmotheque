<script>
import groupBy from "lodash/groupBy.js";
import MovieListItem from "./components/movie-list-item.vue";
import { movieListStore } from "../../stores/movie-list.store.js";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default {
	components: { MovieListItem },
	data: () => ({ movieListStore }),
	computed: {
		moviesByGroup() { return groupBy(this.movieListStore.state.movies, "date_added"); },
	},
	async created() {
		if (this.movieListStore.state.movies.length === 0) { await this.movieListStore.getMovies(); }
	},
	methods: {
		// L'API fournit une date sans heure : minuit local, pas minuit UTC.
		dateAddedFilter(dateAdded) { return dateFormat.format(new Date(`${dateAdded}T00:00:00`)); },
	},
};
</script>

<template>
	<div class="movie-list">
		<div v-if="movieListStore.state.movies.length === 0 && !movieListStore.state.loading" class="empty">Aucun film</div>
		<infinite-list v-else :store-list="movieListStore">
			<div v-for="(groupMovies, dateAdded) in moviesByGroup" :key="dateAdded" class="infinite-list-transition-item">
				<div class="list-subheader">{{ dateAddedFilter(dateAdded) }}</div>
				<transition-group name="infinite-list-transition" tag="div">
					<movie-list-item v-for="movie in groupMovies" :key="movie._id" :movie="movie" class="infinite-list-transition-item" />
				</transition-group>
			</div>
		</infinite-list>
	</div>
</template>

<style>
.movie-list { flex: 1; min-height: 0; overflow: hidden; }
.movie-list .infinite-list { height: 100%; }
/* Géométrie historique et fondu du fond de ligne (distinct de l'overlay Vuetify). */
.movie-list .v-list-item { margin-left: 16px; padding: 4px 16px; min-height: 50px; transition: background-color .5s; }
.movie-list .v-list-item:hover { background-color: var(--filmotheque-over-background); }
.movie-list-item-text { display: flex; flex-direction: column; min-width: 0; }
.movie-list .titre, .movie-list .file { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.movie-list .titre { font-size: 13px; font-weight: bold; }
.movie-list .file { font-size: 13px; font-size-adjust: .4; color: var(--filmotheque-text-muted); }
.movie-list .list-action { display: flex; padding-right: 10px; }
.movie-list .v-btn { margin: 0 -10px 0 0; background-size: 24px; background-position: center; }
.movie-list .themoviedb { background-image: url("images/themoviedb.ico"); }
.movie-list .allocine { background-image: url("images/allocine.ico"); }
.movie-list .imdb { background-image: url("images/imdb.ico"); }
.movie-list .empty { padding: 0 16px; font-size: 1.5em; font-weight: bold; }
</style>
