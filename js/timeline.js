// js/timeline.js

import { db, auth, FieldValue } from './firebase.js';
import { DOM } from './dom.js';
import { Toast, updateTimelineDisplay, escapeHTML, showLoadingOverlay, hideLoadingOverlay } from './ui.js';
import { getCurrentUserProfile, getFriendUserProfiles } from './auth.js';
import { beginEditEntry, askDeleteEntry } from './entries.js';

let unsubscribeEntries = null; // To manage snapshot listeners

export async function fetchAndRenderTimelineEntries() {
  if (unsubscribeEntries) unsubscribeEntries(); // Unsubscribe from previous listeners

  const currentUserUid = auth.currentUser.uid;
  const currentUserProfile = getCurrentUserProfile();
  const friendUserProfiles = getFriendUserProfiles();

  let allEntries = [];

  // Listen to current user's entries
  const currentUserEntriesQuery = db.collection("couples").doc(currentUserUid).collection("entries").orderBy("createdAt", "desc");
  unsubscribeEntries = currentUserEntriesQuery.onSnapshot(async (snap) => {
    allEntries = []; // Clear entries before re-populating

    // Add current user's entries
    snap.forEach(doc => {
      allEntries.push({ id: doc.id, ...doc.data(), ownerUid: currentUserUid });
    });

    // Add friends' entries (refetch on each change to current user's entries or profile)
    // This could be optimized for very large friend lists/frequent updates by having separate listeners per friend,
    // but for simplicity, we refetch here.
    if (currentUserProfile && currentUserProfile.friends) {
      for (const friendUid of currentUserProfile.friends) {
        const friendEntriesSnap = await db.collection("couples").doc(friendUid).collection("entries").orderBy("createdAt", "desc").get();
        friendEntriesSnap.forEach(doc => {
          allEntries.push({ id: doc.id, ...doc.data(), ownerUid: friendUid });
        });
      }
    }

    // Sort all entries by createdAt timestamp (descending)
    allEntries.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

    DOM.timelineEntries.innerHTML = "";
    if (allEntries.length === 0) {
      updateTimelineDisplay("noData");
    } else {
      updateTimelineDisplay("entries");
      allEntries.forEach(renderCard);
    }
  });
}

function renderCard(doc) {
  const d = doc; // doc is already the data object from the aggregation
  const docId = d.id;
  const ownerUid = d.ownerUid;

  const ownerProfile = (ownerUid === auth.currentUser.uid)
    ? getCurrentUserProfile()
    : getFriendUserProfiles().get(ownerUid);

  const ownerName = ownerProfile ? ownerProfile.displayName : "Unknown User";
  const ownerPhoto = ownerProfile ? ownerProfile.photoURL : "https://via.placeholder.com/24";

  const urls = d.imageUrls || (d.imageUrl ? [d.imageUrl] : []);
  const article = document.createElement("article");
  article.className =
    "bg-white rounded-2xl shadow-md p-4 transition duration-150 transform hover:-translate-y-1 hover:shadow-lg";
  article.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center">
        <img src="${ownerPhoto}" alt="${ownerName}" class="w-8 h-8 rounded-full mr-2">
        <p class="text-sm font-semibold text-gray-700">${ownerName}</p>
      </div>
      <p class="text-sm text-gray-400">${d.date}</p>
      <div class="flex space-x-2 text-gray-400">
        ${ownerUid === auth.currentUser.uid ? `
          <button class="edit-entry" data-id="${docId}" title="Edit"><i data-feather="edit-2"></i></button>
          <button class="delete-entry" data-id="${docId}" title="Delete"><i data-feather="trash-2"></i></button>
        ` : ''}
      </div>
    </div>
    <p class="mt-1 text-lg whitespace-pre-wrap">${escapeHTML(d.note)}</p>
    <div class="mt-2 grid grid-cols-2 gap-2">
      ${urls.map((u) => `<img src="${u}" class="rounded-lg">`).join("")}
    </div>

    <div class="flex items-center mt-4 border-t pt-4 border-gray-100">
        <button class="like-btn flex items-center text-rose-500 mr-4" data-entry-id="${docId}" data-owner-uid="${ownerUid}">
            <i class="fas fa-heart mr-1"></i>
            <span class="like-count">${d.likes ? d.likes.length : 0}</span>
        </button>
        <button class="comment-btn flex items-center text-gray-500" data-entry-id="${docId}" data-owner-uid="${ownerUid}">
            <i class="fas fa-comment mr-1"></i>
            Comments
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
  DOM.timelineEntries.append(article);

  // Add event listeners for edit/delete
  if (ownerUid === auth.currentUser.uid) {
    article.querySelector(".edit-entry").onclick = () => beginEditEntry(d); // Pass full data for editing
    article.querySelector(".delete-entry").onclick = () => askDeleteEntry(docId);
  }

  // Reactions
  const likeBtn = article.querySelector(".like-btn");
  likeBtn.addEventListener('click', async () => {
    const entryId = likeBtn.dataset.entryId;
    const entryOwnerUid = likeBtn.dataset.ownerUid;
    const entryRef = db.collection("couples").doc(entryOwnerUid).collection("entries").doc(entryId);

    const entrySnap = await entryRef.get();
    if (entrySnap.exists) {
      const entryData = entrySnap.data();
      let likes = entryData.likes || [];
      const userLiked = likes.includes(auth.currentUser.uid);

      if (userLiked) {
        likes = likes.filter(uid => uid !== auth.currentUser.uid); // Unlike
      } else {
        likes.push(auth.currentUser.uid); // Like
      }
      await entryRef.update({ likes: likes });
    }
  });

  // Update like count and icon dynamically
  db.collection("couples").doc(ownerUid).collection("entries").doc(docId).onSnapshot(snap => {
    if (snap.exists) {
      const data = snap.data();
      const likes = data.likes || [];
      const likeCountSpan = article.querySelector(".like-count");
      likeCountSpan.textContent = likes.length;

      const likeIcon = likeBtn.querySelector('i');
      if (likes.includes(auth.currentUser.uid)) {
          likeIcon.classList.remove('fa-heart-o');
          likeIcon.classList.add('fas', 'fa-heart');
          likeBtn.classList.add('text-rose-600');
      } else {
          likeIcon.classList.remove('fas', 'fa-heart');
          likeIcon.classList.add('fa-heart-o');
          likeBtn.classList.remove('text-rose-600');
      }
    }
  });


  // Comments
  const commentBtn = article.querySelector(".comment-btn");
  const commentsSection = article.querySelector(".comments-section");
  const commentsList = article.querySelector(".comments-list");
  const commentInput = article.querySelector(".comment-input");
  const sendCommentBtn = article.querySelector(".send-comment-btn");

  commentBtn.onclick = () => {
    commentsSection.classList.toggle("hidden");
    // The comments listener will automatically load/update
  };

  sendCommentBtn.onclick = async () => {
    const commentText = commentInput.value.trim();
    if (!commentText) return;

    try {
      await db.collection("couples").doc(ownerUid).collection("entries").doc(docId).collection("comments").add({
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
  db.collection("couples").doc(ownerUid).collection("entries").doc(docId).collection("comments").orderBy("createdAt", "asc")
    .onSnapshot(snap => {
      commentsList.innerHTML = "";
      snap.forEach(commentDoc => {
        const c = commentDoc.data();
        const commentDiv = document.createElement("div");
        commentDiv.className = "flex items-start text-sm";
        commentDiv.innerHTML = `
          <img src="${c.userPhoto || 'https://via.placeholder.com/24'}" alt="${c.userName}" class="w-6 h-6 rounded-full mr-2 mt-1">
          <div>
            <p><span class="font-semibold">${c.userName}:</span> ${escapeHTML(c.commentText)}</p>
            <p class="text-xs text-gray-400">${c.createdAt ? new Date(c.createdAt.toDate()).toLocaleString() : 'Just now'}</p>
          </div>
          ${c.userId === auth.currentUser.uid ? `<button class="ml-auto text-gray-400 hover:text-red-500 delete-comment-btn" data-comment-id="${commentDoc.id}"><i data-feather="trash-2" class="w-4 h-4"></i></button>` : ''}
        `;
        commentsList.append(commentDiv);
        feather.replace({ iconNode: commentDiv });

        if (c.userId === auth.currentUser.uid) {
            commentDiv.querySelector('.delete-comment-btn').onclick = async () => {
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
                            await db.collection("couples").doc(ownerUid).collection("entries").doc(docId).collection("comments").doc(commentDoc.id).delete();
                            Toast.fire({ icon: "success", title: "Comment deleted!" });
                        } catch (e) {
                            Swal.fire({ icon: "error", title: "Delete failed", text: e.message });
                        }
                    }
                });
            };
        }
      });
      feather.replace({ iconNode: commentsList });
    });


  feather.replace({ iconNode: article });
}