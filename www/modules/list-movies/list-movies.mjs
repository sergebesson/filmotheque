/* global moment,_ */

import { storeListMovies } from "./list-movies-store.mjs";

const throttleTimeToScroll = 50;
const nbOfPixelsBeforeAddingToScroll = 10;

const listMoviesComponent = {
	data: function () {
		return {
			storeListMovies,
		};
	},
	computed: {
		moviesByGroup: function () {
			return _.groupBy(this.storeListMovies.movies, "dateAdded");
		},
		showLoadingScroll: function () {
			return this.storeListMovies.page < this.storeListMovies.totalPages;
		},
	},
	filters: {
		dateAddedFilter: (dateAdded) => {
			return moment(dateAdded).format("LL");
		},
	},
	created: function () {
		this.storeListMovies.getMovies()
			.then(() => this.$emit("loaded"));
	},
	methods: {
		onScroll: _.throttle(function (event) {
			const target = event.target;
			if (target.offsetHeight +
				target.scrollTop +
				nbOfPixelsBeforeAddingToScroll >= target.scrollHeight) {
				// eslint-disable-next-line no-invalid-this
				this.storeListMovies.nextPage();
			}
		}, throttleTimeToScroll),
	},
	template: `
		<transition name="fade">
			<div class="list-movies">
				<movies-search />
				<md-list class="md-double-line md-dense" v-if="!_.isEmpty(moviesByGroup)" @scroll="onScroll">
					<transition-group name="list-movies-transition">
						<div v-for="(groupMovies, dateAdded) in moviesByGroup"
							:key="'key-' + dateAdded"
							class="list-movies-transition-item"
						>
							<md-subheader>{{ dateAdded | dateAddedFilter }}</md-subheader>
							<transition-group name="list-movies-transition">
								<list-movies-movie v-for="movie in groupMovies"
									:key="movie._id"
									:movie="movie"
									class="list-movies-transition-item"
								/>
							</transition-group>
						</div>
					</transition-group>
					<div class="load-scroll"
						v-bind:class="{ animation: storeListMovies.loading }"
						v-if="showLoadingScroll"
					><div /></div>
				</md-list>
				<div v-else class="empty">Aucun film</div>
			</div>
		</transition>
	`,
};

export { listMoviesComponent };
