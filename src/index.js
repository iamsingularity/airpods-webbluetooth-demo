import AirPods from "./AirPods";

const airPods = new AirPods();

const $scanBtn = document.querySelector("#scan");
const $name = document.querySelector("#name");
const $airpodsStatus = document.querySelector("#🎧");
const $airpodsConected = document.querySelector("#airpods-connected");
const $connecting = document.querySelector("#connecting");
const $error = document.querySelector("#error");
const leftSetter = createValueSetters("left");
const rightSetter = createValueSetters("right");
const caseSetter = createValueSetters("case", name => {
  const $lidOpen = document.querySelector(`#${name}-lidOpen`);
  return value => {
    if (value) {
      $lidOpen.textContent = value.lidOpen ? "🔓" : "🔒";
    }
  };
});

$scanBtn.addEventListener("click", onButtonClick);

async function onButtonClick() {
  airPods.onBatteryChange(status => {
    $airpodsStatus.classList.remove("hidden");
    $connecting.classList.add("hidden");

    $name.textContent = status.device.name;
    $airpodsConected.style.visibility = status.device.connected
      ? "visible"
      : "hidden";

    leftSetter(status.left);
    rightSetter(status.right);
    caseSetter(status.case);
  });
  try {
    $connecting.classList.remove("hidden");
    $error.classList.add("hidden");
    $scanBtn.classList.add("hidden");
    await airPods.startScanning();
  } catch (e) {
    $connecting.classList.add("hidden");
    $scanBtn.classList.remove("hidden");
    $error.classList.remove("hidden");
    let message = e.message;
    if (message.includes("blocked by user")) {
      message +=
        "<br /> You can re-enable request for BLE Scanning by clicking the lock icon next to the URL in the address bar.";
    }
    $error.innerHTML = message;
  }
}

function createValueSetters(name, setup) {
  const $battery = document.querySelector(`#${name}-battery`);
  const $charging = document.querySelector(`#${name}-charging`);
  const addition = setup && setup(name);
  return function(value) {
    if (value) {
      $battery.textContent = value.battery;
      $charging.style.visibility = value.charging ? "visible" : "hidden";
    }
    addition && addition(value);
  };
}
