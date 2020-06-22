<script>
    import { onMount } from 'svelte';
    import * as GL from '@sveltejs/gl';
    import NavigationControls from './components/NavigationControls.svelte';

    export let title;

    export let options = {
        labels: [],
        values: []
    };

    // initial view
    let location = new Float32Array([ 0, 10, 5 ]);
    let target = new Float32Array([0, 1, 0]);

    const captureViewDirection = (loc, tgt) => {
        console.log("location: ", loc, "\n", "target: ", tgt);
        return "";
    };

    export let color = '#ff3e00';

    function adjustColor (clr, height = 1) {
        const r = parseInt('0x' + clr.substr(1, 2), 16),
                g = parseInt('0x' + clr.substr(3, 2), 16),
                b = parseInt('0x' + clr.substr(5, 2), 16);

        const hr = Math.floor(r * (height / 0.25)),
                hb = Math.floor(b * (height / 0.25));
        return Math.abs((((hr < 255) ? hr : r) << 16) + (g << 8) + ((hb < 255) ? hb : b));
    }

    const data = JSON.parse(document.getElementById('gl_data_in_html').children[0].innerHTML);
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

    const light = {};

    let webgl;


    /* This is a helper callback to bind custom uniforms/attributes
     * and to pass custom buffers, like the ad-hoc texture coords
     * used in normal-selected texture shader below. I inserted a
     * hook directly in the @sveltejs/gl source for this purpose
     */
    let process_extra_shader_components = (gl, material, model) => {
        // console.log("Process Extra Shader Components");
        const program = material.program;
    };

    let updateWorld = (event) => {
        console.log(event);
    };

    let navControlInit;

    onMount(() => {
        let frame;

        if (typeof navControlInit === 'function') {
            navControlInit();
        }

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
        margin-top: -160px;
        height: 128px;
    }
</style>

<GL.Scene bind:gl={webgl} backgroundOpacity=1.0 process_extra_shader_components={process_extra_shader_components}>
    <GL.Target id="center" location={[0, h/2, 0]}/>

    <GL.OrbitControls maxPolarAngle={Math.PI / 2} {location} {target}>
        {captureViewDirection(location, target)}
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
                     uniforms={{ color: adjustColor(color, heightmap[k][i]) }}
            />
        {/each}
    {/each}

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

<NavigationControls
        bind:init={navControlInit}
        bind:optionFlags={options}
        bind:viewLocation={location}
        bind:viewTarget={target}
        title={title}
        on:move={(event) => updateWorld(event)}/>

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
