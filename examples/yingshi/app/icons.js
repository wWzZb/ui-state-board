const icons = {
 user:'<circle cx="12" cy="8" r="3.3"/><path d="M5 20c0-8 14-8 14 0"/>',
 image:'<rect x="3" y="3.8" width="18" height="16.4" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5 18 5-5 3 2 3-4 4 5"/>',
 editor:'<path d="m5 16 10-10 3 3-10 10-4 1zM14 7l3 3M17 4l3 3M13 20h7"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 add:'<path d="M12 5v14M5 12h14"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>', back:'<path d="m14 6-6 6 6 6"/>', down:'<path d="M12 3v11m-4-4 4 4 4-4M5 16v3h14v-3"/>',
 spark:'<path d="m11 3 2.4 6.6L20 12l-6.6 2.4L11 21l-2.4-6.6L2 12l6.6-2.4zM19 2v4m-2-2h4"/>',
 ticket:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M15 8v2m0 3v2"/>',
 check:'<path d="m5 12 4 4L19 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6h4"/>',
 warn:'<path d="m12 3 9 17H3zM12 9v4m0 3v.2"/>',retry:'<path d="M4 10a8 8 0 1 1 0 5M4 4v6h6"/>',
 shield:'<path d="M12 2 4 5v6c0 5 4 8 8 11 4-3 8-6 8-11V5zM12 8v5m0 3v.3"/>'
};
const ic = (key, id) => {
 let part = 0;
 const contents = icons[key].replace(/<([a-z][a-z0-9-]*)\b/gi, (tag, name) => `${tag} id="${id}-${name}-${++part}"`);
 return `<svg id="${id}" viewBox="0 0 24 24" aria-hidden="true">${contents}</svg>`;
};
const mark = id => `<span id="${id}" class="mark"><i id="${id}-first"></i><i id="${id}-second"></i></span>`;
