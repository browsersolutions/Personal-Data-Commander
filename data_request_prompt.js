console.debug("Cybotix:  data_request_prompt.js loaded");


var user_prompt_data_request_acceptance_sharedsecret = "1235u6htetb5tb354b35b456";

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check the type of message (you can define your own types)
    console.log(JSON.stringify(message));
    console.log(message.type);
    
   if(message.type === 'datarequest'){
console.log("datarequest received");
console.log(message);
// screenout other message
console.debug(message.secret);


if (message.secret === user_prompt_data_request_acceptance_sharedsecret){
// ok , the shared secret is ok (very, very weak security though it may be. )
// proceed to create the note object on the page
    create_note(message);

}
    
}


  });

  function textToBase64(text){
    //return btoa(unescape(encodeURIComponent(text)));
    return bytesToBase64(new TextEncoder().encode(text));
  }

  function base64ToText(base64){ 
    //return decodeURIComponent(escape(atob(base64)));
const b = new TextDecoder().decode(base64ToBytes(base64));
return b;
    }


  
/* creates DOM object of the message note */
function create_note(message) {
console.debug("# create_note start");
        const uuid = message.prompt_id;
    const selection_text = message.payload.messagetext;
    console.log("selection_text: " + selection_text);
    console.debug("# create_new_stickynote_2 start promise");
    return new Promise(function (resolve, reject) {
        console.debug("# create_new_stickynote_2 promise started");



        // create the note object data with suitable initial values for some fields
        var note_object_data = {
            "selection_text": selection_text,
            "message_display_text": selection_text,
            "enabled": true
        }
   

        fetch(chrome.runtime.getURL('promptnotetemplate.html'))
        .then((response) => response.text())
        .then((html) => {
          // console.debug("html: " + html);
            // Create a new HTML element to hold the content

            

            // render template into a complete note object (with values)

            var node_root = document.createElement('div');

            node_root.setAttribute("type", 'datarequestnote');
            node_root.setAttribute("id", uuid);
            node_root.setAttribute("minimized", 'visible');

            var note_template = safeParseInnerHTML(html, 'div');
             node_root.appendChild(note_template);
         
            try {
                // Locate the form element
                var noteForm = node_root.querySelector('form[name="note_form"]');
              const a =  noteForm.querySelector('input[type="hidden"][name="original_message"]');
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

const b =  noteForm.querySelector('input[type="hidden"][name="platformtoken"]');
const textNode2 = document.createTextNode(message.platformtoken);
 
// Check if the parent node has any children
if (b.firstChild) {
    // If it does, insert the text node before the first child
    b.insertBefore(textNode2, b.firstChild);
} else {
    // Otherwise, just append the text node to the parent node
    b.appendChild(textNode2);
}


                const textarea = node_root.querySelector('textarea[name="message_display_text"]');
// base64 decode the message text only at the last possible step
// NB include some security checks here
                textarea.value = base64ToText(selection_text);

            
            } catch (e) {
                console.error(e);

            }

            let existingNode = document.getElementById(uuid);
            if (!existingNode) {
            document.body.appendChild(node_root);
            }else{
                console.log("node already exists");
            }
            // attach event listeners to buttons and icons
            //attachEventlistenersToYellowStickynote(node_root);

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
}
 


function accept_request(event, uuid) {
    console.debug("accept_request ");
    console.debug(event);
   
    console.debug(event.target);

    let root_node = findAncestorByAttributeValue(event.target, 'type', 'datarequestnote');
    console.debug(root_node);
    if (root_node) {
        console.log('Found node:', root_node);
    } else {
        console.log('Node with the specified attribute value was not found.');
    }
console.debug(root_node);
    try {
       
        // assemble the request (including possible modification from the user)
        var selection_text = root_node.querySelectorAll('input[name="selection_text"]')[0].textContent.trim();
        console.debug("selection_text: " + selection_text);
      
        var original_message = root_node.querySelectorAll('input[name="original_message"]')[0].textContent.trim();
        console.debug("original_message: " + original_message);

        var platformtoken = root_node.querySelectorAll('input[name="platformtoken"]')[0].textContent.trim();
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
               notbefore:"2021-12-31 23:59:59",
        notafter:"2023-12-31 23:59:59"
    }
};
console.debug(message);
        // send save request back to background
        chrome.runtime.sendMessage(
           message
        , function (response) {
            console.debug("message sent to backgroup.js with response: " + JSON.stringify(response));
            // finally, call "close" on the note
            //  try{
             
                 try {

                        console.debug("closing...");
                        console.debug(root_node);
                        root_node.remove();
            
                } catch (e) {
                    console.error(e);
                }
            //  }catch(g){console.debug(g);}

        });
       
        
    } catch (e) {
        console.error(e);
    }
}