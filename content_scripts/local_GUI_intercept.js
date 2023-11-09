/**
 * This script intercept cliks to links that should be redirected to /pages/ hosted on the plugin
 * 
 */

console.log("Cybotix: local_GUI_intercept.js loaded");

const accountTargetURL =  new RegExp(/account/);
if ( accountTargetURL.test(window.location.href )) {
    console.log("redirect this link to plugin")
  // Notify the background script to redirect
  chrome.runtime.sendMessage({type: "local_pages_intercept", redirect: true, uri: "/pages/account.html"});
}

const targetURL =  new RegExp(/view_click_stream/);
if ( targetURL.test(window.location.href )) {
    console.log("redirect this link to plugin")
  // Notify the background script to redirect
  chrome.runtime.sendMessage({type: "local_pages_intercept", redirect: true, uri: "/pages/view_click_stream.html"});
}

