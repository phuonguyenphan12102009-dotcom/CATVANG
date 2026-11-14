// utils/imageUpload.js
// Dùng chung cho upload ảnh: multer (giữ file trong RAM) + đẩy lên Cloudinary + kiểm tra "chữ ký" file ảnh thật.

const multer = require("multer");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

function makeUploader(maxBytes) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 20 },
    fileFilter(req, file, cb) {
      const allowed = /jpeg|jpg|png|webp|gif/;
      const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
      const mimeOk = allowed.test(file.mimetype);
      if (extOk && mimeOk) return cb(null, true);
      cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, webp, gif)"));
    },
  });
}

// Header MIME và đuôi file có thể bị giả mạo -> kiểm tra thêm vài byte đầu của file.
function looksLikeImage(buf) {
  if (!buf || buf.length < 12) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isGif = buf.toString("ascii", 0, 4) === "GIF8";
  const isWebp = buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  return isJpeg || isPng || isGif || isWebp;
}

function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

async function destroyImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (e) {
    console.warn("⚠️ Không xoá được ảnh trên Cloudinary:", publicId, e.message);
  }
}

module.exports = { makeUploader, looksLikeImage, uploadBuffer, destroyImage, cloudinaryConfigured };
