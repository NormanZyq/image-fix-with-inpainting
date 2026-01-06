import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

const DEFAULT_MODELS = (process.env.GEMINI_MODELS || "").split(",").map((m) => m.trim()).filter(Boolean);
const DEFAULT_ENDPOINT = process.env.GEMINI_API_ENDPOINT || "https://generativelanguage.googleapis.com/v1beta/models";
const DEBUG_DIR = path.join(__dirname, "../debug");
const PROMPTS_FILE = process.env.PROMPTS_FILE || path.join(__dirname, "../prompts.json");

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/config", (_req, res) => {
  res.json({
    defaultEndpoint: DEFAULT_ENDPOINT,
    defaultModels: DEFAULT_MODELS.length
      ? DEFAULT_MODELS
      : [
          "gemini-3.0-pro-image-preview-001",
          "gemini-3.0-flash",
          "gemini-1.5-pro",
          "gemini-1.5-flash",
        ],
  });
});

app.get("/api/prompts", (_req, res) => {
  try {
    if (fs.existsSync(PROMPTS_FILE)) {
      const data = fs.readFileSync(PROMPTS_FILE, "utf8");
      const parsed = JSON.parse(data);
      res.json(parsed);
    } else {
      res.json({ presets: [] });
    }
  } catch (err) {
    console.error("Failed to load prompts file:", err.message);
    res.json({ presets: [] });
  }
});

app.post("/api/inpaint", async (req, res) => {
  try {
    const {
      prompt,
      imageData,
      maskData,
      colorData,
      model,
      endpoint,
      apiKey,
      generationConfig,
      userConfig,
      feather,
      selectionBounds,
    } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    if (!imageData || !maskData) {
      return res.status(400).json({ error: "Image data and mask data are required." });
    }

    const resolvedEndpoint = (endpoint && endpoint.trim()) || DEFAULT_ENDPOINT;
    const resolvedModel = model?.trim() || "gemini-3.0-pro-image-preview-001";
    const resolvedApiKey = apiKey?.trim() || process.env.GEMINI_API_KEY;

    if (!resolvedApiKey) {
      return res.status(400).json({ error: "API key is required." });
    }

    const cleanImage = stripBase64Prefix(imageData);
    const cleanMask = stripBase64Prefix(maskData);
    const cleanColor = colorData ? stripBase64Prefix(colorData) : null;

    const requestUrl = buildEndpointUrl(resolvedEndpoint, resolvedModel);
    const payload = buildGeminiPayload({
      prompt,
      image: cleanImage,
      mask: cleanMask,
      color: cleanColor,
      feather,
      model: resolvedModel,
      generationConfig,
      userConfig,
      selectionBounds,
    });

    const response = await axios.post(requestUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        ...(resolvedApiKey ? { "x-goog-api-key": resolvedApiKey } : {}),
      },
      timeout: 240000,
    });

    const imagePart = await extractImagePart(response.data);
    if (!imagePart) {
      const debugPath = persistDebugResponse(response.data, "no-image");
      return res.status(502).json({
        error: "Gemini response did not include an image part.",
        rawResponse: response.data,
        debugFile: debugPath,
      });
    }

    res.json({
      imageBase64: imagePart.data,
      mimeType: imagePart.mimeType || "image/png",
      rawResponse: response.data,
    });
  } catch (error) {
    console.error("Inpaint error", error?.response?.data || error.message);
    const debugPath = persistDebugResponse(error?.response?.data || error.message, "error");
    res.status(error?.response?.status || 500).json({
      error: error?.response?.data?.error?.message || error.message || "Unknown error",
      details: error?.response?.data || null,
      debugFile: debugPath,
    });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.method !== "GET") {
    return next();
  }
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

function stripBase64Prefix(dataUrl) {
  if (!dataUrl) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

function buildEndpointUrl(base, model) {
  if (!base) {
    throw new Error("API endpoint is required.");
  }
  const trimmed = base.trim();
  const [pathOnly, queryString] = trimmed.split("?");
  const withoutTrailingSlash = pathOnly.replace(/\/+$/, "");

  if (withoutTrailingSlash.includes(":generateContent")) {
    return trimmed;
  }

  const alreadyHasModel = withoutTrailingSlash.includes(`/models/${model}`) || withoutTrailingSlash.endsWith(`/${model}`);
  let urlPath = withoutTrailingSlash;

  if (!alreadyHasModel) {
    if (withoutTrailingSlash.endsWith("/models")) {
      urlPath = `${withoutTrailingSlash}/${model}`;
    } else if (withoutTrailingSlash.includes("/models/")) {
      urlPath = `${withoutTrailingSlash}/${model}`;
    } else {
      urlPath = `${withoutTrailingSlash}/models/${model}`;
    }
  }

  if (!urlPath.endsWith(":generateContent")) {
    urlPath = `${urlPath}:generateContent`;
  }

  return queryString ? `${urlPath}?${queryString}` : urlPath;
}

function buildGeminiPayload({ prompt, image, mask, color, feather, generationConfig, userConfig, selectionBounds }) {
  const parts = [
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/png",
        data: image,
      },
    },
  ];

  if (color) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: color,
      },
    });
  }

  const inpaintingConfig = {
    maskMode: "MASK_MODE_IMAGE",
    featherAmount: typeof feather === "number" ? feather : 0,
  };

  if (mask) {
    inpaintingConfig.mask = {
      inlineData: {
        mimeType: "image/png",
        data: mask,
      },
    };
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    tools: [
      {
        imageEdit: {
          inpainting: inpaintingConfig,
        },
      },
    ],
    generationConfig: generationConfig || {
      temperature: 0.8,
    },
  };

  if (selectionBounds) {
    payload.clientMetadata = {
      selection: selectionBounds,
    };
  }

  if (userConfig) {
    payload.systemInstruction = {
      role: "system",
      parts: [{ text: userConfig }],
    };
  }

  return payload;
}

function persistDebugResponse(data, label = "response") {
  try {
    if (!fs.existsSync(DEBUG_DIR)) {
      fs.mkdirSync(DEBUG_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `gemini-${label}-${timestamp}.json`;
    const filepath = path.join(DEBUG_DIR, filename);
    const serialized = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, serialized, "utf8");
    return filepath;
  } catch (err) {
    console.error("Failed to persist debug response", err?.message || err);
    return null;
  }
}

async function extractImagePart(responseData) {
  if (!responseData) return null;
  const candidates = responseData.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      const inline = part.inlineData || part.inline_data;
      if (inline?.mimeType?.startsWith("image/") || inline?.mime_type?.startsWith("image/")) {
        return {
          mimeType: inline.mimeType || inline.mime_type || "image/png",
          data: inline.data,
        };
      }
      const media = part.media || part.mediaData || part.media_data;
      if (media?.mediaType?.startsWith("image/") || media?.mimeType?.startsWith("image/")) {
        return {
          mimeType: media.mediaType || media.mimeType || "image/png",
          data: media.data,
        };
      }
      if (typeof part.text === "string") {
        const fallback = await downloadImageFromText(part.text);
        if (fallback) return fallback;
      }
    }
  }
  if (responseData.image) return responseData.image;
  return null;
}

async function downloadImageFromText(text) {
  // 先尝试提取 data URI (base64 格式)
  const dataUri = extractDataUri(text);
  if (dataUri) {
    return dataUri;
  }
  // 再尝试提取 URL 并下载
  const url = extractImageUrl(text);
  if (!url) return null;
  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 120000 });
    const mimeType = response.headers["content-type"] || guessMimeFromUrl(url) || "image/png";
    const data = Buffer.from(response.data).toString("base64");
    return { mimeType, data };
  } catch (error) {
    console.error("Failed to download fallback image", error.message || error);
    return null;
  }
}

function extractDataUri(text) {
  if (!text) return null;
  // 匹配 markdown 格式中的 data URI: ![...](data:image/...;base64,...)
  const markdownDataMatch = text.match(/!\[[^\]]*]\((data:image\/([^;]+);base64,([^)]+))\)/i);
  if (markdownDataMatch) {
    const mimeType = `image/${markdownDataMatch[2]}`;
    const data = markdownDataMatch[3];
    return { mimeType, data };
  }
  // 匹配纯 data URI 格式
  const plainDataMatch = text.match(/data:image\/([^;]+);base64,([^\s)]+)/i);
  if (plainDataMatch) {
    const mimeType = `image/${plainDataMatch[1]}`;
    const data = plainDataMatch[2];
    return { mimeType, data };
  }
  return null;
}

function extractImageUrl(text) {
  if (!text) return null;
  const markdownMatch = text.match(/!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/i);
  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }
  const plainMatch = text.match(/https?:\/\/[^\s)]+/i);
  if (plainMatch?.[0]) {
    return plainMatch[0].replace(/[),.]+$/, "");
  }
  return null;
}

function guessMimeFromUrl(url) {
  const lowered = url.toLowerCase();
  if (lowered.endsWith(".jpg") || lowered.endsWith(".jpeg")) return "image/jpeg";
  if (lowered.endsWith(".webp")) return "image/webp";
  if (lowered.endsWith(".gif")) return "image/gif";
  if (lowered.endsWith(".bmp")) return "image/bmp";
  if (lowered.endsWith(".png")) return "image/png";
  return null;
}
