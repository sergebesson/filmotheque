
import { movieListStore } from "../../../stores/movie-list.store.mjs";

const movieListToolsBarComponent = {
	data: () => ({
		movieListStore,
	}),
	template: `
		<div class="movie-list-tools-bar tools-bar">
			<search class="tools-bar-flex1" :store-list="movieListStore" />
			<movie-list-button-all />
		</div>
	`,
};

export { movieListToolsBarComponent };
