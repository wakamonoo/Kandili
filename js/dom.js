// js/dom.js
const $ = (id) => document.getElementById(id);

export const DOM = {
  /* auth & header */
  signInBtn:  $("signInBtn"),
  signOutBtn: $("signOutBtn"),

  /* timeline page */
  timeline:         $("timeline"),
  timelineEntries:  $("timelineEntries"),
  welcomeMessage:   $("welcomeMessage"),
  noDataMessage:    $("noDataMessage"),

  /* entry creation */
  openModalBtn:   $("openModalBtn"),
  entryModal:     $("entryModal"),
  cancelBtn:      $("cancelBtn"),
  saveEntryBtn:   $("saveEntryBtn"),
  entryDateInput: $("entryDate"),
  entryNoteInput: $("entryNote"),
  entryImgInput:  $("entryImg"),

  /* add friend */
  addFriendBtn:             $("addFriendBtn"),
  addFriendModal:           $("addFriendModal"),
  addFriendSearchInput:     $("addFriendSearchInput"),
  addFriendSearchResults:   $("addFriendSearchResults"),
  closeAddFriendModalBtn:   $("closeAddFriendModalBtn"),

  /* friend requests */
  friendRequestsBtn:           $("friendRequestsBtn"),
  friendRequestsModal:         $("friendRequestsModal"),
  friendRequestsList:          $("friendRequestsList"),
  closeFriendRequestsModalBtn: $("closeFriendRequestsModalBtn"),

  /* global overlay */
  loadingOverlay: $("loadingOverlay"),

  /* news-feed page */
  newsfeedBtn:      $("newsfeedBtn"),
  newsfeedPage:     $("newsfeedPage"),
  newsfeedContent:  $("newsfeedContent"),
  allPostsTab:      $("allPostsTab"),
  latestPostsTab:   $("latestPostsTab"),
};
