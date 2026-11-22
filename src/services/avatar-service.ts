import { getBrowserSupabase } from "@/lib/supabase/client";
import { authService } from "./auth-service";

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface CropArea {
  x: number; // Top-left X in source image pixels
  y: number; // Top-left Y in source image pixels
  size: number; // Square crop size in source image pixels
}

export interface AvatarValidationResult {
  valid: boolean;
  error?: string;
  image?: HTMLImageElement;
  width?: number;
  height?: number;
}

export const avatarService = {
  /**
   * Validates file size, MIME type, and decodability.
   */
  async validateAvatarFile(file: File): Promise<AvatarValidationResult> {
    if (!file) {
      return { valid: false, error: "No file selected." };
    }

    if (file.size === 0) {
      return { valid: false, error: "The selected file is empty (0 bytes)." };
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `Image size (${sizeMb} MB) exceeds the maximum allowed limit of 5 MB.`,
      };
    }

    const mime = file.type.toLowerCase();
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(mime as any)) {
      return {
        valid: false,
        error: "Unsupported file format. Please upload a JPG, PNG, or WebP image.",
      };
    }

    // Verify image decodability and dimensions
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          resolve({ valid: false, error: "Corrupted image file: zero dimensions." });
        } else {
          resolve({
            valid: true,
            image: img,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ valid: false, error: "Failed to decode image. The file may be damaged or invalid." });
      };

      img.src = objectUrl;
    });
  },

  /**
   * Renders the designated crop area to a 512×512 canvas and exports as WebP Blob.
   */
  async cropToWebpBlob(
    image: HTMLImageElement,
    crop: CropArea,
    targetDimension = 512
  ): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = targetDimension;
    canvas.height = targetDimension;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) {
      throw new Error("Unable to create 2D canvas context for image processing.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.size,
      crop.size,
      0,
      0,
      targetDimension,
      targetDimension
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to jpeg if browser fails webp canvas export
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) resolve(jpegBlob);
                else reject(new Error("Failed to generate image blob from canvas."));
              },
              "image/jpeg",
              0.92
            );
          }
        },
        "image/webp",
        0.92
      );
    });
  },

  /**
   * Generates a public URL for a given avatars storage path.
   */
  getPublicAvatarUrl(avatarPath: string): string {
    const supabase = getBrowserSupabase();
    if (!supabase || !avatarPath) return "";
    const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
    return data?.publicUrl || "";
  },

  /**
   * Complete avatar save pipeline:
   * 1. Uploads 512×512 WebP to avatars/{userId}/avatar-{uniqueId}.webp
   * 2. Retrieves public URL
   * 3. Updates public.profiles (avatar_path & avatar_url)
   * 4. Deletes previous avatar storage object upon success
   * 5. Cleans up new storage object if database update fails
   */
  async saveProfileAvatar(
    userId: string,
    imageBlob: Blob,
    previousAvatarPath?: string | null
  ): Promise<{ avatar_path: string; avatar_url: string }> {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    // Generate unique storage path within user's isolated folder
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const storagePath = `${userId}/avatar-${uniqueId}.webp`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, imageBlob, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 2. Retrieve public URL
    const publicUrl = this.getPublicAvatarUrl(storagePath);

    // 3. Update public.profiles record
    try {
      await authService.updateProfile(userId, {
        avatar_path: storagePath,
        avatar_url: publicUrl,
      });
    } catch (profileError: any) {
      // Rollback: delete newly uploaded object to prevent orphaned storage leak
      try {
        await supabase.storage.from("avatars").remove([storagePath]);
      } catch (cleanupErr) {
        console.warn("Failed to cleanup orphaned avatar after database error:", cleanupErr);
      }
      throw new Error(`Failed to update profile record: ${profileError.message || profileError}`);
    }

    // 4. Cleanup old avatar if different
    if (
      previousAvatarPath &&
      previousAvatarPath !== storagePath &&
      previousAvatarPath.startsWith(`${userId}/`)
    ) {
      try {
        await supabase.storage.from("avatars").remove([previousAvatarPath]);
      } catch (cleanupErr) {
        console.warn("Note: previous avatar cleanup failed:", cleanupErr);
      }
    }

    return { avatar_path: storagePath, avatar_url: publicUrl };
  },

  /**
   * Complete avatar removal pipeline:
   * 1. Sets avatar_path and avatar_url to null on public.profiles
   * 2. Deletes previous storage object from avatars bucket
   */
  async removeProfileAvatar(
    userId: string,
    currentAvatarPath?: string | null
  ): Promise<void> {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    // 1. Update database record
    await authService.updateProfile(userId, {
      avatar_path: null,
      avatar_url: null,
    });

    // 2. Delete storage object if path provided
    if (currentAvatarPath && currentAvatarPath.startsWith(`${userId}/`)) {
      try {
        const { error: removeError } = await supabase.storage
          .from("avatars")
          .remove([currentAvatarPath]);
        if (removeError) {
          console.warn("Storage deletion warning:", removeError.message);
        }
      } catch (err) {
        console.warn("Error removing storage object:", err);
      }
    }
  },
};
