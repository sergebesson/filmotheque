<script>
export default {
	props: {
		maskingString: { type: String, default: "*****" },
		blockClick: { type: Boolean, default: true },
	},
	data: () => ({ passwordShowed: false }),
	methods: {
		onClick(event) {
			if (this.blockClick) { event.stopPropagation(); event.preventDefault(); }
		},
	},
};
</script>

<template>
	<div
		class="password" @mousedown.stop="passwordShowed = true" @mouseup.stop="passwordShowed = false"
		@mouseout.stop="passwordShowed = false" @touchstart.stop="passwordShowed = true"
		@touchend.stop="passwordShowed = false" @touchcancel.stop="passwordShowed = false" @click="onClick"
	>
		<span v-if="passwordShowed"><slot /></span><span v-else>{{ maskingString }}</span>
	</div>
</template>
