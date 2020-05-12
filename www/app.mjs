/* global Vue,VueMaterial,location */

import { configurationStore } from "./configurationStore.mjs";
import { loaderComponent } from "./modules/loader/loader.mjs";
import { errorComponent } from "./modules/error/error.mjs";
import { flashComponent } from "./modules/flash/flash.mjs";
import { moviesSearchComponent } from "./modules/list-movies/components/movies-search.mjs";
import { listMoviesMovieComponent } from "./modules/list-movies/components/list-movies-movie.mjs";
import { listMoviesComponent } from "./modules/list-movies/list-movies.mjs";
import { filmothequeComponent } from "./modules/filmotheque/filmotheque.mjs";

Vue.use(VueMaterial.default);

Vue.component("loader", loaderComponent);
Vue.component("error", errorComponent);
Vue.component("flash", flashComponent);
Vue.component("movies-search", moviesSearchComponent);
Vue.component("list-movies-movie", listMoviesMovieComponent);
Vue.component("list-movies", listMoviesComponent);
Vue.component("filmotheque", filmothequeComponent);

async function main() {

	await configurationStore.load();

	// eslint-disable-next-line no-unused-vars
	const vm = new Vue({
		el: "#filmotheque",
		template: "<filmotheque />",
	});
}

main().catch(
	(error) => location.replace(`/error.html?message=${ error.message }`));
