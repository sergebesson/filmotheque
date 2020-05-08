/* global document */

const loaderCore = {
	mounted: function () {
		const loader = document.getElementById("loader");
		loader.parentNode.removeChild(loader);
	},
	template: "#loader",
};

const loaderComponent = {
	components: { loaderCore },
	template: `
		<transition name="fade">
			<loader-core />
		</transition>
	`,
};

export { loaderComponent };
