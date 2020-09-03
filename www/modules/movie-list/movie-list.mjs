/* global moment,_ */

import { movieListStore } from "../../stores/movie-list.store.mjs";

const movieListComponent = {
	data: () => ({
		movieListStore,
	}),
	computed: {
		moviesByGroup: function () {
			return _.groupBy(this.movieListStore.movies, "date_added");
		},
	},
	filters: {
		dateAddedFilter: (dateAdded) => {
			return moment(dateAdded).format("LL");
		},
	},
	created: async function () {
		if (this.movieListStore.movies.length === 0) {
			await this.movieListStore.getMovies();
		}
	},
	template: `
		<transition name="fade">
			<div class="movie-list">
				<div v-if="_.isEmpty(moviesByGroup) && !movieListStore.loading" class="empty">
					Aucun film
				</div>
				<infinite-list :store-list="movieListStore" class="md-double-line md-dense" v-else>
					<div v-for="(groupMovies, dateAdded) in moviesByGroup"
						:key="'key-' + dateAdded"
						class="infinite-list-transition-item"
					>
						<md-subheader>{{ dateAdded | dateAddedFilter }}</md-subheader>
						<transition-group name="infinite-list-transition">
							<movie-list-item v-for="movie in groupMovies"
								:key="movie._id"
								:movie="movie"
								class="infinite-list-transition-item"
							/>
						</transition-group>
					</div>
				</infinite-list>
			</div>
		</transition>
	`,
};

export { movieListComponent };
