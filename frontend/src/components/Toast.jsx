// Compatibility shim — the v2 ToastProvider lives in `../contexts/ToastContext`.
// This file is kept so any older imports of `components/Toast` keep working.
export { ToastProvider, useToast } from '../contexts/ToastContext';
