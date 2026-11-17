import { createRouter, createWebHashHistory } from "vue-router";
import MovieList from "./modules/movie-list/movie-list.vue";
import MovieListToolsBar from "./modules/movie-list/components/movie-list-tools-bar.vue";

const Users = () => import("./modules/users/users.vue");
const UserToolsBar = () => import("./modules/users/components/user-tools-bar.vue");
const UserDetail = () => import("./modules/users/components/user-detail.vue");

const router = createRouter({
	history: createWebHashHistory(),
	routes: [{
		name: "home", path: "/", redirect: "/movies",
	}, {
		name: "movies", path: "/movies",
		components: { "tools-bar": MovieListToolsBar, main: MovieList },
	}, {
		name: "users", path: "/users", redirect: { name: "users-list" },
		components: { "tools-bar": UserToolsBar, main: Users },
		children: [{
			name: "users-list", path: "list",
		}, {
			name: "users-edit", path: "edit/:name", component: UserDetail, props: true,
		}, {
			name: "users-create", path: "create", component: UserDetail, props: { createMode: true },
		}],
	}],
});

export { router };
