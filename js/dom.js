// js/dom.js

// A helper function to safely get an element by ID
const safeGetElement = (id) => {
    const element = document.getElementById(id);
    // You can uncomment the console.warn if you want to be notified
    // when an element is not found, useful for debugging.
    // if (!element) {
    //     console.warn(`DOM element with ID "${id}" not found on this page.`);
    // }
    return element;
};

export const DOM = {
    // Shared elements (buttons that might navigate or overlays)
    signInBtn: safeGetElement("signInBtn"),
    signOutBtn: safeGetElement("signOutBtn"),
    loadingOverlay: safeGetElement("loadingOverlay"),
    welcomeMessage: safeGetElement("welcomeMessage"), // Could be on both if dynamic
    newsfeedBtn: safeGetElement("newsfeedBtn"), // This button is typically on index.html to navigate

    // Index.html specific elements
    timeline: safeGetElement("timeline"),
    timelineEntries: safeGetElement("timelineEntries"),
    openModalBtn: safeGetElement("openModalBtn"),
    addFriendBtn: safeGetElement("addFriendBtn"),
    friendRequestsBtn: safeGetElement("friendRequestsBtn"),
    entryModal: safeGetElement("entryModal"),
    cancelBtn: safeGetElement("cancelBtn"),
    saveEntryBtn: safeGetElement("saveEntryBtn"),
    noDataMessage: safeGetElement("noDataMessage"),
    entryDateInput: safeGetElement("entryDate"),
    entryNoteInput: safeGetElement("entryNote"),
    entryImgInput: safeGetElement("entryImg"),

    // Modals (expected to be on index.html)
    addFriendModal: safeGetElement("addFriendModal"),
    addFriendSearchInput: safeGetElement("addFriendSearchInput"),
    addFriendSearchResults: safeGetElement("addFriendSearchResults"),
    closeAddFriendModalBtn: safeGetElement("closeAddFriendModalBtn"),
    friendRequestsModal: safeGetElement("friendRequestsModal"),
    friendRequestsList: safeGetElement("friendRequestsList"),
    closeFriendRequestsModalBtn: safeGetElement("closeFriendRequestsModalBtn"),

    // Newsfeed.html specific elements (these should only exist on newsfeed.html)
    newsfeedContent: safeGetElement("newsfeedContent"),
    allPostsTab: safeGetElement("allPostsTab"),
    latestPostsTab: safeGetElement("latestPostsTab"),
};