console.debug("Cybotix:  data_request_prmopt.js loaded");


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
console.debug();

if (message.secret === user_prompt_data_request_acceptance_sharedsecret){

    create_note(message);

}
    
}


  });



  
/* creates DOM object of the stick note */
function create_note(message) {

    const uuid = message.prompt_id;
    const selection_text = message.complete_req.messagetext;
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



              const a =  noteForm.querySelector('input[type="hidden"][name="original_request"]');
              console.log(a);
              //.replaceChildren(document.createTextNode(JSON.stringify(message.complete_req)));
                const textNode = document.createTextNode(JSON.stringify(message.complete_req));

// Check if the parent node has any children
if (a.firstChild) {
    // If it does, insert the text node before the first child
    a.insertBefore(textNode, a.firstChild);
} else {
    // Otherwise, just append the text node to the parent node
    a.appendChild(textNode);
}

                const textarea = node_root.querySelector('textarea[name="message_display_text"]');

                textarea.value = selection_text;

            
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
            var allGoTo3 = node_root.querySelectorAll('[js_action="save_acceptance"]');
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
 