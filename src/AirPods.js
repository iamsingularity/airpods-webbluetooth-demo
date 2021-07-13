const BLE_PACKAGE_TYPES = {
  0x03: "airprint",
  0x05: "airdrop",
  0x06: "homekit",
  0x07: "airpods",
  0x08: "siri",
  0x09: "airplay",
  0x10: "nearby",
  0x0b: "watch_c",
  0x0c: "handoff",
  0x0d: "wifi_set",
  0x0e: "hotspot",
  0x0f: "wifi_join"
};

export default class AirPodsBatteryScanner {
  constructor() {
    this.listener = new Set();
    this.deviceMap = {
      "8194": "AirPods",
      "8195": "Powerbeats",
      "8197": "BeatsX",
      "8198": "Beats Solo³",
      "8199": "Beats Studio³",
      "8201": "Beats Studio³",
      "8203": "Powerbeats Pro",
      "8204": "Beats Solo Pro",
      "8205": "Powerbeats",
      "8206": "AirPods Pro",
      "8207": "AirPods (2nd gen.)"
    };
  }

  // Musst be called from a user interaction
  async startScanning() {
    let options = {
      keepRepeatedDevices: true,
      acceptAllAdvertisements: true
    };

    // Fix a bug in Chrome and Big Sur LEScan is only possible after requestDevice
    try {
      navigator.bluetooth
        .requestDevice({ acceptAllDevices: true })
        .catch(() => {});
    } catch (e) {}

    const scan = await navigator.bluetooth.requestLEScan(options);
    if (scan.active) {
      navigator.bluetooth.addEventListener("advertisementreceived", (event) => {
        // Filter for APPL AirPod data...
        // chrome has no support for it in the request yet.
        const applData = event.manufacturerData.get(0x004c); // APPL Key;
        if (applData) {
          const data = new Uint8Array(applData.buffer);
          if (data[0] === 0x07 && data[1] === 0x19) {
            const deviceId = "" + ((data[4] << 8) + data[3]);
            const dataSpec = data[5];

            const leftFirst = (dataSpec & 0b00100000) !== 0;
            const hasCaseData = (dataSpec & 0b00010000) !== 0;
            const hasOther = (dataSpec & 0b00000001) !== 0;
            const connected = (dataSpec & 0b00000010) !== 0;
            const lidOpen = (data[8] & 0b00001000) === 0;
            const lidOpenCounter = data[8] & 0b00000111;

            // data[21] && data[22]  where always 0 on decrypted deviced.
            // No idea if this is always true
            const decrypted = data[21] === 0 && data[22] === 0;

            let status = {
              device: {
                id: deviceId,
                name: this._getDeviceName(deviceId),
                decrypted,
                connected
              }
            };

            let firstCharging, firstBattery;
            let secondCharging, secondBattery;
            let batteryCaseCharging, batteryCase;

            // if the AirPods where paird
            if (decrypted) {
              firstCharging = (data[12] & 0b10000000) !== 0;
              firstBattery = data[12] & 0b01111111;

              secondCharging = (data[13] & 0b10000000) !== 0;
              secondBattery = data[13] & 0b01111111;

              batteryCaseCharging = (data[14] & 0b10000000) !== 0;
              batteryCase = data[14] & 0b01111111;
              // Not paird only low resolution data avaiable
            } else {
              firstCharging = (data[7] & 0b00010000) !== 0;
              firstBattery = ((data[6] >> 4) & 0xf) * 10;

              secondCharging = (data[7] & 0b00100000) !== 0;
              secondBattery = (data[6] & 0xf) * 10;

              batteryCaseCharging = (data[7] & 0b01000000) !== 0;
              batteryCase = (data[7] & 0xf) * 10;
            }

            if (leftFirst) {
              status.left = {
                charging: firstCharging,
                battery: firstBattery
              };
              if (hasOther) {
                status.right = {
                  charging: secondCharging,
                  battery: secondBattery
                };
              }
            } else {
              status.right = {
                charging: firstCharging,
                battery: firstBattery
              };
              if (hasOther) {
                status.left = {
                  charging: secondCharging,
                  battery: secondBattery
                };
              }
            }
            if (hasCaseData) {
              status.case = {
                charging: batteryCaseCharging,
                battery: batteryCase,
                lidOpen,
                lidOpenCounter
              };
            } else {
              status.case = {
                lidOpen: true
              };
            }

            this._fireStatusEvent(status);
          }
        }
      });
    }
  }

  onBatteryChange(callback) {
    this.listener.add(callback);
  }

  removeBatteryChange(callback) {
    this.listener.delete(callback);
  }

  _fireStatusEvent(event) {
    for (let callback of this.listener) {
      callback(event);
    }
  }
  _getDeviceName(deviceId) {
    return this.deviceMap[deviceId] || `Unkown (${deviceId})`;
  }
}

const toHex = (valueDataView) => {
  return [...new Uint8Array(valueDataView.buffer)]
    .map((b) => {
      return b.toString(16).padStart(2, "0");
    })
    .join(" ");
};

const toBin = (valueDataView) => {
  return [...new Uint8Array(valueDataView.buffer)]
    .map((b) => {
      return b.toString(2).padStart(8, "0");
    })
    .join(" ");
};
