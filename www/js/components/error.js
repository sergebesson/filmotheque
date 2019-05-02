"use strict";
/* global Vue,_ */

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
			return `${ this.message } <span>${ this.errorDescription }</span>`;
		},
	},
	methods: {
		showError: function (message, error) {
			if (this.show) {
				return;
			}

			this.message = message;
			const errorMessage = _.get(error, "message");
			const errorDescription = _.get(error, "response.data.error_description");
			this.errorDescription = `${ errorMessage }${ errorDescription ? ` (${errorDescription})` : "" }`;
			this.show = true;
		},
	},
	template: `
		<md-dialog-alert class="error"
			:md-active.sync="show"
			md-title="ERREUR"
			:md-content="content"
		/>
	`,
});
