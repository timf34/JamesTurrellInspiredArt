package main

import (
    "encoding/json"
    "fmt"
    "image"
    "image/color"
    "image/png"
    "math"
    "os"
    "strings"
    "time"
)

type Config struct {
    Width            int     `json:"width"`
    Height           int     `json:"height"`
    CircleRadiusRatio float64 `json:"circle_radius_ratio"`
    CenterColor      string  `json:"center_color"`
    EdgeColor        string  `json:"edge_color"`
}

func hexToRGB(hex string) color.RGBA {
    hex = strings.TrimPrefix(hex, "#")
    var r, g, b uint8
    fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
    return color.RGBA{r, g, b, 255}
}

func main() {
    totalStart := time.Now()

    // Load config
    configStart := time.Now()
    f, err := os.Open("config.json")
    if err != nil {
        fmt.Println("Error opening config.json:", err)
        return
    }
    defer f.Close()

    var config Config
    if err := json.NewDecoder(f).Decode(&config); err != nil {
        fmt.Println("Error decoding JSON:", err)
        return
    }
    configTime := time.Since(configStart)

    // Initialize variables
    initStart := time.Now()
    width := config.Width
    height := config.Height
    circleRatio := config.CircleRadiusRatio

    centerColor := hexToRGB(config.CenterColor)
    edgeColor := hexToRGB(config.EdgeColor)

    background := color.RGBA{220, 220, 220, 255}

    // Create a new RGBA image
    img := image.NewRGBA(image.Rect(0, 0, width, height))

    cx := float64(width) / 2.0
    cy := float64(height) / 2.0
    maxRadius := float64(min(width, height)) / 2.0
    initTime := time.Since(initStart)

    // Pixel processing
    pixelStart := time.Now()
    for y := 0; y < height; y++ {
        for x := 0; x < width; x++ {
            dx := float64(x) - cx
            dy := float64(y) - cy
            dist := math.Sqrt(dx*dx + dy*dy)
            distRatio := dist / maxRadius

            var c color.RGBA
            if distRatio > 1.0 {
                // outside the circle
                c = background
            } else {
                var t float64
                if distRatio <= circleRatio {
                    t = 0.0
                } else {
                    t = (distRatio - circleRatio) / (1.0 - circleRatio)
                }

                // interpolate between centerColor and edgeColor
                r := uint8(float64(centerColor.R) + (float64(edgeColor.R)-float64(centerColor.R))*t)
                g := uint8(float64(centerColor.G) + (float64(edgeColor.G)-float64(centerColor.G))*t)
                b := uint8(float64(centerColor.B) + (float64(edgeColor.B)-float64(centerColor.B))*t)
                c = color.RGBA{r, g, b, 255}
            }

            img.Set(x, y, c)
        }
    }
    pixelTime := time.Since(pixelStart)

    // Save to file
    saveStart := time.Now()
    out, err := os.Create("turrell_circle.png")
    if err != nil {
        fmt.Println("Error creating file:", err)
        return
    }
    defer out.Close()

    if err := png.Encode(out, img); err != nil {
        fmt.Println("Error encoding PNG:", err)
        return
    }
    saveTime := time.Since(saveStart)

    totalTime := time.Since(totalStart)

    // Print timing results
    fmt.Printf("\nPerformance Breakdown (%s):\n", time.Now().Format("2006-01-02 15:04:05"))
    fmt.Println(strings.Repeat("=", 50))
    fmt.Printf("Configuration loading: %v\n", configTime)
    fmt.Printf("Initialization: %v\n", initTime)
    fmt.Printf("Pixel processing: %v\n", pixelTime)
    fmt.Printf("Image saving: %v\n", saveTime)
    fmt.Println(strings.Repeat("=", 50))
    fmt.Printf("Total execution time: %v\n", totalTime)
    fmt.Printf("\nSaved as turrell_circle.png\n")
}

func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}