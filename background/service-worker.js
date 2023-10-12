
const server_url = "http://localhost:3000";

const URI_plugin_user_post_click = "/plugin_user_post_click";
const URI_plugin_user_delete_click = "/plugin_user_delete_click";


importScripts('ajv.min.js');

const plugin_uuid_header_name = "installationUniqueId";

/** Check if a unique ID has been set for this extenstion. It not, set one.
 * This ID is used to identify the user with the server without the user having to provide any information.
 * The level of security is weak, but it is sufficient for the purpose of this tool when used in the unauthenticated-mode.
 * User requireing stronger security, or cross-device capability, must use the authenticated mode.
 *
 */
chrome.storage.local.get(['installationUniqueId'], function (result) {
    if (!result.installationUniqueId) {
        // Generate uniqueId here (either fetch from server or generate locally)
        // generate a new unique identifier
        let guid = () => {
            let s4 = () => {
                return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
        }

        const installationUniqueId = guid();
        console.debug("now setting installationUniqueId (" + installationUniqueId + ")");
        chrome.storage.local.set({
            installationUniqueId: installationUniqueId
        });
    } else {
        console.debug("installationUniqueId already set (" + result.installationUniqueId + ")");
    }
});

var callback = function (details) {
    console.log('Les Headers ont ete recus');
    console.log(JSON.stringify(details));
    //  console.log(details.type);
    // examine the http header for the X_HTTP_CYBOTIX_PLATFORM_TOKEN and if present, verify validity.
    if (details.type == "main_frame") {
        console.log(details);
        const h = details.responseHeaders;
        console.log(h);
        console.log(JSON.stringify(h));
        console.log(details.responseHeaders.X_HTTP_CYBOTIX_PLATFORM_TOKEN);
        const tabId = details.tabId;
        console.log("DEBUG, tabId: " + tabId);
        const frameId = details.frameId;
        console.log("DEBUG, frameId: " + frameId);
        const entityid = getValidPlatformToken(details.responseHeaders);
        console.log("DEBUG, entityid: " + entityid);
        if (entityid != null && entityid != "") {

            chrome.tabs.query({}, (tabs) => {
                for (let tab of tabs) {
                    if (tab.url === details.url) {
                        console.log(`Found tab with ID: ${tab.id} and URL: ${tab.url}`);
                        // send the token back the page
                        const message = {
                            type: 'greeting',
                            payload: 'Hello from background script!'
                        };

                        chrome.tabs.sendMessage(tab.id, message, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error(chrome.runtime.lastError);
                                return;
                            }
                            console.log('Message sent and response received:', response);
                        });
                        //break;
                    }
                }
            });
            // put the token in the local storage with the URL as the key
        }
    }
}

//chrome.webRequest.onCompleted.addListener(
//  callback3, {
//    urls: ["<all_urls>"], types: ["main_frame" ]
//}, ['responseHeaders']);


var callback3 = function (details) {
    console.debug('##### callback3');
    console.log(JSON.stringify(details));

    // examine the http header for the X_HTTP_CYBOTIX_PLATFORM_TOKEN and if present, verify validity.
    // is so, check for other Cybotix headers and take action accordingly
    if (details.type == "main_frame") {
        console.log(details);
        const h = details.responseHeaders;
        console.log(h);

        chrome.storage.local.set({
            "tabsOpened": "value"
        });

        console.log(JSON.stringify(h));
        console.debug(details.responseHeaders.X_HTTP_CYBOTIX_PLATFORM_TOKEN);
        const tabId = details.tabId;
        console.debug("DEBUG, tabId: " + tabId);
        // const frameId = details.frameId;
        // console.log("DEBUG, frameId: " + frameId);
        var entityid = getValidPlatformToken(details.responseHeaders);
        console.debug("DEBUG, entityid: " + entityid);
        if (entityid != null && entityid != "") {

            chrome.tabs.query({
                url: details.url
            }).then(function (tabs) {
                console.log("DEBUG,calling callTabs");
                console.log(tabs);

                const message = {
                    type: 'platformtoken',
                    payload: 'Hello from background script!',
                    token: entityid
                };
                console.log(message);
                for (const tab of tabs) {
                    console.log(tab);

                    chrome.tabs.sendMessage(tab.id, message, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError);
                            return;
                        }
                        console.log('Message sent and response received:', response);
                    });

                }

            })
            .catch(onError);
            // put the token in the local storage with the URL as the key

        }

    }
}

function onError(error) {
    console.error(`Error: ${error}`);
}

function sendTokenMessageToTabs(tabs, entityid) {
    const message = {
        type: 'platformtoken',
        payload: 'Hello from background script!',
        token: entityid
    };
    console.log(message);
    for (const tab of tabs) {
        chrome.tabs
        .sendMessage(tab.id, {
            greeting: "Hi from background script"
        })
        .then((response) => {
            console.log("Message from the content script:");
            console.log(response.response);
        })
        .catch(onError);
    }
}

function getHeaderNames(responseHeaders) {
    if (!Array.isArray(responseHeaders)) {
        return [];
    }

    return responseHeaders.map(header => header.name);
}

// pick up on platform headers
chrome.webRequest.onHeadersReceived.addListener(function (details) {
    // console.log('################################');
    // console.log('############## onHeadersReceived');
    // console.log('################################');
    // examine the http header for the X_HTTP_CYBOTIX_PLATFORM_TOKEN and if present, verify validity.
    // is so, check for other Cybotix headers and take action accordingly
    console.log(details.type);
    if (details.type == "main_frame" || details.type == "sub_frame") {
        console.log(JSON.stringify(details));

        const h = details.responseHeaders;
        const headerNames = getHeaderNames(details.responseHeaders);
        console.log('HTTP header names:', headerNames);
        // check for presence of cybotix headers and take appropriate action based on what additional headers are present


        if (headerNames.includes("X_HTTP_CYBOTIX_PLATFORM_TOKEN")) {

            const platformtoken = getNamedHeader(h, "X_HTTP_CYBOTIX_PLATFORM_TOKEN");
            console.log("### X_HTTP_CYBOTIX_PLATFORM_TOKEN: " + platformtoken);

            console.log(isValidPlatformToken(platformtoken));
            // validate the platform token
            if (isValidPlatformToken(platformtoken)) {
                console.log("platform token is both present and valid");

                // check for other cybotix headers and take appropriate action based on what additional headers are present
                // option 1: X_HTTP_CYBOTIX_DATA_REQUEST
                // this is a request for data from the user

                // option 2. X_HTTP_CYBOTIX_DATA_AGREEMENT_REQUEST
                // this is a request for the user to accept a data agreement

                // option 3. X_HTTP_CYBOTIX_QUERY_PLUGIN
                // just a check to see if the plugin is present in the browser and responsive. No data is requested.



                if (headerNames.includes("X_HTTP_CYBOTIX_QUERY_PLUGIN")) {
                    const requesttoken = getNamedHeader(h, "X_HTTP_CYBOTIX_QUERY_PLUGIN");
                    console.log("### X_HTTP_CYBOTIX_QUERY_PLUGIN: " + requesttoken);

                    // validate the request token
                    // use a fixed value for now
                    // (perhaps: send a message to the content script to validate the token)

                    if (isValidRequestToken(requesttoken)) {
                        console.log("request token is both present and valid");

                        const redir_target = getNamedHeader(h, "X_HTTP_CYBOTIX_QUERY_REDIRECT");

                        // Determined which tab and frame this is request is going through
                        console.log("frameId: " + details.frameId);
                        console.log("frameType: " + details.frameType);
                        console.log("tabId: " + details.tabId);
                        console.log("type: " + details.type);
                        console.log("redir_target: " + redir_target);
                        // working with declarativenetrquest dynamically
                        //import rules from './rules';
                        //chrome.declarativeNetRequest.updateDynamicRules({
                        //  removeRuleIds: rules.map((rule) => rule.id), // remove existing rules
                        //  addRules: rules
                        //});

                        //
                        // inject a script into the iframe

                        chrome.scripting
                        .executeScript({
                            target: {
                                tabId: details.tabId,
                                frameIds: [details.frameId]
                            },
                            files: ["redirect-script.js"],
                        })
                        .then(function (one) {
                            console.log("script injected on target frames");

                            // send the token back the page


                            const message = {
                                type: 'redirectgreeting',
                                payload: 'Hello from background script to issue a redirect with payload.',
                                newurl: redir_target,
                                headername: "X_HTTP_CYBOTIX_HAVE_PLUGIN",
                                headervalue: "true",
                                redir_target: redir_target

                            };

                            chrome.tabs.sendMessage(details.tabId, message, (response) => {
                                if (chrome.runtime.lastError) {
                                    console.error(chrome.runtime.lastError);
                                    return;
                                }
                                console.log('Message sent and response received:', response);
                            }).then(function (two) {
                                console.log(two);
                            }).catch(function (two) {
                                console.log(two);
                            });

                        });

                    }

                } else if (headerNames.includes("X_HTTP_CYBOTIX_DATA_REQUEST")) {
                    // data request
                    console.log("has X_HTTP_CYBOTIX_QUERY_DATA");

                    // set a switch for when it is time to get a close look at any possible data agreements. 
// only do this is there is a valid request
var validrequest = false;

// the UUID of the requesting party. 
var counterparty_id = "company_inc."

                    // Another header is also required, X_HTTP_CYBOTIX_QUERY_REDIRECT, contaning the URL of where to send the response
                    // If this header is not present, the source URL is used. This is not recommended as it may lead to unexpected results.

                    var redir_target = details.url;
                    if (headerNames.includes("X_HTTP_CYBOTIX_QUERY_REDIRECT")) {
                        redir_target = getNamedHeader(h, "X_HTTP_CYBOTIX_QUERY_REDIRECT");
                    }
                    const incoming_data_request_message = getNamedHeader(h, "X_HTTP_CYBOTIX_DATA_REQUEST");
                    console.debug("incoming_data_request_message: " + incoming_data_request_message);
                    // check if the message is propperly formated, using a JSON-schema validation operation
                    // if not, ignore the request

                    const request = base64Decode(incoming_data_request_message);
                    console.debug(isValidJSON(request));
// check if request is a propperly formated piece of JSON
if (isValidJSON(request)){
    console.debug(isObjectEmpty(request));
    const d_r = JSON.parse(request);
console.log(d_r);

console.log(d_r.messagetext);
console.log(d_r.requests);
var requests = d_r.requests;



requests.forEach(function(req){
console.debug(req);
//  clickhistory is the only valid requesttype at this time
if (req.requesttype == "clickhistory");
validrequest = true;
console.debug(req.requestdetails)


});


}
                   
if (validrequest){
    // get the data agreement
    console.debug("lookup data agreements for: " + counterparty_id);
}else{
    console.debug("no valid data requests");
}








                } else if (headerNames.includes("X_HTTP_CYBOTIX_DATA_AGREEMENT_REQUEST")) {
                    // data agreement request
                    console.log("has X_HTTP_CYBOTIX_DATA_AGREEMENT_REQUEST");
                    const requesttoken = getNamedHeader(h, "X_HTTP_CYBOTIX_DATA_AGREEMENT_REQUEST");
                    if (isValidRequestToken(requesttoken)) {
                        console.log("has valid request token");
                        // accept the data request for further processing

                        // check if the user has already granted this data request and the grant is still valid (not suspended or revoked)

                        // lookup the agreement reference ID in the central database

                }
            }

            }

        }
        if (headerNames.includes("X_HTTP_CYBOTIX_PLATFORM_TOKEN")) {
            const token = getNamedHeader(h, "X_HTTP_CYBOTIX_PLATFORM_TOKEN");
            console.log("### X_HTTP_CYBOTIX_PLATFORM_TOKEN: " + token);

        }
        if (headerNames.includes("X_HTTP_CYBOTIX_DATAREQUEST_TOKEN")) {
            const token = getNamedHeader(h, "X_HTTP_CYBOTIX_DATAREQUEST_TOKEN");
            console.log("### X_HTTP_CYBOTIX_DATAREQUEST_TOKEN: " + token);

            //    attach the response header to the request going back to
            // X_HTTP_CYBOTIX_PLUGIN: true

        }

    }

    // examine the http header for the X_HTTP_CYBOTIX_PLATFORM_TOKEN and if present, verify validity.
    // if (details.type == "main_frame") {
    //    console.log(details);

    //  console.log(h);
    // console.log(JSON.stringify(h));
    // console.log("X_HTTP_CYBOTIX_PLATFORM_TOKEN: " + getNamedHeader(h, "X_HTTP_CYBOTIX_PLATFORM_TOKEN"));
    // console.log("X_HTTP_CYBOTIX_REQUEST_TOKEN: " + getNamedHeader(h, "X_HTTP_CYBOTIX_REQUEST_TOKEN"));
    const tabId = details.tabId;
    console.log("DEBUG, tabId: " + tabId);
    const frameId = details.frameId;
    console.log("DEBUG, frameId: " + frameId);
    const entityid = getValidPlatformToken(details.responseHeaders);
    console.log("DEBUG, entityid: " + entityid);
    if (entityid != null && entityid != "") {

        chrome.tabs.query({}, (tabs) => {
            for (let tab of tabs) {
                if (tab.url === details.url) {
                    console.log(`Found tab with ID: ${tab.id} and URL: ${tab.url}`);
                    // send the token back the page
                    const message = {
                        type: 'greeting',
                        payload: 'Hello from background script!'
                    };

                    chrome.tabs.sendMessage(tab.id, message, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError);
                            return;
                        }
                        console.log('Message sent and response received:', response);
                    });

                    //break;
                }
            }
        });
        // put the token in the local storage with the URL as the key
        // }
    }
}, {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame"]
}, ['responseHeaders', 'extraHeaders']);

// listen to requests from the content script
// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    console.log("Received message from content script:", message);
    console.log("Received message from content script:", sender);

    if (message.type === "CybotixPlatformAccessRequest") {
        console.log("Received CybotixPlatformAccessRequest from content script:", message.payload);
        // check for a platform access token in the http headers

        console.log("Received CybotixPlatformAccessRequest from content script frameId: ", sender.frameId);
        console.log("Received CybotixPlatformAccessRequest from content script tabId: ", sender.tab.windowId);

        // You can send a response back if you want
        sendResponse({
            type: "acknowledgment",
            payload: "Hello from background script!"
        });
    }
});

// attach cybotix headers to outbound requests
chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
    for (var i = 0; i < details.requestHeaders.length; ++i) {
        if (details.requestHeaders[i].name === 'User-Agent') {
            details.requestHeaders.splice(i, 1);
            break;
        }
    }
    return {
        requestHeaders: details.requestHeaders
    };
}, {
    urls: ['<all_urls>']
},
    ['requestHeaders', 'extraHeaders']);



    function isObjectEmpty(obj) {
        return Object.keys(obj).length === 0 && obj.constructor === Object;
    }
    
    

// Take a set of response heders and returns entity id if a valid platform token is present.
// Platform tokens authenticates a buyer/consumer of personal data to the plugin.
// This is not any sort of authorization to get user data, that comes later, only authentication.
// The level of assurance in this authentication mechanism is weak and is intended
// only as computationally quick way to weed out frivolous requests.
function getValidPlatformToken(h) {
    console.log("getValidPlatformToken");
    for (let i = 0; i < h.length; i++) {
        //     console.log('Iteration:', i, h[i].name, h[i].value);
        if (h[i].name === "X_HTTP_CYBOTIX_PLATFORM_TOKEN") {
            // token found, now validate it
            //        console.log('validate platform access token: ' + h[i].value);
            //var entityid = "dummy";
            return h[i].value;
            break;
        }
    }
}

// Verify that a submitted platform token is valid.
// Check separate documentation on how to do this.
function isValidPlatformToken(token) {
    console.log("isValidPlatformToken")
    return true;
}

// Verify that a submitted request token is valid.
// Check separate documentation on how to do this.
// A request token must be submitted along with a platformtoken.
// A key included in the platform token, belonging to the counterparty, is used to validate the request token.
// In this way the request token is tied to the platform token and request tokens
//  are not accepted unless accompanied by a valid platform token.
function isValidRequestToken(token) {

    return true;
}


function base64Decode(input) {
    // Step 1: Convert base64 string to byte array
    const raw = atob(input);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }

    // Step 2: Decode the byte array to string
    const textDecoder = new TextDecoder();
    return textDecoder.decode(array);
}

function getNamedHeader(h, headerName) {
    // set a max iterations above which stop looking
    for (let i = 0; i < h.length; i++) {
        try {
            //           console.log('Iteration:', i, h[i].name, h[i].value, headerName);
            //           console.log(h[i].name.toUpperCase());
            //           console.log(headerName.toUpperCase());
            if (h[i].name.toUpperCase() == headerName.toUpperCase()) {
                //         console.log("#### FOUND ####");
                // token found, now validate it

                return h[i].value;
                break;
            }
        } catch (e) {}
    }
}


function isValidJSON(text) {
    try {
        JSON.parse(text);
        return true;
    } catch (error) {
        return false;
    }
}


/**
 * This function is called when a user clicks on a link in a web page.
 * The URL is stored with the users data account for a limited period and is available for inspection/alteration/deletion by the user.
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
    //console.log("TEST");
    console.log(JSON.stringify(details));
    // console.log(chrome.runtime.id);

    //console.log("type: "+details.type);

    //console.log("timeStamp: "+details.timeStamp);
    //console.log("------------------------");

    if (details.type == "main_frame") {
        // capture this request
        // send to server

        console.log("capture url: " + details.url);
        console.log("apture DEBUG,calling addDataRow");

        // stor the url in the database
        addDataRow(details.url);

    }

    // Only a limited set of request types are of interest here.
    // Personal data should be be captured in the narrowest possible way consitent with achieving desired functionality.
    // Maintain adequate logging so that advanced users can see what is being captured and transmitted.

    // The plugin GUI likewise gives access to the captured data on the server-side and allows for immediate deletion.

    // Captured data is by default deleted after 7 days.

}, {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame"]
},
    ["extraHeaders", "requestHeaders"]);

// Function to use "fetch" to delete a data row
async function addDataRow(url) {
    console.log("DEBUG,capture addDataRow +url" + url);
    try {

        let installationUniqueId = await chrome.storage.local.get(['installationUniqueId']);

        const browser_id = installationUniqueId.installationUniqueId;

        const event = new Date();

        const userid = "";
        //console.log("deleting: " + id);
        const message_body = '{ "browser_id":"' + browser_id + '", "url":"' + url + '", "localtime":"' + event.toISOString() + '" }';
        console.log("DEBUG" + message_body);
        // Fetch data from web service (replace with your actual API endpoint)
        const response = await fetch(server_url + URI_plugin_user_post_click, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: browser_id
                },
                body: message_body // example IDs, replace as necessary
            });
        //console.log(response);
        // Check for errors
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse JSON data
        const data = await response.json();

    } catch (error) {
        console.error(error);
    }
}
