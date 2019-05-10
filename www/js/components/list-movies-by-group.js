"use strict";
/* global Vue,moment,window,axios,_ */

Vue.component("listMoviesByGroup", {
	data: function () {
		return {
			moviesShownByGroup: {},
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
			return axios({
				method: "get",
				url: "api/movies",
				params: { group_by: "dateAdded" },
			})
				.then(({ data }) => {
					this.moviesByGroup = data;
					this.listDateAddedNotShow = _.keys(this.moviesByGroup);
					this.updateList();
				});
		},
		onScroll: function (event) {
			const target = event.target;
			if ((target.offsetHeight + target.scrollTop) >= target.scrollHeight) {
				this.updateList();
			}
		},
		updateList: function () {
			let nbMovies = 0;
			this.listDateAddedNotShow.some((group) => {
				this.$set(this.moviesShownByGroup, group, this.moviesByGroup[group]);
				this.listDateAddedNotShow = this.listDateAddedNotShow.slice(1);
				nbMovies += this.moviesByGroup[group].length;
				return nbMovies >= 30;
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
			<div class="content list-movies" @scroll="onScroll">
				<md-list
					class="md-double-line md-elevation-10 md-dense"
					v-if="!_.isEmpty(moviesShownByGroup)"
				>
					<div v-for="(movies, dateAdded) in moviesShownByGroup">
						<md-subheader>{{ dateAdded | dateAdded }}</md-subheader>
						<movie-item v-for="movie in _.sortBy(movies, 'title')"
							:key="movie._id"
							:movie="movie"
							@download="download"
							@open="open"
						/>
					</div>
				</md-list>
				<div v-else class="empty">Aucun film</div>
			</div>
		</transition>
	`,
});
