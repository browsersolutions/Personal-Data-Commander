/**
 * @fileoverview
 * This file contains the code for the data request prompt. It presents a prompt to the user
 *
 * The functions inside this file are called from the background script. The call must include a "sharedscret" to prevent malicious code from calling the functions.
 * The secretes is not really secret as it is plainly readable in both this script and in the background service worker script. It is however, suffiecient to forestall automated attacks.
 * The secret is hardcoded but changed with every release of the code. Later versions will have a more sophisticated security mechanism. (
 * is changed every time the extension is loaded.)
 *
 * The promt is presented in the form of a small "note" (a DOM object inserted into the page) in the lower part of the active tab.
 * This note contains a form with a text area where the user can enter remarks about the request.
 *
 * The note also contains a button that the user can click to accept the request. At which time the note object is closed.
 */

//const e = require("express");

console.debug("Cybotix: data_request_prompt.js loaded");

var user_prompt_data_request_acceptance_sharedsecret = "1235u6htetb5tb354b35b456";

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check the type of message (you can define your own types)
    console.log(JSON.stringify(message));
    console.log(message.type);

    if (message.type === 'datarequest') {
        console.log("datarequest received");
        console.log(message);
        // screenout other message
        console.debug(message.secret);

        if (message.secret === user_prompt_data_request_acceptance_sharedsecret) {
            // ok , the shared secret is ok (very, very weak security though it may be. )
            // proceed to create the note object on the page
            create_note(message);

        }

    }

});

function textToBase64(text) {
    //return btoa(unescape(encodeURIComponent(text)));
    return bytesToBase64(new TextEncoder().encode(text));
}

function base64ToText(base64) {
    //return decodeURIComponent(escape(atob(base64)));
    const b = new TextDecoder().decode(base64ToBytes(base64));
    return b;
}

function isOnPageAlready(message) {
    //console.log(idExists(message.prompt_id));
    try {
        if (idExists(message.prompt_id)) {
            return true;
        } else {
            // cary our a search on the DOM to locate an identical, message, if any
            const bb = document.querySelectorAll('input[type="hidden"][name="requests"]');
            console.log("message note found count: " + bb.length);
            //return false;
            if (bb.length > 0) {
                return true;

            } else {
            return false;
            }
        }
    } catch (e) {
        console.error(e);
        return false;
    }

}


/* creates DOM object of the message note */
function create_note(message) {
    console.debug("# create_note start");
    console.debug("message: " + JSON.stringify(message));   
    const uuid = message.prompt_id;
console.debug("prompt_id: " + uuid);   

// check if this prompt is on the page already
console.log("is already on page? " + isOnPageAlready(message) );
if (!(isOnPageAlready(message))){


    const selection_text = message.payload.messagetext;
    console.log("selection_text: " + selection_text);
    console.debug("# create note start promise");
    return new Promise(function (resolve, reject) {
        console.debug("# create note promise started");

        // create the note object data with suitable initial values for some fields
        var note_object_data = {
            "selection_text": selection_text,
            "message_display_text": selection_text,
            "enabled": true
        }


        // load the note template, a html file store with the plugin itself. (NB: this is not a user editable file)
        fetch(chrome.runtime.getURL('prompt_note_template.html'))
        .then((response) => response.text())
        .then((html) => {
             //console.debug("html: " + html);
            // Create a new HTML element to hold the content


            // render template into a complete note object (with values)

            var node_root = document.createElement('div');

            node_root.setAttribute("type", 'datarequestnote');
            node_root.setAttribute("id", uuid);
            node_root.setAttribute("minimized", 'visible');

            var note_template = safeParseInnerHTML(html, 'div');
            node_root.appendChild(note_template);
            console.log(node_root);

            try {
                // Locate the form element root node
                var noteForm = node_root.querySelector('form[name="note_form"]');
                const a = noteForm.querySelector('input[type="hidden"][name="original_message"]');
                console.log(a);
                //.replaceChildren(document.createTextNode(JSON.stringify(message.complete_req)));
                const textNode1 = document.createTextNode(message.original_message);

                // Check if the parent node has any children
                if (a.firstChild) {
                    // If it does, insert the text node before the first child
                    a.insertBefore(textNode1, a.firstChild);
                } else {
                    // Otherwise, just append the text node to the parent node
                    a.appendChild(textNode1);
                }

                const b = noteForm.querySelector('input[type="hidden"][name="platformtoken"]');
                const textNode2 = document.createTextNode(message.platformtoken);

                // Check if the parent node has any children
                if (b.firstChild) {
                    // If it does, insert the text node before the first child
                    b.insertBefore(textNode2, b.firstChild);
                } else {
                    // Otherwise, just append the text node to the parent node
                    b.appendChild(textNode2);
                }

                const c = noteForm.querySelector('input[type="hidden"][name="requests"]');
                const textNode3 = document.createTextNode(message.platformtoken);

                // Check if the parent node has any children
                try{
                if (c.firstChild) {
                    // If it does, insert the text node before the first child
                    c.insertBefore(textNode3, c.firstChild);
                } else {
                    // Otherwise, just append the text node to the parent node
                    c.appendChild(textNode3);
                }
            }catch(e){
                console.log(e);
                    // Otherwise, just append the text node to the parent node
                    c.appendChild(textNode3);
                
            }
                const textarea = node_root.querySelector('textarea[name="message_display_text"]');
                // base64 decode the message text only at the last possible step
                // NB include some security checks here
                textarea.value = base64ToText(selection_text);

                const textarea2 = node_root.querySelector('textarea[name="request_details"]');
                // NB include some security checks here
                textarea2.value =JSON.stringify(message.payload.requests);


                


            } catch (e) {
                console.error(e);

            }

            let existingNode = document.getElementById(uuid);
            if (!existingNode) {
                document.body.appendChild(node_root);
            } else {
                console.log("node already exists");
            }
            // attach event listeners to buttons and icons
            attachEventlistenersToYellowStickynote(node_root);

            const myaccept_note = (event) => {
                console.log("event.stopPropagation();");
                accept_request(event, uuid);
                event.stopPropagation();

            };

            // for save buttons/icons
            var allGoTo3 = node_root.querySelectorAll('[js_action="agree_terms"]');
            for (var i = 0; i < allGoTo3.length; i++) {
                allGoTo3[i].removeEventListener("click", myaccept_note);
                allGoTo3[i].addEventListener("click", myaccept_note);
            }

            resolve(node_root);

        })
        .catch((error) => {
            console.warn('Something went wrong.', error);
        });
    });
}else{
    console.log("note already exists");
}
}





function close_note(event) {
    console.debug("# close note");
    // call to kill the yellow note window

    // loop upwards from the target nodes to locate the root node for the sticky note
    try {
    
    let note_root_node = findAncestorByAttributeValue(event.target, 'type', 'datarequestnote');
 

    
            console.debug("closing...");
            console.debug(note_root_node);
            note_root_node.remove();
    
    } catch (e) {
        console.error(e);
    }

}
function safeParseInnerHTML(rawHTML, targetElementName) {

    // list of acceptable html tags


    // list of unacceptable html tags
    const unaccep = ["script"];

    unaccep.forEach(function (item, index) {
   //     console.log(item);
    });

    const container = document.createElement(targetElementName);
    // Populate it with the raw HTML content
    container.innerHTML = rawHTML;

    return container;
}


function idExists(id) {
    return document.getElementById(id) !== null;
}


function accept_request(event, uuid) {
    console.debug("accept_request ");
    console.debug(event);

    console.debug(event.target);

    let note_root_node = findAncestorByAttributeValue(event.target, 'type', 'datarequestnote');
    console.debug(note_root_node);
    if (note_root_node) {
        console.log('Found node:', note_root_node);
    } else {
        console.log('Node with the specified attribute value was not found.');
    }
    console.debug(note_root_node);
    try {

        // assemble the request (including possible modification from the user)
        var selection_text = note_root_node.querySelectorAll('input[name="selection_text"]')[0].textContent.trim();
        console.debug("selection_text: " + selection_text);

        var original_message = note_root_node.querySelectorAll('input[name="original_message"]')[0].textContent.trim();
        console.debug("original_message: " + original_message);

        var platformtoken = note_root_node.querySelectorAll('input[name="platformtoken"]')[0].textContent.trim();
        console.debug("platformtoken: " + platformtoken);

        // collect remarks from the user
        var notes = "";

        // collect dates from the user
        var notbefore = "";
        var notafter = "";
        //

        var message = {
            type: "accept_single_datarequest",
            agreement_details: {
                original_message: original_message,
                platformtoken: platformtoken,
                notes: notes,
                uuid: uuid,
                notbefore: "2021-12-31 23:59:59",
                notafter: "2023-12-31 23:59:59"
            }
        };
        console.debug(message);
        // send save request back to background
        chrome.runtime.sendMessage(
            message, function (response) {
            console.debug("message sent to backgroup.js with response: " + JSON.stringify(response));
            // finally, call "close" on the note
            //  try{

            try {

                console.debug("closing...");
                console.debug(note_root_node);
                note_root_node.remove();

            } catch (e) {
                console.error(e);
            }
            //  }catch(g){console.debug(g);}

        });

    } catch (e) {
        console.error(e);
    }
}


function findAncestorByAttributeValue(startNode, attributeName, targetValue) {
    let currentNode = startNode;

    while (currentNode) {
        if (currentNode.getAttribute && currentNode.getAttribute(attributeName) === targetValue) {
            return currentNode; // Found the node with the matching attribute value
        }
        currentNode = currentNode.parentNode; // Move up to the parent node
    }

    return null; // No matching node was found
}