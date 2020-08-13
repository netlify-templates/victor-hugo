var app = (function (exports) {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function add_resize_listener(element, fn) {
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        const object = document.createElement('object');
        object.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
        object.setAttribute('aria-hidden', 'true');
        object.type = 'text/html';
        object.tabIndex = -1;
        let win;
        object.onload = () => {
            win = object.contentDocument.defaultView;
            win.addEventListener('resize', fn);
        };
        if (/Trident/.test(navigator.userAgent)) {
            element.appendChild(object);
            object.data = 'about:blank';
        }
        else {
            object.data = 'about:blank';
            element.appendChild(object);
        }
        return {
            cancel: () => {
                win && win.removeEventListener && win.removeEventListener('resize', fn);
                element.removeChild(object);
            }
        };
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    /* src/apps/App.svelte generated by Svelte v3.19.1 */

    function create_fragment(ctx) {
    	let div;
    	let h3;
    	let t;
    	let canvas_1;
    	let canvas_1_width_value;
    	let canvas_1_height_value;

    	return {
    		c() {
    			div = element("div");
    			h3 = element("h3");
    			t = space();
    			canvas_1 = element("canvas");
    			attr(canvas_1, "width", canvas_1_width_value = 32);
    			attr(canvas_1, "height", canvas_1_height_value = 32);
    			attr(canvas_1, "class", "svelte-y9ulwz");
    			attr(div, "id", "view");
    			attr(div, "class", "svelte-y9ulwz");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h3);
    			h3.innerHTML = /*greeting*/ ctx[0];
    			append(div, t);
    			append(div, canvas_1);
    			/*canvas_1_binding*/ ctx[5](canvas_1);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*greeting*/ 1) h3.innerHTML = /*greeting*/ ctx[0];		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*canvas_1_binding*/ ctx[5](null);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { greeting } = $$props;
    	let pin;
    	let view;

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
    				const r = 64 + 128 * x / canvas.width + 64 * Math.sin(t / 1000);
    				const g = 64 + 128 * y / canvas.height + 64 * Math.cos(t / 1000);
    				const b = 128;
    				imageData.data[p + 0] = r;
    				imageData.data[p + 1] = g;
    				imageData.data[p + 2] = b;
    				imageData.data[p + 3] = 255;
    			}

    			ctx.putImageData(imageData, 0, 0);
    		})();

    		return () => {
    			cancelAnimationFrame(frame);
    		};
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, canvas = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("greeting" in $$props) $$invalidate(0, greeting = $$props.greeting);
    	};

    	 view =  "enter your pin";
    	return [greeting, canvas, view, pin, handleSubmit, canvas_1_binding];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { greeting: 0 });
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const RENDERER = {};
    const LAYER = {};
    const PARENT = {};

    function get_scene() {
    	return getContext(RENDERER);
    }

    function get_layer() {
    	return getContext(LAYER);
    }

    function get_parent() {
    	return getContext(PARENT);
    }

    function set_parent(parent) {
    	setContext(PARENT, parent);
    }

    function remove_index(array, index) {
    	array[index] = array[array.length - 1];
    	array.pop();
    }

    function remove_item(array, item) {
    	const index = array.indexOf(item);
    	if (~index) remove_index(array, index);
    }

    function create_layer(index, invalidate) {
    	let child_index = 0;

    	const meshes = [];
    	const transparent_meshes = [];
    	const child_layers = [];

    	const layer = {
    		index: 0,
    		meshes,
    		transparent_meshes,
    		child_layers,
    		needs_sort: false,
    		needs_transparency_sort: true,
    		add_mesh: (mesh, existing) => {
    			if (existing) {
    				remove_item(mesh.transparent ? meshes : transparent_meshes, mesh);
    			}

    			if (mesh.transparent) {
    				transparent_meshes.push(mesh);
    				layer.needs_transparency_sort = true;
    			} else {
    				meshes.push(mesh);
    			}

    			onDestroy(() => {
    				remove_item(meshes, mesh);
    				remove_item(transparent_meshes, mesh);
    				invalidate();
    			});
    		},
    		add_child: (index = child_index++) => {
    			const child_layer = create_layer(index, invalidate);
    			child_layers.push(child_layer);

    			layer.needs_sort = true;

    			onDestroy(() => {
    				remove_item(child_layers, child_layer);

    				layer.needs_sort = true;
    				invalidate();
    			});

    			return child_layer;
    		}
    	};

    	return layer;
    }

    function process_color(color) {
    	if (typeof color === 'number') {
    		const r = (color & 0xff0000) >> 16;
    		const g = (color & 0x00ff00) >> 8;
    		const b = (color & 0x0000ff);

    		return new Float32Array([
    			r / 255,
    			g / 255,
    			b / 255
    		]);
    	}

    	return color;
    }

    function normalize(out, vector = out) {
    	let total = 0;
    	for (let i = 0; i < vector.length; i += 1) {
    		total += vector[i] * vector[i];
    	}

    	const mag = Math.sqrt(total);

    	out[0] = vector[0] / mag;
    	out[1] = vector[1] / mag;
    	out[2] = vector[2] / mag;

    	return out;
    }

    function memoize(fn) {
    	const cache = new Map();
    	return (...args) => {
    		const hash = JSON.stringify(args);
    		if (!cache.has(hash)) cache.set(hash, fn(...args));
    		return cache.get(hash);
    	};
    }

    /**
     * Common utilities
     * @module glMatrix
     */
    // Configuration Constants
    var EPSILON = 0.000001;
    var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
    if (!Math.hypot) Math.hypot = function () {
      var y = 0,
          i = arguments.length;

      while (i--) {
        y += arguments[i] * arguments[i];
      }

      return Math.sqrt(y);
    };

    /**
     * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
     * @module mat4
     */

    /**
     * Creates a new identity mat4
     *
     * @returns {mat4} a new 4x4 matrix
     */

    function create() {
      var out = new ARRAY_TYPE(16);

      if (ARRAY_TYPE != Float32Array) {
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
      }

      out[0] = 1;
      out[5] = 1;
      out[10] = 1;
      out[15] = 1;
      return out;
    }
    /**
     * Set a mat4 to the identity matrix
     *
     * @param {mat4} out the receiving matrix
     * @returns {mat4} out
     */

    function identity(out) {
      out[0] = 1;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = 1;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[10] = 1;
      out[11] = 0;
      out[12] = 0;
      out[13] = 0;
      out[14] = 0;
      out[15] = 1;
      return out;
    }
    /**
     * Transpose the values of a mat4
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the source matrix
     * @returns {mat4} out
     */

    function transpose(out, a) {
      // If we are transposing ourselves we can skip a few steps but have to cache some values
      if (out === a) {
        var a01 = a[1],
            a02 = a[2],
            a03 = a[3];
        var a12 = a[6],
            a13 = a[7];
        var a23 = a[11];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
      } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
      }

      return out;
    }
    /**
     * Inverts a mat4
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the source matrix
     * @returns {mat4} out
     */

    function invert(out, a) {
      var a00 = a[0],
          a01 = a[1],
          a02 = a[2],
          a03 = a[3];
      var a10 = a[4],
          a11 = a[5],
          a12 = a[6],
          a13 = a[7];
      var a20 = a[8],
          a21 = a[9],
          a22 = a[10],
          a23 = a[11];
      var a30 = a[12],
          a31 = a[13],
          a32 = a[14],
          a33 = a[15];
      var b00 = a00 * a11 - a01 * a10;
      var b01 = a00 * a12 - a02 * a10;
      var b02 = a00 * a13 - a03 * a10;
      var b03 = a01 * a12 - a02 * a11;
      var b04 = a01 * a13 - a03 * a11;
      var b05 = a02 * a13 - a03 * a12;
      var b06 = a20 * a31 - a21 * a30;
      var b07 = a20 * a32 - a22 * a30;
      var b08 = a20 * a33 - a23 * a30;
      var b09 = a21 * a32 - a22 * a31;
      var b10 = a21 * a33 - a23 * a31;
      var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

      var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

      if (!det) {
        return null;
      }

      det = 1.0 / det;
      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    }
    /**
     * Multiplies two mat4s
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the first operand
     * @param {mat4} b the second operand
     * @returns {mat4} out
     */

    function multiply(out, a, b) {
      var a00 = a[0],
          a01 = a[1],
          a02 = a[2],
          a03 = a[3];
      var a10 = a[4],
          a11 = a[5],
          a12 = a[6],
          a13 = a[7];
      var a20 = a[8],
          a21 = a[9],
          a22 = a[10],
          a23 = a[11];
      var a30 = a[12],
          a31 = a[13],
          a32 = a[14],
          a33 = a[15]; // Cache only the current line of the second matrix

      var b0 = b[0],
          b1 = b[1],
          b2 = b[2],
          b3 = b[3];
      out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[4];
      b1 = b[5];
      b2 = b[6];
      b3 = b[7];
      out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[8];
      b1 = b[9];
      b2 = b[10];
      b3 = b[11];
      out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[12];
      b1 = b[13];
      b2 = b[14];
      b3 = b[15];
      out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      return out;
    }
    /**
     * Translate a mat4 by the given vector
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to translate
     * @param {vec3} v vector to translate by
     * @returns {mat4} out
     */

    function translate(out, a, v) {
      var x = v[0],
          y = v[1],
          z = v[2];
      var a00, a01, a02, a03;
      var a10, a11, a12, a13;
      var a20, a21, a22, a23;

      if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
      } else {
        a00 = a[0];
        a01 = a[1];
        a02 = a[2];
        a03 = a[3];
        a10 = a[4];
        a11 = a[5];
        a12 = a[6];
        a13 = a[7];
        a20 = a[8];
        a21 = a[9];
        a22 = a[10];
        a23 = a[11];
        out[0] = a00;
        out[1] = a01;
        out[2] = a02;
        out[3] = a03;
        out[4] = a10;
        out[5] = a11;
        out[6] = a12;
        out[7] = a13;
        out[8] = a20;
        out[9] = a21;
        out[10] = a22;
        out[11] = a23;
        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
      }

      return out;
    }
    /**
     * Scales the mat4 by the dimensions in the given vec3 not using vectorization
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the matrix to scale
     * @param {vec3} v the vec3 to scale the matrix by
     * @returns {mat4} out
     **/

    function scale(out, a, v) {
      var x = v[0],
          y = v[1],
          z = v[2];
      out[0] = a[0] * x;
      out[1] = a[1] * x;
      out[2] = a[2] * x;
      out[3] = a[3] * x;
      out[4] = a[4] * y;
      out[5] = a[5] * y;
      out[6] = a[6] * y;
      out[7] = a[7] * y;
      out[8] = a[8] * z;
      out[9] = a[9] * z;
      out[10] = a[10] * z;
      out[11] = a[11] * z;
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
      return out;
    }
    /**
     * Creates a matrix from a quaternion rotation, vector translation and vector scale
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.translate(dest, vec);
     *     let quatMat = mat4.create();
     *     quat4.toMat4(quat, quatMat);
     *     mat4.multiply(dest, quatMat);
     *     mat4.scale(dest, scale)
     *
     * @param {mat4} out mat4 receiving operation result
     * @param {quat4} q Rotation quaternion
     * @param {vec3} v Translation vector
     * @param {vec3} s Scaling vector
     * @returns {mat4} out
     */

    function fromRotationTranslationScale(out, q, v, s) {
      // Quaternion math
      var x = q[0],
          y = q[1],
          z = q[2],
          w = q[3];
      var x2 = x + x;
      var y2 = y + y;
      var z2 = z + z;
      var xx = x * x2;
      var xy = x * y2;
      var xz = x * z2;
      var yy = y * y2;
      var yz = y * z2;
      var zz = z * z2;
      var wx = w * x2;
      var wy = w * y2;
      var wz = w * z2;
      var sx = s[0];
      var sy = s[1];
      var sz = s[2];
      out[0] = (1 - (yy + zz)) * sx;
      out[1] = (xy + wz) * sx;
      out[2] = (xz - wy) * sx;
      out[3] = 0;
      out[4] = (xy - wz) * sy;
      out[5] = (1 - (xx + zz)) * sy;
      out[6] = (yz + wx) * sy;
      out[7] = 0;
      out[8] = (xz + wy) * sz;
      out[9] = (yz - wx) * sz;
      out[10] = (1 - (xx + yy)) * sz;
      out[11] = 0;
      out[12] = v[0];
      out[13] = v[1];
      out[14] = v[2];
      out[15] = 1;
      return out;
    }
    /**
     * Generates a perspective projection matrix with the given bounds.
     * Passing null/undefined/no value for far will generate infinite projection matrix.
     *
     * @param {mat4} out mat4 frustum matrix will be written into
     * @param {number} fovy Vertical field of view in radians
     * @param {number} aspect Aspect ratio. typically viewport width/height
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum, can be null or Infinity
     * @returns {mat4} out
     */

    function perspective(out, fovy, aspect, near, far) {
      var f = 1.0 / Math.tan(fovy / 2),
          nf;
      out[0] = f / aspect;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[5] = f;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[11] = -1;
      out[12] = 0;
      out[13] = 0;
      out[15] = 0;

      if (far != null && far !== Infinity) {
        nf = 1 / (near - far);
        out[10] = (far + near) * nf;
        out[14] = 2 * far * near * nf;
      } else {
        out[10] = -1;
        out[14] = -2 * near;
      }

      return out;
    }
    /**
     * Generates a matrix that makes something look at something else.
     *
     * @param {mat4} out mat4 frustum matrix will be written into
     * @param {vec3} eye Position of the viewer
     * @param {vec3} center Point the viewer is looking at
     * @param {vec3} up vec3 pointing up
     * @returns {mat4} out
     */

    function targetTo(out, eye, target, up) {
      var eyex = eye[0],
          eyey = eye[1],
          eyez = eye[2],
          upx = up[0],
          upy = up[1],
          upz = up[2];
      var z0 = eyex - target[0],
          z1 = eyey - target[1],
          z2 = eyez - target[2];
      var len = z0 * z0 + z1 * z1 + z2 * z2;

      if (len > 0) {
        len = 1 / Math.sqrt(len);
        z0 *= len;
        z1 *= len;
        z2 *= len;
      }

      var x0 = upy * z2 - upz * z1,
          x1 = upz * z0 - upx * z2,
          x2 = upx * z1 - upy * z0;
      len = x0 * x0 + x1 * x1 + x2 * x2;

      if (len > 0) {
        len = 1 / Math.sqrt(len);
        x0 *= len;
        x1 *= len;
        x2 *= len;
      }

      out[0] = x0;
      out[1] = x1;
      out[2] = x2;
      out[3] = 0;
      out[4] = z1 * x2 - z2 * x1;
      out[5] = z2 * x0 - z0 * x2;
      out[6] = z0 * x1 - z1 * x0;
      out[7] = 0;
      out[8] = z0;
      out[9] = z1;
      out[10] = z2;
      out[11] = 0;
      out[12] = eyex;
      out[13] = eyey;
      out[14] = eyez;
      out[15] = 1;
      return out;
    }

    /**
     * 3 Dimensional Vector
     * @module vec3
     */

    /**
     * Creates a new, empty vec3
     *
     * @returns {vec3} a new 3D vector
     */

    function create$1() {
      var out = new ARRAY_TYPE(3);

      if (ARRAY_TYPE != Float32Array) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
      }

      return out;
    }
    /**
     * Calculates the length of a vec3
     *
     * @param {vec3} a vector to calculate length of
     * @returns {Number} length of a
     */

    function length(a) {
      var x = a[0];
      var y = a[1];
      var z = a[2];
      return Math.hypot(x, y, z);
    }
    /**
     * Creates a new vec3 initialized with the given values
     *
     * @param {Number} x X component
     * @param {Number} y Y component
     * @param {Number} z Z component
     * @returns {vec3} a new 3D vector
     */

    function fromValues(x, y, z) {
      var out = new ARRAY_TYPE(3);
      out[0] = x;
      out[1] = y;
      out[2] = z;
      return out;
    }
    /**
     * Normalize a vec3
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a vector to normalize
     * @returns {vec3} out
     */

    function normalize$1(out, a) {
      var x = a[0];
      var y = a[1];
      var z = a[2];
      var len = x * x + y * y + z * z;

      if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
      }

      out[0] = a[0] * len;
      out[1] = a[1] * len;
      out[2] = a[2] * len;
      return out;
    }
    /**
     * Calculates the dot product of two vec3's
     *
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {Number} dot product of a and b
     */

    function dot(a, b) {
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }
    /**
     * Computes the cross product of two vec3's
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the first operand
     * @param {vec3} b the second operand
     * @returns {vec3} out
     */

    function cross(out, a, b) {
      var ax = a[0],
          ay = a[1],
          az = a[2];
      var bx = b[0],
          by = b[1],
          bz = b[2];
      out[0] = ay * bz - az * by;
      out[1] = az * bx - ax * bz;
      out[2] = ax * by - ay * bx;
      return out;
    }
    /**
     * Transforms the vec3 with a mat4.
     * 4th vector component is implicitly '1'
     *
     * @param {vec3} out the receiving vector
     * @param {vec3} a the vector to transform
     * @param {mat4} m matrix to transform with
     * @returns {vec3} out
     */

    function transformMat4(out, a, m) {
      var x = a[0],
          y = a[1],
          z = a[2];
      var w = m[3] * x + m[7] * y + m[11] * z + m[15];
      w = w || 1.0;
      out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
      out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
      out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
      return out;
    }
    /**
     * Alias for {@link vec3.length}
     * @function
     */

    var len = length;
    /**
     * Perform some operation over an array of vec3s.
     *
     * @param {Array} a the array of vectors to iterate over
     * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
     * @param {Number} offset Number of elements to skip at the beginning of the array
     * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
     * @param {Function} fn Function to call for each vector in the array
     * @param {Object} [arg] additional argument to pass to fn
     * @returns {Array} a
     * @function
     */

    var forEach = function () {
      var vec = create$1();
      return function (a, stride, offset, count, fn, arg) {
        var i, l;

        if (!stride) {
          stride = 3;
        }

        if (!offset) {
          offset = 0;
        }

        if (count) {
          l = Math.min(count * stride + offset, a.length);
        } else {
          l = a.length;
        }

        for (i = offset; i < l; i += stride) {
          vec[0] = a[i];
          vec[1] = a[i + 1];
          vec[2] = a[i + 2];
          fn(vec, vec, arg);
          a[i] = vec[0];
          a[i + 1] = vec[1];
          a[i + 2] = vec[2];
        }

        return a;
      };
    }();

    /* node_modules/@sveltejs/gl/scene/Scene.svelte generated by Svelte v3.19.1 */

    const get_default_slot_changes = dirty => ({
    	width: dirty[0] & /*$width*/ 8,
    	height: dirty[0] & /*$height*/ 16
    });

    const get_default_slot_context = ctx => ({
    	width: /*$width*/ ctx[3],
    	height: /*$height*/ ctx[4]
    });

    // (444:1) {#if gl}
    function create_if_block(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[38].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[37], get_default_slot_context);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty[0] & /*$width, $height*/ 24 | dirty[1] & /*$$scope*/ 64) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[37], get_default_slot_context), get_slot_changes(default_slot_template, /*$$scope*/ ctx[37], dirty, get_default_slot_changes));
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div;
    	let canvas_1;
    	let t;
    	let div_resize_listener;
    	let current;
    	let if_block = /*gl*/ ctx[0] && create_if_block(ctx);

    	return {
    		c() {
    			div = element("div");
    			canvas_1 = element("canvas");
    			t = space();
    			if (if_block) if_block.c();
    			attr(canvas_1, "class", "svelte-6pzapg");
    			attr(div, "class", "container svelte-6pzapg");
    			add_render_callback(() => /*div_elementresize_handler*/ ctx[40].call(div));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, canvas_1);
    			/*canvas_1_binding*/ ctx[39](canvas_1);
    			append(div, t);
    			if (if_block) if_block.m(div, null);
    			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[40].bind(div));
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*gl*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			/*canvas_1_binding*/ ctx[39](null);
    			if (if_block) if_block.d();
    			div_resize_listener.cancel();
    		}
    	};
    }

    function is_intersecting(el) {
    	// TODO this shouldn't be necessary. But the initial value
    	// of entry.isIntersecting in an IO can be incorrect, it
    	// turns out? need to investigate further
    	const bcr = el.getBoundingClientRect();

    	return bcr.bottom > 0 && bcr.right > 0 && bcr.top < window.innerHeight && bcr.left < window.innerWidth;
    }

    function get_visibility(node) {
    	return readable(false, set => {
    		if (typeof IntersectionObserver !== "undefined") {
    			const observer = new IntersectionObserver(entries => {
    					// set(entries[0].isIntersecting);
    					set(is_intersecting(node));
    				});

    			observer.observe(node);
    			return () => observer.unobserve(node);
    		}

    		if (typeof window !== "undefined") {
    			function handler() {
    				const { top, bottom } = node.getBoundingClientRect();
    				set(bottom > 0 && top < window.innerHeight);
    			}

    			window.addEventListener("scroll", handler);
    			window.addEventListener("resize", handler);

    			return () => {
    				window.removeEventListener("scroll", handler);
    				window.removeEventListener("resize", handler);
    			};
    		}
    	});
    }

    const num_lights = 8;

    function instance$1($$self, $$props, $$invalidate) {
    	let $width;
    	let $height;

    	let $visible,
    		$$unsubscribe_visible = noop,
    		$$subscribe_visible = () => ($$unsubscribe_visible(), $$unsubscribe_visible = subscribe(visible, $$value => $$invalidate(20, $visible = $$value)), visible);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_visible());
    	let { background = [1, 1, 1] } = $$props;
    	let { backgroundOpacity = 1 } = $$props;
    	let { fog = undefined } = $$props;
    	let { pixelRatio = undefined } = $$props;
    	const use_fog = "fog" in $$props;
    	let canvas;
    	let visible = writable(false);
    	$$subscribe_visible();
    	let pending = false;
    	let update_scheduled = false;
    	let w;
    	let h;
    	let { gl } = $$props; // WebGL2RenderingContext
    	let { process_extra_shader_components } = $$props; // (gl, material) => {}

    	let draw = () => {
    		
    	};

    	let camera_stores = {
    		camera_matrix: writable(),
    		view: writable(),
    		projection: writable()
    	};

    	const invalidate = typeof window !== "undefined"
    	? () => {
    			if (!update_scheduled) {
    				update_scheduled = true;
    				requestAnimationFrame(draw);
    			}
    		}
    	: () => {
    			
    		};

    	const width = writable(1);
    	component_subscribe($$self, width, value => $$invalidate(3, $width = value));
    	const height = writable(1);
    	component_subscribe($$self, height, value => $$invalidate(4, $height = value));
    	const root_layer = create_layer(0, invalidate);
    	const default_camera = {}; /* TODO */
    	let camera = default_camera;
    	const meshes = [];

    	// lights
    	const lights = { ambient: [], directional: [], point: [] };

    	function add_to(array) {
    		return fn => {
    			array.push(fn);
    			invalidate();

    			onDestroy(() => {
    				const i = array.indexOf(fn);
    				if (~i) array.splice(i, 1);
    				invalidate();
    			});
    		};
    	}

    	const targets = new Map();
    	let camera_position_changed_since_last_render = true;

    	const scene = {
    		defines: [
    			`#define NUM_LIGHTS 2\n` + // TODO configure this
    			`#define USE_FOG ${use_fog}\n`
    		].join(""),
    		add_camera: _camera => {
    			if (camera && camera !== default_camera) {
    				throw new Error(`A scene can only have one camera`);
    			}

    			camera = _camera;
    			invalidate();

    			// TODO this is garbage
    			camera_stores.camera_matrix.set(camera.matrix);

    			camera_stores.projection.set(camera.projection);
    			camera_stores.view.set(camera.view);

    			onDestroy(() => {
    				camera = default_camera;
    				invalidate();
    			});
    		},
    		update_camera: camera => {
    			// for overlays
    			camera_stores.camera_matrix.set(camera.matrix);

    			camera_stores.view.set(camera.view);
    			camera_stores.projection.set(camera.projection);
    			camera_position_changed_since_last_render = true;
    			invalidate();
    		},
    		add_directional_light: add_to(lights.directional),
    		add_point_light: add_to(lights.point),
    		add_ambient_light: add_to(lights.ambient),
    		get_target(id) {
    			if (!targets.has(id)) targets.set(id, writable(null));
    			return targets.get(id);
    		},
    		invalidate,
    		...camera_stores,
    		width,
    		height
    	};

    	setContext(RENDERER, scene);
    	setContext(LAYER, root_layer);
    	const origin = identity(create());
    	const ctm = writable(origin);

    	setContext(PARENT, {
    		get_matrix_world: () => origin,
    		ctm: { subscribe: ctm.subscribe }
    	});

    	onMount(() => {
    		$$invalidate(17, scene.canvas = canvas, scene);
    		$$invalidate(0, gl = $$invalidate(17, scene.gl = canvas.getContext("webgl2"), scene));
    		$$subscribe_visible($$invalidate(2, visible = get_visibility(canvas)));
    		gl.clearColor(0, 0, 0, 0);

    		// const extensions = [
    		// 	'OES_element_index_uint',
    		// 	'OES_standard_derivatives'
    		// ];
    		//
    		// extensions.forEach(name => {
    		// 	const ext = gl.getExtension(name);
    		// 	if (!ext) {
    		// 		throw new Error(`Unsupported extension: ${name}`);
    		// 	}
    		// });
    		draw = force => {
    			if (!camera) return; // TODO make this `!ready` or something instead

    			if (dimensions_need_update) {
    				const DPR = pixelRatio || window.devicePixelRatio || 1;
    				$$invalidate(1, canvas.width = $width * DPR, canvas);
    				$$invalidate(1, canvas.height = $height * DPR, canvas);
    				gl.viewport(0, 0, $width * DPR, $height * DPR);
    				dimensions_need_update = false;
    			}

    			update_scheduled = false;

    			if (!$visible && !force) {
    				$$invalidate(12, pending = true);
    				return;
    			}

    			
    			$$invalidate(12, pending = false);

    			// gl.clearColor(...bg, backgroundOpacity);
    			// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    			gl.enable(gl.BLEND);
    			gl.enable(gl.CULL_FACE);
    			gl.enable(gl.DEPTH_TEST); // Enable depth testing
    			gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    			// Clear the canvas before we start drawing on it.
    			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    			// calculate total ambient light
    			const ambient_light = lights.ambient.reduce(
    				(total, { color, intensity }) => {
    					return [
    						Math.min(total[0] + color[0] * intensity, 1),
    						Math.min(total[1] + color[1] * intensity, 1),
    						Math.min(total[2] + color[2] * intensity, 1)
    					];
    				},
    				new Float32Array([0, 0, 0])
    			);

    			let previous_program;

    			let previous_state = {
    				[gl.DEPTH_TEST]: null,
    				[gl.CULL_FACE]: null
    			};

    			const enable = (key, enabled) => {
    				if (previous_state[key] !== enabled) {
    					if (enabled) gl.enable(key); else gl.disable(key);
    					previous_state[key] = enabled;
    				}
    			};

    			function render_mesh(
    				{ model, model_inverse_transpose, geometry, material, depthTest, doubleSided }
    			) {
    				// TODO should this even be possible?
    				if (!material) return;

    				enable(gl.DEPTH_TEST, depthTest !== false);
    				enable(gl.CULL_FACE, doubleSided !== true);

    				gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE); // source rgb
    				// dest rgb
    				// source alpha
    				// dest alpha

    				// set attributes
    				geometry.set_attributes(gl);

    				if (material.program !== previous_program) {
    					previous_program = material.program;

    					// TODO move logic to the mesh/material?
    					gl.useProgram(material.program);

    					// set built-ins
    					gl.uniform3fv(material.uniform_locations.AMBIENT_LIGHT, ambient_light);

    					if (use_fog) {
    						gl.uniform3fv(material.uniform_locations.FOG_COLOR, bg);
    						gl.uniform1f(material.uniform_locations.FOG_DENSITY, fog);
    					}

    					if (material.uniform_locations.DIRECTIONAL_LIGHTS) {
    						for (let i = 0; i < num_lights; i += 1) {
    							const light = lights.directional[i];
    							if (!light) break;
    							gl.uniform3fv(material.uniform_locations.DIRECTIONAL_LIGHTS[i].direction, light.direction);
    							gl.uniform3fv(material.uniform_locations.DIRECTIONAL_LIGHTS[i].color, light.color);
    							gl.uniform1f(material.uniform_locations.DIRECTIONAL_LIGHTS[i].intensity, light.intensity);
    						}
    					}

    					if (material.uniform_locations.POINT_LIGHTS) {
    						for (let i = 0; i < num_lights; i += 1) {
    							const light = lights.point[i];
    							if (!light) break;
    							gl.uniform3fv(material.uniform_locations.POINT_LIGHTS[i].location, light.location);
    							gl.uniform3fv(material.uniform_locations.POINT_LIGHTS[i].color, light.color);
    							gl.uniform1f(material.uniform_locations.POINT_LIGHTS[i].intensity, light.intensity);
    						}
    					}

    					gl.uniform3fv(material.uniform_locations.CAMERA_WORLD_POSITION, camera.world_position);
    					gl.uniformMatrix4fv(material.uniform_locations.VIEW, false, camera.view);
    					gl.uniformMatrix4fv(material.uniform_locations.PROJECTION, false, camera.projection);
    				}

    				// set mesh-specific built-in uniforms
    				gl.uniformMatrix4fv(material.uniform_locations.MODEL, false, model);

    				gl.uniformMatrix4fv(material.uniform_locations.MODEL_INVERSE_TRANSPOSE, false, model_inverse_transpose);

    				if (typeof process_extra_shader_components == "function") {
    					// set material-specific built-in uniforms
    					material.apply_uniforms(gl, null, model, process_extra_shader_components);
    				} else {
    					// set material-specific built-in uniforms
    					material.apply_uniforms(gl);
    				}

    				// draw
    				if (geometry.index) {
    					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.buffers.__index);
    					gl.drawElements(gl[geometry.primitive], geometry.index.length, gl.UNSIGNED_INT, 0);
    				} else {
    					// if (geometry.primitive === 'POINTS') {
    					// 	console.log("If ", (gl[geometry.primitive] === gl.POINTS));
    					// 	console.log("Draw gl.POINTS for " + geometry.count + " point(s)" );
    					// }
    					const primitiveType = gl[geometry.primitive];

    					gl.drawArrays(primitiveType, 0, geometry.count);
    				}
    			}

    			function render_layer(layer) {
    				if (layer.needs_sort) {
    					layer.child_layers.sort((a, b) => a.index - b.index);
    					layer.needs_sort = false;
    				}

    				gl.depthMask(true);
    				gl.clearDepth(1);
    				gl.clear(gl.DEPTH_BUFFER_BIT);

    				for (let i = 0; i < layer.meshes.length; i += 1) {
    					render_mesh(layer.meshes[i]);
    				}

    				// TODO sort transparent meshes, furthest to closest
    				gl.depthMask(false);

    				if (camera_position_changed_since_last_render || layer.needs_transparency_sort) {
    					sort_transparent_meshes(layer.transparent_meshes);
    					layer.needs_transparency_sort = false;
    				}

    				for (let i = 0; i < layer.transparent_meshes.length; i += 1) {
    					render_mesh(layer.transparent_meshes[i]);
    				}

    				for (let i = 0; i < layer.child_layers.length; i += 1) {
    					render_layer(layer.child_layers[i]);
    				}
    			}

    			render_layer(root_layer);
    			camera_position_changed_since_last_render = false;
    		};

    		// for some wacky reason, Adblock Plus seems to prevent the
    		// initial dimensions from being correctly reported
    		const timeout = setTimeout(() => {
    			set_store_value(width, $width = canvas.clientWidth);
    			set_store_value(height, $height = canvas.clientHeight);
    		});

    		tick().then(() => draw(true));

    		return () => {
    			gl.getExtension("WEBGL_lose_context").loseContext();
    			clearTimeout(timeout);
    		};
    	});

    	const sort_transparent_meshes = meshes => {
    		if (meshes.length < 2) return;
    		const lookup = new Map();
    		const out = new Float32Array(16);

    		meshes.forEach(mesh => {
    			const z = multiply(out, camera.view, mesh.model)[14];
    			lookup.set(mesh, z);
    		});

    		meshes.sort((a, b) => lookup.get(a) - lookup.get(b));
    	};

    	let dimensions_need_update = true;

    	const update_dimensions = () => {
    		dimensions_need_update = true;
    		invalidate();
    	};

    	let { $$slots = {}, $$scope } = $$props;

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, canvas = $$value);
    		});
    	}

    	function div_elementresize_handler() {
    		$width = this.clientWidth;
    		width.set($width);
    		$height = this.clientHeight;
    		height.set($height);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate(36, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("background" in $$new_props) $$invalidate(7, background = $$new_props.background);
    		if ("backgroundOpacity" in $$new_props) $$invalidate(8, backgroundOpacity = $$new_props.backgroundOpacity);
    		if ("fog" in $$new_props) $$invalidate(9, fog = $$new_props.fog);
    		if ("pixelRatio" in $$new_props) $$invalidate(10, pixelRatio = $$new_props.pixelRatio);
    		if ("gl" in $$new_props) $$invalidate(0, gl = $$new_props.gl);
    		if ("process_extra_shader_components" in $$new_props) $$invalidate(11, process_extra_shader_components = $$new_props.process_extra_shader_components);
    		if ("$$scope" in $$new_props) $$invalidate(37, $$scope = $$new_props.$$scope);
    	};

    	let bg;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*background*/ 128) {
    			 bg = process_color(background);
    		}

    		if ($$self.$$.dirty[0] & /*$width, $height*/ 24) {
    			 (update_dimensions());
    		}

    		if ($$self.$$.dirty[0] & /*background, backgroundOpacity, fog, scene*/ 131968) {
    			 (scene.invalidate());
    		}

    		if ($$self.$$.dirty[0] & /*$visible, pending, scene*/ 1183744) {
    			 if ($visible && pending) scene.invalidate();
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		gl,
    		canvas,
    		visible,
    		$width,
    		$height,
    		width,
    		height,
    		background,
    		backgroundOpacity,
    		fog,
    		pixelRatio,
    		process_extra_shader_components,
    		pending,
    		update_scheduled,
    		draw,
    		camera,
    		camera_position_changed_since_last_render,
    		scene,
    		dimensions_need_update,
    		bg,
    		$visible,
    		use_fog,
    		w,
    		h,
    		camera_stores,
    		invalidate,
    		root_layer,
    		default_camera,
    		meshes,
    		lights,
    		add_to,
    		targets,
    		origin,
    		ctm,
    		sort_transparent_meshes,
    		update_dimensions,
    		$$props,
    		$$scope,
    		$$slots,
    		canvas_1_binding,
    		div_elementresize_handler
    	];
    }

    class Scene extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				background: 7,
    				backgroundOpacity: 8,
    				fog: 9,
    				pixelRatio: 10,
    				gl: 0,
    				process_extra_shader_components: 11
    			},
    			[-1, -1]
    		);
    	}
    }

    /**
     * 3x3 Matrix
     * @module mat3
     */

    /**
     * Creates a new identity mat3
     *
     * @returns {mat3} a new 3x3 matrix
     */

    function create$2() {
      var out = new ARRAY_TYPE(9);

      if (ARRAY_TYPE != Float32Array) {
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[5] = 0;
        out[6] = 0;
        out[7] = 0;
      }

      out[0] = 1;
      out[4] = 1;
      out[8] = 1;
      return out;
    }

    /**
     * 4 Dimensional Vector
     * @module vec4
     */

    /**
     * Creates a new, empty vec4
     *
     * @returns {vec4} a new 4D vector
     */

    function create$3() {
      var out = new ARRAY_TYPE(4);

      if (ARRAY_TYPE != Float32Array) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
      }

      return out;
    }
    /**
     * Normalize a vec4
     *
     * @param {vec4} out the receiving vector
     * @param {vec4} a vector to normalize
     * @returns {vec4} out
     */

    function normalize$2(out, a) {
      var x = a[0];
      var y = a[1];
      var z = a[2];
      var w = a[3];
      var len = x * x + y * y + z * z + w * w;

      if (len > 0) {
        len = 1 / Math.sqrt(len);
      }

      out[0] = x * len;
      out[1] = y * len;
      out[2] = z * len;
      out[3] = w * len;
      return out;
    }
    /**
     * Perform some operation over an array of vec4s.
     *
     * @param {Array} a the array of vectors to iterate over
     * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
     * @param {Number} offset Number of elements to skip at the beginning of the array
     * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
     * @param {Function} fn Function to call for each vector in the array
     * @param {Object} [arg] additional argument to pass to fn
     * @returns {Array} a
     * @function
     */

    var forEach$1 = function () {
      var vec = create$3();
      return function (a, stride, offset, count, fn, arg) {
        var i, l;

        if (!stride) {
          stride = 4;
        }

        if (!offset) {
          offset = 0;
        }

        if (count) {
          l = Math.min(count * stride + offset, a.length);
        } else {
          l = a.length;
        }

        for (i = offset; i < l; i += stride) {
          vec[0] = a[i];
          vec[1] = a[i + 1];
          vec[2] = a[i + 2];
          vec[3] = a[i + 3];
          fn(vec, vec, arg);
          a[i] = vec[0];
          a[i + 1] = vec[1];
          a[i + 2] = vec[2];
          a[i + 3] = vec[3];
        }

        return a;
      };
    }();

    /**
     * Quaternion
     * @module quat
     */

    /**
     * Creates a new identity quat
     *
     * @returns {quat} a new quaternion
     */

    function create$4() {
      var out = new ARRAY_TYPE(4);

      if (ARRAY_TYPE != Float32Array) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
      }

      out[3] = 1;
      return out;
    }
    /**
     * Sets a quat from the given angle and rotation axis,
     * then returns it.
     *
     * @param {quat} out the receiving quaternion
     * @param {vec3} axis the axis around which to rotate
     * @param {Number} rad the angle in radians
     * @returns {quat} out
     **/

    function setAxisAngle(out, axis, rad) {
      rad = rad * 0.5;
      var s = Math.sin(rad);
      out[0] = s * axis[0];
      out[1] = s * axis[1];
      out[2] = s * axis[2];
      out[3] = Math.cos(rad);
      return out;
    }
    /**
     * Performs a spherical linear interpolation between two quat
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a the first operand
     * @param {quat} b the second operand
     * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
     * @returns {quat} out
     */

    function slerp(out, a, b, t) {
      // benchmarks:
      //    http://jsperf.com/quaternion-slerp-implementations
      var ax = a[0],
          ay = a[1],
          az = a[2],
          aw = a[3];
      var bx = b[0],
          by = b[1],
          bz = b[2],
          bw = b[3];
      var omega, cosom, sinom, scale0, scale1; // calc cosine

      cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

      if (cosom < 0.0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
      } // calculate coefficients


      if (1.0 - cosom > EPSILON) {
        // standard case (slerp)
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
      } else {
        // "from" and "to" quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
      } // calculate final values


      out[0] = scale0 * ax + scale1 * bx;
      out[1] = scale0 * ay + scale1 * by;
      out[2] = scale0 * az + scale1 * bz;
      out[3] = scale0 * aw + scale1 * bw;
      return out;
    }
    /**
     * Creates a quaternion from the given 3x3 rotation matrix.
     *
     * NOTE: The resultant quaternion is not normalized, so you should be sure
     * to renormalize the quaternion yourself where necessary.
     *
     * @param {quat} out the receiving quaternion
     * @param {mat3} m rotation matrix
     * @returns {quat} out
     * @function
     */

    function fromMat3(out, m) {
      // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
      // article "Quaternion Calculus and Fast Animation".
      var fTrace = m[0] + m[4] + m[8];
      var fRoot;

      if (fTrace > 0.0) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0); // 2w

        out[3] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot; // 1/(4w)

        out[0] = (m[5] - m[7]) * fRoot;
        out[1] = (m[6] - m[2]) * fRoot;
        out[2] = (m[1] - m[3]) * fRoot;
      } else {
        // |w| <= 1/2
        var i = 0;
        if (m[4] > m[0]) i = 1;
        if (m[8] > m[i * 3 + i]) i = 2;
        var j = (i + 1) % 3;
        var k = (i + 2) % 3;
        fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
        out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
        out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
      }

      return out;
    }
    /**
     * Creates a quaternion from the given euler angle x, y, z.
     *
     * @param {quat} out the receiving quaternion
     * @param {x} Angle to rotate around X axis in degrees.
     * @param {y} Angle to rotate around Y axis in degrees.
     * @param {z} Angle to rotate around Z axis in degrees.
     * @returns {quat} out
     * @function
     */

    function fromEuler(out, x, y, z) {
      var halfToRad = 0.5 * Math.PI / 180.0;
      x *= halfToRad;
      y *= halfToRad;
      z *= halfToRad;
      var sx = Math.sin(x);
      var cx = Math.cos(x);
      var sy = Math.sin(y);
      var cy = Math.cos(y);
      var sz = Math.sin(z);
      var cz = Math.cos(z);
      out[0] = sx * cy * cz - cx * sy * sz;
      out[1] = cx * sy * cz + sx * cy * sz;
      out[2] = cx * cy * sz - sx * sy * cz;
      out[3] = cx * cy * cz + sx * sy * sz;
      return out;
    }
    /**
     * Normalize a quat
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a quaternion to normalize
     * @returns {quat} out
     * @function
     */

    var normalize$3 = normalize$2;
    /**
     * Sets a quaternion to represent the shortest rotation from one
     * vector to another.
     *
     * Both vectors are assumed to be unit length.
     *
     * @param {quat} out the receiving quaternion.
     * @param {vec3} a the initial vector
     * @param {vec3} b the destination vector
     * @returns {quat} out
     */

    var rotationTo = function () {
      var tmpvec3 = create$1();
      var xUnitVec3 = fromValues(1, 0, 0);
      var yUnitVec3 = fromValues(0, 1, 0);
      return function (out, a, b) {
        var dot$1 = dot(a, b);

        if (dot$1 < -0.999999) {
          cross(tmpvec3, xUnitVec3, a);
          if (len(tmpvec3) < 0.000001) cross(tmpvec3, yUnitVec3, a);
          normalize$1(tmpvec3, tmpvec3);
          setAxisAngle(out, tmpvec3, Math.PI);
          return out;
        } else if (dot$1 > 0.999999) {
          out[0] = 0;
          out[1] = 0;
          out[2] = 0;
          out[3] = 1;
          return out;
        } else {
          cross(tmpvec3, a, b);
          out[0] = tmpvec3[0];
          out[1] = tmpvec3[1];
          out[2] = tmpvec3[2];
          out[3] = 1 + dot$1;
          return normalize$3(out, out);
        }
      };
    }();
    /**
     * Performs a spherical linear interpolation with two control points
     *
     * @param {quat} out the receiving quaternion
     * @param {quat} a the first operand
     * @param {quat} b the second operand
     * @param {quat} c the third operand
     * @param {quat} d the fourth operand
     * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
     * @returns {quat} out
     */

    var sqlerp = function () {
      var temp1 = create$4();
      var temp2 = create$4();
      return function (out, a, b, c, d, t) {
        slerp(temp1, a, d, t);
        slerp(temp2, b, c, t);
        slerp(out, temp1, temp2, 2 * t * (1 - t));
        return out;
      };
    }();
    /**
     * Sets the specified quaternion with values corresponding to the given
     * axes. Each axis is a vec3 and is expected to be unit length and
     * perpendicular to all other specified axes.
     *
     * @param {vec3} view  the vector representing the viewing direction
     * @param {vec3} right the vector representing the local "right" direction
     * @param {vec3} up    the vector representing the local "up" direction
     * @returns {quat} out
     */

    var setAxes = function () {
      var matr = create$2();
      return function (out, view, right, up) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];
        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];
        matr[2] = -view[0];
        matr[5] = -view[1];
        matr[8] = -view[2];
        return normalize$3(out, fromMat3(out, matr));
      };
    }();

    /* node_modules/@sveltejs/gl/scene/Group.svelte generated by Svelte v3.19.1 */

    function create_fragment$2(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[18].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[17], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 131072) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[17], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[17], dirty, null));
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $target,
    		$$unsubscribe_target = noop,
    		$$subscribe_target = () => ($$unsubscribe_target(), $$unsubscribe_target = subscribe(target, $$value => $$invalidate(11, $target = $$value)), target);

    	let $parent_ctm;
    	let $ctm;
    	$$self.$$.on_destroy.push(() => $$unsubscribe_target());
    	let { location = [0, 0, 0] } = $$props;
    	let { lookAt = undefined } = $$props;
    	let { up = [0, 1, 0] } = $$props;
    	let { rotation = [0, 0, 0] } = $$props; // TODO make it possible to set a quaternion as a prop?
    	let { scale: scale$1 = 1 } = $$props;
    	const scene = get_scene();
    	const parent = get_parent();
    	const { ctm: parent_ctm } = parent;
    	component_subscribe($$self, parent_ctm, value => $$invalidate(12, $parent_ctm = value));
    	const ctm = writable(null);
    	component_subscribe($$self, ctm, value => $$invalidate(13, $ctm = value));
    	let matrix = create();
    	let quaternion = create$4();
    	const world_position = new Float32Array(matrix.buffer, 12 * 4, 3);
    	set_parent({ ctm });
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("location" in $$props) $$invalidate(3, location = $$props.location);
    		if ("lookAt" in $$props) $$invalidate(4, lookAt = $$props.lookAt);
    		if ("up" in $$props) $$invalidate(5, up = $$props.up);
    		if ("rotation" in $$props) $$invalidate(6, rotation = $$props.rotation);
    		if ("scale" in $$props) $$invalidate(7, scale$1 = $$props.scale);
    		if ("$$scope" in $$props) $$invalidate(17, $$scope = $$props.$$scope);
    	};

    	let scale_array;
    	let target;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*scale*/ 128) {
    			 $$invalidate(10, scale_array = typeof scale$1 === "number"
    			? [scale$1, scale$1, scale$1]
    			: scale$1);
    		}

    		if ($$self.$$.dirty & /*lookAt*/ 16) {
    			 $$subscribe_target($$invalidate(0, target = lookAt ? scene.get_target(lookAt) : writable(null)));
    		}

    		if ($$self.$$.dirty & /*$target, matrix, $parent_ctm, location, up, scale_array, quaternion, rotation, $ctm*/ 16232) {
    			 if ($target) {
    				translate(matrix, $parent_ctm, location);
    				targetTo(matrix, world_position, $target, up);
    				scale(matrix, matrix, scale_array);
    				set_store_value(ctm, $ctm = matrix);
    			} else {
    				$$invalidate(9, quaternion = fromEuler(quaternion || create$4(), ...rotation));
    				$$invalidate(8, matrix = fromRotationTranslationScale(matrix, quaternion, location, scale_array));
    				set_store_value(ctm, $ctm = multiply($ctm || create(), $parent_ctm, matrix));
    			}
    		}

    		if ($$self.$$.dirty & /*$ctm*/ 8192) {
    			// $: quaternion = quat.fromEuler(quaternion || quat.create(), ...rotation);
    			// $: matrix = mat4.fromRotationTranslationScale(matrix || mat4.create(), quaternion, location, scale_array);
    			// $: $ctm = mat4.multiply($ctm || mat4.create(), $parent_ctm, matrix);
    			 (scene.invalidate());
    		}
    	};

    	return [
    		target,
    		parent_ctm,
    		ctm,
    		location,
    		lookAt,
    		up,
    		rotation,
    		scale$1,
    		matrix,
    		quaternion,
    		scale_array,
    		$target,
    		$parent_ctm,
    		$ctm,
    		scene,
    		parent,
    		world_position,
    		$$scope,
    		$$slots
    	];
    }

    class Group extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			location: 3,
    			lookAt: 4,
    			up: 5,
    			rotation: 6,
    			scale: 7
    		});
    	}
    }

    var vert_builtin = "\nprecision highp float;\nuniform mat4 MODEL;\nuniform mat4 PROJECTION;\nuniform mat4 VIEW;\nuniform mat4 MODEL_INVERSE_TRANSPOSE;\nuniform vec3 CAMERA_WORLD_POSITION;\nstruct PointLight {\n\tvec3 location;\n\tvec3 color;\n\tfloat intensity;\n};\nuniform PointLight POINT_LIGHTS[NUM_LIGHTS];\n";

    var frag_builtin = "#extension GL_OES_standard_derivatives : enable\nprecision highp float;\nstruct DirectionalLight {\n\tvec3 direction;\n\tvec3 color;\n\tfloat intensity;\n};\nstruct PointLight {\n\tvec3 location;\n\tvec3 color;\n\tfloat intensity;\n};\nuniform vec3 AMBIENT_LIGHT;\nuniform DirectionalLight DIRECTIONAL_LIGHTS[NUM_LIGHTS];\nuniform PointLight POINT_LIGHTS[NUM_LIGHTS];\n";

    const caches = new Map();

    const setters = {
    	[5126]:  (gl, loc, data) => gl.uniform1f(loc, data),
    	[35664]: (gl, loc, data) => gl.uniform2fv(loc, data),
    	[35665]: (gl, loc, data) => gl.uniform3fv(loc, data),
    	[35666]: (gl, loc, data) => gl.uniform4fv(loc, data),

    	[35674]: (gl, loc, data) => gl.uniformMatrix2fv(loc, false, data),
    	[35675]: (gl, loc, data) => gl.uniformMatrix3fv(loc, false, data),
    	[35676]: (gl, loc, data) => gl.uniformMatrix4fv(loc, false, data),

    	[35678]: (gl, loc, data) => {
    		gl.activeTexture(gl[`TEXTURE${data.index}`]);
    		gl.bindTexture(gl.TEXTURE_2D, data.texture);
    		gl.uniform1i(loc, data.index);
    	}
    	//,
    	// TEXTURE_CUBE_MAP
    	// [35680]: (gl, loc, data) => {
    	// 	gl.bindTexture(gl.TEXTURE_CUBE_MAP, data.texture);
    	// 	gl.uniform1i(loc, data.index);
    	// }
    };

    function compile(gl, vert, frag) {
    	if (!caches.has(gl)) caches.set(gl, new Map());
    	const cache = caches.get(gl);

    	const hash = vert + frag;
    	if (!cache.has(hash)) {
    		const program = create_program(gl, vert, frag);
    		const uniforms = get_uniforms(gl, program);
    		const attributes = get_attributes(gl, program);

    		cache.set(hash, { program, uniforms, attributes });
    	}

    	return cache.get(hash);
    }

    function pad(num, len = 4) {
    	num = String(num);
    	while (num.length < len) num = ` ${num}`;
    	return num;
    }

    function repeat(str, i) {
    	let result = '';
    	while (i--) result += str;
    	return result;
    }

    function create_shader(gl, type, source, label) {
    	const shader = gl.createShader(type);
    	gl.shaderSource(shader, source);
    	gl.compileShader(shader);

    	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    		return shader;
    	}

    	const log = gl.getShaderInfoLog(shader);
    	const match = /ERROR: (\d+):(\d+): (.+)/.exec(log);

    	if (match) {
    		const c = +match[1];
    		const l = +match[2] - 1;

    		console.log('%c' + match[3], 'font-weight: bold; color: red');

    		const lines = source.split('\n');
    		for (let i = 0; i < lines.length; i += 1) {
    			if (Math.abs(l - i) > 5) continue;

    			const line = lines[i].replace(/^\t+/gm, tabs => repeat(' ', tabs.length * 4));
    			const indent = /^\s+/.exec(line);

    			const str = `${pad(i)}: ${line}`;

    			if (i === l) {
    				console.log('%c' + str, 'font-weight: bold; color: red');
    				console.log('%c' + (indent && indent[0] || '') + repeat(' ', c + 6) + '^', 'color: red');
    			} else {
    				console.log(str);
    			}
    		}

    		throw new Error(`Failed to compile ${label} shader`);
    	}

    	throw new Error(`Failed to compile ${label} shader:\n${log}`);
    }

    function create_program(gl, vert, frag) {
    	const program = gl.createProgram();

    	gl.attachShader(program, create_shader(gl, gl.VERTEX_SHADER, vert, 'vertex'));
    	gl.attachShader(program, create_shader(gl, gl.FRAGMENT_SHADER, frag, 'fragment'));
    	gl.linkProgram(program);

    	const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    	if (!success) {
    		console.log(gl.getProgramInfoLog(program));
    		throw new Error(`Failed to compile program:\n${gl.getProgramInfoLog(program)}`);
    	}

    	return program;
    }

    function get_uniforms(gl, program) {
    	const uniforms = [];

    	const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    	for (let i = 0; i < n; i += 1) {
    		let { size, type, name } = gl.getActiveUniform(program, i);
    		const loc = gl.getUniformLocation(program, name);
    		const setter = setters[type];

    		// if (!setter) {
    		// 	throw new Error(`not implemented ${type} (${name})`);
    		// }

    		uniforms.push({ size, type, name, setter, loc });
    	}

    	return uniforms;
    }

    function get_attributes(gl, program) {
    	const attributes = [];

    	const n = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

    	for (let i = 0; i < n; i += 1) {
    		let { size, type, name } = gl.getActiveAttrib(program, i);
    		name = name.replace('[0]', '');
    		const loc = gl.getAttribLocation(program, name);

    		attributes.push({ size, type, name, loc });
    	}

    	return attributes;
    }

    function deep_set(obj, path, value) {
    	const parts = path.replace(/\]$/, '').split(/\[|\]\.|\./);

    	while (parts.length > 1) {
    		const part = parts.shift();
    		const next = parts[0];

    		if (!obj[part]) obj[part] = /^\d+$/.test(next) ? [] : {};
    		obj = obj[part];
    	}

    	obj[parts[0]] = value;
    }

    class Material {
    	constructor(scene, vert, frag, defines) {
    		this.scene = scene;

    		const gl = scene.gl;
    		this.gl = gl;

    		const { program, uniforms, attributes } = compile(
    			gl,
    			'#version 300 es' + '\n\n' + scene.defines + defines + '\n\n' + vert_builtin + '\n\n' + vert,
    			'#version 300 es' + '\n\n' + scene.defines + defines + '\n\n' + frag_builtin + '\n\n' + frag
    		);

    		// console.log(vert.match(/(?:NAME\s)(.+)/g));

    		this.vertName = (vert.match(/(?:NAME\s)(.+)/g) !== null) ?
    			vert.match(/(?:NAME\s)(.+)/g)[0].substr(5) :
    			"default";

    		this.fragName = (frag.match(/(?:NAME\s)(.+)/g) !== null) ?
    			frag.match(/(?:NAME\s)(.+)/g)[0].substr(5) :
    			"default";

    		this.program = program;
    		this.uniforms = uniforms;
    		this.attributes = attributes;

    		this.uniform_locations = {};
    		this.uniforms.forEach(uniform => {
    			deep_set(this.uniform_locations, uniform.name, gl.getUniformLocation(this.program, uniform.name));
    		});

    		this.attribute_locations = {};
    		this.attributes.forEach(attribute => {
    			this.attribute_locations[attribute.name] = gl.getAttribLocation(this.program, attribute.name);
    		});

    		this.raw_values = {};
    		this.values = {};
    	}

    	set_uniforms(raw_values) {
    		let texture_index = 0;

    		this.uniforms.forEach(({ name, type, loc, setter, processor }) => {
    			if (name in raw_values) {
    				let data = raw_values[name];

    				if (data === this.raw_values[name]) return;

    				if (type === 35678) {
    					// texture
    					this.values[name] = {
    						texture: data.instantiate(this.scene)._,
    						index: texture_index++
    					};

    					return;
    				}

    				if (typeof data === 'number' && type !== 5126) {
    					// data provided was a number like 0x123456,
    					// but it needs to be an array. for now,
    					// assume it's a color, i.e. vec3
    					data = process_color(data);
    				}

    				this.values[name] = data;
    			}
    		});

    		this.raw_values = raw_values;
    	}

    	apply_uniforms(gl, builtins, model, process_extra_shader_components) {
    		// TODO if this is the only program, maybe
    		// we don't need to re-run this each time
    		this.uniforms.forEach(uniform => {
    			if (uniform.name in this.values) {
    				uniform.setter(gl, uniform.loc, this.values[uniform.name]);
    			}
    		});

    		if (typeof process_extra_shader_components === 'function') {
    			process_extra_shader_components(gl, this, model);
    		}
    	}

    	destroy() {
    		// TODO
    	}
    }

    var vert_default = "in vec3 position;\nin vec3 normal;\nout vec3 v_normal;\n#if defined(has_colormap) || defined(has_specularitymap) || defined(has_normalmap) || defined(has_bumpmap)\n#define has_textures true\n#endif\n#ifdef has_textures\nin vec2 uv;\nout vec2 v_uv;\n#endif\n#if defined(has_normalmap) || defined(has_bumpmap)\nout vec3 v_view_position;\n#endif\nout vec3 v_surface_to_light[NUM_LIGHTS];\n#ifdef has_specularity\nout vec3 v_surface_to_view[NUM_LIGHTS];\n#endif\n#ifdef USE_FOG\nout float v_fog_depth;\n#endif\nvoid main() {\n\tvec4 pos = vec4(position, 1.0);\n\tvec4 model_view_pos = VIEW * MODEL * pos;\n\tv_normal = (MODEL_INVERSE_TRANSPOSE * vec4(normal, 0.0)).xyz;\n\t#ifdef has_textures\n\tv_uv = uv;\n\t#endif\n\t#if defined(has_normalmap) || defined(has_bumpmap)\n\tv_view_position = model_view_pos.xyz;\n\t#endif\n\t#ifdef USE_FOG\n\tv_fog_depth = -model_view_pos.z;\n\t#endif\n\tfor (int i = 0; i < NUM_LIGHTS; i += 1) {\n\t\tPointLight light = POINT_LIGHTS[i];\n\t\tvec3 surface_world_position = (MODEL * pos).xyz;\n\t\tv_surface_to_light[i] = light.location - surface_world_position;\n\t\t#ifdef has_specularity\n\t\tv_surface_to_view[i] = CAMERA_WORLD_POSITION - surface_world_position;\n\t\t#endif\n\t}\n\tgl_Position = PROJECTION * model_view_pos;\n}\n";

    var frag_default = "#if defined(has_colormap) || defined(has_specularitymap) || defined(has_normalmap) || defined(has_bumpmap) || defined(has_emissivemap)\n#define has_textures true\n#endif\n#ifdef has_textures\nin vec2 v_uv;\n#endif\n#ifdef has_specularity\nuniform float specularity;\n#endif\n#ifdef has_colormap\nuniform sampler2D colormap;\n#endif\n#ifdef has_emissivemap\nuniform sampler2D emissivemap;\n#endif\n#ifdef has_specularitymap\nuniform sampler2D specularitymap;\n#endif\n#ifdef has_bumpmap\nuniform sampler2D bumpmap;\nvec2 dHdxy_fwd() {\n\tvec2 dSTdx = dFdx(v_uv);\n\tvec2 dSTdy = dFdy(v_uv);\n\tfloat Hll = texture(bumpmap, v_uv).x;\n\tfloat dBx = texture(bumpmap, v_uv + dSTdx).x - Hll;\n\tfloat dBy = texture(bumpmap, v_uv + dSTdy).x - Hll;\n\t#ifdef has_bumpscale\n\tHll *= bumpscale;\n\tdBx *= bumpscale;\n\tdBy *= bumpscale;\n\t#endif\n\treturn vec2(dBx, dBy);\n}\nvec3 perturbNormalArb(vec3 surf_pos, vec3 surface_normal, vec2 dHdxy) {\n\tvec3 vSigmaX = vec3(dFdx(surf_pos.x), dFdx(surf_pos.y), dFdx(surf_pos.z));\n\tvec3 vSigmaY = vec3(dFdy(surf_pos.x), dFdy(surf_pos.y), dFdy(surf_pos.z));\n\tvec3 vN = surface_normal;\n\tvec3 R1 = cross(vSigmaY, vN);\n\tvec3 R2 = cross(vN, vSigmaX);\n\tfloat fDet = dot(vSigmaX, R1);\n\tfDet *= (float(gl_FrontFacing) * 2.0 - 1.0);\n\tvec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);\n\treturn normalize(abs(fDet) * surface_normal - vGrad);\n}\n#endif\n#ifdef has_bumpscale\nuniform float bumpscale;\n#endif\n#ifdef has_normalmap\nuniform sampler2D normalmap;\nvec3 perturbNormal2Arb(vec3 eye_pos, vec3 surface_normal) {\n\tvec3 q0 = vec3(dFdx(eye_pos.x), dFdx(eye_pos.y), dFdx(eye_pos.z));\n\tvec3 q1 = vec3(dFdy(eye_pos.x), dFdy(eye_pos.y), dFdy(eye_pos.z));\n\tvec2 st0 = dFdx(v_uv.st);\n\tvec2 st1 = dFdy(v_uv.st);\n\tif (length(q0) == 0.0) {\n\t\treturn surface_normal;\n\t}\n\tfloat scale = sign(st1.t * st0.s - st0.t * st1.s);\n\tvec3 S = normalize((q0 * st1.t - q1 * st0.t) * scale);\n\tvec3 T = normalize((-q0 * st1.s + q1 * st0.s) * scale);\n\tvec3 N = normalize(surface_normal);\n\tmat3 tsn = mat3(S, T, N);\n\tvec3 mapN = texture(normalmap, v_uv).xyz * 2.0 - 1.0;\n\tmapN.xy *= (float(gl_FrontFacing) * 2.0 - 1.0);\n\treturn normalize(tsn * mapN);\n}\n#endif\n#ifdef has_color\nuniform vec3 color;\n#endif\n#ifdef has_emissive\nuniform vec3 emissive;\n#endif\n#ifdef has_alpha\nuniform float alpha;\n#endif\n#ifdef USE_FOG\nuniform vec3 FOG_COLOR;\nuniform float FOG_DENSITY;\nin float v_fog_depth;\n#endif\nin vec3 v_normal;\n#if defined(has_normalmap) || defined(has_bumpmap)\nin vec3 v_view_position;\n#endif\nin vec3 v_surface_to_light[NUM_LIGHTS];\nin vec3 v_surface_to_view[NUM_LIGHTS];\nout mediump vec4 fragColor;\nvoid main () {\n\tvec3 normal = normalize(v_normal);\n\t#ifdef has_bumpmap\n\t\tnormal = perturbNormalArb(-v_view_position, normal, dHdxy_fwd());\n\t#elif defined(has_normalmap)\n\t\tnormal = perturbNormal2Arb(-v_view_position, normal);\n\t#endif\n\tvec3 lighting = vec3(0.0);\n\tvec3 spec_amount = vec3(0.0);\n\tfor (int i = 0; i < NUM_LIGHTS; i += 1) {\n\t\tDirectionalLight light = DIRECTIONAL_LIGHTS[i];\n\t\tfloat multiplier = clamp(dot(normal, -light.direction), 0.0, 1.0);\n\t\tlighting += multiplier * light.color * light.intensity;\n\t}\n\tfor (int i = 0; i < NUM_LIGHTS; i += 1) {\n\t\tPointLight light = POINT_LIGHTS[i];\n\t\tvec3 surface_to_light = normalize(v_surface_to_light[i]);\n\t\tfloat multiplier = clamp(dot(normal, surface_to_light), 0.0, 1.0);\t\tlighting += multiplier * light.color * light.intensity;\n\t\t#ifdef has_specularity\n\t\t\tvec3 surface_to_view = normalize(v_surface_to_view[i]);\n\t\t\tvec3 half_vector = normalize(surface_to_light + surface_to_view);\n\t\t\tfloat spec = clamp(dot(normal, half_vector), 0.0, 1.0);\n\t\t\t#ifdef has_specularitymap\n\t\t\tspec *= texture(specularitymap, v_uv).r;\n\t\t\t#endif\n\t\t\tspec_amount += specularity * spec * light.color * light.intensity;\n\t\t#endif\n\t}\n\t#if defined(has_colormap)\n\tfragColor = texture(colormap, v_uv);\n\t#elif defined(has_color)\n\tfragColor = vec4(color, 1.0);\n\t#endif\n\t#ifdef has_alpha\n\tfragColor.a *= alpha;\n\t#endif\n\tfragColor.rgb *= mix(AMBIENT_LIGHT, vec3(1.0, 1.0, 1.0), lighting);\n\tfragColor.rgb += spec_amount;\n\t#if defined(has_emissivemap)\n\tfragColor.rgb += texture(emissivemap, v_uv);\n\t#elif defined(has_emissive)\n\tfragColor.rgb += emissive;\n\t#endif\n\t#ifdef USE_FOG\n\tfragColor.rgb = mix(\n\t\tfragColor.rgb,\n\t\tFOG_COLOR,\n\t\t1.0 - exp(-FOG_DENSITY * FOG_DENSITY * v_fog_depth * v_fog_depth)\n\t);\n\t#endif\n}\n";

    /* node_modules/@sveltejs/gl/scene/Mesh/index.svelte generated by Svelte v3.19.1 */

    function instance$3($$self, $$props, $$invalidate) {
    	let $ctm;
    	let { location = [0, 0, 0] } = $$props;
    	let { rotation = [0, 0, 0] } = $$props; // TODO make it possible to set a quaternion as a prop?
    	let { scale = 1 } = $$props;
    	let { geometry } = $$props;
    	let { vert = vert_default } = $$props;
    	let { frag = frag_default } = $$props;
    	let { uniforms = {} } = $$props;
    	let { depthTest = undefined } = $$props;
    	let { doubleSided = undefined } = $$props;
    	let { transparent = false } = $$props;
    	const scene = get_scene();
    	const layer = get_layer();
    	const { ctm } = get_parent();
    	component_subscribe($$self, ctm, value => $$invalidate(18, $ctm = value));
    	const out = create();
    	const out2 = create();
    	const mesh = {};
    	let existing = true; // track if we've previously added this mesh

    	const add_mesh = () => {
    		layer.add_mesh(mesh, existing);
    		existing = false;
    	};

    	onDestroy(() => {
    		if (mesh.material) mesh.material.destroy();
    	});

    	$$self.$set = $$props => {
    		if ("location" in $$props) $$invalidate(1, location = $$props.location);
    		if ("rotation" in $$props) $$invalidate(2, rotation = $$props.rotation);
    		if ("scale" in $$props) $$invalidate(3, scale = $$props.scale);
    		if ("geometry" in $$props) $$invalidate(4, geometry = $$props.geometry);
    		if ("vert" in $$props) $$invalidate(5, vert = $$props.vert);
    		if ("frag" in $$props) $$invalidate(6, frag = $$props.frag);
    		if ("uniforms" in $$props) $$invalidate(7, uniforms = $$props.uniforms);
    		if ("depthTest" in $$props) $$invalidate(8, depthTest = $$props.depthTest);
    		if ("doubleSided" in $$props) $$invalidate(9, doubleSided = $$props.doubleSided);
    		if ("transparent" in $$props) $$invalidate(10, transparent = $$props.transparent);
    	};

    	let scale_array;
    	let quaternion;
    	let matrix;
    	let model;
    	let defines;
    	let material_instance;
    	let geometry_instance;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*scale*/ 8) {
    			 $$invalidate(14, scale_array = typeof scale === "number"
    			? [scale, scale, scale]
    			: scale);
    		}

    		if ($$self.$$.dirty & /*quaternion, rotation*/ 32772) {
    			 $$invalidate(15, quaternion = fromEuler(quaternion || create$4(), ...rotation));
    		}

    		if ($$self.$$.dirty & /*matrix, quaternion, location, scale_array*/ 114690) {
    			 $$invalidate(16, matrix = fromRotationTranslationScale(matrix || create(), quaternion, location, scale_array));
    		}

    		if ($$self.$$.dirty & /*model, $ctm, matrix*/ 458752) {
    			 $$invalidate(17, model = multiply(model || create(), $ctm, matrix));
    		}

    		if ($$self.$$.dirty & /*uniforms*/ 128) {
    			 $$invalidate(19, defines = Object.keys(uniforms).filter(k => uniforms[k] != null).map(k => `#define has_${k} true\n`).join(""));
    		}

    		if ($$self.$$.dirty & /*vert, frag, defines*/ 524384) {
    			 $$invalidate(20, material_instance = new Material(scene, vert, frag, defines));
    		}

    		if ($$self.$$.dirty & /*material_instance, uniforms*/ 1048704) {
    			 material_instance.set_uniforms(uniforms);
    		}

    		if ($$self.$$.dirty & /*geometry, material_instance*/ 1048592) {
    			 $$invalidate(21, geometry_instance = geometry.instantiate(scene, material_instance.program));
    		}

    		if ($$self.$$.dirty & /*model*/ 131072) {
    			 mesh.model = model;
    		}

    		if ($$self.$$.dirty & /*model*/ 131072) {
    			 mesh.model_inverse_transpose = (invert(out2, model), transpose(out2, out2));
    		}

    		if ($$self.$$.dirty & /*material_instance*/ 1048576) {
    			 mesh.material = material_instance;
    		}

    		if ($$self.$$.dirty & /*geometry_instance*/ 2097152) {
    			 mesh.geometry = geometry_instance;
    		}

    		if ($$self.$$.dirty & /*depthTest*/ 256) {
    			 mesh.depthTest = depthTest;
    		}

    		if ($$self.$$.dirty & /*doubleSided*/ 512) {
    			 mesh.doubleSided = doubleSided;
    		}

    		if ($$self.$$.dirty & /*transparent*/ 1024) {
    			 mesh.transparent = transparent;
    		}

    		if ($$self.$$.dirty & /*transparent*/ 1024) {
    			 (add_mesh());
    		}

    		if ($$self.$$.dirty & /*model, transparent*/ 132096) {
    			 (transparent && (layer.needs_transparency_sort = true));
    		}

    		if ($$self.$$.dirty & /*geometry_instance, model, uniforms*/ 2228352) {
    			 (scene.invalidate());
    		}
    	};

    	return [
    		ctm,
    		location,
    		rotation,
    		scale,
    		geometry,
    		vert,
    		frag,
    		uniforms,
    		depthTest,
    		doubleSided,
    		transparent
    	];
    }

    class Mesh extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$3, null, safe_not_equal, {
    			location: 1,
    			rotation: 2,
    			scale: 3,
    			geometry: 4,
    			vert: 5,
    			frag: 6,
    			uniforms: 7,
    			depthTest: 8,
    			doubleSided: 9,
    			transparent: 10
    		});
    	}
    }

    /* node_modules/@sveltejs/gl/scene/Target.svelte generated by Svelte v3.19.1 */

    function instance$4($$self, $$props, $$invalidate) {
    	let $ctm;
    	let { id } = $$props;
    	let { location = [0, 0, 0] } = $$props;
    	const { get_target } = get_scene();
    	const { ctm } = get_parent();
    	component_subscribe($$self, ctm, value => $$invalidate(8, $ctm = value));
    	let model = create();
    	const world_position = new Float32Array(model.buffer, 12 * 4, 3);
    	const loc = new Float32Array(3);

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("location" in $$props) $$invalidate(2, location = $$props.location);
    	};

    	let x;
    	let y;
    	let z;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*location*/ 4) {
    			// break `location` out into its components, so that we can
    			// skip downstream computations. TODO would be nice if there
    			// was a neater way to achieve this
    			 $$invalidate(5, x = location[0]);
    		}

    		if ($$self.$$.dirty & /*location*/ 4) {
    			 $$invalidate(6, y = location[1]);
    		}

    		if ($$self.$$.dirty & /*location*/ 4) {
    			 $$invalidate(7, z = location[2]);
    		}

    		if ($$self.$$.dirty & /*x, y, z*/ 224) {
    			 ($$invalidate(4, loc[0] = x, loc), $$invalidate(4, loc[1] = y, loc), $$invalidate(4, loc[2] = z, loc));
    		}

    		if ($$self.$$.dirty & /*model, $ctm, loc*/ 280) {
    			 $$invalidate(3, model = translate(model, $ctm, loc));
    		}

    		if ($$self.$$.dirty & /*model, id*/ 10) {
    			 (get_target(id).set(world_position));
    		}
    	};

    	return [ctm, id, location];
    }

    class Target extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, null, safe_not_equal, { id: 1, location: 2 });
    	}
    }

    /* node_modules/@sveltejs/gl/scene/lights/AmbientLight.svelte generated by Svelte v3.19.1 */

    function instance$5($$self, $$props, $$invalidate) {
    	let { color = [1, 1, 1] } = $$props;
    	let { intensity = 0.2 } = $$props;
    	const scene = get_scene();
    	const light = {};
    	scene.add_ambient_light(light);

    	$$self.$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("intensity" in $$props) $$invalidate(1, intensity = $$props.intensity);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*color*/ 1) {
    			 $$invalidate(2, light.color = process_color(color), light);
    		}

    		if ($$self.$$.dirty & /*intensity*/ 2) {
    			 $$invalidate(2, light.intensity = intensity, light);
    		}

    		if ($$self.$$.dirty & /*light*/ 4) {
    			 (scene.invalidate());
    		}
    	};

    	return [color, intensity];
    }

    class AmbientLight extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, null, safe_not_equal, { color: 0, intensity: 1 });
    	}
    }

    /* node_modules/@sveltejs/gl/scene/lights/DirectionalLight.svelte generated by Svelte v3.19.1 */

    function instance$6($$self, $$props, $$invalidate) {
    	let $ctm;
    	let { direction = new Float32Array([-1, -1, -1]) } = $$props;
    	let { color = new Float32Array([1, 1, 1]) } = $$props;
    	let { intensity = 1 } = $$props;
    	const scene = get_scene();
    	const { ctm } = get_parent();
    	component_subscribe($$self, ctm, value => $$invalidate(6, $ctm = value));
    	const light = {};
    	scene.add_directional_light(light);

    	$$self.$set = $$props => {
    		if ("direction" in $$props) $$invalidate(1, direction = $$props.direction);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("intensity" in $$props) $$invalidate(3, intensity = $$props.intensity);
    	};

    	let multiplied;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*multiplied, direction, $ctm*/ 98) {
    			 $$invalidate(5, multiplied = transformMat4(multiplied || create$1(), direction, $ctm));
    		}

    		if ($$self.$$.dirty & /*light, multiplied*/ 48) {
    			 $$invalidate(4, light.direction = normalize$1(light.direction || create$1(), multiplied), light);
    		}

    		if ($$self.$$.dirty & /*color*/ 4) {
    			 $$invalidate(4, light.color = process_color(color), light);
    		}

    		if ($$self.$$.dirty & /*intensity*/ 8) {
    			 $$invalidate(4, light.intensity = intensity, light);
    		}

    		if ($$self.$$.dirty & /*light*/ 16) {
    			 (scene.invalidate());
    		}
    	};

    	return [ctm, direction, color, intensity];
    }

    class DirectionalLight extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, null, safe_not_equal, { direction: 1, color: 2, intensity: 3 });
    	}
    }

    /* node_modules/@sveltejs/gl/scene/lights/PointLight.svelte generated by Svelte v3.19.1 */

    function instance$7($$self, $$props, $$invalidate) {
    	let $ctm;
    	let { location = new Float32Array([-1, -1, -1]) } = $$props;
    	let { color = new Float32Array([1, 1, 1]) } = $$props;
    	let { intensity = 1 } = $$props;
    	const scene = get_scene();
    	const { ctm } = get_parent();
    	component_subscribe($$self, ctm, value => $$invalidate(5, $ctm = value));

    	let light = {
    		// TODO change to a const once bug is fixed
    		location: create$1(),
    		color: null,
    		intensity: null
    	};

    	scene.add_point_light(light);

    	$$self.$set = $$props => {
    		if ("location" in $$props) $$invalidate(1, location = $$props.location);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("intensity" in $$props) $$invalidate(3, intensity = $$props.intensity);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*light, location, $ctm*/ 50) {
    			 $$invalidate(4, light.location = transformMat4(light.location, location, $ctm), light);
    		}

    		if ($$self.$$.dirty & /*color*/ 4) {
    			 $$invalidate(4, light.color = process_color(color), light);
    		}

    		if ($$self.$$.dirty & /*intensity*/ 8) {
    			 $$invalidate(4, light.intensity = intensity, light);
    		}

    		if ($$self.$$.dirty & /*light*/ 16) {
    			 (scene.invalidate());
    		}
    	};

    	return [ctm, location, color, intensity];
    }

    class PointLight extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, null, safe_not_equal, { location: 1, color: 2, intensity: 3 });
    	}
    }

    function clamp(num, min, max) {
        return num < min ? min : num > max ? max : num;
    }

    function debounce(fn) {
    	let scheduled = false;
    	let event;

    	function release() {
    		fn(event);
    		scheduled = false;
    	}

    	return function(e) {
    		if (!scheduled) {
    			requestAnimationFrame(release);
    			scheduled = true;
    		}

    		event = e;
    	};
    }

    /* node_modules/@sveltejs/gl/controls/OrbitControls.svelte generated by Svelte v3.19.1 */

    const get_default_slot_changes$1 = dirty => ({
    	location: dirty & /*location*/ 1,
    	target: dirty & /*target*/ 2
    });

    const get_default_slot_context$1 = ctx => ({
    	location: /*location*/ ctx[0],
    	target: /*target*/ ctx[1]
    });

    function create_fragment$3(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[17].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], get_default_slot_context$1);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope, location, target*/ 65539) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[16], get_default_slot_context$1), get_slot_changes(default_slot_template, /*$$scope*/ ctx[16], dirty, get_default_slot_changes$1));
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    const EPSILON$1 = 0.000001;

    function pythag(a, b) {
    	return Math.sqrt(a * a + b * b);
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const scene = get_scene();
    	let { location = new Float32Array([1, 3, 1]) } = $$props;
    	let { target = new Float32Array([0, 1, 0]) } = $$props;
    	let { minDistance = 0 } = $$props;
    	let { maxDistance = Infinity } = $$props;
    	let { minPolarAngle = 0 } = $$props; // radians
    	let { maxPolarAngle = Math.PI } = $$props; // radians

    	function rotate(x, y) {
    		// TODO handle the up vector. for now, just assume [0,1,0]
    		const vx = location[0] - target[0];

    		const vy = location[1] - target[1];
    		const vz = location[2] - target[2];
    		const radius = Math.sqrt(vx * vx + vy * vy + vz * vz);
    		let theta = Math.atan2(vx, vz);
    		theta -= x;
    		let phi = Math.acos(clamp(vy / radius, -1, 1));
    		phi = clamp(phi - y, EPSILON$1, Math.PI - EPSILON$1);
    		phi = clamp(phi, minPolarAngle, maxPolarAngle);
    		const sin_phi_radius = Math.sin(phi) * radius;
    		const nx = sin_phi_radius * Math.sin(theta);
    		const ny = Math.cos(phi) * radius;
    		const nz = sin_phi_radius * Math.cos(theta);
    		$$invalidate(0, location[0] = target[0] + nx, location);
    		$$invalidate(0, location[1] = target[1] + ny, location);
    		$$invalidate(0, location[2] = target[2] + nz, location);
    	}

    	function pan(dx, dy) {
    		// TODO handle the up vector. for now, just assume [0,1,0]
    		const vx = location[0] - target[0];

    		const vy = location[1] - target[1];
    		const vz = location[2] - target[2];

    		// delta y = along xz
    		{
    			const direction = normalize([vx, vz]);
    			const x = -direction[0] * dy;
    			const z = -direction[1] * dy;
    			$$invalidate(0, location[0] += x, location);
    			$$invalidate(0, location[2] += z, location);
    			$$invalidate(1, target[0] += x, target);
    			$$invalidate(1, target[2] += z, target);
    		}

    		// delta x = tangent to xz
    		{
    			const tangent = normalize([-vz, vx]);
    			const x = tangent[0] * dx;
    			const z = tangent[1] * dx;
    			$$invalidate(0, location[0] += x, location);
    			$$invalidate(0, location[2] += z, location);
    			$$invalidate(1, target[0] += x, target);
    			$$invalidate(1, target[2] += z, target);
    		}
    	}

    	function zoom(amount) {
    		let vx = location[0] - target[0];
    		let vy = location[1] - target[1];
    		let vz = location[2] - target[2];
    		const mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
    		amount = clamp(amount, mag / maxDistance, minDistance ? mag / minDistance : Infinity);
    		vx /= amount;
    		vy /= amount;
    		vz /= amount;
    		$$invalidate(0, location[0] = target[0] + vx, location);
    		$$invalidate(0, location[1] = target[1] + vy, location);
    		$$invalidate(0, location[2] = target[2] + vz, location);
    	}

    	function handle_mousedown(event) {
    		let last_x = event.clientX;
    		let last_y = event.clientY;

    		const handle_mousemove = debounce(event => {
    			const x = event.clientX;
    			const y = event.clientY;
    			const dx = x - last_x;
    			const dy = y - last_y;

    			if (event.shiftKey || event.which === 2) {
    				pan(dx * 0.01, dy * 0.01);
    			} else {
    				rotate(dx * 0.005, dy * 0.005);
    			}

    			last_x = x;
    			last_y = y;
    		});

    		function handle_mouseup(event) {
    			window.removeEventListener("mousemove", handle_mousemove);
    			window.removeEventListener("mouseup", handle_mouseup);
    		}

    		window.addEventListener("mousemove", handle_mousemove);
    		window.addEventListener("mouseup", handle_mouseup);
    	}

    	const mousewheel_zoom = debounce(event => {
    		zoom(Math.pow(1.004, event.wheelDeltaY));
    	});

    	function handle_mousewheel(event) {
    		event.preventDefault();
    		mousewheel_zoom(event);
    	}

    	function start_rotate(event) {
    		event.preventDefault();
    		const touch = event.touches[0];
    		const finger = touch.identifier;
    		let last_x = touch.clientX;
    		let last_y = touch.clientY;

    		const handle_touchmove = debounce(event => {
    			if (event.touches.length > 1) return;
    			const touch = event.touches[0];
    			if (touch.identifier !== finger) return;
    			const dx = touch.clientX - last_x;
    			const dy = touch.clientY - last_y;
    			rotate(dx * 0.003, dy * 0.003);
    			last_x = touch.clientX;
    			last_y = touch.clientY;
    			
    		});

    		function handle_touchend(event) {
    			let i = event.changedTouches.length;

    			while (i--) {
    				const touch = event.changedTouches[i];

    				if (touch.identifier === finger) {
    					window.removeEventListener("touchmove", handle_touchmove);
    					window.removeEventListener("touchend", handle_touchend);
    					return;
    				}
    			}
    		}

    		window.addEventListener("touchmove", handle_touchmove);
    		window.addEventListener("touchend", handle_touchend);
    	}

    	function start_pan_zoom(event) {
    		event.preventDefault();
    		const touch_a = event.touches[0];
    		const touch_b = event.touches[1];
    		const finger_a = touch_a.identifier;
    		const finger_b = touch_b.identifier;
    		let last_cx = (touch_a.clientX + touch_b.clientX) / 2;
    		let last_cy = (touch_a.clientY + touch_b.clientY) / 2;
    		let last_d = pythag(touch_b.clientX - touch_a.clientX, touch_b.clientY - touch_a.clientY);

    		const handle_touchmove = debounce(event => {
    			if (event.touches.length !== 2) {
    				alert(`${event.touches.length} touches`);
    				return;
    			}

    			const touch_a = event.touches[0];
    			const touch_b = event.touches[1];
    			if (touch_a.identifier !== finger_a && touch_a.identifier !== finger_b) return;
    			if (touch_b.identifier !== finger_a && touch_b.identifier !== finger_b) return;
    			const cx = (touch_a.clientX + touch_b.clientX) / 2;
    			const cy = (touch_a.clientY + touch_b.clientY) / 2;
    			const d = pythag(touch_b.clientX - touch_a.clientX, touch_b.clientY - touch_a.clientY);
    			const dx = cx - last_cx;
    			const dy = cy - last_cy;
    			pan(dx * 0.01, dy * 0.01);
    			zoom(d / last_d);
    			last_cx = cx;
    			last_cy = cy;
    			last_d = d;
    		});

    		function handle_touchend(event) {
    			let i = event.changedTouches.length;

    			while (i--) {
    				const touch = event.changedTouches[i];

    				if (touch.identifier === finger_a || touch.identifier === finger_b) {
    					window.removeEventListener("touchmove", handle_touchmove);
    					window.removeEventListener("touchend", handle_touchend);
    					return;
    				}
    			}
    		}

    		window.addEventListener("touchmove", handle_touchmove);
    		window.addEventListener("touchend", handle_touchend);
    	}

    	function handle_touchstart(event) {
    		if (event.touches.length === 1) {
    			start_rotate(event);
    		}

    		if (event.touches.length === 2) {
    			start_pan_zoom(event);
    		}
    	}

    	scene.canvas.addEventListener("mousedown", handle_mousedown);
    	scene.canvas.addEventListener("mousewheel", handle_mousewheel);
    	scene.canvas.addEventListener("touchstart", handle_touchstart);

    	onDestroy(() => {
    		scene.canvas.removeEventListener("mousedown", handle_mousedown);
    		scene.canvas.removeEventListener("mousewheel", handle_mousewheel);
    		scene.canvas.removeEventListener("touchstart", handle_touchstart);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("location" in $$props) $$invalidate(0, location = $$props.location);
    		if ("target" in $$props) $$invalidate(1, target = $$props.target);
    		if ("minDistance" in $$props) $$invalidate(2, minDistance = $$props.minDistance);
    		if ("maxDistance" in $$props) $$invalidate(3, maxDistance = $$props.maxDistance);
    		if ("minPolarAngle" in $$props) $$invalidate(4, minPolarAngle = $$props.minPolarAngle);
    		if ("maxPolarAngle" in $$props) $$invalidate(5, maxPolarAngle = $$props.maxPolarAngle);
    		if ("$$scope" in $$props) $$invalidate(16, $$scope = $$props.$$scope);
    	};

    	return [
    		location,
    		target,
    		minDistance,
    		maxDistance,
    		minPolarAngle,
    		maxPolarAngle,
    		scene,
    		rotate,
    		pan,
    		zoom,
    		handle_mousedown,
    		mousewheel_zoom,
    		handle_mousewheel,
    		start_rotate,
    		start_pan_zoom,
    		handle_touchstart,
    		$$scope,
    		$$slots
    	];
    }

    class OrbitControls extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$8, create_fragment$3, safe_not_equal, {
    			location: 0,
    			target: 1,
    			minDistance: 2,
    			maxDistance: 3,
    			minPolarAngle: 4,
    			maxPolarAngle: 5
    		});
    	}
    }

    /* node_modules/@sveltejs/gl/scene/cameras/PerspectiveCamera.svelte generated by Svelte v3.19.1 */

    function instance$9($$self, $$props, $$invalidate) {
    	let $ctm;

    	let $target,
    		$$unsubscribe_target = noop,
    		$$subscribe_target = () => ($$unsubscribe_target(), $$unsubscribe_target = subscribe(target, $$value => $$invalidate(12, $target = $$value)), target);

    	let $width;
    	let $height;
    	$$self.$$.on_destroy.push(() => $$unsubscribe_target());
    	let { location = [0, 0, 0] } = $$props;
    	let { lookAt = null } = $$props;
    	let { up = [0, 1, 0] } = $$props;
    	let { fov = 60 } = $$props;
    	let { near = 1 } = $$props;
    	let { far = 20000 } = $$props;
    	const { add_camera, update_camera, width, height, get_target } = get_scene();
    	component_subscribe($$self, width, value => $$invalidate(13, $width = value));
    	component_subscribe($$self, height, value => $$invalidate(14, $height = value));
    	const { ctm } = get_parent();
    	component_subscribe($$self, ctm, value => $$invalidate(11, $ctm = value));
    	const matrix = create();
    	const world_position = new Float32Array(matrix.buffer, 12 * 4, 3);

    	// should be a const, pending https://github.com/sveltejs/svelte/issues/2728
    	let camera = {
    		matrix,
    		world_position,
    		view: create(),
    		projection: create()
    	};

    	let target = writable(null);
    	$$subscribe_target();
    	add_camera(camera);

    	$$self.$set = $$props => {
    		if ("location" in $$props) $$invalidate(4, location = $$props.location);
    		if ("lookAt" in $$props) $$invalidate(5, lookAt = $$props.lookAt);
    		if ("up" in $$props) $$invalidate(6, up = $$props.up);
    		if ("fov" in $$props) $$invalidate(7, fov = $$props.fov);
    		if ("near" in $$props) $$invalidate(8, near = $$props.near);
    		if ("far" in $$props) $$invalidate(9, far = $$props.far);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*lookAt, target*/ 33) {
    			 if (typeof lookAt === "string") {
    				$$subscribe_target($$invalidate(0, target = get_target(lookAt)));
    			} else {
    				target.set(lookAt);
    			}
    		}

    		if ($$self.$$.dirty & /*camera, $ctm, location, $target, up*/ 7248) {
    			 $$invalidate(10, camera.matrix = (translate(camera.matrix, $ctm, location), $target && targetTo(camera.matrix, world_position, $target, up), camera.matrix), camera);
    		}

    		if ($$self.$$.dirty & /*camera*/ 1024) {
    			 $$invalidate(10, camera.view = invert(camera.view, camera.matrix), camera);
    		}

    		if ($$self.$$.dirty & /*camera, fov, $width, $height, near, far*/ 26496) {
    			 $$invalidate(10, camera.projection = perspective(camera.projection, fov / 180 * Math.PI, $width / $height, near, far), camera);
    		}

    		if ($$self.$$.dirty & /*camera*/ 1024) {
    			 update_camera(camera);
    		}
    	};

    	return [target, width, height, ctm, location, lookAt, up, fov, near, far];
    }

    class PerspectiveCamera extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$9, null, safe_not_equal, {
    			location: 4,
    			lookAt: 5,
    			up: 6,
    			fov: 7,
    			near: 8,
    			far: 9
    		});
    	}
    }

    class GeometryInstance {
    	constructor(scene, program, attributes, index, primitive, count) {
    		this.scene = scene;
    		const gl = scene.gl;

    		this.attributes = attributes;
    		this.index = index;
    		this.primitive = primitive;
    		this.count = count;

    		this.locations = {};
    		this.buffers = {};

    		for (const key in attributes) {
    			const attribute = attributes[key];

    			this.locations[key] = gl.getAttribLocation(program, key);
    			if (this.primitive === 'POINTS') console.log(key, ":", attribute);

    			const buffer = gl.createBuffer();

    			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    			gl.bufferData(gl.ARRAY_BUFFER, attribute.data, attribute.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    			this.buffers[key] = buffer;
    		}

    		if (index) {
    			const buffer = gl.createBuffer();
    			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    			this.buffers.__index = buffer;
    		}
    		
    		// Un-bind buffers
    		gl.bindBuffer(gl.ARRAY_BUFFER, null);
    		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    	}

    	set_attributes(gl) {
    		for (const key in this.attributes) {
    			const attribute = this.attributes[key];

    			const loc = this.locations[key];
    			if (loc < 0) continue; // attribute is unused by current program

    			const {
    				size = 3,
    				type = gl.FLOAT,
    				normalized = false,
    				stride = 0,
    				offset = 0
    			} = attribute;

    			// Bind the position buffer.
    			const buffer = this.buffers[key];
    			
    			// if (this.primitive = 'POINTS') console.log("enableVertexAttribArray on location ", key);

    			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    			// Turn on the attribute
    			gl.enableVertexAttribArray(loc);

    			gl.vertexAttribPointer(
    				loc,
    				size,
    				type,
    				normalized,
    				stride,
    				offset
    			);
    		}
    	}

    	update(k, data, count) {
    		const scene = this.scene;
    		const { gl } = scene;

    		const attribute = this.attributes[k];
    		const buffer = this.buffers[k];

    		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    		gl.bufferData(gl.ARRAY_BUFFER, attribute.data = data, attribute.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);

    		this.count = count;

    		if (count === Infinity) {
    			throw new Error(`GL.Geometry must be instantiated with one or more { data, size } attributes`);
    		}

    		scene.invalidate();
    	}
    }

    class Geometry {
    	constructor(attributes = {}, opts = {}) {
    		this.attributes = attributes;

    		const { index, primitive = 'TRIANGLES' } = opts;
    		this.index = index;
    		this.primitive = primitive.toUpperCase();
    		this.count = get_count(attributes);

    		this.instances = new Map();
    	}

    	instantiate(scene, program) {
    		if (!this.instances.has(program)) {
    			this.instances.set(program, new GeometryInstance(
    				scene,
    				program,
    				this.attributes,
    				this.index,
    				this.primitive,
    				this.count
    			));
    		}

    		return this.instances.get(program);
    	}

    	update(k, data) {
    		this.attributes[k].data = data;
    		this.count = get_count(this.attributes);

    		this.instances.forEach(instance => {
    			instance.update(k, data, this.count);
    		});
    	}
    }

    function get_count(attributes) {
    	let min = Infinity;

    	for (const k in attributes) {
    		const count = attributes[k].data.length / attributes[k].size;
    		if (count < min) min = count;
    	}

    	return min;
    }

    var box = memoize((obj = {}) => {
        const def = { // default box dimensions
            x:-0.5, y:-0.5, z:-0.5, w:1.0, h:1.0, d:1.0
        };
        for (const p in def) {
            if (!(p in obj)) {
                obj[p] = def[p];
            }
        }
        // console.log(obj.x, obj.y, obj.z, obj.w, obj.h, obj.d);

        const verts = [
            [ (obj.x + obj.w), 	(obj.y + obj.h), 	  (obj.z + obj.d) ], 	// 0
            [ obj.x, 				    (obj.y + obj.h), 	  (obj.z + obj.d) ], 	// 1
            [ (obj.x + obj.w), 	obj.y, 			        (obj.z + obj.d) ], 	// 2
            [ obj.x, 			      obj.y, 				      (obj.z + obj.d) ], 	// 3
            [ obj.x, 			      (obj.y + obj.h), 	  obj.z ], 			// 4
            [ (obj.x + obj.w), 	(obj.y + obj.h), 	  obj.z ], 			// 5
            [ obj.x, 			      obj.y, 				      obj.z ], 			// 6
            [ (obj.x + obj.w), 	obj.y, 				      obj.z ] 			// 7
        ];

        // console.log(verts);

        const vertices = [

            // front: 0 1 2 3
            verts[0],
            verts[1],
            verts[2],
            verts[3],

            // left: 1 4 3 6
            verts[1],
            verts[4],
            verts[3],
            verts[6],

            // back: 4 5 6 7
            verts[4],
            verts[5],
            verts[6],
            verts[7],

            // right: 5 0 7 2
            verts[5],
            verts[0],
            verts[7],
            verts[2],

            // top: 4 1 5 0
            verts[4],
            verts[1],
            verts[5],
            verts[0],

            // bottom: 3 6 2 7
            verts[3],
            verts[6],
            verts[2],
            verts[7]

        ].flat(Infinity);

        // console.log("box vertices: ", vertices);

        return new Geometry({
            position: {
                data: new Float32Array(vertices),
                size: 3
            },

            normal: {
                data: new Float32Array([
                    // front
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,
                    0, 0, 1,

                    // left
                    -1, 0, 0,
                    -1, 0, 0,
                    -1, 0, 0,
                    -1, 0, 0,

                    // back
                    0, 0, -1,
                    0, 0, -1,
                    0, 0, -1,
                    0, 0, -1,

                    // right
                    1, 0, 0,
                    1, 0, 0,
                    1, 0, 0,
                    1, 0, 0,

                    // top
                    0, 1, 0,
                    0, 1, 0,
                    0, 1, 0,
                    0, 1, 0,

                    // bottom
                    0, -1, 0,
                    0, -1, 0,
                    0, -1, 0,
                    0, -1, 0
                ]),
                size: 3
            },

            uv: {
                data: new Float32Array([
                    // front
                    2/4, 1/4,
                    1/4, 1/4,
                    2/4, 2/4,
                    1/4, 2/4,

                    // left
                    1/4, 1/4,
                    0/4, 1/4,
                    1/4, 2/4,
                    0/4, 2/4,

                    // back
                    4/4, 1/4,
                    3/4, 1/4,
                    4/4, 2/4,
                    3/4, 2/4,

                    // right
                    3/4, 1/4,
                    2/4, 1/4,
                    3/4, 2/4,
                    2/4, 2/4,

                    // top
                    1/4, 0/4,
                    1/4, 1/4,
                    2/4, 0/4,
                    2/4, 1/4,

                    // bottom
                    1/4, 2/4,
                    1/4, 3/4,
                    2/4, 2/4,
                    2/4, 3/4
                ]),
                size: 2
            }
        }, {
            index: new Uint32Array([
                // front
                0, 1, 2,
                3, 2, 1,

                // left
                4, 5, 6,
                6, 5, 7,

                // back
                8, 9, 10,
                11, 10, 9,

                // right
                12, 13, 14,
                15, 14, 13,

                // top
                16, 17, 18,
                19, 18, 17,

                // bottom
                20, 21, 22,
                23, 22, 21
            ])
        });
    });

    var plane = memoize(() => {
    	return new Geometry({
    		position: {
    			data: new Float32Array([
    				 1,  1, 0,
    				-1,  1, 0,
    				 1, -1, 0,
    				-1, -1, 0,
    			]),
    			size: 3
    		},

    		normal: {
    			data: new Float32Array([
    				0, 0, 1,
    				0, 0, 1,
    				0, 0, 1,
    				0, 0, 1
    			]),
    			size: 3
    		},

    		uv: {
    			data: new Float32Array([
    				1, 0,
    				0, 0,
    				1, 1,
    				0, 1
    			]),
    			size: 2
    		}
    	}, {
    		index: new Uint32Array([
    			0, 1, 2,
    			3, 2, 1
    		])
    	});
    });

    const p = 0.85065080835204;
    const q = 0.5257311121191336;

    const position = new Float32Array([
    	-q, +p,  0,
    	+q, +p,  0,
    	-q, -p,  0,
    	+q, -p,  0,
    	 0, -q, +p,
    	 0, +q, +p,
    	 0, -q, -p,
    	 0, +q, -p,
    	+p,  0, -q,
    	+p,  0, +q,
    	-p,  0, -q,
    	-p,  0, +q
    ]);

    const index = new Uint16Array([
    	0, 11, 5,
    	0, 5, 1,
    	0, 1, 7,
    	0, 7, 10,
    	0, 10, 11,
    	1, 5, 9,
    	5, 11, 4,
    	11, 10, 2,
    	10, 7, 6,
    	7, 1, 8,
    	3, 9, 4,
    	3, 4, 2,
    	3, 2, 6,
    	3, 6, 8,
    	3, 8, 9,
    	4, 9, 5,
    	2, 4, 11,
    	6, 2, 10,
    	8, 6, 7,
    	9, 8, 1
    ]);

    const smooth_geometry = [
    	new Geometry({
    		position: { data: position, size: 3 },
    		normal: { data: position, size: 3 }
    	}, { index })
    ];

    const PI = Math.PI;
    const PI2 = PI * 2;

    function create_smooth_geometry(turns, bands) {
    	const num_vertices = (turns + 1) * (bands + 1);
    	const num_faces_per_turn = 2 * (bands - 1);
    	const num_faces = num_faces_per_turn * turns;

    	const position = new Float32Array(num_vertices * 3); // doubles as normal
    	const uv = new Float32Array(num_vertices * 2);
    	const index = new Uint32Array(num_faces * 3);

    	let position_index = 0;
    	let uv_index = 0;

    	for (let i = 0; i <= turns; i += 1) {
    		const u = i / turns;

    		for (let j = 0; j <= bands; j += 1) {
    			const v = j / bands;

    			const x = -Math.cos(u * PI2) * Math.sin(v * PI);
    			const y = Math.cos(v * PI);
    			const z = Math.sin(u * PI2) * Math.sin(v * PI);

    			position[position_index++] = x;
    			position[position_index++] = y;
    			position[position_index++] = z;

    			uv[uv_index++] = u;
    			uv[uv_index++] = v;
    		}
    	}

    	let face_index = 0;

    	for (let i = 0; i < turns; i += 1) {
    		const offset = i * (bands + 1);

    		// north pole face
    		index[face_index++] = offset + 0;
    		index[face_index++] = offset + 1;
    		index[face_index++] = offset + bands + 2;

    		for (let j = 1; j < bands - 1; j += 1) {
    			index[face_index++] = offset + j;
    			index[face_index++] = offset + j + 1;
    			index[face_index++] = offset + j + bands + 1;

    			index[face_index++] = offset + j + bands + 1;
    			index[face_index++] = offset + j + 1;
    			index[face_index++] = offset + j + bands + 2;
    		}

    		index[face_index++] = offset + bands - 1;
    		index[face_index++] = offset + bands;
    		index[face_index++] = offset + bands * 2;
    	}

    	return new Geometry({
    		position: {
    			data: position,
    			size: 3
    		},
    		normal: {
    			data: position,
    			size: 3
    		},
    		uv: {
    			data: uv,
    			size: 2
    		}
    	}, {
    		index
    	});
    }

    function create_flat_geometry(turns, bands) {
    	throw new Error('TODO implement flat geometry');
    }

    var sphere = memoize(({ turns = 8, bands = 6, shading = 'smooth' } = {}) => {
    	return shading === 'smooth'
    		? create_smooth_geometry(turns, bands)
    		: create_flat_geometry();
    });

    const worker_url = (typeof Blob !== 'undefined' && URL.createObjectURL(new Blob(
    	[`self.onmessage = e => { self.onmessage = null; eval(e.data); };`],
    	{ type: 'application/javascript' }
    ))) || typeof window !== 'undefined' && window.SVELTE_GL_WORKER_URL;

    /* src/apps/GLApp.svelte generated by Svelte v3.19.1 */

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (87:1) <GL.OrbitControls maxPolarAngle={Math.PI / 2} let:location>
    function create_default_slot_2(ctx) {
    	let current;

    	const gl_perspectivecamera = new PerspectiveCamera({
    			props: {
    				location: /*location*/ ctx[18],
    				lookAt: "center",
    				near: 0.01,
    				far: 1000
    			}
    		});

    	return {
    		c() {
    			create_component(gl_perspectivecamera.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_perspectivecamera, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const gl_perspectivecamera_changes = {};
    			if (dirty & /*location*/ 262144) gl_perspectivecamera_changes.location = /*location*/ ctx[18];
    			gl_perspectivecamera.$set(gl_perspectivecamera_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_perspectivecamera.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_perspectivecamera.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_perspectivecamera, detaching);
    		}
    	};
    }

    // (95:2) {#each Array(heightmap[k].length) as _, i}
    function create_each_block_1(ctx) {
    	let current;

    	const gl_mesh = new Mesh({
    			props: {
    				geometry: box({
    					x: 0,
    					y: 0,
    					z: 0,
    					w: gridSizeX / /*heightmap*/ ctx[1][/*i*/ ctx[17]].length,
    					h: 1 * /*heightmap*/ ctx[1][/*k*/ ctx[15]][/*i*/ ctx[17]],
    					d: gridSizeZ / /*heightmap*/ ctx[1].length
    				}),
    				location: [
    					-(gridSizeX / 2) + /*i*/ ctx[17] * (gridSizeX / /*heightmap*/ ctx[1][0].length),
    					0,
    					-(gridSizeZ / 2) + /*k*/ ctx[15] * (gridSizeZ / /*heightmap*/ ctx[1].length)
    				],
    				rotation: [0, 0, 0],
    				scale: [/*w*/ ctx[2], /*h*/ ctx[3], /*d*/ ctx[4]],
    				uniforms: {
    					color: /*from_hex*/ ctx[6](/*color*/ ctx[0])
    				}
    			}
    		});

    	return {
    		c() {
    			create_component(gl_mesh.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_mesh, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const gl_mesh_changes = {};

    			if (dirty & /*heightmap*/ 2) gl_mesh_changes.geometry = box({
    				x: 0,
    				y: 0,
    				z: 0,
    				w: gridSizeX / /*heightmap*/ ctx[1][/*i*/ ctx[17]].length,
    				h: 1 * /*heightmap*/ ctx[1][/*k*/ ctx[15]][/*i*/ ctx[17]],
    				d: gridSizeZ / /*heightmap*/ ctx[1].length
    			});

    			if (dirty & /*heightmap*/ 2) gl_mesh_changes.location = [
    				-(gridSizeX / 2) + /*i*/ ctx[17] * (gridSizeX / /*heightmap*/ ctx[1][0].length),
    				0,
    				-(gridSizeZ / 2) + /*k*/ ctx[15] * (gridSizeZ / /*heightmap*/ ctx[1].length)
    			];

    			if (dirty & /*w, h, d*/ 28) gl_mesh_changes.scale = [/*w*/ ctx[2], /*h*/ ctx[3], /*d*/ ctx[4]];

    			if (dirty & /*color*/ 1) gl_mesh_changes.uniforms = {
    				color: /*from_hex*/ ctx[6](/*color*/ ctx[0])
    			};

    			gl_mesh.$set(gl_mesh_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_mesh.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_mesh.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_mesh, detaching);
    		}
    	};
    }

    // (94:1) {#each Array(heightmap.length) as _, k}
    function create_each_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = Array(/*heightmap*/ ctx[1][/*k*/ ctx[15]].length);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*GL, gridSizeX, heightmap, gridSizeZ, w, h, d, from_hex, color*/ 95) {
    				each_value_1 = Array(/*heightmap*/ ctx[1][/*k*/ ctx[15]].length);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (169:1) <GL.Group location={[light.x,light.y,light.z]}>
    function create_default_slot_1(ctx) {
    	let t;
    	let current;

    	const gl_mesh = new Mesh({
    			props: {
    				geometry: sphere({ turns: 36, bands: 36 }),
    				location: [0, 0.2, 0],
    				scale: 0.1,
    				uniforms: { color: 16777215, emissive: 16711680 }
    			}
    		});

    	const gl_pointlight = new PointLight({
    			props: {
    				location: [0, 0, 0],
    				color: 16711680,
    				intensity: 0.6
    			}
    		});

    	return {
    		c() {
    			create_component(gl_mesh.$$.fragment);
    			t = space();
    			create_component(gl_pointlight.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_mesh, target, anchor);
    			insert(target, t, anchor);
    			mount_component(gl_pointlight, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(gl_mesh.$$.fragment, local);
    			transition_in(gl_pointlight.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_mesh.$$.fragment, local);
    			transition_out(gl_pointlight.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_mesh, detaching);
    			if (detaching) detach(t);
    			destroy_component(gl_pointlight, detaching);
    		}
    	};
    }

    // (84:0) <GL.Scene>
    function create_default_slot(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let current;

    	const gl_target = new Target({
    			props: {
    				id: "center",
    				location: [0, /*h*/ ctx[3] / 2, 0]
    			}
    		});

    	const gl_orbitcontrols = new OrbitControls({
    			props: {
    				maxPolarAngle: Math.PI / 2,
    				$$slots: {
    					default: [
    						create_default_slot_2,
    						({ location }) => ({ 18: location }),
    						({ location }) => location ? 262144 : 0
    					]
    				},
    				$$scope: { ctx }
    			}
    		});

    	const gl_ambientlight = new AmbientLight({ props: { intensity: 0.3 } });

    	const gl_directionallight = new DirectionalLight({
    			props: { direction: [-1, -1, -1], intensity: 0.5 }
    		});

    	let each_value = Array(/*heightmap*/ ctx[1].length);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const gl_mesh0 = new Mesh({
    			props: {
    				geometry: sphere({ turns: 36, bands: 36 }),
    				location: [-0.5, 2.4, 1.2],
    				scale: 0.4,
    				uniforms: { color: 1193046, alpha: 0.9 },
    				transparent: true
    			}
    		});

    	const gl_mesh1 = new Mesh({
    			props: {
    				geometry: sphere({ turns: 36, bands: 36 }),
    				location: [-1.4, 2.6, 0.2],
    				scale: 0.6,
    				uniforms: { color: 3368516, alpha: 1 },
    				transparent: true
    			}
    		});

    	const gl_mesh2 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [0, -0.01, 0],
    				rotation: [-90, 0, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_mesh3 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [0, 5, 0],
    				rotation: [90, 0, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_mesh4 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [0, -0.01, -10],
    				rotation: [0, 0, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_mesh5 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [10, -0.01, 0],
    				rotation: [0, -90, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_mesh6 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [-10, -0.01, 0],
    				rotation: [0, 90, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_group = new Group({
    			props: {
    				location: [/*light*/ ctx[5].x, /*light*/ ctx[5].y, /*light*/ ctx[5].z],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(gl_target.$$.fragment);
    			t0 = space();
    			create_component(gl_orbitcontrols.$$.fragment);
    			t1 = space();
    			create_component(gl_ambientlight.$$.fragment);
    			t2 = space();
    			create_component(gl_directionallight.$$.fragment);
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			create_component(gl_mesh0.$$.fragment);
    			t5 = space();
    			create_component(gl_mesh1.$$.fragment);
    			t6 = space();
    			create_component(gl_mesh2.$$.fragment);
    			t7 = space();
    			create_component(gl_mesh3.$$.fragment);
    			t8 = space();
    			create_component(gl_mesh4.$$.fragment);
    			t9 = space();
    			create_component(gl_mesh5.$$.fragment);
    			t10 = space();
    			create_component(gl_mesh6.$$.fragment);
    			t11 = space();
    			create_component(gl_group.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_target, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(gl_orbitcontrols, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(gl_ambientlight, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(gl_directionallight, target, anchor);
    			insert(target, t3, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t4, anchor);
    			mount_component(gl_mesh0, target, anchor);
    			insert(target, t5, anchor);
    			mount_component(gl_mesh1, target, anchor);
    			insert(target, t6, anchor);
    			mount_component(gl_mesh2, target, anchor);
    			insert(target, t7, anchor);
    			mount_component(gl_mesh3, target, anchor);
    			insert(target, t8, anchor);
    			mount_component(gl_mesh4, target, anchor);
    			insert(target, t9, anchor);
    			mount_component(gl_mesh5, target, anchor);
    			insert(target, t10, anchor);
    			mount_component(gl_mesh6, target, anchor);
    			insert(target, t11, anchor);
    			mount_component(gl_group, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const gl_target_changes = {};
    			if (dirty & /*h*/ 8) gl_target_changes.location = [0, /*h*/ ctx[3] / 2, 0];
    			gl_target.$set(gl_target_changes);
    			const gl_orbitcontrols_changes = {};

    			if (dirty & /*$$scope, location*/ 786432) {
    				gl_orbitcontrols_changes.$$scope = { dirty, ctx };
    			}

    			gl_orbitcontrols.$set(gl_orbitcontrols_changes);

    			if (dirty & /*Array, heightmap, GL, gridSizeX, gridSizeZ, w, h, d, from_hex, color*/ 95) {
    				each_value = Array(/*heightmap*/ ctx[1].length);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t4.parentNode, t4);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const gl_group_changes = {};
    			if (dirty & /*light*/ 32) gl_group_changes.location = [/*light*/ ctx[5].x, /*light*/ ctx[5].y, /*light*/ ctx[5].z];

    			if (dirty & /*$$scope*/ 524288) {
    				gl_group_changes.$$scope = { dirty, ctx };
    			}

    			gl_group.$set(gl_group_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_target.$$.fragment, local);
    			transition_in(gl_orbitcontrols.$$.fragment, local);
    			transition_in(gl_ambientlight.$$.fragment, local);
    			transition_in(gl_directionallight.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(gl_mesh0.$$.fragment, local);
    			transition_in(gl_mesh1.$$.fragment, local);
    			transition_in(gl_mesh2.$$.fragment, local);
    			transition_in(gl_mesh3.$$.fragment, local);
    			transition_in(gl_mesh4.$$.fragment, local);
    			transition_in(gl_mesh5.$$.fragment, local);
    			transition_in(gl_mesh6.$$.fragment, local);
    			transition_in(gl_group.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_target.$$.fragment, local);
    			transition_out(gl_orbitcontrols.$$.fragment, local);
    			transition_out(gl_ambientlight.$$.fragment, local);
    			transition_out(gl_directionallight.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(gl_mesh0.$$.fragment, local);
    			transition_out(gl_mesh1.$$.fragment, local);
    			transition_out(gl_mesh2.$$.fragment, local);
    			transition_out(gl_mesh3.$$.fragment, local);
    			transition_out(gl_mesh4.$$.fragment, local);
    			transition_out(gl_mesh5.$$.fragment, local);
    			transition_out(gl_mesh6.$$.fragment, local);
    			transition_out(gl_group.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_target, detaching);
    			if (detaching) detach(t0);
    			destroy_component(gl_orbitcontrols, detaching);
    			if (detaching) detach(t1);
    			destroy_component(gl_ambientlight, detaching);
    			if (detaching) detach(t2);
    			destroy_component(gl_directionallight, detaching);
    			if (detaching) detach(t3);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t4);
    			destroy_component(gl_mesh0, detaching);
    			if (detaching) detach(t5);
    			destroy_component(gl_mesh1, detaching);
    			if (detaching) detach(t6);
    			destroy_component(gl_mesh2, detaching);
    			if (detaching) detach(t7);
    			destroy_component(gl_mesh3, detaching);
    			if (detaching) detach(t8);
    			destroy_component(gl_mesh4, detaching);
    			if (detaching) detach(t9);
    			destroy_component(gl_mesh5, detaching);
    			if (detaching) detach(t10);
    			destroy_component(gl_mesh6, detaching);
    			if (detaching) detach(t11);
    			destroy_component(gl_group, detaching);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let t0;
    	let div;
    	let label0;
    	let input0;
    	let t1;
    	let label1;
    	let input1;
    	let input1_min_value;
    	let input1_max_value;
    	let input1_step_value;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let label2;
    	let input2;
    	let input2_min_value;
    	let input2_max_value;
    	let input2_step_value;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let label3;
    	let input3;
    	let input3_min_value;
    	let input3_max_value;
    	let input3_step_value;
    	let t10;
    	let t11;
    	let t12;
    	let current;
    	let dispose;

    	const gl_scene = new Scene({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(gl_scene.$$.fragment);
    			t0 = space();
    			div = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t1 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t2 = text(" width (");
    			t3 = text(/*w*/ ctx[2]);
    			t4 = text(")");
    			t5 = space();
    			label2 = element("label");
    			input2 = element("input");
    			t6 = text(" height (");
    			t7 = text(/*h*/ ctx[3]);
    			t8 = text(")");
    			t9 = space();
    			label3 = element("label");
    			input3 = element("input");
    			t10 = text(" depth (");
    			t11 = text(/*d*/ ctx[4]);
    			t12 = text(")");
    			attr(input0, "type", "color");
    			set_style(input0, "height", "40px");
    			attr(input1, "type", "range");
    			attr(input1, "min", input1_min_value = 0.1);
    			attr(input1, "max", input1_max_value = 5);
    			attr(input1, "step", input1_step_value = 0.1);
    			attr(input2, "type", "range");
    			attr(input2, "min", input2_min_value = 0.1);
    			attr(input2, "max", input2_max_value = 5);
    			attr(input2, "step", input2_step_value = 0.1);
    			attr(input3, "type", "range");
    			attr(input3, "min", input3_min_value = 0.1);
    			attr(input3, "max", input3_max_value = 5);
    			attr(input3, "step", input3_step_value = 0.1);
    			attr(div, "class", "controls svelte-156do91");
    		},
    		m(target, anchor) {
    			mount_component(gl_scene, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			append(div, label0);
    			append(label0, input0);
    			set_input_value(input0, /*color*/ ctx[0]);
    			append(div, t1);
    			append(div, label1);
    			append(label1, input1);
    			set_input_value(input1, /*w*/ ctx[2]);
    			append(label1, t2);
    			append(label1, t3);
    			append(label1, t4);
    			append(div, t5);
    			append(div, label2);
    			append(label2, input2);
    			set_input_value(input2, /*h*/ ctx[3]);
    			append(label2, t6);
    			append(label2, t7);
    			append(label2, t8);
    			append(div, t9);
    			append(div, label3);
    			append(label3, input3);
    			set_input_value(input3, /*d*/ ctx[4]);
    			append(label3, t10);
    			append(label3, t11);
    			append(label3, t12);
    			current = true;

    			dispose = [
    				listen(input0, "input", /*input0_input_handler*/ ctx[9]),
    				listen(input1, "change", /*input1_change_input_handler*/ ctx[10]),
    				listen(input1, "input", /*input1_change_input_handler*/ ctx[10]),
    				listen(input2, "change", /*input2_change_input_handler*/ ctx[11]),
    				listen(input2, "input", /*input2_change_input_handler*/ ctx[11]),
    				listen(input3, "change", /*input3_change_input_handler*/ ctx[12]),
    				listen(input3, "input", /*input3_change_input_handler*/ ctx[12])
    			];
    		},
    		p(ctx, [dirty]) {
    			const gl_scene_changes = {};

    			if (dirty & /*$$scope, light, heightmap, w, h, d, color*/ 524351) {
    				gl_scene_changes.$$scope = { dirty, ctx };
    			}

    			gl_scene.$set(gl_scene_changes);

    			if (dirty & /*color*/ 1) {
    				set_input_value(input0, /*color*/ ctx[0]);
    			}

    			if (dirty & /*w*/ 4) {
    				set_input_value(input1, /*w*/ ctx[2]);
    			}

    			if (!current || dirty & /*w*/ 4) set_data(t3, /*w*/ ctx[2]);

    			if (dirty & /*h*/ 8) {
    				set_input_value(input2, /*h*/ ctx[3]);
    			}

    			if (!current || dirty & /*h*/ 8) set_data(t7, /*h*/ ctx[3]);

    			if (dirty & /*d*/ 16) {
    				set_input_value(input3, /*d*/ ctx[4]);
    			}

    			if (!current || dirty & /*d*/ 16) set_data(t11, /*d*/ ctx[4]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_scene.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_scene.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_scene, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    			run_all(dispose);
    		}
    	};
    }

    const gridSizeX = 10;
    const gridSizeZ = 10;

    function instance$a($$self, $$props, $$invalidate) {
    	let { title } = $$props;
    	let { color = "#ff3e00" } = $$props;
    	const data = JSON.parse(document.getElementById("data_in_html").children[0].innerHTML);
    	const heightmap = [];

    	for (let z = 0; z < data.length; z++) {
    		const xx = [];

    		for (const x of Object.getOwnPropertyNames(data[z])) {
    			xx.push(data[z][x]);
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
    			$$invalidate(5, light.x = 3 * Math.sin(Date.now() * 0.001), light);
    			$$invalidate(5, light.y = 2.5 + 2 * Math.sin(Date.now() * 0.0004), light);
    			$$invalidate(5, light.z = 3 * Math.cos(Date.now() * 0.002), light);
    		};

    		loop();
    		return () => cancelAnimationFrame(frame);
    	});

    	function input0_input_handler() {
    		color = this.value;
    		$$invalidate(0, color);
    	}

    	function input1_change_input_handler() {
    		w = to_number(this.value);
    		$$invalidate(2, w);
    	}

    	function input2_change_input_handler() {
    		h = to_number(this.value);
    		$$invalidate(3, h);
    	}

    	function input3_change_input_handler() {
    		d = to_number(this.value);
    		$$invalidate(4, d);
    	}

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(7, title = $$props.title);
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    	};

    	return [
    		color,
    		heightmap,
    		w,
    		h,
    		d,
    		light,
    		from_hex,
    		title,
    		data,
    		input0_input_handler,
    		input1_change_input_handler,
    		input2_change_input_handler,
    		input3_change_input_handler
    	];
    }

    class GLApp extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$a, create_fragment$4, safe_not_equal, { title: 7, color: 0 });
    	}
    }

    /* src/apps/components/Controls.svelte generated by Svelte v3.19.1 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[18] = list;
    	child_ctx[19] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[20] = list;
    	child_ctx[19] = i;
    	return child_ctx;
    }

    // (157:4) {#if (options['labels'].length > 0 && options['values'].length > 0)}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*options*/ ctx[1]["values"];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*options*/ 2) {
    				each_value_1 = /*options*/ ctx[1]["values"];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (158:8) {#each options['values'] as option, o}
    function create_each_block_1$1(ctx) {
    	let label;
    	let input;
    	let t0;
    	let t1_value = /*options*/ ctx[1]["labels"][/*o*/ ctx[19]] + "";
    	let t1;
    	let t2;
    	let br;
    	let dispose;

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[14].call(input, /*option*/ ctx[17]);
    	}

    	return {
    		c() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			br = element("br");
    			attr(input, "type", "checkbox");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);
    			input.checked = /*option*/ ctx[17].value;
    			append(label, t0);
    			append(label, t1);
    			append(label, t2);
    			insert(target, br, anchor);
    			dispose = listen(input, "change", input_change_handler);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*options*/ 2) {
    				input.checked = /*option*/ ctx[17].value;
    			}

    			if (dirty & /*options*/ 2 && t1_value !== (t1_value = /*options*/ ctx[1]["labels"][/*o*/ ctx[19]] + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    			if (detaching) detach(br);
    			dispose();
    		}
    	};
    }

    // (165:4) {#if (!!color)}
    function create_if_block_1(ctx) {
    	let label;
    	let input;
    	let dispose;

    	return {
    		c() {
    			label = element("label");
    			input = element("input");
    			attr(input, "type", "color");
    			set_style(input, "height", "40px");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);
    			set_input_value(input, /*color*/ ctx[0]);
    			dispose = listen(input, "input", /*input_input_handler*/ ctx[15]);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*color*/ 1) {
    				set_input_value(input, /*color*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    			dispose();
    		}
    	};
    }

    // (171:4) {#if (rangeOptions['labels'].length > 0 && rangeValues.length > 0)}
    function create_if_block$1(ctx) {
    	let each_1_anchor;
    	let each_value = /*rangeValues*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*rangeValues, rangeOptions*/ 20) {
    				each_value = /*rangeValues*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (172:8) {#each rangeValues as option, o}
    function create_each_block$1(ctx) {
    	let label;
    	let input;
    	let input_min_value;
    	let input_max_value;
    	let input_step_value;
    	let br0;
    	let t0;
    	let t1_value = /*rangeOptions*/ ctx[4]["labels"][/*o*/ ctx[19]] + "";
    	let t1;
    	let t2;
    	let t3_value = /*option*/ ctx[17] + "";
    	let t3;
    	let t4;
    	let br1;
    	let dispose;

    	function input_change_input_handler() {
    		/*input_change_input_handler*/ ctx[16].call(input, /*option*/ ctx[17], /*each_value*/ ctx[18], /*o*/ ctx[19]);
    	}

    	return {
    		c() {
    			label = element("label");
    			input = element("input");
    			br0 = element("br");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = text("(");
    			t3 = text(t3_value);
    			t4 = text(")\n            ");
    			br1 = element("br");
    			attr(input, "type", "range");
    			attr(input, "min", input_min_value = /*rangeOptions*/ ctx[4]["min"][/*o*/ ctx[19]]);
    			attr(input, "max", input_max_value = /*rangeOptions*/ ctx[4]["max"][/*o*/ ctx[19]]);
    			attr(input, "step", input_step_value = /*rangeOptions*/ ctx[4]["step"][/*o*/ ctx[19]]);
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);
    			set_input_value(input, /*option*/ ctx[17]);
    			append(label, br0);
    			append(label, t0);
    			append(label, t1);
    			append(label, t2);
    			append(label, t3);
    			append(label, t4);
    			insert(target, br1, anchor);

    			dispose = [
    				listen(input, "change", input_change_input_handler),
    				listen(input, "input", input_change_input_handler)
    			];
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*rangeOptions*/ 16 && input_min_value !== (input_min_value = /*rangeOptions*/ ctx[4]["min"][/*o*/ ctx[19]])) {
    				attr(input, "min", input_min_value);
    			}

    			if (dirty & /*rangeOptions*/ 16 && input_max_value !== (input_max_value = /*rangeOptions*/ ctx[4]["max"][/*o*/ ctx[19]])) {
    				attr(input, "max", input_max_value);
    			}

    			if (dirty & /*rangeOptions*/ 16 && input_step_value !== (input_step_value = /*rangeOptions*/ ctx[4]["step"][/*o*/ ctx[19]])) {
    				attr(input, "step", input_step_value);
    			}

    			if (dirty & /*rangeValues*/ 4) {
    				set_input_value(input, /*option*/ ctx[17]);
    			}

    			if (dirty & /*rangeOptions*/ 16 && t1_value !== (t1_value = /*rangeOptions*/ ctx[4]["labels"][/*o*/ ctx[19]] + "")) set_data(t1, t1_value);
    			if (dirty & /*rangeValues*/ 4 && t3_value !== (t3_value = /*option*/ ctx[17] + "")) set_data(t3, t3_value);
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    			if (detaching) detach(br1);
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div;
    	let h4;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let label;
    	let button;
    	let t5_value = (/*isFullscreen*/ ctx[5] ? "minimize" : "maximize") + "";
    	let t5;
    	let dispose;
    	let if_block0 = /*options*/ ctx[1]["labels"].length > 0 && /*options*/ ctx[1]["values"].length > 0 && create_if_block_2(ctx);
    	let if_block1 = !!/*color*/ ctx[0] && create_if_block_1(ctx);
    	let if_block2 = /*rangeOptions*/ ctx[4]["labels"].length > 0 && /*rangeValues*/ ctx[2].length > 0 && create_if_block$1(ctx);

    	return {
    		c() {
    			div = element("div");
    			h4 = element("h4");
    			t0 = text(/*title*/ ctx[3]);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			if (if_block2) if_block2.c();
    			t4 = space();
    			label = element("label");
    			button = element("button");
    			t5 = text(t5_value);
    			attr(h4, "class", "svelte-1ll3lt3");
    			attr(div, "class", "controls right svelte-1ll3lt3");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h4);
    			append(h4, t0);
    			append(div, t1);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t2);
    			if (if_block1) if_block1.m(div, null);
    			append(div, t3);
    			if (if_block2) if_block2.m(div, null);
    			append(div, t4);
    			append(div, label);
    			append(label, button);
    			append(button, t5);

    			dispose = listen(button, "click", function () {
    				if (is_function(/*toggleFullscreen*/ ctx[6])) /*toggleFullscreen*/ ctx[6].apply(this, arguments);
    			});
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*title*/ 8) set_data(t0, /*title*/ ctx[3]);

    			if (/*options*/ ctx[1]["labels"].length > 0 && /*options*/ ctx[1]["values"].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!!/*color*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*rangeOptions*/ ctx[4]["labels"].length > 0 && /*rangeValues*/ ctx[2].length > 0) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$1(ctx);
    					if_block2.c();
    					if_block2.m(div, t4);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*isFullscreen*/ 32 && t5_value !== (t5_value = (/*isFullscreen*/ ctx[5] ? "minimize" : "maximize") + "")) set_data(t5, t5_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			dispose();
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { title } = $$props;
    	let { color = "#ff3e00" } = $$props;
    	let { options = [] } = $$props;
    	let { rangeOptions = [] } = $$props;
    	let { rangeValues = [] } = $$props;
    	let { viewLocation } = $$props, { viewTarget } = $$props;
    	let dispatch = createEventDispatcher();
    	let formatPlayTime = time => "" + new Date(time).toString();
    	let navContext;
    	let sinceLastMovementEvent = 0;
    	let isFullscreen = false;

    	let toggleFullscreen = function () {
    		
    	};

    	const init = function () {
    		console.log("Initializing Controls...");

    		document.querySelectorAll(".controls h4").forEach(c => {
    			console.log(c);
    			const scrollLength = 3 * window.innerHeight / 4;

    			c.addEventListener("click", function (event) {
    				let scrollInterval = 33;
    				let scrollTime = 533;
    				let scrolled = 0;

    				const startScroll = setInterval(
    					function () {
    						if (scrolled < scrollLength) {
    							scroll({ top: scrolled, left: 0 });
    						}

    						scrolled += Math.floor(scrollLength / (scrollTime / scrollInterval));
    					},
    					scrollInterval
    				);
    			});

    			c.title = "Click To See Article";
    		});

    		document.querySelectorAll("canvas").forEach(c => {
    			console.log(c);

    			$$invalidate(6, toggleFullscreen = () => {
    				if (!isFullscreen) {
    					$$invalidate(5, isFullscreen = true);
    					c.parentElement.className += " fullscreen";

    					for (const control of document.getElementsByClassName("controls")) {
    						control.className += " fullscreen";
    					}
    				} else {
    					$$invalidate(5, isFullscreen = false);
    					c.parentElement.className = c.parentElement.className.replace("fullscreen", "");

    					for (const control of document.getElementsByClassName("controls")) {
    						control.className = control.className.replace("fullscreen", "");
    					}
    				}
    			});

    			c.addEventListener("keydown", function (event) {
    				const kbEvent = event || window["event"]; // cross-browser shenanigans

    				if (new Date().getTime() - sinceLastMovementEvent > 66) {
    					// console.log(kbEvent);
    					sinceLastMovementEvent = new Date().getTime();

    					if (kbEvent["keyCode"] === 32) {
    						// spacebar
    						kbEvent.preventDefault();

    						return true;
    					} else if (kbEvent["keyCode"] === 38 || kbEvent["keyCode"] === 87) {
    						// up || W
    						dispatch("forward");

    						kbEvent.preventDefault();
    						return true;
    					} else if (kbEvent["keyCode"] === 40 || kbEvent["keyCode"] === 83) {
    						// down || S
    						dispatch("backward");

    						kbEvent.preventDefault();
    						return true;
    					} else if (kbEvent["keyCode"] === 37 || kbEvent["keyCode"] === 65) {
    						// left || A
    						dispatch("left");

    						kbEvent.preventDefault();
    						return true;
    					} else if (kbEvent["keyCode"] === 39 || kbEvent["keyCode"] === 68) {
    						// right || D
    						dispatch("right");

    						kbEvent.preventDefault();
    						return true;
    					} else {
    						console.log("Keyboard Event: ", kbEvent["keyCode"]);
    						return false;
    					}
    				}
    			});

    			c.addEventListener("wheel", function (event) {
    				const wheelEvent = event || window["event"];

    				if (new Date().getTime() - sinceLastMovementEvent > 66) {
    					sinceLastMovementEvent = new Date().getTime();

    					if (wheelEvent.deltaY < 0) {
    						dispatch("up");
    					} else if (wheelEvent.deltaY > 0) {
    						dispatch("down");
    					}
    				}
    			}); // wheelEvent.preventDefault();
    		});
    	};

    	function input_change_handler(option) {
    		option.value = this.checked;
    		$$invalidate(1, options);
    	}

    	function input_input_handler() {
    		color = this.value;
    		$$invalidate(0, color);
    	}

    	function input_change_input_handler(option, each_value, o) {
    		each_value[o] = to_number(this.value);
    		$$invalidate(2, rangeValues);
    	}

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(3, title = $$props.title);
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("rangeOptions" in $$props) $$invalidate(4, rangeOptions = $$props.rangeOptions);
    		if ("rangeValues" in $$props) $$invalidate(2, rangeValues = $$props.rangeValues);
    		if ("viewLocation" in $$props) $$invalidate(7, viewLocation = $$props.viewLocation);
    		if ("viewTarget" in $$props) $$invalidate(8, viewTarget = $$props.viewTarget);
    	};

    	return [
    		color,
    		options,
    		rangeValues,
    		title,
    		rangeOptions,
    		isFullscreen,
    		toggleFullscreen,
    		viewLocation,
    		viewTarget,
    		init,
    		sinceLastMovementEvent,
    		dispatch,
    		formatPlayTime,
    		navContext,
    		input_change_handler,
    		input_input_handler,
    		input_change_input_handler
    	];
    }

    class Controls extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$b, create_fragment$5, safe_not_equal, {
    			title: 3,
    			color: 0,
    			options: 1,
    			rangeOptions: 4,
    			rangeValues: 2,
    			viewLocation: 7,
    			viewTarget: 8,
    			init: 9
    		});
    	}

    	get init() {
    		return this.$$.ctx[9];
    	}
    }

    /* src/apps/VizRApp.svelte generated by Svelte v3.19.1 */

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[30] = i;
    	return child_ctx;
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (121:4) <GL.OrbitControls maxPolarAngle={Math.PI / 2} {location} {target}>
    function create_default_slot_2$1(ctx) {
    	let t0_value = /*captureViewDirection*/ ctx[13](/*location*/ ctx[9], /*target*/ ctx[10]) + "";
    	let t0;
    	let t1;
    	let current;

    	const gl_perspectivecamera = new PerspectiveCamera({
    			props: {
    				location: /*location*/ ctx[9],
    				lookAt: "center",
    				near: 0.01,
    				far: 1000
    			}
    		});

    	return {
    		c() {
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(gl_perspectivecamera.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			mount_component(gl_perspectivecamera, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty[0] & /*location, target*/ 1536) && t0_value !== (t0_value = /*captureViewDirection*/ ctx[13](/*location*/ ctx[9], /*target*/ ctx[10]) + "")) set_data(t0, t0_value);
    			const gl_perspectivecamera_changes = {};
    			if (dirty[0] & /*location*/ 512) gl_perspectivecamera_changes.location = /*location*/ ctx[9];
    			gl_perspectivecamera.$set(gl_perspectivecamera_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_perspectivecamera.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_perspectivecamera.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    			destroy_component(gl_perspectivecamera, detaching);
    		}
    	};
    }

    // (130:8) {#each Array(heightmap[k].length) as _, i}
    function create_each_block_1$2(ctx) {
    	let current;

    	const gl_mesh = new Mesh({
    			props: {
    				geometry: box({
    					x: 0,
    					y: 0,
    					z: 0,
    					w: gridSizeX$1 / /*heightmap*/ ctx[11][/*i*/ ctx[30]].length,
    					h: 1 * /*heightmap*/ ctx[11][/*k*/ ctx[28]][/*i*/ ctx[30]],
    					d: gridSizeZ$1 / /*heightmap*/ ctx[11].length
    				}),
    				location: [
    					-(gridSizeX$1 / 2) + /*i*/ ctx[30] * (gridSizeX$1 / /*heightmap*/ ctx[11][0].length),
    					0,
    					-(gridSizeZ$1 / 2) + /*k*/ ctx[28] * (gridSizeZ$1 / /*heightmap*/ ctx[11].length)
    				],
    				rotation: [0, 0, 0],
    				scale: [/*w*/ ctx[5], /*h*/ ctx[6], /*d*/ ctx[7]],
    				uniforms: {
    					color: adjustColor(/*color*/ ctx[3], /*heightmap*/ ctx[11][/*k*/ ctx[28]][/*i*/ ctx[30]])
    				}
    			}
    		});

    	return {
    		c() {
    			create_component(gl_mesh.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_mesh, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const gl_mesh_changes = {};

    			if (dirty[0] & /*heightmap*/ 2048) gl_mesh_changes.geometry = box({
    				x: 0,
    				y: 0,
    				z: 0,
    				w: gridSizeX$1 / /*heightmap*/ ctx[11][/*i*/ ctx[30]].length,
    				h: 1 * /*heightmap*/ ctx[11][/*k*/ ctx[28]][/*i*/ ctx[30]],
    				d: gridSizeZ$1 / /*heightmap*/ ctx[11].length
    			});

    			if (dirty[0] & /*heightmap*/ 2048) gl_mesh_changes.location = [
    				-(gridSizeX$1 / 2) + /*i*/ ctx[30] * (gridSizeX$1 / /*heightmap*/ ctx[11][0].length),
    				0,
    				-(gridSizeZ$1 / 2) + /*k*/ ctx[28] * (gridSizeZ$1 / /*heightmap*/ ctx[11].length)
    			];

    			if (dirty[0] & /*w, h, d*/ 224) gl_mesh_changes.scale = [/*w*/ ctx[5], /*h*/ ctx[6], /*d*/ ctx[7]];

    			if (dirty[0] & /*color, heightmap*/ 2056) gl_mesh_changes.uniforms = {
    				color: adjustColor(/*color*/ ctx[3], /*heightmap*/ ctx[11][/*k*/ ctx[28]][/*i*/ ctx[30]])
    			};

    			gl_mesh.$set(gl_mesh_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_mesh.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_mesh.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_mesh, detaching);
    		}
    	};
    }

    // (129:4) {#each Array(heightmap.length) as _, k}
    function create_each_block$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = Array(/*heightmap*/ ctx[11][/*k*/ ctx[28]].length);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*heightmap, w, h, d, color*/ 2280) {
    				each_value_1 = Array(/*heightmap*/ ctx[11][/*k*/ ctx[28]].length);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (142:4) <GL.Group location={[light.x,light.y,light.z]}>
    function create_default_slot_1$1(ctx) {
    	let t;
    	let current;

    	const gl_mesh = new Mesh({
    			props: {
    				geometry: sphere({ turns: 36, bands: 36 }),
    				location: [0, 0.2, 0],
    				scale: 0.1,
    				uniforms: { color: 16777215, emissive: 16711680 }
    			}
    		});

    	const gl_pointlight = new PointLight({
    			props: {
    				location: [0, 0, 0],
    				color: 16711680,
    				intensity: 0.6
    			}
    		});

    	return {
    		c() {
    			create_component(gl_mesh.$$.fragment);
    			t = space();
    			create_component(gl_pointlight.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_mesh, target, anchor);
    			insert(target, t, anchor);
    			mount_component(gl_pointlight, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(gl_mesh.$$.fragment, local);
    			transition_in(gl_pointlight.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_mesh.$$.fragment, local);
    			transition_out(gl_pointlight.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_mesh, detaching);
    			if (detaching) detach(t);
    			destroy_component(gl_pointlight, detaching);
    		}
    	};
    }

    // (118:0) <GL.Scene bind:gl={webgl} backgroundOpacity=1.0 process_extra_shader_components={process_extra_shader_components}>
    function create_default_slot$1(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let current;

    	const gl_target = new Target({
    			props: {
    				id: "center",
    				location: [0, /*h*/ ctx[6] / 2, 0]
    			}
    		});

    	const gl_orbitcontrols = new OrbitControls({
    			props: {
    				maxPolarAngle: Math.PI / 2,
    				location: /*location*/ ctx[9],
    				target: /*target*/ ctx[10],
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			}
    		});

    	const gl_ambientlight = new AmbientLight({ props: { intensity: 0.3 } });

    	const gl_directionallight = new DirectionalLight({
    			props: { direction: [-1, -1, -1], intensity: 0.5 }
    		});

    	let each_value = Array(/*heightmap*/ ctx[11].length);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const gl_group = new Group({
    			props: {
    				location: [/*light*/ ctx[4].x, /*light*/ ctx[4].y, /*light*/ ctx[4].z],
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(gl_target.$$.fragment);
    			t0 = space();
    			create_component(gl_orbitcontrols.$$.fragment);
    			t1 = space();
    			create_component(gl_ambientlight.$$.fragment);
    			t2 = space();
    			create_component(gl_directionallight.$$.fragment);
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			create_component(gl_group.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_target, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(gl_orbitcontrols, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(gl_ambientlight, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(gl_directionallight, target, anchor);
    			insert(target, t3, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t4, anchor);
    			mount_component(gl_group, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const gl_target_changes = {};
    			if (dirty[0] & /*h*/ 64) gl_target_changes.location = [0, /*h*/ ctx[6] / 2, 0];
    			gl_target.$set(gl_target_changes);
    			const gl_orbitcontrols_changes = {};
    			if (dirty[0] & /*location*/ 512) gl_orbitcontrols_changes.location = /*location*/ ctx[9];
    			if (dirty[0] & /*target*/ 1024) gl_orbitcontrols_changes.target = /*target*/ ctx[10];

    			if (dirty[0] & /*location, target*/ 1536 | dirty[1] & /*$$scope*/ 1) {
    				gl_orbitcontrols_changes.$$scope = { dirty, ctx };
    			}

    			gl_orbitcontrols.$set(gl_orbitcontrols_changes);

    			if (dirty[0] & /*heightmap, w, h, d, color*/ 2280) {
    				each_value = Array(/*heightmap*/ ctx[11].length);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t4.parentNode, t4);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const gl_group_changes = {};
    			if (dirty[0] & /*light*/ 16) gl_group_changes.location = [/*light*/ ctx[4].x, /*light*/ ctx[4].y, /*light*/ ctx[4].z];

    			if (dirty[1] & /*$$scope*/ 1) {
    				gl_group_changes.$$scope = { dirty, ctx };
    			}

    			gl_group.$set(gl_group_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_target.$$.fragment, local);
    			transition_in(gl_orbitcontrols.$$.fragment, local);
    			transition_in(gl_ambientlight.$$.fragment, local);
    			transition_in(gl_directionallight.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(gl_group.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_target.$$.fragment, local);
    			transition_out(gl_orbitcontrols.$$.fragment, local);
    			transition_out(gl_ambientlight.$$.fragment, local);
    			transition_out(gl_directionallight.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(gl_group.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_target, detaching);
    			if (detaching) detach(t0);
    			destroy_component(gl_orbitcontrols, detaching);
    			if (detaching) detach(t1);
    			destroy_component(gl_ambientlight, detaching);
    			if (detaching) detach(t2);
    			destroy_component(gl_directionallight, detaching);
    			if (detaching) detach(t3);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t4);
    			destroy_component(gl_group, detaching);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let updating_gl;
    	let t;
    	let updating_init;
    	let updating_color;
    	let updating_options;
    	let updating_rangeOptions;
    	let updating_rangeValues;
    	let updating_viewLocation;
    	let updating_viewTarget;
    	let current;

    	function gl_scene_gl_binding(value) {
    		/*gl_scene_gl_binding*/ ctx[17].call(null, value);
    	}

    	let gl_scene_props = {
    		backgroundOpacity: "1.0",
    		process_extra_shader_components: /*process_extra_shader_components*/ ctx[14],
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	};

    	if (/*webgl*/ ctx[8] !== void 0) {
    		gl_scene_props.gl = /*webgl*/ ctx[8];
    	}

    	const gl_scene = new Scene({ props: gl_scene_props });
    	binding_callbacks.push(() => bind(gl_scene, "gl", gl_scene_gl_binding));

    	function controls_init_binding(value) {
    		/*controls_init_binding*/ ctx[18].call(null, value);
    	}

    	function controls_color_binding(value) {
    		/*controls_color_binding*/ ctx[19].call(null, value);
    	}

    	function controls_options_binding(value) {
    		/*controls_options_binding*/ ctx[20].call(null, value);
    	}

    	function controls_rangeOptions_binding(value) {
    		/*controls_rangeOptions_binding*/ ctx[21].call(null, value);
    	}

    	function controls_rangeValues_binding(value) {
    		/*controls_rangeValues_binding*/ ctx[22].call(null, value);
    	}

    	function controls_viewLocation_binding(value) {
    		/*controls_viewLocation_binding*/ ctx[23].call(null, value);
    	}

    	function controls_viewTarget_binding(value) {
    		/*controls_viewTarget_binding*/ ctx[24].call(null, value);
    	}

    	let controls_props = { title: /*title*/ ctx[2] };

    	if (/*navControlInit*/ ctx[12] !== void 0) {
    		controls_props.init = /*navControlInit*/ ctx[12];
    	}

    	if (/*color*/ ctx[3] !== void 0) {
    		controls_props.color = /*color*/ ctx[3];
    	}

    	if (/*options*/ ctx[0] !== void 0) {
    		controls_props.options = /*options*/ ctx[0];
    	}

    	if (/*ranges*/ ctx[1] !== void 0) {
    		controls_props.rangeOptions = /*ranges*/ ctx[1];
    	}

    	if (/*ranges*/ ctx[1].values !== void 0) {
    		controls_props.rangeValues = /*ranges*/ ctx[1].values;
    	}

    	if (/*location*/ ctx[9] !== void 0) {
    		controls_props.viewLocation = /*location*/ ctx[9];
    	}

    	if (/*target*/ ctx[10] !== void 0) {
    		controls_props.viewTarget = /*target*/ ctx[10];
    	}

    	const controls = new Controls({ props: controls_props });
    	binding_callbacks.push(() => bind(controls, "init", controls_init_binding));
    	binding_callbacks.push(() => bind(controls, "color", controls_color_binding));
    	binding_callbacks.push(() => bind(controls, "options", controls_options_binding));
    	binding_callbacks.push(() => bind(controls, "rangeOptions", controls_rangeOptions_binding));
    	binding_callbacks.push(() => bind(controls, "rangeValues", controls_rangeValues_binding));
    	binding_callbacks.push(() => bind(controls, "viewLocation", controls_viewLocation_binding));
    	binding_callbacks.push(() => bind(controls, "viewTarget", controls_viewTarget_binding));
    	controls.$on("move", /*move_handler*/ ctx[25]);

    	return {
    		c() {
    			create_component(gl_scene.$$.fragment);
    			t = space();
    			create_component(controls.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_scene, target, anchor);
    			insert(target, t, anchor);
    			mount_component(controls, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const gl_scene_changes = {};

    			if (dirty[0] & /*light, heightmap, w, h, d, color, location, target*/ 3832 | dirty[1] & /*$$scope*/ 1) {
    				gl_scene_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_gl && dirty[0] & /*webgl*/ 256) {
    				updating_gl = true;
    				gl_scene_changes.gl = /*webgl*/ ctx[8];
    				add_flush_callback(() => updating_gl = false);
    			}

    			gl_scene.$set(gl_scene_changes);
    			const controls_changes = {};
    			if (dirty[0] & /*title*/ 4) controls_changes.title = /*title*/ ctx[2];

    			if (!updating_init && dirty[0] & /*navControlInit*/ 4096) {
    				updating_init = true;
    				controls_changes.init = /*navControlInit*/ ctx[12];
    				add_flush_callback(() => updating_init = false);
    			}

    			if (!updating_color && dirty[0] & /*color*/ 8) {
    				updating_color = true;
    				controls_changes.color = /*color*/ ctx[3];
    				add_flush_callback(() => updating_color = false);
    			}

    			if (!updating_options && dirty[0] & /*options*/ 1) {
    				updating_options = true;
    				controls_changes.options = /*options*/ ctx[0];
    				add_flush_callback(() => updating_options = false);
    			}

    			if (!updating_rangeOptions && dirty[0] & /*ranges*/ 2) {
    				updating_rangeOptions = true;
    				controls_changes.rangeOptions = /*ranges*/ ctx[1];
    				add_flush_callback(() => updating_rangeOptions = false);
    			}

    			if (!updating_rangeValues && dirty[0] & /*ranges*/ 2) {
    				updating_rangeValues = true;
    				controls_changes.rangeValues = /*ranges*/ ctx[1].values;
    				add_flush_callback(() => updating_rangeValues = false);
    			}

    			if (!updating_viewLocation && dirty[0] & /*location*/ 512) {
    				updating_viewLocation = true;
    				controls_changes.viewLocation = /*location*/ ctx[9];
    				add_flush_callback(() => updating_viewLocation = false);
    			}

    			if (!updating_viewTarget && dirty[0] & /*target*/ 1024) {
    				updating_viewTarget = true;
    				controls_changes.viewTarget = /*target*/ ctx[10];
    				add_flush_callback(() => updating_viewTarget = false);
    			}

    			controls.$set(controls_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_scene.$$.fragment, local);
    			transition_in(controls.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_scene.$$.fragment, local);
    			transition_out(controls.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_scene, detaching);
    			if (detaching) detach(t);
    			destroy_component(controls, detaching);
    		}
    	};
    }

    const gridSizeX$1 = 10;
    const gridSizeZ$1 = 10;

    function adjustColor(clr, height = 1) {
    	const r = parseInt("0x" + clr.substr(1, 2), 16),
    		g = parseInt("0x" + clr.substr(3, 2), 16),
    		b = parseInt("0x" + clr.substr(5, 2), 16);

    	const hr = Math.floor(r * (height / 0.25)), hb = Math.floor(b * (height / 0.25));
    	return Math.abs(((hr < 255 ? hr : r) << 16) + (g << 8) + (hb < 255 ? hb : b));
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { title } = $$props;
    	let color = "#ff3e00";
    	const light = {};
    	let w = 1;
    	let h = 1;
    	let d = 1;
    	let webgl;
    	let { options = { labels: [], values: [] } } = $$props;

    	let { ranges = {
    		labels: ["width", "height", "depth"],
    		min: [0.1, 0.1, 0.1],
    		max: [5, 5, 5],
    		step: [0.1, 0.1, 0.1],
    		values: []
    	} } = $$props;

    	// initial view
    	let location = new Float32Array([0, 10, 5]);

    	let target = new Float32Array([0, 1, 0]);

    	const captureViewDirection = (loc, tgt) => {
    		console.log("location: ", loc, "\n", "target: ", tgt);
    		return "";
    	};

    	const data = JSON.parse(document.getElementById("gl_data_in_html").children[0].innerHTML);
    	const heightmap = [];

    	for (let z = 0; z < data.length; z++) {
    		const xx = [];

    		for (const x of Object.getOwnPropertyNames(data[z])) {
    			xx.push(data[z][x]);
    		}

    		heightmap[z] = xx;
    	}

    	console.log(heightmap);

    	/* This is a helper callback to bind custom uniforms/attributes
     * and to pass custom buffers, like the ad-hoc texture coords
     * used in normal-selected texture shader below. I inserted a
     * hook directly in the @sveltejs/gl source for this purpose
     */
    	let process_extra_shader_components = (gl, material, model) => {
    		// console.log("Process Extra Shader Components");
    		const program = material.program;
    	};

    	let updateWorld = event => {
    		console.log(event);
    	};

    	let navControlInit;

    	onMount(() => {
    		let frame;

    		if (typeof navControlInit === "function") {
    			navControlInit();
    		}

    		const loop = () => {
    			frame = requestAnimationFrame(loop);
    			$$invalidate(4, light.x = 3 * Math.sin(Date.now() * 0.001), light);
    			$$invalidate(4, light.y = 2.5 + 2 * Math.sin(Date.now() * 0.0004), light);
    			$$invalidate(4, light.z = 3 * Math.cos(Date.now() * 0.002), light);

    			if (ranges["values"].length > 0) {
    				$$invalidate(5, w = ranges["values"][0]);
    				$$invalidate(6, h = ranges["values"][1]);
    				$$invalidate(7, d = ranges["values"][2]);
    			} else {
    				$$invalidate(1, ranges["values"] = [w, h, d], ranges);
    			}
    		};

    		loop();
    		return () => cancelAnimationFrame(frame);
    	});

    	function gl_scene_gl_binding(value) {
    		webgl = value;
    		$$invalidate(8, webgl);
    	}

    	function controls_init_binding(value) {
    		navControlInit = value;
    		$$invalidate(12, navControlInit);
    	}

    	function controls_color_binding(value) {
    		color = value;
    		$$invalidate(3, color);
    	}

    	function controls_options_binding(value) {
    		options = value;
    		$$invalidate(0, options);
    	}

    	function controls_rangeOptions_binding(value) {
    		ranges = value;
    		$$invalidate(1, ranges);
    	}

    	function controls_rangeValues_binding(value) {
    		ranges.values = value;
    		$$invalidate(1, ranges);
    	}

    	function controls_viewLocation_binding(value) {
    		location = value;
    		$$invalidate(9, location);
    	}

    	function controls_viewTarget_binding(value) {
    		target = value;
    		$$invalidate(10, target);
    	}

    	const move_handler = event => updateWorld(event);

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(2, title = $$props.title);
    		if ("options" in $$props) $$invalidate(0, options = $$props.options);
    		if ("ranges" in $$props) $$invalidate(1, ranges = $$props.ranges);
    	};

    	return [
    		options,
    		ranges,
    		title,
    		color,
    		light,
    		w,
    		h,
    		d,
    		webgl,
    		location,
    		target,
    		heightmap,
    		navControlInit,
    		captureViewDirection,
    		process_extra_shader_components,
    		updateWorld,
    		data,
    		gl_scene_gl_binding,
    		controls_init_binding,
    		controls_color_binding,
    		controls_options_binding,
    		controls_rangeOptions_binding,
    		controls_rangeValues_binding,
    		controls_viewLocation_binding,
    		controls_viewTarget_binding,
    		move_handler
    	];
    }

    class VizRApp extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$c, create_fragment$6, safe_not_equal, { title: 2, options: 0, ranges: 1 }, [-1, -1]);
    	}
    }

    /* src/apps/components/Keypad.svelte generated by Svelte v3.19.1 */

    function create_fragment$7(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let button3;
    	let t7;
    	let button4;
    	let t9;
    	let button5;
    	let t11;
    	let button6;
    	let t13;
    	let button7;
    	let t15;
    	let button8;
    	let t17;
    	let button9;
    	let t18;
    	let button9_disabled_value;
    	let t19;
    	let button10;
    	let t21;
    	let button11;
    	let t22;
    	let button11_disabled_value;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "1";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "2";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "3";
    			t5 = space();
    			button3 = element("button");
    			button3.textContent = "4";
    			t7 = space();
    			button4 = element("button");
    			button4.textContent = "5";
    			t9 = space();
    			button5 = element("button");
    			button5.textContent = "6";
    			t11 = space();
    			button6 = element("button");
    			button6.textContent = "7";
    			t13 = space();
    			button7 = element("button");
    			button7.textContent = "8";
    			t15 = space();
    			button8 = element("button");
    			button8.textContent = "9";
    			t17 = space();
    			button9 = element("button");
    			t18 = text("clear");
    			t19 = space();
    			button10 = element("button");
    			button10.textContent = "0";
    			t21 = space();
    			button11 = element("button");
    			t22 = text("submit");
    			attr(button0, "class", "svelte-el36x5");
    			attr(button1, "class", "svelte-el36x5");
    			attr(button2, "class", "svelte-el36x5");
    			attr(button3, "class", "svelte-el36x5");
    			attr(button4, "class", "svelte-el36x5");
    			attr(button5, "class", "svelte-el36x5");
    			attr(button6, "class", "svelte-el36x5");
    			attr(button7, "class", "svelte-el36x5");
    			attr(button8, "class", "svelte-el36x5");
    			button9.disabled = button9_disabled_value = !/*value*/ ctx[0];
    			attr(button9, "class", "svelte-el36x5");
    			attr(button10, "class", "svelte-el36x5");
    			button11.disabled = button11_disabled_value = !/*value*/ ctx[0];
    			attr(button11, "class", "svelte-el36x5");
    			attr(div, "class", "keypad svelte-el36x5");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button0);
    			append(div, t1);
    			append(div, button1);
    			append(div, t3);
    			append(div, button2);
    			append(div, t5);
    			append(div, button3);
    			append(div, t7);
    			append(div, button4);
    			append(div, t9);
    			append(div, button5);
    			append(div, t11);
    			append(div, button6);
    			append(div, t13);
    			append(div, button7);
    			append(div, t15);
    			append(div, button8);
    			append(div, t17);
    			append(div, button9);
    			append(button9, t18);
    			append(div, t19);
    			append(div, button10);
    			append(div, t21);
    			append(div, button11);
    			append(button11, t22);

    			dispose = [
    				listen(button0, "click", /*select*/ ctx[1](1)),
    				listen(button1, "click", /*select*/ ctx[1](2)),
    				listen(button2, "click", /*select*/ ctx[1](3)),
    				listen(button3, "click", /*select*/ ctx[1](4)),
    				listen(button4, "click", /*select*/ ctx[1](5)),
    				listen(button5, "click", /*select*/ ctx[1](6)),
    				listen(button6, "click", /*select*/ ctx[1](7)),
    				listen(button7, "click", /*select*/ ctx[1](8)),
    				listen(button8, "click", /*select*/ ctx[1](9)),
    				listen(button9, "click", /*clear*/ ctx[2]),
    				listen(button10, "click", /*select*/ ctx[1](0)),
    				listen(button11, "click", /*submit*/ ctx[3])
    			];
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*value*/ 1 && button9_disabled_value !== (button9_disabled_value = !/*value*/ ctx[0])) {
    				button9.disabled = button9_disabled_value;
    			}

    			if (dirty & /*value*/ 1 && button11_disabled_value !== (button11_disabled_value = !/*value*/ ctx[0])) {
    				button11.disabled = button11_disabled_value;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			run_all(dispose);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { value = "" } = $$props;
    	const dispatch = createEventDispatcher();
    	const select = num => () => $$invalidate(0, value += num);
    	const clear = () => $$invalidate(0, value = "");
    	const submit = () => dispatch("submit");

    	$$self.$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	return [value, select, clear, submit];
    }

    class Keypad extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$d, create_fragment$7, safe_not_equal, { value: 0 });
    	}
    }

    /* src/apps/TechApp.svelte generated by Svelte v3.19.1 */

    function create_default_slot_2$2(ctx) {
    	let current;

    	const gl_perspectivecamera = new PerspectiveCamera({
    			props: {
    				location: /*location*/ ctx[15],
    				lookAt: "center",
    				near: 0.01,
    				far: 1000
    			}
    		});

    	return {
    		c() {
    			create_component(gl_perspectivecamera.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_perspectivecamera, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const gl_perspectivecamera_changes = {};
    			if (dirty & /*location*/ 32768) gl_perspectivecamera_changes.location = /*location*/ ctx[15];
    			gl_perspectivecamera.$set(gl_perspectivecamera_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_perspectivecamera.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_perspectivecamera.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_perspectivecamera, detaching);
    		}
    	};
    }

    // (143:1) <GL.Group location={[light.x,light.y,light.z]}>
    function create_default_slot_1$2(ctx) {
    	let t;
    	let current;

    	const gl_mesh = new Mesh({
    			props: {
    				geometry: sphere({ turns: 36, bands: 36 }),
    				location: [0, 0.2, 0],
    				scale: 0.1,
    				uniforms: { color: 16777215, emissive: 16711680 }
    			}
    		});

    	const gl_pointlight = new PointLight({
    			props: {
    				location: [0, 0, 0],
    				color: 16711680,
    				intensity: 0.6
    			}
    		});

    	return {
    		c() {
    			create_component(gl_mesh.$$.fragment);
    			t = space();
    			create_component(gl_pointlight.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_mesh, target, anchor);
    			insert(target, t, anchor);
    			mount_component(gl_pointlight, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(gl_mesh.$$.fragment, local);
    			transition_in(gl_pointlight.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_mesh.$$.fragment, local);
    			transition_out(gl_pointlight.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_mesh, detaching);
    			if (detaching) detach(t);
    			destroy_component(gl_pointlight, detaching);
    		}
    	};
    }

    // (61:0) <GL.Scene>
    function create_default_slot$2(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let current;

    	const gl_target = new Target({
    			props: {
    				id: "center",
    				location: [0, /*h*/ ctx[4] / 2, 0]
    			}
    		});

    	const gl_orbitcontrols = new OrbitControls({
    			props: {
    				maxPolarAngle: Math.PI / 2,
    				$$slots: {
    					default: [
    						create_default_slot_2$2,
    						({ location }) => ({ 15: location }),
    						({ location }) => location ? 32768 : 0
    					]
    				},
    				$$scope: { ctx }
    			}
    		});

    	const gl_ambientlight = new AmbientLight({ props: { intensity: 0.3 } });

    	const gl_directionallight = new DirectionalLight({
    			props: { direction: [-1, -1, -1], intensity: 0.5 }
    		});

    	const gl_mesh0 = new Mesh({
    			props: {
    				geometry: box({}),
    				location: [0, /*h*/ ctx[4] / 2, 0],
    				rotation: [0, -20, 0],
    				scale: [/*w*/ ctx[3], /*h*/ ctx[4], /*d*/ ctx[5]],
    				uniforms: {
    					color: /*from_hex*/ ctx[8](/*color*/ ctx[0])
    				}
    			}
    		});

    	const gl_mesh1 = new Mesh({
    			props: {
    				geometry: sphere({ turns: 36, bands: 36 }),
    				location: [-0.5, 0.4, 1.2],
    				scale: 0.4,
    				uniforms: { color: 1193046, alpha: 0.9 },
    				transparent: true
    			}
    		});

    	const gl_mesh2 = new Mesh({
    			props: {
    				geometry: sphere({ turns: 36, bands: 36 }),
    				location: [-1.4, 0.6, 0.2],
    				scale: 0.6,
    				uniforms: { color: 3368516, alpha: 1 },
    				transparent: true
    			}
    		});

    	const gl_mesh3 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [0, -0.01, 0],
    				rotation: [-90, 0, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_mesh4 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [0, 5, 0],
    				rotation: [90, 0, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_mesh5 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [0, -0.01, -10],
    				rotation: [0, 0, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_mesh6 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [10, -0.01, 0],
    				rotation: [0, -90, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_mesh7 = new Mesh({
    			props: {
    				geometry: plane(),
    				location: [-10, -0.01, 0],
    				rotation: [0, 90, 0],
    				scale: 10,
    				uniforms: { color: 16777215 }
    			}
    		});

    	const gl_group = new Group({
    			props: {
    				location: [/*light*/ ctx[6].x, /*light*/ ctx[6].y, /*light*/ ctx[6].z],
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(gl_target.$$.fragment);
    			t0 = space();
    			create_component(gl_orbitcontrols.$$.fragment);
    			t1 = space();
    			create_component(gl_ambientlight.$$.fragment);
    			t2 = space();
    			create_component(gl_directionallight.$$.fragment);
    			t3 = space();
    			create_component(gl_mesh0.$$.fragment);
    			t4 = space();
    			create_component(gl_mesh1.$$.fragment);
    			t5 = space();
    			create_component(gl_mesh2.$$.fragment);
    			t6 = space();
    			create_component(gl_mesh3.$$.fragment);
    			t7 = space();
    			create_component(gl_mesh4.$$.fragment);
    			t8 = space();
    			create_component(gl_mesh5.$$.fragment);
    			t9 = space();
    			create_component(gl_mesh6.$$.fragment);
    			t10 = space();
    			create_component(gl_mesh7.$$.fragment);
    			t11 = space();
    			create_component(gl_group.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(gl_target, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(gl_orbitcontrols, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(gl_ambientlight, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(gl_directionallight, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(gl_mesh0, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(gl_mesh1, target, anchor);
    			insert(target, t5, anchor);
    			mount_component(gl_mesh2, target, anchor);
    			insert(target, t6, anchor);
    			mount_component(gl_mesh3, target, anchor);
    			insert(target, t7, anchor);
    			mount_component(gl_mesh4, target, anchor);
    			insert(target, t8, anchor);
    			mount_component(gl_mesh5, target, anchor);
    			insert(target, t9, anchor);
    			mount_component(gl_mesh6, target, anchor);
    			insert(target, t10, anchor);
    			mount_component(gl_mesh7, target, anchor);
    			insert(target, t11, anchor);
    			mount_component(gl_group, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const gl_target_changes = {};
    			if (dirty & /*h*/ 16) gl_target_changes.location = [0, /*h*/ ctx[4] / 2, 0];
    			gl_target.$set(gl_target_changes);
    			const gl_orbitcontrols_changes = {};

    			if (dirty & /*$$scope, location*/ 98304) {
    				gl_orbitcontrols_changes.$$scope = { dirty, ctx };
    			}

    			gl_orbitcontrols.$set(gl_orbitcontrols_changes);
    			const gl_mesh0_changes = {};
    			if (dirty & /*h*/ 16) gl_mesh0_changes.location = [0, /*h*/ ctx[4] / 2, 0];
    			if (dirty & /*w, h, d*/ 56) gl_mesh0_changes.scale = [/*w*/ ctx[3], /*h*/ ctx[4], /*d*/ ctx[5]];

    			if (dirty & /*color*/ 1) gl_mesh0_changes.uniforms = {
    				color: /*from_hex*/ ctx[8](/*color*/ ctx[0])
    			};

    			gl_mesh0.$set(gl_mesh0_changes);
    			const gl_group_changes = {};
    			if (dirty & /*light*/ 64) gl_group_changes.location = [/*light*/ ctx[6].x, /*light*/ ctx[6].y, /*light*/ ctx[6].z];

    			if (dirty & /*$$scope*/ 65536) {
    				gl_group_changes.$$scope = { dirty, ctx };
    			}

    			gl_group.$set(gl_group_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_target.$$.fragment, local);
    			transition_in(gl_orbitcontrols.$$.fragment, local);
    			transition_in(gl_ambientlight.$$.fragment, local);
    			transition_in(gl_directionallight.$$.fragment, local);
    			transition_in(gl_mesh0.$$.fragment, local);
    			transition_in(gl_mesh1.$$.fragment, local);
    			transition_in(gl_mesh2.$$.fragment, local);
    			transition_in(gl_mesh3.$$.fragment, local);
    			transition_in(gl_mesh4.$$.fragment, local);
    			transition_in(gl_mesh5.$$.fragment, local);
    			transition_in(gl_mesh6.$$.fragment, local);
    			transition_in(gl_mesh7.$$.fragment, local);
    			transition_in(gl_group.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_target.$$.fragment, local);
    			transition_out(gl_orbitcontrols.$$.fragment, local);
    			transition_out(gl_ambientlight.$$.fragment, local);
    			transition_out(gl_directionallight.$$.fragment, local);
    			transition_out(gl_mesh0.$$.fragment, local);
    			transition_out(gl_mesh1.$$.fragment, local);
    			transition_out(gl_mesh2.$$.fragment, local);
    			transition_out(gl_mesh3.$$.fragment, local);
    			transition_out(gl_mesh4.$$.fragment, local);
    			transition_out(gl_mesh5.$$.fragment, local);
    			transition_out(gl_mesh6.$$.fragment, local);
    			transition_out(gl_mesh7.$$.fragment, local);
    			transition_out(gl_group.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_target, detaching);
    			if (detaching) detach(t0);
    			destroy_component(gl_orbitcontrols, detaching);
    			if (detaching) detach(t1);
    			destroy_component(gl_ambientlight, detaching);
    			if (detaching) detach(t2);
    			destroy_component(gl_directionallight, detaching);
    			if (detaching) detach(t3);
    			destroy_component(gl_mesh0, detaching);
    			if (detaching) detach(t4);
    			destroy_component(gl_mesh1, detaching);
    			if (detaching) detach(t5);
    			destroy_component(gl_mesh2, detaching);
    			if (detaching) detach(t6);
    			destroy_component(gl_mesh3, detaching);
    			if (detaching) detach(t7);
    			destroy_component(gl_mesh4, detaching);
    			if (detaching) detach(t8);
    			destroy_component(gl_mesh5, detaching);
    			if (detaching) detach(t9);
    			destroy_component(gl_mesh6, detaching);
    			if (detaching) detach(t10);
    			destroy_component(gl_mesh7, detaching);
    			if (detaching) detach(t11);
    			destroy_component(gl_group, detaching);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let t0;
    	let div0;
    	let label0;
    	let input0;
    	let t1;
    	let label1;
    	let input1;
    	let input1_min_value;
    	let input1_max_value;
    	let input1_step_value;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let label2;
    	let input2;
    	let input2_min_value;
    	let input2_max_value;
    	let input2_step_value;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let label3;
    	let input3;
    	let input3_min_value;
    	let input3_max_value;
    	let input3_step_value;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let div1;
    	let h1;
    	let t14;
    	let t15;
    	let updating_value;
    	let current;
    	let dispose;

    	const gl_scene = new Scene({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	function keypad_value_binding(value) {
    		/*keypad_value_binding*/ ctx[14].call(null, value);
    	}

    	let keypad_props = {};

    	if (/*pin*/ ctx[1] !== void 0) {
    		keypad_props.value = /*pin*/ ctx[1];
    	}

    	const keypad = new Keypad({ props: keypad_props });
    	binding_callbacks.push(() => bind(keypad, "value", keypad_value_binding));
    	keypad.$on("submit", /*handleSubmit*/ ctx[7]);

    	return {
    		c() {
    			create_component(gl_scene.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t1 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t2 = text(" width (");
    			t3 = text(/*w*/ ctx[3]);
    			t4 = text(")");
    			t5 = space();
    			label2 = element("label");
    			input2 = element("input");
    			t6 = text(" height (");
    			t7 = text(/*h*/ ctx[4]);
    			t8 = text(")");
    			t9 = space();
    			label3 = element("label");
    			input3 = element("input");
    			t10 = text(" depth (");
    			t11 = text(/*d*/ ctx[5]);
    			t12 = text(")");
    			t13 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t14 = text(/*view*/ ctx[2]);
    			t15 = space();
    			create_component(keypad.$$.fragment);
    			attr(input0, "type", "color");
    			set_style(input0, "height", "40px");
    			attr(input1, "type", "range");
    			attr(input1, "min", input1_min_value = 0.1);
    			attr(input1, "max", input1_max_value = 5);
    			attr(input1, "step", input1_step_value = 0.1);
    			attr(input2, "type", "range");
    			attr(input2, "min", input2_min_value = 0.1);
    			attr(input2, "max", input2_max_value = 5);
    			attr(input2, "step", input2_step_value = 0.1);
    			attr(input3, "type", "range");
    			attr(input3, "min", input3_min_value = 0.1);
    			attr(input3, "max", input3_max_value = 5);
    			attr(input3, "step", input3_step_value = 0.1);
    			attr(div0, "class", "controls");
    			set_style(h1, "color", /*pin*/ ctx[1] ? "#999" : "#fff");
    			attr(h1, "class", "svelte-wp77q5");
    			attr(div1, "class", "controls keys svelte-wp77q5");
    		},
    		m(target, anchor) {
    			mount_component(gl_scene, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div0, anchor);
    			append(div0, label0);
    			append(label0, input0);
    			set_input_value(input0, /*color*/ ctx[0]);
    			append(div0, t1);
    			append(div0, label1);
    			append(label1, input1);
    			set_input_value(input1, /*w*/ ctx[3]);
    			append(label1, t2);
    			append(label1, t3);
    			append(label1, t4);
    			append(div0, t5);
    			append(div0, label2);
    			append(label2, input2);
    			set_input_value(input2, /*h*/ ctx[4]);
    			append(label2, t6);
    			append(label2, t7);
    			append(label2, t8);
    			append(div0, t9);
    			append(div0, label3);
    			append(label3, input3);
    			set_input_value(input3, /*d*/ ctx[5]);
    			append(label3, t10);
    			append(label3, t11);
    			append(label3, t12);
    			insert(target, t13, anchor);
    			insert(target, div1, anchor);
    			append(div1, h1);
    			append(h1, t14);
    			append(div1, t15);
    			mount_component(keypad, div1, null);
    			current = true;

    			dispose = [
    				listen(input0, "input", /*input0_input_handler*/ ctx[10]),
    				listen(input1, "change", /*input1_change_input_handler*/ ctx[11]),
    				listen(input1, "input", /*input1_change_input_handler*/ ctx[11]),
    				listen(input2, "change", /*input2_change_input_handler*/ ctx[12]),
    				listen(input2, "input", /*input2_change_input_handler*/ ctx[12]),
    				listen(input3, "change", /*input3_change_input_handler*/ ctx[13]),
    				listen(input3, "input", /*input3_change_input_handler*/ ctx[13])
    			];
    		},
    		p(ctx, [dirty]) {
    			const gl_scene_changes = {};

    			if (dirty & /*$$scope, light, h, w, d, color*/ 65657) {
    				gl_scene_changes.$$scope = { dirty, ctx };
    			}

    			gl_scene.$set(gl_scene_changes);

    			if (dirty & /*color*/ 1) {
    				set_input_value(input0, /*color*/ ctx[0]);
    			}

    			if (dirty & /*w*/ 8) {
    				set_input_value(input1, /*w*/ ctx[3]);
    			}

    			if (!current || dirty & /*w*/ 8) set_data(t3, /*w*/ ctx[3]);

    			if (dirty & /*h*/ 16) {
    				set_input_value(input2, /*h*/ ctx[4]);
    			}

    			if (!current || dirty & /*h*/ 16) set_data(t7, /*h*/ ctx[4]);

    			if (dirty & /*d*/ 32) {
    				set_input_value(input3, /*d*/ ctx[5]);
    			}

    			if (!current || dirty & /*d*/ 32) set_data(t11, /*d*/ ctx[5]);
    			if (!current || dirty & /*view*/ 4) set_data(t14, /*view*/ ctx[2]);

    			if (!current || dirty & /*pin*/ 2) {
    				set_style(h1, "color", /*pin*/ ctx[1] ? "#999" : "#fff");
    			}

    			const keypad_changes = {};

    			if (!updating_value && dirty & /*pin*/ 2) {
    				updating_value = true;
    				keypad_changes.value = /*pin*/ ctx[1];
    				add_flush_callback(() => updating_value = false);
    			}

    			keypad.$set(keypad_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(gl_scene.$$.fragment, local);
    			transition_in(keypad.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(gl_scene.$$.fragment, local);
    			transition_out(keypad.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(gl_scene, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div0);
    			if (detaching) detach(t13);
    			if (detaching) detach(div1);
    			destroy_component(keypad);
    			run_all(dispose);
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { title } = $$props;
    	let pin;
    	let view;

    	function handleSubmit() {
    		alert(`submitted ${pin}`);
    	}

    	let { color = "#ff3e00" } = $$props;
    	let w = 1;
    	let h = 1;
    	let d = 1;
    	const from_hex = hex => parseInt(hex.slice(1), 16);
    	const light = {};

    	onMount(() => {
    		let frame;

    		const loop = () => {
    			frame = requestAnimationFrame(loop);
    			$$invalidate(6, light.x = 3 * Math.sin(Date.now() * 0.001), light);
    			$$invalidate(6, light.y = 2.5 + 2 * Math.sin(Date.now() * 0.0004), light);
    			$$invalidate(6, light.z = 3 * Math.cos(Date.now() * 0.002), light);
    		};

    		loop();
    		return () => cancelAnimationFrame(frame);
    	});

    	function input0_input_handler() {
    		color = this.value;
    		$$invalidate(0, color);
    	}

    	function input1_change_input_handler() {
    		w = to_number(this.value);
    		$$invalidate(3, w);
    	}

    	function input2_change_input_handler() {
    		h = to_number(this.value);
    		$$invalidate(4, h);
    	}

    	function input3_change_input_handler() {
    		d = to_number(this.value);
    		$$invalidate(5, d);
    	}

    	function keypad_value_binding(value) {
    		pin = value;
    		$$invalidate(1, pin);
    	}

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(9, title = $$props.title);
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*pin*/ 2) {
    			 $$invalidate(2, view = pin ? pin.replace(/\d(?!$)/g, "*") : "enter your pin");
    		}
    	};

    	return [
    		color,
    		pin,
    		view,
    		w,
    		h,
    		d,
    		light,
    		handleSubmit,
    		from_hex,
    		title,
    		input0_input_handler,
    		input1_change_input_handler,
    		input2_change_input_handler,
    		input3_change_input_handler,
    		keypad_value_binding
    	];
    }

    class TechApp extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$e, create_fragment$8, safe_not_equal, { title: 9, color: 0 });
    	}
    }

    const appId = 'svelte-app';
    const appElement = document.getElementById(appId);
    var main = ( // Check if app id exists in DOM
        appElement !== null &&
        (appElement.constructor.name === 'HTMLElement' ||
            appElement.constructor.name === 'HTMLDivElement')
        ) ?
        new App({
            target: appElement,
            props: {
                greeting:
`Hooray 🎉 - you've built this with <a href='https://github.com/dancingfrog/sveltr' target='_blank'>Sveltr</a>!`
            }
        }) : {};


    const techAppId = 'tech-app';
    const techAppElement = document.getElementById(techAppId);
    const techApp = (
        techAppElement !== null &&
        (techAppElement.constructor.name === 'HTMLElement' ||
            techAppElement.constructor.name === 'HTMLDivElement')
        ) ?
        new TechApp({
            target: techAppElement,
            props: {
                title: '🦊 Hello Svelte!'
            }
        }) : {};


    const glAppId = 'gl-app';
    const glAppElement = document.getElementById(glAppId);
    const glApp = (
        glAppElement !== null &&
        (glAppElement.constructor.name === 'HTMLElement' ||
            glAppElement.constructor.name === 'HTMLDivElement')
        ) ?
        new GLApp({
            target: glAppElement,
            props: {
                title: '🦊 Hello SvelteGL!'
            }
        }) : {};


    const vizrAppId = 'vizr-app';
    const vizrAppElement = document.getElementById(vizrAppId);
    const vizrApp = (
        vizrAppElement !== null &&
        (vizrAppElement.constructor.name === 'HTMLElement' ||
            vizrAppElement.constructor.name === 'HTMLDivElement')
        ) ?
        new VizRApp({
            target: vizrAppElement,
            props: {
                title: 'Visualizing R Data with Sveltr'
            }
        }) : {};

    exports.default = main;
    exports.glApp = glApp;
    exports.techApp = techApp;
    exports.vizrApp = vizrApp;

    return exports;

}({}));
//# sourceMappingURL=main.js.map
