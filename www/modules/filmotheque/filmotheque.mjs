
// eslint-disable-next-line no-unused-vars
const filmothequeComponent = {
	data: function () {
		return {
			ready: false,
		};
	},
	template: `
		<div class="main">
			<loader v-if="!ready" />
			<error />

			<div class="content" v-show="ready">
				<div class="md-elevation-10">
					<list-movies @loaded="ready=true" />
				</div>
			</div>

			<flash />
		</div>
		`,
};

export { filmothequeComponent };
