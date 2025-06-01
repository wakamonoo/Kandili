import { DOM } from './dom.js';

export const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 1800,
  background: "#fce7f3",
  color: "#831843",
});

export function updateTimelineDisplay(type) {
  DOM.welcomeMessage.classList.add("hidden");
  DOM.noDataMessage.classList.add("hidden");
  DOM.timelineEntries.classList.add("hidden");
  DOM.timeline.classList.remove(
    "flex",
    "flex-col",
    "items-center",
    "justify-center"
  );

  if (type === "welcome") {
    DOM.welcomeMessage.classList.remove("hidden");
    DOM.timeline.classList.add(
      "flex",
      "flex-col",
      "items-center",
      "justify-center"
    );
  } else if (type === "noData") {
    DOM.noDataMessage.classList.remove("hidden");
    DOM.timeline.classList.add(
      "flex",
      "flex-col",
      "items-center",
      "justify-center"
    );
  } else if (type === "entries") {
    DOM.timelineEntries.classList.remove("hidden");
  }
}

export function showLoadingOverlay() {
  DOM.loadingOverlay.classList.remove("hidden");
}

export function hideLoadingOverlay() {
  DOM.loadingOverlay.classList.add("hidden");
}

export function escapeHTML(s = "") {
  return s.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[
        c
      ])
  );
}

export function showEntryModal() {
  DOM.entryModal.classList.remove("hidden");
}

export function hideEntryModal() {
  DOM.entryModal.classList.add("hidden");
}

export function showAddFriendModal() {
  DOM.addFriendModal.classList.remove("hidden");
}

export function hideAddFriendModal() {
  DOM.addFriendModal.classList.add("hidden");
}

export function showFriendRequestsModal() {
  DOM.friendRequestsModal.classList.remove("hidden");
}

export function hideFriendRequestsModal() {
  DOM.friendRequestsModal.classList.add("hidden");
}

export function showNewsfeedModal() {
  DOM.newsfeedModal.classList.remove("hidden");
}

export function hideNewsfeedModal() {
  DOM.newsfeedModal.classList.add("hidden");
}