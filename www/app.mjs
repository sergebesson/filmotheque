/* global Vue,VueMaterial,location */

import { configurationStore } from "./stores/configuration.store.mjs";
import { loaderComponent } from "./modules/loader/loader.mjs";
import { errorComponent } from "./modules/error/error.mjs";

import { spinnerComponent } from "./modules/common/spinner/spinner.mjs";
import { infiniteListComponent } from "./modules/common/infinite-list/infinite-list.mjs";
import { searchComponent } from "./modules/common/search/search.mjs";
import { fieldVuelidateComponent } from "./modules/common/field-vuelidate/field-vuelidate.mjs";

import { flashComponent } from "./modules/flash/flash.mjs";
import { navigationComponent } from "./modules/navigation/navigation.mjs";
import { avatarComponent } from "./modules/avatar/avatar.mjs";
import { profileComponent } from "./modules/profile/profile.mjs";
import { movieListComponent } from "./modules/movie-list/movie-list.mjs";
import { movieListItemComponent } from "./modules/movie-list/components/movie-list-item.mjs";
import { userCreateComponent } from "./modules/users/components/user-create.mjs";
import { filmothequeComponent } from "./modules/filmotheque/filmotheque.mjs";

Vue.use(VueMaterial.default);

Vue.component("loader", loaderComponent);
Vue.component("error", errorComponent);
Vue.component("flash", flashComponent);

Vue.component("spinner", spinnerComponent);
Vue.component("infinite-list", infiniteListComponent);
Vue.component("search", searchComponent);
Vue.component("field-vuelidate", fieldVuelidateComponent);

Vue.component("navigation", navigationComponent);
Vue.component("avatar", avatarComponent);
Vue.component("profile", profileComponent);
Vue.component("movie-list", movieListComponent);
Vue.component("movie-list-item", movieListItemComponent);
Vue.component("user-create", userCreateComponent);
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
	(error) => location.replace(`/error.html?message=${ error.message }`),
);
