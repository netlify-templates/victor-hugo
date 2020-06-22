<script>
    import {  createEventDispatcher } from 'svelte';

    export let title;
    export let color = '#ff3e00';

    let navContext;

    export let optionFlags = [];

    export let viewLocation, viewTarget;

    let dispatch = createEventDispatcher();

    let formatPlayTime = (time) => "" + (new Date(time).toString());

    let mouse_x = 0, mouse_y = 0, mouse_down = false, mouse_disabled = false;

    let sinceLastMovementEvent = 0;

    export const init = function () {
        console.log("Initializing Navigation Controls...");

        document.querySelectorAll('.controls h4').forEach(c => {
            console.log(c);

            const scrollLength = 3 * window.innerHeight / 4;
            c.addEventListener('click', function (event) {
                let scrollInterval = 33;
                let scrollTime = 533;
                let scrolled = 0

                const startScroll = setInterval(function () {
                    if (scrolled < scrollLength) {
                        scroll({top: scrolled, left: 0});
                    }
                    scrolled += Math.floor(scrollLength / (scrollTime / scrollInterval));
                }, scrollInterval);

            });

            c.title = "Click To See Article";
        });


        document.querySelectorAll('canvas').forEach(c => {
            console.log(c);
            c.addEventListener('wheel', function (event) {
                const wheelEvent = (event || window['event']);

                if (((new Date()).getTime() - sinceLastMovementEvent) > 66) {

                    sinceLastMovementEvent = (new Date()).getTime();

                    if (wheelEvent.deltaY < 0) {
                        dispatch('up');
                    } else if (wheelEvent.deltaY > 0) {
                        dispatch('down');
                    }
                }

                wheelEvent.preventDefault();
            });
        })

        document.querySelectorAll('canvas').forEach(c => {
            console.log(c);
            c.addEventListener('keydown', function (event) {
                const kbEvent = (event || window['event']); // cross-browser shenanigans

                if (((new Date()).getTime() - sinceLastMovementEvent) > 66) {

                    // console.log(kbEvent);

                    sinceLastMovementEvent = (new Date()).getTime();

                    if (kbEvent['keyCode'] === 32) { // spacebar

                        kbEvent.preventDefault();

                        return true;

                    } else if (kbEvent['keyCode'] === 38 || kbEvent['keyCode'] === 87) { // up || W

                        dispatch('forward');

                        kbEvent.preventDefault();

                        return true;

                    } else if (kbEvent['keyCode'] === 40 || kbEvent['keyCode'] === 83) { // down || S

                        dispatch('backward');

                        kbEvent.preventDefault();

                        return true;

                    } else if (kbEvent['keyCode'] === 37 || kbEvent['keyCode'] === 65) { // left || A

                        dispatch('left');

                        kbEvent.preventDefault();

                        return true;

                    } else if (kbEvent['keyCode'] === 39 || kbEvent['keyCode'] === 68) { // right || D

                        dispatch('right');

                        kbEvent.preventDefault();

                        return true;

                    } else {
                        console.log('Keyboard Event: ', kbEvent['keyCode']);

                        return false;
                    }
                }
            });
        });
    };
</script>

<style>
    .controls h4 {
        cursor: pointer;
        pointer-events: all;
    }
</style>

<div class="controls">

    <h4>{ title }</h4>

    {#if (optionFlags['labels'].length > 0 && optionFlags['values'].length > 0)}
        {#each optionFlags['values'] as option, o}
        <label>
            <input type="checkbox" bind:checked={option} /> {optionFlags['labels'][o]}
        </label><br />
        {/each}
    {/if}

</div>
