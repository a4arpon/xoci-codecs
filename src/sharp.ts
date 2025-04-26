import sharp from "sharp";

export class SharpUtils {
  public async compressImage() {
    const metadata = await sharp("sammy.png").metadata();
    console.log(metadata);
  }
}

