import App from './apps/App.svelte';
import TestApp from './apps/TestApp.svelte';

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
            greeting:
`Hooray 🎉 - you've built this with <a href="https://github.com/dancingfrog/sveltr" target="_blank">Sveltr</a>!`
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
