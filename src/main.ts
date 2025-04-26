import { select } from "@inquirer/prompts"
import { hevcCompressor } from "./ffmpeg.ts"

const choice = await select({
  message: "Menu",
  choices: [
    { name: "Image Compressor (sharp)", value: "img" },
    { name: "HEVC Video Compressor", value: "hevc" },
  ],
})

if (choice === "hevc") {
  await hevcCompressor()
} else {
  console.log("Image compressor coming soon.")
}
