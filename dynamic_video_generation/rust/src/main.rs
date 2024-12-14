use image::{ImageBuffer, Rgb};
use serde::Deserialize;
use std::fs::File;
use std::io::BufReader;
use std::f64::consts::PI;

// TODO: Note this isn't any good!

#[derive(Deserialize)]
struct Config {
    width: u32,
    height: u32,
    center_color: String,
    edge_color: String,
    background_color: String,
}

// Convert a hex string like "#RRGGBB" to an RGB array [u8;3]
fn hex_to_rgb(hex: &str) -> [u8; 3] {
    let hex = hex.trim_start_matches('#');
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap();
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap();
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap();
    [r, g, b]
}

// A wave that starts at the center and expands outward
struct Wave {
    start_t: f64,
    lifespan: f64,
    start_ratio: f64,
    end_ratio: f64,
    start_color: [u8; 3],
    end_color: [u8; 3],
}

impl Wave {
    // Given a time t, returns None if the wave is not active,
    // or Some((ratio, blend_color)) for the wave at that time.
    fn state_at(&self, t: f64) -> Option<(f64, [u8; 3])> {
        let phase = (t - self.start_t) / self.lifespan;
        if phase < 0.0 || phase > 1.0 {
            return None; // Not active yet or already expired
        }
        // Current radius ratio
        let current_ratio = self.start_ratio + (self.end_ratio - self.start_ratio) * phase;

        // Interpolate color
        let r = self.start_color[0] as f64
            + (self.end_color[0] as f64 - self.start_color[0] as f64) * phase;
        let g = self.start_color[1] as f64
            + (self.end_color[1] as f64 - self.start_color[1] as f64) * phase;
        let b = self.start_color[2] as f64
            + (self.end_color[2] as f64 - self.start_color[2] as f64) * phase;

        let color = [r as u8, g as u8, b as u8];
        Some((current_ratio, color))
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load configuration
    let file = File::open("config.json")?;
    let reader = BufReader::new(file);
    let config: Config = serde_json::from_reader(reader)?;

    let width = config.width;
    let height = config.height;
    let center_color = hex_to_rgb(&config.center_color);
    let edge_color = hex_to_rgb(&config.edge_color);
    let background = hex_to_rgb(&config.background_color);

    let cx = width as f64 / 2.0;
    let cy = height as f64 / 2.0;
    let max_radius = (width.min(height) as f64) / 2.0;

    // Animation parameters
    let total_frames = 300;  // number of frames
    let fps = 30.0;          // frames per second
    let duration = total_frames as f64 / fps; // total duration in seconds

    // Main circle base ratio and pulsing amplitude
    let base_ratio = 0.4;
    let pulse_amplitude = 0.05;
    let pulse_speed = 1.0; // how fast the pulse oscillates in radians/sec

    // Waves configuration
    let wave_interval = 2.0; // seconds between waves
    let wave_lifespan = 3.0;
    let mut last_wave_spawn_t = -wave_interval; // so that a wave spawns at t=0
    let mut waves: Vec<Wave> = Vec::new();

    for frame in 0..total_frames {
        let t = frame as f64 / fps;

        // Possibly spawn a new wave
        if t - last_wave_spawn_t >= wave_interval {
            // Spawn a new wave from the center
            waves.push(Wave {
                start_t: t,
                lifespan: wave_lifespan,
                start_ratio: 0.01,
                end_ratio: 1.0,
                start_color: center_color,
                end_color: edge_color,
            });
            last_wave_spawn_t = t;
        }

        // Compute the pulsing circle ratio
        let pulsing_ratio = base_ratio + pulse_amplitude * (t * pulse_speed * 2.0 * PI).sin();

        // Create a new image for this frame
        let mut img = ImageBuffer::from_fn(width, height, |_, _| Rgb(background));

        for y in 0..height {
            for x in 0..width {
                let dx = x as f64 - cx;
                let dy = y as f64 - cy;
                let dist = (dx * dx + dy * dy).sqrt();
                let dist_ratio = dist / max_radius;

                // Start with background as base color
                let mut pixel = background;

                // Main pulsing circle:
                // If inside radius 1.0, we blend from center to edge based on dist_ratio/pulsing_ratio
                // If dist_ratio > 1.0, pixel remains background
                if dist_ratio <= 1.0 {
                    // For the main circle, if dist_ratio <= pulsing_ratio then t=0,
                    // else we linearly interpolate
                    let t_main = if dist_ratio <= pulsing_ratio {
                        0.0
                    } else {
                        (dist_ratio - pulsing_ratio) / (1.0 - pulsing_ratio)
                    };
                    let r = center_color[0] as f64 + (edge_color[0] as f64 - center_color[0] as f64) * t_main;
                    let g = center_color[1] as f64 + (edge_color[1] as f64 - center_color[1] as f64) * t_main;
                    let b = center_color[2] as f64 + (edge_color[2] as f64 - center_color[2] as f64) * t_main;
                    pixel = [r as u8, g as u8, b as u8];
                }

                // Waves:
                // For each active wave, if this pixel is inside the wave's radius at time t,
                // blend its color over the current pixel.
                // We'll just do a simple alpha blend or additive blend.
                // Let's do a simple average blend for demonstration:
                for w in &waves {
                    if let Some((wave_ratio, wave_color)) = w.state_at(t) {
                        if dist_ratio <= wave_ratio {
                            // Blend wave_color with pixel (let's do a 50/50 blend)
                            // More sophisticated blending can be done if desired.
                            let wr = wave_color[0] as f64;
                            let wg = wave_color[1] as f64;
                            let wb = wave_color[2] as f64;

                            let pr = pixel[0] as f64;
                            let pg = pixel[1] as f64;
                            let pb = pixel[2] as f64;

                            // Simple blend: average the colors
                            let blended = [
                                ((pr + wr) / 2.0) as u8,
                                ((pg + wg) / 2.0) as u8,
                                ((pb + wb) / 2.0) as u8,
                            ];

                            pixel = blended;
                        }
                    }
                }

                img.put_pixel(x, y, Rgb(pixel));
            }
        }

        let filename = format!("frame_{:04}.png", frame);
        img.save(&filename)?;
        println!("Saved {}", filename);
    }

    println!("All frames saved. You can use `ffmpeg` to turn them into a video, for example:");
    println!("ffmpeg -framerate {} -i frame_%04d.png -pix_fmt yuv420p output.mp4", fps);

    Ok(())
}
