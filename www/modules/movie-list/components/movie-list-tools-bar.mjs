
import { movieListStore } from "../../../stores/movie-list.store.mjs";

const movieListToolsBarComponent = {
	data: () => ({
		movieListStore,
	}),
	template: `
		<div class="tools-bar">
			<search :store-list="movieListStore" />
		</div>
	`,
};

export { movieListToolsBarComponent };
