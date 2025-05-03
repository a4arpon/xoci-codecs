import { select } from "@inquirer/prompts"
import { hevcCompressor } from "./ffmpeg.ts"

const choice = await select({
  message: "Menu",
  choices: [
    { name: "Image Compressor (sharp)", value: "img" },
    { name: "HEVC Video Compressor (Slow)", value: "hevc-slow" },
    { name: "HEVC Video Compressor (Faster)", value: "hevc-faster" },
  ],
})

if (choice === "hevc-slow") {
  await hevcCompressor(false)
} else if (choice === "hevc-faster") {
  await hevcCompressor(true)
} else {
  console.log("Image compressor coming soon.")
}
