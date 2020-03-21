<script>
	import { onMount } from 'svelte';

	export let title;

	import * as GL from '@sveltejs/gl';

	export let color = '#ff3e00';

	const data = JSON.parse(document.getElementById('data_in_html').children[0].innerHTML);
	const heightmap = [];
	const gridSizeX = 10;
	const gridSizeZ = 10;

	for (let z=0; z < data.length; z++) {
		const xx = [];
		for (const x of Object.getOwnPropertyNames(data[z])) {
			xx.push(data[z][x])
		}
		heightmap[z] = xx;
	}

	console.log(heightmap);

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
	.controls {
		float: right;
		position: relative;
		margin: 8px;
		margin-top: -160px;
		width: 300px;
		height: 128px;
		padding: 1em;
		background-color: rgba(255,255,255,0.7);
		border-radius: 2px;
		z-index: 2;
	}

	@media screen and (max-width: 480px) {
		.controls {
			margin-top: 8px;
		}
	}

		.keys {
		position: absolute;
		width: 256px;
		height: 256px;
		top: calc(50vh - (100vw / 5.75));
		padding: 24px;
		background-color: transparent;
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

	{#each Array(heightmap.length) as _, k}
		{#each Array(heightmap[k].length) as _, i}
	<!-- box -->
	<GL.Mesh geometry={GL.box({ x: 0, y: 0, z: 0 , w: (gridSizeX / heightmap[i].length), h: (1 * heightmap[k][i]), d: (gridSizeZ / heightmap.length) })}
			 location={[ (-(gridSizeX / 2) + (i * (gridSizeX / heightmap[0].length))), 0, (-(gridSizeZ / 2) + (k * (gridSizeZ / heightmap.length))) ]}
			 rotation={[ 0, 0, 0]}
			 scale={[ w, h, d]}
			 uniforms={{ color: from_hex(color) }}
	/>
		{/each}
	{/each}

	<!-- spheres -->
	<GL.Mesh
			geometry={GL.sphere({ turns: 36, bands: 36 })}
			location={[ -0.5, 2.4, 1.2 ]}
			scale={0.4}
			uniforms={{ color: 0x123456, alpha: 0.9 }}
			transparent
	/>

	<GL.Mesh
			geometry={GL.sphere({ turns: 36, bands: 36 })}
			location={[ -1.4, 2.6, 0.2 ]}
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
