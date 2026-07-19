import styles from './styles.css?inline';
import { App, initialize } from './App';

// Injected as a <style> tag by JS rather than left as a linked stylesheet,
// since Homebridge UI's custom-UI loader doesn't reliably apply an external
// <link rel="stylesheet"> here (the CSS silently failed to load in
// production while the JS-rendered markup worked fine).
const styleTag = document.createElement('style');
styleTag.textContent = styles;
document.head.appendChild(styleTag);

document.body.innerHTML = App();

initialize();