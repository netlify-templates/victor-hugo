import App from './App.svelte';
import TestApp from './TestApp.svelte';

const appId = "svelte-app";
const appElement = document.getElementById(appId);
export default ( // Check if app id exists in DOM
    appElement !== null &&
    (appElement.constructor.name === 'HTMLElement' ||
        appElement.constructor.name === 'HTMLDivElement')
    ) ?
    new App({
        target: appElement,
        props: {
            greeting: `Hooray 🎉 - you've built this with
    <a href="https://github.com/Real-Currents/sveltr" target="_blank">Sveltr</a> +
    <a href="https://svelte.dev/tutorial/basics" target="_blank">Svelte</a>!`
        }
    }) : {};


const testAppId = "test-app";
const testAppElement = document.getElementById(testAppId);
export const testApp = (
      testAppElement !== null &&
      (testAppElement.constructor.name === 'HTMLElement' ||
        testAppElement.constructor.name === 'HTMLDivElement')
    ) ?
      new TestApp({
          target: testAppElement,
          props: {
              title: "🦊 Hello Svelte!"
          }
      }) : {};
