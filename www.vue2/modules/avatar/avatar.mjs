
const avatarComponent = {
	props: {
		name: { type: String, required: true },
		tooltipDelay: { type: Number, default: 500 },
		tooltipDirection: { type: String, default: "right" },
	},
	template: `
		<md-avatar>
			<img :src="'/api/users/' + name + '/avatar'" :alt="name">
			<md-tooltip :md-delay="tooltipDelay" :md-direction="tooltipDirection">{{ name }}</md-tooltip>
		</md-avatar>
	`,
};

export { avatarComponent };
