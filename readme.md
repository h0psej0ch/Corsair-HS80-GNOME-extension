# Corsair HS80 Battery Percentage GNOME Extension

This extension aims to read the data send from the HS80 USB device and using this show its battery percentage as a tray icon in the GNOME panel for GNOME 47. Next to this, when charging, the icon turns green.

## Setup

Clone the repository in your `~/.local/share/gnome-shell/extensions/` directory. If the rust program fails to start (check using `pgrep -fl Corsair`) you might have to add a specific rule to give acces for reading the specified USB device. This can be done in the following way:

- Create a `.rules` file in `/etc/udev/rules.d/`, for example `sudo touch /etc/udev/rules.d/corsair-hid.rules`
- Add the following content to the created file using your favorite text editor:

```bash
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1b1c", ATTRS{idProduct}=="0a73", MODE="0666"
```

This rules gives all users/groups read and write permissions for the USB HID system with the vendor and product ID off the Corsair HS80 RGB Wireless headset.

- Update the udev rules using:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Implementation

The HS80 headset sends HID signals whenever the following states changes:

- Battery percentage
- Charging state
- Muted/Unmuted
- Volume

Next to this (sometimes) at startup it sends the charging state and the battery percentage. Using these the icon is updated. However when either of these two has not been sent yet, the icon might display the wrong state.

Finally a current issue is the rust subprocess not being ended whenever the shell is forcefully restarted.

## Non GNOME users

The repository also includes a [read-only](lib/usbreader/src/main-read-only.rs) implementation that only reads the USB data and prints the states to standard out. Feel free to, based on this, make your own version that fits with your own environment!

## Issues

If any problems arise, feel free to create an issue for this.

## License

[MIT](LICENSE)
