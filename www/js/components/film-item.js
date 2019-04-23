"use strict";
/* global Vue,byteSize */

Vue.component("filmItem", {
	props: [ "film" ],
	filters: {
		"byte-size": function (bytes) {
			const { value: size, unit } = byteSize(bytes, { units: "iec_octet", precision: 2 });
			return `${size} ${unit}`;
		},
	},
	template: `
		<div>
			<md-list-item @click="$emit('download', film)">
				<div class="md-list-item-text">
					<span class="titre">{{ film.title }}</span>
					<span class="file">{{ film.fileName }} - {{ film.size | byte-size }}</span>
				</div>

				<div class="md-list-action">
					<md-button
						class="md-icon-button"
						@click.stop="$emit('open', 'themoviedb', film)"
					>
						<img src="../../images/themoviedb.png" />
					</md-button>
					<md-button
						class="md-icon-button"
						@click.stop="$emit('open', 'allocine', film)"
					>
						<img src="../../images/allocine.ico" />
					</md-button>
					<md-button
						class="md-icon-button"
						@click.stop="$emit('open' ,'imdb', film)"
					>
						<img src="../../images/imdb.ico" />
					</md-button>
				</div>
			</md-list-item>
			<md-divider />
		</div>
	`,
});
