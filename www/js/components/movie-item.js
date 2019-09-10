"use strict";
/* global Vue,byteSize,window */

Vue.component("movieItem", {
	props: [ "movie" ],
	filters: {
		"byte-size": function (bytes) {
			const { value: size, unit } = byteSize(bytes, { units: "iec_octet", precision: 2 });
			return `${size} ${unit}`;
		},
	},
	methods: {
		open: function (site, target) {
			let url = "";
			switch (site) {
				case "themoviedb":
					url = `https://www.themoviedb.org/movie/${ this.movie.idTheMovieDb }?language=fr`;
					break;

				case "allocine":
					url = `http://www.allocine.fr/film/fichefilm_gen_cfilm=${ this.movie.idAlloCine }.html`;
					break;

				case "imdb":
					url = `https://www.imdb.com/title/${ this.movie.idImdb }`;
					break;

				default:
					return;
			}
			window.open(url, target || site);
		},
	},
	template: `
		<div>
			<md-list-item @click="$refs.download.click()">
				<div class="md-list-item-text">
					<span class="titre">{{ movie.title }}</span>
					<span class="file">{{ movie.fileName }} - {{ movie.size | byte-size }}</span>
				</div>

				<div class="md-list-action">
					<md-button
						class="md-icon-button themoviedb"
						@click.stop="open('themoviedb')"
						@auxclick.stop.prevent="open('themoviedb', '_blank')"
					/>
					<md-button
						class="md-icon-button allocine"
						@click.stop="open('allocine')"
						@auxclick.stop.prevent="open('allocine', '_blank')"
					/>
					<md-button
						class="md-icon-button imdb"
						@click.stop="open('imdb')"
						@auxclick.stop.prevent="open('imdb', '_blank')"
					/>
				</div>
			</md-list-item>
			<a ref="download" :href="'/api/download/' + movie._id" style="display:none" />
			<md-divider />
		</div>
	`,
});
