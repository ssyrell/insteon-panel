# Insteon Panel Frontend

This repository holds the frontend files of Insteon configuration panel in home assistant.

## Device-controlled scenes

In the scene editor, choose **App-only** for the existing modem-controlled behavior,
or **Device-controlled** to add one or more hardware devices and their buttons.
Home Assistant remains a controller in both cases. Adding responders or changing
their levels and ramp rates updates every associated hardware group.

Controller buttons already used by another managed scene or unmanaged device links
cannot be reused. Read complete All-Link Databases before saving, and wake battery
remotes before saving or deleting. If a write fails, some devices may already have
changed: keep the scene open and retry. Interrupted scenes remain available after
restart with their reserved scene number.

A controller can also respond to Home Assistant or another controller. Pressing its
own button controls its local load using the device's local settings; the scene
editor does not create self-links or change those settings.

This feature requires the matching Insteon WebSocket API changes in Home Assistant
and the device-controlled scene implementation in `pyinsteon`. For local development,
mount the `pyinsteon` feature worktree in the core devcontainer and install it with
`uv pip install -e /workspaces/pyinsteon`. Use the panel development path described
below. Release both libraries before updating the core integration's dependency pins.

## Development Setup

1. Install vscode, git, and docker desktop
2. Install dev container extension in vscode
3. Fork/clone Insteon-panel
4. Open Insteon-panel repo in VS Code
   1. You should see a prompt asking you if you want to re-open the workspace in the container, say yes
   2. Once opened in the dev container, the bootstrap process should automatically run - this will take a few minutes to complete.
   3. Once bootstrapped, run `script/develop` to build the code. This will also watch for changes.
      1. Built code is output to the `insteon_frontend` folder in the repo
5. Follow [these instructions](https://developers.home-assistant.io/docs/development_environment) to get a dev container of Home Assistant Core up and running
6. Now you will need to configure the Home Assistant Core container so that your locally-built `insteon-panel` code is available as a mounted directory:
   1. Open .devcontainer/devcontainer.json
   2. Add a new “mounts” property to the root of the JSON object similar to this example:

   ```json
   "mounts": [
     "source=/path/to/insteon-panel,target=/workspaces/insteon-panel,type=bind"
   ],
   ```

   2. Rebuild the dev container by pressing Shift+Command+P (Mac) / Ctrl+Shift+P (Windows/Linux) to open the Command Palette, then selecting the **Dev Containers: Rebuild Container** command.
   3. After the container is rebuilt and successfully re-opened, open the Command Pallate, choose **Run Task**, then **Run Home Assistant Core**
   4. Once home assistant core is running, navigate to http://localhost:8123 and setup your test home environment
   5. Install the Insteon integration (production version) and follow the normal setup steps
   6. Switch the Insteon integration to dev mode - in the `home-assistant/core` container, open the config/.storage/core.config_entries (in VS Code), find the Insteon the entry (can be found by text searching for “insteon”) and change the “options” object to this: `"options":{"dev_path":"/workspaces/insteon-panel/insteon_frontend"}`
   7. Restart home assistant and go to the Insteon setup section (Settings -> Insteon). You’re now loading your locally built Insteon panel!
