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
// set default validity period of data grants to be 7 days
const defaultdatagrantvalididityperiod = 7

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
    return true

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

function str2base64(str) {
    return btoa(str);
}
function base642str(base64) {
    return atob(base64);
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
    const prompt_id = message.prompt_id;
    console.debug("prompt_id: " + prompt_id);

    // check if this prompt is on the page already
    console.log("is already on page? " + isOnPageAlready(message));
    if (!(isOnPageAlready(message))) {

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
                node_root.setAttribute("prompt_id", prompt_id);
                node_root.setAttribute("minimized", 'visible');

                var note_template = safeParseInnerHTML(html, 'div');
                node_root.appendChild(note_template);
                console.log(node_root);


                 // move values from the message into the form
                try {
                    // Locate the form element root node
                    var noteForm = node_root.querySelector('form[name="note_form"]');
                  
                    attach_value_from_message(noteForm, "original_message" , message.original_message);
                    attach_value_from_message(noteForm, "platformtoken" , message.platformtoken);
                    attach_value_from_message(noteForm, "tabId" , message.tabId);
                    attach_value_from_message(noteForm, "frameId" , message.frameId);
                    attach_value_from_message(noteForm, "prompt_id" , message.prompt_id);
                    attach_value_from_message(noteForm, "redir_target" , message.redir_target);
                    const textarea = node_root.querySelector('textarea[name="message_display_text"]');
                    // base64 decode the message text only at the last possible step
                    // NB include some security checks here
                    textarea.value = base642str(selection_text);

                    const textarea2 = node_root.querySelector('textarea[name="request_details"]');
                    // NB include some security checks here
                    textarea2.value = JSON.stringify(message.payload.requests);

                } catch (e) {
                    console.error(e);

                }

                let existingNode = document.getElementById(prompt_id);
                if (!existingNode) {
                    document.body.appendChild(node_root);
                } else {
                    console.log("node already exists");
                }
                // attach event listeners to buttons and icons
                //attachEventlistenersToYellowStickynote(node_root);

                const myaccept_note = (event) => {
                    console.log("event.stopPropagation();");
                    accept_request(event, prompt_id);
                    event.stopPropagation();
                };

                const myclose_note = (event) => {
                    console.log("event.stopPropagation();");
                    close_note(event);
                    event.stopPropagation();
                };

                // for save buttons/icons
                var allGoTo3 = node_root.querySelectorAll('[js_action="agree_terms"]');
                for (var i = 0; i < allGoTo3.length; i++) {
                    allGoTo3[i].removeEventListener("click", myaccept_note);
                    allGoTo3[i].addEventListener("click", myaccept_note);
                }

                // for close buttons/icons
                var allGoTo4 = node_root.querySelectorAll('[js_action="close_note"]');
                for (var i = 0; i < allGoTo4.length; i++) {
                    allGoTo4[i].removeEventListener("click", myclose_note);
                    allGoTo4[i].addEventListener("click", myclose_note);
                }

                resolve(node_root);

            })
            .catch((error) => {
                console.warn('Something went wrong.', error);
            });
        });
    } else {
        console.log("note already exists");
    }

    function attach_value_from_message(noteForm, name, value) {
        const c = noteForm.querySelector('input[type="hidden"][name="'+name+'"]');
        const textNode3 = document.createTextNode(value);

        // Check if the parent node has any children
        try {
            if (c.firstChild) {
                // If it does, insert the text node before the first child
                c.insertBefore(textNode3, c.firstChild);
            } else {
                // Otherwise, just append the text node to the parent node
                c.appendChild(textNode3);
            }
        } catch (e) {
            console.log(e);
            // Otherwise, just append the text node to the parent node
            c.appendChild(textNode3);
        }
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

function accept_request(event, prompt_id) {
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

        var tabId = note_root_node.querySelectorAll('input[name="tabId"]')[0].textContent.trim();
        console.debug("tabId: " + tabId);
        var frameId = note_root_node.querySelectorAll('input[name="frameId"]')[0].textContent.trim();
        console.debug("frameId: " + frameId);
var redir_target = note_root_node.querySelectorAll('input[name="redir_target"]')[0].textContent.trim();

        var days = defaultdatagrantvalididityperiod;
        console.debug("days: " + note_root_node.querySelectorAll('input[name="days"]')[0].value.trim());
        console.debug((note_root_node.querySelectorAll('input[name="days"]')[0].textContent.trim() != ""));
        console.debug(/[0-9][0-9]*/.test(note_root_node.querySelectorAll('input[name="days"]')[0].value.trim()));
        if (note_root_node.querySelectorAll('input[name="days"]')[0].value.trim()) {
            days = note_root_node.querySelectorAll('input[name="days"]')[0].value.trim();
        }

        console.debug("days: " + days);

        // by default hours is set to zero
        var hours = 0;

        if (note_root_node.querySelectorAll('input[name="hours"]')[0].value.trim()) {
            days = note_root_node.querySelectorAll('input[name="hours"]')[0].value.trim();
        }

        console.debug("hours: " + hours);

        // collect remarks from the user - not implemented
        var notes = "";

        // collect dates from the user form - not implemented
        var notbefore = "";
        var notafter = "";

        let currentDate = new Date();
        notbefore = currentDate.toISOString();
        // Adding days
        currentDate.setDate(currentDate.getDate() + days);

        // Adding hours
        currentDate.setHours(currentDate.getHours() + hours);
        notafter = currentDate.toISOString();

        var message = {
            type: "accept_single_datarequest",
            agreement_details: {
                original_message: original_message,
                platformtoken: platformtoken,
                notes: notes,
                prompt_id: prompt_id,
                tabId: tabId,
                frameId: frameId,
                redir_target: redir_target,
                restrictions: {
                    notbefore: notbefore,
                    notafter: notafter,
                    hours: hours,
                    days: days
                }
            }
        };
        console.debug(message);
        // send save request back to background
        chrome.runtime.sendMessage(
            message, function (response) {
            console.debug("message sent to backgroup.js with response: " + JSON.stringify(response));
            // finally, call "close" on the note
           
            try {

                console.debug("closing...");
                console.debug(note_root_node);
                note_root_node.remove();

            } catch (e) {
                console.error(e);
            }
           
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
