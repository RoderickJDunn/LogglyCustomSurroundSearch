/*
    This extension is specifically for use with Loggly. Clicking this extension's button will execute the "ViewSurroundingEvents" 
    functionality, but keep all filters except the last one added.
*/


/*
OnMessage from contentScript 
 - sends message here once the surEvnts tab has opened, and user has submitted customizations
 - the message contains the search text and filters (hosts, apps, etc) (which may have been altered)
 - get url of current tab (chrome.tab...)
 - alter url by adding the search text and filters
*/

// chrome.browserAction.onClicked.addListener(function(tab) {
//   chrome.tabs.executeScript({
//     code: 'document.body.style.backgroundColor="red"'
//   });
// });


//"https://piper.loggly.com/search#terms=syslog.host%3A%22tv2%22&from=2016-06-26T17%3A04%3A21.745Z&until=2016-06-26T17%3A14%3A07.745Z&source_group="
// "https://piper.loggly.com/search#terms=syslog.host%3A%22tv2%22&from=2016-06-26T17%3A04%3A21.745Z&until=2016-06-26T17%3A14%3A07.745Z&source_group="

// var filter = {urls: ["https://piper.loggly.com/*"]};
// chrome.webRequest.onBeforeSendHeaders.addListener(
//         function(details){
//            console.info("WebRequest onBeforeSendHeaders");
//            console.info(details.url);
            
//            for (var i = 0; i < details.requestHeaders.length; ++i) {
//                console.info(details.requestHeaders[i].name + ": " + details.requestHeaders[i].value);
//             if (details.requestHeaders[i].name === 'User-Agent') {
//               details.requestHeaders.splice(i, 1);
//               break;
//             }
//           }
//           return {requestHeaders: details.requestHeaders};
//         }, filter, ["blocking", "requestHeaders"]);

// chrome.webRequest.onCompleted.addListener(
//         function(details){
//             console.debug("WebRequest onCompleted");
//             //printDetails(details, /((tab)+|(event)+|(surround)+|(view)+)/);
//             printDetails(details, /source_group/);
//         }, filter);

// function printDetails(details, matchStringInUrl) {
//     console.debug("--------");
//     if (details["url"].match(matchStringInUrl)) {
//         console.info("URL-match" + ":" + details["url"]);
//         console.info(details["url"].match(matchStringInUrl));
//     }
// }
// chrome.webNavigation.onCompleted.addListener(
//         function(details){
//             console.info("WebNavigation onCompleted");
//         }, filter);

/* Runs when extension first starts ***************************/

//chrome.windows.onFocusChanged.addListener(updateMenu);

// chrome.contextMenus.create({
//   "title": "Print Data",
//   "contexts": ["browser_action"],
//   "onclick": printAllData
// });


/* Utility Functions ***************************/

function getCurrentTab(callback) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
        var tab = tabs[0];
        callback(tab);
    });
}


/* **************** */




/* Menu functionality ***************************/

// Return function for onClick event in right-click menu
// function tabOpenerFunction (windowId) {
//     // How did this become a string. 
//     if (typeof windowId == "string") windowId = parseInt(windowId);

//     return function (onClickEvent) {
//         var url = onClickEvent.linkUrl;

//         chrome.tabs.create({
//             'windowId': windowId,
//             'url': url,
//             'active': false
//         });
//     };
// }

// // Populate right-click menu
// function updateMenu (focusChangedEvent) {
//     chrome.contextMenus.removeAll(function () {
//         console.log("update menu");
//         console.log(Object.keys(windowIdByLabel));
//         console.log(Object.keys(windowLabelById));
//         console.log(windowIdByLabel);
//         console.log(windowLabelById);
//         var windowNames = getAllWindowNames();
//         if (windowNames.length > 0) {
//             var mainMenu = chrome.contextMenus.create({
//                 title: 'Open specific window',
//                 contexts: ['browser_action']
//             });

//             for (var i = 0; i < windowNames.length; i++) {
//                 chrome.contextMenus.create({
//                     title: windowNames[i],
//                     contexts: ['browser_action'],
//                     onclick: tabOpenerFunction(i),
//                     parentId: mainMenu
//                 });
//             }
//         }
//     });
// }


/* **************** */



/* DEV ONLY - Print all data to console ***************************/
function printAllData() {
    // console.log("Window-Url Pairs---------");
    // console.log(cachedWindowUrlPairs);
    // //console.log("Urls for current window ---------");
    // console.log("WindowID-label");
    // console.log(windowLabelById);
    
    // console.log("WindowLabel-id");
    // console.log(windowIdByLabel);
}