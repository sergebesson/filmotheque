/* global Vue,VueMaterial */
"use strict";

Vue.use(VueMaterial.default);

// eslint-disable-next-line no-unused-vars
const vm = new Vue({
	el: "#filmotheque",
	data: {
		ready: false,
	},
	methods: {
		onError: function (message, error) {
			this.$refs.error.showError(message, error);
		},
	},
	template: `
		<div class="content">

			<loader v-if="!ready" />
			<error ref="error" />

			<list-movies-by-group @error="onError" @loaded="ready=true" />
			<flash @error="onError" />

		</div>
	`,
});
