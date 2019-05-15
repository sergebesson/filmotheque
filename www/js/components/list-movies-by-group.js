"use strict";
/* global Vue,moment,window,axios,_ */

Vue.component("listMoviesByGroup", {
	data: function () {
		return {
			moviesShownByGroup: {},
			search: "",
		};
	},
	filters: {
		dateAdded: (dateAdded) => {
			return moment(dateAdded).format("LL");
		},
	},
	created: function () {
		this.getMovies()
			.then(() => this.$emit("loaded"))
			.catch((error) => this.$emit(
				"error", "Impossible de récupérer la liste des films", error
			));
	},
	methods: {
		getMovies: function () {
			const params = { group_by: "dateAdded" };
			if (this.search !== "") {
				params.filter = this.search;
			}
			return axios({
				method: "get",
				url: "api/movies",
				params,
			})
				.then(({ data }) => {
					this.moviesByGroup = data;
					this.listDateAddedNotShow = _.keys(this.moviesByGroup);
					this.moviesShownByGroup = {};
					this.updateList(100);
				});
		},
		onScroll: _.throttle(function (event) {
			const target = event.target;
			if ((target.offsetHeight + target.scrollTop) >= target.scrollHeight) {
				// eslint-disable-next-line no-invalid-this
				this.updateList(30);
			}
		}, 300),
		onInput: _.debounce(function () {
			// eslint-disable-next-line no-invalid-this
			this.getMovies();
		}, 500),
		updateList: function (addMax) {
			let nbMovies = 0;
			this.listDateAddedNotShow.some((group) => {
				this.$set(this.moviesShownByGroup, group, this.moviesByGroup[group]);
				this.listDateAddedNotShow = this.listDateAddedNotShow.slice(1);
				nbMovies += this.moviesByGroup[group].length;
				return nbMovies >= addMax;
			});
		},
		download: function (movie) {
			window.open(`/api/download/${ movie._id }`);
		},
		open: function (site, movie) {
			let url = "";
			switch (site) {
				case "themoviedb":
					url = `https://www.themoviedb.org/movie/${ movie.idTheMovieDb }?language=fr`;
					break;

				case "allocine":
					url = `http://www.allocine.fr/film/fichefilm_gen_cfilm=${ movie.idAlloCine }.html`;
					break;

				case "imdb":
					url = `https://www.imdb.com/title/${ movie.idImdb }`;
					break;

				default:
					return;
			}
			window.open(url, site);
		},
	},
	template: `
		<transition name="fade">
			<div class="content list-movies">
				<div class="md-elevation-10">
					<div class="search">
						<md-field md-inline>
							<label>Rechercher...</label>
							<md-input v-model="search" @input="onInput"></md-input>
						</md-field>
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
										@download="download"
										@open="open"
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
