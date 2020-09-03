/* global VueRouter */

import { meStore } from "../../stores/me.store.mjs";

import { movieListToolsBarComponent } from "../movie-list/components/movie-list-tools-bar.mjs";
import { userToolsBarComponent } from "../users/components/user-tools-bar.mjs";

import { movieListComponent } from "../../modules/movie-list/movie-list.mjs";
import { usersComponent, usersRouter } from "../users/users.mjs";

const router = new VueRouter({
	routes: [ {
		name: "home",
		path: "/",
		redirect: "/movies",
	}, {
		name: "movies",
		path: "/movies",
		components: {
			"tools-bar": movieListToolsBarComponent,
			main: movieListComponent,
		},
	}, {
		name: "users",
		path: "/users",
		components: {
			"tools-bar": userToolsBarComponent,
			main: usersComponent,
		},
		children: usersRouter,
	} ],
});

// eslint-disable-next-line no-unused-vars
const filmothequeComponent = {
	data: () => ({
		meStore,
	}),
	router,
	template: `
		<div class="filmotheque">
			<loader v-if="!meStore.name" />
			<error />
			<flash />

			<div class="content" v-show="meStore.name">
				<div class="md-elevation-10">
					<div class="md-layout header">
						<div class="md-layout-item" v-show="meStore.isAdmin"><navigation /></div>
						<div class="md-layout-item"><router-view name="tools-bar" /></div>
						<div class="md-layout-item"><profile /></div>
					</div>
					<router-view name="main" />
				</div>
			</div>
		</div>
		`,
};

export { filmothequeComponent };
