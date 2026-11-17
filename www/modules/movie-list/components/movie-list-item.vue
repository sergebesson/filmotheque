<script>
import byteSize from "byte-size";

export default {
	props: { movie: { type: Object, required: true } },
	methods: {
		byteSize(bytes) {
			const { value: size, unit } = byteSize(bytes, { units: "iec_octet", precision: 2 });
			return `${size} ${unit}`;
		},
		open(site, target) {
			let url = "";
			switch (site) {
				case "themoviedb": url = `https://www.themoviedb.org/movie/${this.movie.themoviedb_id}?language=fr`; break;
				case "allocine": url = `http://www.allocine.fr/film/fichefilm_gen_cfilm=${this.movie.allocine_id}.html`; break;
				case "imdb": url = `https://www.imdb.com/title/${this.movie.imdb_id}`; break;
				default: return;
			}
			window.open(url, target || site);
		},
		getUrlDownload(id) { return `/api/movies/${id}/download`; },
	},
};
</script>

<template>
	<div role="listitem">
		<v-list-item class="movie-list-item" @click="$refs.download.click()">
			<div class="movie-list-item-text">
				<span class="titre">{{ movie.title }}</span>
				<span class="file">{{ movie.file_name }} - {{ byteSize(movie.size) }}</span>
			</div>
			<template #append>
				<div class="list-action">
					<v-btn icon class="themoviedb" aria-label="The Movie Database" @click.stop="open('themoviedb')" @auxclick.stop.prevent="open('themoviedb', '_blank')">
						<v-tooltip activator="parent" :open-delay="500" location="right">The Movie Database</v-tooltip>
					</v-btn>
					<v-btn icon class="allocine" aria-label="AlloCiné" @click.stop="open('allocine')" @auxclick.stop.prevent="open('allocine', '_blank')">
						<v-tooltip activator="parent" :open-delay="500" location="right">AlloCiné</v-tooltip>
					</v-btn>
					<v-btn icon class="imdb" aria-label="IMDb" @click.stop="open('imdb')" @auxclick.stop.prevent="open('imdb', '_blank')">
						<v-tooltip activator="parent" :open-delay="500" location="right">IMDb</v-tooltip>
					</v-btn>
				</div>
			</template>
		</v-list-item>
		<a ref="download" :href="getUrlDownload(movie._id)" hidden :download="movie.file_name" />
		<v-divider />
	</div>
</template>
