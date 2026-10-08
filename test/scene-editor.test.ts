import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ha/components/ha-list-item", () => ({}));
vi.mock("@polymer/paper-item/paper-icon-item", () => ({}));
vi.mock("@polymer/paper-item/paper-item", () => ({}));
vi.mock("@polymer/paper-item/paper-item-body", () => ({}));
vi.mock("@ha/common/util/render-status", () => ({ afterNextRender: vi.fn() }));
vi.mock("@ha/common/util/compute_rtl", () => ({ computeRTL: () => false }));
vi.mock("@ha/common/entity/compute_device_name", () => ({
  computeDeviceName: (device: { name: string }) => device.name,
}));
vi.mock("@ha/layouts/hass-subpage", () => ({}));
vi.mock("@ha/components/ha-card", () => ({}));
vi.mock("@ha/components/ha-fab", () => ({}));
vi.mock("@ha/components/ha-icon-button", () => ({}));
vi.mock("@ha/components/ha-icon-picker", () => ({}));
vi.mock("@ha/components/ha-svg-icon", () => ({}));
vi.mock("@ha/components/ha-textfield", () => ({}));
vi.mock("@ha/components/ha-checkbox", () => ({}));
vi.mock("@ha/components/ha-switch", () => ({}));
vi.mock("@ha/components/ha-alert", () => ({}));
vi.mock("@ha/components/ha-button", () => ({}));
vi.mock("@ha/components/ha-selector/ha-selector-select", () => ({}));
vi.mock("@ha/components/ha-form/ha-form", () => ({}));
vi.mock("@ha/panels/config/ha-config-section", () => ({}));
vi.mock("@ha/resources/styles", () => ({ haStyle: [] }));
vi.mock("@ha/mixins/keyboard-shortcut-mixin", () => ({
  KeyboardShortcutMixin: (base: unknown) => base,
}));
vi.mock("@ha/common/navigate", () => ({ navigate: vi.fn() }));
vi.mock("@ha/data/device_registry", () => ({ fetchDeviceRegistry: vi.fn() }));
vi.mock("@ha/data/entity_registry", () => ({ fetchEntityRegistry: vi.fn(async () => []) }));
vi.mock("@ha/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(async () => true),
}));
vi.mock("../src/device/insteon-device-picker", () => ({}));

import { fetchDeviceRegistry } from "@ha/data/device_registry";
import type { DeviceRegistryEntry } from "@ha/data/device_registry";
import { navigate } from "@ha/common/navigate";
import { localize } from "../src/localize/localize";
import { InsteonSceneEditor } from "../src/scene/insteon-scene-editor";
import type { InsteonScene, SceneSaveResult } from "../src/data/scene";
import { saveInsteonScene } from "../src/data/scene";

const scene: InsteonScene = {
  name: "Evening",
  group: 20,
  devices: {},
  controllers: [{ address: "22.22.22", group: 3 }],
};

const registry: DeviceRegistryEntry[] = [
  {
    id: "remote",
    name: "Remote",
    config_entries: ["entry"],
    identifiers: [["insteon", "33.33.33"]],
  },
  {
    id: "keypad",
    name: "Keypad",
    config_entries: ["entry"],
    identifiers: [["insteon", "22.22.22"]],
  },
].map((entry) => ({
  ...entry,
  identifiers: entry.identifiers.map(([domain, address]): [string, string] => [domain, address]),
  created_at: 0,
  modified_at: 0,
  config_entries_subentries: {},
  connections: [],
  manufacturer: null,
  model: null,
  model_id: null,
  labels: [],
  sw_version: null,
  hw_version: null,
  serial_number: null,
  via_device_id: null,
  area_id: null,
  name_by_user: null,
  entry_type: null,
  disabled_by: null,
  configuration_url: null,
  primary_config_entry: null,
}));

const remote = {
  name: "Remote",
  address: "33.33.33",
  cat: 0,
  subcat: 0x1b,
  is_battery: true,
  controller_groups: [1, 2],
  buttons: { 1: "on_off_switch_a", 2: "on_off_switch_b" },
};
const keypad = {
  name: "Keypad",
  address: "22.22.22",
  cat: 1,
  subcat: 9,
  is_battery: false,
  controller_groups: [1, 3, 4, 5, 6],
  buttons: { 3: "on_off_switch_a" },
};

const settle = async (element: InsteonSceneEditor): Promise<void> => {
  for (let i = 0; i < 5; i += 1) {
    await element.updateComplete;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

const mount = async (
  existing?: InsteonScene,
  save: (message: Record<string, unknown>) => Promise<SceneSaveResult> = vi.fn(async () => ({
    scene_id: 20,
    result: true,
  })),
) => {
  vi.mocked(fetchDeviceRegistry).mockResolvedValue(registry);
  const callWS = vi.fn(async (message: Record<string, unknown>) => {
    if (message.type === "insteon/device/get") {
      return message.device_id === "remote" ? remote : keypad;
    }
    if (message.type === "insteon/scene/get") {
      return structuredClone(existing);
    }
    if (message.type === "insteon/scene/save") {
      return save(message);
    }
    if (message.type === "insteon/scene/delete") {
      return { scene_id: 20, result: false };
    }
    throw new Error("Unexpected WebSocket request");
  });
  const element = new InsteonSceneEditor();
  Object.assign(element, {
    hass: { callWS, connection: {}, states: {}, localize: (key: string) => key },
    insteon: {
      config_entry: { entry_id: "entry" },
      localize: (key: string, replace?: Record<string, unknown>) => localize("en", key, replace),
    },
    sceneId: existing ? "20" : null,
  });
  document.body.appendChild(element);
  await settle(element);
  return { element, callWS, save };
};

const select = async (element: InsteonSceneEditor, index: number, value: string): Promise<void> => {
  element
    .shadowRoot!.querySelectorAll("ha-selector-select")
    [index].dispatchEvent(new CustomEvent("value-changed", { detail: { value } }));
  await settle(element);
};

const add = async (element: InsteonSceneEditor): Promise<void> => {
  element.shadowRoot!.querySelector("ha-button")!.dispatchEvent(new Event("click"));
  await settle(element);
};

const saveScene = async (element: InsteonSceneEditor): Promise<void> => {
  element.shadowRoot!.querySelector("ha-fab")!.dispatchEvent(new Event("click"));
  await settle(element);
};

describe("scene controllers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("defaults to app-only and sends an explicit empty controller list", async () => {
    const { element, callWS } = await mount();
    expect(element.shadowRoot!.textContent).toContain("Home Assistant can always control");
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({ type: "insteon/scene/save", controllers: [] }),
    );
  });

  it("lists controller-only remotes without responder-domain entities", async () => {
    const { element, callWS } = await mount();
    await select(element, 0, "device");
    await select(element, 1, remote.address);
    await select(element, 2, "2");
    await add(element);
    expect(element.shadowRoot!.textContent).toContain("Remote");
    expect(element.shadowRoot!.textContent).toContain("Wake battery-operated controllers");
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({ controllers: [{ address: remote.address, group: 2 }] }),
    );
  });

  it("loads keypad groups independently from the modem scene number", async () => {
    const { element, callWS } = await mount(scene);
    expect(element.shadowRoot!.textContent).toContain("Button A");
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(
      expect.objectContaining({ scene_id: 20, controllers: scene.controllers }),
    );
  });

  it("rejects duplicate buttons and device-controlled scenes with no controller", async () => {
    const { element, callWS } = await mount(scene);
    await select(element, 1, keypad.address);
    await select(element, 2, "3");
    await add(element);
    expect(element.shadowRoot!.textContent).toContain("already in the scene");
    element
      .shadowRoot!.querySelector(".controller-row ha-icon-button")!
      .dispatchEvent(new Event("click"));
    await settle(element);
    await saveScene(element);
    expect(element.shadowRoot!.textContent).toContain("Add at least one controller");
    expect(callWS.mock.calls.filter(([msg]) => msg.type === "insteon/scene/save")).toEqual([]);
  });

  it("converts an existing scene to app-only", async () => {
    const { element, callWS } = await mount(scene);
    await select(element, 0, "app");
    await saveScene(element);
    expect(callWS).toHaveBeenCalledWith(expect.objectContaining({ scene_id: 20, controllers: [] }));
    expect(element._scene!.controllers).toEqual([]);
  });

  it("keeps failed new-scene saves dirty and retries the reserved group", async () => {
    const write = vi.fn(async () => ({ scene_id: 23, result: false }));
    const { element, callWS } = await mount(undefined, write);
    await select(element, 0, "device");
    await select(element, 1, keypad.address);
    await select(element, 2, "3");
    await add(element);
    await saveScene(element);
    expect(element.shadowRoot!.textContent).toContain("not fully written");
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("dirty")).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/insteon/scene/23", { replace: true });
    await saveScene(element);
    expect(callWS).toHaveBeenLastCalledWith(expect.objectContaining({ scene_id: 23 }));
  });

  it("shows backend errors and permits retry without losing selections", async () => {
    const write = vi.fn(async () => {
      throw { code: "scene_error", message: "Controller group belongs to scene 21" };
    });
    const { element } = await mount(scene, write);
    await saveScene(element);
    expect(element.shadowRoot!.textContent).toContain("belongs to scene 21");
    expect(element._scene!.controllers).toEqual(scene.controllers);
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("saving")).toBe(false);
    await saveScene(element);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("offers interrupted scenes for retry after loading", async () => {
    const { element } = await mount({ ...scene, pending: true });
    expect(element.shadowRoot!.textContent).toContain("not fully written");
    expect(element.shadowRoot!.querySelector("ha-fab")!.classList.contains("dirty")).toBe(true);
  });

  it("preserves the legacy save shape when controllers are omitted", async () => {
    const { element, callWS } = await mount(scene);
    await saveInsteonScene(element.hass, 20, [], "Evening");
    expect(callWS).toHaveBeenCalledWith({
      type: "insteon/scene/save",
      scene_id: 20,
      links: [],
      name: "Evening",
    });
  });
});
