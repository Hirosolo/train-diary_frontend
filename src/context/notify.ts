// Lightweight global notifier that can be called from anywhere (including non-React modules)
// The NotificationProvider sets these callbacks on mount.

type NotifyFn = (message: string) => void;

let errorNotifier: NotifyFn | null = null;
let successNotifier: NotifyFn | null = null;

export function setErrorNotifier(fn: NotifyFn) {
  errorNotifier = fn;
}

export function setSuccessNotifier(fn: NotifyFn) {
  successNotifier = fn;
}

export function notifyError(message: string) {
  if (errorNotifier) {
    errorNotifier(message);
  } else {
    // Fallback to console if provider not mounted yet
    console.error(message);
  }
}

export function notifySuccess(message: string) {
  if (successNotifier) {
    successNotifier(message);
  } else {
    console.log(message);
  }
}


