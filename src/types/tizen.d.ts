interface TizenTVInputDevice {
  registerKey(key: string): void;
  unregisterKey(key: string): void;
}

interface TizenObject {
  tvinputdevice: TizenTVInputDevice;
}

interface Window {
  tizen?: TizenObject;
}
