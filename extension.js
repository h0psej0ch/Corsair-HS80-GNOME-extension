import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Cairo from 'gi://cairo';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const CorsairTrayExtension = GObject.registerClass({
    Name: 'CorsairTrayExtension'
}, class CorsairTrayExtension extends PanelMenu.Button {

    _init(path) {

        // Create the superclass
        super._init(0.0, 'Corsair Device Monitor', false);

        // Create a new DrawinArea for the icon
        this._panelHeight = Main.panel.height * 0.7;

        this._iconArea = new St.DrawingArea({
            style_class: 'headset-icon',
            reactive: true,
            width: 2 * this._panelHeight,
            height: this._panelHeight
        });

        this._iconArea.connect('repaint', this._onRepaint.bind(this));

        this.add_child(this._iconArea);

        // Initialize the parameters
        this._percentage = -1;
        this._charging = false;
        // Update the icon to the default state
        this._iconArea.queue_repaint();

        // Start the dbus session
        this._dbusId = null;
        this._startDBus();

        // Start the rust process
        this._subprocess = null;    
        this._startDeviceMonitoring(path);
    }

    _startDBus() {
        // Subscribe to the DBus session to receive signals from the rust process

        let bus = Gio.DBus.session;

        this._dbusId = bus.signal_subscribe (
            null,
            "com.h0psej0ch.corsair.Interface",
            "HS80",
            "/com/h0psej0ch/corsair",
            null,
            Gio.DBusSignalFlags.NONE,
            this._onActiveChanged.bind(this)
        );
    }

    _stopDBus() {
        // Remove the DBus session
        let bus = Gio.DBus.session;
        log(this._dbusId);
        bus.signal_unsubscribe(this.dbusId);
        GLib.MainContext.default().iteration(true);
    }

    _onActiveChanged(connection, sender, path, iface, signal, params) {

        // Change the charging or percentage parameters
        if (params && params.deep_unpack) {
            let unpackedParams = params.deep_unpack();
            if (unpackedParams.length > 0) {
                if (unpackedParams[0] == -1) {
                    this._charging = true;
                } else if (unpackedParams[0] == -2) {
                    this._charging = false;
                } else {
                    this._percentage = unpackedParams[0];
                }
            }
        }

        // Update the icon
        this._iconArea.queue_repaint();
    }

    _onRepaint(area) {
        const cr = area.get_context();
        const width = 2 * this._panelHeight;
        const height = this._panelHeight;

        cr.setOperator(Cairo.Operator.CLEAR);
        cr.paint();
        cr.setOperator(Cairo.Operator.OVER);

        cr.save();
        const yOffset = (height - (height * 0.8)) / 2; // Using 80% of height for SVG
        cr.translate(0, yOffset);
        cr.scale(height/100, height/100);

        // Draw headset paths
        if (this._charging) {
            cr.setSourceRGB(0.65, 0.85, 0.58); // Catpuccin Machiatto Green
        } else {
            cr.setSourceRGB(0.8, 0.8, 0.8); // Default grey
        }
        cr.setLineWidth(1);

        // Left ear cup
        cr.moveTo(22.2, 84.9);
        cr.curveTo(14.1, 84.9, 7.5, 78.3, 7.5, 70.2);
        cr.lineTo(7.5, 60.5);
        cr.curveTo(7.5, 52.4, 14.1, 45.8, 22.2, 45.8);
        cr.lineTo(22.2, 84.9);
        cr.fill();

        // Right ear cup
        cr.moveTo(77.8, 84.9);
        cr.lineTo(77.8, 45.9);
        cr.curveTo(85.9, 45.9, 92.5, 52.5, 92.5, 60.6);
        cr.lineTo(92.5, 70.3);
        cr.curveTo(92.5, 78.4, 85.9, 84.9, 77.8, 84.9);
        cr.fill();

        // Headband
        cr.moveTo(26.6, 80.1);
        cr.lineTo(26.6, 45.9);
        cr.curveTo(26.6, 32.8, 37.3, 21.7, 50.4, 21.9);
        cr.curveTo(63.1, 22.1, 73.4, 32.5, 73.4, 45.3);
        cr.lineTo(73.4, 80.1);
        cr.curveTo(73.4, 82.8, 75.6, 85, 78.3, 85);
        cr.lineTo(78.3, 46);
        cr.curveTo(78.3, 30.6, 66.2, 17.5, 50.8, 17.1);
        cr.curveTo(34.8, 16.6, 21.6, 29.5, 21.6, 45.4);
        cr.lineTo(21.6, 85);
        cr.curveTo(24.4, 84.9, 26.6, 82.7, 26.6, 80.1);
        cr.fill();
        cr.restore();

        // Draw text or X symbol based on if a message has been received since the start
        if (this._percentage === -1) {
            // Draw red X
            cr.setSourceRGB(0.8, 0.2, 0.2); // Red color
            cr.setLineWidth(2);
            
            // Calculate X size and position
            const xSize = height * 0.4;
            const xRight = width - xSize - 5;
            const xVertCenter = height / 2 + xSize / 2;
            
            // Draw X lines
            cr.moveTo(xRight, xVertCenter - xSize/2);
            cr.lineTo(xRight + xSize, xVertCenter + xSize/2);
            cr.stroke();
            
            cr.moveTo(xRight, xVertCenter + xSize/2);
            cr.lineTo(xRight + xSize, xVertCenter - xSize/2);
            cr.stroke();
        } else {
            // Draw percentage text (existing code)
            const percentageText = `${this._percentage}%`;
            cr.setSourceRGB(0.8, 0.8, 0.8);
            cr.setFontSize(height * 0.4);
            const textExtents = cr.textExtents(percentageText);
            const textX = width - textExtents.width;
            const textY = height / 2 + textExtents.height;
            cr.moveTo(textX, textY);
            cr.showText(percentageText);
        }
    }

    _startDeviceMonitoring(path) {
        let binaryPath = path +  "/lib/Corsair";

        log(binaryPath)

        try {
            // Start the Rust binary as a subprocess
            this._subprocess = new Gio.Subprocess({
                argv: [binaryPath],
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            });
    
            this._subprocess.init(null);
    
        } catch (e) {
            log(`Failed to start Rust binary: ${e}`);
        }
    }

    destroy() {
        // Stop the extension by stopping the rust library andz removing the icon
        this._subprocess.force_exit();
        this._stopDBus();
        super.destroy();
    }
});

export default class CorsairExtension extends Extension {
    enable() {
        log("I try...");
        log(this.path);
        this._indicator = new CorsairTrayExtension(this.path);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
