import { v2 as cloudinary } from "cloudinary";
import { CloudAlert } from "lucide-react";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLAUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLAUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

export default cloudinary;
