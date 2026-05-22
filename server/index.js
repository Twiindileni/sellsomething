require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;
const BUCKET = "product-images";
const MAX_IMAGES = 4;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(),
});

function imagesFromRow(product) {
  if (!product) return product;
  let list = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    list = product.images.filter(Boolean);
  } else if (product.image) {
    list = [product.image];
  }
  list = list.slice(0, MAX_IMAGES);
  return { ...product, images: list, image: list[0] || null };
}

function parseImageUrls(body) {
  let list = [];
  if (Array.isArray(body.images)) {
    list = body.images.filter((u) => typeof u === "string" && u.trim());
  } else if (body.image) {
    list = [body.image];
  }
  return list.slice(0, MAX_IMAGES);
}

async function uploadOneFile(userClient, userId, file) {
  const ext = file.originalname?.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadError } = await userClient.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (uploadError) throw uploadError;
  const { data: urlData } = userClient.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

// ─── Supabase client ─────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function supabaseForUser(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

app.use(cors());
app.use(express.json());

// ─── POST upload product image ───────────────────────────────────────────────
app.post("/api/upload/image", upload.single("image"), async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Log in to upload images." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided." });
  }

  if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({ error: "Use JPEG, PNG, WebP, or GIF." });
  }

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const url = await uploadOneFile(userClient, user.id, req.file);
    res.json({ url, urls: [url] });
  } catch (err) {
    const msg = err.message || "Upload failed";
    if (/bucket/i.test(msg)) {
      return res.status(500).json({
        error: "Storage bucket missing. Run supabase/storage.sql in Supabase SQL Editor.",
      });
    }
    res.status(500).json({ error: msg });
  }
});

// ─── POST upload up to 4 product images ────────────────────────────────────────
app.post("/api/upload/images", upload.array("images", MAX_IMAGES), async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Log in to upload images." });
  }
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ error: "No image files provided." });
  }
  if (files.length > MAX_IMAGES) {
    return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images allowed.` });
  }

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ error: "Use JPEG, PNG, WebP, or GIF." });
      }
    }

    const urls = [];
    for (const file of files) {
      urls.push(await uploadOneFile(userClient, user.id, file));
    }
    res.json({ urls, url: urls[0] });
  } catch (err) {
    const msg = err.message || "Upload failed";
    if (/bucket/i.test(msg)) {
      return res.status(500).json({
        error: "Storage bucket missing. Run supabase/storage.sql in Supabase SQL Editor.",
      });
    }
    res.status(500).json({ error: msg });
  }
});

// ─── GET current user's products (dashboard) ─────────────────────────────────
app.get("/api/products/mine", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("seller_email", email)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data.map(imagesFromRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET all products (search + category filter) ──────────────────────────────
app.get("/api/products", async (req, res) => {
  const { search, category } = req.query;

  try {
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(imagesFromRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET single product ───────────────────────────────────────────────────────
app.get("/api/products/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) return res.status(404).json({ error: "Product not found" });
    res.json(imagesFromRow(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST create product ──────────────────────────────────────────────────────
app.post("/api/products", async (req, res) => {
  const { title, description, price, category, location, seller, seller_email, seller_id } = req.body;
  const imageList = parseImageUrls(req.body);

  if (!title || !price || !category || !seller || !seller_email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const row = {
      id: uuidv4(),
      title,
      description: description || "",
      price: parseFloat(price),
      category,
      location: location || "",
      seller,
      seller_email,
      image: imageList[0] || null,
      images: imageList,
    };

    if (seller_id) row.seller_id = seller_id;

    let { data, error } = await supabase.from("products").insert([row]).select().single();

    if (error && seller_id && /seller_id/i.test(error.message)) {
      delete row.seller_id;
      ({ data, error } = await supabase.from("products").insert([row]).select().single());
    }
    if (error && /images/i.test(error.message)) {
      delete row.images;
      ({ data, error } = await supabase.from("products").insert([row]).select().single());
    }

    if (error) throw error;
    res.status(201).json(imagesFromRow(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT update product ───────────────────────────────────────────────────────
app.put("/api/products/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ error: "Product not found" });
    res.json(imagesFromRow(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE product ───────────────────────────────────────────────────────────
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET categories ───────────────────────────────────────────────────────────
app.get("/api/categories", (req, res) => {
  res.json([
    "Electronics",
    "Vehicles",
    "Furniture",
    "Clothing",
    "Property",
    "Agriculture",
    "Services",
    "Other",
  ]);
});

// ─── EMPLOYEES & REVIEWS ────────────────────────────────────────────────────────
app.get("/api/employees", async (req, res) => {
  const { category, search } = req.query;
  try {
    let query = supabase.from("employees").select("*").order("rating", { ascending: false });
    if (category && category !== "All") query = query.eq("profession", category);
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data.map(imagesFromRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employees/mine", async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: "Missing user_id parameter" });

  try {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data.map(imagesFromRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employees/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("employees").select("*").eq("id", req.params.id).single();
    if (error) return res.status(404).json({ error: "Employee not found" });
    res.json(imagesFromRow(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employees", async (req, res) => {
  const { name, profession, description, references_text, contact_email, location, user_id } = req.body;
  const imageList = parseImageUrls(req.body);
  if (!name || !profession || !description || !contact_email) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const row = {
      user_id: user_id || null,
      name,
      profession,
      description,
      references_text: references_text || "",
      contact_email,
      location: location || "",
      image: imageList[0] || null,
      images: imageList,
    };
    const { data, error } = await supabase.from("employees").insert([row]).select().single();
    if (error) throw error;
    res.status(201).json(imagesFromRow(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employees/:id/reviews", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("employee_id", req.params.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employees/:id/reviews", async (req, res) => {
  const { reviewer_name, rating, comment, reviewer_id } = req.body;
  if (!reviewer_name || !rating || !comment) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const row = {
      employee_id: req.params.id,
      reviewer_id: reviewer_id || null,
      reviewer_name,
      rating: parseInt(rating, 10),
      comment
    };
    const { data, error } = await supabase.from("reviews").insert([row]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Sell Something API running on http://localhost:${PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL}`);
});
