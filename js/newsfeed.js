// js/newsfeed.js
import { db, auth, FieldValue } from './firebase.js';
import { DOM }               from './dom.js';
import { showLoadingOverlay,
         hideLoadingOverlay,
         escapeHTML,
         Toast }             from './ui.js';
import { getFriendUserProfiles } from './auth.js';

/* ─────────────────────────── INITIAL SETUP ─────────────────────────── */
export function setupNewsfeedListeners() {
  DOM.newsfeedBtn.onclick = () => {
    showNewsfeedPage();
    setActiveTab('allPostsTab');
    loadNewsfeed();
  };

  DOM.allPostsTab.onclick = () => {
    setActiveTab('allPostsTab');
    loadNewsfeed();
  };

  DOM.latestPostsTab.onclick = () => {
    setActiveTab('latestPostsTab');
    loadLatestPosts();
  };
}

/* helper: show page & hide others that have [data-page] */
function showNewsfeedPage() {
  document.querySelectorAll('[data-page]').forEach(p => p.classList.add('hidden'));
  DOM.newsfeedPage.classList.remove('hidden');
}

function setActiveTab(id) {
  DOM.allPostsTab.classList.remove('bg-newsfeed-blue','text-white','active');
  DOM.latestPostsTab.classList.remove('bg-newsfeed-blue','text-white','active');

  const btn = document.getElementById(id);
  btn.classList.add('bg-newsfeed-blue','text-white','active');
}

/* ─────────────────────── LOADERS (friends’ posts only) ─────────────────────── */
export async function loadNewsfeed() {
  await loadPosts({ latestOnly:false });
}
async function loadLatestPosts() {
  await loadPosts({ latestOnly:true });
}

async function loadPosts({ latestOnly }) {
  showLoadingOverlay();
  DOM.newsfeedContent.innerHTML = '';

  try {
    const friendProfiles = getFriendUserProfiles();  // Map<uid,profile>
    if (!friendProfiles.size) {
      DOM.newsfeedContent.innerHTML = blank("Add friends to see their posts!");
      return;
    }

    const uids = Array.from(friendProfiles.keys());
    const entries = [];

    for (const uid of uids) {
      let q = db.collection('couples').doc(uid).collection('entries')
                .orderBy('createdAt','desc');
      if (latestOnly) q = q.limit(1);

      const snap = await q.get();
      snap.forEach(doc => entries.push({ id: doc.id, ...doc.data(), ownerUid: uid }));
    }

    entries.sort((a,b) => b.createdAt.toDate() - a.createdAt.toDate());
    if (!entries.length) {
      DOM.newsfeedContent.innerHTML = blank("No posts from friends yet.");
    } else {
      entries.forEach(renderPost);
    }
  } catch (e) {
    console.error(e);
    DOM.newsfeedContent.innerHTML = blank("Failed to load news-feed. Please try again.", true);
  } finally {
    hideLoadingOverlay();
  }
}

/* ─────────────────────────── RENDER ONE POST ─────────────────────────── */
function renderPost(entry) {
  const profiles = getFriendUserProfiles();
  const profile  = profiles.get(entry.ownerUid);
  if (!profile) return;

  const name = profile.displayName || 'Unknown';
  const photo= profile.photoURL || 'https://via.placeholder.com/40';
  const date = entry.createdAt?.toDate().toLocaleDateString() || '';

  const urls = entry.imageUrls || (entry.imageUrl ? [entry.imageUrl] : []);
  const likeCount = entry.likes?.length || 0;

  const art = document.createElement('article');
  art.className = 'bg-white rounded-xl shadow-md p-4 newsfeed-post';
  art.innerHTML = `
    <div class="flex items-center mb-3">
      <img src="${photo}" class="w-10 h-10 rounded-full mr-3" alt="${name}">
      <div>
        <p class="font-semibold">${name}</p>
        <p class="text-sm text-gray-500">${date}</p>
      </div>
    </div>

    <p class="mb-3 whitespace-pre-wrap">${escapeHTML(entry.note||'')}</p>

    ${urls.length ? `
      <div class="grid grid-cols-2 gap-2 mb-3">
        ${urls.slice(0,2).map(u=>`<img src="${u}" class="rounded-lg object-cover h-40 w-full">`).join('')}
      </div>
      ${urls.length>2 ? `<p class="text-sm text-gray-500">+${urls.length-2} more photos</p>`:''}
    ` : ''}

    <div class="flex items-center pt-3 border-t border-gray-100">
      <button class="like-btn flex items-center text-rose-500 mr-4"
              data-entry-id="${entry.id}" data-owner-uid="${entry.ownerUid}">
        <i class="fas fa-heart mr-1"></i><span class="like-count">${likeCount}</span>
      </button>
      <button class="comment-toggle flex items-center text-gray-500">
        <i class="fas fa-comment mr-1"></i><span>Comments</span>
      </button>
    </div>

    <div class="comments-section mt-4 hidden">
      <div class="comments-list space-y-2"></div>
      <div class="flex mt-3">
        <input type="text" placeholder="Add a comment…" class="comment-input flex-1 rounded-lg border-gray-300">
        <button class="send-comment-btn ml-2 px-4 py-2 bg-rose-500 text-white rounded-lg">Send</button>
      </div>
    </div>
  `;
  DOM.newsfeedContent.append(art);

  /* likes */
  const likeBtn = art.querySelector('.like-btn');
  likeBtn.onclick = async () => {
    const ref = db.collection('couples').doc(entry.ownerUid).collection('entries').doc(entry.id);
    const snap = await ref.get();
    if (!snap.exists) return;
    let likes = snap.data().likes || [];
    const me = auth.currentUser.uid;
    likes = likes.includes(me) ? likes.filter(u=>u!==me) : [...likes,me];
    await ref.update({ likes });
  };

  /* live like count */
  db.collection('couples').doc(entry.ownerUid).collection('entries').doc(entry.id)
    .onSnapshot(s => {
      const likes = s.data()?.likes || [];
      art.querySelector('.like-count').textContent = likes.length;
      const icon = likeBtn.querySelector('i');
      if (likes.includes(auth.currentUser.uid)) {
        icon.classList.add('fas','fa-heart'); icon.classList.remove('fa-heart-o');
        likeBtn.classList.add('text-rose-600');
      } else {
        icon.classList.remove('fas','fa-heart'); icon.classList.add('fa-heart-o');
        likeBtn.classList.remove('text-rose-600');
      }
    });

  /* comments */
  const toggle   = art.querySelector('.comment-toggle');
  const section  = art.querySelector('.comments-section');
  const list     = art.querySelector('.comments-list');
  const input    = art.querySelector('.comment-input');
  const sendBtn  = art.querySelector('.send-comment-btn');

  toggle.onclick = () => section.classList.toggle('hidden');

  sendBtn.onclick = async () => {
    const txt = input.value.trim();
    if (!txt) return;
    await db.collection('couples').doc(entry.ownerUid).collection('entries')
            .doc(entry.id).collection('comments').add({
              userId:   auth.currentUser.uid,
              userName: auth.currentUser.displayName,
              userPhoto: auth.currentUser.photoURL,
              commentText: txt,
              createdAt: FieldValue.serverTimestamp()
            });
    input.value='';
    Toast.fire({icon:'success',title:'Comment added!'});
  };

  /* live comment list */
  db.collection('couples').doc(entry.ownerUid).collection('entries')
    .doc(entry.id).collection('comments').orderBy('createdAt','asc')
    .onSnapshot(snap=>{
      list.innerHTML='';
      snap.forEach(cdoc=>{
        const c = cdoc.data();
        const div=document.createElement('div');
        div.className='flex items-start text-sm';
        div.innerHTML=`
          <img src="${c.userPhoto||'https://via.placeholder.com/24'}" class="w-6 h-6 rounded-full mr-2 mt-1">
          <div>
            <p><span class="font-semibold">${c.userName}:</span> ${escapeHTML(c.commentText)}</p>
            <p class="text-xs text-gray-400">${c.createdAt ? new Date(c.createdAt.toDate()).toLocaleString() : 'Just now'}</p>
          </div>
          ${c.userId===auth.currentUser.uid ? `
            <button class="ml-auto text-gray-400 hover:text-red-500 delete-comment"><i class="fas fa-trash-alt text-xs"></i></button>
          `:''}
        `;
        list.append(div);

        if (c.userId===auth.currentUser.uid) {
          div.querySelector('.delete-comment').onclick=()=>cdoc.ref.delete();
        }
      });
    });
}

/* utility */
const blank = (msg, err=false) => `
  <div class="text-center py-8"><p class="${err?'text-red-500':'text-gray-500'}">${msg}</p></div>`;
