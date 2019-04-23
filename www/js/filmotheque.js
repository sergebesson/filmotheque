/* global Vue,VueMaterial,document,axios,window,localStorage */
"use strict";

Vue.use(VueMaterial.default);

Vue.component("loader", {
	template: "#loader",
});

// eslint-disable-next-line no-unused-vars
const vm = new Vue({
	el: "#filmotheque",
	data: {
		films: {},
		ready: false,
		flash: {
			show: false,
			title: "",
			content: "",
		},
		alert: {
			show: false,
			title: "",
			content: "",
		},
	},
	created: function () {
		this.getFilms()
			.then(() => this.showFlash())
			.catch((error) => this.showAlert(
				"ERREUR", `Impossible de récupérer la liste des films <span>${ error.message }</span>`
			)).finally(() => {
				this.ready = true;
			});
	},
	mounted: function () {
		const loader = document.getElementById("loader");
		loader.parentNode.removeChild(loader);
	},
	methods: {
		getFilms: function () {
			return axios({
				method: "get",
				url: "api/films",
				params: { group_by: "dateAdded" },
			})
				.then(({ data }) => {
					this.films = data;
				});
		},
		download: function (film) {
			window.open(`/api/download/${ film._id }`);
		},
		open: function (site, film) {
			let url = "";
			switch (site) {
				case "themoviedb":
					url = `https://www.themoviedb.org/movie/${ film.idTheMovieDb }?language=fr`;
					break;

				case "allocine":
					url = `http://www.allocine.fr/film/fichefilm_gen_cfilm=${ film.idAlloCine }.html`;
					break;

				case "imdb":
					url = `https://www.imdb.com/title/${ film.idImdb }`;
					break;

				default:
					return;
			}
			window.open(url, site);
		},
		showAlert: function (title, content) {
			this.alert.title = title;
			this.alert.content = content;
			this.alert.show = true;
		},
		showFlash: function () {
			return axios({
				method: "get",
				url: "api/infos",
			})
				.then(({ data }) => {
					const lastVersion = localStorage.getItem("last_version") || "0.0.0";
					if (this.comparedVersion(data.version, lastVersion) > 0 && data.flash) {
						localStorage.setItem("last_version", data.version);
						this.flash.title = `Filmotheque version: ${ data.version }`;
						this.flash.content = data.flash;
						this.flash.show = true;
					}
				});
		},
		comparedVersion(version1, version2) {
			const [ major1, minor1, patch1 ] = version1.split(".");
			const [ major2, minor2, patch2 ] = version2.split(".");

			if (major1 !== major2) {
				return major1 > major2 ? 1 : -1;
			}
			if (minor1 !== minor2) {
				return minor1 > minor2 ? 1 : -1;
			}
			if (patch1 !== patch2) {
				return patch1 > patch2 ? 1 : -1;
			}

			return 0;
		},
	},
	template: `
		<div class="content" v-if="ready" v-show="!_.isEmpty(films)">
			<list-films-by-group
				:group-films="films"
				@download="download"
				@open="open"
			/>
			<md-dialog-alert class="flash"
				:md-active.sync="flash.show"
				:md-title="flash.title"
				:md-content="flash.content"
			/>
			<md-dialog-alert
				:md-active.sync="alert.show"
				:md-title="alert.title"
				:md-content="alert.content"
			/>
		</div>
		<loader v-else/>
	`,
});
