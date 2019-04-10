"use strict";
/* global Vue,moment */

Vue.component("listFilmsByGroup", {
	props: [ "groupFilms" ],
	filters: {
		dateAdded: (dateAdded) => {
			return moment(dateAdded).format("LL");
		},
	},
	template: `
		<md-list class="md-double-line md-elevation-10 md-dense">
			<div v-for="(films, dateAdded) in groupFilms">
				<md-subheader>{{ dateAdded | dateAdded }}</md-subheader>
				<film-item v-for="film in _.sortBy(films, 'title')"
					:key="film._id"
					:film="film"
					@download="$emit('download', ...arguments)"
					@open="$emit('open', ...arguments)"
				/>
			</div>
		</md-list>
	`,
});
