// Observes the Blobs handed to URL.createObjectURL, which is how every download
// in javascript-excel/dom starts. The Legacy tab uses it to get hold of the file
// the 0.x <ExcelFile> produced (that API has no "return the file" option) and
// compare it with the 1.0 file. Installed once; it never changes the result.
type Listener = (blob: Blob) => void;
const listeners = new Set<Listener>();
let installed = false;

function install(): void {
  if (installed || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  installed = true;
  const original = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (obj: Blob | MediaSource): string => {
    if (obj instanceof Blob) for (const l of listeners) l(obj);
    return original(obj);
  };
}

export function onBlobCreated(listener: Listener): () => void {
  install();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
