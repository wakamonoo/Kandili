import { firebaseConfig, IMGUR_CLIENT_ID } from "./config.js";

/* ───────── Firebase init ───────── */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

/* In this starter the couple’s diary = the user’s UID.
   Later you can pair two UIDs to one shared doc.        */
let coupleDoc;

/* ───────── DOM refs ───────── */
const timeline   = document.getElementById("timeline");
const modal      = document.getElementById("entryModal");
const openModal  = document.getElementById("openModalBtn");
const cancelBtn  = document.getElementById("cancelBtn");
const saveBtn    = document.getElementById("saveEntryBtn");
const signOutBtn = document.getElementById("signOutBtn");

const dateInput  = document.getElementById("entryDate");
const noteInput  = document.getElementById("entryNote");
const imgInput   = document.getElementById("entryImg");

/* ───────── Modal handlers ───────── */
openModal.onclick = () => {
  modal.classList.remove("hidden");
  dateInput.value = new Date().toISOString().slice(0, 10);   // today
};

cancelBtn.onclick = () => {
  modal.classList.add("hidden");
  resetForm();
};

/* ───────── Save entry ───────── */
saveBtn.onclick = async () => {
  saveBtn.disabled = true;

  try {
    // ─ Upload photo to Imgur if present
    let imageUrl = "";
    const file = imgInput.files[0];
    if (file) imageUrl = await uploadToImgur(file);

    // ─ Add Firestore doc
    await coupleDoc.collection("entries").add({
      date: dateInput.value,
      note: noteInput.value.trim(),
      imageUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error(err);
    alert("Could not save entry 😢");
  } finally {
    saveBtn.disabled = false;
    modal.classList.add("hidden");
    resetForm();
  }
};

/* ───────── Imgur upload helper ───────── */
async function uploadToImgur(file) {
  const body = new FormData();
  body.append("image", file);

  const res  = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
    body
  });
  const json = await res.json();
  if (!json.success) throw new Error("Imgur upload failed");
  return json.data.link;   // public URL
}

/* ───────── Timeline render ───────── */
function renderEntry(doc) {
  const d = doc.data();
  const card = document.createElement("article");
  card.className = "bg-white rounded-2xl shadow-md p-4";

  card.innerHTML = `
    <p class="text-sm text-gray-400">${d.date}</p>
    <p class="mt-1 text-lg whitespace-pre-wrap">${sanitize(d.note)}</p>
    ${d.imageUrl ? `<img src="${d.imageUrl}" class="rounded-xl mt-2" />` : ""}
  `;
  timeline.prepend(card);
}

const htmlMap = { "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" };
const sanitize = (str="") => str.replace(/[&<>'"]/g, c => htmlMap[c]);

/* ───────── Auth flow ───────── */
auth.onAuthStateChanged(async (user) => {
  if (!user) { await auth.signInAnonymously(); return; }

  signOutBtn.classList.remove("hidden");
  signOutBtn.onclick = () => auth.signOut();

  coupleDoc = db.collection("couples").doc(user.uid);

  // Live listener
  coupleDoc.collection("entries")
           .orderBy("createdAt", "desc")
           .onSnapshot(snap => {
             timeline.innerHTML = "";
             snap.forEach(renderEntry);
           });
});

/* ───────── Helpers ───────── */
function resetForm() {
  noteInput.value = "";
  imgInput.value  = "";
}
