import { input } from "@inquirer/prompts"
import { MultiProgressBar } from "@deno-library/progress"
import { join, parse } from "@std/path"

// probe total seconds
async function getDurationSeconds(path: string): Promise<number> {
  const p = new Deno.Command("ffprobe", {
    args: [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      path,
    ],
    stdout: "piped",
    stderr: "null",
  })
  const { stdout } = await p.output()
  return parseFloat(new TextDecoder().decode(stdout).trim())
}

const COMPRESSOR_ARGS = {
  slow: [
    "-loglevel",
    "0",
    "-hide_banner",
    "-nostats",
    "-c:v",
    "libx265",
    "-preset",
    "slow",
    "-crf",
    "20",
    "-c:a",
    "copy",
    "-progress",
    "pipe:1", // :contentReference[oaicite:2]{index=2}
  ],
  faster: [
    "-loglevel",
    "0",
    "-hide_banner",
    "-nostats",
    "-c:v",
    "libx265",
    "-preset",
    "veryfast",
    "-crf",
    "0",
    "-c:a",
    "copy",
    "-progress",
    "pipe:1", // :contentReference[oaicite:2]{index=2}
  ],
}

export async function hevcCompressor(faster: boolean) {
  const inPath = await input({ message: "Input video path:" })
  const outPathInput = await input({ message: "Output file path:" })

  const { name, ext } = parse(inPath)
  const outPath = faster
    ? outPathInput
    : join(outPathInput, `${name}__HEVC_xoci${ext}`)

  const duration = await getDurationSeconds(inPath)

  const bars = new MultiProgressBar({
    title: "HEVC Compression",
    complete: "=",
    incomplete: "-",
    display: "[:bar] :text :percent :time :completed/:total",
  })

  const cmd = new Deno.Command("ffmpeg", {
    args: [inPath, ...COMPRESSOR_ARGS[faster ? "faster" : "slow"], outPath],
    stdout: "piped",
    stderr: "inherit",
  })

  const proc = cmd.spawn()
  const reader = proc.stdout.getReader()
  const dec = new TextDecoder()
  let buf = ""
  let lastTime = 0

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 1)
      const [k, v] = line.split("=")
      if (k === "out_time_ms") {
        lastTime = Math.min(
          Math.ceil(Number(v) / 1_000_000),
          Math.ceil(duration),
        )
      }

      if (k === "progress" && v === "continue") {
        await bars.render([
          { completed: lastTime, total: Math.ceil(duration), text: "Time(s)" },
        ])
      }
    }
  }

  const { code } = await proc.status

  await bars.end()

  Deno.exit(code)
}
