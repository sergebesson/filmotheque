"use strict";
/* global Vue,byteSize */

Vue.component("movieItem", {
	props: [ "movie" ],
	filters: {
		"byte-size": function (bytes) {
			const { value: size, unit } = byteSize(bytes, { units: "iec_octet", precision: 2 });
			return `${size} ${unit}`;
		},
	},
	template: `
		<div>
			<md-list-item @click="$emit('download', movie)">
				<div class="md-list-item-text">
					<span class="titre">{{ movie.title }}</span>
					<span class="file">{{ movie.fileName }} - {{ movie.size | byte-size }}</span>
				</div>

				<div class="md-list-action">
					<md-button
						class="md-icon-button"
						@click.stop="$emit('open', 'themoviedb', movie)"
					>
						<img src="../../images/themoviedb.png" />
					</md-button>
					<md-button
						class="md-icon-button"
						@click.stop="$emit('open', 'allocine', movie)"
					>
						<img src="../../images/allocine.ico" />
					</md-button>
					<md-button
						class="md-icon-button"
						@click.stop="$emit('open' ,'imdb', movie)"
					>
						<img src="../../images/imdb.ico" />
					</md-button>
				</div>
			</md-list-item>
			<md-divider />
		</div>
	`,
});
