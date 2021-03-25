import { writable } from 'svelte/store';

export const address = writable(null);
export const privateKey = writable(null);
export const token = writable(null);
export const tokens = writable([]);