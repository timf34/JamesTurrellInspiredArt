use image::{ImageBuffer, Rgb};
use serde::Deserialize;
use std::fs::File;
use std::io::BufReader;

#[derive(Deserialize)]
struct Config {
    width: u32,
    height: u32,
    circle_radius_ratio: f64,
    center_color: String,
    edge_color: String,
}

fn hex_to_rgb(hex: &str) -> [u8; 3] {
    let hex = hex.trim_start_matches('#');
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap();
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap();
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap();
    [r, g, b]
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load configuration
    let file = File::open("config.json")?;
    let reader = BufReader::new(file);
    let config: Config = serde_json::from_reader(reader)?;

    let width = config.width;
    let height = config.height;
    let circle_radius_ratio = config.circle_radius_ratio;

    let center_color = hex_to_rgb(&config.center_color);
    let edge_color = hex_to_rgb(&config.edge_color);

    // Background: a neutral gray
    let background = [220u8, 220, 220];

    let mut img = ImageBuffer::from_fn(width, height, |_,_| {
        Rgb(background)
    });

    let cx = width as f64 / 2.0;
    let cy = height as f64 / 2.0;

    let max_radius = (width.min(height) as f64) / 2.0;

    for y in 0..height {
        for x in 0..width {
            let dx = x as f64 - cx;
            let dy = y as f64 - cy;
            let dist = (dx*dx + dy*dy).sqrt();
            let dist_ratio = dist / max_radius;

            let pixel = if dist_ratio > 1.0 {
                // Outside the circle
                background
            } else {
                let t = if dist_ratio <= circle_radius_ratio {
                    0.0
                } else {
                    // Linear interpolation between center and edge
                    (dist_ratio - circle_radius_ratio) / (1.0 - circle_radius_ratio)
                };

                // Interpolate colors
                let r = (center_color[0] as f64
                    + (edge_color[0] as f64 - center_color[0] as f64) * t) as u8;
                let g = (center_color[1] as f64
                    + (edge_color[1] as f64 - center_color[1] as f64) * t) as u8;
                let b = (center_color[2] as f64
                    + (edge_color[2] as f64 - center_color[2] as f64) * t) as u8;

                [r, g, b]
            };

            img.put_pixel(x, y, Rgb(pixel));
        }
    }

    img.save("turrell_circle.png")?;
    println!("Saved as turrell_circle.png");

    Ok(())
}
