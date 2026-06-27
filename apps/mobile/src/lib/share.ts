import { type RefObject } from 'react';
import { type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

/**
 * Capture / save / share a recap card as a PNG. Uses react-native-view-shot,
 * which is a native module NOT present in Expo Go — these work in a dev build or
 * the TestFlight/standalone app, and throw a clear error in Expo Go.
 */
export class ShareError extends Error {
  readonly kind: 'unsupported' | 'denied' | 'failed';
  constructor(kind: 'unsupported' | 'denied' | 'failed', message: string) {
    super(message);
    this.kind = kind;
  }
}

async function capture(ref: RefObject<View | null>): Promise<string> {
  try {
    return await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // view-shot isn't in Expo Go; surface a friendly explanation.
    if (/native|not.*available|undefined is not/i.test(msg)) {
      throw new ShareError('unsupported', 'Image export needs the installed app (it works in TestFlight, not Expo Go).');
    }
    throw new ShareError('failed', 'Couldn’t create the image. Please try again.');
  }
}

export async function saveCardToPhotos(ref: RefObject<View | null>): Promise<void> {
  const uri = await capture(ref);
  const perm = await MediaLibrary.requestPermissionsAsync(true); // write-only
  if (!perm.granted) {
    throw new ShareError('denied', 'Allow photo access to save your recap.');
  }
  await MediaLibrary.saveToLibraryAsync(uri);
}

export async function shareCard(ref: RefObject<View | null>): Promise<void> {
  const uri = await capture(ref);
  if (!(await Sharing.isAvailableAsync())) {
    throw new ShareError('unsupported', 'Sharing isn’t available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your PSN Wrapped' });
}
