const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });
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
const BOOST_FEES = { 7: 50, 14: 90, 30: 150 };
const BOOST_DURATIONS = Object.keys(BOOST_FEES).map(Number);

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

function isBoostActive(row) {
  return !!(row?.is_boosted && row?.boost_ends_at && new Date(row.boost_ends_at) > new Date());
}

function sortProductsBoostedFirst(rows, secondarySort) {
  return [...rows].sort((a, b) => {
    const diff = (isBoostActive(b) ? 1 : 0) - (isBoostActive(a) ? 1 : 0);
    if (diff !== 0) return diff;
    if (secondarySort) return secondarySort(a, b);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

function sortEmployeesBoostedFirst(rows) {
  return [...rows].sort((a, b) => {
    const diff = (isBoostActive(b) ? 1 : 0) - (isBoostActive(a) ? 1 : 0);
    if (diff !== 0) return diff;
    return Number(b.rating || 0) - Number(a.rating || 0);
  });
}

async function expireStaleBoosts() {
  // Needs service role to bypass boosts RLS; without it, expiry happens when
  // an admin opens the Boosts tab (admin RLS policy allows the updates).
  const db = supabaseAdmin || supabase;
  const now = new Date().toISOString();
  try {
    const { data: expiredBoosts } = await db
      .from("boosts")
      .select("id, target_type, product_id, employee_id")
      .eq("status", "active")
      .lt("ends_at", now);

    for (const boost of expiredBoosts || []) {
      await db.from("boosts").update({ status: "expired" }).eq("id", boost.id);
      if (boost.target_type === "product" && boost.product_id) {
        await db
          .from("products")
          .update({ is_boosted: false, boost_ends_at: null })
          .eq("id", boost.product_id);
      }
      if (boost.target_type === "employee" && boost.employee_id) {
        await db
          .from("employees")
          .update({ is_boosted: false, boost_ends_at: null })
          .eq("id", boost.employee_id);
      }
    }
  } catch (err) {
    console.warn("expireStaleBoosts:", err.message);
  }
}

async function enrichEmployee(row) {
  if (!row) return row;
  const enriched = imagesFromRow(row);
  if (!enriched.user_id && enriched.contact_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", enriched.contact_email)
      .maybeSingle();
    if (profile?.id) enriched.user_id = profile.id;
  }
  return enriched;
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

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

function supabaseForUser(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function requireAdmin(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Login required." });
    return null;
  }

  const userClient = supabaseForUser(token);
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    res.status(401).json({ error: "Session expired." });
    return null;
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    res.status(403).json({ error: "Admin access required." });
    return null;
  }

  return { userClient, db: supabaseAdmin || userClient, hasServiceRole: !!supabaseAdmin };
}

async function fetchAllOrdersForAdmin(auth) {
  if (auth.hasServiceRole) {
    const { data, error } = await auth.db
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  const { data, error } = await auth.userClient.rpc("get_all_orders_for_admin");
  if (error) {
    const hint =
      " Run supabase/admin_orders.sql in Supabase SQL Editor, or set SUPABASE_SERVICE_ROLE_KEY on the server.";
    error.message = (error.message || "Failed to load orders.") + hint;
    throw error;
  }
  return data || [];
}

async function adminUpdateOrder(auth, orderId, status) {
  if (auth.hasServiceRole) {
    const updateData = { status, updated_at: new Date() };
    if (status === "payment_received") updateData.payment_received_at = new Date();
    if (status === "refunded") updateData.refunded_at = new Date();
    if (status === "completed") updateData.seller_paid_at = new Date();

    const { data, error } = await auth.db
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await auth.userClient.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_status: status,
  });
  if (error) {
    const hint =
      " Run supabase/admin_orders.sql in Supabase SQL Editor, or set SUPABASE_SERVICE_ROLE_KEY on the server.";
    error.message = (error.message || "Failed to update order.") + hint;
    throw error;
  }
  return data;
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

// ─── GET all products (search + category + advanced filters + sorting) ────────
app.get("/api/products", async (req, res) => {
  const { search, category, minPrice, maxPrice, location, sort } = req.query;

  try {
    let query = supabase.from("products").select("*");

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    if (location && location !== "") {
      query = query.eq("location", location);
    }

    if (minPrice) {
      query = query.gte("price", parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte("price", parseFloat(maxPrice));
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`
      );
    }

    // Apply sorting
    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else if (sort === "likes_desc") {
      query = query.order("likes", { ascending: false });
    } else {
      // Default to newest first
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    await expireStaleBoosts();
    let secondarySort;
    if (sort === "price_asc") secondarySort = (a, b) => Number(a.price) - Number(b.price);
    else if (sort === "price_desc") secondarySort = (a, b) => Number(b.price) - Number(a.price);
    else if (sort === "likes_desc") secondarySort = (a, b) => Number(b.likes || 0) - Number(a.likes || 0);
    const sorted = sortProductsBoostedFirst(data || [], secondarySort);
    res.json(sorted.map(imagesFromRow));
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
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Log in to post an ad." });
  }

  const { title, description, price, category, location, seller } = req.body;
  const imageList = parseImageUrls(req.body);

  if (!title || !price || !category || !seller) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const row = {
      id: uuidv4(),
      title,
      description: description || "",
      price: parseFloat(price),
      category,
      location: location || "",
      seller,
      seller_email: user.email,
      seller_id: user.id,
      image: imageList[0] || null,
      images: imageList,
    };

    let { data, error } = await supabase.from("products").insert([row]).select().single();

    if (error && row.seller_id && /seller_id/i.test(error.message)) {
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
    await expireStaleBoosts();
    const enriched = await Promise.all(sortEmployeesBoostedFirst(data || []).map(enrichEmployee));
    res.json(enriched);
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
    const enriched = await Promise.all((data || []).map(enrichEmployee));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employees/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("employees").select("*").eq("id", req.params.id).single();
    if (error) return res.status(404).json({ error: "Employee not found" });
    res.json(await enrichEmployee(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employees", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Log in to offer a service." });
  }

  const name = String(req.body.name || req.body.title || "").trim();
  const profession = String(req.body.profession || "").trim();
  const description = String(req.body.description || "").trim();
  const references_text = String(req.body.references_text || "").trim();
  const location = String(req.body.location || "").trim();
  const imageList = parseImageUrls(req.body);

  const missing = [];
  if (!name) missing.push("name");
  if (!profession) missing.push("profession");
  if (!description) missing.push("description");
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(", ")}`,
    });
  }

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const row = {
      user_id: user.id,
      name,
      profession,
      description,
      references_text,
      contact_email: user.email || req.body.contact_email || "",
      location,
      image: imageList[0] || null,
      images: imageList,
    };
    if (!row.contact_email) {
      return res.status(400).json({ error: "Your account has no email — required to publish a service." });
    }

    const { data, error } = await userClient.from("employees").insert([row]).select().single();
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
  const { reviewer_name, rating, comment, reviewer_id, relationship } = req.body;
  if (!reviewer_name || !rating || !comment) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const row = {
      employee_id: req.params.id,
      reviewer_id: reviewer_id || null,
      reviewer_name,
      rating: parseInt(rating, 10),
      comment,
      relationship: relationship || null
    };
    const { data, error } = await supabase.from("reviews").insert([row]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT update profile ──────────────────────────────────────────────────────
app.put("/api/profiles", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Log in to update profile." });
  }
  const { full_name, avatar_url } = req.body;
  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const updates = {
      full_name,
      avatar_url,
      updated_at: new Date().toISOString(),
    };

    // Must use userClient so RLS sees auth.uid(); anon client updates 0 rows → .single() error
    let { data, error } = await userClient
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .maybeSingle();

    if (!data && !error) {
      const insertRow = {
        id: user.id,
        email: user.email || "",
        full_name: full_name || user.user_metadata?.full_name || "",
        avatar_url: avatar_url || null,
      };
      ({ data, error } = await userClient
        .from("profiles")
        .insert([insertRow])
        .select()
        .maybeSingle());
    }

    if (error) throw error;
    if (!data) {
      return res.status(500).json({ error: "Could not update profile." });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST send message ───────────────────────────────────────────────────────
app.post("/api/messages", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Log in to send messages." });
  }
  const { receiver_id, product_id, employee_id, content } = req.body;
  const hasProduct = Boolean(product_id);
  const hasEmployee = Boolean(employee_id);
  if (!receiver_id || !content?.trim() || (!hasProduct && !hasEmployee) || (hasProduct && hasEmployee)) {
    return res.status(400).json({ error: "Missing required message fields" });
  }
  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    if (receiver_id === user.id) {
      return res.status(400).json({ error: "You cannot message yourself." });
    }

    if (hasEmployee) {
      const { data: empRow, error: empErr } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employee_id)
        .single();
      if (empErr || !empRow) {
        return res.status(404).json({ error: "Service profile not found." });
      }
      const emp = await enrichEmployee(empRow);
      if (emp.user_id) {
        if (emp.user_id !== receiver_id) {
          return res.status(400).json({ error: "Invalid service provider." });
        }
      } else {
        return res.status(400).json({ error: "This service profile cannot receive messages yet." });
      }
    }

    const row = {
      sender_id: user.id,
      receiver_id,
      product_id: hasProduct ? product_id : null,
      employee_id: hasEmployee ? employee_id : null,
      content: content.trim(),
    };

    const { data, error } = await userClient.from("messages").insert([row]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET messages/conversations list ──────────────────────────────────────────
app.get("/api/messages", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Log in to view messages." });
  }
  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    // Must use userClient so RLS sees auth.uid() (anon client returns no rows)
    const { data: messages, error } = await userClient
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!messages || messages.length === 0) {
      return res.json([]);
    }

    // Resolve profile details and product details manually
    const userIds = Array.from(new Set(messages.flatMap(m => [m.sender_id, m.receiver_id])));
    const productIds = Array.from(new Set(messages.map(m => m.product_id).filter(Boolean)));
    const employeeIds = Array.from(new Set(messages.map(m => m.employee_id).filter(Boolean)));

    const [profilesRes, productsRes, employeesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds),
      productIds.length
        ? supabase.from("products").select("id, title, price, image").in("id", productIds)
        : Promise.resolve({ data: [] }),
      employeeIds.length
        ? supabase.from("employees").select("id, name, profession, image").in("id", employeeIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profilesMap = (profilesRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    const productsMap = (productsRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    const employeesMap = (employeesRes.data || []).reduce((acc, e) => ({ ...acc, [e.id]: e }), {});

    const enrichedMessages = messages.map(m => ({
      ...m,
      sender: profilesMap[m.sender_id] || { id: m.sender_id, full_name: "Deleted User" },
      receiver: profilesMap[m.receiver_id] || { id: m.receiver_id, full_name: "Deleted User" },
      product: m.product_id
        ? (productsMap[m.product_id] || { id: m.product_id, title: "Deleted Listing" })
        : null,
      employee: m.employee_id
        ? (employeesMap[m.employee_id] || { id: m.employee_id, name: "Deleted Service", profession: "" })
        : null,
    }));

    res.json(enrichedMessages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET thread between users for specific product ────────────────────────────
app.get("/api/messages/thread", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Log in to view conversation threads." });
  }
  const { product_id, employee_id, other_user_id } = req.query;
  const hasProduct = Boolean(product_id);
  const hasEmployee = Boolean(employee_id);
  if (!other_user_id || (!hasProduct && !hasEmployee) || (hasProduct && hasEmployee)) {
    return res.status(400).json({ error: "Missing thread context (product_id or employee_id) and other_user_id." });
  }

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    let query = userClient
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: true });

    query = hasProduct ? query.eq("product_id", product_id) : query.eq("employee_id", employee_id);

    const { data: messages, error } = await query;

    if (error) throw error;

    const filtered = (messages || []).filter(
      m => (m.sender_id === user.id && m.receiver_id === other_user_id) ||
           (m.sender_id === other_user_id && m.receiver_id === user.id)
    );

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ORDERS (ESCROW) ──────────────────────────────────────────────────────────

// POST create order
app.post("/api/orders", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Login required to place an order." });

  const { product_id, seller_id, seller_email, product_title, amount, payment_method, payment_reference } = req.body;
  if (!product_id || !amount) {
    return res.status(400).json({ error: "Missing required order fields." });
  }

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return res.status(401).json({ error: "Session expired." });

    // Get buyer email from profile
    const { data: buyerProfile } = await supabase
      .from("profiles").select("email").eq("id", user.id).maybeSingle();

    // Resolve seller information
    let resolvedSellerId = seller_id || null;
    let resolvedSellerEmail = null;
    if (resolvedSellerId) {
      const { data: sellerProfile } = await supabase
        .from("profiles").select("email").eq("id", resolvedSellerId).maybeSingle();
      resolvedSellerEmail = sellerProfile?.email || null;
    }
    if (!resolvedSellerId && seller_email) {
      const { data: sellerProfile } = await supabase
        .from("profiles").select("id, email").eq("email", seller_email).maybeSingle();
      resolvedSellerId = sellerProfile?.id || null;
      resolvedSellerEmail = sellerProfile?.email || seller_email;
    }
    if (!resolvedSellerEmail && seller_email) {
      resolvedSellerEmail = seller_email;
    }

    const { data, error } = await userClient.from("orders").insert([{
      product_id,
      buyer_id: user.id,
      seller_id: resolvedSellerId,
      buyer_email: buyerProfile?.email || user.email,
      seller_email: resolvedSellerEmail,
      product_title: product_title || "Unknown Product",
      amount: parseFloat(amount),
      ad_fee: 25,
      status: "pending_payment",
      payment_method: payment_method || "easywallet",
      payment_reference: payment_reference || null,
    }]).select().single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET my orders (buyer or seller)
app.get("/api/orders/mine", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Login required." });

  const { role } = req.query; // "buyer" or "seller"

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return res.status(401).json({ error: "Session expired." });

    let query = userClient.from("orders").select("*").order("created_at", { ascending: false });

    if (role === "seller") {
      // Query where seller_id = user.id
      const { data: byId, error: err1 } = await query.eq("seller_id", user.id);
      
      // Query where seller_email = user.email
      let byEmail = [];
      if (user.email) {
        const { data: emailData, error: err2 } = await userClient
          .from("orders")
          .select("*")
          .eq("seller_email", user.email)
          .order("created_at", { ascending: false });
        if (!err2) byEmail = emailData || [];
      }
      
      // Merge and deduplicate by ID
      const allOrders = [...(byId || []), ...byEmail];
      const seenIds = new Set();
      const data = allOrders.filter(o => {
        if (seenIds.has(o.id)) return false;
        seenIds.add(o.id);
        return true;
      });
      
      if (err1 && user.email && byEmail.length === 0) {
        return res.status(500).json({ error: err1.message });
      }
      return res.json(data);
    } else {
      const { data, error } = await query.eq("buyer_id", user.id);
      if (error) throw error;
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseFutureEta(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (date <= new Date()) return null;
  return date.toISOString();
}

function isDeliveryEtaMissed(order) {
  if (!order.delivery_eta) return false;
  if (["delivered", "confirmed", "completed", "refunded", "disputed"].includes(order.status)) {
    return false;
  }
  if (!["payment_received", "in_delivery"].includes(order.status)) return false;
  return new Date() > new Date(order.delivery_eta);
}

// PUT update order status (buyer/seller escrow actions)
app.put("/api/orders/:id/status", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Login required." });

  const {
    status,
    action,
    dispute_reason,
    delivery_eta,
    delivery_eta_note,
    buyer_satisfaction_note,
    buyer_rating,
    buyer_review,
  } = req.body;

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return res.status(401).json({ error: "Session expired." });

    const { data: order, error: orderErr } = await userClient
      .from("orders").select("*").eq("id", req.params.id).single();
    if (orderErr || !order) return res.status(404).json({ error: "Order not found." });

    const isBuyer = order.buyer_id === user.id;
    const isSeller =
      order.seller_id === user.id ||
      (user.email && order.seller_email && order.seller_email === user.email);

    const sellerNote = req.body.seller_status_note?.trim();

    // Seller posts a progress update (buyer sees on live tracker)
    if (action === "seller_progress_update") {
      if (!isSeller) {
        return res.status(403).json({ error: "Only the seller can post delivery updates." });
      }
      if (!["payment_received", "in_delivery", "delivered"].includes(order.status)) {
        return res.status(400).json({ error: "Cannot post updates for this order state." });
      }
      if (!sellerNote) {
        return res.status(400).json({ error: "Please enter an update message for the buyer." });
      }
      const { data, error } = await userClient
        .from("orders")
        .update({
          seller_latest_update: sellerNote,
          seller_latest_update_at: new Date(),
          updated_at: new Date(),
        })
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    // Seller updates delivery ETA without changing status
    if (action === "update_delivery_eta") {
      if (!isSeller) {
        return res.status(403).json({ error: "Only the seller can update the delivery ETA." });
      }
      if (!["payment_received", "in_delivery"].includes(order.status)) {
        return res.status(400).json({ error: "Delivery ETA can only be updated while order is in progress." });
      }
      const eta = parseFutureEta(delivery_eta);
      if (!eta) {
        return res.status(400).json({ error: "Delivery ETA must be a future date and time." });
      }
      const etaNote = delivery_eta_note?.trim() || order.delivery_eta_note || null;
      const { data, error } = await userClient
        .from("orders")
        .update({
          delivery_eta: eta,
          delivery_eta_note: etaNote,
          seller_latest_update: sellerNote || `Delivery date updated to ${new Date(eta).toLocaleString("en-NA")}`,
          seller_latest_update_at: new Date(),
          updated_at: new Date(),
        })
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    const allowedBuyerStatuses = ["confirmed", "disputed"];
    const allowedSellerStatuses = ["in_delivery", "delivered"];

    if (![...allowedBuyerStatuses, ...allowedSellerStatuses].includes(status)) {
      return res.status(400).json({ error: "Invalid status transition." });
    }

    if (allowedBuyerStatuses.includes(status) && !isBuyer) {
      return res.status(403).json({ error: "Only the buyer can perform this action." });
    }
    if (allowedSellerStatuses.includes(status) && !isSeller) {
      return res.status(403).json({ error: "Only the seller can perform this action." });
    }

    const updateData = { status, updated_at: new Date() };

    if (status === "in_delivery") {
      if (order.status !== "payment_received") {
        return res.status(400).json({ error: "Order must have confirmed payment before delivery starts." });
      }
      const eta = parseFutureEta(delivery_eta);
      if (!eta) {
        return res.status(400).json({
          error: "You must set a delivery ETA (date & time) before starting delivery.",
        });
      }
      updateData.delivery_eta = eta;
      updateData.in_delivery_at = new Date();
      if (delivery_eta_note?.trim()) {
        updateData.delivery_eta_note = delivery_eta_note.trim();
      }
      updateData.seller_latest_update =
        sellerNote ||
        delivery_eta_note?.trim() ||
        `Delivery started — expected by ${new Date(eta).toLocaleString("en-NA")}`;
      updateData.seller_latest_update_at = new Date();
    }

    if (status === "delivered") {
      if (order.status !== "in_delivery") {
        return res.status(400).json({ error: "Order must be in delivery before marking as handed over." });
      }
      updateData.delivered_at = new Date();
      updateData.seller_latest_update =
        sellerNote || "Item handed over / sent — waiting for buyer to confirm receipt";
      updateData.seller_latest_update_at = new Date();
    }

    if (status === "confirmed") {
      if (order.status !== "delivered") {
        return res.status(400).json({
          error: "You can only confirm after the seller marks the order as delivered.",
        });
      }
      const rating = Number(buyer_rating);
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Please rate the product (1–5 stars) before confirming." });
      }
      updateData.buyer_confirmed_at = new Date();
      updateData.rated_at = new Date();
      updateData.buyer_rating = rating;
      updateData.buyer_review = buyer_review?.trim() || buyer_satisfaction_note?.trim() || null;
      if (buyer_satisfaction_note?.trim()) {
        updateData.buyer_satisfaction_note = buyer_satisfaction_note.trim();
      }
    }

    if (status === "disputed") {
      const etaMissed = isDeliveryEtaMissed(order);
      const canDispute =
        etaMissed ||
        ["payment_received", "in_delivery", "delivered"].includes(order.status);
      if (!canDispute) {
        return res.status(400).json({ error: "This order cannot be disputed in its current state." });
      }
      if (!dispute_reason?.trim()) {
        return res.status(400).json({ error: "Please describe why you are requesting a refund." });
      }
      const prefix = etaMissed
        ? `[Delivery deadline missed — ETA was ${new Date(order.delivery_eta).toLocaleString("en-NA")}] `
        : "";
      updateData.dispute_reason = prefix + dispute_reason.trim();
    }

    const { data, error } = await userClient
      .from("orders")
      .update(updateData)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all orders (admin only)
app.get("/api/orders/admin", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const data = await fetchAllOrdersForAdmin(auth);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT admin update order status (payment + payouts + disputes only)
app.put("/api/orders/:id/admin-status", async (req, res) => {
  const { status } = req.body;
  const validStatuses = [
    "payment_received", "delivered", "refunded", "completed",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid admin status transition." });
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const { data: order, error: orderErr } = await auth.userClient
      .from("orders")
      .select("status")
      .eq("id", req.params.id)
      .single();
    if (orderErr || !order) return res.status(404).json({ error: "Order not found." });

    if (status === "payment_received" && order.status !== "pending_payment") {
      return res.status(400).json({ error: "Can only confirm payment on pending orders." });
    }
    if (status === "completed" && order.status !== "confirmed") {
      return res.status(400).json({
        error: "Can only release payout after the buyer has confirmed receipt.",
      });
    }
    if (status === "delivered" && order.status !== "disputed") {
      return res.status(403).json({
        error: "Only the seller marks delivery progress. Buyer confirms receipt themselves.",
      });
    }
    if (status === "refunded" && order.status !== "disputed") {
      return res.status(400).json({ error: "Refunds are processed from disputed orders." });
    }

    const data = await adminUpdateOrder(auth, req.params.id, status);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: USERS ─────────────────────────────────────────────────────────────

// GET all users with activity counts (admin only)
app.get("/api/admin/users", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const db = auth.db;

    const [profilesRes, productsRes, messagesRes] = await Promise.all([
      db.from("profiles").select("id, full_name, email, avatar_url, is_admin, created_at"),
      db.from("products").select("id, seller_id, seller_email"),
      db.from("messages").select("sender_id, receiver_id"),
    ]);
    if (profilesRes.error) throw profilesRes.error;

    let orders = [];
    try {
      orders = await fetchAllOrdersForAdmin(auth);
    } catch (e) {
      orders = [];
    }

    const products = productsRes.data || [];
    const messages = messagesRes.data || [];

    const users = (profilesRes.data || []).map((p) => {
      const emailLc = (p.email || "").toLowerCase();
      const listings = products.filter(
        (x) => x.seller_id === p.id || (x.seller_email || "").toLowerCase() === emailLc
      ).length;
      const purchases = orders.filter(
        (o) => o.buyer_id === p.id || (o.buyer_email || "").toLowerCase() === emailLc
      ).length;
      const sales = orders.filter(
        (o) => o.seller_id === p.id || (o.seller_email || "").toLowerCase() === emailLc
      ).length;
      const messageCount = messages.filter(
        (m) => m.sender_id === p.id || m.receiver_id === p.id
      ).length;
      return { ...p, counts: { listings, purchases, sales, messages: messageCount } };
    });

    users.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one user's full activity: profile, listings, orders, conversations (admin only)
app.get("/api/admin/users/:id", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const db = auth.db;
    const userId = req.params.id;

    const { data: profile, error: profileErr } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) return res.status(404).json({ error: "User not found." });

    const emailLc = (profile.email || "").toLowerCase();

    const [productsRes, messagesRes] = await Promise.all([
      db.from("products").select("*").order("created_at", { ascending: false }),
      db
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: true }),
    ]);

    let orders = [];
    try {
      orders = await fetchAllOrdersForAdmin(auth);
    } catch (e) {
      orders = [];
    }

    const listings = (productsRes.data || []).filter(
      (x) => x.seller_id === userId || (x.seller_email || "").toLowerCase() === emailLc
    );
    const purchases = orders.filter(
      (o) => o.buyer_id === userId || (o.buyer_email || "").toLowerCase() === emailLc
    );
    const sales = orders.filter(
      (o) => o.seller_id === userId || (o.seller_email || "").toLowerCase() === emailLc
    );

    // Group messages into threads (product + other participant)
    const messages = messagesRes.data || [];
    const otherIds = Array.from(
      new Set(messages.map((m) => (m.sender_id === userId ? m.receiver_id : m.sender_id)))
    );
    const productIds = Array.from(new Set(messages.map((m) => m.product_id).filter(Boolean)));
    const employeeIds = Array.from(new Set(messages.map((m) => m.employee_id).filter(Boolean)));

    const [otherProfilesRes, msgProductsRes, msgEmployeesRes] = await Promise.all([
      otherIds.length
        ? db.from("profiles").select("id, full_name, email, avatar_url").in("id", otherIds)
        : Promise.resolve({ data: [] }),
      productIds.length
        ? db.from("products").select("id, title, price").in("id", productIds)
        : Promise.resolve({ data: [] }),
      employeeIds.length
        ? db.from("employees").select("id, name, profession").in("id", employeeIds)
        : Promise.resolve({ data: [] }),
    ]);

    const otherMap = (otherProfilesRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    const productMap = (msgProductsRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    const employeeMap = (msgEmployeesRes.data || []).reduce((acc, e) => ({ ...acc, [e.id]: e }), {});

    const threadsMap = {};
    for (const m of messages) {
      const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
      const key = m.employee_id
        ? `emp_${m.employee_id}_${otherId}`
        : `prod_${m.product_id}_${otherId}`;
      if (!threadsMap[key]) {
        threadsMap[key] = {
          product: m.product_id
            ? (productMap[m.product_id] || { id: m.product_id, title: "Deleted Listing" })
            : null,
          employee: m.employee_id
            ? (employeeMap[m.employee_id] || { id: m.employee_id, name: "Deleted Service", profession: "" })
            : null,
          otherUser: otherMap[otherId] || { id: otherId, full_name: "Deleted User", email: "" },
          messages: [],
        };
      }
      threadsMap[key].messages.push(m);
    }
    const conversations = Object.values(threadsMap).sort((a, b) => {
      const la = a.messages[a.messages.length - 1]?.created_at || 0;
      const lb = b.messages[b.messages.length - 1]?.created_at || 0;
      return new Date(lb) - new Date(la);
    });

    res.json({
      profile,
      listings,
      purchases,
      sales,
      conversations,
      messagesAvailable: auth.hasServiceRole,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BOOSTS (sponsored ads) ───────────────────────────────────────────────────

app.post("/api/boosts", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Log in to request a boost." });

  const {
    target_type,
    product_id,
    employee_id,
    target_title,
    duration_days,
    amount,
    payment_method,
    payment_reference,
  } = req.body;

  if (!["product", "employee"].includes(target_type)) {
    return res.status(400).json({ error: "Invalid boost target type." });
  }
  const days = parseInt(duration_days, 10);
  if (!BOOST_DURATIONS.includes(days)) {
    return res.status(400).json({ error: "Invalid boost duration." });
  }
  if (Number(amount) !== BOOST_FEES[days]) {
    return res.status(400).json({ error: "Boost fee does not match selected plan." });
  }

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    if (target_type === "product") {
      if (!product_id) return res.status(400).json({ error: "product_id is required." });
      const { data: product } = await supabase
        .from("products")
        .select("id, seller_id, seller_email, title")
        .eq("id", product_id)
        .maybeSingle();
      if (!product) return res.status(404).json({ error: "Listing not found." });
      const owns =
        product.seller_id === user.id
        || (product.seller_email || "").toLowerCase() === (user.email || "").toLowerCase();
      if (!owns) return res.status(403).json({ error: "You can only boost your own listings." });
    } else {
      if (!employee_id) return res.status(400).json({ error: "employee_id is required." });
      const { data: employee } = await supabase
        .from("employees")
        .select("id, user_id, contact_email, name")
        .eq("id", employee_id)
        .maybeSingle();
      if (!employee) return res.status(404).json({ error: "Service profile not found." });
      const owns =
        employee.user_id === user.id
        || (employee.contact_email || "").toLowerCase() === (user.email || "").toLowerCase();
      if (!owns) return res.status(403).json({ error: "You can only boost your own services." });
    }

    const targetId = target_type === "product" ? product_id : employee_id;
    const idCol = target_type === "product" ? "product_id" : "employee_id";
    const { data: existing } = await userClient
      .from("boosts")
      .select("id")
      .eq(idCol, targetId)
      .eq("status", "pending_payment")
      .maybeSingle();
    if (existing) {
      return res.status(400).json({
        error: "You already have a boost awaiting admin approval for this item.",
      });
    }

    const row = {
      id: uuidv4(),
      target_type,
      product_id: target_type === "product" ? product_id : null,
      employee_id: target_type === "employee" ? employee_id : null,
      user_id: user.id,
      target_title: target_title || "Boost request",
      amount: BOOST_FEES[days],
      duration_days: days,
      status: "pending_payment",
      payment_method: payment_method || "mobile",
      payment_reference: payment_reference || null,
    };

    // Insert as the logged-in user so the boosts RLS policy (auth.uid() = user_id) passes
    const { data, error } = await userClient.from("boosts").insert([row]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/boosts/mine", async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Login required." });

  try {
    const userClient = supabaseForUser(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: "Session expired." });
    }

    const { data, error } = await userClient
      .from("boosts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      if (/relation.*boosts|does not exist/i.test(error.message)) {
        return res.json([]);
      }
      throw error;
    }
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/boosts/admin", async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    await expireStaleBoosts();
    const { data, error } = await auth.db
      .from("boosts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/boosts/:id/admin-status", async (req, res) => {
  const { status, duration_days } = req.body;
  if (!["active", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid boost status." });
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const { data: boost, error: boostErr } = await auth.db
      .from("boosts")
      .select("*")
      .eq("id", req.params.id)
      .single();
    if (boostErr || !boost) return res.status(404).json({ error: "Boost not found." });
    if (boost.status !== "pending_payment") {
      return res.status(400).json({ error: "Only pending boost requests can be updated." });
    }

    const { data: { user: adminUser } } = await auth.userClient.auth.getUser();

    if (status === "rejected") {
      const { data, error } = await auth.db
        .from("boosts")
        .update({
          status: "rejected",
          approved_by: adminUser?.id || null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", boost.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    const days = parseInt(duration_days, 10) || boost.duration_days;
    if (!BOOST_DURATIONS.includes(days)) {
      return res.status(400).json({ error: "Invalid duration for activation." });
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);

    const { data, error } = await auth.db
      .from("boosts")
      .update({
        status: "active",
        duration_days: days,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        approved_by: adminUser?.id || null,
        approved_at: startsAt.toISOString(),
      })
      .eq("id", boost.id)
      .select()
      .single();
    if (error) throw error;

    const parentUpdate = { is_boosted: true, boost_ends_at: endsAt.toISOString() };
    if (boost.target_type === "product" && boost.product_id) {
      await auth.db.from("products").update(parentUpdate).eq("id", boost.product_id);
    }
    if (boost.target_type === "employee" && boost.employee_id) {
      await auth.db.from("employees").update(parentUpdate).eq("id", boost.employee_id);
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Sell Something API running on http://localhost:${PORT}`);
    console.log(`   LAN: use http://<your-pc-ip>:${PORT}/api from phone/tablet`);
    console.log(`   Supabase: ${process.env.SUPABASE_URL}`);
  });
}

module.exports = app;

