<script>
import { movieListStore } from "../../../stores/movie-list.store.js";
import MovieListButtonAll from "./movie-list-button-all.vue";
export default {
	components: { MovieListButtonAll },
	data: () => ({ movieListStore }),
};
</script>

<template>
	<div class="movie-list-tools-bar tools-bar">
		<search class="tools-bar-flex1" :store-list="movieListStore" />
		<movie-list-button-all />
	</div>
</template>
