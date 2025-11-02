import FormData from "form-data";
import path from "path";
import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";

const app = express();
app.use(express.static("."));

const V_EP = "http://localhost:8000/api/v1/verification/verify";
// get API Key from UI dashboard
const V_API = "INSERT API HERE";                  // GRADER NOTE: If you need the API pls let me know and I can send it!


// https://stackoverflow.com/questions/59097119/using-multer-diskstorage-with-typescript
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads_tmp"),
  // file name format for saved files
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // .png, .jpg
    const ext = path.extname(file.originalname);
    // make unique file name 
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({ storage });

// send files/img to verification adn returns valid/invalid match
app.post("/verify", upload.fields([
  { name: "file1" },
  { name: "file2" }]),
  async (req, res) => {

  // error if images r not provded
  if (!req.files.file1 || !req.files.file2) {
    return res.status(400).json({ error: "file1 and file2 are required" });
  }


  // extract details
  const file1 = req.files.file1[0];
  const file2 = req.files.file2[0];

  try {
    // log paths
    console.log("Received:", file1.path, file2.path);

    const form = new FormData();
    // create form to send to external API
    // https://www.geeksforgeeks.org/node-js/node-js-fs-createreadstream-method/
    form.append("source_image", fs.createReadStream(file1.path));
    form.append("target_image", fs.createReadStream(file2.path));

    // send post to V_API (verification api ep)
    const verifyRes = await axios.post(V_EP, form, {
      headers: { ...form.getHeaders(), "x-api-key": V_API }
    });

    // unlink temp files from server
    fs.unlinkSync(file1.path);
    fs.unlinkSync(file2.path);

    // debug log. 
    // extract similarity log API response 
    console.log("Result:", JSON.stringify(verifyRes.data, null, 2));
    const similarity = verifyRes.data.result?.[0]?.face_matches?.[0]?.similarity ?? 0;
    // Verified if 80% or more.  ADJUSTABLE.
    const verified = similarity > 0.80; 
    // return results
    res.json({ verified, similarity });
    return;


    console.log("Similarity Summary", { verified, similarity });

    return res.json({ verified, similarity });

  } catch (err) {
    // error handling
    console.error("Verify Error:", err.response?.data || err.message);
    return res.status(400).json(err.response?.data || { error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
