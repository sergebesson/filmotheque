<script>
import get from "lodash/get.js";
import { eventBus, eventName } from "../../eventBus.js";

export default {
	data: () => ({ show: false, message: "", errorDescription: "" }),
	created() { eventBus.on(eventName.ERROR, this.showError); },
	beforeUnmount() { eventBus.off(eventName.ERROR, this.showError); },
	methods: {
		showError({ message, error }) {
			// Un seul dialogue, sans file : les erreurs suivantes sont ignorées tant qu'il est ouvert.
			if (this.show) { return; }
			this.message = message;
			const errorMessage = get(error, "message", "");
			const description = get(error, "response.data.error_description");
			this.errorDescription = `${errorMessage}${description ? ` (${description})` : ""}`;
			this.show = true;
		},
	},
};
</script>

<template>
	<v-dialog v-model="show" max-width="600" aria-label="ERREUR">
		<v-card class="error" title="ERREUR">
			<v-card-text>{{ message }}<span>{{ errorDescription }}</span></v-card-text>
			<v-card-actions><v-spacer /><v-btn @click="show = false">OK</v-btn></v-card-actions>
		</v-card>
	</v-dialog>
</template>

<style>
/* Global : carte d'erreur téléportée, contraste propre à ce dialogue. */
.v-card.error { background: var(--filmotheque-error); color: #fff; }
.v-card.error .v-card-text span { display: block; font-size: .8em; color: var(--filmotheque-primary); font-style: italic; }
</style>
