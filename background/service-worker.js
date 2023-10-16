
const server_url = "http://localhost:3000";

const URI_plugin_user_post_click = "/plugin_user_post_click";
const URI_plugin_user_delete_click = "/plugin_user_delete_click";

const valid_audience_values = {
    "cybotix-personal-data-commander": "1",
    "Cybotix": "1"
};

//importScripts('ajv.min.js');

const plugin_uuid_header_name = "installationUniqueId";

/*
default rule set for declarativeNetRequest
 */

/*

Default ruleset for clicked URLs that should not be captured


The rules have two separate parts, one for only the domain name and one for the full URL.

Domainname-rules are used to check if the domain name is in the list. If the domain name is in the list, the full URL is not checked.

Full URL-rules.
For the full URL, the rules are used to check if the URL is in the list. If the URL is in the list, the URL is not checked.
The rules are regular expressions (regexp) and addint, deleting, modifying these rules are options only made visible to usere who have "davanced mode" enabled


The rules are cached in memory and a copy is kept at the server. The rules are updated when the user makes changes to the rules.
Whever the plugin restarts, the rules are fetched from the server and cached in memory.

The default ruleset is as follows:


It is loaded into the server when the plugin is first installed and is used as the default until the user makes changes.
Setting the installationUniqueId (se code below) also sets up the rules for this instance on the server.

The user may reset the rules to the default ruleset at any time.

 */

var domain_capture_exclusion_list = {
    "localhost": "1",
    "mail.google.com": "1",
    "mail.yahoo.com": "1",
    "bbc.com": "1",
    "www.bbc.com": "1"
};
var url_capture_exclusion_list = {};
url_capture_exclusion_list["sourceURLYellowNotesDB_uuid_url"] = {};

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

function keyExists(key, obj) {
    return obj[key] !== undefined;
}

function isOnDomainCaptureExclusionList(key) {
    return domain_capture_exclusion_list[key] !== undefined;

}

/* triggered when the plugin is installed or when the user call this function from the GUI
 */
function setupDefaultCaptureExclusionRules() {
    console.log('setupDefaultCaptureExclusionRules');

}

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

            console.log(isJwtFormat(platformtoken));
            // validate the platform token
            if (isJwtFormat(platformtoken)) {
                console.log(platformtoken);
                //validateJwtWithPublicKey(platformtoken,"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzNDQRPGUPmpUj3K7D0LoucRrCuAwLLD7B0i9iOfJLXps9lN05+bL8H24eVGwb8UO+Ip+2GQrLlPoErvuqqftv9heKQ9C6P3dNPFHsgcJqLIT2qYOWRXqceKdV5VshGzVRdS7v+/giWn4uTkEFskor9JZJFnxredZyOK7Buc/WvU1yt40FQum1/mpCPCmKcqulBib93PpwlXkjyZfbmQHG5QQ/DSg2bE607SrXc0vRYhrHfiuncSbfkKaxPA4C/YQr/4QbyX1Hm/IzKrToaWwghjF0uP0VWVlHJ1xfyGlxQvPllQpa6t7FuBx3N9xJ1OEsGRo4gS7ctiogHVwh1M5oQIDAQAB","cybotix-personal-data-commander").then(
                parseJWTbypassSignCheck(platformtoken, "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzNDQRPGUPmpUj3K7D0LoucRrCuAwLLD7B0i9iOfJLXps9lN05+bL8H24eVGwb8UO+Ip+2GQrLlPoErvuqqftv9heKQ9C6P3dNPFHsgcJqLIT2qYOWRXqceKdV5VshGzVRdS7v+/giWn4uTkEFskor9JZJFnxredZyOK7Buc/WvU1yt40FQum1/mpCPCmKcqulBib93PpwlXkjyZfbmQHG5QQ/DSg2bE607SrXc0vRYhrHfiuncSbfkKaxPA4C/YQr/4QbyX1Hm/IzKrToaWwghjF0uP0VWVlHJ1xfyGlxQvPllQpa6t7FuBx3N9xJ1OEsGRo4gS7ctiogHVwh1M5oQIDAQAB")
                .then(function (payload) {
                    console.log(payload);

                    return validatePlatformToken(payload);
                }).then(function (data) {

                    console.log(data);

                    //function (entityid) {
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
                        // this is a data request


                        console.log("has X_HTTP_CYBOTIX_DATA_REQUEST");
                        console.log(data);
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
                        var request_payload;
                        const request = base64Decode(incoming_data_request_message);
                        console.debug(isValidJSON(request));
                        // check if request is a propperly formated piece of JSON
                        if (isValidJSON(request)) {
                            console.debug(isObjectEmpty(request));
                            request_payload = JSON.parse(request);
                            console.log(request_payload);

                            console.log(request_payload.messagetext);
                            console.log(request_payload.requests);
                            var requests = request_payload.requests;

                            requests.forEach(function (req) {
                                console.debug(req);
                                //  clickhistory is the only valid requesttype at this time
                                if (req.requesttype == "clickhistory") {
                                    console.debug("has valid requesttype");
                                    validrequest = true;
                                    console.debug(req.requestdetails);

                                    const user_prompt_data_request = "123456";
                                    // call to active tab and have the content script present the interation page
                                    try {

                                        var activetab_id;
                                        getActiveTab()
                                        .then(tab => {
                                            console.log("Active tab:", tab);
                                            activetab_id = tab.id;
                                            return executeScriptOnTab(tab.id, 'data_request_prompt.js');
                                        })
                                        .then(result => {
                                            console.log("Script execution result:", result);
                                        })
                                        .catch(err => {
                                            console.error("Error:", err);
                                        }).then(function (tab) {
                                            console.log(tab);
                                            // send the token back the page
                                            // generates random id;
                                            let guid = () => {
                                                let s4 = () => {
                                                    return Math.floor((1 + Math.random()) * 0x10000)
                                                    .toString(16)
                                                    .substring(1);
                                                }
                                                return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
                                            }

                                            const message = {
                                                type: 'datarequest',
                                                prompt_id: guid(),
                                                payload: 'Hello from background script!',
                                                secret: user_prompt_data_request,
                                                complete_req: request_payload,
                                                requestdetails: req.requestdetails
                                            };
                                            return chrome.tabs.sendMessage(activetab_id, message);
                                        }).then(function (response) {
                                            if (chrome.runtime.lastError) {
                                                console.error(chrome.runtime.lastError);
                                                return;
                                            }
                                            console.log('Message sent and response received:', response);
                                        });

                                    } catch (err) {
                                        console.log(err);
                                    }

                                }
                            });
                        }

                        if (validrequest) {
                            // get the data agreement
                            console.debug("lookup data agreements for: " + counterparty_id);
                        } else {
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
                });
            }
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
    // const entityid = getValidPlatformToken(details.responseHeaders);
    // console.log("DEBUG, entityid: " + entityid);
    // if (entityid && entityid != null && entityid != "") {

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
    //}
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

function executeScriptOnTab(tabId, scriptName) {
    console.log("executeScriptOnTab");
    return new Promise((resolve, reject) => {

        chrome.scripting.executeScript({
            target: {
                tabId: tabId
            },
            files: [scriptName],
        }).then(function (result) {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve(result[0]); // Assuming only one script was injected.
            }
        }).catch(err => {
            console.error("Error:", err);
        });

    });
}

function getActiveTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve(result[0]);
            }
        });
    });
}

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

function base64UrlDecode(str) {
    // Convert Base64Url to Base64 by replacing - with + and _ with /
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('binary');
    return decoded;
}

function verifySignature(encodedHeader, encodedPayload, signature, publicKey) {
    console.log(encodedHeader);
    console.log(encodedPayload);
    console.log(signature);
    console.log(publicKey);

    const crypto = Crypto; //|| window.msCrypto;
    const data = encodedHeader + "." + encodedPayload;
    console.debug(signature);
    const publicKeyBuffer = new Uint8Array([...publicKeyPem].map(ch => ch.charCodeAt(0)));

    try {
        const encodedSignature = new Uint8Array(Array.from(atob(signature), c => c.charCodeAt(0)));
        console.log(encodedSignature);
        console.log(publicKey);
        return crypto.subtle.importKey(
            "spki",
            new TextEncoder().encode(publicKey), {
            name: "RSASSA-PKCS1-v1_5",
            hash: {
                name: "SHA-256"
            }
        },
            false,
            ["verify"]).then(key => {
            return crypto.subtle.verify(
                "RSASSA-PKCS1-v1_5",
                key,
                encodedSignature,
                new TextEncoder().encode(data));
        });
    } catch (error) {
        console.log(error);
        return false;
    }
}

function verifySignature2(data, signature, publicKeyPem) {
    console.debug("verifySignature2");
    console.log(data);
    console.log(signature);
    console.log(publicKeyPem);
    // const crypto = crypto;

    return new Promise(function (resolve, reject) {
        console.debug("new promise")
        // Convert PEM to an ArrayBuffer
        const publicKeyBuffer = new Uint8Array([...publicKeyPem].map(ch => ch.charCodeAt(0)));
        console.debug(publicKeyBuffer);
        crypto.subtle.importKey(
            'spki',
            publicKeyBuffer, {
            name: "RSASSA-PKCS1-v1_5",
            hash: {
                name: "SHA-256"
            }
        },
            false,
            ['verify']).then(publicKey => {
            console.debug("publicKey");
            console.debug(publicKey);
            // Convert data and signature to ArrayBuffers
            const dataBuffer = new TextEncoder().encode(data);
            const signatureBuffer = new Uint8Array([...atob(signature)].map(ch => ch.charCodeAt(0)));

            // Verify the signature
            resolve(crypto.subtle.verify(
                    "RSASSA-PKCS1-v1_5",
                    publicKey,
                    signatureBuffer,
                    dataBuffer));
        }).catch(function (err) {
            console.debug(err);
            reject(err);
        });
    });
}

/**
 *
 * @param {*} token
 * @param {*} publicKeyPEM
 * @returns
 *
 * put in this function to skip signature check while some JWK issues are sorted out
 */
function parseJWTbypassSignCheck(token, publicKeyPEM) {
    console.log("parseJWT");
    // console.log(token);
    const parts = token.replace(/-/g, '+').replace(/_/g, '/').split('.');
    if (parts.length !== 3) {
        //throw new Error('Invalid token format');
        console.log('Invalid token format');
    }

    return new Promise(function (resolve, reject) {

        // bypass this pending work on JWKs
        resolve(JSON.parse(base642str(parts[1].replace(/-/g, '+').replace(/_/g, '/'))));

    });
}

function parseJWT(token, publicKeyPEM) {
    console.log("parseJWT");
    console.log(token);
    console.log(publicKeyPEM);
    const parts = token.replace(/-/g, '+').replace(/_/g, '/').split('.');
    if (parts.length !== 3) {
        //throw new Error('Invalid token format');
        console.log('Invalid token format');
    }

    return new Promise(function (resolve, reject) {

        const encodedHeader = parts[0];
        const encodedPayload = parts[1];
        const signature = parts[2];

        console.log(encodedPayload);
        console.log(signature);
        console.log(publicKeyPEM);
        // bypass this pending work on JWKs
        resolve(base642str(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));

        //verifySignature2(encodedPayload, signature, publicKeyPEM)

        const publicKeyBuffer = new Uint8Array([...publicKeyPEM].map(ch => ch.charCodeAt(0)));
        console.debug(publicKeyBuffer);

        crypto.subtle.importKey(
            'spki',
            publicKeyBuffer, {
            name: "RSASSA-PKCS1-v1_5",
            hash: {
                name: "SHA-256"
            }
        },
            false,
            ['verify'])
        .catch(function (err) {
            console.debug(err);
            reject(err);
        }).then(publicKey => {
            console.debug("publicKey");
            console.debug(publicKey);
            // Convert data and signature to ArrayBuffers
            const dataBuffer = new TextEncoder().encode(encodedPayload);
            const signatureBuffer = new Uint8Array([...atob(signature)].map(ch => ch.charCodeAt(0)));

            // Verify the signature
            resolve(crypto.subtle.verify(
                    "RSASSA-PKCS1-v1_5",
                    publicKey,
                    signatureBuffer,
                    dataBuffer));
        })
        .then(function (out) {
            console.debug(out);
            resolve(out);
        }).catch(function (err) {
            console.debug(err);
            reject(err);
        });

        //console.log(verifySignature(encodedHeader, encodedPayload, signature, publicKey));
        //   return verifySignature(encodedHeader, encodedPayload, signature, publicKey).then(isValid => {
        //      if (!isValid) {
        //           throw new Error('Invalid signature');
        //        }
        //
        //        const header = JSON.parse(base64UrlDecode(encodedHeader));
        //       const payload = JSON.parse(base64UrlDecode(encodedPayload));

        //  return { header, payload };
        //return true
        // });

    });
}

// Example usage:
//  const token = "YOUR_JWT_HERE";
//  const publicKey = "YOUR_PUBLIC_KEY_IN_PEM_FORMAT_HERE";

//  parseJWT(token, publicKey).then(data => {
//      console.log(data);
//  }).catch(error => {
//      console.error("Failed to parse JWT:", error);
//   });


function validatePlatformToken(tokenPayload) {

    // chect validy time

    // check issuer
    // check for revocation
    console.debug(tokenPayload);

    return new Promise(function (resolve, reject) {

        const aud = tokenPayload.aud;

        console.debug(aud);

        console.debug(keyExists(tokenPayload.aud, valid_audience_values));

        console.debug(tokenPayload);

        // check audience
        if (keyExists(tokenPayload.aud, valid_audience_values)) {

            resolve(tokenPayload);
        } else {
            reject("invalid audience");
        }

    });

}

function validateJwtWithPublicKey(token, publicKey, requiredAudience) {
    console.debug(token);
    console.debug(token.toString());
    console.debug(publicKey);
    try {
        const parts = token.toString().replace('_', '/').replace('-', '+').split('.');
        if (parts.length !== 3) {
            throw new Error('Token is not in the correct format');
        }
        console.debug(parts);
        function base64UrlDecode(str) {
            console.debug("base64UrlDecode: " + str);
            str = str.replace('-', '+').replace('_', '/');
            console.debug("base64UrlDecode: " + str);
            while (str.length % 4) {
                str += '=';
            }
            const base64 = atob(str);
            let decoded = '';
            for (let i = 0; i < base64.length; i++) {
                decoded += '%' + ('00' + base64.charCodeAt(i).toString(16)).slice(-2);
            }
            return decodeURIComponent(decoded);
        }
        console.debug(parts[0]);
        const header = JSON.parse(base64UrlDecode(parts[0]));
        console.debug(header);
        console.debug(parts[1]);
        const payload = JSON.parse(base64UrlDecode(parts[1]));
        console.debug(payload);
        console.debug(parts[2]);
        const originalSignature = base64UrlDecode(parts[2]);
        console.debug(originalSignature);
        // Validate the algorithm from the header
        if (header.alg !== 'RS256') {
            throw new Error('Unsupported algorithm. Expected RS256');
        }

        function verifySignature(encodedHeader, encodedPayload, signature, publicKey) {
            const crypto = window.crypto || window.msCrypto;
            const data = encodedHeader + "." + encodedPayload;
            const encodedSignature = new Uint8Array(Array.from(window.atob(signature), c => c.charCodeAt(0)));

            return crypto.subtle.importKey(
                "spki",
                new TextEncoder().encode(publicKey), {
                name: "RSASSA-PKCS1-v1_5",
                hash: {
                    name: "SHA-256"
                }
            },
                false,
                ["verify"]).then(key => {
                return crypto.subtle.verify(
                    "RSASSA-PKCS1-v1_5",
                    key,
                    encodedSignature,
                    new TextEncoder().encode(data));
            });
        }

        return verifySignature(encodedHeader, encodedPayload, signature, publicKey).then(isValid => {
            if (!isValid) {
                throw new Error('Invalid signature');
            }

            const header = JSON.parse(base64UrlDecode(encodedHeader));
            const payload = JSON.parse(base64UrlDecode(encodedPayload));

            return {
                header,
                payload
            };
        });

        // Verify the RSA signature
        const encoder = new TextEncoder();
        const data = encoder.encode(parts[0] + '.' + parts[1]);
        const importedKey = window.crypto.subtle.importKey(
                'spki',
                encoder.encode(publicKey), {
                name: 'RSASSA-PKCS1-v1_5',
                hash: {
                    name: 'SHA-256'
                }
            },
                false,
                ['verify']);

        console.debug(importedKey);

        const isValidSignature = window.crypto.subtle.verify(
                'RSASSA-PKCS1-v1_5',
                importedKey,
                new TextEncoder().encode(originalSignature),
                data);
        console.debug(isValidSignature);
        if (!isValidSignature) {
            throw new Error('Signature verification failed');
        }

        return {
            header,
            payload
        };
    } catch (error) {
        console.error(error);
        return false;

    }
}

/** */
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
function getValidPlatformToken(jwt) {
    console.log("getValidPlatformToken")

    // Usage
    //const jwt = "YOUR_RSA_SIGNED_JWT_HERE";
    const publicKey = "YOUR_PUBLIC_KEY_IN_PEM_FORMAT";

    validateJwtWithPublicKey(jwt, publicKey)
    .then(result => console.log(result))
    .catch(err => console.error(err.message));

    return true;

}

function isJwtFormat(str) {
    const jwtPattern = /^[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{50,}\.[A-Za-z0-9-_]{50,}$/;
    return jwtPattern.test(str);
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
    //console.log(JSON.stringify(details));
    // console.log(chrome.runtime.id);

    //console.log("type: "+details.type);

    //console.log("timeStamp: "+details.timeStamp);
    //console.log("------------------------");

    if (details.type == "main_frame") {
        // capture this request
        // send to server

        console.log("capture url: " + details.url);
        //    console.log(JSON.stringify(details));
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
    console.debug("DEBUG,capture addDataRow +url" + url);

    //console.debug("DEBUG,capture addDataRow +domain" + url.replace(/.*\:\/\/([^:\/]*)[:\/].*/,"$1") );

    let domain = url.replace(/.*\:\/\/([^:\/]*)[:\/].*/, "$1");

    console.debug("DEBUG,capture addDataRow, domain: " + domain);

    console.debug("DEBUG,capture addDataRow, isOnDomainCaptureExclusionList: " + isOnDomainCaptureExclusionList(domain));
    if (!isOnDomainCaptureExclusionList(domain)) {
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
    } else {
        console.debug("DEBUG,skipping capture of url" + url);
    }
}

function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    const buffer = new ArrayBuffer(8);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

function _arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function str2base64(str) {
    return btoa(str);
}
function base642str(base64) {
    return atob(base64);
}
