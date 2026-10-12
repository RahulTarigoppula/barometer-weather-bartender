import { Capacitor } from '@capacitor/core';

/** The one place that asks "are we inside the Android shell?". */
export const isNative = (): boolean => Capacitor.isNativePlatform();
