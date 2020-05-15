/* global localStorage,document */

import { flashStore } from "../../stores/flash.store.mjs";


const flashComponent = {
	data: () => ({
		flashStore,
	}),
	computed: {
		title: function () {
			return `Filmotheque version: ${ flashStore.infos.version }`;
		},
	},
	created: function () {
		this.showFlash();
	},
	methods: {
		showFlash: async function () {
			await flashStore.loadInfos();
			document.title +=
				` ${ flashStore.infos.version } - ${ flashStore.infos.number_of_movies } films`;

			const lastVersion = localStorage.getItem("last_version") || "0.0.0";
			if (this.comparedVersion(flashStore.infos.version, lastVersion) > 0 &&
				flashStore.infos.flash) {
				flashStore.showFlash();
			}
			localStorage.setItem("last_version", flashStore.infos.version);
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
			:md-active.sync="flashStore.show"
			:md-title="title"
			:md-content="flashStore.infos.flash"
		/>
	`,
};

export { flashComponent };
