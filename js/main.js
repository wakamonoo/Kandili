/*  Tsunagari – Google-only auth, unlimited image uploads  */
import { firebaseConfig, IMGUR_CLIENT_ID } from "./config.js";

/* ── Firebase init ───────────────────────────────────── */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ── DOM refs ─────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const signInBtn = $("signInBtn");
const signOutBtn = $("signOutBtn");
const timeline = $("timeline");
const openModal = $("openModalBtn");
const modal = $("entryModal");
const cancelBtn = $("cancelBtn");
const saveBtn = $("saveEntryBtn");

const dateInput = $("entryDate");
const noteInput = $("entryNote");
const imgInput = $("entryImg");

/* ── Auth UI toggle ───────────────────────────────────── */
function setAuthUI(user) {
  const logged = !!user;
  signInBtn.classList.toggle("hidden", logged);
  signOutBtn.classList.toggle("hidden", !logged);
  timeline.classList.toggle("hidden", !logged);
  openModal.classList.toggle("hidden", !logged);
}

/* ── Google login / logout ────────────────────────────── */
signInBtn.onclick = async () => {
  try {
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  } catch (e) {
    console.error("Google sign-in failed:", e);
    alert("Google sign-in failed. See console.");
  }
};
signOutBtn.onclick = () => auth.signOut();

/* ── Auth listener & live diary feed ──────────────────── */
let coupleDoc = null;
auth.onAuthStateChanged((user) => {
  setAuthUI(user);
  if (!user) {
    timeline.innerHTML = "";
    return;
  }

  coupleDoc = db.collection("couples").doc(user.uid);
  coupleDoc
    .collection("entries")
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      timeline.innerHTML = "";
      snap.forEach(renderEntry);
    });
});

/* ── Modal open / close ───────────────────────────────── */
openModal.onclick = () => {
  modal.classList.remove("hidden");
  dateInput.value = new Date().toISOString().slice(0, 10);
};
cancelBtn.onclick = () => {
  modal.classList.add("hidden");
  resetForm();
};

/* ── Save entry with many images ──────────────────────── */
saveBtn.onclick = async () => {
  saveBtn.disabled = true;

  try {
    // 1) upload every selected file to Imgur
    const imageUrls = [];
    const files = Array.from(imgInput.files);

    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      const url = await uploadToImgur(f);
      imageUrls.push(url);
    }

    // 2) write Firestore doc
    await coupleDoc.collection("entries").add({
      date: dateInput.value,
      note: noteInput.value.trim(),
      imageUrls,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error(e);
    alert("Could not save entry.");
  } finally {
    saveBtn.disabled = false;
    modal.classList.add("hidden");
    resetForm();
  }
};

/* ── Imgur helper ─────────────────────────────────────── */
async function uploadToImgur(file) {
  const body = new FormData();
  body.append("image", file);

  const res = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
    body,
  });
  const json = await res.json();
  if (!json.success) throw new Error("Imgur upload failed");
  return json.data.link;
}

/* ── Render diary card ────────────────────────────────── */
function renderEntry(doc) {
  const d = doc.data();
  const urls = d.imageUrls || (d.imageUrl ? [d.imageUrl] : []);

  const card = document.createElement("article");
  card.className = "bg-white rounded-2xl shadow-md p-4";

  card.innerHTML = `
    <p class="text-sm text-gray-400">${d.date}</p>
    <p class="mt-1 text-lg whitespace-pre-wrap">${escapeHTML(d.note)}</p>
    <div class="mt-2 grid grid-cols-2 gap-2">
      ${urls.map((u) => `<img src="${u}" class="rounded-lg">`).join("")}
    </div>
  `;
  timeline.append(card);
}

/* ── Helpers ──────────────────────────────────────────── */
function resetForm() {
  noteInput.value = "";
  imgInput.value = "";
}
function escapeHTML(str = "") {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  };
  return str.replace(/[&<>'"]/g, (c) => map[c]);
}
