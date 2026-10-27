import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Converts a standard JavaScript Blob into a base64 string.
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file data.'));
    reader.onload = () => {
      try {
        const dataUrl = reader.result;
        if (typeof dataUrl === 'string') {
          const parts = dataUrl.split(',');
          resolve(parts.length > 1 ? parts[1] : parts[0]);
        } else {
          reject(new Error('File data format is invalid.'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(blob);
  });
};

/**
 * Downloads or opens a PDF document across web browsers and native Android/iOS.
 * - On Web / Desktop browsers: triggers standard browser <a download> click.
 * - On Native Android (Capacitor): writes bytes to device cache and opens Android's system share/open intent.
 * 
 * @param {Blob} blob The PDF binary blob
 * @param {string} filename The requested document filename (e.g. "Seminar_Request_SR-101.pdf")
 * @returns {Promise<{ success: boolean, native: boolean, uri?: string }>}
 */
export const downloadOrOpenPdf = async (blob, filename = 'document.pdf') => {
  if (!blob) {
    throw new Error('No PDF content available to download or open.');
  }

  // 1. Native Mobile (Capacitor on Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      const cleanFilename = (filename || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');

      // Write file into device cache directory (allows opening & sharing via FileProvider)
      const fileResult = await Filesystem.writeFile({
        path: cleanFilename,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Launch native Android chooser (Google Drive PDF Viewer, Adobe Acrobat, Files, etc.)
      await Share.share({
        title: cleanFilename,
        text: `Official College Service Requisition Document: ${cleanFilename}`,
        url: fileResult.uri,
        dialogTitle: `Open or Save PDF — ${cleanFilename}`,
      });

      return { success: true, native: true, uri: fileResult.uri };
    } catch (err) {
      console.error('Error in native PDF export:', err);
      // Fallback: If user dismissed the share sheet or another non-fatal error occurred
      if (err.message && (err.message.includes('canceled') || err.message.includes('dismissed') || err.message.includes('Share canceled'))) {
        return { success: true, native: true, cancelled: true };
      }
      throw new Error(err.message || 'Unable to open document on device. Please ensure a PDF reader is available.');
    }
  }

  // 2. Standard Web Browser (Desktop, Mobile Browser, or PWA)
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);

  return { success: true, native: false };
};
