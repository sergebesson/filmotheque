
const fieldVuelidateComponent = {
	props: {
		label: {
			type: String,
			default: "",
		},
		field: {
			type: Object,
			required: true,
		},
	},
	template: `
		<md-field :class="{'md-invalid': field.$invalid, dirty: field.$dirty}">
			<label v-if="label !== ''">{{ label }}</label>
			<slot :field="field" />
		</md-field>
	`,
};

export { fieldVuelidateComponent };
