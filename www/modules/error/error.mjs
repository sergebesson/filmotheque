/* global _ */

import { eventBus } from "../../eventBus.mjs";

const errorComponent = {
	data: function () {
		return {
			show: false,
			message: "",
			errorDescription: "",
		};
	},
	computed: {
		content: function () {
			return `${ this.message } <span>${ this.errorDescription }</span>`;
		},
	},
	created: function () {
		eventBus.$on("error", (message, error) => {
			this.showError(message, error);
		});
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
};

export { errorComponent };
