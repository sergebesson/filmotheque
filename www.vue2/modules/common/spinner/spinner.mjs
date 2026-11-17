
const spinnerComponent = {
	props: {
		animate: {
			type: Boolean,
			default: false,
		},
	},
	template: `
		<div class="spinner" :class="{ animated: animate }"><div /></div>
	`,
};

export { spinnerComponent };
