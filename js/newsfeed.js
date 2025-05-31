// js/newsfeed.js
import { db, auth, FieldValue } from "./firebase.js"; // Assuming firebase.js exports these
import { showLoadingOverlay, hideLoadingOverlay, Toast, escapeHTML } from "./ui.js"; // Assuming ui.js has these
import { getCurrentUserProfile, getFriendUserProfiles } from "./auth.js";
import { DOM } from "./dom.js"; // Import DOM elements from dom.js

export function setupNewsfeedListeners() {
    console.log("setupNewsfeedListeners is actively running on newsfeed.html.");

    // --- Critical Check: Ensure Newsfeed DOM elements exist before proceeding ---
    if (!DOM.allPostsTab || !DOM.latestPostsTab || !DOM.newsfeedContent) {
        console.error("Newsfeed DOM elements (allPostsTab, latestPostsTab, newsfeedContent) not found. Aborting newsfeed setup.");
        return; // Exit if elements are missing, preventing errors
    }

    // Set the initial active tab and load content when the page loads
    // This will run once when newsfeed.html is loaded and setupNewsfeedListeners is called
    setActiveTab("allPostsTab");
    loadNewsfeed();

    // Add event listeners for the tabs
    DOM.allPostsTab.onclick = () => {
        console.log("User clicked 'All Posts' tab.");
        setActiveTab("allPostsTab");
        loadNewsfeed();
    };

    DOM.latestPostsTab.onclick = () => {
        console.log("User clicked 'Latest Posts' tab.");
        setActiveTab("latestPostsTab");
        loadLatestPosts();
    };
}

function setActiveTab(activeId) {
    // Get all tab buttons using DOM references
    const allTabs = [DOM.allPostsTab, DOM.latestPostsTab];

    allTabs.forEach(tab => {
        if (tab) { // Defensive check, though should be present due to earlier check
            // Remove active classes and add default inactive classes
            tab.classList.remove('bg-newsfeed-blue', 'text-white');
            tab.classList.add('bg-gray-100', 'text-gray-700');
        }
    });

    // Add active class to the currently selected tab
    // We use getElementById here because activeId is a string ID
    const activeTab = document.getElementById(activeId);
    if (activeTab) { // Defensive check
        activeTab.classList.remove('bg-gray-100', 'text-gray-700'); // Remove default before adding active
        activeTab.classList.add('bg-newsfeed-blue', 'text-white');
    }
    console.log(`Active tab set to: ${activeId}`);
}

export async function loadNewsfeed() {
    showLoadingOverlay();
    DOM.newsfeedContent.innerHTML = ""; // Clear existing content

    try {
        const currentUserUid = auth.currentUser.uid;
        const friendProfiles = getFriendUserProfiles(); // Get the Map of friend profiles

        // Collect UIDs of current user and all their friends
        // This ensures the user's own posts are included in 'All Posts'
        const targetUids = new Set([currentUserUid]); // Use a Set to avoid duplicates
        friendProfiles.forEach((profile, uid) => targetUids.add(uid));

        if (targetUids.size === 0) {
            DOM.newsfeedContent.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500">No users to display posts for. Please sign in or add friends.</p>
                </div>
            `;
            hideLoadingOverlay();
            return;
        }

        let allEntries = [];

        for (const uid of Array.from(targetUids)) { // Iterate over unique UIDs
            const entriesSnap = await db
                .collection("couples")
                .doc(uid)
                .collection("entries")
                .orderBy("createdAt", "desc")
                .get();

            entriesSnap.forEach((doc) => {
                allEntries.push({
                    id: doc.id,
                    ...doc.data(),
                    ownerUid: uid, // Store the owner's UID for rendering
                });
            });
        }

        // Sort all entries by date (newest first)
        allEntries.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

        // Render posts
        if (allEntries.length === 0) {
            DOM.newsfeedContent.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500">No posts from you or your friends yet. Share your first entry!</p>
                </div>
            `;
        } else {
            allEntries.forEach((entry) => {
                renderNewsfeedPost(entry);
            });
        }
    } catch (error) {
        console.error("Error loading newsfeed:", error);
        DOM.newsfeedContent.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Failed to load newsfeed. Please check your internet connection or try again later.</p>
            </div>
        `;
    } finally {
        hideLoadingOverlay();
    }
}

export async function loadLatestPosts() {
    showLoadingOverlay();
    DOM.newsfeedContent.innerHTML = ""; // Clear existing content

    try {
        const currentUserUid = auth.currentUser.uid;
        const friendProfiles = getFriendUserProfiles(); // Get the Map of friend profiles

        // Only interested in friends' posts for 'Latest' tab (excluding self for simplicity)
        if (friendProfiles.size === 0) {
            DOM.newsfeedContent.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500">Add friends to see their latest posts here!</p>
                </div>
            `;
            hideLoadingOverlay();
            return;
        }

        let latestEntries = [];

        // Get only the latest post from each friend
        for (const friendUid of Array.from(friendProfiles.keys())) {
            const friendEntrySnap = await db
                .collection("couples")
                .doc(friendUid)
                .collection("entries")
                .orderBy("createdAt", "desc")
                .limit(1) // Get only the most recent entry
                .get();

            if (!friendEntrySnap.empty) {
                const doc = friendEntrySnap.docs[0];
                latestEntries.push({
                    id: doc.id,
                    ...doc.data(),
                    ownerUid: friendUid,
                });
            }
        }

        // Sort by date (newest first)
        latestEntries.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

        // Render posts
        if (latestEntries.length === 0) {
            DOM.newsfeedContent.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500">No latest posts from your friends yet.</p>
                </div>
            `;
        } else {
            latestEntries.forEach((entry) => {
                renderNewsfeedPost(entry);
            });
        }
    } catch (error) {
        console.error("Error loading latest posts:", error);
        DOM.newsfeedContent.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500">Failed to load latest posts. Please try again.</p>
            </div>
        `;
    } finally {
        hideLoadingOverlay();
    }
}

function renderNewsfeedPost(entry) {
    const friendProfiles = getFriendUserProfiles();
    const currentUserProfile = getCurrentUserProfile();

    // Determine the profile of the post's owner
    const ownerProfile =
        entry.ownerUid === auth.currentUser.uid
            ? currentUserProfile
            : friendProfiles.get(entry.ownerUid);

    if (!ownerProfile) {
        console.warn("Owner profile not found for entry:", entry);
        return; // Don't render post if owner's profile can't be found
    }

    const ownerName = ownerProfile.displayName || "Unknown User";
    const ownerPhoto = ownerProfile.photoURL || "https://via.placeholder.com/40";
    const entryDate = entry.createdAt
        ? entry.createdAt
              .toDate()
              .toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
              })
        : "Unknown Date";
    const imageCount = entry.imageUrls?.length || 0;

    const postElement = document.createElement("div");
    postElement.className = "bg-white rounded-xl shadow-md p-4 newsfeed-post";
    postElement.innerHTML = `
        <div class="flex items-center mb-3">
            <img src="${ownerPhoto}" alt="${escapeHTML(ownerName)}" class="w-10 h-10 rounded-full mr-3">
            <div>
                <p class="font-semibold">${escapeHTML(ownerName)}</p>
                <p class="text-sm text-gray-500">${entryDate}</p>
            </div>
        </div>

        <p class="mb-3 whitespace-pre-wrap">${escapeHTML(entry.note || "")}</p>

        ${
            imageCount > 0
                ? `
            <div class="grid grid-cols-2 gap-2 mb-3">
                ${entry.imageUrls
                    .slice(0, 2)
                    .map(
                        (url) =>
                            `<img src="${url}" class="rounded-lg object-cover h-40 w-full">`
                    )
                    .join("")}
            </div>
            ${
                imageCount > 2
                    ? `<p class="text-sm text-gray-500">+${
                          imageCount - 2
                      } more photos</p>`
                    : ""
            }
        `
                : ""
        }

        <div class="flex items-center mt-3 pt-3 border-t border-gray-100">
            <button class="like-btn flex items-center text-rose-500 mr-4" data-entry-id="${
                entry.id
            }" data-owner-uid="${entry.ownerUid}">
                <i class="fas fa-heart mr-1"></i>
                <span class="like-count">${entry.likes?.length || 0}</span>
            </button>
            <button class="comment-btn flex items-center text-gray-500" data-entry-id="${
                entry.id
            }" data-owner-uid="${entry.ownerUid}">
                <i class="fas fa-comment mr-1"></i>
                <span>Comments</span>
            </button>
        </div>
        <div class="comments-section mt-3 hidden">
            <div class="comments-list space-y-2">
            </div>
            <div class="flex mt-3">
                <input type="text" placeholder="Add a comment..." class="comment-input flex-1 rounded-lg border-gray-300">
                <button class="send-comment-btn ml-2 px-4 py-2 bg-rose-500 text-white rounded-lg">Send</button>
            </div>
        </div>
    `;

    DOM.newsfeedContent.appendChild(postElement);

    // Reactions
    const likeBtn = postElement.querySelector(".like-btn");
    if (likeBtn) { // Defensive check
        likeBtn.addEventListener("click", async () => {
            const entryId = likeBtn.dataset.entryId;
            const entryOwnerUid = likeBtn.dataset.ownerUid;
            const entryRef = db
                .collection("couples")
                .doc(entryOwnerUid)
                .collection("entries")
                .doc(entryId);

            try {
                const entrySnap = await entryRef.get();
                if (entrySnap.exists) {
                    const entryData = entrySnap.data();
                    let likes = entryData.likes || [];
                    const userLiked = likes.includes(auth.currentUser.uid);

                    if (userLiked) {
                        likes = likes.filter((uid) => uid !== auth.currentUser.uid); // Unlike
                    } else {
                        likes.push(auth.currentUser.uid); // Like
                    }
                    await entryRef.update({ likes: likes });
                }
            } catch (error) {
                console.error("Error liking post:", error);
                Toast.fire({ icon: "error", title: "Failed to like post." });
            }
        });

        // Real-time listener for likes
        db.collection("couples")
            .doc(entry.ownerUid)
            .collection("entries")
            .doc(entry.id)
            .onSnapshot((snap) => {
                if (snap.exists) {
                    const data = snap.data();
                    const likes = data.likes || [];
                    const likeCountSpan = postElement.querySelector(".like-count");
                    const likeIcon = likeBtn.querySelector("i");

                    if (likeCountSpan) likeCountSpan.textContent = likes.length;

                    // Update icon and color based on current user's like status
                    if (auth.currentUser && likes.includes(auth.currentUser.uid)) {
                        likeIcon?.classList.remove("fa-heart-o");
                        likeIcon?.classList.add("fas", "fa-heart");
                        likeBtn?.classList.add("text-rose-600");
                    } else {
                        likeIcon?.classList.remove("fas", "fa-heart");
                        likeIcon?.classList.add("fa-heart-o");
                        likeBtn?.classList.remove("text-rose-600");
                    }
                }
            }, (error) => {
                console.error("Error setting up like snapshot listener:", error);
            });
    }


    // Comments
    const commentBtn = postElement.querySelector(".comment-btn");
    const commentsSection = postElement.querySelector(".comments-section");
    const commentsList = postElement.querySelector(".comments-list");
    const commentInput = postElement.querySelector(".comment-input");
    const sendCommentBtn = postElement.querySelector(".send-comment-btn");

    if (commentBtn && commentsSection && commentsList && commentInput && sendCommentBtn) { // Defensive checks
        commentBtn.onclick = () => {
            commentsSection.classList.toggle("hidden");
            // The comments listener will automatically load/update when commentsSection is shown
        };

        sendCommentBtn.onclick = async () => {
            const commentText = commentInput.value.trim();
            if (!commentText) {
                Toast.fire({ icon: "warning", title: "Comment cannot be empty." });
                return;
            }

            try {
                await db
                    .collection("couples")
                    .doc(entry.ownerUid)
                    .collection("entries")
                    .doc(entry.id)
                    .collection("comments")
                    .add({
                        userId: auth.currentUser.uid,
                        userName: auth.currentUser.displayName || "Anonymous",
                        userPhoto: auth.currentUser.photoURL || "https://via.placeholder.com/24",
                        commentText: commentText,
                        createdAt: FieldValue.serverTimestamp(),
                    });
                commentInput.value = "";
                Toast.fire({ icon: "success", title: "Comment added!" });
            } catch (e) {
                console.error("Error adding comment:", e);
                Swal.fire({ icon: "error", title: "Comment failed", text: e.message });
            }
        };

        // Real-time comments listener
        db.collection("couples")
            .doc(entry.ownerUid)
            .collection("entries")
            .doc(entry.id)
            .collection("comments")
            .orderBy("createdAt", "asc")
            .onSnapshot((snap) => {
                commentsList.innerHTML = ""; // Clear list before re-rendering
                snap.forEach((commentDoc) => {
                    const c = commentDoc.data();
                    const commentDiv = document.createElement("div");
                    commentDiv.className = "flex items-start text-sm";
                    commentDiv.innerHTML = `
                        <img src="${c.userPhoto || "https://via.placeholder.com/24"}" alt="${
                        escapeHTML(c.userName)
                        }" class="w-6 h-6 rounded-full mr-2 mt-1">
                        <div>
                            <p><span class="font-semibold">${escapeHTML(c.userName)}:</span> ${escapeHTML(
                        c.commentText
                        )}</p>
                            <p class="text-xs text-gray-400">${
                            c.createdAt
                                ? new Date(c.createdAt.toDate()).toLocaleString()
                                : "Just now"
                            }</p>
                        </div>
                        ${
                            c.userId === auth.currentUser.uid
                                ? `<button class="ml-auto text-gray-400 hover:text-red-500 delete-comment-btn" data-comment-id="${commentDoc.id}"><i data-feather="trash-2" class="w-4 h-4"></i></button>`
                                : ""
                        }
                    `;
                    commentsList.append(commentDiv);
                    feather.replace({ iconNode: commentDiv }); // Re-render feather icons for new elements

                    if (c.userId === auth.currentUser.uid) {
                        commentDiv.querySelector(".delete-comment-btn").onclick =
                            async () => {
                                Swal.fire({
                                    title: "Delete comment?",
                                    text: "You can’t undo this action.",
                                    icon: "warning",
                                    showCancelButton: true,
                                    confirmButtonColor: "#f43f5e",
                                    cancelButtonColor: "#a1a1aa",
                                    confirmButtonText: "Yes, delete!",
                                }).then(async (res) => {
                                    if (res.isConfirmed) {
                                        try {
                                            await db
                                                .collection("couples")
                                                .doc(entry.ownerUid)
                                                .collection("entries")
                                                .doc(entry.id)
                                                .collection("comments")
                                                .doc(commentDoc.id)
                                                .delete();
                                            Toast.fire({ icon: "success", title: "Comment deleted!" });
                                        } catch (e) {
                                            console.error("Error deleting comment:", e);
                                            Swal.fire({
                                                icon: "error",
                                                title: "Delete failed",
                                                text: e.message,
                                            });
                                        }
                                    }
                                });
                            };
                    }
                });
                feather.replace({ iconNode: commentsList }); // Final Feather replace after all comments are added
            }, (error) => {
                console.error("Error setting up comments snapshot listener:", error);
            });
    }

    feather.replace({ iconNode: postElement }); // Replace feather icons for the newly added post element
}

