
console.log("Cybotix:  content-script.js loaded");

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
chrome.runtime.sendMessage({type: "CybotixPlatformAccessRequest", payload: "Hello from content script!"});


var dataFromPage = event.detail;
    console.log(dataFromPage);
    //internalStorage[dataFromPage.key] = dataFromPage.value
});



// store the token in the local storage
const newDiv = document.createElement("div");
  
// Set the inner HTML of the div
newDiv.innerHTML = "<h1>Hello, this is inserted by the extension!</h1>";
const rootElement = document.documentElement;
console.log(rootElement);
rootElement.insertBefore(newDiv, rootElement.firstChild);
//document.body.insertBefore(newDiv, document.body.firstChild);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check the type of message (you can define your own types)
    console.log(JSON.stringify(message));
    console.log(message.type);
    
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
  