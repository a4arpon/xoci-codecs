import { input } from "@inquirer/prompts";
import { MultiProgressBar } from "@deno-library/progress";
import { join, parse } from "@std/path";

/**
 * Retrieves the duration of a video file in seconds using ffprobe.
 *
 * @param path - The file path of the video to analyze
 * @returns A promise resolving to the duration of the video in seconds
 */

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
      "-hide_banner", // suppress banner :contentReference[oaicite:1]{index=1}
      path,
    ],
    stdout: "piped",
    stderr: "null",
  });
  const { stdout } = await p.output();
  return parseFloat(new TextDecoder().decode(stdout).trim());
}

export async function hevcCompressor() {
  const inPath = await input({ message: "Input video path:" });
  const outDir = await input({ message: "Output directory:" });

  // derive output filename
  const { name, ext } = parse(inPath);
  const outPath = join(outDir, `${name}__HEVC_xoci${ext}`);

  const duration = await getDurationSeconds(inPath);

  // single progress bar for elapsed time
  const bars = new MultiProgressBar({
    complete: "=",
    incomplete: "-",
    display: "[:bar] :eta",
    // clear on finish
    clear: true,
  });

  // initial render
  await bars.render([{ completed: 0, total: Math.ceil(duration), text: "" }]);

  const cmd = new Deno.Command("ffmpeg", {
    args: [
      "-hide_banner", // suppress header :contentReference[oaicite:2]{index=2}
      "-loglevel",
      "error", // only errors
      "-i",
      inPath,
      "-c:v",
      "libx265",
      "-preset",
      "slow",
      "-crf",
      "20",
      "-c:a",
      "copy",
      "-progress",
      "pipe:1",
      "-nostats",
      outPath,
    ],
    stdout: "piped",
    stderr: "null", // hide ffmpeg stderr
  });

  const proc = cmd.spawn();
  const reader = proc.stdout.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let lastMs = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      const [k, v] = line.split("=");
      if (k === "out_time_ms") {
        lastMs = Number(v);
      }
      if (k === "progress" && v === "continue") {
        const elapsed = Math.min(
          Math.ceil(lastMs / 1_000_000),
          Math.ceil(duration),
        );

        // render using remaining seconds as completed to invert bar
        await bars.render([{
          completed: elapsed, // elapsed seconds
          total: Math.ceil(duration),
        }]);
      }
    }
  }

  const { code } = await proc.status;
  await bars.end();
  Deno.exit(code);
}
