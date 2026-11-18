<script>
export default {};
</script>

<template>
	<div class="loader"><spinner :animate="true" /></div>
</template>

<style>
#loader, .loader {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	height: 100%;
	z-index: 10;
}

#loader .spinner, .loader .spinner {
	max-width: 800px;
}
</style>
