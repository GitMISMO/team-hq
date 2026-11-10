/* Team HQ design system layer (November 7, 2026)
   Rules every page shares, applied last so they win:
   - muted text (dates, labels, workstreams) dark enough to read: 4.5 to 1 or better on every light surface
   - initials on colored avatars readable (a soft shade over the color, under the letters)
   - one visible focus ring for anyone using the keyboard
   - motion turned down for people who ask their device for less motion */
(function(){
'use strict';
if(window.__hqDesign && window.__hqDesign.destroy) window.__hqDesign.destroy();
const css=document.createElement('style'); css.id='hq-design';
css.textContent=`
@media (prefers-color-scheme: light){ :root:not([data-theme="dark"]){ --ink-3:#56708a } }
:root[data-theme="light"]{ --ink-3:#56708a }
.av{ box-shadow: inset 0 0 0 40px rgba(0,0,0,.3) }
.av+.av{ box-shadow: inset 0 0 0 40px rgba(0,0,0,.3), 0 0 0 2px var(--surface) }
:where(button, a, [role="button"], input, select, textarea, summary, [tabindex]):focus-visible{ outline:2px solid #74bfeb !important; outline-offset:2px !important }
@media (prefers-reduced-motion: reduce){
  *, *::before, *::after{ animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; scroll-behavior:auto !important }
}`;
document.head.appendChild(css);
window.__hqDesign={ version:'1.0', destroy(){ css.remove(); } };
})();
