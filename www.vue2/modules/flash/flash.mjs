/* global localStorage,document */

import { infosStore } from "../../stores/infos.store.mjs";

const flashComponent = {
	data: () => ({
		infosStore,
	}),
	computed: {
		title: function () {
			return `Filmotheque version: ${infosStore.infos.version}`;
		},
	},
	created: function () {
		this.showFlash();
	},
	methods: {
		showFlash: async function () {
			await infosStore.loadInfos();
			document.title += ` ${infosStore.infos.version} - ${infosStore.infos.number_of_movies} films`;

			const lastVersion = localStorage.getItem("last_version") || "0.0.0";
			if (this.comparedVersion(infosStore.infos.version, lastVersion) > 0 &&
				infosStore.infos.flash) {
				infosStore.showFlash();
			}
			localStorage.setItem("last_version", infosStore.infos.version);
		},
		comparedVersion(version1, version2) {
			const [ major1, minor1 ] = version1.split(".");
			const [ major2, minor2 ] = version2.split(".");

			if (major1 !== major2) {
				return major1 > major2 ? 1 : -1;
			}
			if (minor1 !== minor2) {
				return minor1 > minor2 ? 1 : -1;
			}

			return 0;
		},
	},
	template: `
		<md-dialog-alert class="flash"
			:md-active.sync="infosStore.show"
			:md-title="title"
			:md-content="infosStore.infos.flash"
		/>
	`,
};

export { flashComponent };
