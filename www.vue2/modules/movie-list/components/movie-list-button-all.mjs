import { movieListStore } from "../../../stores/movie-list.store.mjs";

const movieListButtonAllComponent = {
	props: {
		tooltipDelay: { type: Number, default: 500 },
		tooltipDirection: { type: String, default: "bottom" },
	},
	data: () => ({
		movieListStore,
	}),
	template: `
		<md-button class="md-icon-button" @click="movieListStore.getAllMovies()" :disabled="movieListStore.loading">
			<md-icon>download</md-icon>
			<md-tooltip :md-delay="tooltipDelay" :md-direction="tooltipDirection">tout charger</md-tooltip>
		</md-button>
	`,
};

export { movieListButtonAllComponent };
