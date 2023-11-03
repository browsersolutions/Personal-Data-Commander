// send this script to iframes to cause them to redirect
// part of the token-base communication.

//const { type } = require("os");

// this script takes some parameters from the service worker and

console.log("send-data-access-token.js loaded");
console.log("window.location.href: " + window.location.href);
console.log("window.location.search: " + window.location.search);



// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    /**
     * The background script calls this function after the data access token has been created. 
     * The background script passes the data access token to this script. Along with the platformtoken and the data request itself.
     * 
     * The browser maintains it's own history of "clicks" 
     * The data request , if present, and the request contained in the data grant/access token contains information
     *  about which URL the requestor is trying to access.  Apply these against the browser history and pass the resulting data back to the remote website.
     * 
     * 
     * 
     */
    console.log(JSON.stringify(message));
    console.log(message.type);
    document.body.style.backgroundColor = 'yellow';

    
    const X_HTTP_CYBOTIX_PLATFORM_TOKEN =  message.platformtoken;
    const X_HTTP_CYBOTIX_DATA_ACCESSTOKEN =  message.dataaccesstoken;
    const X_HTTP_CYBOTIX_DATA_REQUEST =  message.datarequest;
    console.log(X_HTTP_CYBOTIX_PLATFORM_TOKEN);
    console.log(X_HTTP_CYBOTIX_DATA_ACCESSTOKEN);
    console.log(X_HTTP_CYBOTIX_DATA_REQUEST);


    fetch(message.newurl, {
      method: 'POST',
      headers: {
        "Content-type": 'application/json',
         X_HTTP_CYBOTIX_PLATFORM_TOKEN: X_HTTP_CYBOTIX_PLATFORM_TOKEN,
         X_HTTP_CYBOTIX_DATA_ACCESSTOKEN:X_HTTP_CYBOTIX_DATA_ACCESSTOKEN, 
         X_HTTP_CYBOTIX_DATA_REQUEST: X_HTTP_CYBOTIX_DATA_REQUEST
      },
      body: JSON.stringify(message.history_data),
  }).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(data => {
        // Load the fetched content into the iframe
        document.open();
        document.write(data);
        document.close();
    })
    .catch(error => {
        console.error('Fetch error:', error);
    });


    if (message.type === 'redirectgreeting') {

      
        // read token from the local storage
// https://developer.chrome.com/docs/extensions/migrating/to-service-workers/
 //       const { name } = await chrome.storage.local.get(["name"]);
  //      console.log(name)
  //chrome.tabs.sendMessage(tab.id, { name });


      console.log('Received platfromtoken from background:');

      var obj = JSON.parse('{"'  +message.headername +'":"' +message.headervalue + '"}');
      console.log('{"'  +message.headername +'":"' +message.headervalue + '"}');
      
console.log(obj);

        //sessionStorage.setItem('CybotixPlatformToken', message.token);
        fetch(message.newurl, {
            method: "GET", // *GET, POST, PUT, DELETE, etc.
            headers: obj,
          }).then();
     
    }
  });

  function searchHistory(options) {
    return new Promise((resolve, reject) => {
        chrome.history.search(options, (results) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve(results);
            }
        });
    });
}
