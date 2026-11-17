<script>
export default {
	props: {
		name: { type: String, required: true },
		size: { type: [Number, String], default: 40 },
		tooltipDelay: { type: Number, default: 500 },
		tooltipDirection: { type: String, default: "right" },
	},
};
</script>

<template>
	<v-avatar :size="size">
		<img :src="'/api/users/' + encodeURIComponent(name) + '/avatar'" :alt="name">
		<v-tooltip activator="parent" :open-delay="tooltipDelay" :location="tooltipDirection">{{ name }}</v-tooltip>
	</v-avatar>
</template>

<style scoped>
img { width: 100%; height: 100%; object-fit: cover; }
</style>
