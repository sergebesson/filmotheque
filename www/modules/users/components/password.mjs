
const passwordComponent = {
	props: {
		maskingString: { type: String, default: "*****" },
		blockClick: { type: Boolean, default: true },
	},
	data: () => ({
		passwordShowed: false,
	}),
	methods: {
		showPassword: function () {
			this.passwordShowed = true;
		},
		hidePassword: function () {
			this.passwordShowed = false;
		},
		onClick: function (event) {
			if (this.blockClick) {
				event.stopPropagation();
				event.preventDefault();
			}
		},
	},
	template: `
		<div class="password"
			@mousedown.stop="showPassword"
			@mouseup.stop="hidePassword"
			@mouseout.stop="hidePassword"
			@touchstart.stop="showPassword"
			@touchend.stop="hidePassword"
			@touchcancel.stop="hidePassword"
			@click="onClick"
		>
			<span v-if="passwordShowed"><slot /></span>
			<span v-else>{{ maskingString }}</span>
		</div>
	`,
};

export { passwordComponent };
