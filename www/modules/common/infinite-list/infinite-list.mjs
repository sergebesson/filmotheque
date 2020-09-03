/* global _ */

const throttleTimeToScroll = 50;
const nbOfPixelsBeforeAddingToScroll = 10;

const infiniteListComponent = {
	props: {
		storeList: {
			type: Object,
			required: true,
			validator: (storeList) =>
				_.isInteger(storeList.page) &&
				_.isInteger(storeList.totalPages) &&
				_.isBoolean(storeList.loading) &&
				_.isFunction(storeList.nextPage),
		},
	},
	computed: {
		fullList: function () {
			return !this.storeList.loading &&
				this.storeList.page >= this.storeList.totalPages;
		},
	},
	methods: {
		onScroll: _.throttle(function (event) {
			const target = event.target;
			if (target.offsetHeight +
				target.scrollTop +
				nbOfPixelsBeforeAddingToScroll >= target.scrollHeight) {
				// eslint-disable-next-line no-invalid-this
				this.storeList.nextPage();
			}
		}, throttleTimeToScroll),
	},
	template: `
		<md-list @scroll="onScroll" class="infinite-list">
			<transition-group name="infinite-list-transition">
				<slot />
			</transition-group>
			<spinner v-if="!fullList" :animate="storeList.loading" />
		</md-list>
	`,
};

export { infiniteListComponent };
