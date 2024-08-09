//const server_url = "https://api.cybotix.no";
const server_url = "https://api-dev.cybotix.no";

var URI_plugin_user_post_click = "/plugin_user_post_click";
var URI_plugin_user_delete_click = "/plugin_user_delete_click";
var URL_plugin_user_delete_all_clickdata = "/plugin_user_delete_all_clickdata";
var URI_plugin_user_delete_expired_clickdata = "/plugin_user_delete_expired_clickdata";
var URI_plugin_user_create_dataaccess_token = "/plugin_user_create_dataaccess_token";
var URI_plugin_user_query_accesstoken_status = "/plugin_user_query_accesstoken_status";
var URI_plugin_user_import = "/plugin_user_import"
    var plugin_user_get_all_clicks = "/plugin_user_get_all_clicks";
var plugin_user_read_all_data_agreements = "/plugin_user_read_all_data_agreements";
var URI_plugin_user_check_request_against_data_agreements = "/plugin_user_check_request_against_data_agreements";
var URI_plugin_user_add_data_agreement = "/plugin_user_add_data_agreement";
var URI_plugin_user_set_clickdata_lifetime = "/plugin_user_set_clickdata_lifetime";
const URL_plugin_user_deactivate_agreements = "/plugin_user_deactivate_agreements";
const URL_plugin_user_activate_agreements = "/plugin_user_activate_agreements";
const URL_plugin_user_set_agreement_active_status = "/plugin_user_set_agreement_active_status";

const URL_plugin_data_interface = "/data";

var valid_audience_values = {
    "cybotix-personal-data-commander": "1",
    "Cybotix": "1"
};

const plugin_uuid_header_name = "installationUniqueId";

var config = {};

// Fetch and load the configuration on initialization
const configURL = chrome.runtime.getURL('./config.json');
fetch(configURL)
.then(response => response.json())
.then(data => {

    console.log('Config:', data);
    config = JSON.parse(JSON.stringify(data));
    // You can now use your config object
    console.log(JSON.stringify(config));
})
.catch(error => console.error('Error reading config:', error));

// Listen to other events and use the `config` as needed

console.log(JSON.stringify(config));

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

function base64urlEncode(str) {
    return str2base64(str);
    return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str) {
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

/** some URLs should be excluded from capture, such as the user's own email account, or the user's own website.
 *
 * Technically this is done in two ways:.
 * Firstly By simply excluding whole domains - straight case-insensitive match on the fully qualified domain name (FQDN)
 * Secondly By excluding specific URLs based on regular expressions (regexp)
 *
 */
var domain_capture_exclusion_list = {
    "localhost": "1",
    "mail.google.com": "1",
    "accounts.google.com": "1",
    "mail.yahoo.com": "1",
    ".aws.amazon.com": "2",
    ".cybotix.no": "2",
    "azure.microsoft.com": "1"

};

/**
 * Capturing complete URL will include the query string
 * This is desirable. However, it may also contain sensitive information, such as passwords.
 * Rules for redaction are therefore in place. These rules are applied to the query string only.
 *
 */

var redactionPatterns = [{
        pattern: /\/users\/[\w-]+/ig,
        replacement: '/users/[REDACTED]'
    }, {
        pattern: /(sessionToken|authToken|accessToken|sessionid)=\w+/ig,
        replacement: '$1=[REDACTED]'
    }, {
        pattern: /[\w.-]+@[\w.-]+\.\w+/ig,
        replacement: '[REDACTED]'
    }, {
        pattern: /(password|pwd|creditcard|ssn)=\w+/ig,
        replacement: '$1=[REDACTED]'
    }, {
        pattern: /(api_key|apikey|client_id|client_secret)=\w+/ig,
        replacement: '$1=[REDACTED]'
    }
];
function redactSensitiveInfo(url) {
    return redactionPatterns.reduce(
        (currentUrl, {
            pattern,
            replacement
        }) => currentUrl.replace(pattern, replacement),
        url);
}

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
        }).then(function (res) {
            // Call to upload 24 hours of browising history to the server, in order that the user may have some starting data to "play" with.
            // This data is subject to some immediate redactions, and will be automatically deleted within 72 hours.
            historyImport(24);
        });
        /* If installationUniqueId has not bee set in memory it means that this is a new installation.
        It also means there is no click history in the database for this installation.

        Take a look at the browser history to see if there is a click history there.
        If so, import 48 hours of it into the database. The user may then exclude/edit/remove as desired before engaging in any sharing.

         */

    } else {
        console.debug("installationUniqueId already set (" + result.installationUniqueId + ")");
        // as a temprary measure allways import the last xx hours of click history at every restart
        historyImport(4);
    }
});

// check of there has been set a lifetime value for clickdata if not, set it to 72 hours.

chrome.storage.local.get(["clickDataLifetimeHours"]).then(function (result) {
    if (result.clickDataLifetimeHours) {
        console.log("Value currently is SET " + result.clickDataLifetimeHours);

    } else {
        console.log("Value currently is NOT SET: " + result.clickDataLifetimeHours);
        chrome.storage.local.set({
            clickDataLifetimeHours: 72
        }).then(function (result) {
            console.log("Value is set to default");
        });
    }
});

/* This imports url from the browser history into the user's data account with Cybotix.
Once there the user may opt to share, redact or delete this data as my be appropriate.
This function is called only once: at initial the setup of the plugin.
 */
function historyImport(lastHours) {
    console.log("historyImport from the last " + lastHours + " hours");
    // Calculate the time 48 hours ago from now in milliseconds
    const millisecondsPerHour = 1000 * 60 * 60;
    const startTime = (new Date()).getTime() - (lastHours * millisecondsPerHour);

    console.log("timestampToEpochSeconds: " + timestampToEpochSeconds("Sun Nov 05 2023 15:49:57 GMT+0100 (Central European Standard Time)"));

    var installationUniqueId;

    chrome.storage.local.get(['installationUniqueId']).then(function (ins) {
        installationUniqueId = ins.installationUniqueId;

        // Search Chrome history
        chrome.history.search({
            'text': '', // empty string returns all history
            'startTime': startTime,
            'maxResults': 0 // return all results
        }, (historyItems) => {
            // Process the history items
            const historyDataPromises = historyItems.map(item => {
                    console.log(JSON.stringify(item));
                    // POST request for each history item
                    console.log(item.lastVisitTime);
                    console.log((convertTimestampToISO(item.lastVisitTime)).replace("T", " ").replace(/....Z$/, ""));

                    console.log(Math.round(item.lastVisitTime) + 72 * 60 * 60);
                    console.log(convertTimestampToISO(Math.round(item.lastVisitTime) + 72 * 60 * 60));

                    console.log((convertTimestampToISO(Math.round(item.lastVisitTime) + 72 * 60 * 60 * 1000)).replace("T", " ").replace(/....Z$/, ""));

                    const local_time = (convertTimestampToISO(item.lastVisitTime)).replace("T", " ").replace(/....Z$/, "");
                    const expiration = (convertTimestampToISO(Math.round(item.lastVisitTime) + 72 * 60 * 60 * 1000)).replace("T", " ").replace(/....Z$/, "");

                    addDataRow_time(item.url, local_time, expiration);

                    //              return fetch(server_url + URI_plugin_user_post_click, {
                    //                  method: 'POST',
                    //                  headers: {
                    //                      'Content-Type': 'application/json',
                    //                      [plugin_uuid_header_name]: installationUniqueId,
                    //                  },
                    //                  body: JSON.stringify({
                    //                      url: item.url,
                    //                      local_time: convertTimestamp(item.lastVisitTime)
                    //                   })
                    //               })
                    //                .then(response => response.json()) // parse JSON response
                    //               .catch(error => console.error('Error sending POST request:', error));
                });

            // Wait for all POST requests to complete
            Promise.all(historyDataPromises).then(results => {
                console.log('All history items have been sent', results);
            });
        });
    });
}

function timestampToEpochSeconds(timestamp) {
    // Create a Date object from the timestamp string
    const date = new Date(timestamp);

    // Get the Unix timestamp in milliseconds
    const unixTimestampMilliseconds = date.getTime();

    // Convert milliseconds to seconds
    const unixTimestampSeconds = Math.floor(unixTimestampMilliseconds / 1000);

    return unixTimestampSeconds;
}

function keyExists(key, obj) {
    return obj[key] !== undefined;
}

/* exclude from capture based on the domain name
// either a wholename match or a domain match

Passing the Fully Qualified DOmain nae of the URL to be checked

First check if the FQDN  is on the exclusion list.
Then check if the domain is on the exclusion list. With the domain name starting with a "." (dot)
 */
function isOnDomainCaptureExclusionList(FQDN) {
    var excluded = false;
    const list = getSuperiorDomains(FQDN);
    //console.log(list);

    for (const item of list) {
        // console.log(item);
        // console.log (item in domain_capture_exclusion_list);
        // console.log ( ("."+item) in domain_capture_exclusion_list);
        if ((item in domain_capture_exclusion_list) || ("." + item)in domain_capture_exclusion_list) {
            excluded = true;
            return excluded;
        }
    }
    return excluded
}

function getSuperiorDomains(fqdn) {
    const parts = fqdn.split('.');
    const superiorDomains = [];

    for (let i = 0; i < parts.length - 1; i++) {
        superiorDomains.push(parts.slice(i).join('.'));
    }
    return superiorDomains;
}

function isOnUrlCaptureExclusionList(url) {
    //return domain_capture_exclusion_list[key] !== undefined;
    return isUrlMatched(url, url_capture_exclusion_list);
}

function isUrlMatched(url, regexList) {
    return regexList.some(regex => regex.test(url));
}

/**
 * The protocol is not part of the pattern matching
 */
var url_capture_exclusion_list = [
    /porn/i, // regex to test if URL contains the word "porn" anywhere (case-insensitive)
    /[^\/]*xxx/i, // regex to test if domain contains "xxx" (case-insensitive)
    /sex/i, // regex to test if URL contains the word "sex" anywhere (case-insensitive)
    /www\.goooogle\.com/// regex to test if URL is 'www.goooogle.com'
];


function isExcluded(url) {
    var excluded = false;
    console.log("consider for possible exclusion the url: " + url );
    var domain = getDomainName(url);
    if (isOnDomainCaptureExclusionList(domain)) {
        excluded = true;
    } else {
        if (isOnUrlCaptureExclusionList(url)) {
            excluded = true;
        } else {}
    }
    //console.debug(url + " is excluded from capture: " + excluded );
    return excluded;
}


function getDomainName(url) {
    var domain = url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];
    return domain;
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
/*
Incomming http headers dictates what actions the plugin whould take

Any request must include the header X_HTTP_CYBOTIX_PLATFORM_TOKEN, containing a valid JWT token.
This is the platform token. and counts as the authentication mechanism for the plugin.
The platform token is checked, and if valid, the plugin will take action based on the other headers present.


The following headers are used by the plugin:

X_HTTP_CYBOTIX_DATA_REQUEST
This header is used to request data from the user. The header contains a JWT token,
This could come along with a third header, X_HTTP_CYBOTIX_QUERY_REDIRECT

 */
chrome.webRequest.onHeadersReceived.addListener(function (details) {
    // console.log('################################');
    // console.log('############## onHeadersReceived');
    // console.log('################################');
    // examine the http header for the X_HTTP_CYBOTIX_PLATFORM_TOKEN and if present, verify validity.
    // is so, check for other Cybotix headers and take action accordingly

    // if from a sub_frame, the answer must be sent back to the same sub_frame.
    //var frameId = details.frameId;
    console.log(details.type);

    if (details.type == "main_frame" || details.type == "sub_frame") {
        //console.log(JSON.stringify(details));
        console.log(details.url);

        var counterparty_id;
        var platformtokencontent;
        const h = details.responseHeaders;
        const headerNames = getHeaderNames(details.responseHeaders);
        //console.log('HTTP header names:', headerNames);
        // check for presence of cybotix headers and take appropriate action based on what additional headers are present

        if (headerNames.includes("X_HTTP_CYBOTIX_PLATFORM_TOKEN")) {

            const platformtoken = getNamedHeader(h, "X_HTTP_CYBOTIX_PLATFORM_TOKEN");
            console.log("### X_HTTP_CYBOTIX_PLATFORM_TOKEN: " + platformtoken);

            console.log(isJwtFormat(platformtoken));
            // validate the platform token overall structure - a very coarse-grained "sanity-check" to screen-out complete giberish
            if (validPlaformtokenJwtRegExp.test((platformtoken))) {
                console.log(platformtoken);
                getValidatedPlatformTokenPayload(platformtoken, false, false)
                .then(function (payload) {

                    platformtokencontent = payload;
                    console.log(platformtokencontent);

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
                                files: ["./content_scripts/redirect-script.js"],
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

                        /* this is the main request the plugin is concerned with:
                        Request for data. */

                    } else if (headerNames.includes("X_HTTP_CYBOTIX_DATA_REQUEST")) {
                        // this is a data request


                        console.log("has X_HTTP_CYBOTIX_DATA_REQUEST");
                        //console.log(data);
                        // set a switch for when it is time to get a close look at any possible data agreements.
                        // only do this is there is a valid request
                        var validrequest = false;
                        var activetab_id;
                        // the UUID of the requesting party.
                        counterparty_id = (JSON.parse(base642str(platformtokencontent.sub))).id;

                        // Another header is also required, X_HTTP_CYBOTIX_QUERY_REDIRECT, contaning the URL of where to send the response
                        // If this header is not present, the source URL is used. This is not recommended as it may lead to unexpected results.
                        var redir_target = details.url;
                        if (headerNames.includes("X_HTTP_CYBOTIX_QUERY_REDIRECT")) {
                            redir_target = getNamedHeader(h, "X_HTTP_CYBOTIX_QUERY_REDIRECT");
                            console.log("Browsersolutions: using the contents of X_HTTP_CYBOTIX_QUERY_REDIRECT (" + redir_target + ") as the redirect target");
                        }

                        const incoming_data_request_message = getNamedHeader(h, "X_HTTP_CYBOTIX_DATA_REQUEST");
                        console.debug("incoming_data_request_message: " + incoming_data_request_message);
                        // check if the message is propperly formated, using a JSON-schema validation operation
                        // if not, ignore the request
                        var request_payload;
                        const request = base64Decode(incoming_data_request_message);
                        console.debug(request);

                        console.debug(isValidJSON(request));
                        // check if request is a propperly formated piece of JSON
                        // if (isValidJSON(request)) {
                        //console.debug(isObjectEmpty(request));
                        request_payload = JSON.parse(request);
                        // if (req.requesttype == "clickhistory") {
                        console.debug("has valid requesttype");
                        validrequest = true;
                        //console.debug(req.requestdetails);


                        // check if the request has been granted before and if so, if it is still valid
                        // look up what agreements this requestor has with the user, if any.
                        console.debug("look for possible valid agreement already in place that might cover this data access request");
                        // call to the Cybotix API with the same two headers as above

                        try {
                            var installationUniqueId;
                            var data_access_token
                            var token;
                            chrome.storage.local.get(['installationUniqueId']).then(function (ins) {
                                installationUniqueId = ins.installationUniqueId;
                                const event = new Date();
                                const userid = "";
                                // Fetch data from web service (replace with your actual API endpoint)
                                return fetch(server_url + URI_plugin_user_check_request_against_data_agreements, {
                                    method: 'GET',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        [plugin_uuid_header_name]: installationUniqueId,
                                        'X_HTTP_CYBOTIX_DATA_REQUEST': getNamedHeader(h, "X_HTTP_CYBOTIX_DATA_REQUEST"),
                                        'X_HTTP_CYBOTIX_PLATFORM_TOKEN': getNamedHeader(h, "X_HTTP_CYBOTIX_PLATFORM_TOKEN")
                                    },
                                });
                            }).then(function (response) {
                                console.log(response);
                                // Parse JSON data
                                return response.json();
                            }).then(function (data) {
                                console.log(data);
                                console.log(data.covered);
                                var dataaccesstoken;
                                var history_data_dump;
                                if (data.covered == "true") {

                                    console.log("data request is covered by an existing agreement, create and issue a dataaccess token");
                                    // fork out of the promise chain here, move to issue the access token
                                    // call to the create-access-token API
                                    ({
                                        dataaccesstoken,
                                        history_data_dump
                                    } = newDataAccessToken(installationUniqueId, getNamedHeader(h, "X_HTTP_CYBOTIX_DATA_REQUEST"), details.tabId, details.frameId, redir_target, platformtoken));

                                } else {
                                    // there is no data agreement covering the request, prompt the user for one
                                    var prompt_id;
                                    chrome.scripting
                                    .executeScript({
                                        target: {
                                            tabId: details.tabId
                                        },
                                        files: ["./content_scripts/data_request_prompt.js"],
                                    }).then(function (response) {
                                        console.log(response);
                                        var user_prompt_data_request_acceptance_sharedsecret = "1235u6htetb5tb354b35b456";
                                        let guid = () => {
                                            let s4 = () => {
                                                return Math.floor((1 + Math.random()) * 0x10000)
                                                .toString(16)
                                                .substring(1);
                                            }
                                            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
                                        }
                                        prompt_id = guid();
                                        // accept this temporarily, but the original message must be stored in the datasbe for later
                                        // use when creating the agreement.
                                        // The uui is used as a correlation id betwwwn the original request and the one the user eventually agrees to.

                                        const message = {
                                            tabId: details.tabId,
                                            frameId: details.frameId,
                                            redir_target: redir_target,
                                            type: 'datarequest',
                                            secret: user_prompt_data_request_acceptance_sharedsecret,
                                            payload: request_payload,
                                            original_message: incoming_data_request_message,
                                            platformtoken: getNamedHeader(h, "X_HTTP_CYBOTIX_PLATFORM_TOKEN"),
                                            prompt_id: prompt_id
                                        };
                                        return chrome.tabs.sendMessage(details.tabId, message);
                                    }).then(function (response) {
                                        console.log('Message sent and response received:', response);
                                        if (chrome.runtime.lastError) {
                                            console.error(chrome.runtime.lastError);
                                            return;
                                        }

                                    }).catch(function (two) {
                                        console.log(two);
                                    });

                                }

                            });

                        } catch (error) {
                            console.error(error);
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

}, {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame"]
}, ['responseHeaders', 'extraHeaders']);

// listen to requests from the content script
// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    console.log("Received message from content script:", message);
    //    console.log("Received message from content script:", message.message);
    console.log("Received message from content script:", message.type);
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
    } else if (message.type == "local_pages_intercept") {
        // redirect an external link to the GUI page
        if (message.redirect) {
            // The URL inside the plugin (e.g., an HTML file)
            const pluginURL = chrome.runtime.getURL(message.uri);
            chrome.tabs.update(sender.tab.id, {
                url: pluginURL
            });
        }
    } else if (message.type == "delete_click") {
        var installationUniqueId; // = await chrome.storage.local.get(['installationUniqueId']);

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;

            del_mess = {
                browserid: installationUniqueId
            }

        });
    } else if (message.type == "set_click_data_expiration_period") {
        var installationUniqueId; // = await chrome.storage.local.get(['installationUniqueId']);

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;

            del_mess = {
                browserid: installationUniqueId
            }

            //          # set expiration time for click data (set expiration time to be equal to the utc timestamp plus the provided value)

            const lifetime_message = {
                "days": message.selectedDayCount,
                "hours": 0
            }
            console.log(lifetime_message);
            return fetch(server_url + URI_plugin_user_set_clickdata_lifetime, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: installationUniqueId
                },
                body: JSON.stringify(lifetime_message) // example IDs, replace as necessary
            });

        });

        return true;
    } else if (message.type == "suspendAllDataAgreements") {
        console.log("suspendAllDataAgreements");
        var installationUniqueId; // = await chrome.storage.local.get(['installationUniqueId']);

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;
            console.log(message.details);

            //          # set expiration time for click data (set expiration time to be equal to the utc timestamp plus the provided value)

            //const suspend_message = [{  "agreementid":"894e89f3-b3a3-4d02-8833-39019b179df3", "agreementid":"e03164d9-e74d-4a0d-a9ac-8e35f0b2c50e"}]

            //console.log(suspend_message);
            return fetch(server_url + URL_plugin_user_deactivate_agreements, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: installationUniqueId
                },
                body: JSON.stringify(message.details)
            });

        });

        return true;
    } else if (message.type == "activateAllDataAgreements") {
        console.log("activateAllDataAgreements");
        var installationUniqueId; // = await chrome.storage.local.get(['installationUniqueId']);

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;
            console.log(message.details);

            //          # set expiration time for click data (set expiration time to be equal to the utc timestamp plus the provided value)

            //const suspend_message = [{  "agreementid":"894e89f3-b3a3-4d02-8833-39019b179df3", "agreementid":"e03164d9-e74d-4a0d-a9ac-8e35f0b2c50e"}]

            //console.log(suspend_message);
            return fetch(server_url + URL_plugin_user_activate_agreements, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: installationUniqueId
                },
                body: JSON.stringify(message.details)
            });

        });

        return true;

    } else if (message.type == "deleteAccount") {
        console.log("deleteAccount");
        // deletes the account and all account data
        // This action removes the user from the Cybotix platform
        // The user can be completely restored from backup data
        var installationUniqueId;

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;

            del_mess = {
                browserid: installationUniqueId
            }

            // Fetch data from web service (replace with your actual API endpoint)

            return fetch(server_url + URI_plugin_user_delete_account, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: installationUniqueId
                },
                body: JSON.stringify(del_mess) // example IDs, replace as necessary
            });
        }).then(function (response) {
            console.log(response);

            // Check for errors
            try {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (err) {
                console.log(err);
            }
        });

    } else if (message.type == "deleteAccountData") {
        console.log("deleteAccountData");
        // deletes all account data
        // This action removes the user's data from the Cybotix platform
        // The user's data can be completely restored from backup data
        var installationUniqueId;

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;

            del_mess = {
                browserid: installationUniqueId
            }

            // Fetch data from web service (replace with your actual API endpoint)

            return fetch(server_url + URI_plugin_user_delete_account, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: installationUniqueId
                },
                body: JSON.stringify(del_mess) // example IDs, replace as necessary
            });
        }).then(function (response) {
            console.log(response);

            // Check for errors
            try {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (err) {
                console.log(err);
            }
        });
    } else if (message.type == "deleteAllClickData") {
        console.log("deleteAllClickData");
        // deletes all click history data
     
        var installationUniqueId;

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;

            del_mess = {
                browserid: installationUniqueId
            }

            // Fetch data from web service (replace with your actual API endpoint)

            return fetch(server_url + URL_plugin_user_delete_all_clickdata, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: installationUniqueId
                },
               
            });
        }).then(function (response) {
            console.log(response);

            // Check for errors
            try {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (err) {
                console.log(err);
            }
        });
    } else if (message.type == "deleteExpiredClickData") {
        console.log("deleteExpiredClickData");
        // deletes all expired click data
    
        var installationUniqueId;

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;

            // Create a Date object
            const date = new Date();
            const local_time = date.toISOString(); 
            del_mess = {
                local_time: local_time
            }

            // Fetch data from web service (replace with your actual API endpoint)

            return fetch(server_url + URI_plugin_user_delete_expired_clickdata, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: installationUniqueId
                },
                body: JSON.stringify(del_mess) 
               
            });
        }).then(function (response) {
            console.log(response);

            // Check for errors
            try {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (err) {
                console.log(err);
            }
        });

    } else if (message.type == "importData") {
        console.log("importData");
        console.log(message.data);

        var installationUniqueId; // = await chrome.storage.local.get(['installationUniqueId']);

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;

            // Fetch data from web service (replace with your actual API endpoint)

            return fetch(server_url + URI_plugin_user_import, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: installationUniqueId
                },
                body: JSON.stringify(message.data) // example IDs, replace as necessary
            });
        }).then(function (response) {
            console.log(response);

            // Check for errors
            try {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (err) {
                console.log(err);
            }
        });

        // Handle the imported data
        //message.data.forEach(obj => {


        //const url = determineUrl(obj); // Implement this function based on your logic
        //doPostRequest(obj, url);
        //});
        return true;

    } else if (message.type == "startBackup") {
        console.log("startBackup");
        //var installationUniqueId = "6596c84b-544c-98e3-6ce2-8ccc1b334055"; // = await chrome.storage.local.get(['installationUniqueId']);
        var installationUniqueId; // = await chrome.storage.local.get(['installationUniqueId']);
        chrome.storage.local.get(['installationUniqueId']).then(function (ins) {
            installationUniqueId = ins.installationUniqueId;

            const urls = message.urls;
            const all_urls = [{
                    url: server_url + plugin_user_get_all_clicks,
                    method: 'GET',
                    tag: "clickhistory"
                }, {
                    url: server_url + plugin_user_read_all_data_agreements,
                    method: 'GET',
                    tag: "data_agreements"
                }
            ];
            const backupData = [];

            // Perform all POST requests
            //Promise.all(urls.map(url => doGetRequest(url, message.data, installationUniqueId)))
            Promise.all(all_urls.map(endpoint => doGetRequest(endpoint.url, message.data, installationUniqueId, endpoint.tag)))
            .then(results => {
                console.log('All requests completed');
                console.log(JSON.stringify(results));

                // Create an object to hold the transformed data
                const transformedData = {};
                // Iterate over each element in the results array
                results.forEach(item => {
                    // For each property in the item, add it to the transformed data
                    for (const[key, value]of Object.entries(item)) {
                        // Assume each key is the type of data and value is an array of data items
                        // Ensure the key exists in the transformedData object
                        transformedData[key] = transformedData[key] || [];

                        // Concatenate the current array of data to the existing array
                        // Use spread operator to create a new array combining both
                        transformedData[key] = [...transformedData[key], ...value];
                    }
                });

                // Process results and send them back to the popup script
                console.log(JSON.stringify(transformedData));
                sendResponse({
                    backupData: transformedData
                });
            })
            .catch(error => {
                console.error('Error during backup:', error);
                sendResponse({
                    error: 'Backup failed'
                });
            });
        });
        // Return true to indicate an asynchronous response
        return true;

    } else if (message.type == "accept_single_datarequest") {
        /** The user has accpeted the agreement in the popup form
         * Save the agreement in the database an issue a data access token to the requesting party
         */
        console.log("Received message from content script:", message);
        console.log(message.agreement_details);
        console.log("Received message from content script:", sender);
        // create agreement in database
        console.log(message.agreement_details.original_message);

        console.log(base642str(message.agreement_details.original_message));
        console.log(JSON.parse(base642str(message.agreement_details.original_message)));
        console.log((JSON.parse(base642str(message.agreement_details.original_message))).requests);

        // include the original agreement request
        // lookup values from the platform token
        //console.log(details);
        var data_grants = (JSON.parse(base642str(message.agreement_details.original_message))).requests;
        console.log(data_grants);

        var notbefore = message.agreement_details.restrictions.notbefore;
        console.log("notbefore")
        console.log(notbefore)
        console.log((notbefore == ""))

        if (notbefore == "") {
            notbefore = new Date();
        }
        var notafter = message.agreement_details.restrictions.notafter;
        console.log("notafter: " + notafter);
        console.log(notafter);

        if (notafter == "") {
            notafter = new Date();
            const days = message.agreement_details.restrictions.days;
            if (!Number.isInteger(days)) {
                throw new Error('The days parameter must be an integer.');
            }
            const hours = message.agreement_details.restrictions.hours;
            if (!Number.isInteger(hours)) {
                throw new Error('The hours parameter must be an integer.');
            }
            let currentDate = new Date();

            // Adding days
            currentDate.setDate(currentDate.getDate() + days);

            // Adding hours
            currentDate.setHours(currentDate.getHours() + hours);

        }

        // Use notbefore and notafter is available, if not
        // use now() plus days and hours

        var agreement = {
            principal_name: "2342",
            principal_id: "2342",
            counterparty_name: "Web Shop Inc.",
            counterparty_id: "65232",
            platformtoken: message.agreement_details.platformtoken,
            data_grants: data_grants,
            notbefore: notbefore,
            notafter: notafter,
            original_request: message.agreement_details.original_message
        };
        console.log(agreement);

        // store the agreement in the database

        var installationUniqueId; // = await chrome.storage.local.get(['installationUniqueId']);

        chrome.storage.local.get(['installationUniqueId']).then(function (result) {
            //installationUniqueId = result;
            console.log(result);

            installationUniqueId = result.installationUniqueId;

            const event = new Date();

            const userid = "";
            //console.log("deleting: " + id);
            const message_body = JSON.stringify(agreement);
            console.log("adding data agreement: " + message_body);
            // Fetch data from web service (replace with your actual API endpoint)

            return fetch(server_url + URI_plugin_user_add_data_agreement, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [plugin_uuid_header_name]: installationUniqueId
                },
                body: message_body // example IDs, replace as necessary
            });
        }).then(function (response) {
            console.log(response);

            // Check for errors
            try {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (err) {
                console.log(err);
            }

            // there has now been created a data agreement, issue a data access token
            console.log("a data agreement has now been created, issue a data access token");

            // consider this for later revision. The requestor should be able to get this data in in a separate request.
            // to the data base and get the data the token gets access to, and send that along as well.
            // this function calls a new content scipt on the page and dispatech the data to the URL provided in the original request from the requestor
            ({
                dataaccesstoken,
                history_data_dump
            } = newDataAccessToken(installationUniqueId, message.agreement_details.original_message, message.agreement_details.tabId, message.agreement_details.frameId, message.agreement_details.redir_target, message.agreement_details.platformtoken));
            console.log({
                dataaccesstoken,
                history_data_dump
            });
            // Data and token have been dispatched at this point
            // Return to the content script that presented the "popup" to the user.
            console.log("responding back to content script");
            sendResponse({
                type: "acknowledgment",
                payload: "ack from background script"
            });

        });
    }
    // return true, to make calls from content scripts wait.
    return true;
});

// This function handles the GET request for a given URL and returns a Promise
function doGetRequest(url, data, installationUniqueId, keyName) {
    console.log("doGetRequest");
    console.log(keyName);
    return new Promise(function (resolve, reject) {

        var index = 1;
        return fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                [plugin_uuid_header_name]: installationUniqueId
                // Add any other necessary headers
            },
        }).then(function (response) {

            return response.json();

        }).then(function (result) {

            resolve({
                [keyName]: result
            });
        });
    });
}

/* create data access token
Send it to the requestor by way of a contentscript that dispatces it
 */

function newDataAccessToken(installationUniqueId, data_request, tabId, frameId, redir_target, platformtoken) {
    console.log("newFunction");
    console.log(installationUniqueId);

    console.log(redir_target);
    console.log(platformtoken);
    console.log(data_request);
    console.log(tabId);
    var history_data_dump;
    var dataaccesstoken;
    return new Promise(function (resolve, reject) {

        fetch(server_url + URI_plugin_user_create_dataaccess_token, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                [plugin_uuid_header_name]: installationUniqueId,
                'X_HTTP_CYBOTIX_DATA_REQUEST': data_request,
                'X_HTTP_CYBOTIX_PLATFORM_TOKEN': platformtoken,
                'X_HTTP_CYBOTIX_DATA_RESTRICTIONS': "bnVsbAo="
            },
        }).then(function (response) {
            console.log(response);
            return response.json();
        }).then(function (data) {
            //console.log(data);
            console.log("have data accesstoken: " + data.dataaccesstoken);
            dataaccesstoken = data.dataaccesstoken;

            // call the local history API to get the data.
            // retrieve the time limites from the data request and data tokens
            const grants = getGrantsFromDataAccessToken(dataaccesstoken);
            console.log(grants);

            //return getSearchHistoryForItems(grants);
            return getClickHistoryForItems(grants, dataaccesstoken, platformtoken, data_request);

        }).then(function (historyItems) {
            console.log(historyItems);
            try {
                history_data_dump = filterKeysFromArray(historyItems, ['url', 'local_time', 'utc']);
                //        history_data_dump = historyItems;
            } catch (err) {
                // likely no data was returned
                history_data_dump = [];
            }

            // issue a redirect to the target URL, with the token as a parameter
            // send a messate back to the content script to issue the redirect
            return chrome.scripting
            .executeScript({
                target: {
                    tabId: Number(tabId),
                    frameIds: [Number(frameId)]
                },
                files: ["./content_scripts/send-data-access-token.js"],
            });
        }).then(function (response) {
            console.log(response);

            const message = {
                tabId: Number(tabId),
                frameId: Number(frameId),
                frameIds: [Number(frameId)],
                type: 'data_access_token',
                payload: 'Hello from background script to issue a redirect with payload.',
                newurl: redir_target,
                headername: "X_HTTP_CYBOTIX_HAVE_PLUGIN",
                headervalue: "true",
                datarequest: data_request,
                platformtoken: platformtoken,
                dataaccesstoken: dataaccesstoken,
                redir_target: redir_target,
                history_data: history_data_dump
            };
            console.log(message);

            return chrome.tabs.sendMessage(Number(tabId), {
                frameId: Number(frameId),
                message: message
            });
        }).then(function (response) {
            console.log('Message sent and response received:', response);

            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }

        }).catch(function (two) {
            console.log(two);
        });
        resolve({
            dataaccesstoken,
            history_data_dump
        });
    });
}

function getSearchHistoryForItems(data) {
    console.log("getSearchHistoryForItems");
    return new Promise((resolve, reject) => {
        const promises = data.map(item => {
                const timeValue = item.requestdetails.time;
                const filter = item.requestdetails.filter;
                const[, num, unit] = timeValue.match(/now-(\d+)([a-z]+)/) || [];
                let milliseconds;
                switch (unit) {
                case 'sec':
                    milliseconds = num * 1000;
                    break;
                case 'min':
                    milliseconds = num * 60 * 1000;
                    break;
                case 'hr':
                    milliseconds = num * 60 * 60 * 1000;
                    break;
                default:
                    return reject(new Error('Unknown time unit'));
                }
                const now = Date.now();
                const lowerLimit = (now - milliseconds); // Convert to seconds
                const upperLimit = now; // Convert to seconds
                console.log("lowerLimit: " + lowerLimit);
                console.log("upperLimit: " + upperLimit);
                console.log("filter: " + filter);

                //return searchHistory(lowerLimit, upperLimit, item.requestdetails.filter);

                //return searchHistory({
                //    text: '',
                //     startTime: lowerLimit,
                //     endTime: upperLimit,
                //     maxResults: 200
                // });
                return filterHistory(lowerLimit, upperLimit, filter);
            });

        // Wait for all promises to complete and combine their results
        Promise.all(promises).then(results => {
            console.log(results.flat());

            resolve(results.flat());
        }).catch(error => {
            reject(error);
        });
    });
}

//
// URL_plugin_data_interface
// search click history
// this is the call the dataaccess token recipients will do themselves.
function getClickHistoryForItems(grants, dataaccesstoken, platformtoken, datarequest) {
    console.log("getClickHistoryForItems");
    console.log(grants);
    console.log(dataaccesstoken);
    console.log(base64urlDecode(dataaccesstoken.split('.')[1]));
    console.log(platformtoken);
    console.log(datarequest);
    console.log(base64Decode(datarequest));

    return new Promise((resolve, reject) => {

        const headers = {
            'X_HTTP_CYBOTIX_DATA_ACCESSTOKEN': dataaccesstoken,
            'User-Agent': 'Node.js/14.0',
            'X_HTTP_CYBOTIX_PLATFORM_TOKEN': platformtoken,
            'X_HTTP_CYBOTIX_DATA_REQUEST': datarequest
        }

        fetch(server_url + URL_plugin_data_interface, {
            method: 'GET',
            headers: headers,

        }).then(function (data) {
            console.log(data);
            resolve(data.json());

        });

    });
}

function filterHistory(startTime, endTime, pattern) {
    return new Promise((resolve, reject) => {
        chrome.history.search({
            text: '',
            startTime: startTime,
            endTime: endTime,
            maxResults: 1000
        }, function (items) {
            // If chrome.runtime.lastError exists, it means there was an error
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
                return;
            }

            const regex = new RegExp(pattern);
            const filteredItems = items.filter(item => regex.test(item.url));

            resolve(filteredItems);
        });
    });
}

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
/* Ìs this needed ?
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
*/

function getGrantsFromDataAccessToken(token) {
    console.log("getGrantsFromDataAccessToken");
    const res = (JSON.parse(base642str((JSON.parse(base642str(token.replace(/-/g, '+').replace(/_/g, '/').split('.')[1]))).grant))).grants;
    console.log(res);
    return res;

}

function verifyJwt3(token, publicKey) {
    console.log("verifyJwt");

    const[headerB64, payloadB64, signatureB64] = token.split('.');
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));
    const signatureUint8Array = urlBase64ToUint8Array(signatureB64);
    const signedContent = str2ab(headerB64 + '.' + payloadB64);
    console.log(signedContent);
    // Convert PEM to JWK (JSON Web Key)
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = publicKey.substring(pemHeader.length, publicKey.length - pemFooter.length).replace(/\s+/g, '');
    const binaryDerString = atob(pemContents);
    const binaryDer = str2ab(binaryDerString);

    return crypto.subtle.importKey(
        "spki",
        binaryDer, {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
    },
        true,
        ["verify"])
    .then(function (cryptoKey) {
        console.log(cryptoKey);
        return crypto.subtle.verify({
            name: "RSASSA-PKCS1-v1_5",
        },
            cryptoKey,
            signatureUint8Array,
            signedContent);
    })
    .then(isValid => {
        if (isValid) {
            return payload;
        } else {
            throw new Error('Invalid JWT signature.');
        }
    });
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/*
The following function is used to validate the platform token

Running in the browser is not a secure environement.
So checking whether or not the token has been temapered with (the signature check) is not going to be completely reliable.
In abition, this check has presented som considerable codein difficulties.
So for now, skip this the signture check by default.

In anycase the platform token is checked again on the server,
so not much use could be effected by a an expired token or onw that has been tampered with.


Optionally check the JWT signature, and whether or not the token has been revoked
 */
function getValidatedPlatformTokenPayload(rawPlatformToken, checkSign, CheckRevocation) {

    return new Promise(function (resolve, reject) {
        try {

            //     const token = rawPlatformToken.replace(/-/g, '+').replace(/_/g, '/');
            const token = rawPlatformToken;
            /*
            Do basic "sanity"-check on the JWT holding the platform token
            That it is of an appropriate length and that it is base64 encoded, and has the right number of delimiters
             */
            function isPlatformTokenRawStructureValid(token) {
                console.debug("isPlatformTokenStructureValid");
                if (validPlaformtokenJwtRegExp.test(token)) {
                    return true
                } else {
                    return false;
                }
            }

            // look for a endpoint (url) for token revocation in the JWT itself
            function checkTokenRevokationIfRevocationEndPointIsPresent(tokenPayload) {
                return false;
            }

            function decodedPlatformtokenSignatureValid(token) {
                try {
                    console.debug("isPlatformtokenSignatureValid");
                    console.debug("isPlatformtokenSignatureValid, validating: " + token);
                    const cybotixPublicKey = config.signature_validation_key;
                    console.debug("isPlatformtokenSignatureValid, using: " + cybotixPublicKey);
                    // Verify the token

                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, cybotixPublicKey, {
                            algorithms: ['ES256']
                        });
                    console.log("decoded");
                    console.log(decoded);
                    return decoded;
                } catch (e) {
                    console.log(e);
                    return false;
                }
            }

            function isPlatformTokenPayloadDataValid(platform_token_payload) {
                console.log("isPlatformTokenPayloadDataValid");
                // check platform token issue and audience
                console.log(JSON.stringify(config));
                console.log(config.platform_tokens);

                console.log(config.platform_tokens.accepted_audiences);
                console.log(config.platform_tokens.accepted_issuers);
                console.log(platform_token_payload);

                console.log("iss: " + platform_token_payload.iss);
                console.log("iss accept: " + (platform_token_payload.iss in config.platform_tokens.accepted_issuers));
                console.log("sub: " + platform_token_payload.sub);
                console.log("aud: " + platform_token_payload.aud);
                console.log("aud accept: " + (platform_token_payload.aud in config.platform_tokens.accepted_audiences));
                const now = Math.floor(Date.now() / 1000);
                console.log("now: " + now);

                console.log("exp: " + platform_token_payload.exp);
                console.log("exp accept: " + (now <= platform_token_payload.exp));
                console.log("nbf: " + platform_token_payload.nbf);
                console.log("nbf accept: " + (now >= platform_token_payload.nbf));

                if (platform_token_payload.iss in config.platform_tokens.accepted_issuers &&
                    platform_token_payload.aud in config.platform_tokens.accepted_audiences &&
                    now <= platform_token_payload.exp &&
                    now >= platform_token_payload.nbf) {
                    return true;
                } else {
                    return false;
                }
            }

            if (isPlatformTokenRawStructureValid(token)) {
                console.log("isPlatformTokenRawStructureValid=true");
                //verifySignature(token.replace(/-/g, '+').replace(/_/g, '/').split('.')[0] ,token.replace(/-/g, '+').replace(/_/g, '/').split('.')[1] ,token.replace(/-/g, '+').replace(/_/g, '/').split('.')[2], "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEJtdG5CNDrDFkgBrpVXYnzM+vv09q\nATno9Wd954UM62R0bov15Z1c8fVODhtxZu+7viimjwVXiHlZLYdjj0WY2g==\n-----END PUBLIC KEY-----").
                if (checkSign) {
                    console.log("checkSign=true");
                    verifyJwt3(token.replace(/-/g, '+').replace(/_/g, '/'), "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEJtdG5CNDrDFkgBrpVXYnzM+vv09q\nATno9Wd954UM62R0bov15Z1c8fVODhtxZu+7viimjwVXiHlZLYdjj0WY2g==\n-----END PUBLIC KEY-----")

                    .then(function (data) {
                        console.log(data);

                        const platformTokenPayload = decodedPlatformtokenPayload(token);
                        console.log("platformTokenPayload");
                        console.log(platformTokenPayload);
                        if (platformTokenPayload) {
                            console.log("signature is valid and content is decoded as: " + platformTokenPayload);

                            // check the content of the platform token
                            if (isPlatformTokenPayloadDataValid(platformTokenPayload)) {
                                if (checkTokenRevokationIfRevocationEndPointIsPresent) {
                                    // look for token revocation endpoint in the JWT itself

                                } else {

                                    resolve(platformTokenPayload);
                                }
                            } else {
                                console.log("invalid platform token content");
                                resolve(false);
                            }

                        } else {
                            console.log("3.8. platform token signature invalid");
                            //return res.status(401).json({ error: 'Invalid platform token signature' });
                        }
                        console.log(data);
                    });
                } else {
                    console.log("checkSign=false");
                    const platformTokenPayload = decodedPlatformtokenPayload(token);

                    console.log("platformTokenPayload");
                    console.log(platformTokenPayload);

                    if (platformTokenPayload) {
                        console.log("payload: " + platformTokenPayload);

                        // check the content of the platform token
                        if (isPlatformTokenPayloadDataValid(platformTokenPayload)) {
                            if (checkTokenRevokationIfRevocationEndPointIsPresent(platformTokenPayload)) {
                                // look for token revocation endpoint in the JWT itself

                            } else {

                                resolve(platformTokenPayload);
                            }
                        } else {
                            console.log("invalid platform token content");
                            resolve(false);
                        }

                    }
                }

            } else {
                console.log("invalid platform token structure");
                resolve(false);
            }

        } catch (e) {
            console.log(e);
            reject(false);
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
            const encodedSignature = new Uint8Array(Array.from(atob(signature), c => c.charCodeAt(0)));

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

// overall strcuture of platformtoken JWT - to filter out obvious fakes and/or attempts to overflow the system
const validPlaformtokenJwtRegExp = /^[A-Za-z0-9-_]{10,200}=*\.[A-Za-z0-9-_]{50,2000}=*\.[A-Za-z0-9-_]{50,500}=*$/;

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

/* check if the data purporint to be a JWT token conform to the minimum requirements
NOTE: the date is expected to be URI encoded ( )

.replace(/\+/g, '-')
.replace(/\//g, '_')
.replace(/=+$/, '');

base62 encoding can end in =, which is not URI encoded, but these equalsigns are not expected to be present in the token.
However, they are permitted here.
 */

function isJwtFormat(str) {
    return validPlaformtokenJwtRegExp.test(str);
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

/*
Returns the object of json of the JWT token payload, without validating the signature or performing any other checks apart from well-formedness
Use with caustion
 */
function decodedPlatformtokenPayload(token) {
    console.debug("decodedPlatformtokenPayload");

    try {
        payload = JSON.parse(base64Decode(token.replace(/-/g, '+').replace(/_/g, '/').split('.')[1]));
        return payload;
    } catch (e) {
        console.log(e);
        return false;
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
    possibleClickCapture, {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame"]
},
    ["extraHeaders", "requestHeaders"]);


    function possibleClickCapture(e) {
        console.log("type: "+(e.type));

    if (e.type == "main_frame") {
        // capture this request
        // send to server

        console.log("### capture url: " + e.url);
        //    console.log(JSON.stringify(details));
        console.log("capture DEBUG,calling addDataRow");

        // stor the url in the database
         addDataRow(e.url).then(function( res){
            console.log("addDataRow result: " + res);
         });
    }

    // Only a limited set of request types are of interest here.
    // Personal data should be be captured in the narrowest possible way consitent with achieving desired functionality.
    // Maintain adequate logging so that advanced users can see what is being captured and transmitted.

    // The plugin GUI likewise gives access to the captured data on the server-side and allows for immediate deletion.

    // Captured data is by default deleted after 7 days.
        return {  };
}


function addDataRow(url) {
    console.debug("addDataRow");
    return new Promise((resolve, reject) => {
    // get lifetime  from system settings

    var clickDataLifetimeHours; // = await chrome.storage.local.get(['clickDataLifetimeHours']);
    chrome.storage.local.get(['clickDataLifetimeHours'])
    .then(function (result) {
        console.log(result);
        clickDataLifetimeHours = result.clickDataLifetimeHours;
console.log(clickDataLifetimeHours);
    

        // Create a Date object
        const date = new Date();
console.log(date);
    // Convert to ISO 8601 format


        const local_time = date.toISOString(); 
        //console.log();


        const expiration = convertTimestamp(date.getTime() + (clickDataLifetimeHours * 60 * 60 * 1000));

        return addDataRow_time(url, local_time, expiration);
    }).then(data => {
        console.log(data);
        resolve(data); // Resolve the Promise with the data
    }).catch(error => {
        console.error(error);
    });
    
});

}

function addDataRow_time(url, local_time, expiration) {
    return new Promise((resolve, reject) => {
        console.debug("addDataRow_time");

        let domain = url.replace(/.*\:\/\/([^:\/]*)[:\/].*/, "$1");
        console.debug("DEBUG, capture addDataRow, domain: " + domain);

        if (!isExcluded(domain)) {
            chrome.storage.local.get(['installationUniqueId'])
                .then(installationUniqueId => {
                    console.log(installationUniqueId);
                    const browser_id = installationUniqueId.installationUniqueId;
                    const event = new Date();
                    const userid = "";

                    const message_body = {
                        url: redactSensitiveInfo(url),
                        local_time: local_time,
                        expiration: expiration
                    };

                    console.log("DEBUG" + JSON.stringify(message_body));

                    return fetch(server_url + URI_plugin_user_post_click, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            [plugin_uuid_header_name]: browser_id
                        },
                        body: JSON.stringify(message_body)
                    });
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    resolve(data); // Resolve the Promise with the data
                })
                .catch(error => {
                    console.error(error);
                    reject(error); // Reject the Promise on error
                });
        } else {
            console.debug("DEBUG,skipping capture of url" + url);
            resolve(null); // Resolve with null if url is excluded
        }
    });
}



function convertTimestamp(milliseconds) {
    // Create a new Date object from the milliseconds
    const date = new Date(milliseconds);

    // Convert to ISO string and remove milliseconds and 'Z'
    const isoStringWithoutMs = date.toISOString().replace(/\.\d{3}Z$/, '');

    return isoStringWithoutMs;
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

/* iterate through a array of JSON objects. for each object, remove all keys not on a whitelist*/
function filterKeysFromArray(jsonArray, whitelist) {
    return jsonArray.map(item => {
        let filteredItem = {};
        whitelist.forEach(key => {
            if (item.hasOwnProperty(key)) {
                // pass
                console.log("pass key: " + key)
                filteredItem[key] = item[key];
            }
        });
        console.log(filteredItem);
        return filteredItem;
    });
}

function convertTimestampToISO(timestamp) {
    // Round the timestamp to remove fractional milliseconds
    const roundedTimestamp = Math.round(timestamp);

    // Create a Date object
    const date = new Date(roundedTimestamp);

    // Convert to ISO 8601 format
    return date.toISOString();
}
