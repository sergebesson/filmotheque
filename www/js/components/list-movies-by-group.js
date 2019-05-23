"use strict";
/* global Vue,moment,axios,_ */

const listMoviesByGroup = {
	CONST: {
		nbOfMoviesShowedTheFirstTime: 30,
		nbOfMoviesAddedOnScroll: 30,
		debounceTimeToSearch: 1000,
		throttleTimeToScroll: 500,
		nbOfPixelsBeforeAddingToScroll: 10,
	},
};

Vue.component("listMoviesByGroup", {
	data: function () {
		return {
			moviesByGroup: {},
			moviesShownByGroup: {},
			search: "",
			loading: false,
		};
	},
	watch: {
		moviesByGroup: function () {
			this.listDateAddedNotShow = _.keys(this.moviesByGroup);
			this.moviesShownByGroup = {};
			this.updateList(listMoviesByGroup.CONST.nbOfMoviesShowedTheFirstTime);
		},
		search: _.debounce(function () {
			// eslint-disable-next-line no-invalid-this
			this.getMovies();
		}, listMoviesByGroup.CONST.debounceTimeToSearch),
	},
	filters: {
		dateAdded: (dateAdded) => {
			return moment(dateAdded).format("LL");
		},
	},
	created: function () {
		this.getMovies()
			.then(() => this.$emit("loaded"));
	},
	methods: {
		getMovies: function () {
			const params = { group_by: "dateAdded" };
			if (this.search !== "") {
				params.filter = this.search;
			}
			this.loading = true;
			return axios({ method: "get", url: "api/movies", params })
				.then(({ data }) => {
					this.moviesByGroup = data;
				})
				.catch((error) => {
					this.moviesByGroup = {};
					this.$emit(
						"error", "Impossible de récupérer la liste des films", error
					);
				})
				.then(() => {
					this.loading = false;
				});
		},
		onScroll: _.throttle(function (event) {
			const target = event.target;
			if (target.offsetHeight +
				target.scrollTop +
				listMoviesByGroup.CONST.nbOfPixelsBeforeAddingToScroll >= target.scrollHeight) {
				// eslint-disable-next-line no-invalid-this
				this.updateList(listMoviesByGroup.CONST.nbOfMoviesAddedOnScroll);
			}
		}, listMoviesByGroup.CONST.throttleTimeToScroll),
		updateList: function (addMax) {
			let nbMovies = 0;
			this.listDateAddedNotShow.some((group) => {
				this.$set(this.moviesShownByGroup, group, this.moviesByGroup[group]);
				this.listDateAddedNotShow = this.listDateAddedNotShow.slice(1);
				nbMovies += this.moviesByGroup[group].length;
				return nbMovies >= addMax;
			});
		},
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
						<div class="load" v-show="loading">
							<div />
						</div>
					</div>
					<md-list class="md-double-line md-dense" v-if="!_.isEmpty(moviesShownByGroup)" @scroll="onScroll">
						<transition-group name="list-movies-transition">
							<div v-for="(movies, dateAdded) in moviesShownByGroup"
								:key="dateAdded"
								class="list-movies-transition-item"
							>
								<md-subheader>{{ dateAdded | dateAdded }}</md-subheader>
								<transition-group name="list-movies-transition">
									<movie-item v-for="movie in _.sortBy(movies, 'title')"
										:key="movie._id"
										:movie="movie"
										class="list-movies-transition-item"
									/>
								</transition-group>
							</div>
						</transition-group>
					</md-list>
					<div v-else class="empty">Aucun film</div>
				</div>
			</div>
		</transition>
	`,
});
