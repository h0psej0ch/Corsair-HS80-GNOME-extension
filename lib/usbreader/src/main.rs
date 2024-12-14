use hidapi::{HidApi};
use dbus::blocking::{Connection};
use dbus::channel::Sender;
use dbus::{Message, Path};
use dbus::strings::{Interface, Member};

const CORSAIR_VID: u16 = 0x1B1C;
const HS80_PID: u16 = 0x0A73;

struct DBusSignalSender {
    connection: Connection,
    path: Path<'static>,
    interface: Interface<'static>
}

impl DBusSignalSender {

    fn new(path: &str, interface: &str) -> Self {

        let connection = Connection::new_session().expect("Failed to connect to DBus");

        Self {
            connection,
            path: Path::new(path).expect("Invalid Path"),
            interface: Interface::new(interface).expect("Invalid Interface")
        }
    }

    fn send_update(&self, update: i32) {
        let msg = Message::signal(
            &self.path,
            &self.interface,
            &Member::new("HS80").expect("Invalid Signal name"),
        ).append1(update);

        self.connection.send(msg).expect("Failed to send Signal");
    }

}

fn main()  -> Result<(), Box<dyn std::error::Error>> {

    // Initialize the sender with borrowed string literals
    let sender = DBusSignalSender::new(
        "/com/h0psej0ch/corsair",      // Object path
        "com.h0psej0ch.corsair.Interface", // Interface
    );

    // Initialize the HID interface with the VID and PID of the HS-80 Headset
    let api = HidApi::new()?;
    let device = api.open(CORSAIR_VID, HS80_PID)?;
    let mut buffer = [0u8; 64];

    // Indefinitely loop and read the device
    loop {
        match device.read(&mut buffer) {
            Ok(size) => {

                if size > 2 {
                    match buffer[3] {
                        0x0f => {
                            let percentage = (buffer[5] as u16 | (buffer[6] as u16) << 8) as f64 / 10.0;
                            sender.send_update(percentage as i32);
                        }
                        0x10 => {
                            let charging = buffer[5] == 1;
                            sender.send_update(if charging {-1} else {-2});
                        }
                        _ => {}
                    }
                }
            }
            Err(e) => {
                println!("Error reading from device: {}", e);
                break;
            }
        }
    };

    Ok(())
}