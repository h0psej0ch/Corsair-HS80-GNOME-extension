use hidapi::{HidApi};

const CORSAIR_VID: u16 = 0x1B1C;
const HS80_PID: u16 = 0x0A73;

fn main() -> Result<(), Box<dyn std::error::Error>> {

    let api = HidApi::new()?;

    let device = api.open(CORSAIR_VID, HS80_PID)?;
    let mut buffer = [0u8; 64];

    println!("Reading from device");

    loop {
        match device.read(&mut buffer) {
            Ok(size) => {
                for i in 0..size {
                    print!("{:02X} ", buffer[i]);
                }
                println!();

                if size > 2 {
                    match buffer[3] {
                        0x0f => {
                            println!("Received battery change event");
                            let percentage = (buffer[5] as u16 | (buffer[6] as u16) << 8) as f64 / 10.0;
                            println!("Battery Percentage: {:.1}%", percentage);
                        }
                        0x10 => {
                            println!("Received charging state change event");
                            let charging = buffer[5] == 1;
                            println!("Charging: {}", charging);
                        }
                        _ => {
                            println!("Unsupported event");
                        }
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