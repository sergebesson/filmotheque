<script>
import throttle from "lodash/throttle.js";

const throttleTimeToScroll = 50;
const nbOfPixelsBeforeAddingToScroll = 10;

export default {
	/**
	 * Singleton de liste lu via state.{page: number, totalPages: number, loading: boolean}.
	 * nextPage(): Promise<void> possède les écritures et consomme les erreurs via ERROR.
	 * Scroll limité à un callback par 50 ms ; cancel au démontage annule le callback restant,
	 * pas une requête déjà partie. Le composant ne modifie pas directement le store.
	 */
	props: {
		storeList: { type: Object, required: true },
	},
	computed: {
		fullList() {
			return !this.storeList.state.loading && this.storeList.state.page >= this.storeList.state.totalPages;
		},
	},
	created() {
		this.onScroll = throttle(async (event) => {
			const target = event.target;
			if (target.offsetHeight + target.scrollTop + nbOfPixelsBeforeAddingToScroll >= target.scrollHeight) {
				await this.storeList.nextPage();
			}
		}, throttleTimeToScroll);
	},
	beforeUnmount() {
		this.onScroll.cancel();
	},
};
</script>

<template>
	<div class="infinite-list" role="list" @scroll="onScroll">
		<transition-group name="infinite-list-transition" tag="div">
			<slot />
		</transition-group>
		<spinner v-if="!fullList" :animate="storeList.state.loading" />
	</div>
</template>

<style>
.infinite-list { overflow-y: auto; scroll-snap-type: x mandatory; }
.infinite-list-transition-enter-from, .infinite-list-transition-leave-to { opacity: 0; transform: translateY(-100px); }
.infinite-list-transition-leave-active { position: absolute; }
.infinite-list-transition-item { scroll-snap-align: start; transition: all .5s; }
.infinite-list .spinner { padding: 10px 0; min-height: 25px; }
</style>
