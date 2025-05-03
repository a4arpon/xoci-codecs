import { input } from "@inquirer/prompts";

export async function uploadToFilebin() {
  const filePath = await input({ message: "Enter local file path:" });
  const binId = await input({ message: "Enter Filebin Bin ID:" });

  const file = await Deno.readFile(filePath);
  const filename = filePath.split("/").pop() ?? "upload.bin";

  const url = `https://filebin.net/${binId}/${filename}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "cid": crypto.randomUUID(), // generate a random cid for uniqueness
      "Content-Type": "application/octet-stream",
    },
    body: file,
  });

  if (!res.ok) {
    console.error(`Upload failed with status ${res.status}`);
    Deno.exit(1);
  }

  const json = await res.json();
  console.log("Upload success:");
  console.log(json);
}
