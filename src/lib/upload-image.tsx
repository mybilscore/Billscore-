// Corrected upload-image.ts

import cloudinary from "./claudinary";

// Define the type for the successful upload result
export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  // Add other properties you might need from the result
};

export const uploadImage = async (
  file: File,
  folder: string,
): Promise<CloudinaryUploadResult> => {
  const buffer = await file.arrayBuffer();
  const bytes = Buffer.from(buffer);

  // Explicitly define the type for the Promise resolution
  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "auto",
          folder: folder,
          // Use more aggressive transformation to aim for <1MB
          transformation: [
            {
              width: 800, // Reduced max width to 800px
              crop: "limit",
              quality: "auto:eco", // Use 'auto:eco' for higher compression
              fetch_format: "auto", // Automatically use the best format (e.g., WebP)
            },
          ],
        },
        (error, result) => {
          if (error) {
            return reject(error.message);
          }

          // Ensure result is not null before resolving.
          if (!result) {
            return reject("Cloudinary upload failed with no result.");
          }

          // Resolve with the expected object
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        },
      )
      .end(bytes);
  });
};
