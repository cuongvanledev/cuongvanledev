(this["webpackJsonpreact-stackoverflow-flair"]=this["webpackJsonpreact-stackoverflow-flair"]||[]).push([[0],{14:function(e,a,t){e.exports=t(39)},19:function(e,a,t){},20:function(e,a,t){},38:function(e,a,t){},39:function(e,a,t){"use strict";t.r(a);var o=t(0),n=t.n(o),c=t(11),r=t.n(c),s=(t(19),t(20),t(13)),l=t(12),i=t.n(l);t(38);function m(e){var a=Object(o.useState)(),t=Object(s.a)(a,2),c=t[0],r=t[1];return Object(o.useEffect)((function(){i.a.get("https://api.stackexchange.com/2.2/users/".concat(e.userId,"?site=stackoverflow")).then((function(e){r(e.data.items[0])}))}),[e.userId]),c&&c.user_id?n.a.createElement("div",{className:"stackoverflow-profile"},n.a.createElement("div",{className:"stackoverflow-icon"}),n.a.createElement("img",{alt:"Loading...",className:"profile-photo",src:c.profile_image}),n.a.createElement("div",{className:"top"},n.a.createElement("div",{className:"profile-info"},n.a.createElement("div",{className:"profile-name"},c.display_name),n.a.createElement("div",{className:"profile-location"},c.location),n.a.createElement("div",{className:"profile-stats-repo"},c.reputation))),n.a.createElement("div",{className:"bottom"},n.a.createElement("div",{className:"profile-stats-badge-gold"},c.badge_counts.gold),n.a.createElement("div",{className:"profile-stats-badge-silver"},c.badge_counts.silver),n.a.createElement("div",{className:"profile-stats-badge-bronze"},c.badge_counts.bronze))):n.a.createElement("div",{className:"stackoverflow-profile-loading"},n.a.createElement("span",null,"Loading..."))}var d=function(){return n.a.createElement(m,{userId:"11083892"})};Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));r.a.render(n.a.createElement(n.a.StrictMode,null,n.a.createElement(d,null)),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()})).catch((function(e){console.error(e.message)}))}},[[14,1,2]]]);
//# sourceMappingURL=main.758f8f9c.chunk.js.map