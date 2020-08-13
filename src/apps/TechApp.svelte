<script>
	import { onMount } from 'svelte';
	import Keypad from './components/Keypad.svelte';

	export let title;

	let pin;
	let view;
	$: view = pin ? pin.replace(/\d(?!$)/g, '*') : 'enter your pin';

	function handleSubmit() {
		alert(`submitted ${pin}`);
	}

	import * as GL from '@sveltejs/gl';

	export let color = '#ff3e00';
	let w = 1;
	let h = 1;
	let d = 1;

	const from_hex = hex => parseInt(hex.slice(1), 16);

	const light = {};

	onMount(() => {
		let frame;

		const loop = () => {
			frame = requestAnimationFrame(loop);

			light.x = 3 * Math.sin(Date.now() * 0.001);
			light.y = 2.5 + 2 * Math.sin(Date.now() * 0.0004);
			light.z = 3 * Math.cos(Date.now() * 0.002);
		};

		loop();

		return () => cancelAnimationFrame(frame);
	});
</script>

<style>
	.keys {
		top: calc(50vh - (100vw / 5.75));
		right: 0;
		margin: 8px;
		position: absolute;
		width: 256px;
		height: 256px;
		padding: 24px;
		background-color: transparent;
		z-index: 2;
	}

	.keys * {
		padding: 24px;
	}
</style>

<GL.Scene>
	<GL.Target id="center" location={[0, h/2, 0]}/>

	<GL.OrbitControls maxPolarAngle={Math.PI / 2} let:location>
		<GL.PerspectiveCamera {location} lookAt="center" near={0.01} far={1000}/>
	</GL.OrbitControls>

	<GL.AmbientLight intensity={0.3}/>
	<GL.DirectionalLight direction={[-1,-1,-1]} intensity={0.5}/>

	<!-- box -->
	<GL.Mesh
			geometry={GL.box({})}
			location={[0,h/2,0]}
			rotation={[0,-20,0]}
			scale={[w,h,d]}
			uniforms={{ color: from_hex(color) }}
	/>

	<!-- spheres -->
	<GL.Mesh
			geometry={GL.sphere({ turns: 36, bands: 36 })}
			location={[-0.5, 0.4, 1.2]}
			scale={0.4}
			uniforms={{ color: 0x123456, alpha: 0.9 }}
			transparent
	/>

	<GL.Mesh
			geometry={GL.sphere({ turns: 36, bands: 36 })}
			location={[-1.4, 0.6, 0.2]}
			scale={0.6}
			uniforms={{ color: 0x336644, alpha: 1.0 }}
			transparent
	/>

	<!-- floor -->
	<GL.Mesh
			geometry={GL.plane()}
			location={[0,-0.01,0]}
			rotation={[-90,0,0]}
			scale={10}
			uniforms={{ color: 0xffffff }}
	/>

	<!-- ceiling -->
	<GL.Mesh
			geometry={GL.plane()}
			location={[0,5.0,0]}
			rotation={[90,0,0]}
			scale={10}
			uniforms={{ color: 0xffffff }}
	/>

	<!-- wall1 -->
	<GL.Mesh
			geometry={GL.plane()}
			location={[0,-0.01,-10.0]}
			rotation={[0,0,0]}
			scale={10}
			uniforms={{ color: 0xffffff }}
	/>

	<!-- wall2 -->
	<GL.Mesh
			geometry={GL.plane()}
			location={[10.0,-0.01,0.0]}
			rotation={[0,-90,0]}
			scale={10}
			uniforms={{ color: 0xffffff }}
	/>

	<!-- wall3 -->
	<GL.Mesh
			geometry={GL.plane()}
			location={[-10.0,-0.01,0.0]}
			rotation={[0,90,0]}
			scale={10}
			uniforms={{ color: 0xffffff }}
	/>

	<!-- moving light -->
	<GL.Group location={[light.x,light.y,light.z]}>
		<GL.Mesh
				geometry={GL.sphere({ turns: 36, bands: 36 })}
				location={[0,0.2,0]}
				scale={0.1}
				uniforms={{ color: 0xffffff, emissive: 0xff0000 }}
		/>

		<GL.PointLight
				location={[0,0,0]}
				color={0xff0000}
				intensity={0.6}
		/>
	</GL.Group>
</GL.Scene>

<div class="controls">
	<label>
		<input type="color" style="height: 40px" bind:value={color}>
	</label>

	<label>
		<input type="range" bind:value={w} min={0.1} max={5} step={0.1}> width ({w})
	</label>

	<label>
		<input type="range" bind:value={h} min={0.1} max={5} step={0.1}> height ({h})
	</label>

	<label>
		<input type="range" bind:value={d} min={0.1} max={5} step={0.1}> depth ({d})
	</label>
</div>

<div class="controls keys">
	<h1 style="color: {pin ? '#999' : '#fff'}">{view}</h1>
	<Keypad bind:value={pin} on:submit={handleSubmit}/>
</div>
