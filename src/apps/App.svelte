<script>
	import { onMount } from 'svelte';

	export let greeting;

	let pin;
	let view;
	$: view = pin ? pin.replace(/\d(?!$)/g, '*') : 'enter your pin';

	function handleSubmit() {
		alert(`submitted ${pin}`);
	}

	let canvas;

	onMount(() => {
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#00f";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#fff";
		ctx.font = "20px Arial";
		ctx.fillText("2d Canvas works, too", 10, 100);

		let frame;

		(function loop() {
			frame = requestAnimationFrame(loop);

			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

			for (let p = 0; p < imageData.data.length; p += 4) {
				const i = p / 4;
				const x = i % canvas.width;
				const y = i / canvas.height >>> 0;

				const t = window.performance.now();

				const r = 64 + (128 * x / canvas.width) + (64 * Math.sin(t / 1000));
				const g = 64 + (128 * y / canvas.height) + (64 * Math.cos(t / 1000));
				const b = 128;

				imageData.data[p + 0] = r;
				imageData.data[p + 1] = g;
				imageData.data[p + 2] = b;
				imageData.data[p + 3] = 255;
			}

			ctx.putImageData(imageData, 0, 0);
		}());

		return () => {
			cancelAnimationFrame(frame);
		};
	});
</script>

<style>
	canvas {
		width: 100%;
		height: 100%;
		background-color: #666;
		-webkit-mask: url("../images/svelte-logo-mask.svg") 50% 50% content-box view-box no-repeat;
		mask: url("../images/svelte-logo-mask.svg") 50% 50% content-box view-box no-repeat;
	}
	#view {
		text-align: center;
	}
</style>

<div id="view">
	<h3>{@html greeting}</h3>
	<canvas
			bind:this={canvas}
			width={32}
			height={32}
	></canvas>
</div>
