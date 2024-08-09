
chrome.tabs.create({ 'url':"chrome://newtab"})
// chrome.runtime.sendMessage({ 
//     message: "get_name"
// }, response => {
//     if (response.message === 'success') {
//         document.querySelector('div').innerHTML = `Hello ${response.payload}`;
//     }
// });
// //Make the DIV element draggagle:
// dragElement(document.getElementById("mydiv"));

//below code is to open extion in new tab on link click
// const link =  document.getElementById('myLink');

// link.addEventListener('click', function(event) {
//   event.preventDefault(); // Prevent the default behavior of the link (e.g., navigating to a new page)
//   chrome.tabs.create({ 'url':"chrome://newtab"})
// });

// function dragElement(elmnt) {
//   var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
//   if (document.getElementById(elmnt.id + "header")) {
//     /* if present, the header is where you move the DIV from:*/
//     document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
//   } else {
//     /* otherwise, move the DIV from anywhere inside the DIV:*/
//     elmnt.onmousedown = dragMouseDown;
//   }

//   function dragMouseDown(e) {
//     e = e || window.event;
//     e.preventDefault();
//     // get the mouse cursor position at startup:
//     pos3 = e.clientX;
//     pos4 = e.clientY;
//     document.onmouseup = closeDragElement;
//     // call a function whenever the cursor moves:
//     document.onmousemove = elementDrag;
//   }

//   function elementDrag(e) {
//     e = e || window.event;
//     e.preventDefault();
//     // calculate the new cursor position:
//     pos1 = pos3 - e.clientX;
//     pos2 = pos4 - e.clientY;
//     pos3 = e.clientX;
//     pos4 = e.clientY;
//     // set the element's new position:
//     elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
//     elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
//   }

//   function closeDragElement() {
//     /* stop moving when mouse button is released:*/
//     document.onmouseup = null;
//     document.onmousemove = null;
//   }
// }