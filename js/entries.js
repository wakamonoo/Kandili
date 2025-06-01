// js/entries.js

import { db, auth, FieldValue } from './firebase.js';
import { DOM } from './dom.js';
import { Toast, showLoadingOverlay, hideLoadingOverlay, hideEntryModal } from './ui.js';
import { IMGUR_CLIENT_ID } from './config.js'; 

let currentEntryId = null; 

// ━━━━━━━━━━━━━━━━━━ Setup Listeners for Entry Modal Actions ━━━━━━━━━━━━━━━━━━ //
export function setupEntryModalListeners() {
  DOM.openModalBtn.onclick = () => {
    currentEntryId = null;
    DOM.saveEntryBtn.textContent = "Save";
    DOM.entryDateInput.value = new Date().toISOString().slice(0, 10);
    DOM.entryNoteInput.value = "";
    DOM.entryImgInput.value = "";
    DOM.entryModal.classList.remove("hidden");
  };

  DOM.cancelBtn.onclick = () => {
    hideEntryModal();
    resetEntryForm();
  };

  DOM.saveEntryBtn.onclick = async () => {
    DOM.saveEntryBtn.disabled = true;
    showLoadingOverlay();
    try {
      const imageUrls = [];
      for (const f of Array.from(DOM.entryImgInput.files)) {
        if (f.type.startsWith("image/")) imageUrls.push(await uploadToImgur(f));
      }

      const payload = {
        date: DOM.entryDateInput.value,
        note: DOM.entryNoteInput.value.trim(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (imageUrls.length) payload.imageUrls = imageUrls;

      const coupleDocRef = db.collection("couples").doc(auth.currentUser.uid);

      if (currentEntryId) {
        await coupleDocRef.collection("entries").doc(currentEntryId).update(payload);
        Toast.fire({ icon: "success", title: "Entry updated!" });
      } else {
        payload.createdAt = FieldValue.serverTimestamp();
        await coupleDocRef.collection("entries").add(payload);
        Toast.fire({ icon: "success", title: "Memory saved!" });
      }
    } catch (e) {
      Swal.fire({ icon: "error", title: "Save failed", text: e.message });
    } finally {
      DOM.saveEntryBtn.disabled = false;
      hideEntryModal();
      resetEntryForm();
      hideLoadingOverlay();
    }
  };
}

// ━━━━━━━━━━━━━━━━━━ Begin Editing Existing Entry ━━━━━━━━━━━━━━━━━━ //
export function beginEditEntry(entryData) {
  currentEntryId = entryData.id;
  DOM.saveEntryBtn.textContent = "Update";
  DOM.entryDateInput.value = entryData.date;
  DOM.entryNoteInput.value = entryData.note || "";
  DOM.entryImgInput.value = ""; 
  DOM.entryModal.classList.remove("hidden");
}

// ━━━━━━━━━━━━━━━━━━ Prompt Deletion of an Entry ━━━━━━━━━━━━━━━━━━ //
export function askDeleteEntry(entryId) {
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
    showLoadingOverlay();
    db.collection("couples")
      .doc(auth.currentUser.uid)
      .collection("entries")
      .doc(entryId)
      .delete()
      .then(() => Toast.fire({ icon: "success", title: "Deleted!" }))
      .catch((e) =>
        Swal.fire({ icon: "error", title: "Delete failed", text: e.message })
      )
      .finally(() => hideLoadingOverlay());
  });
}

// ━━━━━━━━━━━━━━━━━━ Reset Entry Modal Form Fields ━━━━━━━━━━━━━━━━━━ //
function resetEntryForm() {
  currentEntryId = null;
  DOM.entryDateInput.value = "";
  DOM.entryNoteInput.value = "";
  DOM.entryImgInput.value = "";
  DOM.saveEntryBtn.textContent = "Save";
}

// ━━━━━━━━━━━━━━━━━━ Upload Image File to Imgur ━━━━━━━━━━━━━━━━━━ //
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
