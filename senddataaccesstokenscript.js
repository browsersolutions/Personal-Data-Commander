// send this script to iframes to cause them to redirect
// part of the token-base communication.

// this script takes some parameters from the service worker and

console.log("send-data-access-token.js loaded");
console.log("window.location.href: " + window.location.href);
console.log("window.location.search: " + window.location.search);



// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check the type of message (you can define your own types)
    console.log(JSON.stringify(message));
    console.log(message.type);
    document.body.style.backgroundColor = 'yellow';

    fetch(message.newurl, {
      method: 'GET',
      headers: {
          'X_HTTP_CYBOTIX_DATA_ACCESSTOKEN': message.dataaccesstoken
      },
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


