<script>
export default {
	props: { animate: { type: Boolean, default: false } },
};
</script>

<template>
	<div class="spinner" :class="{ animated: animate }" role="status" :aria-label="animate ? 'Chargement en cours' : undefined"><div /></div>
</template>

<style>
.spinner {
	position: relative;
	margin: 0px 30px 0px 20px;
	width: calc(100% - 50px);
}

.spinner div {
	display: none;
	position: absolute;
	background-color: var(--filmotheque-primary);
	border-radius: 50%;
}

.spinner.animated div {
	display: block;
	animation-name: k2000;
	animation-duration: 1.5s;
	animation-iteration-count: infinite;
	animation-timing-function: ease-in-out;
}

@keyframes k2000 {
	0% {
		left: 0%;
		width: 10px;
		height: 3px;
	}
	25% {
		width: 50px;
		height: 8px;
	}
	50% {
		left: 100%;
		width: 10px;
		height: 3px;
	}
	75% {
		width: 50px;
		height: 8px;
	}
	100% {
		left: 0%;
		width: 10px;
		height: 3px;
	}
}
</style>
