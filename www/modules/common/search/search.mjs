/* global _ */

const debounceTimeToSearch = 1000;

const searchComponent = {
	props: {
		storeList: {
			type: Object,
			validator: (storeList) =>
				_.isString(storeList.search) &&
				_.isBoolean(storeList.loading),
		},
	},
	data: () => ({
		search: "",
		searchInProgress: false,
	}),
	watch: {
		search: _.debounce(function () {
			/* eslint-disable no-invalid-this */
			if (this.search === this.storeList.search) {
				return;
			}
			this.searchInProgress = true;
			this.storeList.search = this.search;
			/* eslint-enable no-invalid-this */
		}, debounceTimeToSearch),
		"storeList.loading": function (loading) {
			this.searchInProgress = this.searchInProgress && loading;
		},
	},
	created: function () {
		this.search = this.storeList.search;
	},
	template: `
		<div class="search">
			<md-field md-inline md-clearable>
				<label>Rechercher...</label>
				<md-input v-model.trim="search" autofocus :disabled="storeList.updating"></md-input>
			</md-field>
			<spinner :animate="searchInProgress || storeList.updating" />
		</div>
	`,
};

export { searchComponent };
