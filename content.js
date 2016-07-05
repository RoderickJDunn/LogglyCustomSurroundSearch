// TODO: Scroll to exact event within 50-event container
// TODO: Wait to scroll - only start scrolling once the events-list contains >0 children
// TODO: add rest of search popup functionality (search text and filters)
// TODO: may need to append the content_script URL in manifest with "search", so that it only runs in the search page of Loggly
// TODO (nice-to-have): Add 'highlight' feature: rather than just filtering out unimportant logs, highlight the important ones
// TODO (nice-to-have): Double-Click on the timeline, auto-scroll to that time in the events list
// TODO (nice-to-have): Auto-Scroll functionality only works if events are sorted in decending (newest-oldest) order

console.log("hello");

var contentsOfAllLogglyTabs = document.getElementsByClassName("search-content-loaded ng-scope");

/* The main area contents for the active Loggly tab */
var activeContents; 
var searchText;
var searchedHosts; 
var filteredHosts;

/* If both these flags are true we can stop repeating the function, and go ahead with the Search Modifications */
var surrBtnFlag = false;
var surrTabFlag = false;
var surrTabId = -1;
var evAssociatedHost = "";    // TODO: (nice-to-have) - change this to an object with more of the event's fields (host, log-level, application .. etc)
var timerOnFlag = false;
var searchTimerId;
var styleTimerId;
var evDataId;
/* Unix milliseconds integer (10 min == 600,000) */
var evTimestamp;
window.addEventListener("load", function(e) {
    console.debug("It's loaded!");
});

window.addEventListener("pageshow", function (e) {
    console.debug("Page show!");
});

var tabNav = document.getElementsByClassName("search-tab-nav feature-tour-step10");
var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation){
        console.info("MutationObserver: :");
        
        for (key in mutation) {
            console.debug(key + ":" + mutation[key]);
        }
        // check if addedNodes is not empty
        if (mutation.addedNodes.length == 1) {
            // check if new tab's title starts with year (this means it was created by clicking 'view surrouding events')
            var newTab = mutation.addedNodes[0];
            if (newTab.title.match(/([0-9][0-9][0-9][0-9]-)/)) {
                console.info("ViewSurroundingEvents tab created");
                for (var i = 0, attrs = newTab.attributes, n = attrs.length, arr = []; i < n; i++) {
                    // debug logs (print all attributes of the new tab)
                    console.debug(attrs[i].nodeName + ":" + newTab[attrs[i].nodeName]);
                }
                // get the ID of the new tab    
                surrTabId = newTab["id"].replace('tab-', '');
                surrTabFlag = true;
                // start a repeating timer function
                if (!timerOnFlag) {
                    searchTimerId = setInterval(startSearchTimer, 500); // timer function will launch 'searchSurroundingEvents()' IF both flags are true
                }
            }
        }
    });
});

// configuration of the observer:
var config = { attributes: true, childList: true, characterData: true };
 
// pass in the target node, as well as the observer options
observer.observe(tabNav[0], config);
 
// // later, you can stop observing
// observer.disconnect();

for (var i=0; i < contentsOfAllLogglyTabs.length; i++) {
        var displayStyle = getComputedStyle(contentsOfAllLogglyTabs[i], null).display;
       // console.log("Display: " + displayStyle);
        if (displayStyle == "block") {
            // get search string active loggly-tab 
            activeContents = contentsOfAllLogglyTabs[i];
        }
}

var eventContentPattern = /(event-text svg-margin|column-timestamp|event-row selected-event row-collapsed|flex-content|event-row selected-event expanded-content)/;
document.body.addEventListener('click', function(e){
    console.log("Click Event----");
    console.log("   Event Type: " + e.type);
    console.log("   Target nodeName: " + e.target.nodeName);
    //searchSurroundingEvents(); // DEV-ONLY
    contentsOfAllLogglyTabs = document.getElementsByClassName("search-content-loaded ng-scope");
    console.info(e.target.className);
    
    if (e.target.className.match(eventContentPattern)){
        // user clicked on an event
        console.info("Expanding event");
        var eventRow = getEventRowRoot(e.target);
        console.info("EventRow root: " + eventRow.className);
        updateSearchElementsCache(eventRow);
    }
});

// takes a EventRow root element, or one of it's decendants, and returns the EventRow root element (search is recursive)
function getEventRowRoot(target) {
    var eventRowRootMatch = /(event-row selected-event expanded-content|event-row expanded-content)/;
    if (target.className.match(eventRowRootMatch)) {
        return target;
    }
    else {
        console.log("Continuing search for EventRow root");
        return getEventRowRoot(target.parentNode);
    }
}

function updateSearchElementsCache(eventRow){
    console.info("Updating cache");
    contentsOfAllLogglyTabs = document.getElementsByClassName("search-content-loaded ng-scope");
    console.log(contentsOfAllLogglyTabs.length);
    for (var i=0; i < contentsOfAllLogglyTabs.length; i++) {
        var displayStyle = getComputedStyle(contentsOfAllLogglyTabs[i], null).display;
        console.log("Display: " + displayStyle);
        if (displayStyle == "block") {
            // get search string active loggly-tab 
            activeContents = contentsOfAllLogglyTabs[i];
            searchText = activeContents.getElementsByClassName("search-input main-searchbox")[0].value;
            searchedHosts = parseStringForHosts(searchText);
            filteredHosts = getHostFilters(activeContents);
            
            // get data associated with this Event (host, data-id, timestamp)
            var eventHost = eventRow.getElementsByClassName("tag-host event-facet")[0].getAttribute('data-value');   console.log("Host: " + eventHost);
            eventHost = "syslog.host:" + eventHost;    console.log("Prefixed-Host: " + eventHost);
            var surrEventsBtn = eventRow.getElementsByClassName("btn surround tipper pull-right")[0];
            try {
                console.log("Setting formAction");
                surrEventsBtn.setAttribute("formAction", "asdf");
                surrEventsBtn.setAttribute("baseURI", "asdf"); 
            } catch (err) {
                console.log("Error setting formAction: " + err)
            }

            var eventId = eventRow.getAttribute("data-id");   console.log("DataId: " + eventId);
            var eventTime = eventRow.getAttribute("data-timestamp");   console.log("Data Timestamp: " + eventTime);

            // add this data as attributes to the surroundingEvents Button so that it can be accessed from the onClick event
            // - this is required because someone could expand one event, the expand another, then click the first's ViewSurroundingEvents
            surrEventsBtn.setAttribute("host", eventHost); 
            surrEventsBtn.setAttribute("n-data-id", eventId);
            surrEventsBtn.setAttribute("n-data-timestamp", eventTime);
            surrEventsBtn.addEventListener("click", function(e) {
                surrBtnFlag = true;
                evAssociatedHost = e.target.getAttribute("host");
                evDataId = e.target.getAttribute("n-data-id");
                evTimestamp = e.target.getAttribute("n-data-timestamp");
                // start a repeating timer function
                if (!timerOnFlag) {
                    searchTimerId = setInterval(startSearchTimer, 2000); // timer function will launch 'searchSurroundingEvents()' IF both flags are true
                }
            });
        }
    }
}

/* Timer function to keep checking until we have the required information to begin the search */
function startSearchTimer() {
    timerOnFlag = true;
    if (surrBtnFlag && surrTabFlag) {
        surrBtnFlag = false;
        surrTabFlag = false;
        displayCustomizationPopup();
        console.log("POOOOOOOPPPPPPPPPPPPEDDDD UPPPPPPPPPPPPP !!!!!!!!!");        
        window.clearInterval(searchTimerId);
    }
}

function searchSurroundingEvents(tabId, hostOfEvent) {
    console.info("Starting search");
    console.info("Searched Hosts: " + searchedHosts);
    console.info("Filtered Hosts: " + filteredHosts);
    if (emptyOrNull(searchedHosts) && emptyOrNull(filteredHosts)) {
        console.info("No Searched/Filterd Hosts, using event's host: " + hostOfEvent);
        searchedHosts = hostOfEvent;
    }
    // get pageContents for tabId passed in
    activeContents = getContentsForTab(tabId);
    // find the correct searchbox (the one for the newest tab)
    var searchBoxes = activeContents.getElementsByClassName("search-input main-searchbox"); 
    if (searchBoxes.length == 1) {
        console.log("Found correct searchbox"); // there should only be 1 searchBox for the active contents
        var newSearchText = filteredHosts + " " + searchedHosts;  // TODO: add createSearchText method, and addFilters method
        console.info("SearchText: " + newSearchText);
        searchBoxes[0].value = newSearchText;
        doSearch();
        styleTimerId = setInterval(tryStylingTimer, 200);
        console.log("Style TimerId: " + styleTimerId);
    } 
    else {
        log.error("Cannot find active search box");
    }
}

/* Click the search button programatically */
function doSearch() {
    var searchButtons = activeContents.getElementsByClassName("btn btn-primary run-search");
    if (searchButtons.length == 1) {
        var searchBtn = searchButtons[0];
        searchBtn.click();
    }
}

/* 
Get events container and attempt to scroll to the correct scrolling page. This method is called repeatedly until we reach the correct page, or
we call it too many times. When we reach the correct page, then highlight the original event.
*/
var countStyleTimer = 0;
function tryStylingTimer() {
    console.debug("Style Timer");
    countStyleTimer++;
    var eventsContainerScrollPage = activeContents.getElementsByClassName("events-container tracking-category scroll-page")[0];
    console.log("Events container: " + eventsContainerScrollPage);
    var totalEvents = eventsContainerScrollPage.getAttribute("data-events-total");
    console.log("Total Events: " + totalEvents);
    
    var eventsContainer = eventsContainerScrollPage.parentNode;
    var events = eventsContainerScrollPage.children;
    console.log("Events container children (events): " + events);
    
    console.info("EventRows (surrSearch): " + events.length);
    if (countStyleTimer > 50) {
        console.log("clearing timer" + styleTimerId);
        window.clearInterval(styleTimerId);
        countStyleTimer = 0;
        return;
    }
    else if (events == null || events.length == 0) {  return; }
   
    countStyleTimer = 0;
    if (!scrollTowardsEvent(evDataId, evTimestamp, eventsContainer, totalEvents)) {
        return;
    };
    window.clearInterval(styleTimerId);
    styleTimerId = -1;
    countStyleTimer = 0;
    
    eventsContainerScrollPage = eventsContainer.lastElementChild;
    events = eventsContainerScrollPage.children;
    console.info("Searching for orinating event to highlight - events length: " + events.length);
    for (var i = 0; i < events.length; i++ ) {
        if (events[i].getAttribute("data-id") == evDataId) {
            console.info("Event found by data-id... highlighting and scrolling to event");
            //window.clearInterval(styleTimerId);
            var offset = events[i].offsetTop;
            console.log("Offset: " + offset);
            preciseScroll(events[i], eventsContainer);
            styleSearchResults(events[i]);
            break;
        }
    }

}

/* Scroll towards the event specified by the event id within the event container. 
    Timestamp and total events are required for faster searching 
    Scrolls toward the specified event by as much as possible (loading new events)
    Returns true if we've reached the scrolling page with the specified event, otherwise, returns false;
*/
var scrollCount = 0;
function scrollTowardsEvent(evDataId, evTimestamp, eventsContainer, totalEvents) {
    console.info("Scrolling toward event --  Id: " + evDataId + "  Timestamp: " + evTimestamp);
    scrollCount++;
    if (scrollCount > 200) { 
        scrollCount = 0;
        window.clearInterval(styleTimerId);
        return false;
    }
    // FIX-ME - this will only work if events are sorted in decending order

    var lastChildTimestamp = eventsContainer.lastElementChild.lastElementChild.getAttribute("data-timestamp");
    console.info("Last child Timestamp: " + lastChildTimestamp);

    if (lastChildTimestamp == undefined) return false;
    if (evTimestamp > lastChildTimestamp){
        console.log("In correct scrolling div.")
        eventsContainer.scrollTop = eventsContainer.scrollHeight;
        return true;
    }
    else {
        console.log("Not in correct scrolling div yet ...")
        eventsContainer.scrollTop = eventsContainer.scrollHeight;
        return false;
    }
}

/* Scroll to the precise event from which ViewSurroundingEvents was clicked */
function preciseScroll(event, eventScrollPage) {
    console.info("Precise Scrolling to event... ");
    console.info("ScrollPage = " + eventScrollPage.lastElementChild.className);
    console.info("Offset = " + event.offsetTop);
    eventScrollPage.scrollTop = event.offsetTop - 10;
}

function styleSearchResults(eventRow) {
    eventRow.className += " event-focus selected-event";
}

function emptyOrNull(s) {
    if (s == "" || s == undefined || s == null) {
        return true;
    }
}

function parseStringForHosts(searchString) {
    console.info("Parsing search string: " + searchString);
	var occurences = (searchString.match(/syslog.host:/g) || []).length;   
    console.info("Occurances of 'syslog.host:' : " + occurences); 
    //  return an array of hosts
}

function getHostFilters(activeContents) {
    var filters = activeContents.getElementsByClassName("filter-text ng-binding");
    var filteredHosts = [];
    for (var i=0; i < filters.length; i++) {
        var filterText = filters[i].textContent;
        console.log(filterText);
        if (filterText.includes("host")) {
            filterText = filterText.split(" ").join("");
            console.log(filterText);
            filteredHosts.push(filterText);
        }
    }
    console.info("Filtered hosts: " + filteredHosts);

    // return an array of hosts (strings in format "syslog.host:123456")
    return filteredHosts;
}

// may not be necessary
function getCurrentLogglyTab() {
    console.info("get Current Loggly Tab");
    var logglyTabs = document.getElementsByClassName("search-tab");
    for (var i=0; i < logglyTabs.length; i++) {
        console.info(logglyTabs[i].title);
        var radioTabBtn = logglyTabs[i].children[0];
        if (radioTabBtn.checked) {
            return radioTabBtn; // retrun the actual radio-button input element of the selected tab
        }
    }
}

function displayCustomizationPopup() {
    console.info("Displaying Customization");
    var dlg = document.createElement("DIV");
    dlg.innerHTML = '\
        <div id="dlg-header">Modify Search of Surrounding Events</div>\
        <hr>\
        <div id="dlg-body">\
        <div style="padding:5px">\
            <input id="hostRdoBtn" type="radio" name="customize" checked="true" style="margin-right:20px">Only keep host of event\
        </div>\
        <div style="padding:5px">\
            <input id="customizeRdoBtn" type="radio" name="customize" style="margin-right:20px; margin-bottom:10px">Customize Search <br>\
            <div id="customizationFields" style="pointer-events:none; -webkit-filter:opacity(30%)">\
                <div style="padding:5px">\
                    <span>Search Text</span> <input type="text" style="width:100%"> <br style="clear: left;" />\
                </div>\
                <div style="padding:5px">\
                    <span>Filters</span> <br>\
                    <input type="checkbox">\
                </div>\
            </div>\
        </div>\
        </div>\
        <hr>\
        <div id="dlg-footer" style="margin:auto; padding-top:10px; padding-left:35%">\
        <button id="okBtn" style="font-size:100%; margin-right:10%">OK</button>\
        <button id="cancelBtn" style="font-size:100%; margin-left:10%">Cancel</button>\
        </div>\
    ';
    dlg.id = "customizeDlg";
    dlg.style.display = "block";
    var winWidth = window.innerWidth;
    dlg.style.margin = "auto";
    dlg.style.width = "35%";
    dlg.style.padding = "25px";
    dlg.style.border = "2px solid black"
    dlg.style.borderRadius = "5px"
    dlg.style.zIndex = "10000";
    dlg.style.position = "relative";
    dlg.style.backgroundColor = "white";
    
    styleLogglyContent();
    document.body.insertBefore(dlg, document.body.firstChild); 
    addPopupListeners(); 

    // TODO: add listeners to radio buttons and OK/Cancel
}
function disableCustomizationFields() {
    var customizationFields = document.getElementById("customizationFields");
    customizationFields.style.pointerEvents = "none";
    customizationFields.style.webkitFilter = "opacity(30%)";
}

function enableCustomizationFields() {
    var customizationFields = document.getElementById("customizationFields");    
    customizationFields.style = "";
    // customizationFields.style.pointerEvents = "auto";
    // customizationFields.style.webkitFilter = "opacity(100%)";
}

function styleLogglyContent() {
    console.log("Styling loggly content");
    var content = document.body.getElementsByClassName("content-wrapper")[0];
    content.style.position = "relative";
    content.style.pointerEvents = "none";
    content.style.top = "-375px";
    content.style.webkitFilter = "brightness(60%)";
    //document.body.className = "modal-open";
}

function removeStylesLogglyContent() {
    var content = document.body.getElementsByClassName("content-wrapper")[0];
    content.style = "";
}

function addPopupListeners(content) {
    document.getElementById("hostRdoBtn").addEventListener('click', function(e) {
        console.log("Clicked host Radio button");
        disableCustomizationFields();
    });
    document.getElementById("customizeRdoBtn").addEventListener('click', function(e) {
        console.log("Clicked Customize radio button");
        enableCustomizationFields();
    });
    document.getElementById("okBtn").addEventListener('click', function(e) {
        console.log("Clicked Popup OK");
        searchSurroundingEvents(surrTabId, evAssociatedHost);
        closeCustomizerPopup();
        removeStylesLogglyContent();
    });
    document.getElementById("cancelBtn").addEventListener('click', function(e) {
        console.log("Clicked Popup Cancel");
        closeCustomizerPopup();
        removeStylesLogglyContent();
    });
}

function closeCustomizerPopup() {
    var customDlg = document.getElementById("customizeDlg");
    customDlg.remove();
}

function getContentsForTab(tabId) {
    var allTabsContents =  document.getElementsByClassName("search-content-loaded ng-scope");
    console.log("Number of tabs: " + allTabsContents.length);
    for (var i = 0; i < allTabsContents.length; i++) {
        var tabContents = allTabsContents[i];
        console.log(tabContents.getAttribute("tab-id"));
        if (tabContents.getAttribute("tab-id") == undefined) {
            continue;
        }
        if (tabContents.getAttribute("tab-id") == tabId) {
            console.info("Found contents for this tabId")
            return tabContents;
        }
    }
}