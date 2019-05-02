"use strict";
/* global Vue,document */

const loaderCore = {
	mounted: function () {
		const loader = document.getElementById("loader");
		loader.parentNode.removeChild(loader);
	},
	template: "#loader",
};

Vue.component("loader", {
	components: { loaderCore },
	template: `
		<transition name="fade">
			<loader-core />
		</transition>
	`,
});
