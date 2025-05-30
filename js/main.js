/* Tsunagari — Google auth, unlimited images, SweetAlert2 UI */
import { firebaseConfig, IMGUR_CLIENT_ID } from "./config.js";

/* ── Firebase init ─────────────────────────────── */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ── DOM refs ───────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const signInBtn = $("signInBtn");
const signOutBtn = $("signOutBtn");
const timeline = $("timeline"); // Main container
const timelineEntries = $("timelineEntries"); // Container for actual entries
const openModal = $("openModalBtn");
const modal = $("entryModal");
const cancelBtn = $("cancelBtn");
const saveBtn = $("saveEntryBtn");
const loadingOverlay = $("loadingOverlay");

// References to the fallback messages within the timeline
const welcomeMessage = $("welcomeMessage");
const noDataMessage = $("noDataMessage");

const dateInput = $("entryDate");
const noteInput = $("entryNote");
const imgInput = $("entryImg");

/* Helpers */
let currentId = null; // null → create mode
const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 1800,
  background: "#fce7f3",
  color: "#831843",
});

// Function to control visibility of fallback messages and timeline entries
function updateTimelineDisplay(type) {
  // Hide all potential content first
  welcomeMessage.classList.add("hidden");
  noDataMessage.classList.add("hidden");
  timelineEntries.classList.add("hidden"); // Hide the entries container

  // Remove any centering styles from the main timeline container
  // It will only be centered if a message is shown
  timeline.classList.remove(
    "flex",
    "flex-col",
    "items-center",
    "justify-center"
  );

  if (type === "welcome") {
    welcomeMessage.classList.remove("hidden");
    // Add centering styles to the main timeline container
    timeline.classList.add(
      "flex",
      "flex-col",
      "items-center",
      "justify-center"
    );
  } else if (type === "noData") {
    noDataMessage.classList.remove("hidden");
    // Add centering styles to the main timeline container
    timeline.classList.add(
      "flex",
      "flex-col",
      "items-center",
      "justify-center"
    );
  } else if (type === "entries") {
    timelineEntries.classList.remove("hidden"); // Show the entries container
    // No centering needed as entries will fill the space
  }
}

/* ── Auth UI toggle ─────────────────────────────── */
function setAuthUI(user) {
  const isLoggedIn = !!user;

  signInBtn.classList.toggle("hidden", isLoggedIn);
  signOutBtn.classList.toggle("hidden", !isLoggedIn);
  openModal.classList.toggle("hidden", !isLoggedIn);

  timelineEntries.innerHTML = ""; // Always clear previous entries

  if (!isLoggedIn) {
    updateTimelineDisplay("welcome"); // Show welcome message
  } else {
    // When logged in, the onSnapshot listener will determine if to show noData or entries
    // For now, just hide all dynamic content until data loads
    updateTimelineDisplay("loading"); // Or just clear and wait for onSnapshot
  }
}

/* ── Login / logout ─────────────────────────────── */
signInBtn.onclick = () => {
  loadingOverlay.classList.remove("hidden"); // Show loader
  auth
    .signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch((e) =>
      Swal.fire({ icon: "error", title: "Sign-in failed", text: e.message })
    )
    .finally(() => {
      loadingOverlay.classList.add("hidden"); // Hide loader
    });
};

signOutBtn.onclick = () => {
  loadingOverlay.classList.remove("hidden"); // Show loader
  auth.signOut().finally(() => {
    loadingOverlay.classList.add("hidden"); // Hide loader
  });
};

/* ── Live feed ──────────────────────────────────── */
let coupleDoc = null;
auth.onAuthStateChanged((user) => {
  setAuthUI(user); // Set initial UI based on login status

  if (!user) {
    // If no user, setAuthUI already displayed the welcome message.
    return;
  }

  // User is logged in, hide any current fallback messages and show loader for data fetching
  // updateTimelineDisplay will be called by onSnapshot
  loadingOverlay.classList.remove("hidden");

  coupleDoc = db.collection("couples").doc(user.uid);
  coupleDoc
    .collection("entries")
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      timelineEntries.innerHTML = ""; // Clear existing entries

      if (snap.empty) {
        updateTimelineDisplay("noData"); // Show 'no data' message
      } else {
        updateTimelineDisplay("entries"); // Prepare for entries
        snap.forEach(renderCard); // Render actual entries
      }
      loadingOverlay.classList.add("hidden"); // Hide loader after data is fetched
    });
});

/* ── New memory modal ───────────────────────────── */
openModal.onclick = () => {
  currentId = null;
  saveBtn.textContent = "Save";
  dateInput.value = new Date().toISOString().slice(0, 10);
  noteInput.value = "";
  imgInput.value = "";
  modal.classList.remove("hidden");
};
cancelBtn.onclick = () => {
  modal.classList.add("hidden");
  resetForm();
};

/* ── Save / update ─────────────────────────────── */
saveBtn.onclick = async () => {
  saveBtn.disabled = true;
  loadingOverlay.classList.remove("hidden"); // Show loader during save/update
  try {
    const imageUrls = [];
    for (const f of Array.from(imgInput.files))
      if (f.type.startsWith("image/")) imageUrls.push(await uploadToImgur(f));

    const payload = {
      date: dateInput.value,
      note: noteInput.value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (imageUrls.length) payload.imageUrls = imageUrls;

    if (currentId) {
      await coupleDoc.collection("entries").doc(currentId).update(payload);
      Toast.fire({ icon: "success", title: "Entry updated!" });
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await coupleDoc.collection("entries").add(payload);
      Toast.fire({ icon: "success", title: "Memory saved!" });
    }
  } catch (e) {
    Swal.fire({ icon: "error", title: "Save failed", text: e.message });
  } finally {
    saveBtn.disabled = false;
    modal.classList.add("hidden");
    resetForm();
    loadingOverlay.classList.add("hidden"); // Hide loader
  }
};

/* ── Delete helper ─────────────────────────────── */
function askDelete(id) {
  Swal.fire({
    title: "Delete this memory?",
    text: "You can’t undo this action.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#f43f5e",
    cancelButtonColor: "#a1a1aa",
    confirmButtonText: "Yes, delete!",
  }).then((res) => {
    if (!res.isConfirmed) return;
    loadingOverlay.classList.remove("hidden"); // Show loader during delete
    coupleDoc
      .collection("entries")
      .doc(id)
      .delete()
      .then(() => Toast.fire({ icon: "success", title: "Deleted!" }))
      .catch((e) =>
        Swal.fire({ icon: "error", title: "Delete failed", text: e.message })
      )
      .finally(() => {
        loadingOverlay.classList.add("hidden"); // Hide loader
      });
  });
}

/* ── Imgur upload ──────────────────────────────── */
async function uploadToImgur(file) {
  const fd = new FormData();
  fd.append("image", file);
  const r = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
    body: fd,
  });
  const j = await r.json();
  if (!j.success) throw new Error("Imgur upload failed");
  return j.data.link;
}

/* ── Render card ───────────────────────────────── */
function renderCard(doc) {
  const d = doc.data();
  const urls = d.imageUrls || (d.imageUrl ? [d.imageUrl] : []);

  const article = document.createElement("article");
  article.className =
    "bg-white rounded-2xl shadow-md p-4 transition duration-150 transform hover:-translate-y-1 hover:shadow-lg";

  article.innerHTML = `
    <div class="flex justify-between items-start">
      <p class="text-sm text-gray-400">${d.date}</p>
      <div class="flex space-x-2 text-gray-400">
        <button class="edit" title="Edit"><i data-feather="edit-2"></i></button>
        <button class="delete" title="Delete"><i data-feather="trash-2"></i></button>
      </div>
    </div>
    <p class="mt-1 text-lg whitespace-pre-wrap">${escapeHTML(d.note)}</p>
    <div class="mt-2 grid grid-cols-2 gap-2">
      ${urls.map((u) => `<img src="${u}" class="rounded-lg">`).join("")}
    </div>
  `;

  // **IMPORTANT CHANGE:** Append the article to the DOM *before* calling feather.replace()
  timelineEntries.append(article);

  // Attach event listeners *after* innerHTML is set and the element is in the DOM
  article.querySelector(".edit").onclick = () => beginEdit(doc);
  article.querySelector(".delete").onclick = () => askDelete(doc.id);

  // Now, call feather.replace on the element which is now part of the DOM tree.
  feather.replace({ iconNode: article });
}

/* ── Begin edit ───────────────────────────────── */
function beginEdit(doc) {
  const d = doc.data();
  currentId = doc.id;
  saveBtn.textContent = "Update";
  dateInput.value = d.date;
  noteInput.value = d.note || "";
  imgInput.value = "";
  modal.classList.remove("hidden");
}

/* ── Utils ────────────────────────────────────── */
function escapeHTML(s = "") {
  return s.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[
        c
      ])
  );
}
function resetForm() {
  currentId = null;
  dateInput.value = "";
  noteInput.value = "";
  imgInput.value = "";
  saveBtn.textContent = "Save";
}
