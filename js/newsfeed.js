import { db, auth, FieldValue } from "./firebase.js"; // Import FieldValue
import { DOM } from "./dom.js";
import { showLoadingOverlay, hideLoadingOverlay, Toast, escapeHTML } from "./ui.js"; // Import Toast and escapeHTML
import { getCurrentUserProfile, getFriendUserProfiles } from "./auth.js"; // Import getCurrentUserProfile

export function setupNewsfeedListeners() {
  // These listeners will now be on the newsfeed.html page
  DOM.allPostsTab.onclick = () => {
    setActiveTab("allPostsTab");
    loadNewsfeed();
  };

  DOM.latestPostsTab.onclick = () => {
    setActiveTab("latestPostsTab");
    loadLatestPosts();
  };

  // Initial load when the newsfeed page is accessed
  setActiveTab("allPostsTab"); // Set default tab to "All Posts"
  loadNewsfeed();
}

function setActiveTab(activeId) {
  // Remove active class from all tabs
  DOM.allPostsTab.classList.remove("bg-newsfeed-blue", "text-white");
  DOM.latestPostsTab.classList.remove("bg-newsfeed-blue", "text-white");

  // Add active class to the clicked tab
  const activeTab = document.getElementById(activeId);
  activeTab.classList.add("bg-newsfeed-blue", "text-white");
}

export async function loadNewsfeed() {
  showLoadingOverlay();
  DOM.newsfeedContent.innerHTML = "";

  try {
    const currentUserUid = auth.currentUser.uid;
    const friendProfiles = getFriendUserProfiles();

    if (!friendProfiles.size && currentUserUid !== auth.currentUser.uid) { // Check if no friends and not current user's own posts
      DOM.newsfeedContent.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500">Add friends to see their posts!</p>
        </div>
      `;
      return;
    }

    // Get posts from current user and all friends
    const friendUids = [currentUserUid, ...Array.from(friendProfiles.keys())];
    let allEntries = [];

    for (const friendUid of friendUids) {
      const friendEntriesSnap = await db
        .collection("couples")
        .doc(friendUid)
        .collection("entries")
        .orderBy("createdAt", "desc")
        .get();

      friendEntriesSnap.forEach((doc) => {
        allEntries.push({
          id: doc.id,
          ...doc.data(),
          ownerUid: friendUid,
        });
      });
    }

    // Sort by date (newest first)
    allEntries.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

    // Render posts
    if (allEntries.length === 0) {
      DOM.newsfeedContent.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500">No posts from you or your friends yet.</p>
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
        <p class="text-red-500">Failed to load newsfeed. Please try again.</p>
      </div>
    `;
  } finally {
    hideLoadingOverlay();
  }
}

export async function loadLatestPosts() {
  showLoadingOverlay();
  DOM.newsfeedContent.innerHTML = "";

  try {
    const currentUserUid = auth.currentUser.uid;
    const friendProfiles = getFriendUserProfiles();

    if (!friendProfiles.size) {
      DOM.newsfeedContent.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500">Add friends to see their posts!</p>
        </div>
      `;
      return;
    }

    // Get only the latest post from each friend
    const friendUids = Array.from(friendProfiles.keys());
    let latestEntries = [];

    for (const friendUid of friendUids) {
      const friendEntrySnap = await db
        .collection("couples")
        .doc(friendUid)
        .collection("entries")
        .orderBy("createdAt", "desc")
        .limit(1)
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
          <p class="text-gray-500">No latest posts from friends yet.</p>
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
        <p class="text-red-500">Failed to load posts. Please try again.</p>
      </div>
    `;
  } finally {
    hideLoadingOverlay();
  }
}

function renderNewsfeedPost(entry) {
  const friendProfiles = getFriendUserProfiles();
  const currentUserProfile = getCurrentUserProfile();

  const ownerProfile =
    entry.ownerUid === auth.currentUser.uid
      ? currentUserProfile
      : friendProfiles.get(entry.ownerUid);

  if (!ownerProfile) return;

  const ownerName = ownerProfile.displayName;
  const ownerPhoto = ownerProfile.photoURL || "https://via.placeholder.com/40";
  const entryDate = entry.createdAt
    ? entry.createdAt.toDate().toLocaleDateString()
    : "Unknown Date"; // Handle cases where createdAt might be missing
  const imageCount = entry.imageUrls?.length || 0;

  const postElement = document.createElement("div");
  postElement.className = "bg-white rounded-xl shadow-md p-4 newsfeed-post";
  postElement.innerHTML = `
    <div class="flex items-center mb-3">
      <img src="${ownerPhoto}" alt="${ownerName}" class="w-10 h-10 rounded-full mr-3">
      <div>
        <p class="font-semibold">${ownerName}</p>
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
  likeBtn.addEventListener("click", async () => {
    const entryId = likeBtn.dataset.entryId;
    const entryOwnerUid = likeBtn.dataset.ownerUid;
    const entryRef = db
      .collection("couples")
      .doc(entryOwnerUid)
      .collection("entries")
      .doc(entryId);

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
  });

  // Update like count and icon dynamically (real-time listener)
  db.collection("couples")
    .doc(entry.ownerUid)
    .collection("entries")
    .doc(entry.id)
    .onSnapshot((snap) => {
      if (snap.exists) {
        const data = snap.data();
        const likes = data.likes || [];
        const likeCountSpan = postElement.querySelector(".like-count");
        likeCountSpan.textContent = likes.length;

        const likeIcon = likeBtn.querySelector("i");
        if (likes.includes(auth.currentUser.uid)) {
          likeIcon.classList.remove("fa-heart-o");
          likeIcon.classList.add("fas", "fa-heart");
          likeBtn.classList.add("text-rose-600");
        } else {
          likeIcon.classList.remove("fas", "fa-heart");
          likeIcon.classList.add("fa-heart-o");
          likeBtn.classList.remove("text-rose-600");
        }
      }
    });

  // Comments
  const commentBtn = postElement.querySelector(".comment-btn");
  const commentsSection = postElement.querySelector(".comments-section");
  const commentsList = postElement.querySelector(".comments-list");
  const commentInput = postElement.querySelector(".comment-input");
  const sendCommentBtn = postElement.querySelector(".send-comment-btn");

  commentBtn.onclick = () => {
    commentsSection.classList.toggle("hidden");
    // The comments listener will automatically load/update
  };

  sendCommentBtn.onclick = async () => {
    const commentText = commentInput.value.trim();
    if (!commentText) return;

    try {
      await db
        .collection("couples")
        .doc(entry.ownerUid)
        .collection("entries")
        .doc(entry.id)
        .collection("comments")
        .add({
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName,
          userPhoto: auth.currentUser.photoURL,
          commentText: commentText,
          createdAt: FieldValue.serverTimestamp(),
        });
      commentInput.value = "";
      Toast.fire({ icon: "success", title: "Comment added!" });
    } catch (e) {
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
      commentsList.innerHTML = "";
      snap.forEach((commentDoc) => {
        const c = commentDoc.data();
        const commentDiv = document.createElement("div");
        commentDiv.className = "flex items-start text-sm";
        commentDiv.innerHTML = `
          <img src="${c.userPhoto || "https://via.placeholder.com/24"}" alt="${
          c.userName
        }" class="w-6 h-6 rounded-full mr-2 mt-1">
          <div>
            <p><span class="font-semibold">${c.userName}:</span> ${escapeHTML(
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
        feather.replace({ iconNode: commentDiv });

        if (c.userId === auth.currentUser.uid) {
          commentDiv.querySelector(".delete-comment-btn").onclick = async () => {
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
      feather.replace({ iconNode: commentsList });
    });

  feather.replace({ iconNode: postElement }); // Replace feather icons for the new post
}