// js/newsfeed.js
import { db, auth } from './firebase.js';
import { DOM } from './dom.js';
import { showLoadingOverlay, hideLoadingOverlay } from './ui.js';
import { getFriendUserProfiles } from './auth.js';

export function setupNewsfeedListeners() {
  DOM.newsfeedBtn.onclick = () => {
    showNewsfeedModal();
    loadNewsfeed();
  };
  
  DOM.closeNewsfeedModalBtn.onclick = hideNewsfeedModal;
  
  DOM.allPostsTab.onclick = () => {
    setActiveTab('allPostsTab');
    loadNewsfeed();
  };
  
  DOM.latestPostsTab.onclick = () => {
    setActiveTab('latestPostsTab');
    loadLatestPosts();
  };
}

function setActiveTab(activeId) {
  // Remove active class from all tabs
  DOM.allPostsTab.classList.remove('bg-newsfeed-blue', 'text-white');
  DOM.latestPostsTab.classList.remove('bg-newsfeed-blue', 'text-white');
  
  // Add active class to the clicked tab
  const activeTab = document.getElementById(activeId);
  activeTab.classList.add('bg-newsfeed-blue', 'text-white');
}

export function showNewsfeedModal() {
  DOM.newsfeedModal.classList.remove("hidden");
}

export function hideNewsfeedModal() {
  DOM.newsfeedModal.classList.add("hidden");
}

export async function loadNewsfeed() {
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
    
    // Get posts from all friends
    const friendUids = Array.from(friendProfiles.keys());
    let allEntries = [];
    
    for (const friendUid of friendUids) {
      const friendEntriesSnap = await db.collection("couples")
        .doc(friendUid)
        .collection("entries")
        .orderBy("createdAt", "desc")
        .get();
      
      friendEntriesSnap.forEach(doc => {
        allEntries.push({ 
          id: doc.id, 
          ...doc.data(), 
          ownerUid: friendUid 
        });
      });
    }
    
    // Sort by date (newest first)
    allEntries.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
    
    // Render posts
    if (allEntries.length === 0) {
      DOM.newsfeedContent.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500">No posts from friends yet.</p>
        </div>
      `;
    } else {
      allEntries.forEach(entry => {
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

async function loadLatestPosts() {
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
      const friendEntrySnap = await db.collection("couples")
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
          ownerUid: friendUid 
        });
      }
    }
    
    // Sort by date (newest first)
    latestEntries.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
    
    // Render posts
    if (latestEntries.length === 0) {
      DOM.newsfeedContent.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500">No posts from friends yet.</p>
        </div>
      `;
    } else {
      latestEntries.forEach(entry => {
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
  const ownerProfile = friendProfiles.get(entry.ownerUid);
  
  if (!ownerProfile) return;
  
  const ownerName = ownerProfile.displayName;
  const ownerPhoto = ownerProfile.photoURL || "https://via.placeholder.com/40";
  const entryDate = entry.createdAt.toDate().toLocaleDateString();
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
    
    <p class="mb-3 whitespace-pre-wrap">${entry.note || ""}</p>
    
    ${imageCount > 0 ? `
      <div class="grid grid-cols-2 gap-2 mb-3">
        ${entry.imageUrls.slice(0, 2).map(url => 
          `<img src="${url}" class="rounded-lg object-cover h-40 w-full">`
        ).join('')}
      </div>
      ${imageCount > 2 ? `<p class="text-sm text-gray-500">+${imageCount - 2} more photos</p>` : ''}
    ` : ''}
    
    <div class="flex items-center mt-3 pt-3 border-t border-gray-100">
      <button class="like-btn flex items-center text-rose-500 mr-4">
        <i class="fas fa-heart mr-1"></i>
        <span class="like-count">${entry.likes?.length || 0}</span>
      </button>
      <button class="comment-btn flex items-center text-gray-500">
        <i class="fas fa-comment mr-1"></i>
        <span>Comment</span>
      </button>
    </div>
  `;
  
  DOM.newsfeedContent.appendChild(postElement);
}