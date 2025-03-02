// Polyfill for MultiversX SDK
if (typeof global === 'undefined') {
    window.global = window;
}

// Buffer polyfill
import { Buffer } from 'buffer';
window.Buffer = Buffer;
