"use strict";
/* global Vue */

Vue.component("error", {
	data: function () {
		return {
			show: false,
			message: "",
			error: null,
		};
	},
	computed: {
		content: function () {
			return `${ this.message } ${ this.error ? `<span>${this.error.message}</span>` : "" }`;
		},
	},
	methods: {
		showError: function (message, error) {
			if (this.show) {
				return;
			}

			this.message = message;
			this.error = error;
			this.show = true;
		},
	},
	template: `
		<md-dialog-alert
			:md-active.sync="show"
			md-title="ERREUR"
			:md-content="content"
		/>
	`,
});
