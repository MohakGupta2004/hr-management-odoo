import { v2 as cloudinary } from "cloudinary";
import { config } from "../config/config";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

// Streams a file buffer to Cloudinary.
export function uploadToCloudinary(fileBuffer: Buffer, folder: string = "documents"): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Upload result was empty"));
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null); // end of stream
    stream.pipe(uploadStream);
  });
}

// Deletes an asset by public ID.
export function deleteFromCloudinary(publicId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

// Extracts the public ID from a secure URL (.../upload/v123/documents/xyz.pdf -> documents/xyz).
export function getPublicIdFromUrl(url: string): string {
  const parts = url.split("/upload/");
  if (parts.length < 2 || !parts[1]) return "";

  let pathWithExt: string = parts[1];
  // Strip version prefix (v12345678/)
  const firstSlash = pathWithExt.indexOf("/");
  const prefix = pathWithExt.substring(0, firstSlash);
  if (prefix.startsWith("v")) {
    pathWithExt = pathWithExt.substring(firstSlash + 1);
  }

  // Strip extension
  const lastDot = pathWithExt.lastIndexOf(".");
  if (lastDot !== -1) {
    return pathWithExt.substring(0, lastDot);
  }
  return pathWithExt;
}
