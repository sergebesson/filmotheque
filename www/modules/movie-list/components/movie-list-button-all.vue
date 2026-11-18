<script>
import { movieListStore } from "../../../stores/movie-list.store.js";
export default {
	props: {
		tooltipDelay: { type: Number, default: 500 },
		tooltipDirection: { type: String, default: "bottom" },
	},
	data: () => ({ movieListStore }),
};
</script>

<template>
	<v-btn icon aria-label="Tout charger" :disabled="movieListStore.state.loading" @click="movieListStore.getAllMovies()">
		<v-icon>download</v-icon>
		<v-tooltip activator="parent" :open-delay="tooltipDelay" :location="tooltipDirection">tout charger</v-tooltip>
	</v-btn>
</template>
