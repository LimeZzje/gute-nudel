// The shared state: S (the save, see data.js freshState), ui (screen state, never saved) and A (the action table).
// No imports on purpose: every module can read these before anything else runs.
export let S = null;                                   // the state (see data.js freshState)
export const setS = v => { S = v; };           // modules cannot assign an imported binding, so the few places that replace the whole state call this
export const ui = { tab: 'home', htab: 'heute', qtab: 'haushalt', lastQ: {}, sub: null, picks: new Set(), showAllQuests: false, rsize: 'klein', ridea: null, openPrep: null, rx: { size: null, en: null, cur: null, skip: [] } };
export const A = {};                            // the action table: data-a="x" → A.x(el, e); actions.js and the feature modules fill it
