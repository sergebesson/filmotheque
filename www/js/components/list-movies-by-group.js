"use strict";
/* global Vue,moment,axios,_ */

const listMoviesByGroup = {
	CONST: {
		pageSize: 30,
		debounceTimeToSearch: 1000,
		throttleTimeToScroll: 500,
		nbOfPixelsBeforeAddingToScroll: 10,
	},
};

Vue.component("listMoviesByGroup", {
	data: function () {
		return {
			page: 1,
			movies: [],
			search: "",
			loading: false,
			showLoadingScroll: true,
		};
	},
	computed: {
		moviesByGroup: function () {
			return _.groupBy(this.movies, (movie) =>
				moment(movie.dateAdded).set({
					hour: 0, minute: 0, second: 0, millisecond: 0,
				}).toISOString());
		},
	},
	watch: {
		search: _.debounce(function () {
			// eslint-disable-next-line no-invalid-this
			this.initializeList();
		}, listMoviesByGroup.CONST.debounceTimeToSearch),
	},
	filters: {
		dateAddedFilter: (dateAdded) => {
			return moment(dateAdded).format("LL");
		},
	},
	created: function () {
		this.totalPages = 1;
		this.initializeList()
			.then(() => this.$emit("loaded"));
	},
	methods: {
		initializeList: function () {
			this.page = 1;
			return this.getMovies();
		},
		nextPage: function () {
			if (this.page >= this.totalPages) {
				return Promise.resolve();
			}

			this.page++;
			return this.getMovies();
		},
		getMovies: function () {
			const params = {
				page_size: listMoviesByGroup.CONST.pageSize,
				page: this.page,
				sort: "date-added",
				search: this.search,
			};
			this.loading = true;
			return axios({ method: "get", url: "api/movies", params })
				.then(({ data }) => {
					this.totalPages = data.total_pages;
					this.movies = this.page === 1 ? data.movies : this.movies.concat(data.movies);
				})
				.catch((error) => {
					this.$emit(
						"error", "Impossible de récupérer la liste des films", error
					);
				})
				.then(() => {
					this.loading = false;
					this.showLoadingScroll = this.page < this.totalPages;
				});
		},
		onScroll: _.throttle(function (event) {
			const target = event.target;
			if (target.offsetHeight +
				target.scrollTop +
				listMoviesByGroup.CONST.nbOfPixelsBeforeAddingToScroll >= target.scrollHeight) {
				// eslint-disable-next-line no-invalid-this
				this.nextPage();
			}
		}, listMoviesByGroup.CONST.throttleTimeToScroll),
	},
	template: `
		<transition name="fade">
			<div class="content list-movies">
				<div class="md-elevation-10">
					<div class="search">
						<md-field md-inline md-clearable>
							<label>Rechercher...</label>
							<md-input v-model="search" autofocus></md-input>
						</md-field>
						<div class="load" v-show="loading && page === 1"><div /></div>
					</div>
					<md-list class="md-double-line md-dense" v-if="!_.isEmpty(moviesByGroup)" @scroll="onScroll">
						<transition-group name="list-movies-transition">
							<div v-for="(groupMovies, dateAdded) in moviesByGroup"
								:key="dateAdded"
								class="list-movies-transition-item"
							>
								<md-subheader>{{ dateAdded | dateAddedFilter }}</md-subheader>
								<transition-group name="list-movies-transition">
									<movie-item v-for="movie in groupMovies"
										:key="movie._id"
										:movie="movie"
										class="list-movies-transition-item"
									/>
								</transition-group>
							</div>
						</transition-group>
						<div class="load-scroll"
							v-bind:class="{ animation: loading }"
							v-if="showLoadingScroll"
						><div /></div>
					</md-list>
					<div v-else class="empty">Aucun film</div>
				</div>
			</div>
		</transition>
	`,
});
