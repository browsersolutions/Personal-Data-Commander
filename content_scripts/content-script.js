
console.log("Cybotix:  content-script.js loaded");
const user_prompt_data_request_sharedsecret="123456";

// an object used to store things passed in from the API
internalStorage = {};

// listen for myStoreEvent fired from the page with key/value pair data
document.addEventListener('myCybotixPlatformAccessRequest', function(event) {
    console.log("myCybotixPlatformAccessRequest received");
    console.debug("myCybotixPlatformAccessRequest received");

    // Storing the key-value pair
    const key ="key";
    const value = "value3";
chrome.storage.local.set({ [key]: "value4" }, () => {
    console.log(`Stored ${key} with value ${value}`);
    chrome.storage.local.get([key], (result) => {
        console.log(`Read back ${key} with value ${result[key]}`);
      });
  });

    //chrome.storage.local.set({A:"b"});
    // Send a message to the Service Worker
//chrome.runtime.sendMessage({type: "CybotixPlatformAccessRequest", payload: "Hello from content script!"});


var dataFromPage = event.detail;
    console.log(dataFromPage);
    //internalStorage[dataFromPage.key] = dataFromPage.value
});



// store the token in the local storage
const newDiv = document.createElement("div");
  

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check the type of message (you can define your own types)
    //console.log(JSON.stringify(message));
    //console.log(message.type);
    
    if (message.type === 'platformtoken') {

        // read token from the local storage
// https://developer.chrome.com/docs/extensions/migrating/to-service-workers/
 //       const { name } = await chrome.storage.local.get(["name"]);
  //      console.log(name)
  //chrome.tabs.sendMessage(tab.id, { name });


      console.log('Received platfromtoken from background:', message.token);

//The content script runs the token validation to the Cybotix central services. This is to
// be able to reuse any authenticated session the browser has with the Cybotix central services.

// now that we have a valid platofrom token , we can accept data access requests from the remote website.


  
  chrome.storage.local.set({ cybotixplatformtoken: message.token }).then(() => {
    console.log("Value is set");
     // Optionally, send a response back to the background script
     sendResponse({type: 'acknowledgment', payload: 'token received'});
  });

        //sessionStorage.setItem('CybotixPlatformToken', message.token);

     
    
    
}


  });
  

  function accept_request(event, uuid) {
    console.debug("accept_request ");
    console.debug(event);
    console.debug(uuid);
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
      
        var original_request = root_node.querySelectorAll('input[name="original_request"]')[0].textContent.trim();
        console.debug("original_request: " + original_request);

        // collect remarks from the user
var notes = "";

var message = {
    type: "accept_single_datarequest",
    agreement_details: {
        original_request: JSON.parse(original_request),
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