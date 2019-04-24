"use strict";
/* global Vue,document */

Vue.component("loader", {
	mounted: function () {
		const loader = document.getElementById("loader");
		loader.parentNode.removeChild(loader);
	},
	template: "#loader",
});
