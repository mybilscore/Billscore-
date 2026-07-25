// ~/lib/delete-image.ts
// import { v2 as cloudinary } from "cloudinary";

import cloudinary from "./claudinary";

export const deleteImage = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(
      `Image with publicId ${publicId} deleted successfully:`,
      result,
    );
    return result;
  } catch (error) {
    console.error(`Failed to delete image with publicId ${publicId}:`, error);
    throw error;
  }
};
