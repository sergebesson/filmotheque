<script>
import { infosStore } from "../../stores/infos.store.js";

export default {
	data: () => ({ infosStore }),
	computed: {
		title() { return `Filmotheque version: ${infosStore.infos.version}`; },
	},
	created() { this.showFlash(); },
	methods: {
		scrollToAnchor(event) {
			const link = event.target.closest('a[href^="#"]');
			if (!link) { return; }
			const target = event.currentTarget.querySelector(`#${CSS.escape(decodeURIComponent(link.hash.slice(1)))}`);
			if (!target) { return; }
			event.preventDefault();
			target.scrollIntoView({ block: "start" });
		},
		async showFlash() {
			await infosStore.loadInfos();
			if (!infosStore.infos.version) { return; }
			document.title += ` ${infosStore.infos.version} - ${infosStore.infos.number_of_movies} films`;
			const lastVersion = localStorage.getItem("last_version") || "0.0.0";
			if (this.comparedVersion(infosStore.infos.version, lastVersion) > 0 && infosStore.infos.flash) {
				infosStore.showFlash();
			}
			localStorage.setItem("last_version", infosStore.infos.version);
		},
		comparedVersion(version1, version2) {
			const [major1, minor1] = version1.split(".").map(Number);
			const [major2, minor2] = version2.split(".").map(Number);
			if (major1 !== major2) { return major1 > major2 ? 1 : -1; }
			if (minor1 !== minor2) { return minor1 > minor2 ? 1 : -1; }
			return 0;
		},
	},
};
</script>

<template>
	<v-dialog v-model="infosStore.show" scrollable max-width="650" :aria-label="title">
		<v-card class="flash" :title="title">
			<!-- Le contenu HTML provient du fichier Markdown administré sur le serveur. -->
			<!-- eslint-disable-next-line vue/no-v-html -->
			<v-card-text><div @click="scrollToAnchor" v-html="infosStore.infos.flash" /></v-card-text>
			<v-card-actions><v-spacer /><v-btn @click="infosStore.show = false">OK</v-btn></v-card-actions>
		</v-card>
	</v-dialog>
</template>

<style>
/* Global : carte téléportée. La typographie du titre/texte générés n'a pas de prop équivalente. */
.v-card.flash { background: var(--filmotheque-primary); color: var(--filmotheque-text-light); }
.v-card.flash .v-card-title { font-size: 20px; font-weight: 500; line-height: 26px; letter-spacing: .005em; }
.v-card.flash .v-card-text { font-size: 14px; line-height: 20px; letter-spacing: .01em; }
.v-card.flash a[href] { color: inherit; text-decoration: underline; }
.v-card.flash .v-btn { color: var(--filmotheque-text-light); font-size: 14px; font-weight: bold; letter-spacing: normal; }
</style>
